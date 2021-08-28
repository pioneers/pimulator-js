class LineFollower{
   constructor(robot) {
     this.robot = robot;
     this.left = 0;
     this.center = 0;
     this.right = 0;
   }

   update(){
     var frontCenter = [(this.robot.topL[0] + this.robot.topR[0]) / 2, (this.robot.topL[1] + this.robot.topR[1]) / 2]
     var sensorsY = [frontCenter[1] - 3*Math.cos(this.robot.dir/180*Math.PI), frontCenter[1], frontCenter[1] + 3*Math.cos(this.robot.dir/180*Math.PI)]
     var sensorsX = [frontCenter[0] - 3*Math.sin(-this.robot.dir/180*Math.PI), frontCenter[0], frontCenter[0] + 3*Math.sin(-this.robot.dir/180*Math.PI)]
     
     const maxReading = 1.2 // Max sensor reading, before clipping to 1
     var tapeLines = this.robot.simulator.tapeLines
     let total = []
     let i = 0
     for (;i<3;i++){
       let sensor_x = sensorsX[i]
       let sensor_y = sensorsY[i]
       // https://www.geeksforgeeks.org/program-for-point-of-intersection-of-two-lines/
       let totalLine = []
       for (const tapeLine of tapeLines){
         let m = tapeLine.slope
         if (m === "horizontal") {
           let distY = Math.abs(sensor_y-tapeLine.startY)
           if ((tapeLine.startX <= sensor_x && sensor_x <= tapeLine.endX) || (tapeLine.startX >= sensor_x && sensor_x >= tapeLine.endX)){
             let distSquared = (distY*distY)
             totalLine.push(Math.min(1,maxReading/distSquared))
           } else {
             let distX = Math.min(Math.abs(tapeLine.startX-sensor_x), Math.abs(tapeLine.endX-sensor_x))
             let distSquared = (distY*distY) + (distX*distX)
             totalLine.push(Math.min(1,maxReading/distSquared))
             }
         } else if (m === "vertical") {
           let distX = Math.abs(sensor_x-tapeLine.startX)
           if ((tapeLine.startY <= sensor_y && sensor_y <= tapeLine.endY) || (tapeLine.startY >= sensor_y && sensor_y >= tapeLine.endY)) {
             let distSquared = (distX*distX)
             totalLine.push(Math.min(1,maxReading/distSquared))
           } else {
             let distY = Math.min(Math.abs(tapeLine.startY-sensor_y), Math.abs(tapeLine.endY-sensor_y))
             let distSquared = (distY*distY) + (distX*distX)
             totalLine.push(Math.min(1,maxReading/distSquared))
             }
           } else {
           // check if intersection point is inside the tapeLine
             if ((sensor_x < tapeLine.startX && sensor_x < tapeLine.endX) || (sensor_x > tapeLine.startX && sensor_x > tapeLine.endX)){
               let startDistX = Math.abs(sensor_x-tapeLine.startX)
               let startDistY = Math.abs(sensor_y-tapeLine.startY)
               let endDistX = Math.abs(sensor_x-tapeLine.endX)
               let endDistY = Math.abs(sensor_y-tapeLine.startY)
               let distSquared = Math.min((startDistX*startDistX+startDistY*startDistY),(endDistX*endDistX+endDistY*endDistY))
               totalLine.push(Math.min(1,maxReading/distSquared))
           } else {
             let m1 = -1/m
             let c = tapeLine.y_int
             let c1 = sensor_y-m1*sensor_x
             let determinant = -m + m1
             let x = (c - c1)/determinant
             let y = (-m*c1 + m1*c)/determinant
             let distX = Math.abs(sensor_x-x)
             let distY = Math.abs(sensor_y-y)
             let distSquared = (distX*distX)+(distY*distY)
             totalLine.push(Math.min(1,maxReading/distSquared))
           }
         }
       }
       total.push(Math.max.apply(null, totalLine))
     }
     this.left = total[2]
     this.center = total[1]
     this.right = total[0]
   }
}
class TapeLine{
  constructor(x1, y1, x2, y2, color = "green") {
    this.startX = x1
    this.startY = y1
    this.endX = x2
    this.endY = y2
    this.color = color
    if (this.startX === this.endX) {
      this.slope = "vertical"
    } else if (this.startY === this.endY) {
      this.slope = "horizontal"
    } else {
      this.slope = (y1-y2) / (x1-x2);
      this.y_int = y1 - this.slope*x1
    }
  }
}

