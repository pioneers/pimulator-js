/***********************************************************************
 * The Main Thread.
 * 
 * Handles webpage updates, such as the Canvas (used for the Simulator)
 * and the Console. 
 * 
 * Interacts with the Worker Thread, robot.js, to run the Simulator.
 **********************************************************************/

/**
 * The date of the last update in the format DD-MM-YYYY
 * where DD and MM do not have leading zeros.
 * Must be updated upon each push to the webapp.
 */
const lastUpdate = "22-1-2022"

// Current mode of the Simulator. Possible modes: {idle, auto, teleop}
var mode = "idle";

// Current number of subworker threads for handling Robot.run() calls (user-configurable)
var numThreads = 1;

// The timer for Autonomous Mode Simulation.
var timer;

// The current input mode. Possible inputs: {keyboard, gamepad}
var inputMode = "keyboard";

// The current robot type. Possible types: {light, medium, heavy}
var robotType = "medium";

// The Robot's starting coordinates on the Canvas.
var xpos = 70;
var ypos = 70;

/**
 * The Robot's starting direction, measured in degrees:
 *                 90 [Up]
 *
 *       0 [Left]            180 [Right]
 *
 *                270 [Down]
 */
var direction = 0;

// Scale factor for Robot sizing.
const scaleFactor = 3;

// Canvas for the Field and Robot.
const canvas = document.getElementById('fieldCanvas');
const ctx = canvas.getContext('2d');

var codeUploaded = false;
var pythonError = false;

// Also referenced in dark_mode.js
var darkToggle = false;

// The worker thread.
var worker = new Worker("static/js/worker/robot.js?t=" + cacheKey);
worker.postMessage({cacheKey: cacheKey});
worker.postMessage({numThreads: numThreads});

/**
 * Handles messages from the Worker Thread (robot.js).
 * @param {*} e - an object that contains data, which is a map
 *                  of various things that the Main thread needs
 *                  to maintain and display a correct simulation.
 */
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
    if (e.data.objs !== undefined) { // if objs have been rendered on canvas
        // Draws Objects & Robot on window load
        robot = {
            X: xpos,
            Y: ypos,
            dir: direction,
            robotType: robotType
        };
        update(robot, e.data.objs)
    }
}

/**
 * Draws the Robot on the canvas.
 * @param {Map} robot - A simplified version of a Robot, containing only
 *                      the necessary fields for displaying on the Canvas.
 */
