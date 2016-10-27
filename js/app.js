(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function(map, $http) {

  $http.get('css/bnb_2013_amzideam_ha.cartocss').then(function(res) {
    cartodb.Tiles.getTiles({
      user_name: 'infoamazonia',
      sublayers: [{
        sql: 'select * from bnb_2013_amzideam_ha',
        cartocss: res.data
      }]
    }, function(tilesUrl, err) {
      if(tilesUrl == null) {
        console.log("error: ", err.errors.join('\n'));
      } else {
        map.addLayer(L.tileLayer(tilesUrl.tiles[0]), {
          zIndexOffset: 2
        });
      }
    });
  });
  $http.get('css/bnb_1990_ideamamz.cartocss').then(function(res) {
    cartodb.Tiles.getTiles({
      user_name: 'infoamazonia',
      sublayers: [{
        sql: 'select * from bnb_1990_ideamamz',
        cartocss: res.data
      }]
    }, function(tilesUrl, err) {
      if(tilesUrl == null) {
        console.log("error: ", err.errors.join('\n'));
      } else {
        map.addLayer(L.tileLayer(tilesUrl.tiles[0], {
          zIndexOffset: 1
        }));
      }
    });
  });

}

},{}],2:[function(require,module,exports){
'use strict';

var baseLayers = require('./base-layers');

module.exports = function(app) {

	app.directive('map', [
		'$rootScope',
		'$http',
		function($rootScope, $http) {
			return {
				restrict: 'EAC',
				scope: {
					username: '=',
					sql: '=',
					query: '=',
					columns: '=',
					table: '=',
					gridItem: '='
				},
				link: function(scope, element, attrs) {

					var map = L.map(element[0], {
						center: [0,0],
						zoom: 1,
						scrollWheelZoom: true
					});

					// var BING_KEY = 'AqcPFocZWfHGkBoBjZ0e3NlBbKqN9t_lRuRyjVg7xHlc7JXWrGvupqLFYWRVqfv4';

					// map.addLayer(L.tileLayer.bing({
					// 	bingMapsKey: BING_KEY,
					// 	opacity: .5,
					// 	zIndexOffset: 1
					// }));

					map.addLayer(L.tileLayer('https://api.mapbox.com/styles/v1/infoamazonia/cirgitmlm0010gdm9cd48fmlz/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaW5mb2FtYXpvbmlhIiwiYSI6InItajRmMGsifQ.JnRnLDiUXSEpgn7bPDzp7g', {
						zIndexOffset: 1
					}));

					var baseLayerGroup = L.layerGroup({
						zIndexOffset: 2
					}).addTo(map);

					var dataLayerGroup = L.layerGroup({
						zIndexOffset: 3
					}).addTo(map);

					baseLayers(baseLayerGroup, $http);

					var layer;
					var grid;

					scope.$watchGroup([
						'username',
						'query',
						'sql',
						'columns',
						'dataTable'
					], function() {
						if(typeof layer !== 'undefined') {
							dataLayerGroup.removeLayer(layer);
						}
						if(typeof grid !== 'undefined') {
							dataLayerGroup.removeLayer(grid);
						}
						if(scope.username && scope.query && scope.sql && scope.columns) {

							scope.column = scope.columns[2];

							getCartoDBQuantiles(scope.sql, scope.table, scope.column, function(bins) {

								var cartocss = getCartoCSS(scope.column, bins);

								addLayers(cartocss);

							});

						}
					});

					function addLayers(cartocss) {
						var layerData = {
							user_name: scope.username,
							sublayers: [{
								sql: scope.query,
								cartocss: cartocss,
								interactivity: scope.columns
							}]
						};
						cartodb.Tiles.getTiles(layerData, function(tilesUrl, err) {
							if(tilesUrl == null) {
								console.log("error: ", err.errors.join('\n'));
							} else {
								layer = L.tileLayer(tilesUrl.tiles[0], {
									zIndexOffset: 3
								});
								dataLayerGroup.addLayer(layer);
								scope.sql.getBounds(scope.query).done(function(bounds) {
									map.fitBounds(bounds, {
										paddingTopLeft: [
											0,
											100
										],
										paddingBottomRight: [
											window.innerWidth / 3,
											0
										]
									});
								});
								grid = new L.UtfGrid(tilesUrl.grids[0][0] + '&callback={cb}');
								dataLayerGroup.addLayer(grid);
								grid.on('mouseover', function(e) {
									scope.$apply(function() {
										scope.gridItem = e.data;
									});
								});
								grid.on('mouseout', function(e) {
									scope.$apply(function() {
										scope.gridItem = false;
									});
								})
							}
						});
					}
				}
			}
		}
	]);

};

function getCartoCSS(column, quantiles) {

	var cartocss = [
		'#layer { polygon-fill: transparent; polygon-opacity: 1; line-width: .5; line-opacity: 0.5; line-color: #fff; }',
		'#layer[ ' + column + ' <= 0 ] { polygon-fill: transparent; }'
	];

	quantiles.forEach(function(qt, i) {
		cartocss.push('#layer[ ' + column + ' >= ' + qt + ' ] { polygon-fill: rgba(255, 255, 255, ' + ((i+1)/10) + ');	}');
	});

	return cartocss.join(' ');

}

function getCartoDBQuantiles(sql, table, column, cb) {
	sql.execute('SELECT CDB_HeadsTailsBins(array_agg(cast(' + column + ' as numeric)), 7) FROM ' + table).done(function(data) {
		var bins = data.rows[0].cdb_headstailsbins;
		console.log(data);
		cb(bins);
	});
}

},{"./base-layers":1}],3:[function(require,module,exports){
module.exports = {
	options: {
		chart: {
			type: 'spline',
			backgroundColor: null,
			plotBackgroundColor: null,
			style: {
				fontFamily: 'Open Sans',
				color: '#ffffff'
			}
		},
		tooltip: {
			style: {
				padding: 10,
				fontWeight: 'bold'
			}
		},
		title: false,
		subtitle: false,
		legend: {
			enabled: false
		},
		plotOptions: {
			series: {
				color: '#f26969'
			}
		},
		yAxis: {
			labels: {
				style: {
					color: '#fff'
				}
			},
			gridLineColor: 'rgba(255,255,255,0.1)'
		},
		xAxis: {
			labels: {
				style: {
					color: '#fff'
				}
			}
		},
		credits: {
			enabled: false
		}
	}
};

},{}],4:[function(require,module,exports){
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
	function($rootScope, $scope, $timeout) {

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
			console.log($scope.chartConfig);
		})

	}
]);

require('./directives')(app);

angular.element(document).ready(function() {
	angular.bootstrap(document, ['ia-colombia']);
});

},{"./directives":2,"./highcharts-defaults":3}]},{},[4]);
