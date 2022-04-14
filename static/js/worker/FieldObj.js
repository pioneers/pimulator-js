class FieldObj {

    topL = Array(2);
    topR = Array(2);
    botL = Array(2);
    botR = Array(2);

    constructor(x, y, w, h, color) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = color;
        this.topL[0] = x;
        this.topL[1] = y;
        this.topR[0] = x + w;
        this.topR[1] = y;
        this.botL[0] = x;
        this.botL[1] = y + h;
        this.botR[0] = x + w;
        this.botR[1] = y + h;
    }
}

class Wall extends FieldObj {
    constructor(x, y, w, h, rotate=0, color="black") {
        super(x, y, w, h, color)
        rotate = 360-rotate;
        rotate = rotate * Math.PI/180;
        this.topR[0] = x + w*Math.cos(rotate);
        this.topR[1] = y + w*Math.sin(rotate);
        this.botL[0] = x + -h*Math.sin(rotate);
        this.botL[1] = y + h*Math.cos(rotate);
        this.botR[0] = x + w*Math.cos(rotate) - h*Math.sin(rotate);
        this.botR[1] = y + w*Math.sin(rotate) + h*Math.cos(rotate);

    }
}

class InteractableObj extends FieldObj {
    constructor(x, y, w, h, shape, color = "red") {
        super(x, y, w, h, color);
        this.shape = shape;
        this.attached = false;
        this.direction = 0;
    }

    attach() {
        this.attached = true;
    }

    release() {
        this.attached = false;
    }

    isAttached() {
        return this.attached;
    }

    setDirection(dir) {
        this.direction = dir;
    }
}

class InteractableCircle extends InteractableObj {
    /**
     * Defines a circular object that can be picked up.
     * @param x - x coordinate of center of circle
     * @param y - y coordinate of center of circle
     * @param r - radius of circle
     * @param color - color of circle
     * @returns value returned by RobotClass.get_value()
     */
    constructor(x, y, r, color="red") {
        // Subtract from x and y, so we can use logic for rectangle
        // but define circle using x and y as center
        super(x-r, y-r, 2.0*r, 2.0*r, "circle", color);
        this.r = 1.0 * r;

    }
}

class Ramp extends FieldObj {
    constructor(x, y, w, h, highSide = "up", incline = 15, color = "black") {
        super(x, y, w, h, color);
        this.highSide = highSide;
        this.incline = incline;
    }
}

class Button extends FieldObj {
    //button coordinates
    bTopL = Array(2);
    bTopR = Array(2);
    bBotL = Array(2);
    bBotR = Array(2);

    constructor(x, y, w, h, color, buttonColor, buttonLocation = "left") {
        super(x, y, w, h, color);
        this.numTimesPressed = 0;
        this.buttonColor = buttonColor;
        this.buttonLocation = buttonLocation; // must be in {"left", "right", "top", "bottom"} relative to normal x-y coordinates

        if (this.buttonLocation === "left") {
            this.bTopR[0] = this.topL[0]
            this.bTopR[1] = (3*this.topL[1]+this.botL[1])/4

            this.bBotR[0] = this.botL[0]
            this.bBotR[1] = (this.topL[1]+3*this.botL[1])/4

            this.bBotL[0] = this.botL[0]-1
            this.bBotL[1] = (this.topL[1]+3*this.botL[1])/4

            this.bTopL[0] = this.topL[0]-1
            this.bTopL[1] = (3*this.topL[1]+this.botL[1])/4
        } else if (this.buttonLocation === "right") {
            this.bTopL[0] = this.topR[0]
            this.bTopL[1] = (3*this.topR[1]+this.botR[1])/4

            this.bBotL[0] = this.botR[0]
            this.bBotL[1] = (this.topR[1]+3*this.botR[1])/4

            this.bBotR[0] = this.botR[0]+1
            this.bBotR[1] = (this.topR[1]+3*this.botR[1])/4

            this.bTopR[0] = this.topR[0]+1
            this.bTopR[1] = (3*this.topR[1]+this.botR[1])/4
        } else if (this.buttonLocation === "top") {
            this.bBotL[0] = (3*this.topL[0]+this.topR[0])/4
            this.bBotL[1] = this.topL[1]

            this.bBotR[0] = (this.topL[0]+3*this.topR[0])/4
            this.bBotR[1] = this.topR[1]

            this.bTopR[0] = (this.topL[0]+3*this.topR[0])/4
            this.bTopR[1] = this.topR[1]-1

            this.bTopL[0] = (3*this.topL[0]+this.topR[0])/4
            this.bTopL[1] = this.topL[1]-1
        } else { // down
            this.bTopL[0] = (3*this.botL[0]+this.botR[0])/4
            this.bTopL[1] = this.botL[1]

            this.bTopR[0] = (this.botL[0]+3*this.botR[0])/4
            this.bTopR[1] = this.botR[1]

            this.bBotR[0] = (this.botL[0]+3*this.botR[0])/4
            this.bBotR[1] = this.botR[1]+1

            this.bBotL[0] = (3*this.botL[0]+this.botR[0])/4
            this.bBotL[1] = this.botL[1]+1
        }
    }

