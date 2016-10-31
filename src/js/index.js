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

		$scope.searchStories = '';
		$http.get('https://infoamazonia.org/es/?s=colombia&geojson=1').then(function(res) {
			$scope.stories = res.data.features;
			console.log(res, res.headers(['X-Total-Count']));
		});

		$scope.focusedStory = false;
		$scope.$on('storyFocus', function(ev, storyId) {
			$scope.focusedStory = storyId;
		});

	}
]);

require('./directives')(app);
require('./filters')(app);
require('./loading')(app);

angular.element(document).ready(function() {
	angular.bootstrap(document, ['ia-colombia']);
});
