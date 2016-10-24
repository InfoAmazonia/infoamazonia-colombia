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

		$scope.user = 'infoamazonia';
		$scope.dataTable = 'ideam_deforestacion_anual';
		$scope.geomTable = 'depto_amzideam';
		$scope.queryWhere = 'data.departamentos = geom.nom_depto';

		$scope.sql = new cartodb.SQL({user: $scope.user});
		$scope.dataQuery = 'SELECT * FROM ' + $scope.dataTable;

		$scope.sql.execute($scope.dataQuery).done(function(data) {
			console.log(data);
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
