import math
import time
import signal
import inspect
import asyncio
import os
from termcolor import colored

# Gamepad Options: use "arcade" or "tank"
GAMEPAD_MODE = "tank"
SCREEN_HEIGHT = 48
SCREEN_WIDTH = 48

#######################################
class RobotClass:
    """The MODEL for this simulator. Stores robot data and handles position
       calculations & Runtime API calls """
    tick_rate = 0.1             # in s
    width = 12                  # width of robot , inches
    w_radius = 2                # radius of a wheel, inches
    MAX_X = 143                 # maximum X value, inches, field is 12'x12'
    MAX_Y = 143                 # maximum Y value, inches, field is 12'x12'
    neg = -1                    # negate left motor calculation
    symbol = '@'                # the character representation of the robot on the field

    def __init__(self):
        self.X = 72.0           # X position of the robot
        self.Y = 72.0           # Y position of the robot
        self.Wl = 0.0           # angular velocity of l wheel, degree/s
        self.Wr = 0.0           # angular velocity of r wheel, degree/s
        self.ltheta = 0.0       # angular position of l wheel, degree
        self.rtheta = 0.0       # angular position of r wheel, degree
        self.dir = 0.0         # Direction of the robot facing, degree

        self._coroutines_running = set()

    """ Differential Drive Calculation Reference:
    https://chess.eecs.berkeley.edu/eecs149/documentation/differentialDrive.pdf
    """
    def update_position(self):
        """Updates position of the  Robot using differential drive equations"""
        lv = self.Wl * Robot.w_radius * Robot.neg
        rv = self.Wr * Robot.w_radius
        radian = math.radians(self.dir)
        if (lv == rv):
            distance = rv * Robot.tick_rate
            dx = distance * math.cos(radian)
            dy = distance * math.sin(radian)

        else:
            rt = Robot.width/2 * (lv+rv)/(rv-lv)
            Wt = (rv-lv)/Robot.width
            theta = Wt * Robot.tick_rate
            i = rt * (1 - math.cos(theta))
            j = math.sin(theta) * rt
            dx = i * math.sin(radian) + j * math.cos(radian)
            dy = i * math.cos(radian) + j * math.sin(radian)
            self.dir = (self.dir + math.degrees(theta)) % 360
        self.X = max(min(self.X + dx, Robot.MAX_X), 0)
        self.Y = max(min(self.Y + dy, Robot.MAX_Y), 0)
        self.ltheta = (self.Wl * 5 + self.ltheta) % 360
        self.rtheta = (self.Wr * 5 + self.rtheta) % 360

    def set_value(self, device, param, speed):
        """Runtime API method for updating L/R motor speed. 
        
        Takes only L/R Motor as device name and speed bounded by [-1,1]."""
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

        if self.is_running(fn):
            return

        self._coroutines_running.add(fn)

        future = fn(*args, **kwargs)

        async def wrapped_future():
            await future
            self._coroutines_running.remove(fn)

        # asyncio.ensure_future(wrapped_future())
        asyncio.ensure_future(wrapped_future())

    def is_running(self, fn):
        """
        Returns True if the given `fn` is already running as a coroutine.

        See: Robot.run
        """

        if not inspect.isfunction(fn):
            raise ValueError("First argument to Robot.is_running must be a function")
        elif not inspect.iscoroutinefunction(fn):
            raise ValueError("First argument to Robot.is_running must be defined with `async def`, not `def`")

        return fn in self._coroutines_running


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
        self.joystick_right_x =  self.sets[set_num][3]
        self.joystick_right_y =  self.sets[set_num][3]
        self.durations = self.sets[set_num][4]         #lst of instr duration
        self.i = 0                                        #index of insturction

    def get_value(self, device):
        now = time.time()
        timePassed = now - self.t0
        if  (timePassed >= self.durations[self.i]):
            self.i = (self.i + 1) % len(self.durations)
            self.t0 = now
        #print(timePassed)

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


