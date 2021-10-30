/***********************************************************************
 * The Worker Thread.
 * 
 * Handles Robot calculations and interactions. 
 * 
 * Interacts with the Main Thread, base.js, to run the Simulator.
 **********************************************************************/

/**
 * Rebinds Console functions for custom logging.
 */
var console=(function(oldCons){
    return {
        log: function(text){
            oldCons.log(text);
            postMessage({
                log: text
            })
        },
        info: function (text) {
            oldCons.info(text);
        },
        warn: function (text) {
            oldCons.warn(text);
        },
        error: function (text) {
            oldCons.error(text);
        }
    };
}(console));

// Query string used when creating the worker, including the & separator
var queryString = location.search;

// Import Scripts from other JS files
importScripts("https://cdn.jsdelivr.net/pyodide/v0.16.1/full/pyodide.js");
importScripts("./GamepadClass.js" + queryString);
importScripts("./Sensor.js" + queryString);
importScripts("./FieldObj.js" + queryString);
importScripts("./keyboard.js" + queryString);

// Create a pool of subworkers
const maxThreads = 3;
const subworkers = [];
const subworkerRunning = [];
for (let i = 0; i < maxThreads; i++) {
    let newSubworker = new Worker("../subworker/run_thread.js" + queryString);
    newSubworker.subworkerIdx = i;
    newSubworker.onmessage = function (e) {
        // Handle run thread function calls
        if (e.data.objClass !== undefined && e.data.fnName !== undefined) {
            simulator.runSubworkerFn(e.data.objClass, e.data.fnName, e.data.args, e.data.sab);
        }
        if (e.data.done === true) {
            // Maybe not useful because if they run out of threads they can't really wait for one to free up
            subworkerRunning[this.subworkerIdx] == false; // TODO: Check if this sets the right index back to false
        }
        if (e.data.log !== undefined) {
            console.log(e.data.log);
        }
    }
    subworkers.push(newSubworker);
    subworkerRunning.push(false);
}

// Following two vars must be declared before pyodide loads for pyodide to import them
// Code uploaded to the simulator
var code = "";
// The local environment
var env = {};

languagePluginLoader.then(() => function () {});

// Screen Dimensions
const SCREENHEIGHT = 48;
const SCREENWIDTH = 48;

/**
 * MODEL for the simulator, a Robot.
 * Stores robot data and handles position calculations and Runtime API calls.
 */
class RobotClass {
    tickRate = 50;              // in ms
    width = 26.7;               // width of robot, inches
    height = 20;                // height or robot, inches
    wheelWidth = 20;            // wheelbase width, inches
    wRadius = 2;                // radius of a wheel, inches
    MaxX = 144;                 // maximum X value, inches, field is 12'x12'
    MaxY = 144;                 // maximum Y value, inches, field is 12'x12'
    neg = -1;                   // negate left motor calculation
    startXDefault = 70.0;
    startYDefault = 70.0;
    topL = Array(2);
    topR = Array(2);
    botL = Array(2);
    botR = Array(2);
    leeway = 1;

    constructor(simulator, robotInfo) {
        this.Wl = 0.0;            // requested angular velocity of l wheel, radians/s
        this.Wr = 0.0;            // requested angular velocity of r wheel, radians/s
        this.ltheta = 0.0;        // angular position of l wheel, degrees
        this.rtheta = 0.0;        // angular position of r wheel, degrees
        this.dir = robotInfo.dir; // direction of the robot facing, degrees
        this.currentLv = 0;       // current velocity of left wheel, in inches/s, in [-maxVel, maxVel]
        this.currentRv = 0;       // current velocity of right wheel, in inches/s, in [-maxVel, maxVel]
        this.requestedLv = 0;     // requested velocity of left wheel, in [-1, 1], uninverted, where 1 corresponds to maxVel
        this.requestedRv = 0;     // requested velocity of right wheel, in [-1, 1], uninverted, where 1 corresponds to maxVel
        this.invertL = false;     // whether the left motor is inverted (false=default, true=inverted)
        this.invertR = false;     // whether the right motor is inverted (false=default, true=inverted)

        // Set robot attributes based on type
        // Note: width and height values are replicated in base.js.
        // Update both files if robot size changes.
        this.robotType = robotInfo.robotType;
        const validTypes = ["light", "medium", "heavy"];
        if (!validTypes.includes(this.robotType)) {
            this.robotType = "medium"; // robot type is medium by default
        }
        let robotTypeNum;
        if (this.robotType === "light") {
            robotTypeNum = 3;
            this.width = 14.18;      // Robot width, inches
            this.height = 12.5;      // Robot height, inches
            this.wheelWidth = 9.06;  // Wheelbase width, inches
        }
        else if (this.robotType === "medium") {
            robotTypeNum = 4;
            this.width = 19.3;
            this.height = 14;
            this.wheelWidth = 12.39;
        }
        else if (this.robotType === "heavy") {
            robotTypeNum = 5;
            this.width = 10.7;
            this.height = 14.06;
            this.wheelWidth = 8.98;
        }

        // Max speed is 0.628 m/s = 24.72 in/s and max acceleration is 0.55 m/s^2 = 21.65 in/s^2
        // Refresh rate is 0.05/s
        // Max speed is 1.236 in/tick and max acceleration is 0.05413 in/tick^2
        this.accel = (8 - robotTypeNum) / 5 * 0.05413; // Larger robots accelerate more slowly
        this.maxVel = robotTypeNum / 5 * 1.236;        // Larger robots have a higher top speed

        // Set robot position
        this.X = this.getValidXPosition(robotInfo.xpos, robotInfo.dir); // current X position of the center of the robot
        this.Y = this.getValidYPosition(robotInfo.ypos, robotInfo.dir); // current Y position of the center of the robot

        // Set robot corner positions (relative to the robot facing up)
        // top right
        this.topR[0] = this.X - this.height/2;
        this.topR[1] = this.Y - this.width/2;
        // top left
        this.topL[0] = this.X - this.height/2;
        this.topL[1] = this.Y + this.width/2;
        // bottom right
        this.botR[0] = this.X + this.height/2;
        this.botR[1] = this.Y - this.width/2;
        // bottom left
        this.botL[0] = this.X + this.height/2;
        this.botL[1] = this.Y + this.width/2;

        // All asychronous functions currently running
        this.runningCoroutines = new Set();

        // Ensure we don't hit sync errors when updating our values
        this.simulator = simulator;
        this.lineFollower = new LineFollower(this);
        this.limitSwitch = new LimitSwitch(this);
        this.attachedObj = null;
    }

