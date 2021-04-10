# Substitute device IDs when using real robot
KOALA_BEAR = "koala_bear"
LINE_FOLLOWER = "line_follower"
LIMIT_SWITCH = "limit_switch"

def autonomous_setup():
    print("Autonomous mode has started!")
    Robot.run(autonomous_actions)

def autonomous_main():
    pass

def teleop_setup():
    # Left motor rotates in the opposite direction
    Robot.set_value(KOALA_BEAR, "invert_b", True)

def teleop_main():
    driving_mode = 1

    if driving_mode == 0:
        # Driving straight
        Robot.set_value(KOALA_BEAR, "velocity_b", 0.7)
        Robot.set_value(KOALA_BEAR, "velocity_a", 0.7)
    elif driving_mode == 1:
        # Tank Drive
        left_motor_speed = 0
        right_motor_speed = 0
        if Keyboard.get_value("w"):
            left_motor_speed = 1
        elif Keyboard.get_value("s"):
            left_motor_speed = -1
        elif Keyboard.get_value("up_arrow"):
            right_motor_speed = 1
        elif Keyboard.get_value("down_arrow"):
            right_motor_speed = -1
        Robot.set_value(KOALA_BEAR, "velocity_b", left_motor_speed)
        Robot.set_value(KOALA_BEAR, "velocity_a", right_motor_speed)
    elif driving_mode == 2:
        # Arcade Drive
        forward_speed = 0
        turning_speed = 0
        if Keyboard.get_value("w"):
            forward_speed = 1
        elif Keyboard.get_value("s"):
            forward_speed = -1
        if Keyboard.get_value("d"):
            turning_speed = 1
        elif Keyboard.get_value("a"):
            turning_speed = -1
        Robot.set_value(KOALA_BEAR, "velocity_b", max(min((forward_speed + turning_speed), 1.0), -1.0))
        Robot.set_value(KOALA_BEAR, "velocity_a", max(min(forward_speed - turning_speed, 1.0), -1.0))

def autonomous_actions():
    # Left motor rotates in the opposite direction
    Robot.set_value(KOALA_BEAR, "invert_b", True)
    print("Action 1")
    Robot.set_value(KOALA_BEAR, "velocity_b", 1.0)
    Robot.set_value(KOALA_BEAR, "velocity_a", -1.0)
    Robot.sleep(1.0)
    print("Action 2")
    Robot.set_value(KOALA_BEAR, "velocity_b", 1.0)
    Robot.set_value(KOALA_BEAR, "velocity_a", 1.0)
    Robot.sleep(3.0)
    print("Action 3")
    Robot.set_value(KOALA_BEAR, "velocity_b", -1.0)
    Robot.set_value(KOALA_BEAR, "velocity_a", 1.0)
    Robot.sleep(1.0)
    Robot.set_value(KOALA_BEAR, "velocity_b", 0.0)
    Robot.set_value(KOALA_BEAR, "velocity_a", 0.0)
    Robot.sleep(1.0)
