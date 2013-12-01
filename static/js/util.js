/*global $ */
var app = app || {};
app.Utils = app.Utils || {};

$(function () {
	'use strict';
	
	app.Utils.getDateStringMMDDYYYY = function (dateObject) {
		var mm = dateObject.getMonth() + 1;
		var dd = dateObject.getDate();
		var yyyy = dateObject.getFullYear();
		
		return mm + "/" + dd + "/" + yyyy;
	};
	app.Utils.getMonthString = function (dateObject) {
		var monthInt = dateObject.getMonth();
		var monthString = "";
		switch (monthInt) {
			case 0:
				monthString = "January";
				break;
			case 1:
				monthString = "Feburary";
				break;
			case 2:
				monthString = "March";
				break;
			case 3:
				monthString = "April";
				break;
			case 4:
				monthString = "May";
				break;
			case 5:
				monthString = "June";
				break;
			case 6:
				monthString = "July";
				break;
			case 7:
				monthString = "August";
				break;
			case 8:
				monthString = "September";
				break;
			case 9:
				monthString = "October";
				break;
			case 10:
				monthString = "November";
				break;
			case 11:
				monthString = "December";
				break;
			
		}
		return monthString;
	};
}());