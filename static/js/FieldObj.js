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
    constructor(x, y, w, h, color = "black") {
        super(x, y, w, h, color);
    }
}

class GrabbableObj extends FieldObj {
    constructor(x, y, w, h, color = "red") {
        super(x, y, w, h, color);
        this.attached = false;
    }

    grab() {
        this.attached = true;
    }

    release() {
        this.attached = false;
    }

    isGrabbed() {
        return this.attached;
    }
}
