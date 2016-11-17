'use strict';

module.exports = function(map, $http) {

	var control = L.control.layers({}, {}, {position: 'topleft'}).addTo(map);

	var customLayers = [
		{
			name: 'Ríos',
			zIndex: 3,
			target: map,
			sublayers: [
				{
					cartocss: 'css/osm_colamz_water_polygon.cartocss',
					user: 'infoamazonia',
					sql: "SELECT * FROM osm_colamz_water_polygon",
					interactivity: 'nacionales_nombre'
				},
				{
					cartocss: 'css/protected_areas.cartocss',
					user: 'infoamazonia',
					sql: "select * from anp_nacional where nacionales_pais= 'Colombia'",
					interactivity: 'nacionales_nombre'
				}
			]
		},
		{
			name: 'Areas Protegidas',
			zIndex: 7,
			sublayers: [
				{
					cartocss: 'css/protected_areas.cartocss',
					user: 'infoamazonia',
					sql: "select * from anp_nacional where nacionales_pais= 'Colombia'",
					interactivity: 'nacionales_nombre'
				}
			]
		},
		{
			name: 'Territorios Indigenas',
			zIndex: 7,
			sublayers: [
				{
					cartocss: 'css/territ_indig.cartocss',
					user: 'infoamazonia',
					sql: "select * from territ_rios_ind_genas where tis_pais='Colombia'",
					interactivity: 'tis_nombre'
				},
				{
					cartocss: 'css/aislados_referencia_.cartocss',
					user: 'infoamazonia',
					sql: "SELECT * FROM aislados_referencia_ WHERE pais='Colombia'",
					interactivity: 'nombre'
				}
			]
		},
		{
			name: 'Carreteras',
			zIndex: 7,
			sublayers: [
				{
					cartocss: 'css/roads.cartocss',
					user: 'infoamazonia',
					sql: "select * from carreteras where pais='Colombia'",
					interactivity: null
				}
			]
		}
	];

	customLayers.forEach(function(config) {
		var layerGroup = L.layerGroup({
			zIndex: config.zIndex
		});
		control.addOverlay(layerGroup, config.name);
		config.sublayers.forEach(function(sublayerConfig) {
			$http.get(sublayerConfig.cartocss).then(function(res) {
				var cartocss = res.data;
				var layerData = {
					user_name: sublayerConfig.user,
					sublayers: [{
						sql: sublayerConfig.sql,
						cartocss: cartocss,
						interactivity: sublayerConfig.interactivity
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
	});

};
