importScripts("https://pyodide-cdn2.iodide.io/v0.15.0/full/pyodide.js");

var code = "";
var env = {};
languagePluginLoader.then(() => function () {});

const SCREENHEIGHT = 48
const SCREENWIDTH = 48
dc = 0;
count1 = 0;
count2 = 0;
obstacles = Array();

class RobotClass {
    /*The MODEL for this simulator. Stores robot data and handles position
       calculations & Runtime API calls """*/
    tickRate = 50;          // in ms
    width = 26.7;                  // width of robot , inches
    height = 20;
    wRadius = 2;                // radius of a wheel, inches
    MaxX = 144;                 // maximum X value, inches, field is 12'x12'
    MaxY = 144;                 // maximum Y value, inches, field is 12'x12'
    neg = -1;                    // negate left motor calculation
    startX = 70.0;
    startY = 70.0;
    topL = Array(2);
    topR = Array(2);
    botL = Array(2);
    botR = Array(2);

    constructor(queue=null) {
      this.X = this.startX;           // X position of the robot
      this.Y = this.startY;           // Y position of the robot
      this.Wl = 0.0;           // angular velocity of l wheel, radians/s
      this.Wr = 0.0;           // angular velocity of r wheel, radians/s
      this.ltheta = 0.0;       // angular position of l wheel, degrees
      this.rtheta = 0.0;       // angular position of r wheel, degrees
      this.dir = 0.0;          // Direction of the robot facing, degrees


      //corners are relative to the robot facing up

      //coordinates for top right corner of robot
      this.topR[0] = this.X - this.height/2;
      this.topR[1] = this.Y - this.width/2;

      //coordinates for top left corner of robot
      this.topL[0] = this.X - this.height/2;
      this.topL[1] = this.Y + this.width/2;

      //coordinates for bottom right corner
      this.botR[0] = this.X + this.height/2;
      this.botR[1] = this.Y - this.width/2;

      //coordinates for bottom left corner
      this.botL[0] = this.X + this.height/2;
      this.botL[1] = this.Y + this.width/2;

      // All asychronous functions currently running
      this.runningCoroutines = new Set();

      // Ensure we don't hit sync errors when updating our values
      this.queue = queue;
    }

    intersectRobotRef(obj) {
      // coordinates of the k_i vectors
      var k1x = obj.botL[0] - this.botL[0]; //x of the vector from botL of robot to botL of obstacle
      var k1y = obj.botL[1] - this.botL[1]; //figure it out from here...
      var k2x = obj.topL[0] - this.botL[0];
      var k2y = obj.topL[1] - this.botL[1];
      var k3x = obj.topR[0] - this.botL[0];
      var k3y = obj.topR[1] - this.botL[1];
      var k4x = obj.botR[0] - this.botL[0];
      var k4y = obj.botR[1] - this.botL[1];

      // vector from botL to botR of robot
      var ref1x = this.botR[0] - this.botL[0];
      var ref1y = this.botR[1] - this.botL[1];

      // vector from botL to topL of robot
      var ref2x = this.topL[0] - this.botL[0];
      var ref2y = this.topL[1] - this.botL[1];

      // make the ref1 vector into a unit vector
      var ref1mag = Math.sqrt(ref1x * ref1x + ref1y * ref1y);
      var ref1x = ref1x / ref1mag;
      var ref1y = ref1y / ref1mag;

      // make the ref2 vector into a unit vector
      var ref2mag = Math.sqrt(ref2x * ref2x + ref2y * ref2y);
      var ref2x = ref2x / ref2mag;
      var ref2y = ref2y / ref2mag;

      var k1ref1ProjLen = k1x * ref1x + k1y * ref1y;
      var k2ref1ProjLen = k2x * ref1x + k2y * ref1y;
      var k3ref1ProjLen = k3x * ref1x + k3y * ref1y;
      var k4ref1ProjLen = k4x * ref1x + k4y * ref1y;

      var ref1inter = true;

      if (this.findMax(k1ref1ProjLen, k2ref1ProjLen, k3ref1ProjLen, k4ref1ProjLen) >= ref1mag) {
        if (this.findMin(k1ref1ProjLen, k2ref1ProjLen, k3ref1ProjLen, k4ref1ProjLen) >= ref1mag) {
          ref1inter = false;
        }
      } else if (this.findMax(k1ref1ProjLen, k2ref1ProjLen, k3ref1ProjLen, k4ref1ProjLen) <= 0) {
        if (this.findMin(k1ref1ProjLen, k2ref1ProjLen, k3ref1ProjLen, k4ref1ProjLen) <= 0) {
          ref1inter = false;
        }
      }

      var k1ref2ProjLen = k1x * ref2x + k1y * ref2y;
      var k2ref2ProjLen = k2x * ref2x + k2y * ref2y;
      var k3ref2ProjLen = k3x * ref2x + k3y * ref2y;
      var k4ref2ProjLen = k4x * ref2x + k4y * ref2y;

      var ref2inter = true;

      if (this.findMax(k1ref2ProjLen, k2ref2ProjLen, k3ref2ProjLen, k4ref2ProjLen) >= ref2mag) {
        if (this.findMin(k1ref2ProjLen, k2ref2ProjLen, k3ref2ProjLen, k4ref2ProjLen) >= ref2mag) {
          ref2inter = false;
        }
      } else if (this.findMax(k1ref2ProjLen, k2ref2ProjLen, k3ref2ProjLen, k4ref2ProjLen) <= 0) {
        if (this.findMin(k1ref2ProjLen, k2ref2ProjLen, k3ref2ProjLen, k4ref2ProjLen) <= 0) {
          ref2inter = false;
        }
      }

      return ref1inter && ref2inter;
    }

