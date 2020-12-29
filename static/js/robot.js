/* Rebind console messages. */
var console=(function(oldCons){
    return {
        log: function(text){
            oldCons.log(text);
            postMessage({
                log: text
            })
        },
        info: function (text) {
            oldCons.info(text);
            // code
        },
        warn: function (text) {
            oldCons.warn(text);
            // code
        },
        error: function (text) {
            oldCons.error(text);
            // code
        }
    };
}(console));

importScripts("https://pyodide-cdn2.iodide.io/v0.15.0/full/pyodide.js");
importScripts('./GamepadClass.js');
importScripts('./Sensor.js');

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

    constructor(simulator) {
      this.X = this.startX;     // current X position of the center of the robot
      this.Y = this.startY;     // current Y position of the center of the robot
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
      this.leftSensor = 0;
      this.centerSensor = 0;
      this.rightSensor = 0;
      this.simulator = simulator
      this.sensor = new Sensor(this);

      // this.tapeLines.push(new TapeLine(115, 27, 115, 115));
      // this.tapeLines.push(new TapeLine(27, 27, 115, 27))
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

            this.sensor.get_val()
            let sensorValues = {
                leftSensor: this.leftSensor,
                centerSensor: this.centerSensor,
                rightSensor: this.rightSensor
            };

            postMessage({
                robot: newState,
                sensors: sensorValues
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
    get_value(device, param) {

      if (device === "4752729234491832779312"){
        if (param === "left"){
          return this.leftSensor
        } else if (param === "center") {
          return this.centerSensor
        } else if (param === "right"){
          return this.rightSensor
        }
      }
      throw new Error("Device was not found" + device)
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
                this.autonomous_main();
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
            throw new Error("First argument to Robot.run must be a function");
        }
        this.runningCoroutines.add(fn)
        fn()
   }
    is_running(fn) {
        /* Returns True if the given `fn` is already running as a coroutine.
        See: Robot.run
        TODO: Fully implement */
        if (!(typeof fn === "function")) {
            throw new Error("First argument to Robot.is_running must be a function");
        }
        return this.runningCoroutines.has(fn)
    }
}

/*********************** KEYBOARD INPUT GAMEPAD FUNCTIONS ***********************/

/**
 * Event listeners for key presses
 */
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

/*********************** GAMEPAD INPUT GAMEPAD FUNCTIONS ***********************/

/**
 * A mapping from the button names of the controller to the button names
 * in the PiE Robot API.
 */
const padMap = {
    button_0: "button_a",
    button_1: "button_b",
    button_2: "button_x",
    button_3: "button_y",
    button_4: "l_bumper",
    button_5: "r_bumper",
    button_6: "l_trigger",
    button_7: "r_trigger",
    button_8: "button_back",
    button_9: "button_start",
    button_10: "l_stick",
    button_11: "r_stick",
    button_12: "dpad_up",
    button_13: "dpad_down",
    button_14: "dpad_left",
    button_15: "dpad_right",
    axis_0: "LH",
    axis_1: "LV",
    axis_2: "RH",
    axis_3: "RV",
}

/**
 * Sets a button in the robot API to a pressed state i.e. true
 */
function onPressGamepad(button) {
    if (padMap[button] === "button_a") {
        simulator.gamepad.button_a = true;
    } else if (padMap[button] === "button_b") {
        simulator.gamepad.button_b = true;
    } else if (padMap[button] === "button_x") {
        simulator.gamepad.button_x = true;
    } else if (padMap[button] === "button_y") {
        simulator.gamepad.button_y = true;
    } else if (padMap[button] === "l_bumper") {
        simulator.gamepad.l_bumper = true;
    } else if (padMap[button] === "r_bumper") {
        simulator.gamepad.r_bumper = true;
    } else if (padMap[button] === "l_trigger") {
        simulator.gamepad.l_trigger = true;
    } else if (padMap[button] === "r_trigger") {
        simulator.gamepad.r_trigger = true;
    } else if (padMap[button] === "button_back") {
        simulator.gamepad.button_back = true;
    } else if (padMap[button] === "button_start") {
        simulator.gamepad.button_start = true;
    } else if (padMap[button] === "l_stick") {
        simulator.gamepad.l_stick = true;
    } else if (padMap[button] === "r_stick") {
        simulator.gamepad.r_stick = true;
    } else if (padMap[button] === "dpad_up") {
        simulator.gamepad.dpad_up = true;
    } else if (padMap[button] === "dpad_down") {
        simulator.gamepad.dpad_down = true;
    } else if (padMap[button] === "dpad_left") {
        simulator.gamepad.dpad_left = true;
    } else if (padMap[button] === "dpad_right") {
        simulator.gamepad.dpad_right = true;
    }
}

/**
 * Sets a button in the robot API to a released state i.e. false
 */
function onReleaseGamepad(button) {
    if (padMap[button] === "button_a") {
        simulator.gamepad.button_a = false;
    } else if (padMap[button] === "button_b") {
        simulator.gamepad.button_b = false;
    } else if (padMap[button] === "button_x") {
        simulator.gamepad.button_x = false;
    } else if (padMap[button] === "button_y") {
        simulator.gamepad.button_y = false;
    } else if (padMap[button] === "l_bumper") {
        simulator.gamepad.l_bumper = false;
    } else if (padMap[button] === "r_bumper") {
        simulator.gamepad.r_bumper = false;
    } else if (padMap[button] === "l_trigger") {
        simulator.gamepad.l_trigger = false;
    } else if (padMap[button] === "r_trigger") {
        simulator.gamepad.r_trigger = false;
    } else if (padMap[button] === "button_back") {
        simulator.gamepad.button_back = false;
    } else if (padMap[button] === "button_start") {
        simulator.gamepad.button_start = false;
    } else if (padMap[button] === "l_stick") {
        simulator.gamepad.l_stick = false;
    } else if (padMap[button] === "r_stick") {
        simulator.gamepad.r_stick = false;
    } else if (padMap[button] === "dpad_up") {
        simulator.gamepad.dpad_up = false;
    } else if (padMap[button] === "dpad_down") {
        simulator.gamepad.dpad_down = false;
    } else if (padMap[button] === "dpad_left") {
        simulator.gamepad.dpad_left = false;
    } else if (padMap[button] === "dpad_right") {
        simulator.gamepad.dpad_right = false;
    }
}

/**
 * Sets the value of the axis according to joystick movement
 */
function moveGamepad(axis, value) {
    if (axis === 0) { // left joystick horizontal axis
        if (value > 0) { // joystick position right
            simulator.gamepad.joystick_left_x = value; //1
        } else if (value < 0) { // joystick position left
            simulator.gamepad.joystick_left_x = value; //-1
        }
    } else if (axis === 1) { // left joystick vertical axis
        if (value > 0) { // joystick position down ***
            simulator.gamepad.joystick_left_y = -1 * value; //-1
        } else if (value < 0) { // joystick position up ***
            simulator.gamepad.joystick_left_y = -1 * value; //1
        }
    } else if (axis === 2) { // right joystick horizontal axis
        if (value > 0) { // joystick position right
            simulator.gamepad.joystick_right_x = value; //1
        } else if (value < 0) { // joystick position left
            simulator.gamepad.joystick_right_x = value; //-1
        }
    } else if (axis === 3) { // right joystick vertical axis
        if (value > 0) { // joystick position down ***
            simulator.gamepad.joystick_right_y = -1 * value; //-1
        } else if (value < 0) { // joystick position up ***
            simulator.gamepad.joystick_right_y = -1 * value; //1
        }
    }
}

/**
 * Resets the value of the axis back to the center
 */
function stopGamepad(axis) {
    if (axis === 0) { // left joystick horizontal axis
        simulator.gamepad.joystick_left_x = 0;
    } else if (axis === 1) { // left joystick vertical axis
        simulator.gamepad.joystick_left_y = 0;
    } else if (axis === 2) { // right joystick horizontal axis
        simulator.gamepad.joystick_right_x = 0;
    } else if (axis === 3) { // right joystick vertical axis
        simulator.gamepad.joystick_right_y = 0;
    }
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
        this.tapeLines = [];
        this.tapeLines.push(new TapeLine(27, 27, 115, 115));
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

        this.robot = new RobotClass(this);
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
        this.robot = new RobotClass(this);
        this.loadStudentCode();
        this.robot.autonomous_main = this.autonomous_main
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
        console.log("Code upload successful")
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
                if (typeof pyodide !== "undefined" && typeof pyodide.version !== "undefined") {
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

    // Handle key inputs (keyboard/gamepad) in teleop
    if (simulator.mode === "teleop"){
        if (e.data.keyMode === "keyboard") {
            if (e.data.up === true){
                onRelease(e.data.keyCode);
            }
            else if (e.data.up === false){
                onPress(e.data.keyCode);
            }
        } else if (e.data.keyMode === "gamepad") {
            if (e.data.isButton) {
                if (e.data.up === true){
                    onReleaseGamepad(e.data.button);
                }
                else if (e.data.up === false){
                    onPressGamepad(e.data.button);
                }
            } else { // a joystick movement
                if (e.data.up === true){
                    stopGamepad(e.data.axis);
                }
                else if (e.data.up === false){
                    moveGamepad(e.data.axis, e.data.value);
                }
            }
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
