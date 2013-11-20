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
	test = request.json['name']
	return jsonify(test)

if __name__ == '__main__':
	app.run(debug=True)