/*global $ */
/*global jQuery*/
/*global Backbone*/
var app = app || {};
app.Views = app.Views || {};
app.Collections = app.Collections || {};

(function ($) {
	'use strict';
	app.Views.EventView = Backbone.View.extend({
		tagName: 'div',
		className: 'event',
		template: $('#template_event').html(),
		dayInMS: 86400000,
		events: {
			"click" : "highlight"
		},
		initialize: function () {
			var me = this;
			this.listenTo(this.model, 'destroy', this.remove);
			this.listenTo(this.model, 'change', this.render);
			
			this.$el.draggable({
				axis: 'x',
				grid: [26, 0],
				cancel: '.ui-resizable-handle',
				stop: function (event, ui) {
					var dayPosition = Math.floor((ui.position.left + 1) / 26);
					var newStart = new Date(app.gridStart.getFullYear(), app.gridStart.getMonth(), dayPosition + 1);
					var dayDelta = Math.ceil((newStart.getTime() - me.model.startAsDate().getTime()) / me.dayInMS);
					var newEnd = new Date(me.model.endAsDate().getFullYear(), me.model.endAsDate().getMonth(), me.model.endAsDate().getDate() + dayDelta);
					me.model.save({startDate: app.Utils.getDateStringMMDDYYYY(newStart), endDate: app.Utils.getDateStringMMDDYYYY(newEnd)});
				}
			}).disableSelection();
			
		},
		render: function () {
			console.log('render');
			var currentEvent = this.model;
			
			var renderEvent = {
				name: currentEvent.get('name'),
				dateString: currentEvent.get('startDate') === currentEvent.get('endDate') ? currentEvent.get('startDate') : currentEvent.get('startDate') + " to " + currentEvent.get('endDate'),
				top: (currentEvent.get('number') * 26) + 3,
				left: (Math.floor((currentEvent.startAsDate().getTime() - app.gridStart.getTime()) / this.dayInMS) * 26) - 1,
				width: Math.ceil((currentEvent.endAsDatePlusOne().getTime() - currentEvent.startAsDate().getTime()) / this.dayInMS) * 26
			};
			
			var eventHTML = _.template(this.template, renderEvent);
			this.$el.html(eventHTML);
			this.$el.css("top", renderEvent.top).css("left", renderEvent.left).css("width", renderEvent.width);
			
			return this;
		},
		highlight: function (e) {
			$('#gantt #eventWrap .highlighted').removeClass('highlighted');
			this.$el.addClass('highlighted');
			this.model.select();
			e.stopPropagation();
		}
	});
	
}(jQuery));