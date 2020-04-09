import sys

def autonomous_setup():
    print("Autonomous mode has started!")
    Robot.run(autonomous_actions)

def autonomous_main():
    pass

def teleop_setup():
    pass

def teleop_main():
    driving_mode = 1

    if driving_mode == 0:
        # Driving straight
        Robot.set_value("left_motor", "duty_cycle", 0.7)
        Robot.set_value("right_motor", "duty_cycle", -0.7)
    elif driving_mode == 1:
        # Tank Drive
        Robot.set_value("left_motor", "duty_cycle", Gamepad.get_value("joystick_left_y"))
        Robot.set_value("right_motor", "duty_cycle", -Gamepad.get_value("joystick_right_y"))
    elif driving_mode == 2:
        # Arcade Drive
        turningSpeed =  Gamepad.get_value("joystick_left_x")
        left_y = -Gamepad.get_value("joystick_left_y")
        turningSpeed = turningSpeed * abs(turningSpeed)
        left_y = left_y * abs(left_y)
        Robot.set_value("left_motor", "duty_cycle", max(min(-(left_y + turningSpeed), 1.0), -1.0))
        Robot.set_value("right_motor", "duty_cycle", max(min(left_y - turningSpeed, 1.0), -1.0))

async def autonomous_actions():
    Robot.set_value("left_motor", "duty_cycle", -1.0)
    Robot.set_value("right_motor", "duty_cycle", -1.0)
    await Actions.sleep(1.0)
    Robot.set_value("left_motor", "duty_cycle", -1.0)
    Robot.set_value("right_motor", "duty_cycle", 1.0)
    await Actions.sleep(0.5)
    Robot.set_value("left_motor", "duty_cycle", 1.0)
    Robot.set_value("right_motor", "duty_cycle", 1.0)
    await Actions.sleep(1.0)
