function FieldObj() {
    if (!(this instanceof FieldObj)) {
        return new FieldObj;
    }
    this.x=0;
    this.y=0;
    this.w=0;
    this.h=0;
}

class Wall extends FieldObj {

    topL = Array(2);
    topR = Array(2);
    botL = Array(2);
    botR = Array(2);

    constructor(x, y, w, h, color = "black") {
        super();
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
