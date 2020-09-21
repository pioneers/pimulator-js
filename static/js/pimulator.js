// import math
// import asyncio
// import warnings
// import time
// import inspect
// import os
// from pynput import keyboard
// from pynput.keyboard import Listener
// import __future__
// import threading
// import multiprocessing
// # termcolor is an optional package
// try:
//     from termcolor import colored
// except ModuleNotFoundError:
//     colored = lambda x, y: x

const SCREENHEIGHT = 48
const SCREENWIDTH = 48
var scaleFactor = 2

class RobotClass {
    /*The MODEL for this simulator. Stores robot data and handles position
       calculations & Runtime API calls """*/
    tickRate = 0.05;          // in s
    width = 12 * scaleFactor;                  // width of robot , inches
    wRadius = 2 * scaleFactor;                // radius of a wheel, inches
    MaxX = 143 * scaleFactor;                 // maximum X value, inches, field is 12'x12'
    MaxY = 143 * scaleFactor;                 // maximum Y value, inches, field is 12'x12'
    neg = -1;                    // negate left motor calculation

    constructor(queue=null) {
      this.X = 72.0 * scaleFactor;           // X position of the robot
      this.Y = 72.0 * scaleFactor;           // Y position of the robot
      this.Wl = 0.0;           // angular velocity of l wheel, degree/s
      this.Wr = 0.0;           // angular velocity of r wheel, degree/s
      this.ltheta = 0.0;       // angular position of l wheel, degree
      this.rtheta = 0.0;       // angular position of r wheel, degree
      this.dir = 0.0;          // Direction of the robot facing, degree

      // All asychronous functions currently running
      this.runningCoroutines = new Set();

      // Ensure we don't hit sync errors when updating our values
      this.queue = queue;
    }

    updatePosition() {
        /* Updates position of the  Robot using differential drive equations

        Derived with reference to:
        https://chess.eecs.berkeley.edu/eecs149/documentation/differentialDrive.pdf*/
        let lv = this.Wl * this.wRadius;
        let rv = this.Wr * this.wRadius * this.neg;
        let radian = Math.PI*this.dir/180;
        if (lv == rv) {
            let distance = rv * this.tickRate
            let dx = distance * Math.cos(radian)
            let dy = distance * Math.sin(radian)
            //let finalDir = null
          }
        else {
            let rt = this.width/2 * (lv+rv)/(rv-lv);
            let wt = (rv-lv)/this.width;
            let theta = wt * this.tickRate;
            let i = rt * (1 - Math.cos(theta));
            let j = Math.sin(theta) * rt;
            let dx = i * Math.sin(radian) + j * Math.cos(radian);
            let dy = i * Math.cos(radian) + j * Math.sin(radian);
            this.dir= (this.dir + theta*180*Math.PI) % 360;
          }
        this.X = Math.max(Math.min(this.X + dx, this.MAXX), 0);
        this.Y = Math.max(Math.min(this.Y + dy, this.MAXY), 0);
        this.ltheta = (this.Wl * 5 + this.ltheta) % 360;
        this.rtheta = (this.Wr * 5 + this.rtheta) % 360;

        /*if (this.queue !== null) {
            this.queue.enqueue({
                            'x':this.X,
                            'y':this.Y,
                            'dir':this.dir});
            }*/
    }

    set_value(device, param, speed) {
        /* Runtime API method for updating L/R motor speed. Takes only L/R
           Motor as device name and speed bounded by [-1,1]. */
        if (speed > 1.0 || speed < -1.0){
            throw new Error("Speed cannot be great than 1.0 or less than -1.0.");
        }
        if (param !== "dutyCycle") {
            throw new Error('"dutyCycle" is the only currently supported parameter');
        }
        if (device === "leftMotor") {
            this.Wl = speed * 9;
        } else if (device === "rightMotor") {
            this.Wr = speed * 9;
        } else {
            throw new Error("Cannot find device name: " + device);
        }
    }

    async sleep(duration) {
        /* Autonomous code pauses execution for <duration> seconds
        */
        await new Promise(resolve => setTimeout(resolve, duration*1000));
    }

