/*global app*/
/*global Backbone*/

var app = app || {};
app.Models = app.Models || {};

(function () {
	'use strict';
	app.Models.Event = Backbone.Model.extend({
		urlRoot: '/api/tasks/',
		select: function () {
			this.collection.select(this);
		},
		initialize: function () {
			
		},
		startAsDate: function () {
			return new Date(this.get("startDate"));
		},
		endAsDate: function () {
			return new Date(this.get("endDate"));
		},
		endAsDatePlusOne: function () {
			var end = new Date(this.get("endDate"));
			end.setDate(end.getDate() + 1);
			return end;
		},
		defaults: {
			id: -1,
			name: "New Event",
			startDate: null,
			endDate: null,
			number: 0
		}
	});
	
}());