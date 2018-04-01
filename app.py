import datetime
import time
import robot

from flask import Flask, render_template, jsonify
app = Flask(__name__)

@app.route('/start')
def start():
    return str(robot.start())

@app.route('/stop')
def stop():
    return str(robot.stop())

@app.route('/state')
def state():
    if robot.robot_thread is None:
        return jsonify(x=72, y=72, theta=0)
    else:
        result = robot.get_state()
        return jsonify(x=result['x'], y=result['y'], theta=result['dir'])

@app.route('/')
def hello_world(name=None):
    return render_template('index.html', name=name)

@app.route('/time')
def get_time():
    return str(datetime.datetime.now())


@app.route('/okay')
def ewkay():
    return "okay"

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)
