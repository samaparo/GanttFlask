/*global app*/
/*global Backbone*/

var app = app || {};
app.Collections = app.Collections || {};
app.Models = app.Models || {};

(function () {
	'use strict';
	app.Collections.EventCollection = Backbone.Collection.extend({
		model: app.Models.Event,
		selectedEvent: null,
		nextCID: -1,
		url: '/api/tasks/',
		initialize: function () {
			
		},
		unselect: function () {
			this.selectedEvent = null;
		},
		select: function (event) {
			this.selectedEvent = event;
		},
		nextID: function () {
			var returnID = this.nextCID;
			this.nextCID -= 1;
			return returnID;
		}
		
	});
	
//	var testData = [
//		{
//			id: 1,
//			name: 'Event A',
//			startDate: '09/03/2013',
//			endDate: '09/10/2013',
//			number: 0
//		},
//		{
//			id: 2,
//			name: 'Event B',
//			startDate: '09/10/2013',
//			endDate: '09/15/2013',
//			number: 1
//		},
//		{
//			id: 3,
//			name: 'Event C',
//			startDate: '09/15/2013',
//			endDate: '09/18/2013',
//			number: 2
//		},
//		{
//			id: 4,
//			name: 'Event D',
//			startDate: '09/30/2013',
//			endDate: '10/1/2013',
//			number: 3
//		}
//	];
	app.AllEvents = new app.Collections.EventCollection();
}());