    /**
     * Checks if the Robot is on a ramp
     * @returns the Ramp the Robot is on, if it is on one
     */
    checkRamp() {
        let cornersX = [this.topL[0], this.topR[0], this.botR[0], this.botL[0]];
        let cornersY = [this.topL[1], this.topR[1], this.botR[1], this.botL[1]];
        for (let i = 0; i < this.simulator.ramps.length; i++) {
            for (let r = 0; r < cornersX.length; r++) {
                if (cornersX[r] < this.simulator.ramps[i].topR[0] && cornersX[r] > this.simulator.ramps[i].topL[0]) {
                    if (cornersY[r] > this.simulator.ramps[i].topL[1] && cornersY[r] < this.simulator.ramps[i].botL[1]) {
                        return this.simulator.ramps[i]
                    }
                }
            }
        }
        return null;
    }

   /**
    * Validate the desired starting x-coordinate position
    * @param {Number} pos - x-coordinate to set position to
    * @param {Number} dir - the direction the Robot is facing
    * @returns the position of the starting x-coordinate
    */
    getValidXPosition(pos, dir) {
        // Check is pos is a number or not
        let posNum = Number(pos);
        if (isNaN(posNum)) {
            return this.startXDefault;
        }
        // Bound the coordinate
        if (dir == 0 || dir == 180) {
          posNum = Math.max(posNum, this.height/2 + 3);
          posNum = Math.min(posNum, this.MaxX - this.height/2 - 3);
        } else {
          posNum = Math.max(posNum, this.width/2 + 3);
          posNum = Math.min(posNum, this.MaxX - this.width/2 - 3);
        }
        return posNum
    }

    /**
     * Validate the desired starting y-coordinate position
     * @param {Number} pos - y-coordinate to set position to
     * @param {Number} dir - the direction the Robot is facing
     * @returns the position of the starting y-coordinate
     */
    getValidYPosition(pos, dir) {
        // Check is pos is a number or not
        let posNum = Number(pos);
        if (isNaN(posNum)) {
            return this.startYDefault;
        }
        // Bound the coordinate
        if (dir == 90 || dir == 270) {
          posNum = Math.max(posNum, this.height/2 + 3);
          posNum = Math.min(posNum, this.MaxY - this.height/2 - 3);
        } else {
          posNum = Math.max(posNum, this.width/2 + 3);
          posNum = Math.min(posNum, this.MaxY - this.width/2 - 3);
        }
        return posNum
    }

    /**
     * Tests whether the Robot is intersecting the given object using the normals
     * of the robot as reference axes
     * @param {Map} obj - a map corresponding to the corners of an object
     * @param {Map} corners - a map of the Robot's corners
     * @returns a boolean corresponding to whether the object and the robot
     * intersect via both normals
     */
    intersectRobotRef(obj, corners) {
        // coordinates of the k_i vectors
        let k1x = obj.botL[0] - corners.botL[0]; // x of the vector from botL of robot to botL of obstacle
        let k1y = obj.botL[1] - corners.botL[1];
        let k2x = obj.topL[0] - corners.botL[0];
        let k2y = obj.topL[1] - corners.botL[1];
        let k3x = obj.topR[0] - corners.botL[0];
        let k3y = obj.topR[1] - corners.botL[1];
        let k4x = obj.botR[0] - corners.botL[0];
        let k4y = obj.botR[1] - corners.botL[1];

        // vector from botL to botR of robot
        let ref1x = corners.botR[0] - corners.botL[0];
        let ref1y = corners.botR[1] - corners.botL[1];

        // vector from botL to topL of robot
        let ref2x = corners.topL[0] - corners.botL[0];
        let ref2y = corners.topL[1] - corners.botL[1];

        // make the ref1 vector into a unit vector
        let ref1mag = Math.sqrt(ref1x * ref1x + ref1y * ref1y);
        ref1x = ref1x / ref1mag;
        ref1y = ref1y / ref1mag;

        // make the ref2 vector into a unit vector
        let ref2mag = Math.sqrt(ref2x * ref2x + ref2y * ref2y);
        ref2x = ref2x / ref2mag;
        ref2y = ref2y / ref2mag;

        let k1ref1ProjLen = k1x * ref1x + k1y * ref1y;
        let k2ref1ProjLen = k2x * ref1x + k2y * ref1y;
        let k3ref1ProjLen = k3x * ref1x + k3y * ref1y;
        let k4ref1ProjLen = k4x * ref1x + k4y * ref1y;

        let ref1inter = true;

        if (this.findMax(k1ref1ProjLen, k2ref1ProjLen, k3ref1ProjLen, k4ref1ProjLen) >= ref1mag) {
            if (this.findMin(k1ref1ProjLen, k2ref1ProjLen, k3ref1ProjLen, k4ref1ProjLen) >= ref1mag) {
                ref1inter = false;
            }
        } else if (this.findMax(k1ref1ProjLen, k2ref1ProjLen, k3ref1ProjLen, k4ref1ProjLen) <= 0) {
            if (this.findMin(k1ref1ProjLen, k2ref1ProjLen, k3ref1ProjLen, k4ref1ProjLen) <= 0) {
                ref1inter = false;
            }
        }

        let k1ref2ProjLen = k1x * ref2x + k1y * ref2y;
        let k2ref2ProjLen = k2x * ref2x + k2y * ref2y;
        let k3ref2ProjLen = k3x * ref2x + k3y * ref2y;
        let k4ref2ProjLen = k4x * ref2x + k4y * ref2y;

        let ref2inter = true;

        if (this.findMax(k1ref2ProjLen, k2ref2ProjLen, k3ref2ProjLen, k4ref2ProjLen) >= ref2mag) {
            if (this.findMin(k1ref2ProjLen, k2ref2ProjLen, k3ref2ProjLen, k4ref2ProjLen) >= ref2mag) {
                ref2inter = false;
            }
        } else if (this.findMax(k1ref2ProjLen, k2ref2ProjLen, k3ref2ProjLen, k4ref2ProjLen) <= 0) {
            if (this.findMin(k1ref2ProjLen, k2ref2ProjLen, k3ref2ProjLen, k4ref2ProjLen) <= 0) {
                ref2inter = false;
            }
        }

        return ref1inter && ref2inter;
    }

