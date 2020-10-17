var mode = "idle";
var worker = new Worker("static/js/robot.js");

// Handle messages from worker
function onmessage(e) {
    if (e.data.robot !== undefined) {
        update(e.data.robot);
    }
    if (e.data.mode !== undefined) {
        mode = e.data.mode;
    }
}
worker.onmessage = onmessage;

// In teleop mode, send keypresses to the worker
function down(e){
    if (mode === "teleop") {
        worker.postMessage({keypress: true, keyCode: e.keyCode, up: false});
    }
}
function up(e){
    if (mode === "teleop") {
        worker.postMessage({keypress: true, keyCode: e.keyCode, up: true});
    }
}
document.addEventListener('keydown', down);
document.addEventListener('keyup', up);

// "Upload Code" button sends code to the worker
function uploadCode() {
    code = cm.getValue();
    worker.postMessage({code:code});
};

function update(state) {
    /*
    Update the state (position and direction) of the robot.
    Example of state: {x:72, y:72, dir:0}
    */
    // console.log("StateX")
    // console.log(state.x)
    var scaleFactor = 2;
    document.getElementById("demo").innerHTML = state.X.toFixed(2) + ", " + state.Y.toFixed(2)
    var robotRect = document.querySelector("rect")
    // console.log("SVG")
    // console.log(robotRect)
    robotRect.setAttributeNS(null, "x", state.X)
    robotRect.setAttributeNS(null, "y", state.Y)
    var rotateStr = "rotate(" + state.dir + " " + (state.X + 15*scaleFactor) + " " + (state.Y + 20*scaleFactor) + ")"
    // console.log(rotateStr)
    robotRect.setAttribute("transform", rotateStr)
    // console.log("Adjusted")
};

function start(auto=0) {
    /*
    Start the robot thread
    Return if started robot thread
    */
   setUpCanvas();

    if (mode !== "idle") {
        return;
    }
    else {
        if (auto === 0) {
            worker.postMessage({start:true, mode:"teleop"})
        }
        else if (auto === 1) {
            worker.postMessage({start:true, mode:"auto"})
        }
        console.log("robot started");
    }
};

function setUpCanvas() {
  canvas = document.getElementById('fieldCanvas')
  ctx = canvas.getContext('2d')

  // outlined square X: 50, Y: 35, width/height 50
  ctx.beginPath()
  ctx.strokeRect(50, 35, 50, 50)

  // filled square X: 125, Y: 35, width/height 50
  ctx.beginPath()
  ctx.fillRect(125, 35, 50, 50)
}

function stop() {
    /*
    Stop the robot thread
    */
    worker.terminate();
    worker = new Worker("/static/js/robot.js");
    worker.onmessage = onmessage;
    worker.postMessage({code:code});
    mode = "idle";
    update({X:144,Y:144,dir:0});
};
