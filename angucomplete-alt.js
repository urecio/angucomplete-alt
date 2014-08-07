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

angular.module('angucomplete-alt', [])
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
                result = obj;
            }

            return result;
        };
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
                index, lastIndex;
            // firs of all removing forbidden regex chars from the str
            str = str.replace(regExSpecialChars, '');
            var re = new RegExp(str, 'gi')

            var extractString = function (isLast) {
                if (subMin) {
                    if (subMax) {
                        if (!isLast) result += target.substr(index - subMin, subMin + str.length + subMax) + ' ... ';
                        else result += '... ' + target.substr(index - subMin, subMin + str.length + subMax) + ' ... ';
                    } else {
                        if (!isLast) result += target.substr(index - subMin);
                        else result += '... ' + target.substr(index - subMin);
                    }
                } else if (subMax) {
                    result += target.substr(0, index + str.length - 1 + subMax) + ' ... ';
                } else {
                    result = target;
                }
                if (matchClass)
                    result = result.replace(re,
                        '<span class="' + matchClass + '">' + str + '</span>');

            };
            if (!target) {
                return;
            }


            index = target.indexOf(str);
            if (index != -1) {
                extractString(false);
                lastIndex = target.lastIndexOf(str);
                if (lastIndex != -1 && lastIndex != index) {
                    index = lastIndex;
                    extractString(true);
                }

            }
            else {
                subMax += subMin;
                subMin = 0;
                extractString(false);
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
            BLUR_TIMEOUT = 200,
            MAX_WAIT_IIME = 400,
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
                overrideSuggestions: '@',
                customProcessing: '=',
                suggestionsProperty: '@',
                maxWaitTime: '@',
                subMinTitle: '@?',
                subMaxTitle: '@?',
                subMinDescription: '@?',
                subMaxDescription: '@?'
            },
            template: '<div ng-form name="angucomplete_form" class="angucomplete-holder">' +
                '  <input id="{{id}}_value" ng-model="searchStr" type="text" placeholder="{{placeholder}}" class="{{inputClass}}" ng-focus="resetHideResults()" ng-blur="hideResults()" ng-keydown="keyDown($event)" ng-keyup="keyUp($event)" ng-change="callChange()" autocapitalize="off" autocorrect="off" autocomplete="off"/>' +
                '  <div id="{{id}}_dropdown" class="angucomplete-dropdown" ng-if="showDropdown">' +
                '    <div class="angucomplete-searching" ng-show="typemore && !searching">Type more...</div>' +
                '    <div class="angucomplete-searching" ng-show="searching" ng-bind="textSearching"></div>' +
                '    <div class="angucomplete-searching" ng-show="!searching && !typemore && !suggestion && (!results || results.length == 0)" ng-bind="textNoResults">No results found</div>' +
                '    <div class="angucomplete-searching" ng-show="suggestion && !searching">Did you mean <span class="btn-link" ng-click="searchStr=suggestion">{{ searchStr }}</span> </div>' +
                '    <div class="angucomplete-row" ng-if="!typemore && !searching" ng-repeat="result in results" ng-click="selectResult(result)" ng-mouseover="hoverRow($index)" ng-class="{\'angucomplete-selected-row\': $index == currentIndex}">' +
                '    <div ng-if="imageField" class="angucomplete-image-holder">' +
                '        <img ng-if="result.image && result.image != \'\'" ng-src="{{result.image}}" class="angucomplete-image"/>' +
                '        <div ng-if="!result.image && result.image != \'\'" class="angucomplete-image-default"></div>' +
                '      </div>' +
                '      <div class="angucomplete-title vcenter" ng-class="{titlealone: !result.description || result.description ==\'\'}" ng-bind-html="result.title | highlight:searchStr:matchClass:{{ subMinTitle }}:{{ subMaxTitle }}"></div>' +
                '      <div ng-if="result.description && result.description != \'\'" class="angucomplete-description" ng-bind-html="result.description | highlight:searchStr:matchClass:{{ subMinDescription }}:{{ subMaxDescription }}"></div>' +
                '    </div>' +
                '  </div>' +
                '</div>',
            link: function (scope, elem, attrs, ctrl) {
                var minlength = MIN_LENGTH,
                    searchTimerOut = null,
                    lastSearchTerm = null,
                    hideTimer,
                    pauseBeforeSearch = null;

                scope.typemore = false;
                scope.currentIndex = null;
                scope.searching = false;
                scope.searchStr = null;
                scope.suggestion = false;

                var callOrAssign = function (value) {
                    if (typeof scope.selectedObject === 'function') {
                        scope.selectedObject(value);
                    }
                    else {
                        scope.selectedObject = value;
                    }
                };

                var returnFunctionOrIdentity = function (fn) {
                    return fn && typeof fn === 'function' ? fn : function (data) {
                        return data;
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
                        return false
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
                    }
                }
                if (scope.minlength && scope.minlength !== '') {
                    minlength = scope.minlength;
                }

                if (!scope.pause) {
                    scope.pause = PAUSE;
                }
                if (!scope.maxWaitTime) {
                    scope.maxWaitTime = MAX_WAIT_IIME;
                }
                if (!scope.clearSelected) {
                    scope.clearSelected = false;
                }

                if (!scope.overrideSuggestions) {
                    scope.overrideSuggestions = false;
                }


                scope.textSearching = attrs.textSearching ? attrs.textSearching : TEXT_SEARCHING;
                scope.textNoResults = attrs.textNoResults ? attrs.textNoResults : TEXT_NORESULTS;

                scope.hideResults = function () {

                    hideTimer = $timeout(function () {


                        scope.showDropdown = false;
                    }, BLUR_TIMEOUT);
                };

                scope.resetHideResults = function () {
                    if (hideTimer) {
                        $timeout.cancel(hideTimer);
                    }
                };

                scope.process = function (responseData) {
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
                        scope.searching = false;

                    });
                };

                scope.processResults = function (responseData) {
                    var dataFormatted = responseFormatter(responseData),
                        data;
                    scope.results = [];

                    //todo: test the suggestions
                    //todo: change the 'result' for the titleField word
                    if (extractor.extractValue(dataFormatted, scope.suggestionsProperty)) {
                        data = extractor.extractValue(dataFormatted, scope.remoteUrlDataField);
                        scope.suggestion = extractor.extractValue(data, 'result');
                        scope.searching = false;
                    } else {
                        scope.process(extractor.extractValue(dataFormatted, scope.remoteUrlDataField));
                    }

                };

                scope.searchTimerComplete = function () {
                    // Begin the search
                    var searchFields, matches, i, match, s, params;

                    if (scope.searchStr.length >= minlength) {
                        if (scope.localData) {
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
                            $http.get(scope.remoteUrl, {params: params}).
                                success(function (responseData, status, headers, config) {

                                    scope.processResults(responseData);
                                }).
                                error(function (data, status, headers, config) {
                                    console.log('error');
                                });

                        } else {
                            $http.get(scope.remoteUrl + scope.searchStr, {}).
                                success(function (responseData, status, headers, config) {

                                    scope.processResults(
                                        extractor.extractValue(responseData)
                                    );
                                }).
                                error(function (data, status, headers, config) {
                                    console.log('error');
                                });
                        }
                    }

                };
                var search = function (event) {
                    if (!scope.searchStr || scope.searchStr === '') {
                        scope.showDropdown = false;
                        lastSearchTerm = null;
                    } else if (isNewSearchNeeded(scope.searchStr, lastSearchTerm, event)) {
                        scope.searching = true;
                        lastSearchTerm = scope.searchStr;
                        scope.showDropdown = true;
                        scope.currentIndex = -1;
                        scope.results = [];

                        if (pauseBeforeSearch) {
                            $timeout.cancel(pauseBeforeSearch);
                        }
                        //pause before searching
                        pauseBeforeSearch = $timeout(function () {
                            scope.searchTimerComplete();
                            //max time to wait for the response
                            if (searchTimerOut) {
                                $timeout.cancel(searchTimerOut);
                            }
                            searchTimerOut = $timeout(function () {
                                scope.searching = false;
                            }, scope.maxWaitTime);
                        }, scope.pause);


                    }
                    scope.hoverRow = function (index) {
                        scope.currentIndex = index;
                    };
                }
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
                    if (!(event.which === KEY_UP || (event.which === KEY_DW && scope.showDropdown) || event.which === KEY_EN)) {
                        search(event);
                    } else if (event.which === KEY_EN && scope.results) {
                        if (scope.currentIndex >= 0 && scope.currentIndex < scope.results.length) {
                            scope.selectResult(scope.results[scope.currentIndex]);
                            event.preventDefault();
                        } else {
                            event.preventDefault();
                            if (scope.overrideSuggestions) {
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
                    } else {
                        event.preventDefault();
                    }
                };
            }
        };
    }]);