    /**
     * Tests whether the Robot is intersecting the given object using the normals
     * of the object as reference axes
     * @param {Map} obj - a map corresponding to the corners of an object
     * @param {Map} corners - a map of the Robot's corners
     * @returns a boolean corresponding to whether the object and the robot
     * intersect via both normals
     */
    intersectObjRef(obj, corners) {
        // coordinates of the k_i vectors
        let k1x = corners.botL[0] - obj.botL[0]; //x of the vector from botL of obj to botL of robot
        let k1y = corners.botL[1] - obj.botL[1];
        let k2x = corners.topL[0] - obj.botL[0];
        let k2y = corners.topL[1] - obj.botL[1];
        let k3x = corners.topR[0] - obj.botL[0];
        let k3y = corners.topR[1] - obj.botL[1];
        let k4x = corners.botR[0] - obj.botL[0];
        let k4y = corners.botR[1] - obj.botL[1];

        // vector from botL to botR of obj
        let ref1x = obj.botR[0] - obj.botL[0];
        let ref1y = obj.botR[1] - obj.botL[1];

        // vector from botL to topL of obj
        let ref2x = obj.topL[0] - obj.botL[0];
        let ref2y = obj.topL[1] - obj.botL[1];

        // make the ref1 vector into a unit vector
        let ref1mag = Math.sqrt(ref1x * ref1x + ref1y * ref1y);
        ref1x = ref1x / ref1mag;
        ref1y = ref1y / ref1mag;

        // make the ref2 vector into a unit vector
        let ref2mag = Math.sqrt(ref2x * ref2x + ref2y * ref2y);
        ref2x = ref2x / ref2mag;
        ref2y = ref2y / ref2mag;

        let k1ref1ProjLen = k1x * ref1x + k1y * ref1y;
        let k2ref1ProjLen = k2x * ref1x + k2y * ref1y;
        let k3ref1ProjLen = k3x * ref1x + k3y * ref1y;
        let k4ref1ProjLen = k4x * ref1x + k4y * ref1y;

        let ref1inter = true;

        if (this.findMax(k1ref1ProjLen, k2ref1ProjLen, k3ref1ProjLen, k4ref1ProjLen) > ref1mag) {
            if (this.findMin(k1ref1ProjLen, k2ref1ProjLen, k3ref1ProjLen, k4ref1ProjLen) > ref1mag) {
                ref1inter = false;
            }
        } else if (this.findMax(k1ref1ProjLen, k2ref1ProjLen, k3ref1ProjLen, k4ref1ProjLen) < 0) {
            if (this.findMin(k1ref1ProjLen, k2ref1ProjLen, k3ref1ProjLen, k4ref1ProjLen) < 0) {
                ref1inter = false;
            }
        }

        let k1ref2ProjLen = k1x * ref2x + k1y * ref2y;
        let k2ref2ProjLen = k2x * ref2x + k2y * ref2y;
        let k3ref2ProjLen = k3x * ref2x + k3y * ref2y;
        let k4ref2ProjLen = k4x * ref2x + k4y * ref2y;

        let ref2inter = true;

        if (this.findMax(k1ref2ProjLen, k2ref2ProjLen, k3ref2ProjLen, k4ref2ProjLen) > ref2mag) {
            if (this.findMin(k1ref2ProjLen, k2ref2ProjLen, k3ref2ProjLen, k4ref2ProjLen) > ref2mag) {
                return false;
            }
        } else if (this.findMax(k1ref2ProjLen, k2ref2ProjLen, k3ref2ProjLen, k4ref2ProjLen) < 0) {
            if (this.findMin(k1ref2ProjLen, k2ref2ProjLen, k3ref2ProjLen, k4ref2ProjLen) < 0) {
                return false;
            }
        }

        return ref1inter && ref2inter;
    }

    /**
     * Tests whether the Robot is intersecting the given object
     * @param {Map} obj - a map corresponding to the corners of an object
     * @param {Map} corners - a map of the Robot's corners
     * @returns a boolean corresponding to whether the object and the robot
     * intersect via all four normals
     */
    intersectOne(obj, corners) {
        /* Returns true if object and robot intersect,
        this means that their projections intersect via all
        4 normals */

        return this.intersectRobotRef(obj, corners) && this.intersectObjRef(obj, corners);
    }

    // Maximum of 4 inputs
    findMax(k1, k2, k3, k4) {
        let max = k1;
        if (k2 > max) {
            max = k2;
        }
        if (k3 > max) {
            max = k3;
        }
        if (k4 > max) {
            max = k4;
        }
        return max;
    }

    // Minimum of 4 inputs
    findMin(k1, k2, k3, k4) {
        let min = k1;
        if (k2 < min) {
            min = k2;
        }
        if (k3 < min) {
            min = k3;
        }
        if (k4 < min) {
            min = k4;
        }
        return min;
    }

