importScripts("https://pyodide-cdn2.iodide.io/v0.15.0/full/pyodide.js");

var code = "";
var env = {};
languagePluginLoader.then(() => function () {});

const SCREENHEIGHT = 48
const SCREENWIDTH = 48

class RobotClass {
    /*The MODEL for this simulator. Stores robot data and handles position
       calculations & Runtime API calls """*/
    tickRate = 50;              // in ms
    width = 20;                 // width of robot , inches
    wRadius = 2;                // radius of a wheel, inches
    MaxX = 144;                 // maximum X value, inches, field is 12'x12'
    MaxY = 144;                 // maximum Y value, inches, field is 12'x12'
    neg = -1;                   // negate left motor calculation
    startX = 70.0               // starting X position of the center of the robot
    startY = 70.0               // starting Y position of the center of the robot

    constructor() {
      this.X = this.startX;     // current X position of the center of the robot
      this.Y = this.startY;     // current Y position of the center of the robot
      this.Wl = 0.0;            // angular velocity of l wheel, radians/s
      this.Wr = 0.0;            // angular velocity of r wheel, radians/s
      this.ltheta = 0.0;        // angular position of l wheel, degrees
      this.rtheta = 0.0;        // angular position of r wheel, degrees
      this.dir = 0.0;           // Direction of the robot facing, degrees

      // All asychronous functions currently running
      this.runningCoroutines = new Set();
    }

    updatePosition() {
        /* Updates position of the  Robot using differential drive equations
        Derived with reference to:
        https://chess.eecs.berkeley.edu/eecs149/documentation/differentialDrive.pdf*/
        let lv = this.Wl * this.wRadius;
        let rv = this.Wr * this.wRadius * this.neg;
        let radian = Math.PI*this.dir/180;
        let dx;
        let dy;
        if (lv == rv) {
            let distance = rv * this.tickRate/1000;
            dx = distance * Math.cos(radian)
            dy = distance * Math.sin(radian)
            //let finalDir = null
          }
        else {
            let rt = this.width/2 * (lv+rv)/(rv-lv);
            let wt = (rv-lv)/this.width;
            let theta = wt * this.tickRate/1000;
            let i = rt * (1 - Math.cos(theta));
            let j = Math.sin(theta) * rt;
            dx = i * Math.sin(radian) + j * Math.cos(radian);
            dy = i * Math.cos(radian) + j * Math.sin(radian);
            this.dir= (this.dir + theta*180/Math.PI) % 360;
          }
        this.X = Math.max(Math.min(this.X + dx, this.MaxX), 0);
        this.Y = Math.max(Math.min(this.Y + dy, this.MaxY), 0);
        this.ltheta = (this.Wl * 5 + this.ltheta) % 360;
        this.rtheta = (this.Wr * 5 + this.rtheta) % 360;

        let newState = {
            X: this.X,
            Y: this.Y,
            dir: this.dir
        };

        postMessage({
            robot: newState
        })
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
            this.Wl = speed * 9;
        } else if (device === "right_motor") {
            this.Wr = speed * 9;
        } else {
            throw new Error("Cannot find device name: " + device);
        }
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
            throw new Error("First argument to Robot.isRunning must be a function");
        }
        this.runningCoroutines.add(fn)
        fn()
   }
    isRunning(fn) {
        /* Returns True if the given `fn` is already running as a coroutine.
        See: Robot.run
        TODO: Fully implement */
        if (!(typeof fn === "function")) {
            throw new Error("First argument to Robot.isRunning must be a function");
        }
        return this.runningCoroutines.has(fn)
    }
}

class GamepadClass{
          //  #0, #1, #2, #3

    /* KEYCODE TO KEY CONVERSIONS - https://keycode.info/
        w       87
        a       65
        s       83
        d       68
        up      38  ArrowUp
        down    40  ArrowDown
        left    37  ArrowLeft
        right   39  ArrowRight
    */
    INVALID_COMBINATIONS = [
      [87, 83], //w, s
      [65, 68], //a, d
      [38, 40], //up, down
      [37, 39]  //left, right
    ]

