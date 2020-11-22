var mode = "idle"; // or auto or teleop
var worker = new Worker("static/js/robot.js");
var timer;
var inputMode = "keyboard";
//var gamepadInterval;
//var gamepad;

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

// Switch input mode between 'keyboard' and 'gamepad'
function switchInput() {
    if (inputMode === "keyboard") {
        inputMode = "gamepad";
        document.getElementById("inputMode").innerHTML = "Input: Gamepad";
    } else if (inputMode == "gamepad") {
        inputMode = "keyboard";
        document.getElementById("inputMode").innerHTML = "Input: Keyboard";
    }
}

// In teleop mode, send keyModees to the worker
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
    const scaledX = state.X * scaleFactor - 30;
    const scaledY = state.Y * scaleFactor - 40;
    const dir = state.dir;
    document.getElementById("demo").innerHTML = state.X.toFixed(2) + ", " + state.Y.toFixed(2)
    const robotRect = document.querySelector("rect")
    robotRect.setAttributeNS(null, "x", scaledX)
    robotRect.setAttributeNS(null, "y", scaledY)
    const rotateStr = `rotate(${dir} ${scaledX + 30} ${scaledY + 40})`
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
        clearInterval(timer);
        //clearInterval(gamepadInterval);
        if (auto === 0) {
            worker.postMessage({start:true, mode:"teleop"})
            //setTeleopLoop();
        }
        else if (auto === 1) {
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

//GAMEPAD:
/**
 * Create a global setInterval that is initialized when teleop starts and the mode is gamepad
 * setInterval is cleared upon call to stop()
 * setInterval every 10ms
 * if gamepad axes < 0.2 -> postMessage to stop movement
 */
 /*
function setTeleopLoop() {
    gamepadInterval = setInterval(checkJoysticks, 500);
}

function checkJoysticks() {
    console.log("checking gamepad axes");
    if (atCenter(gamepad.axes, 0)) { // L: left_right is zero
        worker.postMessage({keyMode: true, keyCode: 68, up: true});
        worker.postMessage({keyMode: true, keyCode: 65, up: true});
    }
    if (atCenter(gamepad.axes, 1)) { // L: up+down is zero
        worker.postMessage({keyMode: true, keyCode: 83, up: true});
        worker.postMessage({keyMode: true, keyCode: 87, up: true});
    }
    if (atCenter(gamepad.axes, 2)) { // R: left_right is zero
        worker.postMessage({keyMode: true, keyCode: 39, up: true});
        worker.postMessage({keyMode: true, keyCode: 37, up: true});
    }
    if (atCenter(gamepad.axes, 3)) { // R: up+down is zero
        worker.postMessage({keyMode: true, keyCode: 40, up: true});
        worker.postMessage({keyMode: true, keyCode: 38, up: true});
    }
}

function atCenter(axes, axis) {
    return axes[axis] > -0.1 && axes[axis] < 0.1;
}
*/

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
    //clearInterval(gamepadInterval);
};
