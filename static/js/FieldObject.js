function FieldObj() {
    if (!(this instanceof FieldObj)) {
        return new FieldObj;
    }
    this.color;
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

    constructor(x, y, w, h) {
        super();
        this.x = (132/400) * x; //change 132 value it is speculative
        this.y = (132/400) * y;
        this.w = (132/400) * w;
        this.h = (132/400) * h;
        this.topL[0] = x;
        this.topL[1] = y;
        this.topR[0] = x + w;
        this.topR[1] = y;
        this.botL[0] = x;
        this.botL[1] = y + h;
        this.botR[0] = x + w;
        this.botR[1] = y + h;
        //ctx.beginPath()
        //ctx.strokeRect(this.x, this.y, this.w, this.h)
        obstacles.push(this);
    }
}
