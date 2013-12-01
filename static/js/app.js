/*global $ */
var app = app || {};
app.Utils = app.Utils || {};

$(function () {
	'use strict';
	
	//Globals
	app.gridStart = null;
	app.gridEnd = null;
	
	var mainView = new app.Views.GanttView();
	app.AllEvents.fetch({success: function (data) {
		mainView.render();
	}});
});