    press() {
        this.numTimesPressed += 1;
    }

    getCount() {
        return this.numTimesPressed;
    }
}

class Receiver extends Button {
    //platform coordinates
    pTopL = Array(2);
    pTopR = Array(2);
    pBotL = Array(2);
    pBotR = Array(2);

    constructor(x, y, w = 4, h = 4, color = "gray", buttonColor = "green", buttonLocation = "left", limit = 1) {
        super(x, y, w, h, color, buttonColor, buttonLocation);
        this.limit = limit;

        if (this.buttonLocation === "left") {
            this.pTopL[0] = this.botL[0] - this.w
            this.pTopL[1] = this.botL[1]

            this.pTopR[0] = this.botR[0]
            this.pTopR[1] = this.botR[1]

            this.pBotR[0] = this.botR[0]
            this.pBotR[1] = this.botR[1] + 2*this.h

            this.pBotL[0] = this.botL[0] - this.w
            this.pBotL[1] = this.botL[1] + 2*this.h
        } else if (this.buttonLocation === "right") {
            this.pBotL[0] = this.topL[0]
            this.pBotL[1] = this.topL[1]

            this.pBotR[0] = this.topR[0] + this.w
            this.pBotR[1] = this.topR[1]

            this.pTopR[0] = this.topR[0] + this.w
            this.pTopR[1] = this.topR[1] - 2*this.h

            this.pTopL[0] = this.topL[0]
            this.pTopL[1] = this.topL[1] - 2*this.h
        } else if (this.buttonLocation === "top") {
            this.pTopR[0] = this.topL[0]
            this.pTopR[1] = this.topL[1] - this.h

            this.pBotR[0] = this.botL[0]
            this.pBotR[1] = this.botL[1]

            this.pBotL[0] = this.botL[0] - 2*this.w
            this.pBotL[1] = this.botL[1]

            this.pTopL[0] = this.topL[0] - 2*this.w
            this.pTopL[1] = this.topL[1] - this.h
        } else { // down
            this.pTopL[0] = this.topR[0]
            this.pTopL[1] = this.topR[1]

            this.pBotL[0] = this.botR[0]
            this.pBotL[1] = this.botR[1] + this.h

            this.pBotR[0] = this.botR[0] + 2*this.w
            this.pBotR[1] = this.botR[1] + this.h

            this.pTopR[0] = this.topR[0] + 2*this.w
            this.pTopR[1] = this.topR[1]
        }
    }

    canDeployPioneer() {
        return this.getCount() < this.limit;
    }
}

class Refinery extends FieldObj {
    constructor(x, y, w = 15, h = 15, highSide = "left", color = "gray") {
        super(x, y, w, h, color);
        this.highSide = highSide;
        this.ore = 0;
    }

    numOre() {
        return this.ore;
    }

    addOre() {
        this.ore += 1;
    }
}

class Ore extends InteractableCircle {
    constructor(x, y, type = "stone", radius = 1.1) {
        if (type === "stone") {
            super(x, y, 1.1, "gray");
            this.type = "stone";
        } else {
            super(x, y, 0.75, "yellow");
            this.type = "iron";
        }
        this.is_ore = true;
    }
}

// Ore counts are hardcoded to be 15 for stone, 5 for iron.
class Quarry extends InteractableObj {
    constructor (x, y , w, h, orientation="down", color ='blue') {
        super(x, y, w, h, color);
        this.color = color;
        this.orientation = orientation;
        this.stones = [];
        this.irons = [];
        for (let i = 0; i < 15; i++) {
            let rand_x = 2 + Math.random(0,1) * (this.topR[0] - this.topL[0] - 3); // Gets the distance it is from the left of the quarry
            let rand_y = 2 + Math.random(0,1) * (this.botR[1] - this.topR[1] - 3);
            this.stones.push(new Ore(rand_x, rand_y, "stone", 1.1));
          }
        for (let k = 0; k < 5; k ++) {
            let rand_x = 2 + Math.random(0,1) * (this.topR[0] - this.topL[0] - 3); // Gets the distance it is from the left of the quarry
            let rand_y = 2 + Math.random(0,1) * (this.botR[1] - this.topR[1] - 3);
            this.irons.push(new Ore(rand_x, rand_y, "iron", 0.75));
        }
    } 
}

class Campsite extends FieldObj {
    constructor(x, y, w = 20, h = 9, color = "tan") {
        super(x, y, w, h, color);
        this.possSpinner = {0: "neutral", 1: "neutral", 2: "neutral", 3: "gold 3", 4: "gold 2", 5: "gold 1", 6: "blue 1", 7: "blue 2", 8: "blue 3"};
        this.spinnerNum = 1;
        this.centerX = x + (w / 2);
        this.centerY = y + (h / 2);
    }

    spin() {
        this.spinnerNum = (this.spinnerNum + 1) % 9;
    }
}
