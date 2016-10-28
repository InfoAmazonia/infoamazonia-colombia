'use strict';

module.exports = function(app) {

	app.filter('formatDate', [
		function() {
			return function(input, format) {
				if(input) {
					input = moment(input).format(format || 'LLLL');
				}
				return input;
			}
		}
	]);

};