    printState() {
        console.log('x = ${this.X.toFixed(2)}, y = ${this.Y.toFixed(2)}, theta = ${this.dir.toFixed(2)}');
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

    /*INVALIDCOMBINATIONS = [
        {keyboard.KeyCode(char='w'), keyboard.KeyCode(char='s')},
        {keyboard.KeyCode(char='a'), keyboard.KeyCode(char='d')},
        {keyboard.Key.up, keyboard.Key.down},
        {keyboard.Key.left, keyboard.Key.right}
    ];

    COMBINATIONS1 = [
        keyboard.KeyCode(char='w'),
        keyboard.KeyCode(char='d'),
        keyboard.KeyCode(char='a'),
        keyboard.KeyCode(char='s')
    ];

    COMBINATIONS2 = [
        keyboard.Key.up,
        keyboard.Key.left,
        keyboard.Key.right,
        keyboard.Key.down
    ]*/

    constructor(setNum) {
        this.setNum = setNum;
        this.joystick_left_x = 0;
        this.joystick_left_y = 0;
        this.joystick_right_x = 0;
        this.joystick_right_y = 0;

        /*
        # this.t0 = time.time()
        # this.joystick_left_x = this.sets[setNum][0]
        # this.joystick_left_y =  this.sets[setNum][1]
        # this.joystick_right_x =  this.sets[setNum][2]
        # this.joystick_right_y =  this.sets[setNum][3]
        # this.durations = this.sets[setNum][4]         #lst of instr duration
        # this.i = 0                                        #index of insturction
        */
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

//#######################################
function down(e){
   this.onPress(e.keyCode)
}
function up(e){
  this.onPress(e.keyCode)
}
class Simulator{
    constructor() {
        /*
        Initialize new Simulator
        */

        this.robot = new RobotClass()
        this.initGamepad()
        // this.loadStudentCode()
        this.current = []
        this.isRunning = false
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
        Load the student code from the file
        */

        // Load student code
        // content = getCookie("code");
        content = code;

        //# Store the local environment into dictionary
        // env = {}
        //# Ensure the global Robot reflects the same robot Simulator is using
        env['Robot'] = this.robot
        env['Gamepad'] = this.gamepad

        pyodide.runPython(`
            from js import content, env
            env = dict(env)
            exec(content, env)
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

    consistent_loop(period, func, runtime){
        /* Execute the robot at specificed frequency.

        period (int): the period in seconds to run func in
        func (function): the function to execute each loop

        func may take only TIMEOUT_VALUE seconds to finish execution
        */
        period = period * 1000;
        runtime = runtime * 1000;
        document.addEventListener('keydown', down )
        document.addEventListener('keyup', up)
        this.interval = setInterval(function() {this.loop_content(func)}, period);
        setTimeout(function() { this.stop(); }, runtime);
    }

    loopContent(func) {
        /* Execute one cycle of the robot.
        */
        func();
        this.robot.updatePosition();
        return null;
    }

    stop() {
        if (this.interval !== null) {
            clearInterval(this.interval);
        }
        document.removeEventListener('keydown', down);
        document.removeEventListener('keyup', up);
    }

    onPress(keyCode) {
        /* Handling the events associated with pressing a key. Keyboard inputs are inputted as
           KEYCODE. */
           // assumes this.current is a pseudo-set (underlying implementation is an array)
           // assumes INVALIDCOMBINATIONS is an array of arrays (sorted)
        keyCode = toLowercase(keyCode); //FIXME: code this -> convert to lowercase if keyCode is a letter, else return arg
        if (this.current.length === 0) {
            if ((this.gamepad.COMBINATIONS.includes(keyCode)) || (this.gamepad.COMBINATIONS2.includes(keyCode))) {
                this.current.push(keyCode);
                this.translateToMovement();
            }
        } else if (this.current.length >= 1) {
            if (this.current.includes(keyCode)) {
              return null;
            }
            let elem = this.current.pop();
            this.current.push(elem);
            if (keyCode < elem) {
              let tuple = [keyCode, elem];
            } else {
              let tuple = [elem, keyCode];
            }
            if (!GamepadClass.INVALID_COMBINATIONS.includes(tuple)) {
                this.current.push(keyCode);
                this.translateToMovement();
            }
        }
        return null;
    }

    onRelease(keyCode) {
        try {
          this.current.filter(k => k === keyCode);
        }
        catch(err) {
          return null;
        }
        if (keyCode === 87) { // w
            this.gamepad.joystick_left_y = 0;
        } else if (keyCode === 65) { // a
            this.gamepad.joystick_left_x = 0;
        } else if (keyCode === 83) { // s
            this.gamepad.joystick_left_y = 0;
        } else if (keyCode === 68) { // d
            this.gamepad.joystick_left_x = 0;
        } else if (keyCode === 38) { // up
            this.gamepad.joystick_right_y = 0;
        } else if (keyCode === 40) { // down
            this.gamepad.joystick_right_y = 0;
        } else if (keyCode === 37) { // left
            this.gamepad.joystick_right_x = 0;
        } else if (keyCode === 39) { // right
            this.gamepad.joystick_right_x = 0;
        }
    }

    translateToMovement() {
        if (this.current.length === 0) {
          this.robot.updatePosition();
        }
        var k;
        for (k of this.current) {
            if (keyCode === 87) { // w
                this.gamepad.joystick_left_y = 1;
            } else if (keyCode === 65) { // a
                this.gamepad.joystick_left_x = 1;
            } else if (keyCode === 83) { // s
                this.gamepad.joystick_left_y = -1;
            } else if (keyCode === 68) { // d
                this.gamepad.joystick_left_x = -1;
            } else if (keyCode === 38) { // up
                this.gamepad.joystick_right_y = 1;
            } else if (keyCode === 40) { // down
                this.gamepad.joystick_right_y = -1;
            } else if (keyCode === 37) { // left
                this.gamepad.joystick_right_x = -1;
            } else if (keyCode === 39) { // right
                this.gamepad.joystick_right_x = 1;
            }
        }
        this.robot.updatePosition();
    }

    /*keyboardControl(){
        // TODO: Listen for key presses somehow in teleop //
        // with Listener(on_press=t his.on_press, on_release=this.on_release) as l:
        //     l.join()


        setTimeout(() => {

        }, 30000);
    }*/

    simulate_teleop(){
        /* Simulate execution of the robot code.

        Run setup_fn once before continuously looping loop_fn */

        //teleop_thread = threading.Thread(group=null, target=this.keyboard_control,
        //                                name="keyboard thread", daemon=True)

        //teleop_thread.start()
        this.consistent_loop(this.robot.tickRate, this.teleop_main, -1)
    }

    simulateAuto(stop_fn) {
        is_running = true
        auto_thread = threading.Thread(group=null, target=this.autonomous_setup,
                                        name="autonomous code thread", daemon=True)
        auto_thread.start()
        this.consistent_loop(this.robot.tickRate, this.robot.updatePosition, 30)
        stop_fn()
    }
}
