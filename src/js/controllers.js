'use strict';

var highchartsDefaults = require('./highcharts-defaults');

var getGDriveJsonp = function(id, idx) {
	idx = idx || 1;
	return 'https://spreadsheets.google.com/feeds/list/' + id + '/' + idx + '/public/values?alt=json-in-script&callback=JSON_CALLBACK';
}

var parseSheet = function(entries, column) {
	var parsed = [];
	if(typeof column !== 'undefined' && column)
		parsed = {};
	entries.forEach(function(entry) {
		var newEntry = {};
		for(var k in entry) {
			if(k.indexOf('gsx$') == 0) {
				var key = k.replace('gsx$', '');
				newEntry[key] = entry[k]['$t'];
			}
		}
		if(typeof column !== 'undefined' && column)
			parsed[newEntry[column]] = newEntry;
		else
			parsed.push(newEntry);
	});
	return parsed;
};

module.exports = function(app) {

	app.controller('SiteCtrl', [
		'$rootScope',
		'$scope',
		'$http',
		function($rootScope, $scope, $http) {
			/* sandwich nav toggling */
			$scope.showNav = false;
			$scope.toggleNav = function() {
				if(!$scope.showNav)
					$scope.showNav = true;
				else
					$scope.showNav = false;
			};
			/* -- */
			/* sidebar toggling */
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
			/* -- */
			/* stories */
			$scope.searchStories = '';
			$http
				.get('https://infoamazonia.org/es/?s=colombia&geojson=1')
				.then(function(res) {
					$scope.stories = res.data.features;
					// console.log(res, res.headers(['X-Total-Count']));
				});
			/* focusing story */
			$scope.focusedStory = false;
			$scope.$on('storyFocus', function(ev, storyId) {
				$scope.focusedStory = storyId;
			});
			/* stories methods */
			$scope.isDifferentDate = function(stories, i, date) {
				if(stories[i]) {
					return !moment(stories[i].properties.date).isSame(moment(date), 'day');
				} else {
					return true;
				}
			};
			/* -- */

		}
	])

	.controller('DashboardCtrl', [
		'$scope',
		'$http',
		'$rootScope',
		'$timeout',
		function($scope, $http, $rootScope, $timeout) {
			/* dashboard tables config */
			var tableId = '1SJwsxzWkuBa6BwcgOWVDDODMAaeMgbrM1IQUoRB5WG4';
			$scope.dataSheet = {};
			$http.jsonp(getGDriveJsonp(tableId, 1)).then(function(res) {
				$scope.dataSheet = parseSheet(res.data.feed.entry, 'departamento');
			});
			$http.jsonp(getGDriveJsonp(tableId, 2)).then(function(res) {
				$scope.dataIndex = parseSheet(res.data.feed.entry, 'column');
			});
			/* -- */
			/* dashboard tables methods */
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
			/* -- */
			/* main chart setup */
			$scope.mainChart = {};
			$scope.$watch('dataSheet', function() {
				if($scope.dataSheet) {
					$scope.mainChart.ref = _.last($scope.dataUniqKeys('reference'));
					// redo action (for some reason sometimes it returns unedefined)
					$timeout(function() {
						$scope.mainChart.ref = _.last($scope.dataUniqKeys('reference'));
					}, 50);
				}
			});
			$scope.selectMainChartRef = function(ref) {
				$scope.mainChart.ref = ref;
			};
			$scope.$watch('mainChart', function() {
				var ref = false;
				if($scope.mainChart)
					ref = $scope.mainChart.ref;
				var series = [];
				if(ref) {
					var cols = $scope.matchColumns('reference', ref);
					cols.forEach(function(col) {
						series.push(col.series);
					});
					$scope.mainSeries = _.uniq(series);
					$scope.mainChartConfig = {};
					$scope.mainSeries.forEach(function() {
						if(!$scope.mainChartConfig[series])
							$scope.mainChartConfig[series] = angular.extend({}, highchartsDefaults);
						var sData = {
							data: []
						};
						for(var k1 in $scope.dataSheet) {
							var iData = [];
							iData[0] = k1;
							for(var k2 in $scope.dataSheet[k1]) {
								var match = $scope.dataColumn('column', k2);
								if(match.reference == $scope.mainChart.ref) {
									var val = parseFloat($scope.dataSheet[k1][k2]);
									if(!isNaN(val))
										iData[1] = val;
									else
										iData[1] = null
								}
							}
							sData.data.push(iData);
						}
						$scope.mainChartConfig[series].series = [sData];
					});
				}
			}, true);
			/* -- */
			/* grid item chart setup */
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
				window.dispatchEvent(new Event('resize'));
				setTimeout(function() {
					window.dispatchEvent(new Event('resize'));
				}, 100);
			});
			/* -- */
		}
	])
	.controller('MapCtrl', [
		'$rootScope',
		'$scope',
		'$timeout',
		'$http',
		'LoadingService',
		function($rootScope, $scope, $timeout, $http, Loading) {
			/* timeline config */
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
			/* -- */
			/* data config */
			$scope.user = 'infoamazonia';
			$scope.dataTable = 'ideam_deforestacion_anual';
			$scope.geomTable = 'provincias_area_estudio_amz_wgs84';
			$scope.queryWhere = 'data.departamento = geom.nom_depto';
			/* -- */
			/* data setup */
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
			/* -- */
		}
	])
	.controller('AboutDataCtrl', [
		'$scope',
		function($scope) {
			$scope.displayContent = false;
			$scope.toggleContent = function() {
				if($scope.displayContent) {
					$scope.displayContent = false;
				} else {
					$scope.displayContent = true;
				}
			}
		}
	]);
};
