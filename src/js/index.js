// require('angular');
// Highcharts = require('highcharts');
// require('highcharts-ng');
// carto = require('cartodb.js/dist/cartodb.uncompressed.js');

highchartsDefaults = require('./highcharts-defaults');

// console.log(carto);

var app = angular.module('ia-colombia', [
	'highcharts-ng'
])
.controller('SiteCtrl', [
	'$rootScope',
	'$scope',
	'$timeout',
	function($rootScope, $scope, $timeout) {

		$scope.user = 'infoamazonia'
		$scope.sql = new cartodb.SQL({user: $scope.user});
		$scope.query = '';
		$scope.dataTable = 'ideam_deforestacion_anual';
		$scope.dataQuery = 'SELECT * FROM ' + $scope.dataTable;

		$scope.sql.execute($scope.dataQuery).done(function(data) {
			console.log(data);
			var fields = [];
			for(var key in data.fields) {
				if(key !== 'the_geom' && key !== 'the_geom_webmercator')
					fields.push(key);
			}

			$rootScope.$apply(function() {

				$scope.columns = fields;

				$scope.query = 'SELECT geom.the_geom, geom.the_geom_webmercator, data.' + $scope.columns.join(', data.') + ' FROM ideam_deforestacion_anual as data, subregiones_nomdepto_area_estudio_amz4326 as geom WHERE data.departamentos = nom_depto GROUP BY data.cartodb_id, geom.cartodb_id';

			});

		});

		$scope.chartConfig = angular.extend({
			series: [{
				data: [10, 15, 12, 8, 7]
			}]
		}, highchartsDefaults);

	}
]);

require('./directives')(app);

angular.element(document).ready(function() {
	angular.bootstrap(document, ['ia-colombia']);
});
