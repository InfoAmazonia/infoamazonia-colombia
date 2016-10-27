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

					var BING_KEY = 'AqcPFocZWfHGkBoBjZ0e3NlBbKqN9t_lRuRyjVg7xHlc7JXWrGvupqLFYWRVqfv4';

					map.addLayer(L.tileLayer.bing({
						bingMapsKey: BING_KEY,
						opacity: .5,
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
								grid.on('mouseout', _.debounce(function(e) {
									scope.$apply(function() {
										scope.gridItem = false;
									});
								}, 100));
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
		'#layer { polygon-fill: transparent; polygon-opacity: 1; line-width: 1; line-opacity: 0.5; line-color: #000; }',
		'#layer[ ' + column + ' <= 0 ] { polygon-fill: transparent; }'
	];

	quantiles.forEach(function(qt, i) {
		cartocss.push('#layer[ ' + column + ' >= ' + qt + ' ] { polygon-fill: rgba(0, 0, 0, ' + ((i+1)/8) + ');	}');
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
