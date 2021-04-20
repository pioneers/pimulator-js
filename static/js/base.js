var mode = "idle"; // or auto or teleop
var worker = new Worker("static/js/robot.js?t=" + gitHash);
worker.postMessage({gitHash: gitHash});
var timer;
var inputMode = "keyboard";
var robotType = "medium";
var direction = 0;
var codeUploaded = false;
const scaleFactor = 3;
const canvas = document.getElementById('fieldCanvas');
const ctx = canvas.getContext('2d');

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

    if (!robot.robotType) {
        robot.robotType == "medium";
    }
    if (robot.robotType == "light") {
        robotWidth = 14.18;      // Robot width, inches
        robotHeight = 12.5;      // Robot height, inches
    }
    else if (robot.robotType == "medium") {
        robotWidth = 19.3;
        robotHeight = 14;
    }
    else if (robot.robotType == "heavy") {
        robotWidth = 10.7;
        robotHeight = 14.06;
    }

    // coordinates of center of front side of robot (for drawing sensors)
    const scaledTopRX = (robot.X - robotHeight/2) * scaleFactor;
    const scaledTopRY = (robot.Y - robotWidth/2) * scaleFactor;
    const scaledTopLX = (robot.X - robotHeight/2) * scaleFactor;
    const scaledTopLY = (robot.Y + robotWidth/2) * scaleFactor;
    const frontCenterX = (scaledTopLX + scaledTopRX) / 2;
    const frontCenterY = (scaledTopLY + scaledTopRY) / 2;

    // Draw Rectangle
    ctx.lineWidth = 2;
    const topLeftCornerX = centerX - (robotHeight * scaleFactor) / 2;
    const topLeftCornerY = centerY - (robotWidth * scaleFactor) / 2;

    // Translate to and rotate about the center of the robot
    ctx.translate(centerX, centerY);
    ctx.rotate(dir);
    ctx.translate(-centerX, -centerY);

    ctx.beginPath();
    ctx.rect(topLeftCornerX, topLeftCornerY, robotHeight * scaleFactor, robotWidth * scaleFactor);
    ctx.closePath();
    ctx.strokeStyle = 'navy';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Draw Circles
    ctx.beginPath();
    ctx.moveTo(frontCenterX, frontCenterY);
    ctx.arc(frontCenterX, frontCenterY, 2, 0, 2 * Math.PI);
    ctx.moveTo(frontCenterX, frontCenterY-9);
    ctx.arc(frontCenterX, frontCenterY-9, 2, 0, 2 * Math.PI);
    ctx.moveTo(frontCenterX, frontCenterY+9);
    ctx.arc(frontCenterX, frontCenterY+9, 2, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.strokeStyle = 'red';
    ctx.stroke();
    ctx.fillStyle = 'red';
    ctx.fill();
    // Draw Triangle
    ctx.beginPath();
    ctx.moveTo(frontCenterX + 6, frontCenterY);
    ctx.lineTo(frontCenterX + 11, frontCenterY + 3);
    ctx.lineTo(frontCenterX + 11, frontCenterY - 3);
    ctx.lineTo(frontCenterX + 6, frontCenterY);
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
    dir: direction,
    robotType: robotType
});

