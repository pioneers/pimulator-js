// TODO: Rebind console.log

importScripts("https://cdn.jsdelivr.net/pyodide/v0.16.1/full/pyodide.js");
// Following two vars must be declared before pyodide loads for pyodide to import them
var code = "";
var env = {};
languagePluginLoader.then(() => function () {});

class RobotClassDummy {
    constructor() {
        /* Define dummy versions of robot API functions (except sleep() and get_value()) */
        // let fns = ["pick_up", "drop", "set_value"];
        // for (let fn of fns) {
        //     let callFnString = "this." + fn + " = function (...args)";
        //     callFnString += "{this.call_fn(" + fn + ", ...args)}";
        //     eval(callFnString);
        // }

        this.set_value = function (...args) { this.call_fn("set_value", args) };
        this.pick_up   = function (...args) { this.call_fn("pick_up"  , args) };
        this.drop      = function (...args) { this.call_fn("drop"     , args) };
    }

    get_value(...args) {
        /** Get device/param value from main worker */
        return get_value_shared("Robot", args);
    }

    call_fn(fnName, args) {
        /* Run real version of function fnName in main thread */
        let objClass = "Robot";
        postMessage({objClass:objClass, fnName:fnName, args:args});
    }
    
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
    get_value(...args) {
        // Same as other get_value functions
        return get_value_shared("Gamepad", args);
    }
}

class KeyboardDummy {
    get_value(...args) {
        // Same as other get_value functions
        return get_value_shared("Keyboard", args);
    }
}

function get_value_shared(objClass, args) {
    /** Get device/param value from main worker */
    // Request value from main worker, and wait for response
    // https://stackoverflow.com/questions/10590213/synchronously-wait-for-message-in-web-worker
    let sab = new Int32Array(new SharedArrayBuffer(8)); // 8 bytes, need to cast to use Atomics.wait
    postMessage({objClass:objClass, fnName:"get_value", args:args, sab:sab});
    Atomics.wait(sab, 0, 0);
    console.log(sab[1])
    return sab[1];
}

/** Run student code function. */
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
