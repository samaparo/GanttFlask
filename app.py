from flask import Flask, jsonify, request, abort
from flask.ext.sqlalchemy import SQLAlchemy
from datetime import date, datetime
import os
basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'app.db')
db = SQLAlchemy(app)

class Task(db.Model):
	id = db.Column(db.Integer, primary_key = True)
	name = db.Column(db.String(256))
	start = db.Column(db.Date)
	end = db.Column(db.Date)
	
	def __init__(self, name, start, end):
		self.name = name
		self.start = start
		self.end = end
	
	def toJObject(self):
		return {'id': self.id, 'name': self.name, 'start': self.start.strftime('%m/%d/%Y'), 'end':self.end.strftime('%m/%d/%Y')}
	
	@staticmethod
	def isValidJSON(jObject):
		return jObject and 'name' in request.json and 'start' in request.json and 'end' in request.json
	
@app.route('/api/tasks/', methods=['GET'])
def getAllTasks():
	allTasks = Task.query.all()
	jObjects = []
	for task in allTasks:
		jObjects.append(task.toJObject())
	return jsonify({'TASKS':jObjects})

@app.route('/api/tasks/<int:taskID>', methods=['GET'])
def getTask(taskID):
	matchingTask = Task.query.filter_by(id=taskID).first()
	if matchingTask == None:
		abort(404)
	return jsonify(matchingTask.toJObject())

@app.route('/api/tasks/', methods=['POST'])
def newTask():
	jsonData = request.get_json(force=True)
	if(not Task.isValidJSON(jsonData)):
		abort(400)
	
	newTask = Task(request.json['name'], datetime.strptime(request.json['start'],'%m/%d/%Y'), datetime.strptime(request.json['end'],'%m/%d/%Y'))
	db.session.add(newTask)
	db.session.commit()
	return jsonify(newTask.toJObject())

@app.route('/api/tasks/<int:taskID>', methods=['PUT'])
def updateTask(taskID):
	matchingTask = Task.query.filter_by(id=taskID).first()
	jsonData = request.get_json(force=True)
	if matchingTask == None:
		abort(404)
	elif not Task.isValidJSON(jsonData):
		abort(400)
	
	matchingTask.name = request.json['name']
	matchingTask.start = datetime.strptime(request.json['start'],'%m/%d/%Y')
	matchingTask.end = datetime.strptime(request.json['end'],'%m/%d/%Y')
	db.session.commit()
	
	return jsonify(matchingTask.toJObject())

@app.route('/api/tasks/<int:taskID>', methods=['DELETE'])
def deleteTask(taskID):
	matchingTask = Task.query.filter_by(id=taskID).first()
	jsonData = request.get_json(force=True)
	if matchingTask == None:
		abort(404)
		
	db.session.delete(matchingTask)
	db.session.commit()
	return jsonify({'result':True})

if __name__ == '__main__':
	app.run(debug=True)