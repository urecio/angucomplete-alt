/*! 
 * angular-loading-bar v0.5.0
 * https://chieffancypants.github.io/angular-loading-bar
 * Copyright (c) 2014 Wes Cruver
 * License: MIT
 */
/*
 * angular-loading-bar
 *
 * intercepts XHR requests and creates a loading bar.
 * Based on the excellent nprogress work by rstacruz (more info in readme)
 *
 * (c) 2013 Wes Cruver
 * License: MIT
 */


(function() {

'use strict';

// Alias the loading bar for various backwards compatibilities since the project has matured:
angular.module('angular-loading-bar', ['cfp.loadingBarInterceptor']);
angular.module('chieffancypants.loadingBar', ['cfp.loadingBarInterceptor']);


/**
 * loadingBarInterceptor service
 *
 * Registers itself as an Angular interceptor and listens for XHR requests.
 */
angular.module('cfp.loadingBarInterceptor', ['cfp.loadingBar'])
  .config(['$httpProvider', function ($httpProvider) {

    var interceptor = ['$q', '$cacheFactory', '$timeout', '$rootScope', 'cfpLoadingBar', function ($q, $cacheFactory, $timeout, $rootScope, cfpLoadingBar) {

      /**
       * The total number of requests made
       */
      var reqsTotal = 0;

      /**
       * The number of requests completed (either successfully or not)
       */
      var reqsCompleted = 0;

      /**
       * The amount of time spent fetching before showing the loading bar
       */
      var latencyThreshold = cfpLoadingBar.latencyThreshold;

      /**
       * $timeout handle for latencyThreshold
       */
      var startTimeout;


      /**
       * calls cfpLoadingBar.complete() which removes the
       * loading bar from the DOM.
       */
      function setComplete() {
        $timeout.cancel(startTimeout);
        cfpLoadingBar.complete();
        reqsCompleted = 0;
        reqsTotal = 0;
      }

      /**
       * Determine if the response has already been cached
       * @param  {Object}  config the config option from the request
       * @return {Boolean} retrns true if cached, otherwise false
       */
      function isCached(config) {
        var cache;
        var defaults = $httpProvider.defaults;

        if (config.method !== 'GET' || config.cache === false) {
          config.cached = false;
          return false;
        }

        if (config.cache === true && defaults.cache === undefined) {
          cache = $cacheFactory.get('$http');
        } else if (defaults.cache !== undefined) {
          cache = defaults.cache;
        } else {
          cache = config.cache;
        }

        var cached = cache !== undefined ?
          cache.get(config.url) !== undefined : false;

        if (config.cached !== undefined && cached !== config.cached) {
          return config.cached;
        }
        config.cached = cached;
        return cached;
      }


      return {
        'request': function(config) {
          // Check to make sure this request hasn't already been cached and that
          // the requester didn't explicitly ask us to ignore this request:
          if (!config.ignoreLoadingBar && !isCached(config)) {
            $rootScope.$broadcast('cfpLoadingBar:loading', {url: config.url});
            if (reqsTotal === 0) {
              startTimeout = $timeout(function() {
                cfpLoadingBar.start();
              }, latencyThreshold);
            }
            reqsTotal++;
            cfpLoadingBar.set(reqsCompleted / reqsTotal);
          }
          return config;
        },

        'response': function(response) {
          if (!response.config.ignoreLoadingBar && !isCached(response.config)) {
            reqsCompleted++;
            $rootScope.$broadcast('cfpLoadingBar:loaded', {url: response.config.url});
            if (reqsCompleted >= reqsTotal) {
              setComplete();
            } else {
              cfpLoadingBar.set(reqsCompleted / reqsTotal);
            }
          }
          return response;
        },

        'responseError': function(rejection) {
          if (!rejection.config.ignoreLoadingBar && !isCached(rejection.config)) {
            reqsCompleted++;
            $rootScope.$broadcast('cfpLoadingBar:loaded', {url: rejection.config.url});
            if (reqsCompleted >= reqsTotal) {
              setComplete();
            } else {
              cfpLoadingBar.set(reqsCompleted / reqsTotal);
            }
          }
          return $q.reject(rejection);
        }
      };
    }];

    $httpProvider.interceptors.push(interceptor);
  }]);


/**
 * Loading Bar
 *
 * This service handles adding and removing the actual element in the DOM.
 * Generally, best practices for DOM manipulation is to take place in a
 * directive, but because the element itself is injected in the DOM only upon
 * XHR requests, and it's likely needed on every view, the best option is to
 * use a service.
 */
angular.module('cfp.loadingBar', [])
  .provider('cfpLoadingBar', function() {

    this.includeSpinner = true;
    this.includeBar = true;
    this.latencyThreshold = 100;
    this.startSize = 0.02;
    this.parentSelector = 'body';
    this.spinnerTemplate = '<div id="loading-bar-spinner"><div class="spinner-icon"></div></div>';
    this.spinnerOnlyClass = '';
    this.spinnerSelector = this.parentSelector;

    this.$get = ['$document', '$timeout', '$animate', '$rootScope', function ($document, $timeout, $animate, $rootScope) {

      var $parentSelector = this.parentSelector,
        loadingBarContainer = angular.element('<div id="loading-bar"><div class="bar"><div class="peg"></div></div></div>'),
        loadingBar = loadingBarContainer.find('div').eq(0),
        loadingBarPeg = loadingBarContainer.find('div').eq(1),
        spinner = angular.element(this.spinnerTemplate),
          spinnerSelector = this.spinnerSelector,
          spinnerOnlyClass = this.spinnerOnlyClass;

      var incTimeout,
        completeTimeout,
        started = false,
        status = 0;

      var includeSpinner = this.includeSpinner;
      var includeBar = this.includeBar;
      var startSize = this.startSize;

      /**
       * Inserts the loading bar element into the dom, and sets it to 2%
       */
      function _start() {
        var $parent = angular.element(document.querySelector($parentSelector));
        var spinnerParent = angular.element(document.querySelector(spinnerSelector));
        $timeout.cancel(completeTimeout);

        // do not continually broadcast the started event:
        if (started) {
          return;
        }

        $rootScope.$broadcast('cfpLoadingBar:started');
        started = true;

        if (includeBar) {
          $animate.enter(loadingBarContainer, $parent);
        }

        if (includeSpinner) {
            if(spinnerOnlyClass===''){
                $animate.enter(spinner, spinnerParent);
            }else{
            angular.element(spinnerParent).addClass(spinnerOnlyClass);
            }
        }

        _set(startSize);
      }

      /**
       * Set the loading bar's width to a certain percent.
       *
       * @param n any value between 0 and 1
       */
      function _set(n) {
        if (!started) {
          return;
        }
        var pct = (n * 100) + '%';
        loadingBar.css('width', pct);
        status = n;

        // increment loadingbar to give the illusion that there is always
        // progress but make sure to cancel the previous timeouts so we don't
        // have multiple incs running at the same time.
        $timeout.cancel(incTimeout);
        incTimeout = $timeout(function() {
          _inc();
        }, 250);
      }

      /**
       * Increments the loading bar by a random amount
       * but slows down as it progresses
       */
      function _inc() {
        if (_status() >= 1) {
          return;
        }

        var rnd = 0;

        // TODO: do this mathmatically instead of through conditions

        var stat = _status();
        if (stat >= 0 && stat < 0.25) {
          // Start out between 3 - 6% increments
          rnd = (Math.random() * (5 - 3 + 1) + 3) / 100;
        } else if (stat >= 0.25 && stat < 0.65) {
          // increment between 0 - 3%
          rnd = (Math.random() * 3) / 100;
        } else if (stat >= 0.65 && stat < 0.9) {
          // increment between 0 - 2%
          rnd = (Math.random() * 2) / 100;
        } else if (stat >= 0.9 && stat < 0.99) {
          // finally, increment it .5 %
          rnd = 0.005;
        } else {
          // after 99%, don't increment:
          rnd = 0;
        }

        var pct = _status() + rnd;
        _set(pct);
      }

      function _status() {
        return status;
      }

      function _complete() {
        $rootScope.$broadcast('cfpLoadingBar:completed');
        _set(1);

        $timeout.cancel(completeTimeout);

        // Attempt to aggregate any start/complete calls within 500ms:
        completeTimeout = $timeout(function() {
          $animate.leave(loadingBarContainer, function() {
            status = 0;
            started = false;
          });
          $animate.leave(spinner,function(){
              angular.element(document.querySelector(spinnerSelector)).removeClass(spinnerOnlyClass);
          });
        }, 500);
      }

      return {
        start            : _start,
        set              : _set,
        status           : _status,
        inc              : _inc,
        complete         : _complete,
        includeSpinner   : this.includeSpinner,
        latencyThreshold : this.latencyThreshold,
        parentSelector   : this.parentSelector,
        startSize        : this.startSize,
        spinnerOnlyClass : this.spinnerOnlyClass,
        spinnerSelector  : this.spinnerSelector
      };


    }];     //
  });       // wtf javascript. srsly
})();       //

