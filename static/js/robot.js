/* Rebind console messages. */
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

// Query string used when creating the worker, including the ampersand separator
var queryString = location.search;

importScripts("https://cdn.jsdelivr.net/pyodide/v0.16.1/full/pyodide.js");
importScripts("./GamepadClass.js" + queryString);
importScripts("./Sensor.js" + queryString);
importScripts("./objects.js" + queryString);
importScripts("./FieldObj.js" + queryString);
importScripts("./keyboard.js" + queryString);

var code = "";
var env = {};
languagePluginLoader.then(() => function () {});

const SCREENHEIGHT = 48;
const SCREENWIDTH = 48;

class RobotClass {
    /*The MODEL for this simulator. Stores robot data and handles position
       calculations & Runtime API calls """*/
    tickRate = 50;              // in ms
    width = 26.7;               // width of robot, inches
    height = 20;                // height or robot, inches
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

    constructor(simulator, robotInfo) {
        this.Wl = 0.0;           // requested angular velocity of l wheel, radians/s
        this.Wr = 0.0;           // requested angular velocity of r wheel, radians/s
        this.ltheta = 0.0;       // angular position of l wheel, degrees
        this.rtheta = 0.0;       // angular position of r wheel, degrees
        this.dir = 0.0;          // Direction of the robot facing, degrees
        this.currentLv = 0;       // current velocity of left wheel, in inches/s
        this.currentRv = 0;       // current velocity of right wheel, in inches/s

        // Set robot attributes based on type
        let robotType = robotInfo.robotType;
        const validTypes = ["light", "medium", "heavy"];
        if (!validTypes.includes(robotType)) {
            robotType = "medium"; // robot type is medium by default
        }
        let robotTypeNum;
        if (robotType === "light") {
            robotTypeNum = 3;
            // this.width = 14.18;      // Robot width, inches
            // this.height = 12.5;      // Robot height, inches
            this.wheelWidth = 9.06;  // Wheelbase width, inches
        }
        else if (robotType === "medium") {
            robotTypeNum = 4;
            // this.width = 19.3;
            // this.height = 14;
            this.wheelWidth = 12.39;
        }
        else if (robotType === "heavy") {
            robotTypeNum = 5;
            // this.width = 10.7;
            // this.height = 14.06;
            this.wheelWidth = 8.98;
        }

        // Max speed is 0.628 m/s = 24.72 in/s and max acceleration is 0.55 m/s^2 = 21.65 in/s^2
        // Refresh rate = 0.05/s
        // Max speed is 1.236 in/tick and max acceleration is 0.05413 in/tick^2
        this.accel = (8 - robotTypeNum) / 5 * 0.05413; // Larger robots accelerate more slowly
        this.maxVel = robotTypeNum / 5 * 1.236;        // Larger robots have a higher top speed
        this.wheelWidth = robotTypeNum / 5 * 20;       // Larger robots have a wider wheelbase

        // Set robot position
        this.X = this.getValidXPosition(robotInfo.xpos); // current X position of the center of the robot
        this.Y = this.getValidYPosition(robotInfo.ypos); // current Y position of the center of the robot

        // Set robot corner positions
        // Corners are relative to the robot facing up
        //coordinates for top right corner of robot
        this.topR[0] = this.X - this.height/2;
        this.topR[1] = this.Y - this.width/2;

        //coordinates for top left corner of robot
        this.topL[0] = this.X - this.height/2;
        this.topL[1] = this.Y + this.width/2;

        //coordinates for bottom right corner
        this.botR[0] = this.X + this.height/2;
        this.botR[1] = this.Y - this.width/2;

        //coordinates for bottom left corner
        this.botL[0] = this.X + this.height/2;
        this.botL[1] = this.Y + this.width/2;

        // All asychronous functions currently running
        this.runningCoroutines = new Set();

        // Ensure we don't hit sync errors when updating our values
        this.simulator = simulator;
        this.lineFollower = new LineFollower(this);
        this.limitSwitch = new LimitSwitch(this);
    }

    /** Validate the input starting X coordinate of the robot
    *   pos is the value we want to set the coordinate to */
   getValidXPosition(pos) {
        // Check is pos is a number or not
        let posNum = Number(pos);
        if (isNaN(posNum)) {
            return this.startXDefault;
        }
        // Bound the coordinate
        posNum = Math.max(posNum, this.height/2 + 3);
        posNum = Math.min(posNum, this.MaxX - this.height/2 - 3);

        return posNum
    }

    /** Validate the input starting Y coordinate of the robot
    *   pos is the value we want to set the coordinate to */
    getValidYPosition(pos) {
        // Check is pos is a number or not
        let posNum = Number(pos);
        if (isNaN(posNum)) {
            return this.startYDefault;
        }
        // Bound the coordinate
        posNum = Math.max(posNum, this.width/2 + 3);
        posNum = Math.min(posNum, this.MaxY - this.width/2 - 3);

        return posNum
    }