    intersectObjRef(obj) {
      // coordinates of the k_i vectors
      var k1x = this.botL[0] - obj.botL[0]; //x of the vector from botL of obj to botL of robot
      var k1y = this.botL[1] - obj.botL[1]; //figure it out from here...
      var k2x = this.topL[0] - obj.botL[0];
      var k2y = this.topL[1] - obj.botL[1];
      var k3x = this.topR[0] - obj.botL[0];
      var k3y = this.topR[1] - obj.botL[1];
      var k4x = this.botR[0] - obj.botL[0];
      var k4y = this.botR[1] - obj.botL[1];

      // vector from botL to botR of obj
      var ref1x = obj.botR[0] - obj.botL[0];
      var ref1y = obj.botR[1] - obj.botL[1];

      // vector from botL to topL of obj
      var ref2x = obj.topL[0] - obj.botL[0];
      var ref2y = obj.topL[1] - obj.botL[1];

      // make the ref1 vector into a unit vector
      var ref1mag = Math.sqrt(ref1x * ref1x + ref1y * ref1y);
      var ref1x = ref1x / ref1mag;
      var ref1y = ref1y / ref1mag;

      // make the ref2 vector into a unit vector
      var ref2mag = Math.sqrt(ref2x * ref2x + ref2y * ref2y);
      var ref2x = ref2x / ref2mag;
      var ref2y = ref2y / ref2mag;

      var k1ref1ProjLen = k1x * ref1x + k1y * ref1y;
      var k2ref1ProjLen = k2x * ref1x + k2y * ref1y;
      var k3ref1ProjLen = k3x * ref1x + k3y * ref1y;
      var k4ref1ProjLen = k4x * ref1x + k4y * ref1y;

      var ref1inter = true;

      if (this.findMax(k1ref1ProjLen, k2ref1ProjLen, k3ref1ProjLen, k4ref1ProjLen) > ref1mag) {
        if (this.findMin(k1ref1ProjLen, k2ref1ProjLen, k3ref1ProjLen, k4ref1ProjLen) > ref1mag) {
          ref1inter = false;
        }
      } else if (this.findMax(k1ref1ProjLen, k2ref1ProjLen, k3ref1ProjLen, k4ref1ProjLen) < 0) {
        if (this.findMin(k1ref1ProjLen, k2ref1ProjLen, k3ref1ProjLen, k4ref1ProjLen) < 0) {
          ref1inter = false;
        }
      }

      var k1ref2ProjLen = k1x * ref2x + k1y * ref2y;
      var k2ref2ProjLen = k2x * ref2x + k2y * ref2y;
      var k3ref2ProjLen = k3x * ref2x + k3y * ref2y;
      var k4ref2ProjLen = k4x * ref2x + k4y * ref2y;

      var ref2inter = true;

      if (this.findMax(k1ref2ProjLen, k2ref2ProjLen, k3ref2ProjLen, k4ref2ProjLen) > ref2mag) {
        if (this.findMin(k1ref2ProjLen, k2ref2ProjLen, k3ref2ProjLen, k4ref2ProjLen) > ref2mag) {
          return false;
        }
      } else if (this.findMax(k1ref2ProjLen, k2ref2ProjLen, k3ref2ProjLen, k4ref2ProjLen) < 0) {
        if (this.findMin(k1ref2ProjLen, k2ref2ProjLen, k3ref2ProjLen, k4ref2ProjLen) < 0) {
          return false;
        }
      }

      return ref1inter && ref2inter;
    }