    /**
     * Updates position of the Robot using differential drive equations.
     * Derived with reference to:
     * https://chess.eecs.berkeley.edu/eecs149/documentation/differentialDrive.pdf
     */
    updatePosition() {
        let radian = Math.PI*this.dir/180;
        let dx;
        let dy;
        let dir = this.dir;

        //TODO: Test with Gamepad. Compare with real tested values if possible

        //TODO: make 3 robot profiles. Edit onmessage to change maxVel and acceleration
        //whenever message is received.

        //TODO: handling, edit the Lv and Rv such that difference is low

        // Calculate the requested velocities scaled to max velocity, including possible motor inversion
        let requestedLv = this.invertL ? -this.requestedLv : this.requestedLv;
        requestedLv = requestedLv * this.maxVel;
        let requestedRv = this.invertR ? -this.requestedRv : this.requestedRv;
        requestedRv = requestedRv * this.maxVel * this.neg;

        // Compare the current speed of each motor to the requested speed, and accelerate in the correct direction
        if (requestedLv > this.currentLv) {
            this.currentLv = Math.min(this.currentLv + this.accel, requestedLv);
        }
        if (requestedLv < this.currentLv) {
            this.currentLv = Math.max(this.currentLv - this.accel, requestedLv);
        }
        if (requestedRv > this.currentRv) {
            this.currentRv = Math.min(this.currentRv + this.accel, requestedRv);
        }
        if (requestedRv < this.currentRv) {
            this.currentRv = Math.max(this.currentRv - this.accel, requestedRv);
        }

        // Compute change in position and direction
        if (this.currentLv == this.currentRv) { // Both motors going in the same direction
            let distance = this.currentRv;
            dx = distance * Math.cos(radian);
            dy = distance * Math.sin(radian);
        }
        else { // Motors going in different directions
            let rt = this.wheelWidth/2 * (this.currentLv+this.currentRv)/(this.currentRv-this.currentLv);
            let wt = (this.currentRv-this.currentLv)/this.wheelWidth;
            let theta = wt;
            let i = rt * (1 - Math.cos(theta));
            let j = Math.sin(theta) * rt;
            dx = i * Math.sin(radian) + j * Math.cos(radian);
            dy = i * Math.cos(radian) + j * Math.sin(radian);
            dir = (this.dir + theta*180/Math.PI) % 360;
        }

        // Apply effect of ramp
        let onRamp = this.checkRamp();
        let offsetConst = 0.015;
        if (onRamp != null) {
            if (onRamp.highSide == "up") {
                dy = dy + onRamp.incline * offsetConst;
            } else if (onRamp.highSide == "down") {
                dy = dy - onRamp.incline * offsetConst;
            } else if (onRamp.highSide == "right") {
                dx = dx - onRamp.incline * offsetConst;
            } else if (onRamp.highSide == "left") {
                dx = dx + onRamp.incline * offsetConst;
            }
        }

        // Temporarily define new robot positional values
        const X = Math.max(Math.min(this.X + dx, this.MaxX), 0);
        const Y = Math.max(Math.min(this.Y + dy, this.MaxY), 0);
        const ltheta = (this.Wl * 5 + this.ltheta) % 360;
        const rtheta = (this.Wr * 5 + this.rtheta) % 360;
        const corners = this.updateCorners(X, Y, dir);

        //Check if the given move results in a collision with any field objects
        let inter = false;
        for (let i=0; i < simulator.obstacles.length; i++) {
            inter = this.intersectOne(simulator.obstacles[i], corners);
            if ((simulator.obstacles[i] instanceof InteractableObj && simulator.obstacles[i].isAttached())) {
                inter = false;
            }
            if (inter) {
                break;
            }
        }

        const objCorners = this.updateInteractableObjs(this.attachedObj, corners, dir);

        if (this.attachedObj && !inter) {
            for (let i=0; i < simulator.obstacles.length; i++) {
                if (simulator.obstacles[i] !== this.attachedObj) {
                    inter = this.intersectOne(simulator.obstacles[i], objCorners);
                }
                if (simulator.obstacles[i] instanceof InteractableObj) {
                  inter = false;
                }
                if (inter) {
                    break;
                }
            }
        }

        // If no collision, update robot and attached object positional attributes
        if (!inter) {
            this.X = X;
            this.Y = Y;
            this.ltheta = ltheta;
            this.rtheta = rtheta;
            this.dir = dir;
            this.botL = corners.botL;
            this.botR = corners.botR;
            this.topL = corners.topL;
            this.topR = corners.topR;
            if (this.attachedObj) {
                this.setAttachedObj(objCorners);
            }
        }

        // Send position and sensor readings to main thread
        let newState = {
            X: this.X,
            Y: this.Y,
            dir: this.dir,
            robotType: this.robotType
        };

        this.lineFollower.update();
        this.limitSwitch.update();
        let sensorValues = {
            leftSensor: this.lineFollower.left,
            centerSensor: this.lineFollower.center,
            rightSensor: this.lineFollower.right
        };
        let switchValues = {
            frontSwitch: this.limitSwitch.switch0,
            backSwitch: this.limitSwitch.switch1
        };

        let objects = {
            tapeLines: this.simulator.tapeLines,
            obstacles: this.simulator.obstacles,
            ramps: this.simulator.ramps
        }

        postMessage({
            robot: newState,
            sensors: sensorValues,
            switches: switchValues,
            objects: objects
        })
    }

    /**
     * Gets the new coordinates of the interacting object according to the current
     * state of the robot.
     * @param {FieldObj} obstacle - an interactable object
     * @param {Robot} robot - the robot
     * @param {Number} dir - direction of the robot
     * @returns a map containing the updated corners of the interactable object
     */
    updateInteractableObjs(obstacle, robot, dir) {
        let dict = {topR: Array(2), topL: Array(2), botL: Array(2), botR: Array(2)};

        if (obstacle) {
            let b = (this.width - obstacle.w) / 2;
            dict.botL[0] = robot.topL[0] + b * Math.cos((90.0 - dir) * Math.PI / 180);
            dict.botL[1] = robot.topL[1] - b * Math.sin((90.0 - dir) * Math.PI / 180);
            dict.topL[0] = dict.botL[0] - obstacle.h * Math.cos(dir * Math.PI / 180);
            dict.topL[1] = dict.botL[1] - obstacle.h * Math.sin(dir * Math.PI / 180);

            dict.topR[0] = dict.topL[0] + obstacle.w * Math.sin(dir * Math.PI / 180);
            dict.topR[1] = dict.topL[1] - obstacle.w * Math.cos(dir * Math.PI / 180);
            dict.botR[0] = dict.botL[0] + obstacle.w * Math.sin(dir * Math.PI / 180);
            dict.botR[1] = dict.botL[1] - obstacle.w * Math.cos(dir * Math.PI / 180);
            //obstacle.setDirection(this.dir);
        }

        return dict;
    }

    /**
     * Sets the position and direction of the object attached to the robot.
     * @param {Map} newCorners - a map containing the new corners for the object
     *                              attached to the robot
     */
    setAttachedObj(newCorners) {
        this.attachedObj.botL[0] = newCorners.botL[0];
        this.attachedObj.botL[1] = newCorners.botL[1];
        this.attachedObj.topL[0] = newCorners.topL[0];
        this.attachedObj.topL[1] = newCorners.topL[1];

        this.attachedObj.topR[0] = newCorners.topR[0];
        this.attachedObj.topR[1] = newCorners.topR[1];
        this.attachedObj.botR[0] = newCorners.botR[0];
        this.attachedObj.botR[1] = newCorners.botR[1];

        this.attachedObj.x = this.attachedObj.topL[0];
        this.attachedObj.y = this.attachedObj.topL[1];
        this.attachedObj.setDirection(this.dir);
    }

