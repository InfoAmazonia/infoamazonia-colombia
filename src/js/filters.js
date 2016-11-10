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

	app.filter('memoize', [
		function() {
			return _.memoize(function(input) {
				return input;
			}, function() {
				return JSON.stringify(arguments);
			})
		}
	]);

	app.filter('validate', [
		function() {
			return function(input, validation) {
				var validFn;
				var bool = true;
				switch(validation) {
					case 'number':
						validFn = isNaN;
						bool = false;
				}
				if(input && input.length) {
					input = input.filter(function(item) {
						if(bool)
							return validFn(item);
						else
							return !validFn(item);
					});
				}
				return input;
			}
		}
	]);

};
