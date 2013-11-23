from flask import Flask, jsonify, request
from flask.ext.sqlalchemy import SQLAlchemy
from datetime import date
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
		return {'id': self.id, 'name': self.name, 'start': self.start, 'end':self.end}
	
@app.route('/api/tasks/', methods=['GET'])
def getAllTasks():
	allTasks = Task.query.all()
	jObjects = []
	for task in allTasks:
		jObjects.append(task.toJObject())
	return jsonify({'TASKS':jObjects})

@app.route('/api/tasks/<int:taskID>', methods=['GET'])
def getTask(taskID):
	return jsonify({'name':'task'+str(taskID)})

@app.route('/api/tasks/', methods=['POST'])
def newTask():
	newTask = Task('new task', date.today(), date.today())
	db.session.add(newTask)
	db.session.commit()
	jsonData = request.get_json(force=True)
	return jsonify(jsonData)

@app.route('/api/tasks/<int:taskID>', methods=['PUT'])
def updateTask(taskID):
	jsonData = request.get_json(force=True)
	return jsonify(jsonData)

@app.route('/api/tasks/<int:taskID>', methods=['DELETE'])
def deleteTask(taskID):
	return ''

if __name__ == '__main__':
	app.run(debug=True)