    /**
     * Gets the new corners for the robot according to given coordinates.
     * Does not check if new position is valid (must check after)
     * @param {Number} newX - the projected new x-coordinate
     * @param {Number} newY - the projected new y-coordinate
     * @param {Number} dir - the direction of the robot
     * @returns a map of the prospective corners of the robot
     */
    updateCorners(newX, newY, dir) {
        let dDir = dir * Math.PI / 180;
        let sin = Math.sin(dDir);
        let cos = Math.cos(dDir);

        let dict = {topR: Array(2), topL: Array(2), botL: Array(2), botR: Array(2)};
        // top right
        dict.topR[0] = newX - (this.height/2) * cos + (this.width/2) * sin;
        dict.topR[1] = newY - (this.height/2) * sin - (this.width/2) * cos;
        // top left
        dict.topL[0] = newX - (this.height/2) * cos - (this.width/2) * sin;
        dict.topL[1] = newY - (this.height/2) * sin + (this.width/2) * cos;
        // bottom left
        dict.botL[0] = newX + (this.height/2) * cos - (this.width/2) * sin
        dict.botL[1] = newY + (this.height/2) * sin + (this.width/2) * cos;
        // bottom right
        dict.botR[0] = newX + (this.height/2) * cos + (this.width/2) * sin;
        dict.botR[1] = newY + (this.height/2) * sin - (this.width/2) * cos;

        return dict;
    }

    /**
     * Picks up a nearby object if possible.
     * Not an official Robot API function.
     */
    pick_up() {
        if (this.attachedObj) {
            return
        }
        let obstacle = this.findInteractableObj();
        if (obstacle) {
            // Attach the object
            this.attachedObj = obstacle;
            obstacle.attach();
            obstacle.setDirection(this.dir);

        }
    }

    /**
     * Drops an attached object.
     * Not an official Robot API function.
     */
    drop() {
        if (this.attachedObj) {
            this.attachedObj.release();
            this.attachedObj = null;
        }
    }

    /**
     * Finds an interactable object near enough to interact with.
     * @returns an interactable object to pick up if close enough
     */
    findInteractableObj() {
        if (this.simulator.interactableObjs.length == 0) {
            return null;
        }

        const width = 5;
        const height = 5;
        const b = (this.width - width) / 2;
        let collidableRegion = {topR: Array(2), topL: Array(2), botL: Array(2), botR: Array(2)};
        collidableRegion.botL[0] = this.topL[0] + b * Math.cos((90.0 - this.dir) * Math.PI / 180);
        collidableRegion.botL[1] = this.topL[1] - b * Math.sin((90.0 - this.dir) * Math.PI / 180);
        collidableRegion.topL[0] = collidableRegion.botL[0] - height * Math.cos(this.dir * Math.PI / 180);
        collidableRegion.topL[1] = collidableRegion.botL[1] - height * Math.sin(this.dir * Math.PI / 180);
        collidableRegion.topR[0] = collidableRegion.topL[0] + width * Math.sin(this.dir * Math.PI / 180);
        collidableRegion.topR[1] = collidableRegion.topL[1] - width * Math.cos(this.dir * Math.PI / 180);
        collidableRegion.botR[0] = collidableRegion.botL[0] + width * Math.sin(this.dir * Math.PI / 180);
        collidableRegion.botR[1] = collidableRegion.botL[1] - width * Math.cos(this.dir * Math.PI / 180);

        for (let obstacle of this.simulator.interactableObjs) {
            let inter = this.intersectOne(obstacle, collidableRegion);
            if (inter) {
              return obstacle;
            }
        }
        return null;
    }

    /**
     * Sets a value on a device.
     * A Runtime API method.
     * @param {String} device - the device ID
     * @param {String} param - the parameter on the device
     * @param {Float} value - the value to set, bounded by [-1, 1]
     */
    set_value(device, param, value) {
        if (typeof(param) !== "string") {
            console.log("ERROR: get_value() parameter must be a string")
            return
        }
        if (param.includes("velocity") && value > 1.0 || value < -1.0){
            console.log("ERROR: Speed cannot be greater than 1.0 or less than -1.0.");
            return
        }
        if (param.includes("invert") && typeof(value) !== "boolean") {
            console.log('ERROR: "invert" functions take in a boolean value')
            return
        }
        if (device === "koala_bear") {
            if (param === "velocity_b") {
                this.requestedLv = value;
            } else if (param === "velocity_a") {
                this.requestedRv = value;
            } else if (param === "invert_b") {
                this.invertL = value;
            } else if (param === "invert_a") {
                this.invertR = value;
            } else if (param === "duty_cycle") {
                console.log('ERROR: Param name: "duty_cycle" no longer supported. See Robot API.');
            } else {
                console.log('ERROR: Param name: "' + param + '" invalid or not supported');
            }
        } else if (device === "left_motor" || device === "right_motor") {
            console.log('ERROR: "' + device + '" no longer supported. See Robot API.');
        } else {
            console.log("ERROR: Cannot find device name: " + device);
        }
    }

    /**
     * Gets a value from a device.
     * Supports reading line followers (left, right, center: [0,1]),
     * front and back limit switched, and KoalaBear velocity and invert.
     * @param {String} device - the device ID
     * @param {String} param - the parameter on the device
     * @returns the value specified by the device and parameter
     */
    get_value(device, param) {
        if (device === "limit_switch") {
            if (param === "switch0") {
                return this.limitSwitch.switch0;
            } else if (param === "switch1") {
                return this.limitSwitch.switch1;
            }
        }
        if (device === "line_follower") {
            if (param === "left"){
                return this.lineFollower.left;
            } else if (param === "center") {
                return this.lineFollower.center;
            } else if (param === "right") {
                return this.lineFollower.right;
            }
        }
        if (device === "koala_bear") {
            if (param === "velocity_b") {
                return this.requestedLv;
            } else if (param === "velocity_a") {
                return this.requestedRv;
            } else if (param === "invert_b") {
                return this.invertL;
            } else if (param === "invert_a") {
                return this.invertR;
            }
        }
        console.log("ERROR: Cannot find device name: " + device);
    }

    /**
     * Puts the robot to sleep for a specified amount of time.
     * @param {Number} duration - length of sleep in seconds.
     */
    sleep(duration) {
        console.log("ERROR: Main thread cannot sleep in simulator. Refer to robot API.");
    }

