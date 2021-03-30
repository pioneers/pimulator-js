var mode = "idle"; // or auto or teleop
var worker = new Worker("static/js/robot.js?t=" + gitHash);
worker.postMessage({gitHash: gitHash});
var timer;
var inputMode = "keyboard";
var robotType = "medium";
var codeUploaded = false;
const scaleFactor = 3;
const canvas = document.getElementById('fieldCanvas');
const ctx = canvas.getContext('2d');
var globalRobot = null;
var globalObjects = null;

// var obstacles = [];
// var tapelines = [];

// Handle messages from worker
function onmessage(e) {
    if (e.data.robot !== undefined && e.data.objects !== undefined) {
        update(e.data.robot, e.data.objects);
    }
    if (e.data.sensors !== undefined) {
        updateSensors(e.data.sensors);
    }
    if (e.data.switches !== undefined) {
        updateSwitches(e.data.switches);
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
    if (e.data.objs !== undefined) {
        drawObjs(e.data.objs, e.data.type);
    }
}
worker.onmessage = onmessage;

function drawRobot(robot) {
    // Update text
    document.getElementById("demo").innerHTML = "x: " + robot.X.toFixed(2) + ", y: " + robot.Y.toFixed(2);

    // Draw the robot
    const centerX = robot.X * scaleFactor;
    const centerY = robot.Y * scaleFactor;
    const dir = robot.dir/180*Math.PI;  // Convert to Radians

    // Draw Rectangle
    ctx.lineWidth = 2;
    const topLeftCornerX = centerX - 30;
    const topLeftCornerY = centerY - 40;

    // Translate to and rotate about the center of the robot
    ctx.translate(centerX, centerY);
    ctx.rotate(dir);
    ctx.translate(-centerX, -centerY);

    ctx.beginPath();
    ctx.rect(topLeftCornerX, topLeftCornerY, 60, 80);
    ctx.closePath();
    ctx.strokeStyle = 'navy';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Draw Circles
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
    ctx.moveTo(centerX, centerY-15);
    ctx.arc(centerX, centerY-15, 3, 0, 2 * Math.PI);
    ctx.moveTo(centerX, centerY+15);
    ctx.arc(centerX, centerY+15, 3, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.strokeStyle = 'red';
    ctx.stroke();
    ctx.fillStyle = 'red';
    ctx.fill();
    // Draw Triangle
    ctx.beginPath();
    ctx.moveTo(centerX-24, centerY);
    ctx.lineTo(centerX-18, centerY+3.5);
    ctx.lineTo(centerX-18, centerY-3.5);
    ctx.lineTo(centerX-24, centerY);
    ctx.closePath();
    ctx.strokeStyle = 'blue';
    ctx.stroke();
    ctx.fillStyle = 'blue';
    ctx.fill();

    // Translate to and rotate back
    ctx.translate(centerX, centerY);
    ctx.rotate(-dir);
    ctx.translate(-centerX, -centerY);
}
drawRobot({
    X: Number($("#xpos").val()),
    Y: Number($("#ypos").val()),
    dir: 0
});

function drawObjs(objs, type) {
    /* Draw objects received from the worker. */

    if (type === "obstacle") {
        // obstacles = objs;
        for (let i = 0; i < objs.length; i++) {
            ctx.beginPath();
            ctx.moveTo(objs[i].topL[0]*scaleFactor, objs[i].topL[1]*scaleFactor);
            ctx.lineTo(objs[i].topR[0]*scaleFactor, objs[i].topR[1]*scaleFactor);
            ctx.lineTo(objs[i].botR[0]*scaleFactor, objs[i].botR[1]*scaleFactor);
            ctx.lineTo(objs[i].botL[0]*scaleFactor, objs[i].botL[1]*scaleFactor);
            ctx.fillStyle = objs[i].color;
            ctx.fill();
        }
    } else if (type === "tapeLine") {
        // tapelines = objs;
        ctx.lineWidth = 5;
        for (let i = 0; i < objs.length; i++) {
            ctx.beginPath();
            ctx.strokeStyle = objs[i].color;
            ctx.moveTo(objs[i].startX*scaleFactor, objs[i].startY*scaleFactor)
            ctx.lineTo(
                objs[i].endX*scaleFactor,
                objs[i].endY*scaleFactor,
            );
            ctx.stroke();
        }
    }
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/* Switch input mode between 'keyboard' and 'gamepad' */
function switchInput(newInputMode) {
    // Toggle previously activated button off (or retoggle currently activated button on)
    $("#" + inputMode + "-btn").button('toggle');
    inputMode = newInputMode;
}

/* Switch robot type between 'light', 'medium', and 'heavy' */
function switchRobotType(newRobotType) {
    // Toggle previously activated button off (or retoggle currently activated button on)
    $("#" + robotType + "-btn").button('toggle');
    robotType = newRobotType;
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
    localStorage.setItem("code", code);
    worker.postMessage({code:code, newCode:true});
    codeUploaded = true;
}

function uploadObjects(){
    if (mode === "idle") {
        clearCanvas();
    }
    objectsCode = cmObjects.getValue();
    localStorage.setItem("objectsCode", objectsCode);
    worker.postMessage({objectsCode:objectsCode, newObjects:true});
    log("Field upload successful");
    if (mode === "auto") {
        log("Field will update when autonomous simulation ends")
    }
    if (mode === "idle") {
        // Redraw robot
        // TODO: Get robot position and direction from settings
        let robot = {
            X: Number($("#xpos").val()),
            Y: Number($("#ypos").val()),
            dir: 0
        };
        drawRobot(robot);
    }
}

function uploadObjectsOnce() {
    if (objectsCode !== null) {
        worker.postMessage({objectsCode:objectsCode, newObjects:false});
        // worker.postMessage({drawObjs:true});
    } else {
        setTimeout(uploadObjectsOnce, 100);
    }
}
uploadObjectsOnce();

function update(robot, objects) {
    /*
    Update the state (position and direction) of the center of the robot.
    Input position is in inches. scaleFactor convers inches -> pixels.
    Example of state: {x:72, y:72, dir:0}
    */
    clearCanvas();

    drawObjs(objects.tapeLines, "tapeLine");
    drawObjs(objects.obstacles, "obstacle");

    drawRobot(robot);
}

function updateSensors(sensorValues) {
    document.getElementById("left-sensor").innerText = "Left: " + sensorValues.leftSensor.toFixed(3);
    document.getElementById("center-sensor").innerText = "Center: " + sensorValues.centerSensor.toFixed(3);
    document.getElementById("right-sensor").innerText = "Right: " + sensorValues.rightSensor.toFixed(3);
}

function updateSwitches(switchValues) {
    let booleans = {true: "True", false: "False"}
    document.getElementById("front-switch").innerText = "Front: " + booleans[switchValues.frontSwitch];
    document.getElementById("back-switch").innerText = "Back: " + booleans[switchValues.backSwitch];
}

function start(auto=false) {
    /*
    Start the robot thread
    Return if started robot thread
    */
    if (mode !== "idle") {
        return;
    }
    else {
        clearInterval(timer);
        if (codeUploaded) {
            let robotInfo = {
                robotType: robotType,
                xpos: $("#xpos").val(),
                ypos: $("#ypos").val()
            }

            if (auto === false) {
                $("#teleop-btn").removeClass("btn-outline-primary").addClass("btn-primary")
                worker.postMessage({start:true, mode:"teleop", robotInfo:robotInfo})
            } else if (auto === true) {
                $("#autonomous-btn").removeClass("btn-outline-primary").addClass("btn-primary")
                worker.postMessage({start:true, mode:"auto", robotInfo:robotInfo})
            }
            document.getElementById("stop-btn").disabled = false;
            document.getElementById("teleop-btn").disabled = true;
            document.getElementById("autonomous-btn").disabled = true;
        }
        else {
            if (auto === false) {
                $("#teleop-btn").button('toggle')
            } else if (auto === true) {
                $("#autonomous-btn").button('toggle')
            }
            log("Please upload code first");
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
            autonomousReset()
            document.getElementById("timer").innerText = "Autonomous Mode has finished.";
        }
    }, 1000);
}

function stop() {
    /*
    Stop the robot thread
    */
    log("Simulation stopped. Reloading resources...");
    worker.terminate();
    worker = new Worker("static/js/robot.js?t=" + gitHash);
    worker.onmessage = onmessage;
    worker.postMessage({gitHash: gitHash});
    worker.postMessage({code:code});
    worker.postMessage({objectsCode:objectsCode});
    mode = "idle";
    autonomousReset()
};

function autonomousReset() {
    /*
        Reset UI elements when autonomous ends by force (Stop) or naturally (30s).
        Resets the timer & simulation buttons.
    */
    clearInterval(timer);
    document.getElementById("stop-btn").disabled = true;
    document.getElementById("teleop-btn").disabled = false;
    document.getElementById("autonomous-btn").disabled = false;
    if (document.getElementById("teleop-btn").classList.contains("btn-primary")) {
        $("#teleop-btn").removeClass("btn-primary").addClass("btn-outline-primary")
    }
    if (document.getElementById("autonomous-btn").classList.contains("btn-primary")) {
        $("#autonomous-btn").removeClass("btn-primary").addClass("btn-outline-primary")
    }
}

function clearConsole(){
    document.getElementById("console").innerText = ""
}
clearConsole()

function log(text) {
    // TODO: Filter out unwanted messages in a smarter way
    const array = ['pyodide.py', '<eval>', 'pyodide/_base.py', 'eval(compile(', 'File "<exec>", line 4, in'];
    for (string of array){
        if(text.includes(string)){
            return
        }
    }

    const date = new Date();
    const hour = date.getHours();
    const minutes = date.getMinutes();
    const time = '[' + ((hour < 10) ? '0' + hour: hour) + ':' + ((minutes < 10) ? '0' + minutes: minutes) + '] ';

    let consoleLog = document.getElementById("console");
    consoleLog.innerHTML += time + text + "<br>";
    consoleLog.scrollTop = consoleLog.scrollHeight;
}
