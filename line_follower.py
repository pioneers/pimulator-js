# motor / sensor ids and other constants
rightMotor = 'right_motor'
leftMotor = 'left_motor'
limSwitch = 'limit_switch'
leftSwitch = 'switch2'
rightSwitch = 'switch0'
lFollow = 'line_follower'
lfCutoff = 0.5
# which sensor on the line follower corresponds to the left / center / right of the robot
# note that these are flipped because the line follower is mounted backwards
leftFollower = "right"
centerFollower = "center"
rightFollower = "left"

# global variables to help with control
cyclesSinceLine = 0

# these two async functions are so that we can take different actions depending
# on how long the match has been running for
# code to get the robot to square up with the wall

def autonomous_setup():
    # start timers, start the robot driving forward to get out of the start box
    Robot.sleep(30)

def autonomous_main():
    global squareupStarted # python magic to make the global variables work
    global cyclesSinceLine
    leftOn = Robot.get_value(lFollow, leftFollower) <= lfCutoff
    rightOn = Robot.get_value(lFollow, rightFollower) <= lfCutoff
    centerOn = Robot.get_value(lFollow, centerFollower) <= lfCutoff
    if leftOn and rightOn and (not centerOn):
        # robot is just about where it needs to be --> drive straight
        Robot.set_value(leftMotor, "duty_cycle", 0.3)
        Robot.set_value(rightMotor, "duty_cycle", -0.3)
    elif leftOn and (not rightOn) and centerOn:
        # robot is a far to the right --> compensate
        Robot.set_value(leftMotor, "duty_cycle", 0.50)
        Robot.set_value(rightMotor, "duty_cycle", -0.10)
    elif (not leftOn) and rightOn and centerOn:
        #robot is far to the left of the line  --> compensate
        Robot.set_value(leftMotor, "duty_cycle", 0.10)
        Robot.set_value(rightMotor, "duty_cycle", -0.50)
    elif (not leftOn) and (not centerOn) and rightOn:
        # robot is a bit far to the left --> compensate a little
        Robot.set_value(leftMotor, "duty_cycle", 0.2)
        Robot.set_value(rightMotor, "duty_cycle", -0.4)
    elif (not rightOn) and (not centerOn) and leftOn:
        # robot is a bit far to the right --> compensate a little
        Robot.set_value(leftMotor, "duty_cycle", 0.4)
        Robot.set_value(rightMotor, "duty_cycle", -0.2)
    elif (not rightOn) and (not centerOn) and (not leftOn):
        # robot is on line --> drive straight
        Robot.set_value(leftMotor, "duty_cycle", 0.30)
        Robot.set_value(rightMotor, "duty_cycle", -0.30)
    else:
        Robot.set_value(leftMotor, "duty_cycle", 0)
        Robot.set_value(rightMotor, "duty_cycle", 0)
    #update the number of cycles since we last saw the line



def teleop_setup():
    pass

def teleop_main():
    pass
# out of starting zone, need to line follow
