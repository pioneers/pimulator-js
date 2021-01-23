var mode = "idle"; // or auto or teleop
var worker = new Worker("static/js/robot.js");
var timer;
var inputMode = "keyboard";
var codeUploaded = false;
const scaleFactor = 3;

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
    if (e.data.objs !== undefined) {
        drawObjs(e.data.objs);
    }
}
worker.onmessage = onmessage;

function drawObjs(objs, type) {
    /* Draw objects received from the worker. */
    const canvas = document.getElementById('fieldCanvas');
    const ctx = canvas.getContext('2d');
    if (type === "obstacle") {
        for (let i = 0; i < objs.length; i++) {
            ctx.beginPath();
            ctx.fillStyle = objs[i].color;
            ctx.fillRect(
                objs[i].x*scaleFactor,
                objs[i].y*scaleFactor,
                objs[i].w*scaleFactor,
                objs[i].h*scaleFactor
            );
        }
    } else if (type === "tapeLine") {
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
    codeUploaded = true;
};

function update(state) {
    /*
    Update the state (position and direction) of the center of the robot.
    Input position is in inches. scaleFactor convers inches -> pixels.
    Example of state: {x:72, y:72, dir:0}
    */
    const centerX = state.X * scaleFactor;
    const centerY = state.Y * scaleFactor;
    const dir = state.dir/180*Math.PI;  // Convert to Radians
    document.getElementById("demo").innerHTML = state.X.toFixed(2) + ", " + state.Y.toFixed(2)
    const sensorPoints = document.querySelectorAll("circle")

    // Set sensors
    sensorPoints[0].setAttributeNS(null, "cx", centerX)
    sensorPoints[0].setAttributeNS(null, "cy", centerY)
    sensorPoints[1].setAttributeNS(null, "cy", centerY+(15*Math.cos(dir)))
    sensorPoints[1].setAttributeNS(null, "cx", centerX+(-15*Math.sin(dir)))
    sensorPoints[2].setAttributeNS(null, "cy", centerY-(15*Math.cos(dir)))
    sensorPoints[2].setAttributeNS(null, "cx", centerX-(-15*Math.sin(dir)))

    // Set robot coordinates
    const topLeftCornerX = centerX - 30
    const topLeftCornerY = centerY - 40
    const robotRect = document.querySelector("rect")
    robotRect.setAttributeNS(null, "x", topLeftCornerX)
    robotRect.setAttributeNS(null, "y", topLeftCornerY)
    const rotateStr = `rotate(${state.dir} ${centerX} ${centerY})`
    robotRect.setAttribute("transform", rotateStr)

    // Set triangle on robot
    const triangle = document.querySelector("polygon")
    const dirRotate = (state.dir+90)/180*Math.PI
    const topTriangleX = centerX - 24*Math.sin(dirRotate)
    const topTriangleY = centerY + 24*Math.cos(dirRotate)
    const baseTriangleX = 3*topTriangleX/4 +  1* centerX/4
    const baseTriangleY = 3*topTriangleY/4 + 1*centerY/4
    const sideDist = 6/Math.sqrt(3)
    const trianglePoint2 = `${baseTriangleX-sideDist*Math.sin(dir)},${baseTriangleY+sideDist*Math.cos(dir)} `
    const trianglePoint3 = `${baseTriangleX+sideDist*Math.sin(dir)},${baseTriangleY-sideDist*Math.cos(dir)}`
    const triangleStr = `${topTriangleX},${topTriangleY} ` + trianglePoint2 + trianglePoint3;
    triangle.setAttributeNS(null, "points",triangleStr);
}

function updateSensors(sensorValues) {
    document.getElementById("left-sensor").innerText = "Left Sensor: " + sensorValues.leftSensor.toFixed(3);
    document.getElementById("center-sensor").innerText = "Center Sensor: " + sensorValues.centerSensor.toFixed(3);
    document.getElementById("right-sensor").innerText = "Right Sensor: " + sensorValues.rightSensor.toFixed(3);
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
            if (auto === false) {
                $("#teleop-btn").removeClass("btn-outline-primary").addClass("btn-primary")
                worker.postMessage({start:true, mode:"teleop"})
            } else if (auto === true) {
                $("#autonomous-btn").removeClass("btn-outline-primary").addClass("btn-primary")
                worker.postMessage({start:true, mode:"auto"})
            }
            document.getElementById("stop-btn").disabled = false;
            document.getElementById("teleop-btn").disabled = true;
            document.getElementById("autonomous-btn").disabled = true;
        } else {
            if (auto === false) {
                $("#teleop-btn").button('toggle')
                worker.postMessage({start:true, mode:"teleop"})
            } else if (auto === true) {
                $("#autonomous-btn").button('toggle')
                worker.postMessage({start:true, mode:"auto"})
            }
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
    worker.terminate();
    worker = new Worker("/static/js/robot.js");
    worker.onmessage = onmessage;
    worker.postMessage({code:code});
    mode = "idle";
    update({X:70,Y:70,dir:0}); // in inches
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
