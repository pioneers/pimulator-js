import math
import asyncio
import warnings
import time
import inspect
import os
import threading
import multiprocessing
# termcolor is an optional package
try:
    from termcolor import colored
except ModuleNotFoundError:
    colored = lambda x, y: x

robot_on = False
SCREEN_HEIGHT = 48
SCREEN_WIDTH = 48

#######################################
class RobotClass:
    """The MODEL for this simulator. Stores robot data and handles position
       calculations & Runtime API calls """
    tick_rate = 0.05             # in s
    width = 12                  # width of robot , inches
    w_radius = 2                # radius of a wheel, inches
    MAX_X = 143                 # maximum X value, inches, field is 12'x12'
    MAX_Y = 143                 # maximum Y value, inches, field is 12'x12'
    neg = -1                    # negate left motor calculation

    def __init__(self, queue=None):
        self.X = 72.0           # X position of the robot
        self.Y = 72.0           # Y position of the robot
        self.Wl = 0.0           # angular velocity of l wheel, degree/s
        self.Wr = 0.0           # angular velocity of r wheel, degree/s
        self.ltheta = 0.0       # angular position of l wheel, degree
        self.rtheta = 0.0       # angular position of r wheel, degree
        self.dir = 0.0         # Direction of the robot facing, degree

        # All asychronous functions currently running
        self.running_coroutines = set()

        # Ensure we don't hit sync errors when updating our values
        self.queue = queue

    def update_position(self):
        """Updates position of the  Robot using differential drive equations

        Derived with reference to:
        https://chess.eecs.berkeley.edu/eecs149/documentation/differentialDrive.pdf
        """
        lv = self.Wl * RobotClass.w_radius # * RobotClass.neg
        rv = self.Wr * RobotClass.w_radius
        radian = math.radians(self.dir)
        if (lv == rv):
            distance = rv * RobotClass.tick_rate
            dx = distance * math.cos(radian)
            dy = distance * math.sin(radian)
            final_dir = None

        else:
            rt = RobotClass.width/2 * (lv+rv)/(rv-lv)
            Wt = (rv-lv)/RobotClass.width
            theta = Wt * RobotClass.tick_rate
            i = rt * (1 - math.cos(theta))
            j = math.sin(theta) * rt
            dx = i * math.sin(radian) + j * math.cos(radian)
            dy = i * math.cos(radian) + j * math.sin(radian)
            self.dir= (self.dir + math.degrees(theta)) % 360

        self.X = max(min(self.X + dx, RobotClass.MAX_X), 0)
        self.Y = max(min(self.Y + dy, RobotClass.MAX_Y), 0)
        self.ltheta = (self.Wl * 5 + self.ltheta) % 360
        self.rtheta = (self.Wr * 5 + self.rtheta) % 360

        if self.queue is not None:
            self.queue.put({'x':self.X,
                            'y':self.Y,
                            'dir':self.dir})

    def set_value(self, device, param, speed):
        """Runtime API method for updating L/R motor speed. Takes only L/R
           Motor as device name and speed bounded by [-1,1]."""
        if speed > 1.0 or speed < -1.0:
            raise ValueError("Speed cannot be great than 1.0 or less than -1.0.")
        if param != "duty_cycle":
            raise ValueError('"duty_cycle" is the only currently supported parameter')
        if device == "left_motor":
            self.Wl = speed * 9
        elif device == "right_motor":
            self.Wr = speed * 9
        else:
            raise KeyError("Cannot find device name: " + device)

    def print_state(self):
        form = "x = %.2f, y = %.2f, theta = %.2f"
        print(form % (self.X, self.Y, self.dir))

    def run(self, fn, *args, **kwargs):
        """
        Starts a "coroutine", i.e. a series of actions that proceed
        independently of the main loop of code.

        The first argument must be a function defined with `async def`.

        The remaining arguments are then passed to that function before it is
        called.

        Multiple simultaneous coroutines that use the same robot actuators will
        lead to surprising behavior. To help guard against errors, calling
        `Robot.run` with a `fn` argument that is currently running is a no-op.
        """

        if not inspect.isfunction(fn):
            raise ValueError("First argument to Robot.run must be a function")
        elif not inspect.iscoroutinefunction(fn):
            raise ValueError("First argument to Robot.run must be defined with `async def`, not `def`")

        #if fn in self.running_coroutines:
        #    return

        #self.running_coroutines.add(fn)

        # Calling a coroutine does not execute it
        # Rather returns  acoroutine object
        #future = fn(*args, **kwargs)

        #async def wrapped_future():
            #await future
            #self.running_coroutines.remove(fn)
        asyncio.run(fn(*args, **kwargs))
        # asyncio.ensure_future(wrapped_future())
        #asyncio.ensure_future(wrapped_future())

    def is_running(self, fn):
        """
        Returns True if the given `fn` is already running as a coroutine.

        See: Robot.run
        """

        if not inspect.isfunction(fn):
            raise ValueError("First argument to Robot.is_running must be a function")
        elif not inspect.iscoroutinefunction(fn):
            raise ValueError("First argument to Robot.is_running must be defined with `async def`, not `def`")

        return fn in self.running_coroutines


