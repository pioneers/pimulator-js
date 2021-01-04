var mode = "idle"; // or auto or teleop
var worker = new Worker("static/js/robot.js");
var timer;
var inputMode = "keyboard";

// Handle messages from worker
function onmessage(e) {
    if (e.data.robot !== undefined) {
        update(e.data.robot);
    }
    if (e.data.sensors !== undefined) {
        updateSensors(e.data.sensors);
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

// Switch input mode between 'keyboard' and 'gamepad'
function switchInput(state) {
    if (state === 1) {
        if (inputMode === "gamepad") {
            $("#gamepad-btn").button('toggle');
        } else {
            inputMode = "gamepad";
            //document.getElementById("input-mode").innerText = "Input: Gamepad";
            $("#keyboard-btn").button('toggle');
        }
    } else if (state === 0) {
        if (inputMode === "keyboard") {
            $("#keyboard-btn").button('toggle');
        } else {
            inputMode = "keyboard";
            //document.getElementById("input-mode").innerText = "Input: Keyboard";
            $("#gamepad-btn").button('toggle');
        }
    }
}

// In teleop mode, if the input is set to the keyboard, send keyCodes to the worker
function down(e){
    if (mode === "teleop") {
        if (inputMode === "keyboard") {
            worker.postMessage({keyMode: inputMode, keyCode: e.keyCode, up: false});
        }
    }
}
function up(e){
    if (mode === "teleop") {
        if (inputMode === "keyboard") {
            worker.postMessage({keyMode: inputMode, keyCode: e.keyCode, up: true});
        }
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
    Update the state (position and direction) of the center of the robot.
    Input position is in inches. scaleFactor convers inches -> pixels.
    Example of state: {x:72, y:72, dir:0}
    */
    const scaleFactor = 3;
    const centerX = state.X * scaleFactor;
    const centerY = state.Y * scaleFactor;
    const dir = state.dir;
    document.getElementById("demo").innerHTML = state.X.toFixed(2) + ", " + state.Y.toFixed(2)
    const sensorPoints = document.querySelectorAll("circle")
    const topLeftCornerX = centerX - 30
    const topLeftCornerY = centerY - 40
    sensorPoints[0].setAttributeNS(null, "cx", centerX)
    sensorPoints[0].setAttributeNS(null, "cy", centerY)
    sensorPoints[1].setAttributeNS(null, "cy", centerY+(15*Math.cos(dir/180*Math.PI)))
    sensorPoints[1].setAttributeNS(null, "cx", centerX+(-15*Math.sin(dir/180*Math.PI)))
    sensorPoints[2].setAttributeNS(null, "cy", centerY-(15*Math.cos(dir/180*Math.PI)))
    sensorPoints[2].setAttributeNS(null, "cx", centerX-(-15*Math.sin(dir/180*Math.PI)))
    const robotRect = document.querySelector("rect")
    robotRect.setAttributeNS(null, "x", topLeftCornerX)
    robotRect.setAttributeNS(null, "y", topLeftCornerY)
    const rotateStr = `rotate(${dir} ${centerX} ${centerY})`
    robotRect.setAttribute("transform", rotateStr)
};

function updateSensors(sensorValues) {
    document.getElementById("left-sensor").innerText = "Left Sensor: " + sensorValues.leftSensor.toFixed(3);
    document.getElementById("center-sensor").innerText = "Center Sensor: " + sensorValues.centerSensor.toFixed(3);
    document.getElementById("right-sensor").innerText = "Right Sensor: " + sensorValues.rightSensor.toFixed(3);
}

function start(auto=0) {
    /*
    Start the robot thread
    Return if started robot thread
    */
    if (mode !== "idle") {
        return;
    }
    else {
        clearInterval(timer);
        if (auto === 0) {
            worker.postMessage({start:true, mode:"teleop"})
        }
        else if (auto === 1) {
            worker.postMessage({start:true, mode:"auto"})
        }
    }
};

function runAutoTimer() {
    var startTime = new Date().getTime();
    document.getElementById("timer").innerText = "Time Left: 30s";

    clearInterval(timer);
    timer = setInterval(function() {
        let currTime = new Date().getTime();
        let timeElapsed = Math.floor((currTime - startTime) / 1000);
        let timeLeft = 30 - timeElapsed;

        document.getElementById("timer").innerText = "Time Left: " + timeLeft + "s";

        if (timeLeft < 0) {
            clearInterval(timer);
            document.getElementById("timer").innerText = "Autonomous Mode has finished.";
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

function clearConsole(){
    document.getElementById("console").innerText = ""
}
clearConsole()

function log(text) {
    const array = ['pyodide.py', '<eval>'];
    for (string of array){
        if(text.includes(string)){
            return
        }
    }
    let consoleLog = document.getElementById("console");
    logged = consoleLog.innerHTML += text + "<br>";
    consoleLog.scrollTop = consoleLog.scrollHeight;
}