class LimitSwitch{
  constructor(robot) {
    this.robot = robot;
    this.switch0 = false;
    this.switch1 = false;
    this.leeway = 1; // in inches
  }

  update() {
    this.switch0 = false;
    this.switch1 = false;

    const width = 5;
    const height = this.leeway;
    const b = (this.robot.width - width) / 2;

    let collidableRegionFront = {topR: Array(2), topL: Array(2), botL: Array(2), botR: Array(2)};
    collidableRegionFront.botL[0] = this.robot.topL[0] + b * Math.cos((90.0 - this.robot.dir) * Math.PI / 180);
    collidableRegionFront.botL[1] = this.robot.topL[1] - b * Math.sin((90.0 - this.robot.dir) * Math.PI / 180);
    collidableRegionFront.topL[0] = collidableRegionFront.botL[0] - height * Math.cos(this.robot.dir * Math.PI / 180);
    collidableRegionFront.topL[1] = collidableRegionFront.botL[1] - height * Math.sin(this.robot.dir * Math.PI / 180);
    collidableRegionFront.topR[0] = collidableRegionFront.topL[0] + width * Math.sin(this.robot.dir * Math.PI / 180);
    collidableRegionFront.topR[1] = collidableRegionFront.topL[1] - width * Math.cos(this.robot.dir * Math.PI / 180);
    collidableRegionFront.botR[0] = collidableRegionFront.botL[0] + width * Math.sin(this.robot.dir * Math.PI / 180);
    collidableRegionFront.botR[1] = collidableRegionFront.botL[1] - width * Math.cos(this.robot.dir * Math.PI / 180);
    for (let obstacle of this.robot.simulator.obstacles) {
        if (obstacle !== this.robot.attachedObj && this.robot.intersectOne(obstacle, collidableRegionFront)) {
          this.switch0 = true;
          break;
        }
    }

    let collidableRegionBack = {topR: Array(2), topL: Array(2), botL: Array(2), botR: Array(2)};
    collidableRegionBack.botL[0] = this.robot.botR[0] - b * Math.cos((90.0 - this.robot.dir) * Math.PI / 180);
    collidableRegionBack.botL[1] = this.robot.botR[1] + b * Math.sin((90.0 - this.robot.dir) * Math.PI / 180);
    collidableRegionBack.topL[0] = collidableRegionBack.botL[0] + height * Math.cos(this.robot.dir * Math.PI / 180);
    collidableRegionBack.topL[1] = collidableRegionBack.botL[1] + height * Math.sin(this.robot.dir * Math.PI / 180);
    collidableRegionBack.topR[0] = collidableRegionBack.topL[0] - width * Math.sin(this.robot.dir * Math.PI / 180);
    collidableRegionBack.topR[1] = collidableRegionBack.topL[1] + width * Math.cos(this.robot.dir * Math.PI / 180);
    collidableRegionBack.botR[0] = collidableRegionBack.botL[0] - width * Math.sin(this.robot.dir * Math.PI / 180);
    collidableRegionBack.botR[1] = collidableRegionBack.botL[1] + width * Math.cos(this.robot.dir * Math.PI / 180);
    for (let obstacle of this.robot.simulator.obstacles) {
        if (this.robot.intersectOne(obstacle, collidableRegionBack)) {
          this.switch1 = true;
          break;
        }
    }

  }

}
