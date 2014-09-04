'use strict';

describe('angucomplete-alt', function () {
    var $compile, $scope, $timeout;
    var KEY_DW = 40,
        KEY_EN = 13;

    beforeEach(module('angucomplete-alt'));

    beforeEach(inject(function (_$compile_, $rootScope, _$timeout_) {
        $compile = _$compile_;
        $scope = $rootScope.$new();
        $timeout = _$timeout_;
    }));

    describe('Render', function () {

        it('should render input element with given id plus _value', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" selected-object="selectedCountry" title-field="name"></div>');
            $scope.selectedCountry = null;
            $compile(element)($scope);
            $scope.$digest();
            expect(element.find('#ex1_value').length).toBe(1);
        });

        it('should render planceholder string', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" selected-object="selectedCountry" local-data="countries" search-fields="name" title-field="name"/>');
            $scope.selectedCountry = null;
            $compile(element)($scope);
            $scope.$digest();
            expect(element.find('#ex1_value').attr('placeholder')).toEqual('Search countries');
        });

    });

    describe('Local data', function () {

        it('should show search results after 3 letter is entered', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" selected-object="selectedCountry" local-data="countries" search-fields="name" title-field="name"/>');
            $scope.selectedCountry = undefined;
            $scope.countries = [
                {name: 'Afghanistan', code: 'AF'},
                {name: 'Aland Islands', code: 'AX'},
                {name: 'Albania', code: 'AL'}
            ];
            $compile(element)($scope);
            $scope.$digest();
            var inputField = element.find('#ex1_value');
            var e = $.Event('keyup');

            e.which = 97; // letter: a
            inputField.val('a');
            inputField.trigger('input');
            inputField.trigger(e);
            expect(element.find('.angucomplete-row').length).toBe(0);

            e.which = 108; // letter: l
            inputField.val('al');
            inputField.trigger('input');
            inputField.trigger(e);
            expect(element.find('.angucomplete-row').length).toBe(0);

            e.which = 98; // letter: b
            inputField.val('alb');
            inputField.trigger('input');
            inputField.trigger(e);
            $timeout.flush();
            expect(element.find('.angucomplete-row').length).toBeGreaterThan(0);
        });

        it('should show search results after 1 letter is entered with minlength being set to 1', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" selected-object="selectedCountry" local-data="countries" search-fields="name" title-field="name" minlength="1"/>');
            $scope.selectedCountry = undefined;
            $scope.countries = [
                {name: 'Afghanistan', code: 'AF'},
                {name: 'Aland Islands', code: 'AX'},
                {name: 'Albania', code: 'AL'}
            ];
            $compile(element)($scope);
            $scope.$digest();
            var inputField = element.find('#ex1_value');
            var e = $.Event('keyup');
            e.which = 97; // letter: a
            inputField.val('a');
            inputField.trigger('input');
            inputField.trigger(e);
            $timeout.flush();
            expect(element.find('.angucomplete-row').length).toBeGreaterThan(0);
        });
        it('it should say "type more" when term length is lower than minLength', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" selected-object="selectedCountry" local-data="countries" search-fields="name" title-field="name" minlength="2"/>');
            $scope.selectedCountry = undefined;
            $scope.countries = [
                {name: 'Afghanistan', code: 'AF'},
                {name: 'Aland Islands', code: 'AX'},
                {name: 'Albania', code: 'AL'}
            ];
            $compile(element)($scope);
            $scope.$digest();
            var inputField = element.find('#ex1_value');
            var e = $.Event('keyup');
            e.which = 97; // letter: a
            inputField.val('a');
            inputField.trigger('input');
            inputField.trigger(e);
            $timeout.flush();
//          those three variables should make the type more phrase visible
            expect(element.isolateScope().typemore).toBeTruthy();
            expect(element.isolateScope().showDropdown).toBeTruthy();
            expect(element.isolateScope().searching).toBeFalsy();
        });


        it('should show last results when the new term equals the old term', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" selected-object="selectedCountry" local-data="countries" search-fields="name" title-field="name" minlength="1"/>');
            $scope.selectedCountry = undefined;
            $scope.countries = [
                {name: 'Afghanistan', code: 'AF'},
                {name: 'Aland Islands', code: 'AX'},
                {name: 'Albania', code: 'AL'}
            ];
            $compile(element)($scope);
            $scope.$digest();
            var inputField = element.find('#ex1_value');
            var e = $.Event('keyup');
            e.which = 97; // letter: a
            inputField.val('a');
            inputField.trigger('input');
            inputField.trigger(e);
            $timeout.flush();
            expect(element.find('.angucomplete-row').length).toBeGreaterThan(0);

            //added a space
            inputField.val('a ');
            inputField.trigger(e);

            //blur the input
            inputField.triggerHandler('blur');
            $timeout.flush();
            expect(element.find('#ex1_dropdown').length).toBe(0);

            //pressed keydown inside the input
            e.which = KEY_DW;
            inputField.trigger(e);
            $timeout.flush();

            //then it should present the last results
            expect(element.find('#ex1_dropdown').length).toBeGreaterThan(0);
        });
        it('should call an external function when writting if writting-callback is defined', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" ' +
                'selected-object="selectedCountry" local-data="countries" search-fields="name" title-field="name"' +
                ' minlength="1" writting-callback="mycallback"/>');
            $scope.selectedCountry = undefined;
            $scope.countries = [
                {name: 'Afghanistan', code: 'AF'},
                {name: 'Aland Islands', code: 'AX'},
                {name: 'Albania', code: 'AL'}
            ];
            //callback function to call
            $scope.mycallback = function () {
                //do some stuff
            };
            spyOn($scope, 'mycallback');
            $compile(element)($scope);
            $scope.$digest();

            //writting a letter in the input
            var inputField = element.find('#ex1_value');
            var e = $.Event('keyup');
            e.which = 97; // letter: a
            inputField.val('a');
            inputField.trigger('input');
            inputField.trigger(e);

            //then the callback should have been called
            expect($scope.mycallback).toHaveBeenCalled();
        });
        it('should hide the dropdown when the term is empty', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" ' +
                'local-data="countries" search-fields="name" title-field="name"' +
                ' minlength="1"/>');
            $scope.countries = [
                {name: 'Afghanistan', code: 'AF'},
                {name: 'Aland Islands', code: 'AX'},
                {name: 'Albania', code: 'AL'}
            ];
            $compile(element)($scope);
            $scope.$digest();

            var inputField = element.find('#ex1_value');
            var e = $.Event('keyup');
            inputField.val('a');
            inputField.trigger('input');
            inputField.trigger(e);

            $timeout.flush();

            expect(element.find('#ex1_dropdown').length).toBe(1);

            inputField.val('');
            inputField.trigger('input');
            inputField.trigger(e);

            expect(element.find('#ex1_dropdown').length).toBe(0);
        });
        it('should set the currentIndex of the row when mouse is overed', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" ' +
                'local-data="countries" search-fields="name" title-field="name"' +
                ' minlength="1"/>');
            $scope.countries = [
                {name: 'Afghanistan', code: 'AF'},
                {name: 'Aland Islands', code: 'AX'},
                {name: 'Albania', code: 'AL'}
            ];
            $compile(element)($scope);
            $scope.$digest();

            var inputField = element.find('#ex1_value');
            var e = $.Event('keyup');
            inputField.val('a');
            inputField.trigger('input');
            inputField.trigger(e);

            $timeout.flush();

            expect(element.find('#ex1_dropdown').length).toBe(1);

            var result = element.find('.angucomplete-row div:first');
            result.trigger('mouseover');
            expect(element.isolateScope().currentIndex).toBe(0);
        });
    });

    describe('processResults', function () {

        it('should set scope.results[0].title', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search names" selected-object="selected" local-data="names" search-fields="name" title-field="name" minlength="1"/>');
            $compile(element)($scope);
            $scope.$digest();
            var name = 'John';
            var responseData = [
                {name: name}
            ];
            element.isolateScope().processResults(responseData);
            expect(element.isolateScope().results[0].title).toBe(name);
        });

        it('should set scope.results[0].title for two title fields', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search names" selected-object="selected" local-data="names" search-fields="name" title-field="firstName,lastName" minlength="1"/>');
            $compile(element)($scope);
            $scope.$digest();

            var lastName = 'Doe', firstName = 'John';
            var responseData = [
                {lastName: lastName, firstName: firstName}
            ];
            element.isolateScope().processResults(responseData);
            expect(element.isolateScope().results[0].title).toBe(firstName + ' ' + lastName);
        });

        it('should set scope.results[0].title to more than one level deep attribute', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search names" selected-object="selected" local-data="names" search-fields="name" title-field="name.first,name.last" minlength="1"/>');
            $compile(element)($scope);
            $scope.$digest();

            var first = 'John';
            var last = 'Doe';
            var responseData = [
                {
                    name: {
                        first: first,
                        last: last
                    }
                }
            ];
            element.isolateScope().processResults(responseData);
            expect(element.isolateScope().results[0].title).toBe(first + ' ' + last);
        });

        it('should set scope.results[0].description', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search names" selected-object="selected" local-data="names" search-fields="name" title-field="name" description-field="desc" minlength="1"/>');
            $compile(element)($scope);
            $scope.$digest();

            var description = 'blah blah blah';
            var responseData = [
                {name: 'John', desc: description}
            ];
            element.isolateScope().processResults(responseData);
            expect(element.isolateScope().results[0].description).toBe(description);
        });

        it('should set scope.results[0].description to more than one level deep attribute', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search names" selected-object="selected" local-data="names" search-fields="name" title-field="name" description-field="desc.short" minlength="1"/>');
            $compile(element)($scope);
            $scope.$digest();

            var desc = 'short desc...';
            var responseData = [
                {
                    name: 'John',
                    desc: {
                        long: 'very very long description...',
                        short: desc
                    }
                }
            ];
            element.isolateScope().processResults(responseData);
            expect(element.isolateScope().results[0].description).toBe(desc);
        });

        it('should set scope.results[0].image', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search names" selected-object="selected" local-data="names" search-fields="name" title-field="name" image-field="pic" minlength="1"/>');
            $compile(element)($scope);
            $scope.$digest();

            var image = 'some pic';
            var responseData = [
                {name: 'John', pic: image}
            ];
            element.isolateScope().processResults(responseData);
            expect(element.isolateScope().results[0].image).toBe(image);
        });

        it('should set scope.results[0].image to more than one level deep attribute', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search names" selected-object="selected" local-data="names" search-fields="name" title-field="name" image-field="pic.small" minlength="1"/>');
            $compile(element)($scope);
            $scope.$digest();

            var image = 'small pic';
            var responseData = [
                {
                    name: 'John',
                    pic: {
                        large: 'large pic',
                        mid: 'medium pic',
                        small: image
                    }
                }
            ];
            element.isolateScope().processResults(responseData);
            expect(element.isolateScope().results[0].image).toBe(image);
        });
        it('should callback on every row of the results if custom-processing is defined', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search names" selected-object="selected" local-data="names" search-fields="name" title-field="name" minlength="1" custom-processing="customProcessing"/>');
            $scope.customProcessing = function (results) {
                //do something with results
                return results;
            };
            spyOn($scope, 'customProcessing').and.callThrough();
            $compile(element)($scope);
            $scope.$digest();

            var responseData = [
                {
                    name: 'John'
                }
            ];
            element.isolateScope().processResults(responseData);
            expect($scope.customProcessing).toHaveBeenCalled();
        });
    });

    describe('searchTimerComplete', function () {

        describe('local data', function () {
            it('should set $scope.searching to false and call $scope.processResults', function () {
                var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" selected-object="selectedCountry" local-data="countries" search-fields="name" title-field="name" minlength="1"/>');
                $scope.selectedCountry = undefined;
                $scope.countries = [
                    {name: 'Afghanistan', code: 'AF'},
                    {name: 'Aland Islands', code: 'AX'},
                    {name: 'Albania', code: 'AL'}
                ];
                $compile(element)($scope);
                $scope.$digest();

                element.isolateScope().searchStr = 'al';
                spyOn(element.isolateScope(), 'processResults');

                element.isolateScope().searchTimerComplete();
                expect(element.isolateScope().processResults).toHaveBeenCalledWith($scope.countries.slice(1, 3));
            });
        });

        describe('remote API', function () {
            var search = 'john', results = {data: [
                {name: 'john'}
            ]};

            it('should call $http with given url and param', inject(function ($httpBackend) {
                var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search names" selected-object="selected" remote-url="search?q=" search-fields="name" remote-url-data-field="data" title-field="name" minlength="1"/>');
                $compile(element)($scope);
                $scope.$digest();

                element.isolateScope().searchStr = search;
                $httpBackend.expectGET('search?q=' + search).respond(200, results);
                element.isolateScope().searchTimerComplete();
                $httpBackend.flush();

                $httpBackend.verifyNoOutstandingExpectation();
                $httpBackend.verifyNoOutstandingRequest();
            }));

            it('should set $scope.searching to false and call $scope.processData after success', inject(function ($httpBackend) {
                var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search names" selected-object="selected" remote-url="search?q=" search-fields="name" remote-url-data-field="data" title-field="name" minlength="1"/>');
                $compile(element)($scope);
                $scope.$digest();

                element.isolateScope().searchStr = search;
                spyOn(element.isolateScope(), 'processData');
                $httpBackend.expectGET('search?q=' + search).respond(200, results);
                element.isolateScope().searchTimerComplete();
                $httpBackend.flush();
                element.isolateScope().processResults(results);
                expect(element.isolateScope().processData).toHaveBeenCalledWith(results.data);

                $httpBackend.verifyNoOutstandingExpectation();
                $httpBackend.verifyNoOutstandingRequest();

            }));

            it('should call $scope.processData with more than one level deep of data attribute', inject(function ($httpBackend) {
                var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search names" selected-object="selected" remote-url="search?q=" search-fields="name" remote-url-data-field="search.data" title-field="name" minlength="1"/>');
                $compile(element)($scope);
                $scope.$digest();

                element.isolateScope().searchStr = 'john';
                var results = {
                    meta: {
                        offset: 0,
                        total: 1
                    },
                    search: {
                        seq_id: 1234567890,
                        data: [
                            {name: 'john'}
                        ]
                    }
                };
                spyOn(element.isolateScope(), 'processData');
                $httpBackend.expectGET('search?q=' + element.isolateScope().searchStr).respond(200, results);
                element.isolateScope().searchTimerComplete();
                $httpBackend.flush();
                element.isolateScope().processResults(results);
                $httpBackend.verifyNoOutstandingExpectation();
                $httpBackend.verifyNoOutstandingRequest();
                expect(element.isolateScope().processData).toHaveBeenCalledWith(results.search.data);
                expect(element.isolateScope().searching).toBe(false);
            }));

            it('should not throw an exception when match-class is set and remote api returns bogus results', inject(function ($httpBackend) {
                var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search names" selected-object="selected" remote-url="search?q=" search-fields="name" remote-url-data-field="data" title-field="name" description="type" minlength="1" match-class="highlight"/>');
                $compile(element)($scope);
                $scope.$digest();

                var results = {data: [
                    {name: 'tim', type: 'A'}
                ]};
                $httpBackend.expectGET('search?q=a').respond(200, results);

                var inputField = element.find('#ex1_value');
                var e = $.Event('keyup');
                e.which = 97; // letter: a

                inputField.val('a');
                inputField.trigger('input');
                inputField.trigger(e);
                $timeout.flush();
                $httpBackend.flush();

                $httpBackend.verifyNoOutstandingExpectation();
                $httpBackend.verifyNoOutstandingRequest();
                expect(element.isolateScope().searching).toBe(false);
            }));
            it('should suggest correct words close to the typo', inject(function ($httpBackend) {


                var element = angular.element('<div angucomplete-alt id="ex1" suggestions-property="suggestion" placeholder="Search names" selected-object="selected" remote-url="search?q=" search-fields="name" remote-url-data-field="results" title-field="name" minlength="1"/>');
                $compile(element)($scope);
                $scope.$digest();

                element.isolateScope().searchStr = 'albanistan';
                var results = {
                    results: [
                        {name: 'Afganistan'},
                        {name: 'Spain'}
                    ],
                    suggestion: 'Afghanistan'
                };

                $httpBackend.expectGET('search?q=' + element.isolateScope().searchStr).respond(200, results);

                element.isolateScope().searchTimerComplete();
                $httpBackend.flush();

                $httpBackend.verifyNoOutstandingExpectation();
                $httpBackend.verifyNoOutstandingRequest();


                // those three variables should make the suggestion phrase visible
                expect(element.isolateScope().suggestion).toBeTruthy();
                expect(element.isolateScope().showDropdown).toBeTruthy();
                expect(element.isolateScope().searching).toBeFalsy();

            }));
            it('should set an error when there is an error with the request but there is data', inject(function ($httpBackend) {


                var element = angular.element('<div angucomplete-alt id="ex1" suggestions-property="suggestion" placeholder="Search names" selected-object="selected" remote-url="search?q=" search-fields="name" remote-url-data-field="results" title-field="name" minlength="1"/>');
                $compile(element)($scope);
                $scope.$digest();

                element.isolateScope().searchStr = 'albanistan';
                var results = {
                    results: [
                        {name: 'Afganistan'},
                        {name: 'Spain'}
                    ],
                    suggestion: 'Afghanistan'
                };

                $httpBackend.expectGET('search?q=' + element.isolateScope().searchStr).respond(500, results);

                element.isolateScope().searchTimerComplete();
                $httpBackend.flush();

                $httpBackend.verifyNoOutstandingExpectation();
                $httpBackend.verifyNoOutstandingRequest();


                // those three variables should make the error phrase visible
                expect(element.isolateScope().unreachable).toBeTruthy();
                expect(element.isolateScope().showDropdown).toBeTruthy();
                expect(element.isolateScope().searching).toBeFalsy();

            }));
            it('should set an error when there is an error with the request and the remoteUrlRequestFormatter is defined and there is data', inject(function ($httpBackend) {


                var element = angular.element('<div angucomplete-alt id="ex1" remote-url-request-formatter="dataFormatFn" suggestions-property="suggestion" placeholder="Search names" selected-object="selected" remote-url="search" search-fields="name" remote-url-data-field="results" title-field="name" minlength="1"/>');
                $scope.dataFormatFn = function (str) {
                    return {q: str};
                };
                $compile(element)($scope);
                $scope.$digest();

                element.isolateScope().searchStr = 'albanistan';
                var results = {
                    results: [
                        {name: 'Afganistan'},
                        {name: 'Spain'}
                    ],
                    suggestion: 'Afghanistan'
                };

                $httpBackend.expectGET('search?q=' + element.isolateScope().searchStr).respond(500, results);

                element.isolateScope().searchTimerComplete();
                $httpBackend.flush();

                $httpBackend.verifyNoOutstandingExpectation();
                $httpBackend.verifyNoOutstandingRequest();


                // those three variables should make the error phrase visible
                expect(element.isolateScope().unreachable).toBeTruthy();
                expect(element.isolateScope().showDropdown).toBeTruthy();
                expect(element.isolateScope().searching).toBeFalsy();

            }));
            it('should show "no results" when there is an error with the request and there is no data', inject(function ($httpBackend) {


                var element = angular.element('<div angucomplete-alt id="ex1" suggestions-property="suggestion" placeholder="Search names" selected-object="selected" remote-url="search?q=" search-fields="name" remote-url-data-field="results" title-field="name" minlength="1"/>');
                $compile(element)($scope);
                $scope.$digest();

                element.isolateScope().searchStr = 'albanistan';
                var results = {
                    results: [
                        {name: 'Afganistan'},
                        {name: 'Spain'}
                    ],
                    suggestion: 'Afghanistan'
                };

                $httpBackend.expectGET('search?q=' + element.isolateScope().searchStr).respond(500, null);

                element.isolateScope().searchTimerComplete();
                $httpBackend.flush();

                $httpBackend.verifyNoOutstandingExpectation();
                $httpBackend.verifyNoOutstandingRequest();


                // those three variables should make the error phrase visible
                expect(element.isolateScope().unreachable).toBeFalsy();
                expect(element.isolateScope().showDropdown).toBeTruthy();
                expect(element.isolateScope().typemore).toBeFalsy();
                expect(element.isolateScope().searching).toBeFalsy();
                expect(element.isolateScope().suggestion).toBeFalsy();
                expect(element.isolateScope().results).toBeUndefined();


            }));
            it('should set no results when there is an error with the request and the remoteUrlRequestFormatter is defined and there is no data', inject(function ($httpBackend) {


                var element = angular.element('<div angucomplete-alt id="ex1" remote-url-request-formatter="dataFormatFn" suggestions-property="suggestion" placeholder="Search names" selected-object="selected" remote-url="search" search-fields="name" remote-url-data-field="results" title-field="name" minlength="1"/>');
                $scope.dataFormatFn = function (str) {
                    return {q: str};
                };
                $compile(element)($scope);
                $scope.$digest();

                element.isolateScope().searchStr = 'albanistan';
                var results = {
                    results: [
                        {name: 'Afganistan'},
                        {name: 'Spain'}
                    ],
                    suggestion: 'Afghanistan'
                };

                $httpBackend.expectGET('search?q=' + element.isolateScope().searchStr).respond(500, null);

                element.isolateScope().searchTimerComplete();
                $httpBackend.flush();

                $httpBackend.verifyNoOutstandingExpectation();
                $httpBackend.verifyNoOutstandingRequest();


                // those three variables should make the error phrase visible
                expect(element.isolateScope().unreachable).toBeFalsy();
                expect(element.isolateScope().showDropdown).toBeTruthy();
                expect(element.isolateScope().typemore).toBeFalsy();
                expect(element.isolateScope().searching).toBeFalsy();
                expect(element.isolateScope().suggestion).toBeFalsy();
                expect(element.isolateScope().results).toBeUndefined();

            }));

        });
        describe("filter", function () {
            var highlight, sce;
            beforeEach(inject(function ($injector) {
                highlight = $injector.get('highlightFilter');
                sce = $injector.get('$sce');
            }));
            it("should short a string its length is greater than the range of subMin and subMax ", function () {
                expect(sce.getTrustedHtml(highlight('paco el flaco', 'el', 'class', 3, 3))).toBe('...co <span class="class">el</span> fl...');
            });
            it("should change submin to 0 when it's bellow the index of the match ", function () {

                expect(sce.getTrustedHtml(highlight('paco el flaco', 'el', 'class', 12, 3))).toBe('paco <span class="class">el</span> fl...');
            });
            it("shouldn't short the string on the left if submin is not defined ", function () {
                expect(sce.getTrustedHtml(highlight('paco el flaco', 'el', 'class', null, 3))).toBe('paco <span class="class">el</span> fl...');
            });
            it("shouldn't short the string on the right if submax is not defined ", function () {
                expect(sce.getTrustedHtml(highlight('paco el flaco', 'el', 'class', 3, null))).toBe('...co <span class="class">el</span> flaco');
            });
            it("shouldn't do anything if there is no target", function () {
                expect(highlight(null, 'el', 'class', 3, 3)).toBeUndefined();
            });
            it("should take 0 as index and sum submin and submax if there isn't match", function () {
                expect(sce.getTrustedHtml(highlight('paco el flaco', 'raa', 'class', 2, 1))).toBe('pac...');
            });
            it("shouldn't repeat '...' on the begining of the second shorting", function () {
                expect(sce.getTrustedHtml((highlight('paco el flaco, paco el flaco', 'el', 'class', 3, 3)))).toBe('...co <span class="class">el</span> fl...co <span class="class">el</span> fl...');
            });
            it("shouldn't cut the string on the second match, even if the submin is higher than the min index", function () {
                expect(sce.getTrustedHtml((highlight('paco el flaco, paco el flaco', 'el', 'class', 12, 3)))).toBe('paco <span class="class">el</span> fl...paco <span class="class">el</span> fl...');
            });
        });
    });

    describe('custom data function for ajax request', function () {

        it('should call the custom data function for ajax request if it is given', inject(function ($httpBackend) {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search names" selected-object="selected" remote-url="names" search-fields="name" remote-url-data-field="data" remote-url-request-formatter="dataFormatFn" title-field="name" minlength="1"/>');
            var sequenceNum = 1234567890,
                query = 'john';
            $scope.dataFormatFn = function (str) {
                return {q: str, sequence: sequenceNum};
            };
            spyOn($scope, 'dataFormatFn').and.callThrough();
            $compile(element)($scope);
            $scope.$digest();

            element.isolateScope().searchStr = query;
            var results = {data: [
                {name: 'john'}
            ]};

            $httpBackend.expectGET('names?q=' + query + '&sequence=' + sequenceNum).respond(200, results);
            element.isolateScope().searchTimerComplete(query);
            $httpBackend.flush();
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
            expect($scope.dataFormatFn).toHaveBeenCalled();
        }));
    });

    describe('custom data formatter function for ajax response', function () {
        it('should not run response data through formatter if not given', inject(function ($httpBackend) {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search names" selected-object="selected" remote-url="names?q=" search-fields="first" remote-url-data-field="data" title-field="name" minlength="1"/>');
            var query = 'john';
            $compile(element)($scope);
            $scope.$digest();

            element.isolateScope().searchStr = query;
            var results = {data: [
                {first: 'John', last: 'Doe'}
            ]};
            spyOn(element.isolateScope(), 'processData');
            $httpBackend.expectGET('names?q=' + query).respond(200, results);
            element.isolateScope().searchTimerComplete();
            $httpBackend.flush();
            element.isolateScope().processResults(results);
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
            expect(element.isolateScope().processData).toHaveBeenCalledWith(results.data);
        }));

        it('should run response data through formatter if given', inject(function ($httpBackend) {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search names" selected-object="selected" remote-url-response-formatter="dataConverter" remote-url="names?q=" search-fields="name" remote-url-data-field="data" title-field="name" minlength="1"/>');
            $scope.dataConverter = function (rawData) {
                var data = rawData.data;
                for (var i = 0; i < data.length; i++) {
                    data[i].name = data[i].last + ', ' + data[i].first;
                }
                return rawData;
            };
            $compile(element)($scope);
            $scope.$digest();

            var query = 'john';
            element.isolateScope().searchStr = query;
            var results = {data: [
                {first: 'John', last: 'Doe'}
            ]};
            spyOn(element.isolateScope(), 'processData');
            $httpBackend.expectGET('names?q=' + query).respond(200, results);
            element.isolateScope().searchTimerComplete();
            $httpBackend.flush();
            element.isolateScope().processResults(results);
            $httpBackend.verifyNoOutstandingExpectation();
            $httpBackend.verifyNoOutstandingRequest();
            expect(element.isolateScope().processData).toHaveBeenCalledWith(results.data);
        }));
    });

    describe('clear result', function () {
        it('should clear input when clear-selected is true', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" selected-object="selectedCountry" local-data="countries" search-fields="name" title-field="name" minlength="1" clear-selected="true"/>');

            $scope.selectedCountry = undefined;
            $scope.countries = [
                {name: 'Afghanistan', code: 'AF'},
                {name: 'Aland Islands', code: 'AX'},
                {name: 'Albania', code: 'AL'}
            ];
            $compile(element)($scope);
            $scope.$digest();

            var inputField = element.find('#ex1_value');
            var eKeyup = $.Event('keyup');
            eKeyup.which = 97; // letter: a
            inputField.val('a');
            inputField.trigger('input');
            inputField.trigger(eKeyup);
            $timeout.flush();
            expect(element.find('#ex1_dropdown').length).toBe(1);

            eKeyup.which = KEY_DW;
            inputField.trigger(eKeyup);
            expect(element.isolateScope().currentIndex).toBe(0);

            eKeyup.which = KEY_EN;
            inputField.trigger(eKeyup);
            expect($scope.selectedCountry.originalObject).toEqual({name: 'Afghanistan', code: 'AF'});

            expect(element.isolateScope().searchStr).toBe(null);
        });
    });

    describe('blur', function () {
        it('should hide dropdown when focus is lost', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" selected-object="selectedCountry" local-data="countries" search-fields="name" title-field="name" minlength="1" clear-selected="true"/>');
            $scope.selectedCountry = undefined;
            $scope.countries = [
                {name: 'Afghanistan', code: 'AF'},
                {name: 'Aland Islands', code: 'AX'},
                {name: 'Albania', code: 'AL'}
            ];
            $compile(element)($scope);
            $scope.$digest();

            var inputField = element.find('#ex1_value');
            var e = $.Event('keyup');
            e.which = 97; // letter: a

            inputField.val('a');
            inputField.trigger('input');
            inputField.trigger(e);
            $timeout.flush();
            expect(element.find('#ex1_dropdown').length).toBe(1);
            inputField.triggerHandler('blur');
            expect(element.find('#ex1_dropdown').length).toBe(1);

            $timeout.flush();
            expect(element.find('#ex1_dropdown').length).toBe(0);
        });

        it('should cancel hiding the dropdown if it happens within pause period', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" selected-object="selectedCountry" local-data="countries" search-fields="name" title-field="name" minlength="1" clear-selected="true"/>');
            $scope.selectedCountry = undefined;
            $scope.countries = [
                {name: 'Afghanistan', code: 'AF'},
                {name: 'Aland Islands', code: 'AX'},
                {name: 'Albania', code: 'AL'}
            ];
            $compile(element)($scope);
            $scope.$digest();

            var inputField = element.find('#ex1_value');
            var e = $.Event('keyup');
            e.which = 97; // letter: a

            inputField.val('a');
            inputField.trigger('input');
            inputField.trigger(e);
            $timeout.flush();
            expect(element.find('#ex1_dropdown').length).toBe(1);

            inputField.triggerHandler('blur');

            expect(element.find('#ex1_dropdown').length).toBe(1)
            $timeout.flush();
            inputField.triggerHandler('focus');

            expect(element.find('#ex1_dropdown').length).toBe(0);
        });
        it("shouldnt lose hide the list when the show more button is clicked. using bootstrap or not", function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" selected-object="selectedCountry" local-data="countries" search-fields="name" title-field="name" minlength="1" clear-selected="true" show-more="true"/>');
            var e = $.Event('keyup'), inputField;

            function digestAndTrigger() {
                $scope.selectedCountry = undefined;
                $scope.countries = [
                    {name: 'Afghanistan', code: 'AF'},
                    {name: 'Aland Islands', code: 'AX'},
                    {name: 'Albania', code: 'AL'}
                ];
                $compile(element)($scope);
                $scope.$digest();

                inputField = element.find('#ex1_value');
                e.which = 97; // letter: a

                inputField.val('a');
                inputField.trigger('input');
                inputField.trigger(e);
                $timeout.flush();
            }

            digestAndTrigger();

            element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" selected-object="selectedCountry" local-data="countries" search-fields="name" title-field="name" minlength="1" clear-selected="true" show-more="true" use-bootstrap="true"/>');
            digestAndTrigger();

            element.isolateScope().dropClick();
            inputField.triggerHandler('blur');
            expect(element.find('#ex1_dropdown').length).toBe(1);
        });
    });

    describe('override results', function () {
        it('should override results when enter is pressed but no result is selected', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" selected-object="selectedCountry" local-data="countries" search-fields="name" title-field="name" minlength="1" override-results="true"/>');
            $scope.selectedCountry = undefined;
            $scope.countries = [
                {name: 'Afghanistan', code: 'AF'},
                {name: 'Aland Islands', code: 'AX'},
                {name: 'Albania', code: 'AL'}
            ];
            $compile(element)($scope);
            $scope.$digest();

            var inputField = element.find('#ex1_value');
            var e = $.Event('keyup');
            e.which = 97; // letter: a

            inputField.val('abc');
            inputField.trigger('input');
            inputField.trigger(e);
            $timeout.flush();
            expect(element.find('#ex1_dropdown').length).toBe(1);

            e.which = KEY_EN;
            inputField.trigger(e);
            expect($scope.selectedCountry.originalObject).toEqual('abc');
            inputField.triggerHandler('blur');
            expect(element.find('#ex1_dropdown').length).toBe(0);
        });
        it('should not override results when enter is pressed but no result is selected', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" selected-object="selectedCountry" local-data="countries" search-fields="name" title-field="name" minlength="1"/>');
            $scope.selectedCountry = undefined;
            $scope.countries = [
                {name: 'Afghanistan', code: 'AF'},
                {name: 'Aland Islands', code: 'AX'},
                {name: 'Albania', code: 'AL'}
            ];
            $compile(element)($scope);
            $scope.$digest();

            var inputField = element.find('#ex1_value');
            var e = $.Event('keyup');
            e.which = 97; // letter: a

            inputField.val('abc');
            inputField.trigger('input');
            inputField.trigger(e);
            $timeout.flush();
            expect(element.find('#ex1_dropdown').length).toBe(1);

            e.which = KEY_EN;
            inputField.trigger(e);
            expect(element.isolateScope().results).toEqual([]);
        });
        it('should override suggestions when enter is pressed but no suggestion is selected also incorporate with clear-selected if it is set', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" selected-object="selectedCountry" local-data="countries" search-fields="name" title-field="name" minlength="1" override-results="true" clear-selected="true"/>');
            $scope.selectedCountry = undefined;
            $scope.countries = [
                {name: 'Afghanistan', code: 'AF'},
                {name: 'Aland Islands', code: 'AX'},
                {name: 'Albania', code: 'AL'}
            ];
            $compile(element)($scope);
            $scope.$digest();

            var inputField = element.find('#ex1_value');
            var e = $.Event('keyup');
            e.which = 97; // letter: a

            inputField.val('abc');
            inputField.trigger('input');
            inputField.trigger(e);
            $timeout.flush();
            expect(element.find('#ex1_dropdown').length).toBe(1);

            e.which = KEY_EN;
            inputField.trigger(e);
            expect($scope.selectedCountry.originalObject).toEqual('abc');
            inputField.triggerHandler('blur');
            expect(element.find('#ex1_dropdown').length).toBe(0);

            expect(element.isolateScope().searchStr).toBe(null);
        });
    });

    describe('select a result', function () {
            it('should call selectedObject callback if given', function () {
                var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" selected-object="countrySelected" local-data="countries" search-fields="name" title-field="name" minlength="1"/>');
                var selected = false;
                $scope.countrySelected = function (value) {
                    selected = true;
                };
                $scope.countries = [
                    {name: 'Afghanistan', code: 'AF'},
                    {name: 'Aland Islands', code: 'AX'},
                    {name: 'Albania', code: 'AL'}
                ];
                $compile(element)($scope);
                $scope.$digest();

                expect(selected).toBe(false);
                var inputField = element.find('#ex1_value');
                var eKeyup = $.Event('keyup');
                eKeyup.which = 97; // letter: a

                inputField.val('a');
                inputField.trigger('input');
                inputField.trigger(eKeyup);
                $timeout.flush();
                expect(element.find('#ex1_dropdown').length).toBe(1);

                eKeyup.which = KEY_DW;
                inputField.trigger(eKeyup);
                expect(element.isolateScope().currentIndex).toBe(0);


                eKeyup.which = KEY_EN;
                inputField.trigger(eKeyup);
                expect(selected).toBe(true);
            });
        it('should set title and description to result if matchClass exists and call selected-object function if given', function () {
            var element = angular.element('<div angucomplete-alt id="ex1" placeholder="Search countries" selected-object="countrySelected" local-data="countries" search-fields="name" title-field="name" minlength="1" match-class="highlight"/>');
            var selected = false;
            $scope.countrySelected = function (value) {
                $scope.value = value;
                selected = true;
            };
            $scope.countries = [
                {name: 'Afghanistan', code: 'AF'},
                {name: 'Aland Islands', code: 'AX'},
                {name: 'Albania', code: 'AL'}
            ];
            spyOn($scope,'countrySelected').and.callThrough();
            $compile(element)($scope);
            $scope.$digest();

            expect(selected).toBe(false);
            var inputField = element.find('#ex1_value');
            var eKeyup = $.Event('keyup');
            eKeyup.which = 97; // letter: a

            inputField.val('a');
            inputField.trigger('input');
            inputField.trigger(eKeyup);
            $timeout.flush();
            expect(element.find('#ex1_dropdown').length).toBe(1);

            eKeyup.which = KEY_DW;
            inputField.trigger(eKeyup);
            expect(element.isolateScope().currentIndex).toBe(0);


            eKeyup.which = KEY_EN;
            inputField.trigger(eKeyup);
            expect(selected).toBe(true);

            expect($scope.countrySelected).toHaveBeenCalled();
            expect($scope.value.title).toEqual('Afghanistan');
            expect($scope.value.description).toEqual('');
        });
    });
});
