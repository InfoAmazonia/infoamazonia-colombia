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
