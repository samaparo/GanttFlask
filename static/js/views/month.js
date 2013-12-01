/*global $ */
/*global jQuery*/
/*global Backbone*/
/*global _*/
var app = app || {};
app.Views = app.Views || {};
app.Collections = app.Collections || {};

(function ($) {
	'use strict';
	app.Views.MonthView = Backbone.View.extend({
		daysOfWeek: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
		monthContainer: $('#monthWrap'),
		gridContainer: $('#gridWrap'),
		monthTemplate: $('#template_month').html(),
		gridTemplate: $('#template_gridRow').html(),
		render: function (monthStart) {
			var days = [];
			var monthDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate());
			var nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
			var monthString = app.Utils.getMonthString(monthDate);
			var gridHTML = "";
			var monthHTML = "";
			var totalDays = 0;
			while(monthDate.getTime() < nextMonth.getTime()) {
				days.push({
					number: monthDate.getDate(),
					dow: this.daysOfWeek[monthDate.getDay()]
				});
				
				var gridClass = monthDate.getDay() === 0 || monthDate.getDay() === 1 ? "dayOff" : "";
				gridClass += monthDate.getDate() === 1 ? " firstDayOfMonth" : "";
				gridHTML += _.template(this.gridTemplate, {gridClasses: gridClass});
				
				monthDate.setDate(monthDate.getDate() + 1);
				totalDays += 1;
			}
			
			
			
			var monthWidth = (26 * totalDays) - 1;
			monthHTML = _.template(this.monthTemplate, {totalWidth: monthWidth, monthDays: days, monthName:monthString, monthYear:monthStart.getFullYear()});
			
			this.monthContainer.append(monthHTML);
			this.gridContainer.append(gridHTML);
		}
	});
}(jQuery));