class GamepadClass:
              #0, #1, #2, #3
    sets = [[[ 0,  0,  0,  0],     #joystick_left_x
             [ 1,  1, -1, -1],     #joystick_left_y
             [ 0,  0,  0,  0],     #joystick_right_x
             [ 1, -1, -1,  1],     #joystick_right_y
             [ 1,  2,  3,  3]],    #Duration s

            [[ 0,  1,  0, -1],
             [ 1,  0, -1,  0],
             [ 0,  0,  0,  0],
             [ 0,  0,  0,  0],
             [ 3,  3,  3,  3]]
            ]


    def __init__(self, set_num):
        self.set_num = set_num
        self.t0 = time.time()
        self.joystick_left_x = self.sets[set_num][0]
        self.joystick_left_y =  self.sets[set_num][1]
        self.joystick_right_x =  self.sets[set_num][2]
        self.joystick_right_y =  self.sets[set_num][3]
        self.durations = self.sets[set_num][4]         #lst of instr duration
        self.i = 0                                        #index of insturction

    def get_value(self, device):
        now = time.time()
        timePassed = now - self.t0
        if  (timePassed >= self.durations[self.i]):
            self.i = (self.i + 1) % len(self.durations)
            self.t0 = now

        if (device == "joystick_left_x"):
            return self.joystick_left_x[self.i]
        if (device == "joystick_left_y"):
            return self.joystick_left_y[self.i]
        if (device == "joystick_right_x"):
            return self.joystick_right_x[self.i]
        if (device == "joystick_right_y"):
            return self.joystick_right_y[self.i]
        else:
            raise KeyError("Cannot find input: " + device)

    def godmode(self, device, value):
        if value > 1.0 or value < -1.0:
            raise ValueError("Value cannot be great than 1.0 or less than -1.0.")
        if (device == "joystick_left_x"):
            self.joystick_left_x = value
        elif (device == "joystick_left_y"):
            self.joystick_left_y = value
        elif (device == "joystick_right_x"):
            self.joystick_right_x = value
        elif (device == "joystick_right_y"):
            self.joystick_right_y = value
        else:
            raise KeyError("Cannot find input: " + device)

    def ltheta(self):
        return self.theta(
                    self.get_value("joystick_left_x"),
                        -self.get_value("joystick_left_y"))

    def rtheta(self):
        return self.theta(
                    self.get_value("joystick_right_x"),
                        -self.get_value("joystick_right_y"))

    @staticmethod
    def theta(x, y):
        """Convert cartesian to polar coordinates and return the radius."""
        if (x == 0 and y == 0):
            return "Neutral"
        if x == 0:
            if y > 0:
                return 90.0
            else:
                return 270.0
        theta = math.degrees(math.atan(y / x))
        if x > 0:
            return theta
        else:
            return theta + 180.0


