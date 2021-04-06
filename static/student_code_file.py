KOALA_BEAR = "koala_bear"

def autonomous_setup():
    print("Autonomous mode has started!")
    Robot.run(autonomous_actions)

def autonomous_main():
    pass

def teleop_setup():
    Robot.set_value(KOALA_BEAR, "invert_b", True)
    pass

def teleop_main():
    driving_mode = 1

    if driving_mode == 0:
        # Driving straight
        Robot.set_value(KOALA_BEAR, "velocity_b", 0.7)
        Robot.set_value(KOALA_BEAR, "velocity_a", 0.7)
    elif driving_mode == 1:
        # Tank Drive
        Robot.set_value(KOALA_BEAR, "velocity_b", Gamepad.get_value("joystick_left_y"))
        Robot.set_value(KOALA_BEAR, "velocity_a", Gamepad.get_value("joystick_right_y"))
    elif driving_mode == 2:
        # Arcade Drive
        turningSpeed =  Gamepad.get_value("joystick_left_x")
        left_y = Gamepad.get_value("joystick_left_y")
        turningSpeed = turningSpeed * abs(turningSpeed)
        left_y = left_y * abs(left_y)
        Robot.set_value(KOALA_BEAR, "velocity_b", max(min((left_y + turningSpeed), 1.0), -1.0))
        Robot.set_value(KOALA_BEAR, "velocity_a", max(min(left_y - turningSpeed, 1.0), -1.0))

def autonomous_actions():
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
