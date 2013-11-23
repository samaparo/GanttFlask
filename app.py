from flask import Flask, jsonify, request
app = Flask(__name__)

@app.route('/api/tasks/', methods=['GET'])
def getAllTasks():
	return jsonify({'tasks':['A', 'B']})

@app.route('/api/tasks/<int:taskID>', methods=['GET'])
def getTask(taskID):
	return jsonify({'name':'task'+str(taskID)})

@app.route('/api/tasks/', methods=['POST'])
def newTask():
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