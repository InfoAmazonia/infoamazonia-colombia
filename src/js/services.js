'use strict';

module.exports = function(app) {

	app.factory('Globals', [
		function() {
			var globals = {};
			return {
				set: function(name, v) {
					globals[name] = v;
				},
				get: function(name) {
					return globals[v];
				}
			}
		}
	])

};
