from flask import Flask, render_template
app = Flask(__name__)

@app.route('/')
def hello_world(name=None):
    return render_template('index.html', cache_key='deadbeef', prod=False)

@app.after_request
def add_header(resp):
    # Set headers to enable SharedArrayBuffer
    resp.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
    resp.headers['Cross-Origin-Embedder-Policy'] = 'require-corp'
    return resp

if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True)
