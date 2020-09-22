var simulator = new Simulator();

function uploadCode() {
    if (typeof pyodide != "undefined" && typeof pyodide.version != "undefined") {
        code = cm.getValue();
        // alert("Code uploaded");
    }
    else {
        alert("Simulator has not finished loading. Try again in a moment.")
    }
};

function update(state) {
    /*
    Update the state (position and direction) of the robot.
    Example of state: {x:72, y:72, dir:0}
    */
    // console.log("StateX")
    // console.log(state.x)
    document.getElementById("demo").innerHTML = state.x.toFixed(2) + ", " + state.y.toFixed(2)
    var robotRect = document.querySelector("rect")
    // console.log("SVG")
    // console.log(robotRect)
    robotRect.setAttributeNS(null, "x", state.x)
    robotRect.setAttributeNS(null, "y", state.y)
    var rotateStr = "rotate(" + state.dir + " " + (state.x + 15*scaleFactor) + " " + (state.y + 20*scaleFactor) + ")"
    // console.log(rotateStr)
    robotRect.setAttribute("transform", rotateStr)
    // console.log("Adjusted")
};

function start(auto=0) {
    /*
    Start the robot thread
    Return if started robot thread
    */
    if (simulator.isRunning == true) {
        return;
    }
    else {
        if (auto === 0) {
            simulator.simulateTeleop();
        }
        else if (auto === 1) {
            simulator.simulateAuto();
        }
        // We utilize a daemon thread to such that the thread exits even if we
        // do not exit gracefully from __main__
        // robotWorker = new Worker("{{ url_for('static', filename='js/pimulator.js') }}");
        // robotWorker = threading.Thread(group=None, target=pimulator.main, args=(stateQueue,auto,stop),
        //                                name="robot thread", daemon=True)
        console.log("robot started");
    }
};

function stop() {
    /*
    Stop the robot thread
    */
    simulator.stop();
    update({x:140, y:140, dir:0});
};