    COMBINATIONS1 = [
      87, //w
      68, //d
      65, //a
      83  //s
    ]

    COMBINATIONS2 = [
      38, //up
      37, //left
      39, //right
      40  //down
    ]

    constructor(setNum) {
        this.setNum = setNum;

        // Joysticks
        this.joystick_left_x = 0;
        this.joystick_left_y = 0;
        this.joystick_right_x = 0;
        this.joystick_right_y = 0;

        // Buttons
        this.button_a = false;
        this.button_b = false;
        this.button_x = false;
        this.button_y = false;
        this.l_bumper = false;
        this.r_bumper = false;
        this.l_trigger = false;
        this.r_trigger = false;
        this.button_back = false;
        this.button_start = false;
        this.l_stick = false;
        this.r_stick = false;
        this.dpad_up = false;
        this.dpad_down = false;
        this.dpad_left = false;
        this.dpad_right = false;
    }

    get_value(device) {
        if (device === "joystick_left_x") {
            return this.joystick_left_x;
        } else if (device === "joystick_left_y") {
            return this.joystick_left_y;
        } else if (device === "joystick_right_x") {
            return this.joystick_right_x;
        } else if (device === "joystick_right_y") {
            return this.joystick_right_y;
        } else if (device === "button_a") {
            return this.button_a;
        } else if (device === "button_b") {
            return this.button_b;
        } else if (device === "button_x") {
            return this.button_x;
        } else if (device === "button_y") {
            return this.button_y;
        } else if (device === "l_bumper") {
            return this.l_bumper;
        } else if (device === "r_bumper") {
            return this.r_bumper;
        } else if (device === "l_trigger") {
            return this.l_trigger;
        } else if (device === "r_trigger") {
            return this.r_trigger;
        } else if (device === "button_back") {
            return this.button_back;
        } else if (device === "button_start") {
            return this.button_start;
        } else if (device === "l_stick") {
            return this.l_stick;
        } else if (device === "r_stick") {
            return this.r_stick;
        } else if (device === "dpad_up") {
            return this.dpad_up;
        } else if (device === "dpad_down") {
            return this.dpad_down;
        } else if (device === "dpad_left") {
            return this.dpad_left;
        } else if (device === "dpad_right") {
            return this.dpad_right;
        } else {
            throw new Error("Cannot find input: " + device);
        }
    }


    ltheta(){
        return this.theta(
                    this.getValue("joystick_left_x"),
                        -this.getValue("joystick_left_y"))}

    rtheta(){
        return this.theta(
                    this.getValue("joystick_right_x"),
                        -this.getValue("joystick_right_y"))}


    static theta(x, y){
        /* Convert cartesian to polar coordinates and return the radius. */
        if (x == 0 && y == 0) return "Neutral";
        if (x == 0) {
            if (y > 0) return 90.0;
            else return 270.0;
            }
        theta = Math.atan(y / x)*180/Math.PI;
        if (x > 0) return theta;
        else return theta + 180.0;
    }
}

/*
function isFunction(functionToCheck) {
 return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}
TIMEOUT_VALUE = .1 // seconds
function timeout_handler(signum, frame){
    throw new Error("Student code timed out");
  }
function ensure_is_function(tag, val)
    {if (!isFunction(val)) throw new Error("${tag} is not a function";}
function ensure_not_overridden(module, name){
    if hasAttribute(module, name) raise new Error("Student code overrides ${name}, which is part of the API")}
function _ensure_strict_semantics(fn){
    */ /* (Internal): provides additional error checking for the PiE API */ /*
    if (!inspect.iscoroutinefunction(fn)){
        throw new Error("Internal runtime error: _ensure_strict_semantics can only be applied to `async def` functions")}
    function wrapped_fn(*args, **kwargs){
        //# Ensure that this function is called directly out of the event loop,
        //# and not out of the `setup` and `loop` functions.
        stack = inspect.stack()
        try{
            for (frame of stack) {
                if (os.path.basename(frame.filename) == "base_events.py" && frame.function == "_run_once"){
                    //# We've hit the event loop, so everything is good
                    break}
                elif (os.path.basename(frame.filename) == "pimulator.py" and frame.function == 'simulate'){
                    //# We've hit the runtime before hitting the event loop, which
                    //# is bad
                    raise Exception("Call to `{}` must be inside an `async def` function called using `Robot.run`".format(fn.__name__))
                  }
                }
              }
        finally{
            del stack}
        return fn(*args, **kwargs)
      }
    return wrapped_fn
}
*/