    intersectOne(obj) {
      return this.intersectRobotRef(obj) && this.intersectObjRef(obj);
    }

    findMax(k1, k2, k3, k4) {
      var max = k1;
      if (k2 > max) {
        max = k2;
      }
      if (k3 > max) {
        max = k3;
      }
      if (k4 > max) {
        max = k4;
      }
      return max;
    }

    findMin(k1, k2, k3, k4) {
      var min = k1;
      if (k2 < min) {
        min = k2;
      }
      if (k3 < min) {
        min = k3;
      }
      if (k4 < min) {
        min = k4;
      }
      return min;
    }

    intersectOneOld(objX1, objY1, objX2, objY2) {

      var A1 = 0 != (objX1 - objX2) ? (objY1 - objY2) / (objX1 - objX2) : 500000;
      var A2 = 0 != (this.topL[0] - this.topR[0]) ? (this.topL[1] - this.topR[1]) / (this.topL[0] - this.topR[0]) : 500000;
      var b1 = objY1 - A1 * objX1;
      var b2 = this.topL[1] - A2 * this.topL[0];
      var Xa = 0 != A1 - A2 ? (b2 - b1) / (A1 - A2) : -500000;
      if (Xa > Math.max(Math.min(objX1, objX2), Math.min(this.topL[0], this.topR[0])) &&
          Xa < Math.min(Math.max(objX1, objX2), Math.max(this.topL[0], this.topR[0]))) {
            return true;
      }

      A1 = 0 != (objX1 - objX2) ? (objY1 - objY2) / (objX1 - objX2) : 500000;
      A2 = 0 != (this.botR[0] - this.topR[0]) ? (this.botR[1] - this.topR[1]) / (this.botR[0] - this.topR[0]) : 500000;
      b1 = objY1 - A1 * objX1;
      b2 = this.botR[1] - A2 * this.botR[0];
      Xa = 0 != A1 - A2 ? (b2 - b1) / (A1 - A2) : -500000;
      if (Xa > Math.max(Math.min(objX1, objX2), Math.min(this.botR[0], this.topR[0])) &&
          Xa < Math.min(Math.max(objX1, objX2), Math.max(this.botR[0], this.topR[0]))) {
            return true;
      }

      A1 = 0 != (objX1 - objX2) ? (objY1 - objY2) / (objX1 - objX2) : 500000;
      A2 = 0 != (this.botR[0] - this.botL[0]) ? (this.botR[1] - this.botL[1]) / (this.botR[0] - this.botL[0]) : 500000;
      b1 = objY1 - A1 * objX1;
      b2 = this.botR[1] - A2 * this.botR[0];
      Xa = 0 != A1 - A2 ? (b2 - b1) / (A1 - A2) : -500000;
      if (Xa > Math.max(Math.min(objX1, objX2), Math.min(this.botR[0], this.botL[0])) &&
          Xa < Math.min(Math.max(objX1, objX2), Math.max(this.botR[0], this.botL[0]))) {
            return true;
      }

      A1 = 0 != (objX1 - objX2) ? (objY1 - objY2) / (objX1 - objX2) : 500000;
      A2 = 0 != (this.topL[0] - this.botL[0]) ? (this.topL[1] - this.botL[1]) / (this.topL[0] - this.botL[0]) : 500000;
      b1 = objY1 - A1 * objX1;
      b2 = this.topL[1] - A2 * this.topL[0];
      Xa = 0 != A1 - A2 ? (b2 - b1) / (A1 - A2) : -500000;
      if (Xa > Math.max(Math.min(objX1, objX2), Math.min(this.topL[0], this.botL[0])) &&
          Xa < Math.min(Math.max(objX1, objX2), Math.max(this.topL[0], this.botL[0]))) {
            return true;
      }

      return false;
    }