    intersectRobotRef(obj, corners) {
        /* Using the normals of the robot as reference axes,
        returns true if the projections of the object and the robot intersect
        via both normals. */

        // coordinates of the k_i vectors
        let k1x = obj.botL[0] - corners.botL[0]; //x of the vector from botL of robot to botL of obstacle
        let k1y = obj.botL[1] - corners.botL[1]; //figure it out from here...
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

    intersectObjRef(obj, corners) {
        /* Using the normals of the object as reference axes,
        returns true if the projections of the object and the robot intersect
        via both normals. */

        // coordinates of the k_i vectors
        let k1x = corners.botL[0] - obj.botL[0]; //x of the vector from botL of obj to botL of robot
        let k1y = corners.botL[1] - obj.botL[1]; //figure it out from here...
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

    intersectOne(obj, corners) {
        /* Returns true if object and robot intersect,
        this means that their projections intersect via all
        4 normals */

        return this.intersectRobotRef(obj, corners) && this.intersectObjRef(obj, corners);
    }

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

    updatePosition() {
        /* Updates position of the  Robot using differential drive equations
        Derived with reference to:
        https://chess.eecs.berkeley.edu/eecs149/documentation/differentialDrive.pdf*/

        let radian = Math.PI*this.dir/180;
        let dx;
        let dy;
        let dir = this.dir;

        //TODO: Test with Gamepad. Compare with real tested values if possible

        //TODO: make 3 robot profiles. Edit onmessage to change maxVel and acceleration
        //whenever message is received.

        //TODO: handling, edit the Lv and Rv such that difference is low

        // Compare the current speed of each motor to the requested speed, and accelerate in the correct direction
        if (this.requestedLv > this.currentLv) {
            this.currentLv = Math.min(this.currentLv + this.accel, this.requestedLv);
        }
        if (this.requestedLv < this.currentLv) {
            this.currentLv = Math.max(this.currentLv - this.accel, this.requestedLv);
        }
        if (this.requestedRv > this.currentRv) {
            this.currentRv = Math.min(this.currentRv + this.accel, this.requestedRv);
        }
        if (this.requestedRv < this.currentRv) {
            this.currentRv = Math.max(this.currentRv - this.accel, this.requestedRv);
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
            if (inter) {
                break;
            }
        }

        // If no collision, update robot positional attributes
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
        }

        // Send position and sensor readings to main thread
        let newState = {
            X: this.X,
            Y: this.Y,
            dir: this.dir,
            width: this.width,
            height: this.height
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

        postMessage({
            robot: newState,
            sensors: sensorValues,
            switches: switchValues
        })
    }

    updateCorners(newX, newY, dir) {
        /* Returns dictionary of prospective corners of the robot after prompted
        movement. Changes the actual corners only after verifiying that the
        robot won't crash */

        let dDir = dir * Math.PI / 180;
        let sin = Math.sin(dDir);
        let cos = Math.cos(dDir);

        let dict = {topR: Array(2), topL: Array(2), botL: Array(2), botR: Array(2)};
        //top right corner
        dict.topR[0] = newX - (this.height/2) * cos + (this.width/2) * sin;
        dict.topR[1] = newY - (this.height/2) * sin - (this.width/2) * cos;

        //top left corner
        dict.topL[0] = newX - (this.height/2) * cos - (this.width/2) * sin;
        dict.topL[1] = newY - (this.height/2) * sin + (this.width/2) * cos;

        //bottom left corner
        dict.botL[0] = newX + (this.height/2) * cos - (this.width/2) * sin
        dict.botL[1] = newY + (this.height/2) * sin + (this.width/2) * cos;

        //bottom right corner
        dict.botR[0] = newX + (this.height/2) * cos + (this.width/2) * sin;
        dict.botR[1] = newY + (this.height/2) * sin - (this.width/2) * cos;

        return dict;
    }

    set_value(device, param, speed) {
        /* Runtime API method for updating L/R motor speed. Takes only L/R
           Motor as device name and speed bounded by [-1,1]. */

        if (speed > 1.0 || speed < -1.0){
            throw new Error("Speed cannot be great than 1.0 or less than -1.0.");
        }
        if (param !== "duty_cycle") {
            throw new Error('"duty_cycle" is the only currently supported parameter');
        }
        if (device === "left_motor") {
            this.requestedLv = speed * this.maxVel;
        } else if (device === "right_motor") {
            this.requestedRv = speed * this.maxVel * this.neg;
        } else {
            throw new Error("Cannot find device name: " + device);
        }
    }

    get_value(device, param) {
        /* Runtime API method for getting sensor values.
           Currently supports reading left, center and right line followers
           in a range of [0,1]. */
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
        throw new Error("Device was not found" + device);
    }

    sleep(duration) {
        /* Autonomous code pauses execution for <duration> seconds
        */
        let ms = duration*1000;
        let start = new Date().getTime();
        let cur = start;
        let tick = start;
        this.updatePosition();

        let numUpdates = 1;
        while (cur < start + ms) {
            cur = new Date().getTime();
            if (cur > this.simStartTime + 30*1000) {
                return;
            }
            if (cur - tick >= this.tickRate) {
                this.updatePosition();
                tick = tick + this.tickRate;
                numUpdates++;
            }
        }
    }

    printState() {
        console.log(`x = ${this.X.toFixed(2)}, y = ${this.Y.toFixed(2)}, theta = ${this.dir.toFixed(2)}`);
    }

    run(fn) {
        /*
        Starts a "coroutine", i.e. a series of actions that proceed
        independently of the main loop of code.
        */
        if (!(typeof fn === "function")) {
            throw new Error("First argument to Robot.run must be a function");
        }
        this.runningCoroutines.add(fn)
        fn()
    }
    is_running(fn) {
        /* Returns True if the given `fn` is already running as a coroutine.
        See: Robot.run
        TODO: Fully implement */
        if (!(typeof fn === "function")) {
            throw new Error("First argument to Robot.is_running must be a function");
        }
        return this.runningCoroutines.has(fn)
    }
}

/*********************** KEYBOARD INPUT GAMEPAD FUNCTIONS ***********************/

/**
 * Event listeners for key presses
 */
function onPress(keyCode) {
    /* Handling the events associated with pressing a key. Keyboard inputs are inputted as
       KEYCODE. */
    simulator.keyboard.press(keyCode);

    if (keyCode === 87) { // w
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

function translateToMovement(keyCode) {
    if (simulator.current.length === 0) {
      simulator.robot.updatePosition();
    }
    let k;
    for (k of simulator.current) {
        if (keyCode === 87) { // w
            simulator.gamepad.joystick_left_y = 1;
        } else if (keyCode === 65) { // a
            simulator.gamepad.joystick_left_x = 1;
        } else if (keyCode === 83) { // s
            simulator.gamepad.joystick_left_y = -1;
        } else if (keyCode === 68) { // d
            simulator.gamepad.joystick_left_x = -1;
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
    simulator.robot.updatePosition();
}

/*********************** GAMEPAD INPUT GAMEPAD FUNCTIONS ***********************/

/**
 * A mapping from the button names of the controller to the button names
 * in the PiE Robot API.
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
 * Sets the value of the axis according to joystick movement
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
 * Resets the value of the axis back to the center
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

//#######################################

class Simulator{
    constructor() {
        /*
        Initialize new Simulator
        */
        this.robot = null;
        this.mode = "idle";
        this.gamepad = new GamepadClass();
        this.keyboard = new Keyboard();
        this.current = [];
        this.tapeLines = [];
        this.obstacles = [];
        for (let newLine of objects.tapeLinesData) {
            this.tapeLines.push(new TapeLine(newLine.x1, newLine.y1, newLine.x2, newLine.y2, newLine.color));
        }
        for (let newWall of objects.wallsData) {
            this.obstacles.push(new Wall(newWall.x, newWall.y, newWall.w, newWall.h, newWall.color));
        }

        this.drawObjs();
    }

    drawObjs() {
        postMessage({objs: this.obstacles, type: "obstacle"});
        postMessage({objs: this.tapeLines, type: "tapeLine"});
    }

    loadStudentCode(){
        /*
        Load the student code to the current Simulator instance
        */

        //# Store the local environment into dictionary
        //# Ensure the global Robot reflects the same robot Simulator is using
        env['Robot'] = this.robot;
        env['Gamepad'] = this.gamepad;
        env['Keyboard'] = this.keyboard;

        pyodide.runPython(`
            from js import code, env
            env = dict(env)
            exec(code, env)
        `);

        env = pyodide.pyimport("env");

        //# Eventually need to gracefully handle failures here
        this.autonomous_setup = env['autonomous_setup'];
        this.autonomous_main = env['autonomous_main'];
        this.teleop_setup = env['teleop_setup'];
        this.teleop_main = env['teleop_main'];
        // ensure_is_function("teleop_setup", this.teleop_setup)
        // ensure_is_function("teleop_main", this.teleop_main)
    }

    loopContent(func) {
        /* Execute one cycle of the robot.
        */
        func();
        simulator.robot.updatePosition();
    }

    consistentLoop(period, func){
        /* Execute the robot at specificed frequency.
        period (int): the period in ms to run func in
        func (function): the function to execute each loop
        func may take only TIMEOUT_VALUE seconds to finish execution
        */
        this.interval = setInterval(this.loopContent, period, func);
    }

    stop() {
        if (this.mode !== "idle") {
            this.mode = "idle";
            clearInterval(this.interval);
        }
        postMessage({
            mode: this.mode
        });
    }

    simulateTeleop(robotInfo) {
        /* Simulate execution of the robot code.
        Run setup once before continuously looping main. */

        this.mode = "teleop"
        postMessage({
            mode: this.mode
        });
        this.robot = new RobotClass(this, robotInfo);
        this.loadStudentCode();
        this.teleop_setup();
        this.consistentLoop(this.robot.tickRate, this.teleop_main);
    }

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

var simulator = new Simulator();

this.onmessage = function(e) {
    // Code upload
    if (e.data.code !== undefined){
        code = e.data.code;
        if (e.data.newCode === true) {
            console.log("Code upload successful");
        }
    }

    // Start simulation
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
