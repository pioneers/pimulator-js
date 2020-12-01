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
