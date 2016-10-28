(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function(map, $http) {

  $http.get('css/bnb.cartocss').then(function(res) {
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
          zIndexOffset: 3
        });
      }
    });
  });
  $http.get('css/bnb.cartocss').then(function(res) {
    cartodb.Tiles.getTiles({
      user_name: 'infoamazonia',
      sublayers: [{
        sql: 'select * from bnb_ideamz_2000_ha',
        cartocss: res.data
      }]
    }, function(tilesUrl, err) {
      if(tilesUrl == null) {
        console.log("error: ", err.errors.join('\n'));
      } else {
        map.addLayer(L.tileLayer(tilesUrl.tiles[0], {
          zIndexOffset: 2
        }));
      }
    });
  });
  $http.get('css/bnb.cartocss').then(function(res) {
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

	app.directive('backImg', function() {
		return function(scope, element, attrs) {
				var url = attrs.backImg;
				element.css({
						'background-image': 'url(' + url + ')'
				});
		};
	});

	app.directive('mapTimeline', [
		'$q',
		'$interval',
		'$rootScope',
		'$http',
		function($q, $interval, $rootScope, $http) {
			return {
				restrict: 'E',
				scope: {
					items: '='
				},
				templateUrl: 'views/timeline.html',
				link: function(scope, element, attrs) {

					var layerGroup;

					$rootScope.$on('timelineLayerGroup', function(ev, lG) {
						layerGroup = lG;
					});

					$http.get('css/bnb.cartocss').then(function(res) {

						var cartocss = res.data;

						scope.$watchGroup([
							'layerGroup',
							'items'
						], function() {
							if(scope.items) {
								var promises = [];
								scope.items.forEach(function(item, i) {
									promises.push(getCartoDBLayer(item, i+1))
								});
								$q.all(promises).then(function(layers) {
									scope.layers = layers;
									scope.layers.forEach(function(layer) {
										layerGroup.addLayer(layer);
									});
									scope.displayLayer(scope.items[0]);
									scope.toggleAuto();
								});
							}
						});

						var stopAuto;
						scope.toggleAuto = function() {
							if(angular.isDefined(stopAuto)) {
								scope.auto = false;
								$interval.cancel(stopAuto);
								stopAuto = undefined;
							} else {
								scope.auto = true;
								stopAuto = $interval(function() {
									var activeIdx = getIdx(scope.activeItem, scope.items);
									var i = activeIdx + 1;
									if(i == scope.items.length) {
										i = 0;
									}
									scope.displayLayer(scope.items[i]);
								}, 2000);
							}
						};

						var getIdx = function(item, arr) {
							var idx = -1;
							arr.forEach(function(it, i) {
								if(it.title == item.title)
									idx = i;
							});
							return idx;
						};

						scope.displayLayer = function(item) {
							scope.activeItem = item;
							scope.layers.forEach(function(layer) {
								angular.element(layer.getContainer()).removeClass('active');
								layer.setZIndex(1);
							});
							var layer = _.find(scope.layers, function(l) {
								return l._item.title == item.title;
							});
							angular.element(layer.getContainer()).addClass('active');
							layer.setZIndex(2);
						}

						var getCartoDBLayer = function(item, index) {
							var deferred = $q.defer();
							cartodb.Tiles.getTiles({
								user_name: item.username,
								sublayers: [{
									sql: item.sql,
									cartocss: cartocss
								}]
							}, function(tilesUrl, err) {
								if(tilesUrl == null) {
									deferred.reject(err);
								} else {
									var layer = L.tileLayer(tilesUrl.tiles[0], {
										zIndexOffset: index
									});
									layer._item = item;
									deferred.resolve(layer);
								}
							});
							return deferred.promise;
						}

					});

				}
			}
		}
	]);

	app.directive('map', [
		'$rootScope',
		'$timeout',
		'$http',
		function($rootScope, $timeout, $http) {
			return {
				restrict: 'EAC',
				scope: {
					username: '=',
					sql: '=',
					query: '=',
					columns: '=',
					table: '=',
					gridItem: '=',
					geojson: '='
				},
				link: function(scope, element, attrs) {

					var map = L.map(element[0], {
						center: [0,0],
						zoom: 1,
						scrollWheelZoom: true,
						fadeAnimation: false
					});

					map.addLayer(L.tileLayer('https://api.mapbox.com/styles/v1/infoamazonia/cirgitmlm0010gdm9cd48fmlz/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaW5mb2FtYXpvbmlhIiwiYSI6InItajRmMGsifQ.JnRnLDiUXSEpgn7bPDzp7g', {
						zIndexOffset: 1
					}));

					var timelineLayerGroup = L.layerGroup({
						zIndexOffset: 2
					});
					var dataLayerGroup = L.layerGroup({
						zIndexOffset: 3
					});
					var storiesLayerGroup = L.layerGroup({
						zIndexOffset: 4
					});

					$rootScope.$on('toggleStories', function(ev, active) {
						if(active) {
							map.addLayer(storiesLayerGroup);
						} else {
							map.removeLayer(storiesLayerGroup);
						}
					});

					$timeout(function() {
						$rootScope.$broadcast('timelineLayerGroup', timelineLayerGroup);
					}, 100);

					setTimeout(function() {
						timelineLayerGroup.addTo(map);
						dataLayerGroup.addTo(map);
					}, 2000);

					var layer;
					var grid;
					var stories;

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

					var storyIcon = L.icon({
						iconUrl: 'img/marker.png',
						iconSize: [16, 20],
						iconAnchor: [8, 20],
						popupAnchor: [0, -25],
					});

					var storyIcon2 = L.icon({
						iconUrl: 'img/marker_.png',
						iconSize: [12, 16],
						iconAnchor: [6, 16],
						popupAnchor: [0, -20],
					});

					scope.$watch('geojson', function() {
						if(typeof stories !== 'undefined')
							storiesLayerGroup.removeLayer(stories);
						if(scope.geojson) {
							stories = L.geoJSON(scope.geojson, {
								pointToLayer: function(feature, latlng) {
									return L.marker(latlng, {
										icon: storyIcon2,
										bounceOnAdd: true,
										bounceOnAddOptions: {
											duration: 500,
											height: 100
										}
									});
								},
								onEachFeature: function(feature, layer) {
								}
							});
							storiesLayerGroup.addLayer(stories);
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
								layer = L.tileLayer(tilesUrl.tiles[0]);
								dataLayerGroup.addLayer(layer);
								scope.sql.getBounds(scope.query).done(function(bounds) {
									map.fitBounds(bounds, {
										paddingTopLeft: [
											0,
											0
										],
										paddingBottomRight: [
											window.innerWidth * .4,
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
		'#layer { polygon-fill: transparent; polygon-opacity: 1; line-width: 1; line-opacity: 0.5; line-color: #fff; }',
		'#layer[ ' + column + ' <= 0 ] { polygon-fill: transparent; }'
	];

	// quantiles.forEach(function(qt, i) {
	// 	cartocss.push('#layer[ ' + column + ' >= ' + qt + ' ] { polygon-fill: rgba(255, 255, 255, ' + ((i+1)/10) + ');	}');
	// });

	return cartocss.join(' ');

}

function getCartoDBQuantiles(sql, table, column, cb) {
	sql.execute('SELECT CDB_HeadsTailsBins(array_agg(cast(' + column + ' as numeric)), 7) FROM ' + table).done(function(data) {
		var bins = data.rows[0].cdb_headstailsbins;
		cb(bins);
	});
}

},{"./base-layers":1}],3:[function(require,module,exports){
'use strict';

module.exports = function(app) {

	app.filter('formatDate', [
		function() {
			return function(input, format) {
				if(input) {
					input = moment(input).format(format || 'LLLL');
				}
				return input;
			}
		}
	]);

};

},{}],4:[function(require,module,exports){
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

},{}],5:[function(require,module,exports){
var highchartsDefaults = require('./highcharts-defaults');

var app = angular.module('ia-colombia', [
	'ngAnimate',
	'highcharts-ng'
])

.controller('SiteCtrl', [
	'$rootScope',
	'$scope',
	function($rootScope, $scope) {

		$scope.showNav = false;
		$scope.toggleNav = function() {
			if(!$scope.showNav)
				$scope.showNav = true;
			else
				$scope.showNav = false;
		};

		$scope.viewing = 'dashboard';
		$scope.setView = function(view) {
			$scope.viewing = view;
		};

		$scope.$watch('viewing', function() {
			if($scope.viewing == 'stories') {
				$rootScope.$broadcast('toggleStories', true);
			} else {
				$rootScope.$broadcast('toggleStories', false);
			}
		});

		$scope.isDifferentDate = function(stories, i, date) {
			if(stories[i]) {
				return !moment(stories[i].properties.date).isSame(moment(date), 'day');
			} else {
				return true;
			}
		}

	}
])

.controller('MapCtrl', [
	'$rootScope',
	'$scope',
	'$timeout',
	'$http',
	function($rootScope, $scope, $timeout, $http) {

		// Map timeline config
		$scope.timeline = {
			items: [
				{
					title: '1990',
					username: 'infoamazonia',
					sql: 'select * from bnb_1990_ideamamz'
				},
				{
					title: '2000',
					username: 'infoamazonia',
					sql: 'select * from bnb_ideamz_2000_ha'
				},
				{
					title: '2013',
					username: 'infoamazonia',
					sql: 'select * from bnb_2013_amzideam_ha'
				}
			]
		};

		var indexId = '1SJwsxzWkuBa6BwcgOWVDDODMAaeMgbrM1IQUoRB5WG4';
		var indexJsonp = 'https://spreadsheets.google.com/feeds/list/' + indexId + '/2/public/values?alt=json-in-script&callback=JSON_CALLBACK';

		$http.jsonp(indexJsonp).then(function(res) {
			$scope.dataIndex = parseSheet(res.data.feed.entry);
			console.log($scope.dataIndex);
		});

		var parseSheet = function(entries) {
			var parsed = [];
			entries.forEach(function(entry) {
				var newEntry = {};
				for(var key in entry) {
					if(key.indexOf('gsx$') == 0) {
						newEntry[key.replace('gsx$', '')] = entry[key]['$t'];
					}
				}
				parsed.push(newEntry);
			});
			return parsed;
		};

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
		});

		// $http.get('https://infoamazonia.org/es/tag/colombia?geojson=1').then(function(res) {
		$http.get('https://infoamazonia.org/es/?s=colombia&geojson=1').then(function(res) {
			$scope.stories = res.data.features;
			console.log(res, res.headers('x-total-count'));
		});

	}
]);

require('./directives')(app);
require('./filters')(app);

angular.element(document).ready(function() {
	angular.bootstrap(document, ['ia-colombia']);
});

},{"./directives":2,"./filters":3,"./highcharts-defaults":4}]},{},[5]);