    /**
     * Print the state of the robot in the form: 'x = _, y = _, theta = _'
     */
    printState() {
        console.log(`x = ${this.X.toFixed(2)}, y = ${this.Y.toFixed(2)}, theta = ${this.dir.toFixed(2)}`);
    }

    /**
     * Runs a "coroutine" (a series of actions that proceed independently
     * of the main loop of code).
     * @param {Function} fn - the function to run
     */
    run(fn, ...args) {
        /*
        Starts a "coroutine", i.e. a series of actions that proceed
        independently of the main loop of code.
        */
        if (!(typeof fn === "function")) {
            throw new Error("First argument to Robot.run must be a function");
        }
        // Stringify function object from Pyodide, e.g. <function foo at 0x9b4d78>
        let pyodideFnString = String(fn);

        // Get function name from stringified function object
        let fnName = pyodideFnString.split("<function ")[1].split(" at")[0];

        /**
         * Current idea: pass full student code to worker, execute code, and
         * then execute the named function from Python. Performance seems like a problem
         * due to pyodide loading time for each worker (probably need pre-loaded worker pool).
         * 
         * Another problem: how do gets work if the main worker is sleeping (busy waiting)?
         * May need to stop supporting Robot.sleep() in the setup function
         */

        // Get first available worker and tell it to run function
        let workerIdx = subworkerRunning.findIndex(elem => elem == false);
        if (workerIdx == -1) {
            console.log("ERROR: Could not run function " + fnName + ", thread limit " + String(maxThreads));
        }
        let subworker = subworkers[workerIdx];
        subworkerRunning[workerIdx] = true;
        subworker.postMessage({fnName: fnName, args:args, code:code});
        
        // this.runningCoroutines.add(fn)
        // fn()
    }

    /**
     * Checks whether the given function is running.
     * @param {Function} fn - the function to check
     * @returns a boolean that tells whether fn is already running as a coroutine.
     */
    is_running(fn) {
        //TODO: Fully implement
        if (!(typeof fn === "function")) {
            throw new Error("First argument to Robot.is_running must be a function");
        }
        return this.runningCoroutines.has(fn)
    }
}

/*********************** KEYBOARD INPUT GAMEPAD FUNCTIONS ***********************/

/**
 * Event listener for a key press, that is, listening for when a key is being pressed.
 * @param {KeyCode} keyCode - the code of the key being pressed
 */
function onPress(keyCode) {
    simulator.keyboard.press(keyCode);

    if (keyCode === 87) {        // w
        simulator.gamepad.joystick_left_y = 1;
    } else if (keyCode === 65) { // a
        simulator.gamepad.joystick_left_x = -1;
    } else if (keyCode === 83) { // s
        simulator.gamepad.joystick_left_y = -1;
    } else if (keyCode === 68) { // d
        simulator.gamepad.joystick_left_x = 1;
    } else if (keyCode === 38) { // up
        simulator.gamepad.joystick_right_y = 1;
    } else if (keyCode === 40) { // down
        simulator.gamepad.joystick_right_y = -1;
    } else if (keyCode === 37) { // left
        simulator.gamepad.joystick_right_x = -1;
    } else if (keyCode === 39) { // right
        simulator.gamepad.joystick_right_x = 1;
    }
}

/**
 * Event listener for a key press, that is, listening for when a key is released.
 * @param {KeyCode} keyCode - the code of the key being released
 */
function onRelease(keyCode) {
    simulator.keyboard.release(keyCode);

    if (keyCode === 87) { // w
        simulator.gamepad.joystick_left_y = 0;
    } else if (keyCode === 65) { // a
        simulator.gamepad.joystick_left_x = 0;
    } else if (keyCode === 83) { // s
        simulator.gamepad.joystick_left_y = 0;
    } else if (keyCode === 68) { // d
        simulator.gamepad.joystick_left_x = 0;
    } else if (keyCode === 38) { // up
        simulator.gamepad.joystick_right_y = 0;
    } else if (keyCode === 40) { // down
        simulator.gamepad.joystick_right_y = 0;
    } else if (keyCode === 37) { // left
        simulator.gamepad.joystick_right_x = 0;
    } else if (keyCode === 39) { // right
        simulator.gamepad.joystick_right_x = 0;
    }
}

/*********************** GAMEPAD INPUT GAMEPAD FUNCTIONS ***********************/

/**
 * A mapping from the button names of the controller to the button names
 * in the PIE Robot API.
 */
const padMap = {
    button_0: "button_a",
    button_1: "button_b",
    button_2: "button_x",
    button_3: "button_y",
    button_4: "l_bumper",
    button_5: "r_bumper",
    button_6: "l_trigger",
    button_7: "r_trigger",
    button_8: "button_back",
    button_9: "button_start",
    button_10: "l_stick",
    button_11: "r_stick",
    button_12: "dpad_up",
    button_13: "dpad_down",
    button_14: "dpad_left",
    button_15: "dpad_right",
    axis_0: "LH",
    axis_1: "LV",
    axis_2: "RH",
    axis_3: "RV",
};

/**
 * Sets a button in the robot API to a pressed state i.e. true
 * @param {String} button - the name of the button being pressed
 */
function onPressGamepad(button) {
    if (padMap[button] === "button_a") {
        simulator.gamepad.button_a = true;
    } else if (padMap[button] === "button_b") {
        simulator.gamepad.button_b = true;
    } else if (padMap[button] === "button_x") {
        simulator.gamepad.button_x = true;
    } else if (padMap[button] === "button_y") {
        simulator.gamepad.button_y = true;
    } else if (padMap[button] === "l_bumper") {
        simulator.gamepad.l_bumper = true;
    } else if (padMap[button] === "r_bumper") {
        simulator.gamepad.r_bumper = true;
    } else if (padMap[button] === "l_trigger") {
        simulator.gamepad.l_trigger = true;
    } else if (padMap[button] === "r_trigger") {
        simulator.gamepad.r_trigger = true;
    } else if (padMap[button] === "button_back") {
        simulator.gamepad.button_back = true;
    } else if (padMap[button] === "button_start") {
        simulator.gamepad.button_start = true;
    } else if (padMap[button] === "l_stick") {
        simulator.gamepad.l_stick = true;
    } else if (padMap[button] === "r_stick") {
        simulator.gamepad.r_stick = true;
    } else if (padMap[button] === "dpad_up") {
        simulator.gamepad.dpad_up = true;
    } else if (padMap[button] === "dpad_down") {
        simulator.gamepad.dpad_down = true;
    } else if (padMap[button] === "dpad_left") {
        simulator.gamepad.dpad_left = true;
    } else if (padMap[button] === "dpad_right") {
        simulator.gamepad.dpad_right = true;
    }
}

