var highchartsDefaults = require('./highcharts-defaults');

var app = angular.module('ia-colombia', [
	'highcharts-ng'
])

.controller('SiteCtrl', [
	function() {

	}
])

.controller('MapCtrl', [
	'$rootScope',
	'$scope',
	'$timeout',
	'$http',
	function($rootScope, $scope, $timeout, $http) {

		// var indexId = '1SJwsxzWkuBa6BwcgOWVDDODMAaeMgbrM1IQUoRB5WG4';
		// $http.jsonp(indexUrl).then(function(res) {
		// 	console.log(res);
		// });

		$http.get('https://infoamazonia.org/en/tag/colombia?geojson=1').then(function(res) {
			$scope.stories = res.data.features;
		});

		$scope.user = 'infoamazonia';
		$scope.dataTable = 'ideam_deforestacion_anual';
		$scope.geomTable = 'depto_amzideam';
		$scope.queryWhere = 'data.departamento = geom.nom_depto';

		$scope.sql = new cartodb.SQL({user: $scope.user});
		$scope.dataQuery = 'SELECT * FROM ' + $scope.dataTable;

		$scope.gridItem = false;

		$scope.sql.execute($scope.dataQuery).done(function(data) {

			var fields = [];
			for(var key in data.fields) {
				if(key !== 'the_geom' && key !== 'the_geom_webmercator' && key !== 'cartodb_id')
				fields.push(key);
			}
			$rootScope.$apply(function() {
				$scope.columns = fields;
				$scope.query = 'SELECT geom.cartodb_id, geom.the_geom, geom.the_geom_webmercator, data.' + $scope.columns.join(', data.') + ' FROM ' + $scope.dataTable + ' as data, ' + $scope.geomTable + ' as geom WHERE ' + $scope.queryWhere + ' GROUP BY data.cartodb_id, geom.cartodb_id';
			});
		});

		$scope.$watch('gridItem', function() {
			$scope.chartConfig = angular.extend({
				series: [{
					data: [$scope.gridItem.deforestacion_2014, $scope.gridItem.deforestacion_2015]
				}]
			}, highchartsDefaults);
			// console.log($scope.chartConfig);
		})

	}
]);

require('./directives')(app);

angular.element(document).ready(function() {
	angular.bootstrap(document, ['ia-colombia']);
});
