'use strict';

module.exports = function(app) {

	app.directive('map', [
		'$rootScope',
		function($rootScope) {
			return {
				restrict: 'EAC',
				scope: {
					username: '=',
					sql: '=',
					query: '=',
					columns: '=',
					dataTable: '='
				},
				link: function(scope, element, attrs) {

					var map = L.map(element[0], {
						center: [0,0],
						zoom: 1,
						scrollWheelZoom: false,
						infowindow: true
					});

					map.addLayer(L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'));

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
							map.removeLayer(layer);
						}
						if(typeof grid !== 'undefined') {
							map.removeLayer(grid);
						}
						if(scope.username && scope.query && scope.sql) {
							updateLayer();
						}
					});

					function updateLayer() {
						var layerData = {
							user_name: scope.username,
							sublayers: [{
								sql: scope.query,
								cartocss: '#layer { polygon-fill: #f00; }',
								// interactivity: 'departamentos'
							}]
						};
						cartodb.Tiles.getTiles(layerData, function(tilesUrl, err) {
							if(tilesUrl == null) {
								console.log("error: ", err.errors.join('\n'));
							} else {
								grid = new L.UtfGrid(tilesUrl.grids[0][0]);
								layer = L.tileLayer(tilesUrl.tiles[0]);
								map.addLayer(grid);
								map.addLayer(layer);
								scope.sql.getBounds(scope.query).done(function(bounds) {
									map.fitBounds(bounds);
								});
								grid.on('mouseover', function(e) {
									console.log('hover', e.data);
								})
							}
						});
					}

					function init() {

						getCartoDBQuantiles(sql, attrs.table, attrs.column, function(quantiles) {

							sql.getBounds(boundSelect).done(function(bounds) {

								var cartocss = getCartoCSS(attrs.table, attrs.color, quantiles, attrs.city);

								cartodb.createLayer(map, {
									user_name: attrs.user,
									type: 'cartodb',
									sublayers: [{
										sql: select,
										cartocss: cartocss,
										interactivity: attrs.interactivity || 'value'
									}],
									options: {
										tooltip: true
									}
								})
								.addTo(map)
								.done(function(layer) {

									fixMap(map, bounds);

									var sublayer = layer.getSubLayer(0);

									var update = _.debounce(function() {

										//update quantiles
										getCartoDBQuantiles(sql, attrs.table, attrs.column, function(qts) {

											quantiles = qts;

											// set new cartocss
											sublayer.set({'cartocss': getCartoCSS(table, attrs.color, quantiles, attrs.city)});

											// update query
											var select = 'SELECT ' + attrs.column + ' as value, * FROM ' + table;
											if(attrs.where) {
												select += ' WHERE ' + attrs.where;
											}
											sublayer.set({'sql': select});

										});

									}, 100);

									attrs.$observe('group', update);
									attrs.$observe('column', update);
									attrs.$observe('color', update);

									sublayer.setInteraction(true);

									layer.on('featureOver', function(event, latlng, pos, data, layerIndex) {
										$rootScope.$broadcast('cartodbFeatureOver', _.extend({id: attrs.group}, data));
									});

									layer.on('featureOut', function(event) {
										$rootScope.$broadcast('cartodbFeatureOver', {id: attrs.group});
									});

								});

							});

						});

					}

				}
			}
		}
	]);

};

function getCartoCSS(table, color, quantiles, city) {

	var hex = hexToRgb(color);

	var cartocss = [
		'#' + table + ' { polygon-fill: transparent; polygon-opacity: 1; line-width: 1; line-opacity: 0.5; line-color: #000; }',
		'#' + table + '[ value <= 0 ] { polygon-fill: transparent; }'
	];

	_.each(quantiles, function(qt, i) {
		cartocss.push('#' + table + '[ value >= ' + qt + ' ] { polygon-fill: rgba(' + hex + ', ' + ((i+1)/10) + ');	}');
	});

	if(city) {
		cartocss.push('#' + table + '[ co_ibge3 = "' + city + '" ] { line-width: 2; line-color: #fff; line-opacity: 1; }');
	}

	return cartocss.join(' ');

}

function getCartoDBQuantiles(sql, table, column, cb) {
	sql.execute('SELECT CDB_HeadsTailsBins(array_agg(cast(' + column + ' as numeric)), 10) FROM ' + table).done(function(data) {
		var bins = data.rows[0].cdb_headstailsbins;
		cb(bins);
	});
}

function numberInterval(options, callback, endCallback) {

	var options = options || {};

	options = _.extend({
		countTo: 0,
		value: 0,
		duration: 1000
	}, options);

	var num, refreshInterval, steps, step, increment, timeoutId;

	var calculate = function () {
		refreshInterval = 30;
		step = 0;
		timeoutId = null;
		options.countTo = parseFloat(options.countTo) || 0;
		options.value = parseFloat(options.value) || 0;
		options.duration = parseInt(options.duration) || 500;

		steps = Math.ceil(options.duration / refreshInterval);
		increment = ((options.countTo - options.value) / steps);
		num = options.value;
	}

	var tick = function () {
		timeoutId = setTimeout(function () {
			num += increment;
			step++;
			if (step >= steps) {
				clearTimeout(timeoutId);
				num = options.countTo;
				if(typeof endCallback == 'function')
					endCallback(options.countTo);
			} else {
				if(typeof callback == 'function') {
					callback(num, options.countTo);
				}
				tick();
			}
		}, refreshInterval);

	}

	return function (newVal, oldVal) {
		options.countTo = newVal || options.countTo;
		options.value = oldVal || 0;
		if (timeoutId) {
			clearTimeout(timeoutId);
		}
		calculate();
		tick();
	}
}
