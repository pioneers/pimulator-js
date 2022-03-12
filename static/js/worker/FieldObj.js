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
    constructor(x, y, w, h, rotate = 0, color = "black") {
        super(x, y, w, h, color)
        rotate = 360-rotate
        rotate = rotate * Math.PI/180
        this.topR[0] = x + w*Math.cos(rotate);
        this.topR[1] = y + w*Math.sin(rotate);
        this.botL[0] = x + -h*Math.sin(rotate);
        this.botL[1] = y + h*Math.cos(rotate);
        this.botR[0] = x + w*Math.cos(rotate) - h*Math.sin(rotate);
        this.botR[1] = y + w*Math.sin(rotate) + h*Math.cos(rotate);

    }
}

class InteractableObj extends FieldObj {
    constructor(x, y, w, h, color = "red") {
        super(x, y, w, h, color);
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

class Ramp extends FieldObj {
    constructor(x, y, w, h, highSide = "up", incline = 15, color = "black") {
        super(x, y, w, h, color);
        this.highSide = highSide;
        this.incline = incline;
    }
}

class Ore extends InteractableObj {
    constructor(x, y, type = "stone", radius = 1.1) {
        if (type === "stone") {
            super(x, y ,2.2, 2.2,"gray");
            this.type = "stone";
            this.r = 1.1;
        } else {
            super(x, y, 1.5, 1.5, "blue");
            this.type = "iron";
            this.r = 0.75

        }
        this.shape == "circle";
    }
}

// Ore counts are hardcoded to be 15 for stone, 5 for iron.
class Quarry extends InteractableObj {
    constructor (x, y , w, h, orientation = "down", color = 'blue') {
        super (x, y, w, h, color);
        this.orientation = orientation;
        this.stones = [];
        this.irons = [];
        for (let i = 0; i < 15; i++) {
            let rand_x = Math.random(0,1)* (this.topR[0] - this.topL[0] - 2); // Gets the distance it is from the left of the quarry
            let rand_y = Math.random(0,1)* (this.botR[1] - this.topR[1] - 2);
            this.stones.push(new Ore(rand_x, rand_y, "stone"));    
          }
        for (let k = 0; k < 5; k ++) {
            let rand_x = Math.random(0,1)* (this.topR[0] - this.topL[0] - 2); // Gets the distance it is from the left of the quarry
            let rand_y = Math.random(0,1)* (this.botR[1] - this.topR[1] - 2);
            this.irons.push(new Ore(rand_x, rand_y, "iron"));
        }
    } 

}