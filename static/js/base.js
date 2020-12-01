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
    Input position is in inches. scaleFactor convers inches -> pixels.
    Example of state: {x:72, y:72, dir:0}
    */
    const scaleFactor = 3;
    const centerX = state.X * scaleFactor;
    const centerY = state.Y * scaleFactor;
    const dir = state.dir;
    document.getElementById("demo").innerHTML = state.X.toFixed(2) + ", " + state.Y.toFixed(2)
    const sensorPoints = document.querySelectorAll("circle")
    const scaledX = centerX - 30
    const scaledY = centerY - 40
    sensorPoints[0].setAttributeNS(null, "cx", centerX)
    sensorPoints[0].setAttributeNS(null, "cy", centerY)
    sensorPoints[1].setAttributeNS(null, "cy", centerY+(15*Math.cos(dir/180*Math.PI)))
    sensorPoints[1].setAttributeNS(null, "cx", centerX+(-15*Math.sin(dir/180*Math.PI)))
    sensorPoints[2].setAttributeNS(null, "cy", centerY-(15*Math.cos(dir/180*Math.PI)))
    sensorPoints[2].setAttributeNS(null, "cx", centerX-(-15*Math.sin(dir/180*Math.PI)))
    const robotRect = document.querySelector("rect")
    robotRect.setAttributeNS(null, "x", scaledX)
    robotRect.setAttributeNS(null, "y", scaledY)
    const rotateStr = `rotate(${dir} ${centerX} ${centerY})`
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
    update({X:70,Y:70,dir:0}); // in inches
    clearInterval(timer);
};
