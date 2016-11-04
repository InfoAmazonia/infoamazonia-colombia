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
						// scope.$apply(function() {
						//	 $rootScope.$broadcast('mapGridItem', e.data);
						// });
					});
					grid.on('mouseout', function(e) {
						// scope.$apply(function() {
						//	 $rootScope.$broadcast('mapGridItem', false);
						// });
					});
				}
			});
		});
	});

};
