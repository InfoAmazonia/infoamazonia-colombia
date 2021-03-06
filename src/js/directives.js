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

	app.directive('sidebarContent', [
		'$rootScope',
		function($rootScope) {
			return {
				restrict: 'EA',
				link: function(scope, element, attrs) {
					scope.viewing = false;
					if(!isMobileWidth())
						scope.viewing = 'dashboard';
					scope.setView = function(view) {
						if(isMobileWidth() && view == scope.viewing)
							scope.viewing = false;
						else
							scope.viewing = view;
					};
					scope.$watch('viewing', function(viewing, prev) {

						if(isMobileWidth()) {
							if(!prev && viewing) {
								$rootScope.$broadcast('map.fitBounds', {
									paddingTopLeft: [0,0],
									paddingBottomRight: [0,window.innerHeight*.4]
								});
							} else if(prev && !viewing) {
								$rootScope.$broadcast('map.fitBounds', {
									paddingTopLeft: [0,0],
									paddingBottomRight: [0,0]
								});
							}
						}

						if(scope.viewing)
							jQuery('body').addClass('active-sidebar')
						else
							jQuery('body').removeClass('active-sidebar')

						if(scope.viewing == 'stories') {
							$rootScope.$broadcast('toggleStories', true);
						} else {
							$rootScope.$broadcast('toggleStories', false);
						}
					});
				}
			}
		}
	]);

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
							console.log(scope.focused);
							$('#sidebar').animate({
								scrollTop: $(element).position().top + 150
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
									scope.displayLayer(scope.items[scope.items.length-1]);
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
					legend: '=',
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
						attributionControl: false,
						center: [0,0],
						zoom: 1,
						scrollWheelZoom: true,
						fadeAnimation: false
					});

					var bounds;

					scope.$on('map.fitBounds', function(ev, padding) {
						map.fitBounds(bounds || map.getBounds(), padding);
					});

					var legendControl = L.control.legend({
						position: 'bottomleft'
					});
					map.addControl(legendControl);

				 	scope.$watch('legend', function(legend, prevLegend) {
						if(prevLegend) {
							legendControl.removeLegend(prevLegend);
						}
						if(legend) {
							legendControl.addLegend(legend);
						}
					});

					var layers = {
						base: {
							title: 'Base layer',
							layer: L.tileLayer('https://api.mapbox.com/styles/v1/infoamazonia/cirgitmlm0010gdm9cd48fmlz/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaW5mb2FtYXpvbmlhIiwiYSI6InItajRmMGsifQ.JnRnLDiUXSEpgn7bPDzp7g', {
								zIndex: 1
							})
						},
						labels: {
							title: 'Labels',
							layer: L.tileLayer('https://api.mapbox.com/styles/v1/infoamazonia/ciuu34i5l005h2inn3843b6b3/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiaW5mb2FtYXpvbmlhIiwiYSI6InItajRmMGsifQ.JnRnLDiUXSEpgn7bPDzp7g', {
								zIndex: 15
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
								scope.sql.getBounds(scope.query).done(function(bnds) {
									var paddingRight = 0;
									if(!window.isMobileWidth()) {
										paddingRight = window.innerWidth * .4;
									}
									bounds = bnds;
									map.fitBounds(bounds, {
										paddingTopLeft: [
											0,
											0
										],
										paddingBottomRight: [
											paddingRight,
											0
										]
									});
								});
								grid = new L.UtfGrid(tilesUrl.grids[0][0] + '&callback={cb}');
								dataLayerGroup.addLayer(grid);
								var clicked = false;
								grid.on('click', function(e) {
									if(isMobileWidth()) {
										clicked = true;
										scope.$apply(function() {
											$rootScope.$broadcast('mapGridItem', e.data);
										});
									}
								});
								var outTimeout;
								grid.on('mousemove', function(e) {
									clearTimeout(outTimeout);
									if(!clicked) {
										scope.$apply(function() {
											$rootScope.$broadcast('mapGridItem', e.data);
										});
									}
								});
								grid.on('mouseout', function(e) {
									if(!clicked) {
										outTimeout = setTimeout(function() {
											scope.$apply(function() {
												$rootScope.$broadcast('mapGridItem', false);
											});
										}, 200);
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
		'#layer { polygon-fill: transparent; polygon-opacity: 1; line-width: 0; line-opacity: 0.5; line-color: #fff; }',
		'#layer[zoom>=5] { line-width: 1; }',
		'#layer[zoom>=8] { line-width: 2; }',
		'#layer[zoom>=10] { line-width: 3; }',
		'#layer::labels[zoom>=6] {',
		'text-name: [departamento];',
		'text-face-name: "Open Sans Italic";',
		'text-size: 10;',
		'text-fill: #FFFFFF;',
		'text-label-position-tolerance: 0;',
		'text-transform: uppercase;',
		'text-halo-radius: 0;',
		'text-dy: -10;',
		'text-allow-overlap: false;',
		'text-placement: interior;',
		'text-placement-type: simple;',
		'[zoom=7]{text-size: 12;}',
		'[zoom=8]{text-size: 15;}',
		'[zoom=9]{text-size: 17;}',
		'[zoom>=10]{text-size: 19;}',
		'}',
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
