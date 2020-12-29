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
            // code
        },
        warn: function (text) {
            oldCons.warn(text);
            // code
        },
        error: function (text) {
            oldCons.error(text);
            // code
        }
    };
}(console));

var log = console.log;

console.log = function () {
    var first_parameter = arguments[0];
    var other_parameters = Array.prototype.slice.call(arguments, 1);

    function formatConsoleDate (date) {
        var hour = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();
        var milliseconds = date.getMilliseconds();

        return ((hour < 10) ? '0' + hour: hour) + ':' + ((minutes < 10) ? '0' + minutes: minutes) + ' ';
    }

    log.apply(console, [formatConsoleDate(new Date()) + first_parameter].concat(other_parameters));
};

importScripts("https://pyodide-cdn2.iodide.io/v0.15.0/full/pyodide.js");
importScripts('./GamepadClass.js');
importScripts('./Sensor.js');

var code = "";
var env = {};
languagePluginLoader.then(() => function () {});

const SCREENHEIGHT = 48
const SCREENWIDTH = 48
var scaleFactor = 2

class RobotClass {
    /*The MODEL for this simulator. Stores robot data and handles position
       calculations & Runtime API calls """*/
    tickRate = 50;              // in ms
    width = 20;                 // width of robot , inches
    wRadius = 2;                // radius of a wheel, inches
    MaxX = 144;                 // maximum X value, inches, field is 12'x12'
    MaxY = 144;                 // maximum Y value, inches, field is 12'x12'
    neg = -1;                    // negate left motor calculation
    startX = 70.0
    startY = 70.0

    constructor(simulator) {
      this.X = this.startX;     // current X position of the center of the robot
      this.Y = this.startY;     // current Y position of the center of the robot
      this.Wl = 0.0;           // angular velocity of l wheel, radians/s
      this.Wr = 0.0;           // angular velocity of r wheel, radians/s
      this.ltheta = 0.0;       // angular position of l wheel, degrees
      this.rtheta = 0.0;       // angular position of r wheel, degrees
      this.dir = 0.0;          // Direction of the robot facing, degrees

      // All asychronous functions currently running
      this.runningCoroutines = new Set();

      // Ensure we don't hit sync errors when updating our values
      this.leftSensor = 0;
      this.centerSensor = 0;
      this.rightSensor = 0;
      this.simulator = simulator
      this.sensor = new Sensor(this);

      // this.tapeLines.push(new TapeLine(115, 27, 115, 115));
      // this.tapeLines.push(new TapeLine(27, 27, 115, 27))
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

        this.sensor.get_val()
        let sensorValues = {
            leftSensor: this.leftSensor,
            centerSensor: this.centerSensor,
            rightSensor: this.rightSensor
        };

        postMessage({
            robot: newState,
            sensors: sensorValues
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
    get_value(device, param) {

      if (device === "4752729234491832779312"){
        if (param === "left"){
          return this.leftSensor
        } else if (param === "center") {
          return this.centerSensor
        } else if (param === "right"){
          return this.rightSensor
        }
      }
      throw new Error("Device was not found" + device)
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
                this.autonomous_main();
                tick = tick + this.tickRate;
                numUpdates++;
            }
        }
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
        this.tapeLines = [];
        this.tapeLines.push(new TapeLine(27, 27, 115, 115));
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

        this.robot = new RobotClass(this);
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
        this.robot = new RobotClass(this);
        this.loadStudentCode();
        this.robot.autonomous_main = this.autonomous_main
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
        console.log("Code upload successful")
    }

    // Start simulation
    if (e.data.start === true) {
        if (code === ""){
            console.log("Please upload code first");
        }
        else {
            let simulate = function () {
                if (typeof pyodide !== "undefined" && typeof pyodide.version !== "undefined") {
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

    // Handle keypresses in teleop
    if (simulator.mode === "teleop" && e.data.keypress === true){
        if (e.data.up === true){
            up(e.data.keyCode);
        }
        else if (e.data.up === false){
            down(e.data.keyCode);
        }
    }
}