/**
 * Sets a button in the robot API to a released state i.e. false
 * @param {String} button - the name of the button being released
 */
function onReleaseGamepad(button) {
    if (padMap[button] === "button_a") {
        simulator.gamepad.button_a = false;
    } else if (padMap[button] === "button_b") {
        simulator.gamepad.button_b = false;
    } else if (padMap[button] === "button_x") {
        simulator.gamepad.button_x = false;
    } else if (padMap[button] === "button_y") {
        simulator.gamepad.button_y = false;
    } else if (padMap[button] === "l_bumper") {
        simulator.gamepad.l_bumper = false;
    } else if (padMap[button] === "r_bumper") {
        simulator.gamepad.r_bumper = false;
    } else if (padMap[button] === "l_trigger") {
        simulator.gamepad.l_trigger = false;
    } else if (padMap[button] === "r_trigger") {
        simulator.gamepad.r_trigger = false;
    } else if (padMap[button] === "button_back") {
        simulator.gamepad.button_back = false;
    } else if (padMap[button] === "button_start") {
        simulator.gamepad.button_start = false;
    } else if (padMap[button] === "l_stick") {
        simulator.gamepad.l_stick = false;
    } else if (padMap[button] === "r_stick") {
        simulator.gamepad.r_stick = false;
    } else if (padMap[button] === "dpad_up") {
        simulator.gamepad.dpad_up = false;
    } else if (padMap[button] === "dpad_down") {
        simulator.gamepad.dpad_down = false;
    } else if (padMap[button] === "dpad_left") {
        simulator.gamepad.dpad_left = false;
    } else if (padMap[button] === "dpad_right") {
        simulator.gamepad.dpad_right = false;
    }
}

/**
 * Sets the value of the axis according to joystick movement.
 * @param {Integer} axis - the axis being moved. Can take on values {0, 1, 2, 3}
 * @param {Float} value - the new joystick value
 */
function moveGamepad(axis, value) {
    if (axis === 0) { // left joystick horizontal axis
        simulator.gamepad.joystick_left_x = value;
    } else if (axis === 1) { // left joystick vertical axis
        simulator.gamepad.joystick_left_y = value;
    } else if (axis === 2) { // right joystick horizontal axis
        simulator.gamepad.joystick_right_x = value;
    } else if (axis === 3) { // right joystick vertical axis
        simulator.gamepad.joystick_right_y = value;
    }
}

/**
 * Resets the value of the axis back to the center.
 * @param {Integer} axis - the axis being moved. Can take on values {0, 1, 2, 3}
 */
function stopGamepad(axis) {
    if (axis === 0) { // left joystick horizontal axis
        simulator.gamepad.joystick_left_x = 0;
    } else if (axis === 1) { // left joystick vertical axis
        simulator.gamepad.joystick_left_y = 0;
    } else if (axis === 2) { // right joystick horizontal axis
        simulator.gamepad.joystick_right_x = 0;
    } else if (axis === 3) { // right joystick vertical axis
        simulator.gamepad.joystick_right_y = 0;
    }
}

/*******************************************************************************
 * The Simulator Class.
 * 
 * Deals with the inputted code and runs the simulation.
 ******************************************************************************/
class Simulator{

    /**
     * Initializes a new Simulator
     */
    constructor() {
        this.robot = null;
        this.mode = "idle";
        this.gamepad = new GamepadClass();
        this.keyboard = new Keyboard();
        this.current = [];
        this.tapeLines = [];
        this.obstacles = [];
        this.interactableObjs = [];
        this.ramps = [];
    }

    /**
     * Defines the objects for a simulator according to the given code.
     * @param {Map} objects - a map of object names to a list of that type of object.
     *                          (object name) -> (object type) -> (object data list)
     *                          tapeLines -> TapeLines
     *                          obstacles -> Walls & InteractableObjs
     *                          interactableObjs -> InteractableObjs
     *                              Note: InteractableObjs will have 2 references
     *                                  1 in obstacles, 1 in interactableObjs
     *                          ramps -> Ramps
     */
    defineObjs(objects) {
        this.tapeLines = [];
        this.obstacles = [];
        this.interactableObjs = [];
        this.ramps = [];

        if (objects.tapeLinesData !== undefined) {
            for (let newLine of objects.tapeLinesData) {
                this.tapeLines.push(new TapeLine(newLine.x1, newLine.y1, newLine.x2, newLine.y2, newLine.color));
            }
        }

        if (objects.wallsData !== undefined) {
            for (let newWall of objects.wallsData) {
                this.obstacles.push(new Wall(newWall.x, newWall.y, newWall.w, newWall.h, newWall.rotate, newWall.color));
            }
        }
        if (objects.interactableData !== undefined) {
            for (let interactableObj of objects.interactableData) {
                let newInteractableObj = new InteractableObj(interactableObj.x, interactableObj.y, interactableObj.w, interactableObj.h, interactableObj.color);
                this.interactableObjs.push(newInteractableObj);
                this.obstacles.push(newInteractableObj);
            }
        }

        if (objects.rampsData !== undefined) {
            for (let rampObj of objects.rampsData) {
                let newRamp = new Ramp(rampObj.x, rampObj.y, rampObj.w, rampObj. h, rampObj.highSide, rampObj.incline, rampObj.color);
                this.ramps.push(newRamp);
                if (newRamp.highSide == "up" || newRamp.highSide == "down") {
                    this.obstacles.push(new Wall(newRamp.topL[0]-1, newRamp.topL[1], 1, newRamp.h, 0, newRamp.color));
                    this.obstacles.push(new Wall(newRamp.topR[0], newRamp.topR[1], 1, newRamp.h, 0, newRamp.color));
                } else if (newRamp.highSide == "right" || newRamp.highSide == "left") {
                    this.obstacles.push(new Wall(newRamp.topL[0], newRamp.topL[1]-1, newRamp.w, 1, 0, newRamp.color));
                    this.obstacles.push(new Wall(newRamp.botL[0], newRamp.botL[1], newRamp.w, 1, 0, newRamp.color));
                }
            }
        }
    }