/*********************** KEYBOARD INPUT GAMEPAD FUNCTIONS ***********************/

/**
 * Event listeners for key presses
 */
function down(key){
    onPress(key)
}
function up(key){
    onRelease(key)
}

function onPress(keyCode) {
    /* Handling the events associated with pressing a key. Keyboard inputs are inputted as
       KEYCODE. */

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
    var k;
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
function downGamepad(button){
    onPressGamepad(button);
}
function upGamepad(button){
    onReleaseGamepad(button);
}

function onPressGamepad(button) {
    if (button === "button_a") {
        simulator.gamepad.button_a = true;
    } else if (button === "button_b") {
        simulator.gamepad.button_b = true;
    } else if (button === "button_x") {
        simulator.gamepad.button_x = true;
    } else if (button === "button_y") {
        simulator.gamepad.button_y = true;
    } else if (button === "l_bumper") {
        simulator.gamepad.l_bumper = true;
    } else if (button === "r_bumper") {
        simulator.gamepad.r_bumper = true;
    } else if (button === "l_trigger") {
        simulator.gamepad.l_trigger = true;
    } else if (button === "r_trigger") {
        simulator.gamepad.r_trigger = true;
    } else if (button === "button_back") {
        simulator.gamepad.button_back = true;
    } else if (button === "button_start") {
        simulator.gamepad.button_start = true;
    } else if (button === "l_stick") {
        simulator.gamepad.l_stick = true;
    } else if (button === "r_stick") {
        simulator.gamepad.r_stick = true;
    } else if (button === "dpad_up") {
        simulator.gamepad.dpad_up = true;
    } else if (button === "dpad_down") {
        simulator.gamepad.dpad_down = true;
    } else if (button === "dpad_left") {
        simulator.gamepad.dpad_left = true;
    } else if (button === "dpad_right") {
        simulator.gamepad.dpad_right = true;
    }
}

function onReleaseGamepad(button) {
    if (button === "button_a") {
        simulator.gamepad.button_a = false;
    } else if (button === "button_b") {
        simulator.gamepad.button_b = false;
    } else if (button === "button_x") {
        simulator.gamepad.button_x = false;
    } else if (button === "button_y") {
        simulator.gamepad.button_y = false;
    } else if (button === "l_bumper") {
        simulator.gamepad.l_bumper = false;
    } else if (button === "r_bumper") {
        simulator.gamepad.r_bumper = false;
    } else if (button === "l_trigger") {
        simulator.gamepad.l_trigger = false;
    } else if (button === "r_trigger") {
        simulator.gamepad.r_trigger = false;
    } else if (button === "button_back") {
        simulator.gamepad.button_back = false;
    } else if (button === "button_start") {
        simulator.gamepad.button_start = false;
    } else if (button === "l_stick") {
        simulator.gamepad.l_stick = false;
    } else if (button === "r_stick") {
        simulator.gamepad.r_stick = false;
    } else if (button === "dpad_up") {
        simulator.gamepad.dpad_up = false;
    } else if (button === "dpad_down") {
        simulator.gamepad.dpad_down = false;
    } else if (button === "dpad_left") {
        simulator.gamepad.dpad_left = false;
    } else if (button === "dpad_right") {
        simulator.gamepad.dpad_right = false;
    }
}

function moveGamepad(axis, value) {
    console.log("joystick register: " + axis + " with value " + value);
    if (axis === 0) { // left joystick horizontal axis
        if (value > 0) { // joystick position right
            simulator.gamepad.joystick_left_x = 1;
        } else if (value < 0) { // joystick position left
            simulator.gamepad.joystick_left_x = -1;
        }
    } else if (axis === 1) { // left joystick vertical axis
        if (value > 0) { // joystick position down ***
            simulator.gamepad.joystick_left_y = -1;
        } else if (value < 0) { // joystick position up ***
            simulator.gamepad.joystick_left_y = 1;
        }
    } else if (axis === 2) { // right joystick horizontal axis
        if (value > 0) { // joystick position right
            simulator.gamepad.joystick_right_x = 1;
        } else if (value < 0) { // joystick position left
            simulator.gamepad.joystick_right_x = -1;
        }
    } else if (axis === 3) { // right joystick vertical axis
        if (value > 0) { // joystick position down ***
            simulator.gamepad.joystick_right_y = -1;
        } else if (value < 0) { // joystick position up ***
            simulator.gamepad.joystick_right_y = 1;
        }
    }
}

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
        this.initGamepad();
        this.current = [];
    }

    initGamepad(){
        const control_types = ['tank', 'arcade', 'other1', 'other2']
        const GAMEPAD_MODE = "tank"
        let control_type_index = control_types.indexOf(GAMEPAD_MODE)
        if (control_type_index == -1) {
            throw new Error("Invalid gamepad mode")}
        this.gamepad = new GamepadClass(control_type_index)
      }

    loadStudentCode(studentCodeFileName="student_code_file.py"){
        /*
        Load the student code to the current Simulator instance
        */

        //# Store the local environment into dictionary
        //# Ensure the global Robot reflects the same robot Simulator is using
        env['Robot'] = this.robot
        env['Gamepad'] = this.gamepad

        pyodide.runPython(`
            from js import code, env
            env = dict(env)
            exec(code, env)
        `);

        env = pyodide.pyimport("env");

        //# Eventually need to gracefully handle failures here
        this.autonomous_setup = env['autonomous_setup']
        this.autonomous_main = env['autonomous_main']
        this.teleop_setup = env['teleop_setup']
        this.teleop_main = env['teleop_main']

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
            this.mode = "idle"
            clearInterval(this.interval);
        }
        postMessage({
            mode: this.mode
        })
    }

    simulateTeleop(){
        /* Simulate execution of the robot code.
        Run setup_fn once before continuously looping loop_fn
        TODO: Run teleop_setup once before looping teleop_main */

        this.robot = new RobotClass();
        this.loadStudentCode();
        this.mode = "teleop"
        this.consistentLoop(this.robot.tickRate, this.teleop_main);
        postMessage({
            mode: this.mode
        })
    }

    simulateAuto() {
        this.mode = "auto";
        postMessage({
            mode: this.mode
        });
        this.robot = new RobotClass();
        this.loadStudentCode();

        this.timeout = setTimeout(function() { this.stop(); }.bind(this), 30*1000);
        this.robot.simStartTime = new Date().getTime();
        setTimeout(this.autonomous_setup, 0);
    }
}

var simulator = new Simulator();

this.onmessage = function(e) {
    // Code upload
    if (e.data.code !== undefined){
        code = e.data.code;
        console.log("Code upload succesful")
    }

    // Start simulation
    if (e.data.start === true) {
        if (code === ""){
            console.log("Please upload code first");
        }
        else {
            let simulate = function () {
                if (typeof pyodide != "undefined" && typeof pyodide.version != "undefined") {
                    if (e.data.mode === "auto") simulator.simulateAuto();
                    else if (e.data.mode === "teleop") simulator.simulateTeleop();
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
                up(e.data.keyCode);
            }
            else if (e.data.up === false){
                down(e.data.keyCode);
            }
        } else if (e.data.keyMode === "gamepad") {
            if (e.data.isButton) {
                if (e.data.up === true){
                    upGamepad(e.data.button);
                }
                else if (e.data.up === false){
                    downGamepad(e.data.button);
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
