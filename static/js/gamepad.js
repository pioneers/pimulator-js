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

function resetInfo(e) {
    heading.innerText = 'No controller connected!';
    message.innerText = 'Please connect a controller and press any key to start.';
};

function updateInfo(e) {
    const { gamepad } = e;

    heading.innerText = 'Controller connected!';
    message.innerText = gamepad.id;
};

function clearPadVals() {
    for (let key in padMap) {
        document.getElementById(key).innerText = padMap[key] + ": ";
    }
}

resetInfo();
joypad.on('connect', e => {
    console.log("gamepad connected");
    console.log(e);
    return updateInfo(e)
});
joypad.on('disconnect', e => {
    console.log(e);
    return resetInfo(e);
});
joypad.set({
    axisMovementThreshold: 0.05
});
joypad.on('button_press', e => {
    console.log(e.detail);
    const buttonName = e.detail.buttonName;
    clearPadVals();
    document.getElementById(buttonName).innerText = padMap[buttonName] + ": 1";
    if (mode === "teleop") {
        if (inputMode === "gamepad") {
            if (e.detail.pressed) {
                worker.postMessage({keyMode: inputMode, isButton: true, button: buttonName, up: false});
            } else {
                worker.postMessage({keyMode: inputMode, isButton: true, button: buttonName, up: true});
            }
        }
    }
});
joypad.on('axis_move', e => {
    console.log(e.detail);
    const axisName = "axis_" + e.detail.axis;
    clearPadVals();
    document.getElementById(axisName).innerText = padMap[axisName] + ": " + e.detail.axisMovementValue;
    if (mode === "teleop") {
        if (inputMode === "gamepad") {
            if (e.detail.axisMovementValue > 0.7) {
                worker.postMessage({keyMode: inputMode, isButton: false, axis: e.detail.axis, value: e.detail.axisMovementValue, up: false}); //Left Joystick Right
            } else if (e.detail.axisMovementValue < -0.7) {
                worker.postMessage({keyMode: inputMode, isButton: false, axis: e.detail.axis, value: e.detail.axisMovementValue, up: false}); //Left Joystick Left
            } else {
                worker.postMessage({keyMode: inputMode, isButton: false, axis: e.detail.axis, value: 0, up: true});
            }
        }
    }
});