class Camera:
    """Create images of parts of the robot in a select format"""
    JOYSTICK_NEUTRAL = "Neutral"
    wheel_base = list("* - - - *|       ||   x   ||       |* - - - *")
    width = 9
    base = list(" " * (5 * width))

    def __init__(self, robot, gamepad):
        self.robot = robot
        self.gamepad = gamepad

    def direction(theta, label='*'):
        """Generate a string that indicates pointing in a theta direction"""
        result = Camera.base.copy()
        result[2 * Camera.width + 4] = label
        if theta == Camera.JOYSTICK_NEUTRAL:
            return Camera.str_format(result)

        theta %= 360
        state = (round(theta / 45.0)) % 8

        result[2 * Camera.width + 4] = label

        if state == 0:
            result[2 * Camera.width + 5] = "-"
            result[2 * Camera.width + 6] = "-"
            result[2 * Camera.width + 7] = "-"
        elif state == 1:
            result[0 * Camera.width + 8] = "/"
            result[1 * Camera.width + 6] = "/"
        elif state == 2:
            result[0 * Camera.width + 4] = "|"
            result[1 * Camera.width + 4] = "|"
        elif state == 3:
            result[0 * Camera.width + 0] = "\\"
            result[1 * Camera.width + 2] = "\\"
        elif state == 4:
            result[2 * Camera.width + 0] = "-"
            result[2 * Camera.width + 1] = "-"
            result[2 * Camera.width + 2] = "-"
        elif state == 5:
            result[3 * Camera.width + 2] = "/"
            result[4 * Camera.width + 0] = "/"
        elif state == 6:
            result[3 * Camera.width + 4] = "|"
            result[4 * Camera.width + 4] = "|"
        elif state == 7:
            result[3 * Camera.width + 6] = "\\"
            result[4 * Camera.width + 8] = "\\"

        return Camera.str_format(result)

    def robot_direction(self):
        """Return a list of strings picturing the direction the robot is traveling in from an overhead view"""
        return Camera.direction(self.robot.dir, Robot.symbol)

    def left_joystick(self):
        """Return a list of strings picturing the left joystick of the gamepad"""
        return Camera.direction(self.gamepad.ltheta(), 'L')

    def right_joystick(self):
        """Return a list of strings picturing the right joystick of the gamepad"""
        return Camera.direction(self.gamepad.rtheta(), 'R')

    def wheel(theta, label='*'):
        """Generate a string picturing a wheel at position theta

        Args:
            theta (float): the angular displacement of the wheel
        """

        result = Camera.wheel_base.copy()
        result[2 * Camera.width + 4] = label
        state = round(theta / 45.0) % 8

        if state == 0:
            result[1 * Camera.width + 4] = "|"
        elif state == 2:
            result[1 * Camera.width + 7] = "/"
        elif state == 2:
            result[2 * Camera.width + 7] = "-"
        elif state == 3:
            result[3 * Camera.width + 7] = "\\"
        elif state == 4:
            result[3 * Camera.width + 4] = "|"
        elif state == 5:
            result[3 * Camera.width + 1] = "/"
        elif state == 6:
            result[2 * Camera.width + 1] = "-"
        elif state == 7:
            result[1 * Camera.width + 1] = "\\"

        return Camera.str_format(result)

    def right_wheel(self):
        """Return a list of strings picturing the right wheel"""
        return [colored(x , 'red') for x in Camera.wheel(self.robot.rtheta, 'R')]

    def left_wheel(self):
        """Return a list of strings picturing the left wheel"""
        return [colored(x, 'red') for x in Camera.wheel(self.robot.ltheta, 'L')]

    def str_format(list_img):
        """Return a list of 5 strings each of length 9

        Args:
            list_img: A list of 5 * 9 characters
        """
        result = []
        for y in range(5):
            segment = list_img[y * Camera.width:(y + 1) * Camera.width]
            result.append(''.join(segment))
        return result

    def printer(formatted_list):
        """Print a list of strings to graphically resemble it"""
        for x in formatted_list:
            print(x)

TIMEOUT_VALUE = 1 # seconds?

def timeout_handler(signum, frame):
    raise TimeoutError("studentCode timed out")

def ensure_is_function(tag, val):
    if not inspect.isfunction(val):
        raise RuntimeError("{} is not a function".format(tag))

def ensure_not_overridden(module, name):
    if hasattr(module, name):
        raise RuntimeError("Student code overrides `{}`, which is part of the API".format(name))

