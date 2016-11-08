(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var highchartsDefaults = require('./highcharts-defaults');

var parseSheet = function(entries) {
	var parsed = {};
	entries.forEach(function(entry) {
		var newEntry = {};
		for(var k in entry) {
			if(k.indexOf('gsx$') == 0) {
				var key = k.replace('gsx$', '');
				newEntry[key] = entry[k]['$t'];
			}
		}
		parsed[newEntry.column] = newEntry;
	});
	return parsed;
};

module.exports = function(app) {

	app.controller('SiteCtrl', [
		'$rootScope',
		'$scope',
		'$http',
		function($rootScope, $scope, $http) {

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
			};

			$scope.searchStories = '';
			$http
				// .get('https://infoamazonia.org/es/tag/colombia?geojson=1')
				.get('https://infoamazonia.org/es/?s=colombia&geojson=1')
				.then(function(res) {
					$scope.stories = res.data.features;
					// console.log(res, res.headers(['X-Total-Count']));
				});

			$scope.focusedStory = false;
			$scope.$on('storyFocus', function(ev, storyId) {
				$scope.focusedStory = storyId;
			});

		}
	])

	.controller('DashboardCtrl', [
		'$scope',
		'$http',
		'$rootScope',
		function($scope, $http, $rootScope) {
			var indexId = '1SJwsxzWkuBa6BwcgOWVDDODMAaeMgbrM1IQUoRB5WG4';
			var indexJsonp = 'https://spreadsheets.google.com/feeds/list/' + indexId + '/2/public/values?alt=json-in-script&callback=JSON_CALLBACK';

			$http.jsonp(indexJsonp).then(function(res) {
				$scope.dataIndex = parseSheet(res.data.feed.entry);
			});

			$scope.dataColumn = function(key, val) {
				return $scope.matchColumns(key, val)[0];
			};

			$scope.matchColumns = function(key, val) {
				var columns = [];
				for(var k1 in $scope.dataIndex) {
					for(var k2 in $scope.dataIndex[k1]) {
						if(k2 == key && $scope.dataIndex[k1][k2] == val) {
							columns.push($scope.dataIndex[k1]);
						}
					}
				}
				return columns;
			}

			$scope.dataUniqKeys = function(k) {
				var keys = [];
				var arr = _.values($scope.dataIndex);
				arr.forEach(function(item) {
					if(item[k]) {
						keys.push(item[k]);
					}
				});
				return _.uniq(keys);
			};

			$scope.chartConfig = angular.extend({}, highchartsDefaults);

			$rootScope.$on('mapGridItem', function(ev, item) {
				$scope.gridItem = item;
				if(item) {
					var series = $scope.dataUniqKeys('series');
					var chartSeries = [];
					series.forEach(function(s) {
						var sData = {
							data: []
						};
						var items = $scope.matchColumns('series', s);
						items.forEach(function(seriesItem) {
							sData.data.push([seriesItem.reference, item[seriesItem.column]]);
						});
						chartSeries.push(sData);
					});
					$scope.chartConfig.series = chartSeries;
				} else {
					$scope.chartConfig.series = [];
				}
				setTimeout(function() {
					window.dispatchEvent(new Event('resize'));
				}, 100);
			});

		}
	])

	.controller('MapCtrl', [
		'$rootScope',
		'$scope',
		'$timeout',
		'$http',
		'LoadingService',
		function($rootScope, $scope, $timeout, $http, Loading) {

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
						title: '2005',
						username: 'infoamazonia',
						sql: 'select * from bnb_amzideam_2005_ha'
					},
					{
						title: '2010',
						username: 'infoamazonia',
						sql: 'select * from bnb_amzideam_2010_ha'
					},
					{
						title: '2013',
						username: 'infoamazonia',
						sql: 'select * from bnb_2013_amzideam_ha'
					}
				]
			};

			$scope.user = 'infoamazonia';
			$scope.dataTable = 'ideam_deforestacion_anual';
			$scope.geomTable = 'provincias_area_estudio_amz_wgs84';
			$scope.queryWhere = 'data.departamento = geom.nom_depto';

			$scope.sql = new cartodb.SQL({user: $scope.user});
			$scope.dataQuery = 'SELECT * FROM ' + $scope.dataTable;

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

		}
	]);

};

},{"./highcharts-defaults":5}],2:[function(require,module,exports){
'use strict';

module.exports = function(map, $http) {

	var control = L.control.layers({}, {}, {position: 'topleft'}).addTo(map);

	var customLayers = [
		{
			name: 'Areas Protegidas',
			cartocss: 'css/protected_areas.cartocss',
			user: 'infoamazonia',
			sql: "select * from anp_nacional where nacionales_pais= 'Colombia'",
			interactivity: 'nacionales_nombre',
			zIndex: 7
		},
		{
			name: 'Territorios Indigenas',
			cartocss: 'css/territ_indig.cartocss',
			user: 'infoamazonia',
			sql: "select * from territ_rios_ind_genas where tis_pais='Colombia'",
			interactivity: 'tis_nombre',
			zIndex: 7
		},
		{
			name: 'Carreteras',
			cartocss: 'css/roads.cartocss',
			user: 'infoamazonia',
			sql: "select * from carreteras where pais='Colombia'",
			interactivity: null,
			zIndex: 7
		}
	];

	customLayers.forEach(function(config) {
		var layerGroup = L.layerGroup({
			zIndex: config.zIndex
		});
		control.addOverlay(layerGroup, config.name);
		$http.get(config.cartocss).then(function(res) {
			var cartocss = res.data;
			var layerData = {
				user_name: config.user,
				sublayers: [{
					sql: config.sql,
					cartocss: cartocss,
					interactivity: config.interactivity
				}]
			};
			cartodb.Tiles.getTiles(layerData, function(tilesUrl, err) {
				if(tilesUrl == null) {
					console.log("error: ", err.errors.join('\n'));
				} else {
					var layer = L.tileLayer(tilesUrl.tiles[0], {
						zIndex: config.zIndex
					});
					layerGroup.addLayer(layer);

					var grid = new L.UtfGrid(tilesUrl.grids[0][0] + '&callback={cb}');
					layerGroup.addLayer(grid);
					grid.on('mouseover', function(e) {

					});
					grid.on('mouseout', function(e) {

					});
				}
			});
		});
	});

};

},{}],3:[function(require,module,exports){
'use strict';

module.exports = function(app) {

	app.directive('backImg', function() {
		return function(scope, element, attrs) {
				var url = attrs.backImg;
				element.css({
						'background-image': 'url(' + url + ')'
				});
		};
	});

	app.directive('story', [
		function() {
			return {
				restrict: 'EA',
				scope: {
					'story': '=',
					'focused': '=focusedStory'
				},
				link: function(scope, element, attrs) {
					scope.$watch('focused', function() {
						if(scope.story.properties.id == scope.focused) {
							$('#sidebar').animate({
								scrollTop: $(element).position().top -50
							}, 200);
							setTimeout(function() {
								$(element).removeClass('focused-story');
							}, 1500);
						}
					});
				}
			}
		}
	]);

	app.directive('mapTimeline', [
		'$q',
		'$interval',
		'$timeout',
		'$rootScope',
		'$http',
		'Globals',
		function($q, $interval, $timeout, $rootScope, $http, Globals) {
			return {
				restrict: 'E',
				scope: {
					items: '='
				},
				templateUrl: 'views/timeline.html',
				link: function(scope, element, attrs) {

					scope.layerGroup = false;

					scope.$watch(function() {
						return Globals.get('timelineLayerGroup');
					}, function(layerGroup) {
						scope.layerGroup = layerGroup;
					});

					$http.get('css/bnb.cartocss').then(function(res) {

						var cartocss = res.data;

						scope.$watchGroup([
							'layerGroup',
							'items'
						], function() {
							if(scope.items && scope.layerGroup) {
								var promises = [];
								scope.items.forEach(function(item, i) {
									promises.push(getCartoDBLayer(item, i+1))
								});
								$q.all(promises).then(function(layers) {
									scope.layers = layers;
									scope.layers.forEach(function(layer) {
										scope.layerGroup.addLayer(layer);
									});
									scope.displayLayer(scope.items[0]);
									$timeout(function() {
										scope.toggleAuto();
									}, 2000);
								});
							}
						});

						var stopAuto;
						scope.toggleAuto = function() {
							if(angular.isDefined(stopAuto)) {
								scope.stopAuto();
							} else {
								scope.auto = true;
								stopAuto = $interval(function() {
									scope.activeItem._played = true;
									var activeIdx = getIdx(scope.activeItem, scope.items);
									var i = activeIdx + 1;
									if(i == scope.items.length) {
										scope.items.forEach(function(item) {
											item._played = false;
										});
										i = 0;
									}
									$timeout(function() {
										scope.displayLayer(scope.items[i]);
									}, 5);
								}, 2000);
							}
						};

						scope.stopAuto = function() {
							if(angular.isDefined(stopAuto)) {
								scope.auto = false;
								$interval.cancel(stopAuto);
								stopAuto = undefined;
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

						var displayInProgress = false;

						scope.displayLayer = function(item) {
							if(!displayInProgress) {
								displayInProgress = true;
								scope.activeItem = item;
								var newLayer = _.find(scope.layers, function(l) {
									return l._item.title == item.title;
								});
								var newLayerEl = angular.element(newLayer.getContainer());
								scope.layers.forEach(function(layer) {
									var el = angular.element(layer.getContainer());
									if(newLayer._leaflet_id !== layer._leaflet_id) {
										el.removeClass('active');
										// layer.setZIndex(1);
										setTimeout(function() {
											layer.setOpacity(0);
											displayInProgress = false;
										}, 350);
									}
								});
								angular.element(newLayer.getContainer()).addClass('active');
								// layer.setZIndex(2);
								newLayer.setOpacity(1);
							}
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
		'LoadingService',
		'Globals',
		function($rootScope, $timeout, $http, Loading, Globals) {
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

					var layers = {
						base: {
							title: 'Base layer',
							layer: L.tileLayer('https://api.mapbox.com/styles/v1/infoamazonia/cirgitmlm0010gdm9cd48fmlz/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaW5mb2FtYXpvbmlhIiwiYSI6InItajRmMGsifQ.JnRnLDiUXSEpgn7bPDzp7g', {
								zIndex: 1
							})
						},
						rivers: {
							title: 'Rivers',
							layer: L.tileLayer('https://api.mapbox.com/styles/v1/infoamazonia/ciuu7vi3k00dj2js5rt68bm9t/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaW5mb2FtYXpvbmlhIiwiYSI6InItajRmMGsifQ.JnRnLDiUXSEpgn7bPDzp7g', {
								zIndex: 3
							})
						},
						labels: {
							title: 'Labels',
							layer: L.tileLayer('https://{s}.tiles.mapbox.com/v4/infoamazonia.osm-brasil/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiaW5mb2FtYXpvbmlhIiwiYSI6InItajRmMGsifQ.JnRnLDiUXSEpgn7bPDzp7g', {
								zIndex: 6
							})
						}
					};

					for(var key in layers) {
						map.addLayer(layers[key].layer);
					}

					require('./custom-layers')(map, $http);

					var timelineLayerGroup = L.layerGroup({
						zIndex: 2
					});
					var dataLayerGroup = L.layerGroup({
						zIndex: 10
					});
					var storiesLayerGroup = L.layerGroup({
						zIndex: 5
					});

					$rootScope.$on('toggleStories', function(ev, active) {
						if(active) {
							map.addLayer(storiesLayerGroup);
						} else {
							map.removeLayer(storiesLayerGroup);
						}
					});

					Globals.set('timelineLayerGroup', timelineLayerGroup);

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

					var loadingGeojson = false;

					var updateGeojson = _.debounce(function() {
						if(typeof stories !== 'undefined')
							storiesLayerGroup.removeLayer(stories);
						if(scope.geojson && scope.geojson.length) {
							stories = L.geoJSON(scope.geojson, {
								pointToLayer: function(feature, latlng) {
									var marker = L.marker(latlng, {
										icon: storyIcon2,
										bounceOnAdd: true,
										bounceOnAddOptions: {
											duration: 500,
											height: 100
										}
									});
									return marker;
								},
								onEachFeature: function(feature, layer) {
									if(feature.properties) {
										layer.bindPopup('<h2>' + feature.properties.title + '</h2>');
										layer.on('mouseover', function(e) {
											e.target.openPopup();
											e.target.setZIndexOffset(10);
										});
										layer.on('mouseout', function(e) {
											e.target.closePopup();
											e.target.setZIndexOffset(0);
										});
										layer.on('click', function(e) {
											$rootScope.$broadcast('storyFocus', e.target.feature.properties.id);
										});
									}
								}
							});
							storiesLayerGroup.addLayer(stories);
						}
						Loading.remove(loadingGeojson);
						loadingGeojson = false;
					}, 800);

					scope.$watch('geojson', function() {
						if(!loadingGeojson) {
							loadingGeojson = Loading.add('Loading stories');
							updateGeojson();
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
								layer = L.tileLayer(tilesUrl.tiles[0], {zIndex: 10});
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
								var clicked = false;
								grid.on('click', function(e) {
									clicked = true;
									scope.$apply(function() {
										$rootScope.$broadcast('mapGridItem', e.data);
									});
								});
								grid.on('mouseover', function(e) {
									if(!clicked) {
										scope.$apply(function() {
											$rootScope.$broadcast('mapGridItem', e.data);
										});
									}
								});
								grid.on('mouseout', function(e) {
									if(!clicked) {
										scope.$apply(function() {
											$rootScope.$broadcast('mapGridItem', false);
										});
									}
								});
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
		'#layer[zoom>=8] { line-width: 2; }',
		'#layer[zoom>=10] { line-width: 3; }'
	];

	// quantiles.forEach(function(qt, i) {
	// 	cartocss.push('#layer[ ' + column + ' >= ' + qt + ' ] { line-color: ' + colors[i] + ';	}');
	// })

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

},{"./custom-layers":2}],4:[function(require,module,exports){
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

	app.filter('memoize', [
		function() {
			return _.memoize(function(input) {
				return input;
			}, function() {
				return JSON.stringify(arguments);
			})
		}
	]);

};

},{}],5:[function(require,module,exports){
module.exports = {
	options: {
		chart: {
			type: 'bar',
			animation: false,
			backgroundColor: null,
			plotBackgroundColor: null,
			style: {
				fontFamily: 'Open Sans',
				color: '#ffffff'
			}
		},
		tooltip: {
			enabled: false,
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
				animation: false,
				color: '#FF9966',
				borderWidth: 0,
				dataLabels: {
					format: '{y} ha',
					enabled: true,
					color: '#ffffff'
				},
				marker: {
					symbol: 'circle'
				}
			}
		},
		yAxis: {
			labels: {
				style: {
					color: '#fff'
				}
			},
			gridLineColor: 'rgba(255,255,255,0.1)',
			visible: false
		},
		xAxis: {
			type: 'category',
			labels: {
				format: '{value}',
				style: {
					color: '#fff'
				}
			},
			gridLineColor: 'rgba(255,255,255,0.2)',
			visible: true,
			tickLength: 0
		},
		credits: {
			enabled: false
		}
	}
};

},{}],6:[function(require,module,exports){
var app = angular.module('ia-colombia', [
	'ngAnimate',
	'highcharts-ng'
]);

require('./services')(app);
require('./directives')(app);
require('./filters')(app);
require('./controllers')(app);
require('./loading')(app);

angular.element(document).ready(function() {
	angular.bootstrap(document, ['ia-colombia']);
});

},{"./controllers":1,"./directives":3,"./filters":4,"./loading":7,"./services":8}],7:[function(require,module,exports){
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
		function() {

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
					loads = loads.filter(function(load) { return load._id !== id; });
					loads = loads;
					return loads;
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

},{}],8:[function(require,module,exports){
'use strict';

module.exports = function(app) {

	app.factory('Globals', [
		function() {
			var globals = {};
			return {
				set: function(name, v) {
					globals[name] = v;
				},
				get: function(name) {
					return globals[name];
				}
			}
		}
	])

};

},{}]},{},[6]);
