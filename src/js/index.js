require('angular');
Highcharts = require('highcharts');
require('highcharts-ng');

highchartsDefaults = require('./highcharts-defaults');

angular.module('ia-colombia', [
	'highcharts-ng'
])
.controller('SiteCtrl', [
	'$scope',
	'$timeout',
	function($scope, $timeout) {

		$scope.chartConfig = angular.extend({
			series: [{
				data: [10, 15, 12, 8, 7]
			}]
		}, highchartsDefaults);

		console.log($scope.chartConfig);

		$timeout(function() {
			$scope.chartConfig.series.push({
				data: [15, 10, 5, 3, 12, 10, 12, 15, 20]
			});
		}, 5000);

	}
]);


angular.element(document).ready(function() {
	angular.bootstrap(document, ['ia-colombia']);
});
