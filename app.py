import datetime, time
from flask import Flask, render_template
app = Flask(__name__)

@app.route('/')
def hello_world(name=None):
    return render_template('index.html', name=name)

@app.route('/time')
def get_time():
    return str(datetime.datetime.now())

@app.route('/wait')
def wait_a_bit():
    """Wait 5 seconds before returning the time.

    We can use this function to determine that flask runs in a single
    thread. Flask cannot service other requests while /wait 
    completes.

    Concurrent calls of `curl localhost:5000/wait` and then `curl 
    localhost:5000/time` will both return at the same time after 5
    seconds.
    """
    time.sleep(5)
    return str(datetime.datetime.now())

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)