def _ensure_strict_semantics(fn):
    """
    (Internal): provides additional error checking for the PiE API
    """
    if not inspect.iscoroutinefunction(fn):
        raise Exception("Internal runtime error: _ensure_strict_semantics can only be applied to `async def` functions")

    def wrapped_fn(*args, **kwargs):
        # Ensure that this function is called directly out of the event loop,
        # and not out of the `setup` and `loop` functions.
        stack = inspect.stack()
        try:
            for frame in stack:
                if os.path.basename(frame.filename) == "base_events.py" and frame.function == "_run_once":
                    # We've hit the event loop, so everything is good
                    break
                elif os.path.basename(frame.filename) == "pimulator.py" and frame.function == 'simulate':
                    # We've hit the runtime before hitting the event loop, which
                    # is bad
                    raise Exception("Call to `{}` must be inside an `async def` function called using `Robot.run`".format(fn.__name__))
        finally:
            del stack
        return fn(*args, **kwargs)

    return wrapped_fn

class ActionsClass:
    """
    This class contains a series of pre-specified actions that a robot can
    perform. These actions should be used inside a coroutine using an `await`
    statement, e.g. `await Actions.sleep(1.0)`
    """

    def __init__(self, robot):
        self._robot = robot

    @_ensure_strict_semantics
    async def sleep(self, seconds):
        """
        Waits for specified number of `seconds`
        """

        await asyncio.sleep(seconds)

#######################################

class Simulator:
    def __init__(self, queue):
        """Initialize new Simulator

        queue (queue.Queue): communicates robot state between threads
            To gracefully handle when student code takes too long to run,
            i.e. times out, the queue must be initialized with a  timeout
        """

        self.queue = queue
        self.robot = RobotClass(self.queue)
        self.init_gamepad()
        self.actions = ActionsClass(self.robot)
        self.load_student_code()

    def init_gamepad(self):
        control_types = ['tank', 'arcade', 'other1', 'other2']
        GAMEPAD_MODE = "tank"
        control_type_index = control_types.index(GAMEPAD_MODE)
        assert (control_type_index != -1) , "Invalid gamepad mode"
        self.gamepad = GamepadClass(control_type_index)

    def load_student_code(self, student_code_file_name="student_code_file.py"):
        """Load the student code from the file"""

        # Load student code
        student_code_file = open(student_code_file_name, 'r')
        content = student_code_file.read()
        student_code_file.close()

        # Store the local environment into dictionary
        env = {}
        # Ensure the global Robot reflects the same robot Simulator is using
        env['Robot'] = self.robot
        env['Gamepad'] = self.gamepad
        env['Actions'] = self.actions
        exec(content, env)

        # Eventually need to gracefully handle failures here
        self.autonomous_setup = env['autonomous_setup']
        self.autonomous_main = env['autonomous_main']
        self.teleop_setup = env['teleop_setup']
        self.teleop_main = env['teleop_main']

        ensure_is_function("teleop_setup", self.teleop_setup)
        ensure_is_function("teleop_main", self.teleop_main)

    def consistent_loop(self, period, func):
        """Execute the robot at specificed frequency.

        period (int): the period in seconds to run func in
        func (function): the function to execute each loop

        func may take only TIMEOUT_VALUE seconds to finish execution
        """
        while robot_on:
            next_call = time.time() + period

            self.loop_content(func)

            sleep_time = max(next_call - time.time(), 0.)
            time.sleep(sleep_time)

    def loop_content(self, func):
        """Execute one cycle of the robot."""
        func()
        self.robot.update_position()
        # self.robot.print_state()

    def simulate_teleop(self):
        """Simulate execution of the robot code.

        Run setup_fn once before continuously looping loop_fn
        """
        self.teleop_setup()
        self.robot.update_position()
        self.consistent_loop(self.robot.tick_rate, self.teleop_main)

    def simulate_auto(self):
        auto_thread = threading.Thread(group=None, target=self.autonomous_setup,
                                        name="autonomous code thread", daemon=True)
        # auto_thread = multiprocessing.Process(group=None, target=autonomous_setup_toplevel, args=(self,),
        #                                 name="autonomous code thread", daemon=True)
        auto_thread.start()
        self.consistent_loop(self.robot.tick_rate,self.robot.update_position)

def autonomous_setup_toplevel(sim):
    sim.autonomous_setup()

def main(queue, auto):
    simulator = Simulator(queue)
    if auto:
        simulator.simulate_auto()
    else:
        simulator.simulate_teleop()
