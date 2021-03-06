/*
 * A map that maps the button name to its name in the Robot API
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
    axis_0: "axis_0",
    axis_1: "axis_1",
    axis_2: "axis_2",
    axis_3: "axis_3",
}

/*
 * Reset the Game Controller information
 */
function resetInfo(e) {
    heading.innerText = 'No controller connected!';
    message.innerText = 'Please connect a controller and press any key to start.';
};

/*
 * Update the status of a connected Game Controller
 */
function updateInfo(e) {
    const { gamepad } = e;

    heading.innerText = 'Controller connected!';
    message.innerText = gamepad.id;
};

/*
 * Clear all of the gamepad value readings
 */
function clearPadVals() {
    for (let key in padMap) {
        document.getElementById(key).innerText = padMap[key] + ": ";
    }
}

// Reset once before doing anything
resetInfo();

/*
 * Defines what happens when a Game Controller is connected to your computer
 */
joypad.on('connect', e => {
    console.log("gamepad connected");
    console.log(e);
    return updateInfo(e)
});

/*
 * Defines what happens when a Game Controller is disconnected from your computer
 */
joypad.on('disconnect', e => {
    console.log(e);
    return resetInfo(e);
});

/*
 * Defines the threshold that must be exceeded for an axis to be considered to be 'moved'
 */
joypad.set({
    axisMovementThreshold: 0.05
});

/*
 * Defines what happens when a Game Controller button is pressed
 */
joypad.on('button_press', e => {
    console.log(e.detail);
    const buttonName = e.detail.buttonName;
    if (mode === "teleop") {
        if (inputMode === "gamepad") {
            if (e.detail.pressed) {
                worker.postMessage({keyMode: inputMode, isButton: true, button: buttonName, up: false});
            } else {
                worker.postMessage({keyMode: inputMode, isButton: true, button: buttonName, up: true});
            }
        }
    }
    if (e.detail.pressed) {
        document.getElementById(buttonName).innerText = padMap[buttonName] + ": 1";
    } else {
        document.getElementById(buttonName).innerText = padMap[buttonName] + ": 0";
    }
});

/*
 * Defines what happens when a Game Controller axis is moved
 */
joypad.on('axis_move', e => {
    console.log(e.detail);
    const axisName = "axis_" + e.detail.axis;
    var axisVal;
    if (e.detail.axis === 1 || e.detail.axis === 3) {
        axisVal = -1 * e.detail.axisMovementValue;
    } else { // Horizontal Axis
        axisVal = e.detail.axisMovementValue;
    }
    document.getElementById(axisName).innerText = padMap[axisName] + ": " + axisVal;
    if (mode === "teleop") {
        if (inputMode === "gamepad") {
            if (axisVal > 0.7 || axisVal < -0.7) { // Past local threshold
                worker.postMessage({keyMode: inputMode, isButton: false, axis: e.detail.axis, value: axisVal, up: false});
            } else {
                worker.postMessage({keyMode: inputMode, isButton: false, axis: e.detail.axis, value: 0, up: true});
            }
        }
    }
});
