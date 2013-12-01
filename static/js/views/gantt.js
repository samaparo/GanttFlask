/*global $ */
/*global jQuery*/
/*global Backbone*/
var app = app || {};
app.Views = app.Views || {};
app.Collections = app.Collections || {};

(function ($) {
	'use strict';
	app.Views.GanttView = Backbone.View.extend({
		el: $('body'),
		eventWrap: $('#eventWrap'),
		numberWrap: $('#numberWrap'),
		numberTemplate: $('#template_number').html(),
		events: {
			"click #newEvent" : "createEvent",
			"click #deleteEvent" : "deleteEvent",
			"click" : "clearSelection"
		},
		initialize: function () {
			//bind scroll event, since it doesn't bubble
			$("#mainWrap #gantt").scroll(this.scrollGrid);
		},
		render: function () {
			var startDate = new Date(8640000000000000);
			var endDate = new Date(-8640000000000000);
			app.AllEvents.forEach(function (event) {
				var start = event.startAsDate();
				var end = event.endAsDate();
				if (start < startDate) {
					startDate = start;
				}
				if (end > endDate) {
					endDate = end;
				}
			});
			
			startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
			app.gridStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
			app.gridEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
			
			var monthView = new app.Views.MonthView();
			while (startDate.getTime() <= endDate.getTime()) {
				monthView.render(startDate);
				startDate.setMonth(startDate.getMonth() + 1);
			}
			
			var eventElements = [];
			var numberHTML = '';
			app.AllEvents.forEach(function (event) {
				var eventView = new app.Views.EventView({model: event});
				eventElements.push(eventView.render().$el);
				numberHTML += _.template(this.numberTemplate, {number: (event.get("number") + 1)});
			}, this);
			
			this.eventWrap.append(eventElements);
			this.numberWrap.append(numberHTML);
		},
		scrollGrid: function (e) {
			var $grid = $('#gantt');
			var $numberList = $('#numberWrap');
			var newLeft = $grid.scrollLeft();
			$numberList.css("left", newLeft);
		},
		clearSelection: function () {
			$('#gantt #eventWrap .highlighted').removeClass('highlighted');
			app.AllEvents.unselect();
		},
		deleteEvent: function (e) {
			var selectedEvent = app.AllEvents.selectedEvent;
			var selectedEventNum = selectedEvent.get('number');
			app.AllEvents.forEach(function (event) {
				var eventNum = event.get('number');
				if (eventNum > selectedEventNum) {
					//Eventually call save to use URL
					event.set({number: eventNum - 1});
				}
			});
			
			//Eventually call destroy to use URL
			app.AllEvents.selectedEvent.destroy();
			//selectedEvent.trigger('destroy', app.AllEvents.selectedEvent, app.AllEvents);
			app.AllEvents.unselect();
			
			this.numberWrap.find('div:last').remove();
			
			e.stopPropagation();
		},
		createEvent: function () {
			var taskName = 'New Event';
			var taskStartDate = new Date();
			var taskNumber = 0;
			if (app.AllEvents.length > 0) {
				
				var latestDate = new Date(-8640000000000000);
				app.AllEvents.forEach(function (event) {
					latestDate = event.endAsDate() > latestDate ? event.endAsDate()  : latestDate;
					taskNumber = event.get('number') > taskNumber ? event.get('number') : taskNumber;
				});
				taskStartDate = latestDate;
				taskNumber = taskNumber + 1;
			}
			
			var taskEndDate = new Date(taskStartDate.getFullYear(), taskStartDate.getMonth(), taskStartDate.getDate() + 4);
			
			var newEvent = new app.Models.Event();
			newEvent.save({name: taskName, startDate: app.Utils.getDateStringMMDDYYYY(taskStartDate), endDate: app.Utils.getDateStringMMDDYYYY(taskEndDate), number: taskNumber});
			app.AllEvents.add(newEvent);
			
			this.extendGridFor(newEvent);
			this.setGridHeight();
			
			
			var eventView = new app.Views.EventView({model: newEvent});
			this.eventWrap.append(eventView.render().el);
			this.numberWrap.append(_.template(this.numberTemplate, {number: (newEvent.get("number") + 1)}));
		},
		setGridHeight: function () {
			var newGridHeight = (app.AllEvents.length) * 26;
			this.$el.find('#gridWrap').css('height', newGridHeight);
		},
		extendGridFor: function (newEvent) {
			var monthView = new app.Views.MonthView();
			if (newEvent.startAsDate() < app.gridStart) {
				app.gridStart = new Date(app.gridStart.getFullYear(), app.gridStart.getMonth() - 1, 1);
				monthView.render(app.gridStart);
			}
			if (newEvent.endAsDate() > app.gridEnd) {
				app.gridEnd = new Date(app.gridEnd.getFullYear(), app.gridEnd.getMonth() + 2, 0);
				monthView.render(new Date(app.gridEnd.getFullYear(), app.gridEnd.getMonth(), 1));
			}
		}
	});
	
}(jQuery));