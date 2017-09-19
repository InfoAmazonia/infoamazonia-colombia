window.mobileWidth = 720;

window.isMobileWidth = function() {
	return window.innerWidth <= window.mobileWidth;
};

require('./leaflet.legendcontrol');

var app = angular.module('ia-colombia', [
	'ngAnimate',
	'highcharts-ng'
]);

require('./services')(app);
require('./directives')(app);
require('./filters')(app);
require('./controllers')(app);
require('./loading')(app);

angular.element(document).ready(function() {
	angular.bootstrap(document, ['ia-colombia']);
});
