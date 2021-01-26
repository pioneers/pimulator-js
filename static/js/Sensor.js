class LineFollower{
   constructor(robot) {
     this.robot = robot;
     this.left = 0;
     this.center = 0;
     this.right = 0;
   }

   update(){
     var sensorsY = [this.robot.Y - 5*Math.cos(this.robot.dir/180*Math.PI), this.robot.Y, this.robot.Y + 5*Math.cos(this.robot.dir/180*Math.PI)]
     var sensorsX = [this.robot.X - 5*Math.sin(-this.robot.dir/180*Math.PI), this.robot.X, this.robot.X + 5*Math.sin(-this.robot.dir/180*Math.PI)]

     var tapeLines = this.robot.simulator.tapeLines
     let total = []
     let totalLine = 0
     let i = 0
     for (;i<3;i++){
       let sensor_x = sensorsX[i]
       let sensor_y = sensorsY[i]
       // https://www.geeksforgeeks.org/program-for-point-of-intersection-of-two-lines/
       let totalLine = 0
       for (const tapeLine of tapeLines){
         let m = tapeLine.slope
         if (m === "horizontal") {
           let distY = Math.abs(sensor_y-tapeLine.startY)
           if (tapeLine.startX <= sensor_x && sensor_x <= tapeLine.endX) {
             let distSquared = (distY*distY)
             totalLine += Math.min(1,3/distSquared)
           } else {
             let distX = Math.min(Math.abs(tapeLine.startX-sensor_x), Math.abs(tapeLine.endX-sensor_x))
             let distSquared = (distY*distY) + (distX*distX)
             totalLine += Math.min(1,3/distSquared)
             }
         } else if (m === "vertical") {
           let distX = Math.abs(sensor_x-tapeLine.startX)
           if (tapeLine.startY <= sensor_y && sensor_y <= tapeLine.endY) {
             let distSquared = (distX*distX)
             totalLine += Math.min(1,3/distSquared)
           } else {
             let distY = Math.min(Math.abs(tapeLine.startY-sensor_y), Math.abs(tapeLine.endY-sensor_y))
             let distSquared = (distY*distY) + (distX*distX)
             totalLine += Math.min(1,3/distSquared)
             }
           } else {
           // check if intersection point is inside the tapeLine
             if ((sensor_x < tapeLine.startX && sensor_x < tapeLine.endX) || (sensor_x > tapeLine.startX && sensor_x > tapeLine.endX)){
               let startDistX = Math.abs(sensor_x-tapeLine.startX)
               let startDistY = Math.abs(sensor_y-tapeLine.startY)
               let endDistX = Math.abs(sensor_x-tapeLine.endX)
               let endDistY = Math.abs(sensor_y-tapeLine.startY)
               let distSquared = Math.min((startDistX*startDistX+startDistY*startDistY),(endDistX*endDistX+endDistY*endDistY))
               totalLine += Math.min(1,3/distSquared)
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
             totalLine += Math.min(1,3/distSquared)
           }
         }
       }
       total.push(Math.min(totalLine, 1))
     }
     this.left = total[2]
     this.center = total[1]
     this.right = total[0]
   }
}
class TapeLine{
  constructor(x1, y1, x2, y2) {
    this.startX = x1
    this.startY = y1
    this.endX = x2
    this.endY = y2
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
  }

  update() {

  }
}