    /**
     * Draws the objects by sending a message to the main thread to draw the objects.
     * Send ramps, tape lines, and obstacles to be drawn.
     */
    drawObjs() {
        let objects = {
            ramps: this.ramps,
            tapeLines: this.tapeLines,
            obstacles: this.obstacles
        }
        postMessage({objs: objects})

        // postMessage({objs: this.ramps, type: "ramp"});
        // postMessage({objs: this.tapeLines, type: "tapeLine"});
        // postMessage({objs: this.obstacles, type: "obstacle"});
    }

    /**
     * Loads the student code for the current Simulator
     */
    loadStudentCode(){
        // Store the local environment into dictionary
        // Ensure the global Robot reflects the same robot Simulator is using
        env['Robot'] = this.robot;
        env['Gamepad'] = this.gamepad;
        env['Keyboard'] = this.keyboard;

        pyodide.runPython(`
            from js import code, env
            env = dict(env)
            exec(code, env)
        `);

        env = pyodide.pyimport("env");

        // Eventually need to gracefully handle failures here
        this.autonomous_setup = env['autonomous_setup'];
        this.autonomous_main = env['autonomous_main'];
        this.teleop_setup = env['teleop_setup'];
        this.teleop_main = env['teleop_main'];
    }

    /**
     * Run function in specified object. Function call comes from subworker.
     * @param {String} objClass - the type of object the subworker is calling 
     *                              a method of ("Robot", "Gamepad", "Keyboard")
     * @param {String} fnName - the name of the method being called
     * @param {Array} args - arguments to the method call
     */
    runSubworkerFn(objClass, fnName, args, sab) {
        let result;
        switch (objClass) {
            case "Robot":
                result = this.robot[fnName](...args);
                break;
            case "Gamepad":
                result = this.gamepad[fnName](...args);
                break;
            case "Keyboard":
                result = this.keyboard[fnName](...args);
                break;
        }
        if (fnName === "get_value") {
            // TODO: send result back to subworker (probably need to be passed subworker number)
            if (sab === undefined) {
                return
            }
            // Set return value of get_value
            Atomics.store(sab, 1, result);
            // Indicate response, need separate response in case ret val is 0
            Atomics.store(sab, 0, 1);
            Atomics.notify(sab, 0, 1);
        }
    }

    /**
     * Executes one cycle of the robot.
     * @param {Function} func - a 0-argument function to continually run
     */
    loopContent(func) {
        func();
        simulator.robot.updatePosition();
    }

    /**
     * Execute the robot at specified frequency. 
     * @param {Integer} period - the period (ms) to run func in
     * @param {Function} func - the function to execute each loop.
     *     May take only TIMEOUT_VALUE seconds to finish execution
     */
    consistentLoop(period, func){
        this.interval = setInterval(this.loopContent, period, func);
    }

    /**
     * Stops the simulation.
     */
    stop() {
        if (this.mode !== "idle") {
            this.mode = "idle";
            clearInterval(this.interval);
        }
        postMessage({
            mode: this.mode
        });
    }

    /**
     * Simulates the execution of robot code for teleop mode.
     * @param {Map} robotInfo - a map containing initial robot info
     */
    simulateTeleop(robotInfo) {
        this.mode = "teleop"
        postMessage({
            mode: this.mode
        });
        this.robot = new RobotClass(this, robotInfo);
        this.loadStudentCode();
        this.teleop_setup();
        this.consistentLoop(this.robot.tickRate, this.teleop_main);
    }

    /**
     * Simulates the execution of robot code for autonomous mode.
     * @param {Map} robotInfo - a map containing initial robot info
     */
    simulateAuto(robotInfo) {
        this.mode = "auto";
        postMessage({
            mode: this.mode
        });
        this.robot = new RobotClass(this, robotInfo);
        this.loadStudentCode();
        this.timeout = setTimeout(function() { this.stop(); }.bind(this), 30*1000);
        this.robot.simStartTime = new Date().getTime();
        this.autonomous_setup();
        this.consistentLoop(this.robot.tickRate, this.autonomous_main);
    }
}

// The intial instance of a Simulator
var simulator = new Simulator();

/**
 * Handles messages from the Main Thread (base.js)
 * @param {*} e - an object that contains data, which is a map
 *                  of various things that the Worker thread needs
 *                  to run a simulation.
 */
this.onmessage = function(e) {
    // Code upload
    if (e.data.code !== undefined){
        code = e.data.code;
    }
    
    // Give simulator the list of objects
    if (e.data.objects !== undefined) {
        simulator.defineObjs(e.data.objects);
        // Draw objects if no active simulation
        if (simulator.mode == "idle") {
            simulator.drawObjs();
        }

        // Objects get redefined right away in teleop mode.
        // Attached objects get removed, so set to null.
        if (simulator.mode == "teleop") {
            simulator.robot.attachedObj = null;
        }
    }

    if (e.data.start === true) {
        if (code === ""){
            console.log("Please upload code first");
        }
        else {
            let simulate = function () {
                // Wait for pyodide to load
                if (typeof pyodide !== "undefined" && typeof pyodide.version !== "undefined") {
                    // Assume robotInfo is a key in the posted message
                    if (e.data.mode === "auto") simulator.simulateAuto(e.data.robotInfo);
                    else if (e.data.mode === "teleop") simulator.simulateTeleop(e.data.robotInfo);
                }
                else {
                    setTimeout(simulate, 500);
                }
            }
            simulate();
        }
    }

    // Handle key inputs (keyboard/gamepad) in teleop
    if (simulator.mode === "teleop"){
        if (e.data.keyMode === "keyboard") {
            if (e.data.up === true){
                onRelease(e.data.keyCode);
            }
            else if (e.data.up === false){
                onPress(e.data.keyCode);
            }
        } else if (e.data.keyMode === "gamepad") {
            if (e.data.isButton) {
                if (e.data.up === true){
                    onReleaseGamepad(e.data.button);
                }
                else if (e.data.up === false){
                    onPressGamepad(e.data.button);
                }
            } else { // a joystick movement
                if (e.data.up === true){
                    stopGamepad(e.data.axis);
                }
                else if (e.data.up === false){
                    moveGamepad(e.data.axis, e.data.value);
                }
            }
        }
    }
}