    set_value(device, param, speed) {
        /* Runtime API method for updating L/R motor speed. Takes only L/R
           Motor as device name and speed bounded by [-1,1]. */
        if (speed > 1.0 || speed < -1.0){
            throw new Error("Speed cannot be great than 1.0 or less than -1.0.");
        }
        if (param !== "duty_cycle") {
            throw new Error('"duty_cycle" is the only currently supported parameter');
        }
        if (device === "left_motor") {
            this.Wl = speed * 9;
        } else if (device === "right_motor") {
            this.Wr = speed * 9;
        } else {
            throw new Error("Cannot find device name: " + device);
        }
    }

    updatePosition() {
        //count1++;
        //console.log(count1, " ");
        /* Updates position of the  Robot using differential drive equations
        Derived with reference to:
        https://chess.eecs.berkeley.edu/eecs149/documentation/differentialDrive.pdf*/
        let lv = this.Wl * this.wRadius;
        let rv = this.Wr * this.wRadius * this.neg;
        let radian = Math.PI*this.dir/180;
        let dx;
        let dy;
        let ogDir = this.dir;
        if (lv == rv) {
            let distance = rv * this.tickRate/1000;
            dx = distance * Math.cos(radian)
            dy = distance * Math.sin(radian)
            //let finalDir = null
          }
        else {
            let rt = this.width/2 * (lv+rv)/(rv-lv);
            let wt = (rv-lv)/this.width;
            let theta = wt * this.tickRate/1000;
            let i = rt * (1 - Math.cos(theta));
            let j = Math.sin(theta) * rt;
            dx = i * Math.sin(radian) + j * Math.cos(radian);
            dy = i * Math.cos(radian) + j * Math.sin(radian);
            this.dir = (this.dir + theta*180/Math.PI) % 360;
          }
          const ogX = this.X;
          const ogY = this.Y;
          const ogltheta = this.ltheta;
          const ogrtheta = this.rtheta;

          this.X = Math.max(Math.min(this.X + dx, this.MaxX), 0);
          this.Y = Math.max(Math.min(this.Y + dy, this.MaxY), 0);
          this.ltheta = (this.Wl * 5 + this.ltheta) % 360;
          this.rtheta = (this.Wr * 5 + this.rtheta) % 360;

          this.updateCorners(this.X - ogX, this.Y - ogY, ogDir);


          //Check if the given move results in a collision with any field objects
          var inter = false;
          for (var i=0; i < obstacles.length; i++) {
            inter = this.intersectOne(obstacles[i]);
            if (inter) {
              console.log("crash! \n");
              break;
            }
          }

          /*
          let mxX = this.findMax(this.topR[0], this.topL[0], this.botR[0], this.botL[0]);
          let miX = this.findMin(this.topR[0], this.topL[0], this.botR[0], this.botL[0]);

          let mxY = this.findMax(this.topR[1], this.topL[1], this.botR[1], this.botL[1]);
          let miY = this.findMin(this.topR[1], this.topL[1], this.botR[1], this.botL[1]);

          if (mxX > this.maxX || miX < 0) {
            inter = true;
          } else if (mxY > this.maxY || miY < 0) {
            inter = true;
          }
          */

          //Check to ensure there was no collision
          //count2++;
          //console.log(count2, "\n");
          if (!inter) {
            let newState = {
                X: this.X,
                Y: this.Y,
                dir: this.dir
            };

            postMessage({
              robot: newState
            })

          } else {
            this.updateCorners(ogX - this.X, ogY - this.Y, -1 * ogDir + 2 * this.dir);
            this.X = ogX;
            this.Y = ogY;
            this.dir = ogDir;
            this.ltheta = ogltheta;
            this.rtheta = ogrtheta;
          }
          /*
          if (dc % 100 == 0) {
            //debug print statements here

            console.log("TL: ",this.topL[0], this.topL[1],
            "\n TR: ", this.topR[0], this.topR[1],
            "\n BL: ", this.botL[0], this.botL[1],
            "\n BR: ", this.botR[0], this.botR[1]);
          }

          dc++;
          */

    }

