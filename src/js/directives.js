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
						opacity: .5
					}));

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
								layer = L.tileLayer(tilesUrl.tiles[0]);
								map.addLayer(layer);
								scope.sql.getBounds(scope.query).done(function(bounds) {
									map.fitBounds(bounds);
								});
								grid = new L.UtfGrid(tilesUrl.grids[0][0] + '&callback={cb}');
								map.addLayer(grid);
								grid.on('mouseover', function(e) {
									scope.$apply(function() {
										scope.gridItem = e.data;
									})
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
		'#layer { polygon-fill: transparent; polygon-opacity: 1; line-width: 1; line-opacity: 0.5; line-color: #f26969; }',
		'#layer[ ' + column + ' <= 0 ] { polygon-fill: transparent; }'
	];

	quantiles.forEach(function(qt, i) {
		cartocss.push('#layer[ ' + column + ' >= ' + qt + ' ] { polygon-fill: rgba(242, 105, 105, ' + ((i+1)/5) + ');	}');
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