/*
 * angucomplete-alt
 * Autocomplete directive for AngularJS
 * This is a fork of Daryl Rowland's angucomplete with some extra features.
 * By Hidenari Nozaki
 *
 * Copyright (c) 2014 Hidenari Nozaki and contributors
 * Licensed under the MIT license
 */

'use strict';

angular.module('angucomplete-alt', ['angular-loading-bar'])
    .factory('extractor', function () {
        function extractValue(obj, key) {
            var keys, result;
            if (key) {
                keys = key.split('.');
                result = obj;
                keys.forEach(function (k) {

                    result = result[k];
                });
            }
            else {
                result = '';
            }

            return result;
        }
        var extractTitle = function (data, title) {
            // split title fields and run extractValue for each and join with ' '
            return title.split(',')
                .map(function (field) {
                    return extractValue(data, field);
                })
                .join(' ');
        };
        return {
            extractValue: extractValue,
            extractTitle: extractTitle
        };
    })
    .filter('highlight', ['$sce', function ($sce) {
        return function (target, str, matchClass, subMin, subMax) {
            // subMin and subMax are options to short the string
            // subMin will be the number of characteres of separation from the match to the left side of the string
            // For example:
            // target = 'abcdefghijkl'
            // str = fgh
            //subMin = 4; subMax = 1
            // result = bcdefghi
            var result = '',
                regExSpecialChars = /[\[\\\^\$\.\|\?\*\+\(\)\{\}]/g,
                index, lastIndex, ending, lastSubMax=-1,
                subMinIndex, begining, subMaxIndex;
            // firs of all removing forbidden regex chars from the str
            str = str.replace(regExSpecialChars, '');
            var re = new RegExp(str, 'gi');

            //parsing
            subMin =  parseInt(subMin);
            subMax = parseInt(subMax);

            var extractString = function () {
                if (subMin) {
                    // Checking if we are overwritting the last shorting in the same phrase or the string is shorter than the subMin
                    subMinIndex = index - subMin;
                    if (subMinIndex <= 0){
                        begining = '';
                        subMinIndex = 0;
                        subMin = index;
                    } else if(lastSubMax !== -1){
                        lastSubMax = subMax;
                        begining = '';
                    } else {
                        begining = '...';
                    }

                    if (subMax) {

                        lastSubMax = subMin + str.length + subMax;
                        subMaxIndex = subMinIndex + lastSubMax;
                        ending = (subMaxIndex < target.length) ? '...' : '';

                        result += begining + target.substr(subMinIndex, lastSubMax) + ending;

                    } else {

                        result += begining + target.substr(subMinIndex);

                    }
                } else if (subMax && index !== -1) {

                    subMax = index + str.length + subMax;
                    ending = (subMax < target.length) ? '...' : '';

                    result += target.substr(0, subMax) + ending;

                    lastSubMax = subMax;

                } else if(subMax){


                    ending = (subMax < target.length) ? '...' : '';

                    result += target.substr(0, subMax) + ending;

                    lastSubMax = subMax;

                }else{
                    result = target;
                }

            };
            if (!target) {
                return;
            }


            index = target.toLowerCase().indexOf(str.toLowerCase());
            if (index !== -1) {

                extractString();
                lastIndex = target.toLowerCase().lastIndexOf(str.toLowerCase());
                if (lastIndex !== -1 && lastIndex !== index) {
                    index = lastIndex;

                    extractString();
                }
                if (matchClass && index !== -1){

                    result = result.replace(re,
                        '<span class="' + matchClass + '">' + str + '</span>');
                }
            }
            else {
                subMax += subMin;
                subMin = 0;
                extractString();
            }
            return $sce.trustAsHtml(result);
        };
    }])
    .directive('angucompleteAlt', ['$parse', '$http', '$timeout', 'extractor', function ($parse, $http, $timeout, extractor) {
        var KEY_DW = 40,
            KEY_UP = 38,
            KEY_ES = 27,
            KEY_EN = 13,
            KEY_BS = 8,
            KEY_DEL = 46,
            MIN_LENGTH = 3,
            PAUSE = 200,
            SUB_MIN_TITLE = 400,
            SUB_MAX_TITLE = 400,
            SUB_MIN_DESCRIPTION = 400,
            SUB_MAX_DESCRIPTION = 400,
            TEXT_SEARCHING = 'Searching...',
            TEXT_NORESULTS = 'No results found';

        return {
            restrict: 'EA',
            scope: {
                selectedObject: '=',
                localData: '=',
                remoteUrlRequestFormatter: '=',
                remoteUrlResponseFormatter: '=',
                writtingCallback: '=',
                id: '@',
                placeholder: '@',
                remoteUrl: '@',
                remoteUrlDataField: '@',
                titleField: '@',
                descriptionField: '@',
                imageField: '@',
                inputClass: '@',
                pause: '@',
                searchFields: '@',
                minlength: '@',
                matchClass: '@',
                clearSelected: '@',
                overrideResults: '@',
                customProcessing: '=',
                suggestionsProperty: '@',
                maxWaitTime: '@',
                subMinTitle: '@?',
                subMaxTitle: '@?',
                subMinDescription: '@?',
                subMaxDescription: '@?',
                showMore: '@?',
                useBootstrap: '@?'
            },
            template: '<div ng-form name="angucomplete_form" class="angucomplete-holder">' +
                '  <input id="{{id}}_value" ng-model="searchStr" type="text" placeholder="{{placeholder}}" class="{{inputClass}}" ng-blur="hideResults($event)" ng-focus="resetHideResults()" ng-keyup="keyUp($event)" ng-change="callChange()" autocapitalize="off" autocorrect="off" autocomplete="off"/>' +
                '  <div id="{{id}}_dropdown" class="angucomplete-dropdown" ng-mousedown="dropClick($event)" ng-if="showDropdown && !searching">' +
                '    <div class="angucomplete-searching" ng-show="typemore">Type more...</div>' +
                '    <div class="angucomplete-searching" ng-show="unreachable">Please, try again later...</div>' +
                '    <div class="angucomplete-searching" ng-show="!unreachable && !typemore && !suggestion && (!results || results.length == 0)" ng-bind="textNoResults"></div>' +
                '    <div class="angucomplete-searching" ng-show="suggestion">Did you mean <span class="btn-link" ng-click="searchStr=suggestion">{{ suggestion }}</span> </div>' +
                '    <div class="angucomplete-row" ng-if="!typemore" ng-repeat="result in results" ng-mouseover="hoverRow($index)" ng-class="{\'angucomplete-selected-row\': $index == currentIndex}">' +
                ' <div class="clickable" ng-click="selectResult(result)">' +
                '    <div ng-if="imageField" class="angucomplete-image-holder">' +
                '        <img ng-if="result.image && result.image != \'\'" ng-src="{{result.image}}" class="angucomplete-image"/>' +
                '        <div ng-if="!result.image && result.image != \'\'" class="angucomplete-image-default"></div>' +
                '      </div>' +
                '<div class="title-description">    ' +
                '      <div class="angucomplete-title vcenter" ng-class="{titlealone: !result.description || result.description ==\'\'}" ng-bind-html="result.title | highlight:searchStr:matchClass:subMinTitle:subMaxTitle"></div>' +
                '      <div ng-if="result.description && result.description != \'\'" class="angucomplete-description" ng-bind-html="result.description | highlight:searchStr:matchClass:subMinDescription:subMaxDescription"></div>' +
                '</div>' +
                '</div>' +
                '<div ng-if="(subMinTitle || subMaxTitle || subMinDescription || subMaxDescription) && showMore && !useBootstrap">' +
                '  <a id="show-more" class="show-more" ng-click="isOpen=!isOpen">{{isOpen ? "Show less..." : "Show more..."}}</a>' +
                '<div class="title-description-more" ng-show="isOpen">' +
                '  <div class="angucomplete-title vcenter" ng-class="{titlealone: !result.description || result.description ==\'\'}" ng-bind-html="result.title | highlight:searchStr:matchClass"></div>' +
                '  <div ng-if="result.description && result.description != \'\'" class="angucomplete-description" ng-bind-html="result.description | highlight:searchStr:matchClass"></div>' +
                '</div>' +
                '</div> ' +
                '<accordion close-others ng-if="(subMinTitle || subMaxTitle || subMinDescription || subMaxDescription) && showMore && useBootstrap">' +
                '<accordion-group is-open="status.isOpen">' +
                '<accordion-heading>' +
                '   <p ng-show="status.isOpen">Show less...</p>' +
                '   <p ng-hide="status.isOpen">Show more...</p>' +
                '</accordion-heading>' +
                '<div class="title-description">    ' +
                '  <div class="angucomplete-title vcenter" ng-class="{titlealone: !result.description || result.description ==\'\'}" ng-bind-html="result.title | highlight:searchStr:matchClass"></div>' +
                '      <div ng-if="result.description && result.description != \'\'" class="angucomplete-description" ng-bind-html="result.description | highlight:searchStr:matchClass"></div>' +
                '</div>' +
                '</accordion-group>' +
                '</accordion>' +
                '    </div>' +
                '  </div>' +
                '</div>',
            link: function (scope, elem, attrs) {
                //todo: test for local json
                var minlength = MIN_LENGTH,
                    lastSearchTerm = null,
                    pauseBeforeSearch = null;

                scope.isFocus = false;
                scope.typemore = false;
                scope.currentIndex = null;
                scope.searching = false;
                scope.searchStr = null;
                scope.suggestion = false;
                scope.unreachable = false;

                scope.dropClick = function (event){
                    event.preventDefault();
                        scope.isDropClick = true;
                };
                var callOrAssign = function (value) {
                    if (typeof scope.selectedObject === 'function') {
                        scope.selectedObject(value);
                    }
                    else {
                        scope.selectedObject = value;
                    }
                };

                var returnFunctionOrIdentity = function (fn) {
                    return function(data) {
                        return scope[fn] ? scope[fn](data) : data;
                    };
                };

                var responseFormatter = returnFunctionOrIdentity(scope.remoteUrlResponseFormatter);

                var setInputString = function (str) {
                    callOrAssign({originalObject: str});

                    if (scope.clearSelected) {
                        scope.searchStr = null;
                    }
                    scope.showDropdown = false;
                    scope.results = [];
                };

                var isNewSearchNeeded = function (newTerm, oldTerm, event) {

                    if (newTerm.length >= minlength && (newTerm !== oldTerm || (event && event.which === KEY_DW))) {

                        scope.typemore = false;
                        scope.showDropdown = false;
                        return true;
                    } else if (newTerm.length < minlength) {
                        scope.typemore = true;
                        scope.showDropdown = true;
                        return false;
                    } else if (newTerm.length >= minlength) {
                        scope.typemore = false;
                        scope.showDropdown = true;
                        return false;
                    }

                };
                if (!scope.subMinTitle) {
                    scope.subMinTitle = SUB_MIN_TITLE;
                }
                if (!scope.subMaxTitle) {
                    scope.subMaxTitle = SUB_MAX_TITLE;
                }
                if (!scope.subMinDescription) {
                    scope.subMinDescription = SUB_MIN_DESCRIPTION;
                }
                if (!scope.subMaxDescription) {
                    scope.subMaxDescription = SUB_MAX_DESCRIPTION;
                }
                if (scope.writtingCallback) {
                    scope.callChange = function () {
                        scope.writtingCallback();
                    };
                }
                if (scope.minlength && scope.minlength !== '') {
                    minlength = scope.minlength;
                }

                if (!scope.pause) {
                    scope.pause = PAUSE;
                }
                if (!scope.maxWaitTime) {
                    scope.$on('cfpLoadingBar:completed', function() {scope.searching = false;});
                }
                if (!scope.clearSelected) {
                    scope.clearSelected = false;
                }

                if (!scope.overrideResults) {
                    scope.overrideResults = false;
                }


                scope.textSearching = attrs.textSearching ? attrs.textSearching : TEXT_SEARCHING;
                scope.textNoResults = attrs.textNoResults ? attrs.textNoResults : TEXT_NORESULTS;

                scope.hideResults = function (event) {

                    if(!scope.isDropClick || scope.isDropClick === false){
                            scope.showDropdown = false;
                    }else{

                        var x =window.scrollX,y = window.scrollY;


                        angular.element(elem[0].querySelectorAll('#'+scope.id+'_value')).triggerHandler('focus');
                        window.scrollTo(x,y);

                    }



                };
                scope.resetHideResults = function () {
                    scope.isDropClick=false;
                    scope.showDropdown=false;
                };


                scope.processData = function (responseData) {
                    var description, image, text;
                    
                    angular.forEach(responseData, function (object) {

                        if (scope.customProcessing) {
                            object = scope.customProcessing(object);
                        }
                        if (scope.titleField && scope.titleField !== '') {
                            text = extractor.extractTitle(object, scope.titleField);
                        }

                        description = '';
                        if (scope.descriptionField) {
                            description = extractor.extractValue(object, scope.descriptionField);
                        }

                        image = '';
                        if (scope.imageField) {
                            image = extractor.extractValue(object, scope.imageField);
                        }


                        scope.results[scope.results.length] = {
                            title: text,
                            description: description,
                            image: image,
                            originalObject: object
                        };



                    });
                    scope.searching = false;
                    scope.showDropdown = true;
                };

                scope.processResults = function (responseData) {
                    var dataFormatted = responseFormatter(responseData);
                    var suggestions = extractor.extractValue(dataFormatted, scope.suggestionsProperty);
                    scope.results = [];
                    //todo: test the suggestions
                    if (suggestions && suggestions !== '') {

                        scope.showDropdown = true;
                        scope.suggestion = suggestions;
                        scope.searching = false;
                        scope.processData(extractor.extractValue(dataFormatted, scope.remoteUrlDataField));
                    } else if(extractor.extractValue(dataFormatted, scope.remoteUrlDataField)) {
                        scope.processData(extractor.extractValue(dataFormatted, scope.remoteUrlDataField));
                    } else {

                        scope.processData(dataFormatted);
                    }

                };

                scope.searchTimerComplete = function () {
                    // Begin the search
                    var searchFields, matches, i, match, s, params;
                    if (scope.searchStr.length >= minlength) {
                        if (scope.localData) {//suggestions not working here
                            searchFields = scope.searchFields.split(',');

                            matches = [];

                            for (i = 0; i < scope.localData.length; i++) {
                                match = false;
                                for (s = 0; s < searchFields.length; s++) {
                                    match = match || (scope.localData[i][searchFields[s]].toLowerCase().indexOf(scope.searchStr.toLowerCase()) >= 0);
                                }

                                if (match) {
                                    matches[matches.length] = scope.localData[i];
                                }
                            }

                            scope.processResults(matches);

                        } else if (scope.remoteUrlRequestFormatter) {
                            params = scope.remoteUrlRequestFormatter(scope.searchStr);
                            $http.get(scope.remoteUrl, {timeout: scope.maxWaitTime, params: params}).
                                success(function (responseData, status, headers, config) {

                                    scope.processResults(responseData);
                                }).
                                error(function (data, status, headers, config) {

                                    if(data!==null){
                                        console.log('error',data,status);
                                        setError();
                                    }
                                    else{
                                        setNoResults();
                                    }

                                });

                        } else {
                            $http.get(scope.remoteUrl + scope.searchStr, {timeout: scope.maxWaitTime}).
                                success(function (responseData, status, headers, config) {
                                    scope.processResults(responseData);
                                }).
                                error(function (data, status, headers, config) {

                                    if(data!==null){
                                        console.log('error',data,status);
                                        setError();
                                    }
                                    else{
                                        setNoResults();
                                    }

                                });
                        }
                    }

                };
                var setNoResults = function(){
                    scope.unreachable = false;
                    scope.showDropdown = true;
                    scope.searching = false;
                };
                var setError = function(){
                    scope.unreachable = true;
                    scope.showDropdown = true;
                    scope.searching = false;
                };
                var search = function (event) {
                    if (!scope.searchStr || scope.searchStr === '') {
                        scope.showDropdown = false;
                        lastSearchTerm = null;
                    } else if (isNewSearchNeeded(scope.searchStr, lastSearchTerm, event)) {

                        scope.searching = true;
                        lastSearchTerm = scope.searchStr;
                        scope.currentIndex = -1;
                        scope.results = [];

                        if (pauseBeforeSearch) {
                            $timeout.cancel(pauseBeforeSearch);
                        }
                        //pause before searching
                        pauseBeforeSearch = $timeout(function () {
                            scope.searchTimerComplete();
                        }, scope.pause);
                    }
                    scope.hoverRow = function (index) {
                        scope.currentIndex = index;
                    };
                };
                scope.selectResult = function (result) {
                    // Restore original values
                    if (scope.matchClass) {
                        result.title = extractor.extractTitle(result.originalObject, scope.titleField);
                        result.description = extractor.extractValue(result.originalObject, scope.descriptionField);
                    }

                    if (scope.clearSelected) {
                        scope.searchStr = null;
                    }
                    else {
                        scope.searchStr = lastSearchTerm = result.title;
                    }
                    callOrAssign(result);
                    scope.showDropdown = false;
                    scope.results = [];
                };


                scope.keyUp = function (event) {

                    if([KEY_UP,KEY_EN,KEY_ES,KEY_BS,KEY_DEL].indexOf(event.which) === -1 && (event.which !== KEY_DW || !scope.showDropdown)){
//                        if the key pressed is not in the array
//                        if it is arrow down, should only pass when the dropdown is false


                        search(event);
                    } else if (event.which === KEY_EN && scope.results) {

                        if (scope.currentIndex >= 0 && scope.currentIndex < scope.results.length) {

                            scope.selectResult(scope.results[scope.currentIndex]);
                            event.preventDefault();
                        } else {
                            event.preventDefault();
                            if (scope.overrideResults) {
                                setInputString(scope.searchStr);
                            }
                            else {
                                scope.results = [];
                            }
                        }
                    } else if (event.which === KEY_ES) {

                        scope.results = [];
                        scope.showDropdown = false;
                    } else if (event.which === KEY_BS || event.which === KEY_DEL) {
                        callOrAssign(null);
                    } else if (event.which === KEY_DW && scope.results) {
                        if ((scope.currentIndex + 1) < scope.results.length) {
                            scope.currentIndex++;
                        }
                    } else if (event.which === KEY_UP && scope.results) {

                        if (scope.currentIndex >= 1) {
                            scope.currentIndex--;
                        }
                    }
                };
            }
        };
    }]);