    updateCorners(dX, dY, ogDir) {

      //var dDirDeg = -1 * (this.dir - ogDir);
      let dDir = this.dir * Math.PI / 180;
      //let dDir = dDirDeg * Math.PI / 180;
      let sin = Math.sin(dDir);
      let cos = Math.cos(dDir);


      //top right corner
      this.topR[0] = this.X - (this.height/2) * cos + (this.width/2) * sin;
      this.topR[1] = this.Y - (this.height/2) * sin - (this.width/2) * cos;

      //top left corner
      this.topL[0] = this.X - (this.height/2) * cos - (this.width/2) * sin;
      this.topL[1] = this.Y - (this.height/2) * sin + (this.width/2) * cos;

      //bottom left corner
      this.botL[0] = this.X + (this.height/2) * cos - (this.width/2) * sin
      this.botL[1] = this.Y + (this.height/2) * sin + (this.width/2) * cos;

      //bottom right corner
      this.botR[0] = this.X + (this.height/2) * cos + (this.width/2) * sin;
      this.botR[1] = this.Y + (this.height/2) * sin - (this.width/2) * cos;


      /*
      //top right corner
      this.topR[0] += dX;
      this.topR[1] += dY;
      this.topR[0] -= this.X;
      this.topR[1] -= this.Y;
      this.topR[0] = Math.cos(dDir)*this.topR[0] + Math.sin(dDir)*this.topR[1];
      this.topR[1] = -1 * Math.sin(dDir)*this.topR[0] + Math.cos(dDir)*this.topR[1];
      this.topR[0] += this.X;
      this.topR[1] += this.Y;

      //coordinates for top left corner of robot
      this.topL[0] += dX;
      this.topL[1] += dY;
      this.topL[0] -= this.X;
      this.topL[1] -= this.Y;
      this.topL[0] = Math.cos(dDir)*this.topL[0] + Math.sin(dDir)*this.topL[1];
      this.topL[1] = -1 * Math.sin(dDir)*this.topL[0] + Math.cos(dDir)*this.topL[1];
      this.topL[0] += this.X;
      this.topL[1] += this.Y;

      //coordinates for bottom right corner
      this.botR[0] += dX;
      this.botR[1] += dY;
      this.botR[0] -= this.X;
      this.botR[1] -= this.Y;
      this.botR[0] = Math.cos(dDir)*this.botR[0] + Math.sin(dDir)*this.botR[1];
      this.botR[1] = -1 * Math.sin(dDir)*this.botR[0] + Math.cos(dDir)*this.botR[1];
      this.botR[0] += this.X;
      this.botR[1] += this.Y;

      //coordinates for bottom left corner
      this.botL[0] += dX;
      this.botL[1] += dY;
      this.botL[0] -= this.X;
      this.botL[1] -= this.Y;
      this.botL[0] = Math.cos(dDir)*this.botL[0] + Math.sin(dDir)*this.botL[1];
      this.botL[1] = -1 * Math.sin(dDir)*this.botL[0] + Math.cos(dDir)*this.botL[1];
      this.botL[0] += this.X;
      this.botL[1] += this.Y;
      */
    }

    set_value(device, param, speed) {
        /* Runtime API method for updating L/R motor speed. Takes only L/R
           Motor as device name and speed bounded by [-1,1]. */
        if (speed > 1.0 || speed < -1.0){
            throw new Error("Speed cannot be great than 1.0 or less than -1.0.");
        }
        if (param !== "duty_cycle") {
            throw new Error('"duty_cycle" is the only currently supported parameter');
        }
        if (device === "left_motor") {
            this.Wl = speed * 9;
        } else if (device === "right_motor") {
            this.Wr = speed * 9;
        } else {
            throw new Error("Cannot find device name: " + device);
        }
    }

    sleep(duration) {
        /* Autonomous code pauses execution for <duration> seconds
        */
        let ms = duration*1000;
        let start = new Date().getTime();
        let cur = start;
        let tick = start;
        this.updatePosition();

        let numUpdates = 1;
        while (cur < start + ms) {
            cur = new Date().getTime();
            if (cur > this.simStartTime + 30*1000) {
                return;
            }
            if (cur - tick >= this.tickRate) {
                this.updatePosition();
                tick = tick + this.tickRate;
                numUpdates++;
            }
        }
    }

    printState() {
        console.log(`x = ${this.X.toFixed(2)}, y = ${this.Y.toFixed(2)}, theta = ${this.dir.toFixed(2)}`);
    }

    run(fn) {
        /*
        Starts a "coroutine", i.e. a series of actions that proceed
        independently of the main loop of code.
        */
        if (!(typeof fn === "function")) {
            throw new Error("First argument to Robot.isRunning must be a function");
        }
        this.runningCoroutines.add(fn)
        fn()
   }
    isRunning(fn) {
        /* Returns True if the given `fn` is already running as a coroutine.
        See: Robot.run
        TODO: Fully implement */
        if (!(typeof fn === "function")) {
            throw new Error("First argument to Robot.isRunning must be a function");
        }
        return this.runningCoroutines.has(fn)
    }
}

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
        this.joystick_left_x = 0;
        this.joystick_left_y = 0;
        this.joystick_right_x = 0;
        this.joystick_right_y = 0;
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

