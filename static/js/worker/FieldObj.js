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
