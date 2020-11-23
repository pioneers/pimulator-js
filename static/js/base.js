var mode = "idle"; // or auto or teleop
var worker = new Worker("static/js/robot.js");
var timer;

// Handle messages from worker
function onmessage(e) {
    if (e.data.robot !== undefined) {
        update(e.data.robot);
    }
    if (e.data.mode !== undefined) {
        mode = e.data.mode;
        if (mode === "auto") {
            runAutoTimer();
        }
    }

    if (e.data.log !== undefined) {
        let text = e.data.log;
        log(text);
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
    var scaleFactor = 2;
    document.getElementById("demo").innerHTML = state.X.toFixed(2) + ", " + state.Y.toFixed(2)
    var robotRect = document.querySelector("rect")
    robotRect.setAttributeNS(null, "x", state.X)
    robotRect.setAttributeNS(null, "y", state.Y)
    var rotateStr = "rotate(" + state.dir + " " + (state.X + 15*scaleFactor) + " " + (state.Y + 20*scaleFactor) + ")"
    robotRect.setAttribute("transform", rotateStr)
};

function start(auto=0) {
    /*
    Start the robot thread
    Return if started robot thread
    */
    if (mode !== "idle") {
        return;
    }
    else {
        if (auto === 0) {
            worker.postMessage({start:true, mode:"teleop"})
        }
        else if (auto === 1) {
            clearInterval(timer);

            worker.postMessage({start:true, mode:"auto"})
        }
    }
};

function runAutoTimer() {
    var startTime = new Date().getTime();
    document.getElementById("timer").innerHTML = "Time Left: 30s";

    timer = setInterval(function() {
        let currTime = new Date().getTime();
        let timeElapsed = Math.floor((currTime - startTime) / 1000);
        let timeLeft = 30 - timeElapsed;

        document.getElementById("timer").innerHTML = "Time Left: " + timeLeft + "s";

        if (timeLeft < 0) {
            clearInterval(timer);
            document.getElementById("timer").innerHTML = "Autonomous Mode has finished.";
        }
    }, 1000);
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
    clearInterval(timer);
};

function clearConsole(){
  document.getElementById("consoleLog").innerText = ""
}
clearConsole()

function log(text) {
  if(!text.includes('pyodide.py')){
    if(!text.includes('<eval>')){
  logged = document.getElementById("consoleLog").innerText += text + "\n";
    }
  }
}