/*
function isFunction(functionToCheck) {
 return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
}
TIMEOUT_VALUE = .1 // seconds
function timeout_handler(signum, frame){
    throw new Error("Student code timed out");
  }
function ensure_is_function(tag, val)
    {if (!isFunction(val)) throw new Error("${tag} is not a function";}
function ensure_not_overridden(module, name){
    if hasAttribute(module, name) raise new Error("Student code overrides ${name}, which is part of the API")}
function _ensure_strict_semantics(fn){
    */ /* (Internal): provides additional error checking for the PiE API */ /*
    if (!inspect.iscoroutinefunction(fn)){
        throw new Error("Internal runtime error: _ensure_strict_semantics can only be applied to `async def` functions")}
    function wrapped_fn(*args, **kwargs){
        //# Ensure that this function is called directly out of the event loop,
        //# and not out of the `setup` and `loop` functions.
        stack = inspect.stack()
        try{
            for (frame of stack) {
                if (os.path.basename(frame.filename) == "base_events.py" && frame.function == "_run_once"){
                    //# We've hit the event loop, so everything is good
                    break}
                elif (os.path.basename(frame.filename) == "pimulator.py" and frame.function == 'simulate'){
                    //# We've hit the runtime before hitting the event loop, which
                    //# is bad
                    raise Exception("Call to `{}` must be inside an `async def` function called using `Robot.run`".format(fn.__name__))
                  }
                }
              }
        finally{
            del stack}
        return fn(*args, **kwargs)
      }
    return wrapped_fn
}
*/

/**
 * Event listeners for key presses
 */
function down(key){
    onPress(key)
}
function up(key){
    onRelease(key)
}

function onPress(keyCode) {
    /* Handling the events associated with pressing a key. Keyboard inputs are inputted as
       KEYCODE. */

    if (keyCode === 87) { // w
        simulator.gamepad.joystick_left_y = 1;
    } else if (keyCode === 65) { // a
        simulator.gamepad.joystick_left_x = -1;
    } else if (keyCode === 83) { // s
        simulator.gamepad.joystick_left_y = -1;
    } else if (keyCode === 68) { // d
        simulator.gamepad.joystick_left_x = 1;
    } else if (keyCode === 38) { // up
        simulator.gamepad.joystick_right_y = 1;
    } else if (keyCode === 40) { // down
        simulator.gamepad.joystick_right_y = -1;
    } else if (keyCode === 37) { // left
        simulator.gamepad.joystick_right_x = -1;
    } else if (keyCode === 39) { // right
        simulator.gamepad.joystick_right_x = 1;
    }
}

function onRelease(keyCode) {
    if (keyCode === 87) { // w
        simulator.gamepad.joystick_left_y = 0;
    } else if (keyCode === 65) { // a
        simulator.gamepad.joystick_left_x = 0;
    } else if (keyCode === 83) { // s
        simulator.gamepad.joystick_left_y = 0;
    } else if (keyCode === 68) { // d
        simulator.gamepad.joystick_left_x = 0;
    } else if (keyCode === 38) { // up
        simulator.gamepad.joystick_right_y = 0;
    } else if (keyCode === 40) { // down
        simulator.gamepad.joystick_right_y = 0;
    } else if (keyCode === 37) { // left
        simulator.gamepad.joystick_right_x = 0;
    } else if (keyCode === 39) { // right
        simulator.gamepad.joystick_right_x = 0;
    }
}

function translateToMovement(keyCode) {
    if (simulator.current.length === 0) {
      simulator.robot.updatePosition();
    }
    var k;
    for (k of simulator.current) {
        if (keyCode === 87) { // w
            simulator.gamepad.joystick_left_y = 1;
        } else if (keyCode === 65) { // a
            simulator.gamepad.joystick_left_x = 1;
        } else if (keyCode === 83) { // s
            simulator.gamepad.joystick_left_y = -1;
        } else if (keyCode === 68) { // d
            simulator.gamepad.joystick_left_x = -1;
        } else if (keyCode === 38) { // up
            simulator.gamepad.joystick_right_y = 1;
        } else if (keyCode === 40) { // down
            simulator.gamepad.joystick_right_y = -1;
        } else if (keyCode === 37) { // left
            simulator.gamepad.joystick_right_x = -1;
        } else if (keyCode === 39) { // right
            simulator.gamepad.joystick_right_x = 1;
        }
    }
    simulator.robot.updatePosition();
}

