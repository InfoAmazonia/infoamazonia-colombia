'use strict';

module.exports = function(app) {

	app.run([
		'$rootScope',
		'LoadingService',
		function($rootScope,service) {

			if(typeof jQuery !== 'undefined') {

				jQuery(document).ajaxSend(function(ev, jqXHR, options) {
					if(options.loadingMsg !== false) {
						options.loadingId = service.add(options.loadingMessage);
					}
				});

				jQuery(document).ajaxComplete(function(ev, jqXHR, options) {
					if(options.loadingMsg !== false) {
						$rootScope.$apply(function() {
							service.remove(options.loadingId);
						});
					}
				});

				jQuery(document).ajaxError(function(ev, jqXHR, options) {
					if(options.loadingMsg !== false) {
						$rootScope.$apply(function() {
							service.remove(options.loadingId);
						});
					}
				});

				jQuery(document).ajaxSuccess(function(ev, jqXHR, options) {
					if(options.loadingMsg !== false) {
						$rootScope.$apply(function() {
							service.remove(options.loadingId);
						});
					}
				});

			}

		}
	])

	.config([
		'$httpProvider',
		function($httpProvider) {
			$httpProvider.interceptors.push('loadingStatusInterceptor');
		}
	])

	.service('LoadingService', [
		'$timeout',
		function($timeout) {

			var loads = [];

			return {
				get: function() {
					return loads;
				},
				add: function(text, id) {
					if(typeof id == 'undefined')
						id = Math.random();

					var load = {
						_id: id,
						msg: text
					};

					loads.push(load);
					loads = loads; // trigger digest?
					return load._id;
				},
				remove: function(id) {
					$timeout(function() {
						loads = loads.filter(function(load) { return load._id !== id; });
					}, 10);
				}
			}

		}
	])

	.directive('loadingStatusMessage', [
		'$timeout',
		'LoadingService',
		function($timeout, service) {
			return {
				template: '<div class="loading-message"><span class="fa fa-circle-o-notch fa-spin fa-3x fa-fw"></span><span ng-repeat="load in loads" ng-show="load.msg">{{load.msg}}<br/></span></div>',
				link: function(scope, element, attrs) {
					scope.$watch(function() {
						return service.get();
					}, function(loads) {
						scope.loads = loads;
					});
				}
			};
		}
	])

	.factory('loadingStatusInterceptor', [
		'$q',
		'$rootScope',
		'$timeout',
		'LoadingService',
		function($q, $rootScope, $timeout, service) {
			return {
				request: function(config) {
					if(config.loadingMessage)
						config.loadingId = service.add(config.loadingMessage);
					return config || $q.when(config);
				},
				response: function(response) {
					if(response.config.loadingId)
						service.remove(response.config.loadingId);
					return response || $q.when(response);
				},
				responseError: function(rejection) {
					if(rejection.config.loadingId)
						service.remove(rejection.config.loadingId);
					return $q.reject(rejection);
				}
			};
		}
	]);

};