class Screen:
    """A visual representation of the field and menu"""

    SCREEN_HEIGHT = 36
    SCREEN_WIDTH = 36

    def __init__(self, robot, gamepad):
        self.robot = robot
        self.gamepad = gamepad
        self.camera = Camera(robot, gamepad)

    def combiner(parts_list):
        """Return a list of 5 strings that make up the menu_bar.

        args:
            parts_list: a list where each element is a list of 5 strings picturing an element
        """

        result = []
        for y in range(5):
            pre_segment = []
            for x in range(len(parts_list)):
                pre_segment.append(parts_list[x][y] + '  ')
            line_str = ''.join(pre_segment)
            result.append(line_str)
        return result

    def menu_bar(self):
        """Print out the menubar."""
        menu_bar_items = []
        menu_bar_items.append(self.camera.left_wheel())
        menu_bar_items.append(self.camera.right_wheel())
        menu_bar_items.append(self.camera.left_joystick())
        menu_bar_items.append(self.camera.right_joystick())
        Camera.printer(Screen.combiner(menu_bar_items))

    def clear_screen():
        """Clear the previously drawn field"""
        for x in range(40):
            print()

    def symbol(self):
        """Returns a symbol that indicates the robots direction"""
        robot_theta = self.robot.dir
        index = round(robot_theta / 45) % 8
        symbols = ['\u2192', '\u2197', '\u2191', '\u2196', '\u2190', '\u2199', '\u2193', '\u2198']
        return symbols[index]

    def draw(self):
        """Draw the screen."""
        Screen.clear_screen()
        self.menu_bar()
        ky = SCREEN_HEIGHT / 144.0  # screen scaling coefficient
        kx = SCREEN_WIDTH / 144.0  # screen scaling coefficient
        # print (self.robot.X*k)
        for y in reversed(range(int(SCREEN_HEIGHT))):
            line = ["."] * int(SCREEN_WIDTH)
            for x in range(int(SCREEN_WIDTH)):
                if ((self.robot.X * kx) // 1 == x and (self.robot.Y * ky) // 1 == y):
                    line[x] = colored(self.symbol(), 'red')
            print(' '.join(line))
        print("__" * int(SCREEN_WIDTH))
        print("X: %s, Y: %s, Theta: %s" % (self.robot.X, self.robot.Y, self.robot.dir))


class TimeoutError(Exception):
    pass

class RuntimeError(Exception):
    pass

TIMEOUT_VALUE = 1 # seconds?

def start_watchdog():
    """Set a timer for TIMEOUT_VALUE seconds"""
    signal.alarm(TIMEOUT_VALUE)

def feed_watchdog():
    """Reset a timer for TIMEOUT_VALUE seconds"""
    signal.alarm(0) # is this redundant?
    signal.alarm(TIMEOUT_VALUE)

def ensure_is_coroute_function(tag, val):
    """Ensure val is a coroutine function."""
    if inspect.iscoroutinefunction(val):
        raise RuntimeError("{} is defined with `async def` instead of `def`".format(tag))
    print("<1>", val)
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

Robot = RobotClass()
control_types = ['tank', 'arcade', 'other1', 'other2']
control_type_index = control_types.index(GAMEPAD_MODE)
assert (control_type_index != -1) , "Invalid gamepad mode"
Gamepad = GamepadClass(control_type_index)
Actions = ActionsClass(Robot)
s = Screen(Robot, Gamepad)

class Simulator:
    def __init__(self):
        # Start timeout_handder when the alarm goes off
        signal.signal(signal.SIGALRM, Simulator.timeout_handler)

        # Need to pass a value by reference, so use a list as a kind of "pointer" cell
        self.exception_cell = [None]

        self.clarify_coroutine_warnings()

    def timeout_handler(signum, frame):
        """Take action if student code takes too long"""
        raise TimeoutError("studentCode timed out")

    async def main_loop(self, loop_fn):
        while self.exception_cell[0] is None:
            next_call = self.loop.time() + Robot.tick_rate # run at 20 Hz
            loop_fn()
            feed_watchdog()

            # Simulator drawing operation
            Robot.update_position()
            s.draw()

            sleep_time = max(next_call - self.loop.time(), 0.)
            await asyncio.sleep(sleep_time)

        raise self.exception_cell[0]

    def simulate(self, setup_fn=None, loop_fn=None):
        start_watchdog()
        feed_watchdog()

        ensure_is_coroute_function("teleop_setup", setup_fn)
        ensure_is_coroute_function("teleop_main", loop_fn)

        feed_watchdog()

        # Note that this implementation does not attempt to restart student
        # code on failure

        setup_fn()
        feed_watchdog()

        # Start the main event loop
        self.loop = asyncio.get_event_loop()

        def my_exception_handler(loop, context):
            if exception_cell[0] is None:
                exception_cell[0] = context['exception']

        self.loop.set_exception_handler(my_exception_handler)
        self.loop.run_until_complete(self.main_loop(loop_fn))

    def clarify_coroutine_warnings(self):
        """ Inject an additional clarification message about coroutine warning.

        Python's default error checking will print warnings of the form:
            RuntimeWarning: coroutine '???' was never awaited
        """
        import warnings

        default_showwarning = warnings.showwarning

        def custom_showwarning(message, category, filename, lineno, file=None, line=None):
            """Show the original warning along with our custom warning."""
            default_showwarning(message, category, filename, lineno, line)

            if str(message).endswith('was never awaited'):
                coro_name = str(message).split("'")[-2]

                display_message = ("The PiE API has upgraded the above "
                        "RuntimeWarning to a runtime error!\n\n"

                        "This error typically occurs in one of the these cases:\n\n"

                        "1. Calling `Actions.sleep` or anything in `Actions` "
                        "without using `await`.\n\n"

                        "Incorrect code:\n"
                        "   async def my_coro():\n"
                        "       Actions.sleep(1.0)\n\n"

                        "Consider instead:\n"
                        "   async def my_coro():\n"
                        "       await Actions.sleep(1.0)\n\n"

                        "2. Calling an `async def` function from inside `setup` \n"
                        "or `loop` without using `Robot.run`.\n\n"

                        "Incorrect code:\n"
                        "   def loop():\n"
                        "       my_coro()\n\n"

                        "Consider instead:\n"
                        "   def loop():\n"
                        "       Robot.run(my_coro)\n")

                print(display_message.format(coro_name=coro_name), file=file)
                self.exception_cell[0] = message

        warnings.showwarning = custom_showwarning
