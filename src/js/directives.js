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
		'$timeout',
		'$rootScope',
		'$http',
		function($q, $interval, $timeout, $rootScope, $http) {
			return {
				restrict: 'E',
				scope: {
					items: '='
				},
				templateUrl: 'views/timeline.html',
				link: function(scope, element, attrs) {

					scope.layerGroup = false;

					$rootScope.$on('timelineLayerGroup', function(ev, lG) {
						scope.layerGroup = lG;
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
		function($rootScope, $timeout, $http, Loading) {
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
						zIndex: 1
					}));

					map.addLayer(L.tileLayer('https://api.mapbox.com/styles/v1/infoamazonia/ciuu7vi3k00dj2js5rt68bm9t/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaW5mb2FtYXpvbmlhIiwiYSI6InItajRmMGsifQ.JnRnLDiUXSEpgn7bPDzp7g', {
						zIndex: 3
					}));

					var timelineLayerGroup = L.layerGroup({
						zIndex: 2
					});
					var dataLayerGroup = L.layerGroup({
						zIndex: 4
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

					var loadingGeojson = false;

					var updateGeojson = _.debounce(function() {
						if(typeof stories !== 'undefined')
							storiesLayerGroup.removeLayer(stories);
						if(scope.geojson && scope.geojson.length) {
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
		'#layer { polygon-fill: transparent; polygon-opacity: 1; line-width: 1; line-opacity: 0.5; line-color: #fff; }'
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