function drawObjs(objs, type) {
    /* Draw objects received from the worker. */

    if (type === "obstacle") {
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
    else if (type === "ramp") {
        ctx.lineWidth = 2;
        for (let i = 0; i < objs.length; i++) {
            if (objs[i].highSide == 90.0) {
                drawArrow(
                    "south",
                    scaleFactor * (objs[i].topL[0]+objs[i].topR[0]) / 2,
                    scaleFactor * (.3 * objs[i].h + objs[i].topL[1]),
                    scaleFactor * (objs[i].topL[0]+objs[i].topR[0]) / 2,
                    scaleFactor * (.7 * objs[i].h + objs[i].topL[1]),
                    objs[i].color
                );
                drawArrow(
                    "south",
                    scaleFactor * ((objs[i].topL[0]+objs[i].topR[0]) / 2 + .2 * objs[i].w),
                    scaleFactor * (.3 * objs[i].h + objs[i].topL[1]),
                    scaleFactor * ((objs[i].topL[0]+objs[i].topR[0]) / 2 + .2 * objs[i].w),
                    scaleFactor * (.7 * objs[i].h + objs[i].topL[1]),
                    objs[i].color
                );
                drawArrow(
                    "south",
                    scaleFactor * ((objs[i].topL[0]+objs[i].topR[0]) / 2 - .2 * objs[i].w),
                    scaleFactor * (.3 * objs[i].h + objs[i].topL[1]),
                    scaleFactor * ((objs[i].topL[0]+objs[i].topR[0]) / 2 - .2 * objs[i].w),
                    scaleFactor * (.7 * objs[i].h + objs[i].topL[1]),
                    objs[i].color
                );
                ctx.beginPath();
                ctx.strokeStyle = objs[i].color;
                ctx.moveTo(scaleFactor * objs[i].topL[0], scaleFactor * objs[i].topL[1]);
                ctx.setLineDash([7, 10]);
                ctx.lineTo(scaleFactor * objs[i].topR[0], scaleFactor * objs[i].topR[1]);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (objs[i].highSide == 270.0) {
                drawArrow(
                    "north",
                    scaleFactor * (objs[i].topL[0]+objs[i].topR[0]) / 2,
                    scaleFactor * (.7 * objs[i].h + objs[i].topL[1]),
                    scaleFactor * (objs[i].topL[0]+objs[i].topR[0]) / 2,
                    scaleFactor * (.3 * objs[i].h + objs[i].topL[1]),
                    objs[i].color
                );
                drawArrow(
                    "north",
                    scaleFactor * ((objs[i].topL[0]+objs[i].topR[0]) / 2 + .2 * objs[i].w),
                    scaleFactor * (.7 * objs[i].h + objs[i].topL[1]),
                    scaleFactor * ((objs[i].topL[0]+objs[i].topR[0]) / 2 + .2 * objs[i].w),
                    scaleFactor * (.3 * objs[i].h + objs[i].topL[1]),
                    objs[i].color
                );
                drawArrow(
                    "north",
                    scaleFactor * ((objs[i].topL[0]+objs[i].topR[0]) / 2 - .2 * objs[i].w),
                    scaleFactor * (.7 * objs[i].h + objs[i].topL[1]),
                    scaleFactor * ((objs[i].topL[0]+objs[i].topR[0]) / 2 - .2 * objs[i].w),
                    scaleFactor * (.3 * objs[i].h + objs[i].topL[1]),
                    objs[i].color
                );
                ctx.beginPath();
                ctx.strokeStyle = objs[i].color;
                ctx.moveTo(scaleFactor * objs[i].botL[0], scaleFactor * objs[i].botL[1]);
                ctx.setLineDash([7, 10]);
                ctx.lineTo(scaleFactor * objs[i].botR[0], scaleFactor * objs[i].botR[1]);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (objs[i].highSide == 180.0) {
                drawArrow(
                    "east",
                    scaleFactor * (.3 * objs[i].w + objs[i].topL[0]),
                    scaleFactor * (objs[i].topR[1] + objs[i].botR[1]) / 2,
                    scaleFactor * (.7 * objs[i].w + objs[i].topL[0]),
                    scaleFactor * (objs[i].topR[1] + objs[i].botR[1]) / 2,
                    objs[i].color
                );
                drawArrow(
                    "east",
                    scaleFactor * (.3 * objs[i].w + objs[i].topL[0]),
                    scaleFactor * (objs[i].topR[1] + objs[i].botR[1]) / 2 + .6 * objs[i].h,
                    scaleFactor * (.7 * objs[i].w + objs[i].topL[0]),
                    scaleFactor * (objs[i].topR[1] + objs[i].botR[1]) / 2 + .6 * objs[i].h,
                    objs[i].color
                );
                drawArrow(
                    "east",
                    scaleFactor * (.3 * objs[i].w + objs[i].topL[0]),
                    scaleFactor * (objs[i].topR[1] + objs[i].botR[1]) / 2 - .6 * objs[i].h,
                    scaleFactor * (.7 * objs[i].w + objs[i].topL[0]),
                    scaleFactor * (objs[i].topR[1] + objs[i].botR[1]) / 2 - .6 * objs[i].h,
                    objs[i].color
                );
                ctx.beginPath();
                ctx.strokeStyle = objs[i].color;
                ctx.moveTo(scaleFactor * objs[i].topL[0], scaleFactor * objs[i].topL[1]);
                ctx.setLineDash([7, 10]);
                ctx.lineTo(scaleFactor * objs[i].botL[0], scaleFactor * objs[i].botR[1]);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (objs[i].highSide == 0.0) {
                drawArrow(
                    "west",
                    scaleFactor * (.7 * objs[i].w + objs[i].topL[0]),
                    scaleFactor * (objs[i].topR[1] + objs[i].botR[1]) / 2,
                    scaleFactor * (.3 * objs[i].w + objs[i].topL[0]),
                    scaleFactor * (objs[i].topR[1] + objs[i].botR[1]) / 2,
                    objs[i].color
                );
                drawArrow(
                    "west",
                    scaleFactor * (.7 * objs[i].w + objs[i].topL[0]),
                    scaleFactor * (objs[i].topR[1] + objs[i].botR[1]) / 2 + .6 * objs[i].h,
                    scaleFactor * (.3 * objs[i].w + objs[i].topL[0]),
                    scaleFactor * (objs[i].topR[1] + objs[i].botR[1]) / 2 + .6 * objs[i].h,
                    objs[i].color
                );
                drawArrow(
                    "west",
                    scaleFactor * (.7 * objs[i].w + objs[i].topL[0]),
                    scaleFactor * (objs[i].topR[1] + objs[i].botR[1]) / 2 - .6 * objs[i].h,
                    scaleFactor * (.3 * objs[i].w + objs[i].topL[0]),
                    scaleFactor * (objs[i].topR[1] + objs[i].botR[1]) / 2 - .6 * objs[i].h,
                    objs[i].color
                );
                ctx.beginPath();
                ctx.strokeStyle = objs[i].color;
                ctx.moveTo(scaleFactor * objs[i].topR[0], scaleFactor * objs[i].topR[1]);
                ctx.setLineDash([7, 10]);
                ctx.lineTo(scaleFactor * objs[i].botR[0], scaleFactor * objs[i].botR[1]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }
}

function drawArrow(cardinalDir, startX, startY, endX, endY, color) {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.strokeStyle = color;
    if (cardinalDir == "south") {
        let length = endY - startY;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineTo(
            endX + 0.1 * length,
            startY + .7 * length// + 1.7 * length
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - 0.1 * length,
            startY + .7 * length
        );
        ctx.stroke();
    } else if (cardinalDir == "north") {
        let length = startY - endY;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineTo(
            endX + 0.1 * length,
            startY - .7 * length
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - 0.1 * length,
            startY - .7 * length
        );
        ctx.stroke();
    } else if (cardinalDir == "west") {
        let length = startX - endX;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineTo(
            endX + 0.3 * length,
            endY + 0.1 * length
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX + 0.3 * length,
            endY - 0.1 * length
        );
        ctx.stroke();
    } else if (cardinalDir == "east") {
        let length = endX - startX;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.lineTo(
            endX - 0.3 * length,
            endY + 0.1 * length
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - 0.3 * length,
            endY - 0.1 * length
        );
        ctx.stroke();
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

/* Switch robot starting direction (in degrees) between 0 (left), 90 (up), and 180 (right), and 270 (down) */
function switchDirection(newDirection) {
    direction = newDirection;
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
    worker.postMessage({code:code});
    codeUploaded = true;
    if (mode !== "idle") {
        log("Simulation active: Code will update when next simulation starts")
    } else {
        log("Code upload successful");
    }
}

function uploadObjects(){
    if (mode === "idle") {
        clearCanvas();
    }
    objectsCode = cmObjects.getValue();
    localStorage.setItem("objectsCode", objectsCode);
    worker.postMessage({objectsCode:objectsCode});
    if (mode === "auto") {
        log("Autonomous simulation active: Field will update when next simulation starts")
    } else {
        log("Field upload successful");
    }
    if (mode === "idle") {
        // Redraw robot
        let robot = {
            X: Number($("#xpos").val()),
            Y: Number($("#ypos").val()),
            dir: direction,
            robotType: robotType
        };
        drawRobot(robot);
    }
}

function uploadObjectsOnce() {
    if (objectsCode !== null) {
        worker.postMessage({objectsCode:objectsCode});
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
    drawObjs(objects.ramps, "ramp");

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
            // Send the list of objects
            worker.postMessage({objectsCode:objectsCode});

            //  Collect the robot start position and direction
            let robotInfo = {
                robotType: robotType,
                xpos: $("#xpos").val(),
                ypos: $("#ypos").val(),
                dir: direction
            }

            // Start the simulation
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