function drawRobot(robot) {
    // Update text
    document.getElementById("demo").innerHTML = "x: " + robot.X.toFixed(2) + ", y: " + robot.Y.toFixed(2);

    // Draw the robot
    const centerX = robot.X * scaleFactor;
    const centerY = robot.Y * scaleFactor;
    const dir = robot.dir/180*Math.PI;  // Convert to Radians

    if (!robot.robotType) {
        robot.robotType = "medium"; // Default Robot Type is Medium
    }

    // Set Robot Width and Height (in inches) based on Type.
    if (robot.robotType == "light") {
        robotWidth = 14.18;
        robotHeight = 12.5;
    }
    else if (robot.robotType == "medium") {
        robotWidth = 19.3;
        robotHeight = 14;
    }
    else if (robot.robotType == "heavy") {
        robotWidth = 10.7;
        robotHeight = 14.06;
    }

    // Coordinates of center of front side of robot (for drawing sensors)
    const scaledTopRX = (robot.X - robotHeight/2) * scaleFactor;
    const scaledTopRY = (robot.Y - robotWidth/2) * scaleFactor;
    const scaledTopLX = (robot.X - robotHeight/2) * scaleFactor;
    const scaledTopLY = (robot.Y + robotWidth/2) * scaleFactor;
    const frontCenterX = (scaledTopLX + scaledTopRX) / 2;
    const frontCenterY = (scaledTopLY + scaledTopRY) / 2;

    // Translate to and rotate about the center of the robot
    ctx.translate(centerX, centerY);
    ctx.rotate(dir);
    ctx.translate(-centerX, -centerY);

    // Draw Rectangle (Robot outline)
    ctx.lineWidth = 2;
    const topLeftCornerX = centerX - (robotHeight * scaleFactor) / 2;
    const topLeftCornerY = centerY - (robotWidth * scaleFactor) / 2;
    ctx.beginPath();
    ctx.rect(topLeftCornerX, topLeftCornerY, robotHeight * scaleFactor, robotWidth * scaleFactor);
    ctx.closePath();
    ctx.strokeStyle = 'navy';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Circles (Line followers)
    ctx.beginPath();
    ctx.moveTo(frontCenterX, frontCenterY);
    ctx.arc(frontCenterX, frontCenterY, 1, 0, 2 * Math.PI);
    ctx.moveTo(frontCenterX, frontCenterY-9);
    ctx.arc(frontCenterX, frontCenterY-9, 1, 0, 2 * Math.PI);
    ctx.moveTo(frontCenterX, frontCenterY+9);
    ctx.arc(frontCenterX, frontCenterY+9, 1, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.strokeStyle = 'red';
    ctx.stroke();
    ctx.fillStyle = 'red';
    ctx.fill();

    // Draw Triangle (Front indicator)
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

/**
 * Draws objects on the canvas.
 * @param {List} objs - A list of objects to the drawn. Each object is a map
 *                      containing its location.
 * @param {String} type - The type of object being drawn.
 */
function drawObjs(objs, type) {
    if (type === "quarry") {
        ctx.lineWidth = 2;
        for (let i = 0; i < objs.length; i ++) {
            obj_botL = [objs[i].botL[0] * scaleFactor, objs[i].botL[1] * scaleFactor];
            obj_botR = [objs[i].botR[0] * scaleFactor, objs[i].botR[1] * scaleFactor];
            obj_topL = [objs[i].topL[0] * scaleFactor, objs[i].topL[1] * scaleFactor];
            obj_topR = [objs[i].topR[0] * scaleFactor, objs[i].topR[1] * scaleFactor];
            ctx.beginPath();
            if (objs[i].orientation === 'right') {
                ctx.moveTo(obj_botL[0], obj_botL[1]);
                ctx.lineTo(obj_botR[0], obj_botR[1]);
                ctx.lineTo(obj_topR[0], obj_topR[1]);
                ctx.lineTo(obj_topL[1], obj_topL[1]);
                ctx.stroke();
                ctx.setLineDash([5, 3]);
                ctx.lineTo(obj_botL[0], obj_botL[1]);
            }
            else if (objs[i].orientation === "left") {
                ctx.moveTo(obj_botR[0], obj_botR[1]);
                ctx.lineTo(obj_botL[0], obj_botL[1]);
                ctx.lineTo(obj_topL[0], obj_topL[1]);
                ctx.lineTo(obj_topR[1], obj_topR[1]);
                ctx.stroke();
                ctx.setLineDash([5, 3]);
                ctx.lineTo(obj_botR[0], obj_botR[1]);
            }
            else if (objs[i].orientation === "down") {
                ctx.moveTo(obj_botR[0], obj_botR[1]);
                ctx.lineTo(obj_topR[0], obj_topR[1]);
                ctx.lineTo(obj_topL[0], obj_topL[1]);
                ctx.lineTo(obj_botL[0], obj_botL[1]);
                ctx.stroke();
                ctx.setLineDash([5, 3]);
                ctx.lineTo(obj_botR[0], obj_botR[1]);
            }
            else if (objs[i].orientation === "up"){
                ctx.moveTo(obj_topR[0], obj_topR[1]);
                ctx.lineTo(obj_botR[0], obj_botR[1]);
                ctx.lineTo(obj_botL[0], obj_botL[1]);
                ctx.lineTo(obj_topL[1], obj_topL[1]);
                ctx.stroke();
                ctx.setLineDash([5, 3]);
                ctx.lineTo(obj_topR[0], obj_topR[1]);
            }
            ctx.stroke();
            ctx.setLineDash([1,0])
            let all_ores = objs[i].stones.concat(objs[i].irons);
            for (let k = 0; k < all_ores.length; k ++) {
                if (all_ores[k].attached == false) {
                    ctx.beginPath();
                    let r = all_ores[i].r;
                    ctx.arc((all_ores[k].x + objs[i].topL[0] + 1) *scaleFactor, (all_ores[k].y + objs[i].topL[1] + 1) *scaleFactor, r*scaleFactor, 0, 2*Math.PI);
                    ctx.lineWidth = 0.5;
                    ctx.strokeStyle = "black"; 
                    ctx.stroke(); // Draw circle border
                    if (all_ores[k].type == "stone") {
                        ctx.fillStyle = "gray";
                        ctx.fill(); // Fill circle
                    } else {
                        ctx.fillStyle = "yellow";
                        ctx.fill(); // Fill circle
                    }
                }
            }
        }
    }
    else if (type === "obstacle") {
        for (let i = 0; i < objs.length; i++) {
            // at the moment, kind of hardcoded - might have to fix this in the future!
            if (objs[i].irons != undefined) {
                continue;
            }
            if (objs[i].is_ore === true) {
                ctx.beginPath();
                let r = objs[i].r;
                ctx.arc((objs[i].x + objs[i].topL[0] + 1) *scaleFactor, (objs[i].y + objs[i].topL[1] + 1) *scaleFactor, r*scaleFactor, 0, 2*Math.PI);
                ctx.lineWidth = 0.5;
                ctx.strokeStyle = "black"; 
                ctx.stroke(); // Draw circle border
                if (objs[i].type == "stone") {
                    ctx.fillStyle = "gray";
                    ctx.fill(); // Fill circle
                } else {
                    ctx.fillStyle = "yellow";
                    ctx.fill(); // Fill circle
                }

            }
            if (objs[i].shape == "circle" && objs[i].is_ore != true) {
                ctx.beginPath();
                let r = objs[i].r;
                let centerX = (objs[i].topL[0]+objs[i].botR[0])/2;
                let centerY = (objs[i].topL[1]+objs[i].botR[1])/2;
                ctx.arc(centerX*scaleFactor, centerY*scaleFactor, r*scaleFactor, 0, 2*Math.PI);
                ctx.fillStyle = objs[i].color;
                ctx.fill(); // Fill circle
                ctx.strokeStyle = "black";
                ctx.lineWidth = 1;
                ctx.stroke(); // Draw circle border

            } else {
                ctx.beginPath();
                ctx.moveTo(objs[i].topL[0]*scaleFactor, objs[i].topL[1]*scaleFactor);
                ctx.lineTo(objs[i].topR[0]*scaleFactor, objs[i].topR[1]*scaleFactor);
                ctx.lineTo(objs[i].botR[0]*scaleFactor, objs[i].botR[1]*scaleFactor);
                ctx.lineTo(objs[i].botL[0]*scaleFactor, objs[i].botL[1]*scaleFactor);
                ctx.lineTo(objs[i].topL[0]*scaleFactor, objs[i].topL[1]*scaleFactor);
                ctx.fillStyle = objs[i].color;
                ctx.fill(); // Fill rectangle
                ctx.strokeStyle = "black";
                ctx.lineWidth = 1;
                ctx.stroke(); // Draw rectangle border
            }
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
    } else if (type === "ramp") {
        ctx.lineWidth = 2;
        for (let i = 0; i < objs.length; i++) {
            if (objs[i].highSide == "up" || objs[i].highSide == "down") {
                // y-coordinates for start and end points of an up arrow
                let startY = .3 * objs[i].h + objs[i].topL[1];
                let endY = .7 * objs[i].h + objs[i].topL[1];
                // starting coordinate for dashed line for up ramp
                let dashedStart = [scaleFactor * objs[i].topL[0], scaleFactor * objs[i].topL[1]];
                // flip the start and end if down arrow
                if (objs[i].highSide == "down") {
                    startY = .7 * objs[i].h + objs[i].topL[1];
                    endY = .3 * objs[i].h + objs[i].topL[1];
                    // starting coordinate for dashed line for down ramp
                    dashedStart = [scaleFactor * objs[i].botL[0], scaleFactor * objs[i].botL[1]];
                }
                drawArrows(
                    "vertical",
                    scaleFactor * ((objs[i].topL[0]+objs[i].topR[0]) / 2 - .2 * objs[i].w),
                    scaleFactor * startY,
                    scaleFactor * ((objs[i].topL[0]+objs[i].topR[0]) / 2 - .2 * objs[i].w),
                    scaleFactor * endY,
                    scaleFactor * .2 * objs[i].w,
                    objs[i].color
                );
                ctx.beginPath();
                ctx.strokeStyle = objs[i].color;
                ctx.moveTo(dashedStart[0], dashedStart[1]);
                ctx.setLineDash([7, 10]);
                ctx.lineTo(dashedStart[0] + scaleFactor * objs[i].w, dashedStart[1]);
                ctx.stroke();
                ctx.setLineDash([]);
            } else if (objs[i].highSide == "left" || objs[i].highSide == "right") {
                // y-coordinates for start and end points of a left arrow
                let startX = .3 * objs[i].w + objs[i].topL[0];
                let endX = .7 * objs[i].w + objs[i].topL[0];
                // starting coordinate for dashed line for left ramp
                let dashedStart = [scaleFactor * objs[i].topL[0], scaleFactor * objs[i].topL[1]];
                // flip the start and end if right arrow
                if (objs[i].highSide == "right") {
                    startX = .7 * objs[i].w + objs[i].topL[0];
                    endX = .3 * objs[i].w + objs[i].topL[0];
                    // starting coordinate for dashed line for right ramp
                    dashedStart = [scaleFactor * objs[i].topR[0], scaleFactor * objs[i].topR[1]];
                }
                drawArrows(
                    "horizontal",
                    scaleFactor * startX,
                    scaleFactor * ((objs[i].topR[1] + objs[i].botR[1]) / 2 - .2 * objs[i].h),
                    scaleFactor * endX,
                    scaleFactor * ((objs[i].topR[1] + objs[i].botR[1]) / 2 - .2 * objs[i].h),
                    scaleFactor * .2 * objs[i].h,
                    objs[i].color
                );
                ctx.beginPath();
                ctx.strokeStyle = objs[i].color;
                ctx.moveTo(dashedStart[0], dashedStart[1]);
                ctx.setLineDash([7, 10]);
                ctx.lineTo(dashedStart[0], dashedStart[1] + scaleFactor * objs[i].h);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    } else if (type === "campsite") {
        for (let i = 0; i < objs.length; i++) {
            ctx.lineWidth = 0.5;

            ctx.translate(scaleFactor * objs[i].centerX, scaleFactor * objs[i].centerY);
            ctx.rotate(((objs[i].spinnerNum-1) * 2.0 * Math.PI)/9.0);
            ctx.translate(-scaleFactor * objs[i].centerX, -scaleFactor * objs[i].centerY);

            ctx.strokeStyle = "Blue";
            ctx.fillStyle = "Blue";
            ctx.beginPath();
            ctx.moveTo(scaleFactor * objs[i].centerX, scaleFactor * objs[i].centerY);
            ctx.arc(scaleFactor * objs[i].centerX, scaleFactor * objs[i].centerY, scaleFactor * 5, (4.0 * Math.PI)/3.0, (2.0 * Math.PI));
            ctx.lineTo(scaleFactor * objs[i].centerX, scaleFactor * objs[i].centerY);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = "Yellow";
            ctx.fillStyle = "Yellow";
            ctx.beginPath();
            ctx.moveTo(scaleFactor * objs[i].centerX, scaleFactor * objs[i].centerY);
            ctx.arc(scaleFactor * objs[i].centerX, scaleFactor * objs[i].centerY, scaleFactor * 5, (2.0 * Math.PI), (2.0 * Math.PI)/3.0);
            ctx.lineTo(scaleFactor * objs[i].centerX, scaleFactor * objs[i].centerY);
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = "DimGray";
            ctx.fillStyle = "DimGray";
            ctx.beginPath();
            ctx.moveTo(scaleFactor * objs[i].centerX, scaleFactor * objs[i].centerY);
            ctx.arc(scaleFactor * objs[i].centerX, scaleFactor * objs[i].centerY, scaleFactor * 5, (2.0 * Math.PI)/3.0, (4.0 * Math.PI)/3.0);
            ctx.lineTo(scaleFactor * objs[i].centerX, scaleFactor * objs[i].centerY);
            ctx.fill();
            ctx.stroke();

            ctx.translate(scaleFactor * objs[i].centerX, scaleFactor * objs[i].centerY);
            ctx.rotate(-((objs[i].spinnerNum-1) * 2.0 * Math.PI)/9.0);
            ctx.translate(-scaleFactor * objs[i].centerX, -scaleFactor * objs[i].centerY);

            ctx.strokeStyle = "Black";
            ctx.fillStyle = "Black";
            ctx.beginPath();
            ctx.rect(scaleFactor * (objs[i].centerX - 5.5), scaleFactor * objs[i].centerY, 1, 0.5);
            ctx.fill();
            ctx.stroke();        
        }
    }
}

/**
 * Draws the Arrows on a Ramp field object.
 * @param {String} cardinalDir - the cardinal direction of the arrow. Vertical or Horizontal.
 * @param {Float} startX - the starting x-coordinate
 * @param {Float} startY - the starting y-coordinate
 * @param {Float} endX - the ending x-coordinate
 * @param {Float} endY - the ending y-coordinate
 * @param {Float} space - the spacing to create a dashed line
 * @param {String} color - the color of the arrow
 */
function drawArrows(cardinalDir, startX, startY, endX, endY, space, color) {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.strokeStyle = color;
    if (cardinalDir == "vertical") {
        let length = endY - startY;
        for (let i = 0; i < 3; i++) {
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.lineTo(
                endX + 0.1 * length,
                startY + .7 * length
            );
            ctx.moveTo(endX, endY);
            ctx.lineTo(
                endX - 0.1 * length,
                startY + .7 * length
            );
            ctx.stroke();
            startX += space;
            endX += space;
        }
    } else if (cardinalDir == "horizontal") {
        let length = startX - endX;
        for (let i = 0; i < 3; i++) {
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
            startY += space;
            endY += space;
        }
    }
}

/**
 * Clear the entire canvas.
 */
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Switch the input mode used by the simulator.
 * @param {String} newInputMode - the new desired input mode. Must be one of:
 *                                  {keyboard, gamepad}
 */
function switchInput(newInputMode) {
    // Toggle the previously activated button off (or retoggle currently activated button on)
    $("#" + inputMode + "-btn").button('toggle');
    if (darkToggle) {
        // change button background colors
        // old one -> light again
        document.getElementById(inputMode + "-btn").style.backgroundColor = "#757575";
        document.getElementById(newInputMode + "-btn").style.backgroundColor = "#404040";
    }
    inputMode = newInputMode;

}

/**
 * Switch the robot type used in the simulator.
 * @param {String} newRobotType - the new desired robot type. Must be one of:
 *                                  {light, medium, heavy}
 */
function switchRobotType(newRobotType) {
    if (robotType !== newRobotType) {
        $("#" + robotType + "-btn").button('toggle');
        $("#" + newRobotType + "-btn").button('toggle');
        if (darkToggle) {
            document.getElementById(robotType + "-btn").style.backgroundColor = "#757575"; // old one to light gray
            document.getElementById(newRobotType + "-btn").style.backgroundColor = "#404040"; // new one to dark gray
        }
        robotType = newRobotType;
    }
}

/**
 * Set the number of subworker threads used in the simulator.
 * @param {Number} newNumThreads - the new desired number of threads, currently 0 to 8
 */
function setNumThreads(newNumThreads) {
    localStorage.setItem("numThreads", newNumThreads);
    numThreads = newNumThreads;
    // Terminate existing worker+subworkers and create new ones (with new number of subworkers)
    log("Number of Robot.run() threads set to: " + newNumThreads);
    stop();
}
let storedNumThreads = localStorage.getItem("numThreads");
if (storedNumThreads !== null) {
    // Manually set thread num dropdown to value saved in local storage
    $("#threadDropdownButton").html(storedNumThreads + ' <span class="caret"></span>');
    setNumThreads(storedNumThreads);
}

/**
 * Sends a message that a key is being pressed down if the simulator is in
 * teleop mode and the input mode is the keyboard.
 * @param {keypress} e - a keypress event from pressing a key on a keyboard
 */
function down(e){
    if (mode === "teleop") {
        if (inputMode === "keyboard") {
            worker.postMessage({keyMode: inputMode, keyCode: e.keyCode, up: false});
        }
    }
}

/**
 * Sends a message that a key is done being pressed if the simulator is in
 * teleop mode and the input mode is the keyboard.
 * @param {keypress} e - a keypress event from pressing a key on a keyboard
 */
function up(e){
    if (mode === "teleop") {
        if (inputMode === "keyboard") {
            worker.postMessage({keyMode: inputMode, keyCode: e.keyCode, up: true});
        }
    }
}

/**
 * Sends code to the Worker thread (robot.js).
 */
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

/**
 * Converts the objects code into a JS Object.
 * @param {String} codeString - objects code
 * @returns objects code as a JavaScript object
 */
function processObjectsCode(codeString) {
    // Warning: May raise an exception
    let returnString = "return " + codeString;
    let f = new Function(returnString);
    let objects = f();
    return objects;
}

/**
 * Checks and sets the starting position (coordinates/direction) for the robot.
 * @param {Map} objects - a map containing numerous objects, including
 *                          the robot (specifically, a starting position)
 */
function setRobotStartingPosition(objects) {
    if (objects.startPosition === undefined) {
        objects.startPosition = {
            x: 70,
            y: 70,
            dir:0
        }
        log("The robot starting position has not been provided. The default position (x: 70, y:70, dir: 0) was used.")
    }
    if (objects.startPosition.x !== undefined && objects.startPosition.y !== undefined) {
        xpos = objects.startPosition.x;
        ypos = objects.startPosition.y;
        if (xpos < 0 || 192 < xpos || ypos < 0 || 144 < ypos) {
            log("(" + xpos + ", " + ypos + ") are not valid starting coordinates");
        }
    } else {
        log("The field description does not correctly define starting coordinates");
    }

    if (objects.startPosition.dir !== undefined) {
        if (objects.startPosition.dir == "up") {
            direction = 90;
        } else if (objects.startPosition.dir == "down") {
            direction = 270;
        } else if (objects.startPosition.dir == "right") {
            direction = 180;
        } else if (objects.startPosition.dir == "left") {
            direction = 0;
        } else {
            log('"' + objects.startPosition.dir + '" is not a valid starting direction');
        }
    } else {
        log("The field description does not correctly define a starting direction");
    }
}

/**
 * Retrieve all objects from code and send to the Worker thread.
 */
function uploadObjects(){

    try {
        newObjCode = cmObjects.getValue();

        let objects = processObjectsCode(newObjCode);

        setRobotStartingPosition(objects);

        // Canvas not automatically cleared if simulation is idle
        if (mode === "idle") {
            clearCanvas();
        }

        // Send the new objects to the worker
        // This also redraws the field
        worker.postMessage({objects:objects});

        // Robot not automatically drawn if simulation is idle
        if (mode === "idle") {
            // Redraw robot
            let robot = {
                X: xpos,
                Y: ypos,
                dir: direction,
                robotType: robotType
            };
            drawRobot(robot);
        }
        log("Field upload successful");

        if (mode === "auto") {
            log("Autonomous simulation active: Field will update when next simulation starts")
        }

        // Update global variable
        objectsCode = newObjCode;
        // Store in browser local storage for future visits
        localStorage.setItem("objectsCode", newObjCode);
    } catch(err) {
        log(err.toString());
    }

}

/**
 * Initial upload of objects upon page load.
 */
function uploadObjectsOnce() {
    if (objectsCode !== null) {
        try {
            let objects = processObjectsCode(objectsCode);
            setRobotStartingPosition(objects);
            worker.postMessage({objects:objects});
        } catch(err) {
            log(err.toString());
        }
    } else {
        setTimeout(uploadObjectsOnce, 100);
    }
}

/**
 * Updates the field canvas by drawing the objects and robots at updated positions.
 * @param {Map} robot - a map corresponding to a Robot at a new desired position
 * @param {Map} objects - a map containing different object types for the field
 */
function update(robot, objects) {
    clearCanvas();

    drawObjs(objects.quarries, "quarry")
    drawObjs(objects.tapeLines, "tapeLine");
    drawObjs(objects.obstacles, "obstacle");
    drawObjs(objects.ramps, "ramp");
    drawObjs(objects.campsites, "campsite");

    drawRobot(robot);
}

/**
 * Updates sensor display values.
 * @param {Map} sensorValues - a map containing new values for Left, Center, and Right sensors
 */
function updateSensors(sensorValues) {
    document.getElementById("left-sensor").innerText = "Left: " + sensorValues.leftSensor.toFixed(3);
    document.getElementById("center-sensor").innerText = "Center: " + sensorValues.centerSensor.toFixed(3);
    document.getElementById("right-sensor").innerText = "Right: " + sensorValues.rightSensor.toFixed(3);
}

/**
 * Updates switch display values.
 * @param {Map} switchValues - a map containing new values for Front and Back switches
 */
function updateSwitches(switchValues) {
    let booleans = {true: "True", false: "False"}
    document.getElementById("front-switch").innerText = "Front: " + booleans[switchValues.frontSwitch];
    document.getElementById("back-switch").innerText = "Back: " + booleans[switchValues.backSwitch];
}

/**
 * Start the Robot/Worker thread for teleop or autonomous mode
 * @param {Boolean} auto - indicator for autonomous mode
 */
function start(auto=false) {
    if (mode !== "idle") {
        return; // Return if robot thread already started
    } else {
        clearInterval(timer);
        if (codeUploaded) {
            // Send the list of objects
            try {
                let objects = processObjectsCode(objectsCode);
                worker.postMessage({objects:objects});
            } catch(err) {
                log(err.toString());
            }

            // Collect info needed to start simulation
            let messageMode;
            // Collect the robot start position and direction
            let robotInfo = {
                robotType: robotType,
                xpos: xpos,
                ypos: ypos,
                dir: direction
            }
            // Start the simulation
            if (auto === false) { //TODO: do if (auto) instead
                $("#teleop-btn").removeClass("btn-outline-primary").addClass("btn-primary");
                if (darkToggle) {
                  document.getElementById("teleop-btn").style.backgroundColor = "#404040";
                }
                messageMode = "teleop";
            } else if (auto === true) {
                $("#autonomous-btn").removeClass("btn-outline-primary").addClass("btn-primary");
                if (darkToggle) {
                    document.getElementById("autonomous-btn").style.backgroundColor = "#404040";
                }
                messageMode = "auto";
            }
            worker.postMessage({
                start:true,
                mode:messageMode,
                robotInfo:robotInfo
            })
            document.getElementById("stop-btn").disabled = false;
            document.getElementById("teleop-btn").disabled = true;
            document.getElementById("autonomous-btn").disabled = true;
        } else {
            if (auto === false) {
                $("#teleop-btn").button('toggle');
            } else if (auto === true) {
                $("#autonomous-btn").button('toggle');
            }
            log("Please upload code first");
        }
    }
};

/**
 * Runs the Autonomous Timer during Autonomous Mode simulation.
 * Set at 30s, the duration of Autonomous Mode.
 */
function runAutoTimer() {
    //TODO: custom autonomous mode timer?
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
            stop()
            document.getElementById("timer").innerText = "Autonomous Mode has finished.";
        }
    }, 1000);
}

/**
 * Terminates the current Robot/Worker thread and creates a new one.
 */
function stop() {
    log("Simulation stopped. Reloading resources...");
    worker.terminate();
    worker = new Worker("static/js/worker/robot.js?t=" + cacheKey);
    worker.onmessage = onmessage;
    worker.postMessage({cacheKey: cacheKey});
    worker.postMessage({code: code});
    worker.postMessage({numThreads: numThreads});
    mode = "idle";
    clearInterval(timer);
    resetSimButtons()
};

/**
 * Resets Simulation buttons (UI) when a simulation ends (either naturally or by force).
 */
function resetSimButtons() {
    document.getElementById("stop-btn").disabled = true;
    document.getElementById("teleop-btn").disabled = false;
    document.getElementById("autonomous-btn").disabled = false;
    if (darkToggle) {
        document.getElementById("autonomous-btn").style.backgroundColor = "#757575";
        document.getElementById("teleop-btn").style.backgroundColor = "#757575";
    }
    if (document.getElementById("teleop-btn").classList.contains("btn-primary")) {
        $("#teleop-btn").removeClass("btn-primary").addClass("btn-outline-primary")
    }
    if (document.getElementById("autonomous-btn").classList.contains("btn-primary")) {
        $("#autonomous-btn").removeClass("btn-primary").addClass("btn-outline-primary")
    }
}

/**
 * Clears the Console.
 */
function clearConsole(){
    document.getElementById("console").innerText = ""
}

/**
 * Logs and displays the given text in the Console.
 * @param {String} text - the message to be displayed
 */
function log(text) {
    // Just return if not convertible to string
    try {
        text = String(text);
    } catch (err) {
        return
    }

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
    if (text.includes("Python exception:") || text.includes("SyntaxError:")) {
        pythonError = true;
    }
    if (pythonError) {
        consoleLog.innerHTML += '<span style= "color: red;">' + time + text + "</span>" + "<br>";
        if (text.includes("Error:"))  {
            pythonError = false;
        }
    } else if (text.includes("ERROR:")) {
        consoleLog.innerHTML += '<span style= "color: red;">' + time + text + "</span>" + "<br>";
    } else {
        consoleLog.innerHTML += time + text + "<br>";
    }
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

// Set connection between Main thread and Worker thread
worker.onmessage = onmessage;

// Add keyboard event listeners to document
document.addEventListener('keydown', down);
document.addEventListener('keyup', up);

// Handle Initial Page Load
uploadObjectsOnce();
drawRobot({
    X: xpos,
    Y: ypos,
    dir: direction,
    robotType: robotType
});
clearConsole()
