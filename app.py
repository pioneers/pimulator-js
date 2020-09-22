import datetime
import time
import robot
from base64 import b64decode
from flask import Flask, render_template, jsonify
import pimulator
app = Flask(__name__)

@app.route('/')
def hello_world(name=None):
    return render_template('index.html', name=name)

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)
