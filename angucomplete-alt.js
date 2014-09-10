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
    .directive('ngFocusAsync', ['$parse', function($parse) {
        return {
            compile: function($element, attr) {
                var fn = $parse(attr.ngFocusAsync);
                return function(scope, element) {
                    element.on('focus', function(event) {
                        scope.$evalAsync(function() {
                            fn(scope, {$event:event});
                        });
                    });
                };
            }
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
            BLUR_TIMEOUT = 200,
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
                '  <input id="{{id}}_value" ng-model="searchStr" type="text" placeholder="{{placeholder}}" class="{{inputClass}}" ng-blur="hideResults()" ng-focus-async="resetHideResults()" ng-keyup="keyUp($event)" ng-change="callChange()" autocapitalize="off" autocorrect="off" autocomplete="off"/>' +
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
                    hideTimer,
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

                scope.hideResults = function () {
                    if(!scope.isDropClick || scope.isDropClick === false){
                        hideTimer = $timeout(function () {


                            scope.showDropdown = false;
                        }, BLUR_TIMEOUT);

                    }else{
                        var x =window.scrollX,y = window.scrollY;

                        angular.element( document.querySelector( '#'+scope.id+'_value'))[0].focus();
                        window.scrollTo(x,y);
                        scope.isDropClick=false;

                    }



                };
                scope.resetHideResults = function () {
                    if (hideTimer) {
                        $timeout.cancel(hideTimer);
                    }
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

