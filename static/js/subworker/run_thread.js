/***********************************************************************
 * Subworker Thread.
 * 
 * Runs a function called using Robot.run(). 
 * 
 * Spawned by the Worker Thread, robot.js, which contains simulation state.
 **********************************************************************/

/**
 * Rebinds Console functions for custom logging.
 */
console.log = function(text) {
    postMessage({
        log: text
    })
}

importScripts("https://cdn.jsdelivr.net/pyodide/v0.16.1/full/pyodide.js");
// Following two vars must be declared before pyodide loads for pyodide to import them
var code = "";
var env = {};
languagePluginLoader.then(() => function () {});

class RobotClassDummy {
    constructor() {
        /* Define dummy versions of robot API functions (except sleep() and get_value()) */
        this.set_value = function (...args) { this.call_method("set_value", args) };
        this.pick_up   = function (...args) { this.call_method("pick_up"  , args) };
        this.drop      = function (...args) { this.call_method("drop"     , args) };
    }

    /**
     * Gets a value from a device.
     * See class RobotClass for details.
     * @param ...args - arguments to RobotClass.get_value()
     * @returns value returned by RobotClass.get_value()
     */
    get_value(...args) {
        return get_value_shared("Robot", args);
    }

    /**
     * Run real version of method methodName in main thread.
     * @param {String} methodName - name of robot API method to call. Must have no return value.
     * @param ...args - arguments to robot API method
     */
    call_method(methodName, args) {
        let objClass = "Robot";
        postMessage({objClass:objClass, methodName:methodName, args:args});
    }
    
    /**
     * Puts the robot to sleep for a specified amount of time.
     * @param {Number} duration - length of sleep in seconds.
     */
    sleep(duration) {
        /* Autonomous code pauses execution for <duration> seconds */
        let ms = duration*1000;
        let start = new Date().getTime();
        let cur = start;
        let tick = start;

        while (cur < start + ms) {
            cur = new Date().getTime();
            if (cur > this.simStartTime + 30*1000) {
                return;
            }
            if (cur - tick >= this.tickRate) {
                tick = tick + this.tickRate;
            }
        }
    }
}

class GamepadClassDummy {
    /**
     * Gets a value from a device.
     * See class GamepadClass for details.
     * @param ...args - arguments to GamepadClass.get_value()
     * @returns value returned by GamepadClass.get_value()
     */
    get_value(...args) {
        return get_value_shared("Gamepad", args);
    }
}

class KeyboardDummy {
    /**
     * Gets a value from a device.
     * See class Keyboard for details.
     * @param ...args - arguments to Keyboard.get_value()
     * @returns value returned by Keyboard.get_value()
     */
    get_value(...args) {
        return get_value_shared("Keyboard", args);
    }
}

/**
 * Gets a value from a device from main worker
 * @param {String} objClass - robot API object name. Robot, Gamepad, or Keyboard.
 * @param {Array} args - arguments to robot API method
 * @returns value returned by Keyboard.get_value()
 */
function get_value_shared(objClass, args) {
    // Request value from main worker, and wait for response
    // https://stackoverflow.com/questions/10590213/synchronously-wait-for-message-in-web-worker
    let sab = new Int32Array(new SharedArrayBuffer(8)); // 8 bytes, need to cast to use Atomics.wait
    postMessage({objClass:objClass, methodName:"get_value", args:args, sab:sab});
    Atomics.wait(sab, 0, 0);
    return sab[1];
}

/**
 * Run student code function.
 * @param {String} fnName - student code function Name
 * @param {Array} args - arguments to function
 * @param {String} codeArg - full student code
 */
 function run(fnName, args, codeArg) {
    // Run all the student code to populate namespace
    code = codeArg;
    env['Robot'] = new RobotClassDummy();
    env['Gamepad'] = new GamepadClassDummy();
    env['Keyboard'] = new KeyboardDummy();

    pyodide.runPython(`
        from js import code, env
        env = dict(env)
        exec(code, env)
    `);
    env = pyodide.pyimport("env");

    // Run the function
    fn = env[fnName];
    fn(...args);

    // Tell the main worker this thread is done
    postMessage({done: true});
}

this.onmessage = function(e) {
    if (e.data.fnName !== undefined) {
        run(e.data.fnName, e.data.args, e.data.code);
    }
}