//#######################################

class Simulator{
    constructor() {
        /*
        Initialize new Simulator
        */
        this.robot = null;
        this.mode = "idle";
        this.initGamepad();
        this.current = [];
    }

    initGamepad(){
        const control_types = ['tank', 'arcade', 'other1', 'other2']
        const GAMEPAD_MODE = "tank"
        let control_type_index = control_types.indexOf(GAMEPAD_MODE)
        if (control_type_index == -1) {
            throw new Error("Invalid gamepad mode")}
        this.gamepad = new GamepadClass(control_type_index)
      }

    loadStudentCode(studentCodeFileName="student_code_file.py"){
        /*
        Load the student code to the current Simulator instance
        */

        //# Store the local environment into dictionary
        //# Ensure the global Robot reflects the same robot Simulator is using
        env['Robot'] = this.robot
        env['Gamepad'] = this.gamepad

        pyodide.runPython(`
            from js import code, env
            env = dict(env)
            exec(code, env)
        `);

        env = pyodide.pyimport("env");

        //# Eventually need to gracefully handle failures here
        this.autonomous_setup = env['autonomous_setup']
        this.autonomous_main = env['autonomous_main']
        this.teleop_setup = env['teleop_setup']
        this.teleop_main = env['teleop_main']

        // ensure_is_function("teleop_setup", this.teleop_setup)
        // ensure_is_function("teleop_main", this.teleop_main)
    }

    loopContent(func) {
        /* Execute one cycle of the robot.
        */
        func();
        simulator.robot.updatePosition();
    }

    consistentLoop(period, func){
        /* Execute the robot at specificed frequency.
        period (int): the period in ms to run func in
        func (function): the function to execute each loop
        func may take only TIMEOUT_VALUE seconds to finish execution
        */
        this.interval = setInterval(this.loopContent, period, func);
    }

    stop() {
        if (this.mode !== "idle") {
            this.mode = "idle"
            clearInterval(this.interval);
        }
        postMessage({
            mode: this.mode
        })
    }

    simulateTeleop(){
        /* Simulate execution of the robot code.
        Run setup_fn once before continuously looping loop_fn
        TODO: Run teleop_setup once before looping teleop_main */

        this.robot = new RobotClass();
        this.loadStudentCode();
        this.mode = "teleop"
        this.consistentLoop(this.robot.tickRate, this.teleop_main);
        postMessage({
            mode: this.mode
        })
    }

    simulateAuto() {
        this.mode = "auto";
        postMessage({
            mode: this.mode
        });
        this.robot = new RobotClass();
        this.loadStudentCode();

        this.timeout = setTimeout(function() { this.stop(); }.bind(this), 30*1000);
        this.robot.simStartTime = new Date().getTime();
        setTimeout(this.autonomous_setup, 0);
    }
}

var simulator = new Simulator();

this.onmessage = function(e) {
    // Code upload
    if (e.data.code !== undefined){
        code = e.data.code;
        console.log("Code upload succesful")
    }

    //make fieldObj
    if (e.data.initObj === true) {
        for (var i = 0; i < e.data.walls.count; i++) {
            new Wall(e.data.walls.arr[i][0], e.data.walls.arr[i][1], e.data.walls.arr[i][2], e.data.walls.arr[i][3]);
        }
    }

    // Start simulation
    if (e.data.start === true) {
        if (code === ""){
            console.log("Please upload code first");
        }
        else {
            let simulate = function () {
                if (typeof pyodide != "undefined" && typeof pyodide.version != "undefined") {
                    if (e.data.mode === "auto") simulator.simulateAuto();
                    else if (e.data.mode === "teleop") simulator.simulateTeleop();
                }
                else {
                    setTimeout(simulate, 500);
                }
            }
            simulate();
        }
    }

    // Handle keypresses in teleop
    if (simulator.mode === "teleop" && e.data.keypress === true){
        if (e.data.up === true){
            up(e.data.keyCode);
        }
        else if (e.data.up === false){
            down(e.data.keyCode);
        }
    }
}

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
