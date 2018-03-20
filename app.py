import datetime
from flask import Flask, render_template
app = Flask(__name__)

@app.route('/')
def hello_world(name=None):
    return render_template('index.html', name=name)

@app.route('/time')
def get_time():
    return str(datetime.datetime.now())

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)
