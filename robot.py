import threading
import time
import pimulator
import student_code

robot_thread = None
keep_going_lock = None
keep_going = False
state_lock = None
state = None

def start():
    """
    Start the robot thread
    
    Return if started robot thread
    """

    global robot_thread

    if robot_thread:
        return False
    else:
        global keep_going_lock
        keep_going_lock = threading.Lock()
        set_keep_going(True)

        # We utilize a daemon thread to such that the thread exits even if we
        # do not exit gracefully from __main__
        robot_thread = threading.Thread(group=None, target=robot, 
                                        name="robot thread", daemon=True)
        robot_thread.start()
        return True

def stop():
    """Stop the robot thread
    
    Return whether stopped robot thread
    """
    global robot_thread

    if robot_thread:
        set_keep_going(False)
        robot_thread.join()
        robot_thread = None
        return True
    else:
        return False

def main():
    state_init()

def robot():
    """Continually update state"""
    while(get_keep_going()):
        update_state()
        time.sleep(0.25)


def state_init():
    """Initialize the state var
    
    Do not erase state_lock if already exists"""
    global state_lock
    global state

    if state_lock is None:
        state_lock = threading.Lock()
        state = "initialized state"

def get_state():
    global state_lock
    global state
    if state_lock:
        state_lock.acquire()
        result = state 
        state_lock.release()
        return result

    # In the event state_init has not occured yet
    # return only defaults
    else:
        return 72, 72, 0

def update_state():
    """Update the state of the robot.

    Safely updates the state after obtaining the global state lock.
    """

    global state_lock
    global state
    if state_lock:
        student_code.teleop_main()
        pimulator.Robot.update_position()

        state_lock.acquire()
        state = pimulator.Robot.X, pimulator.Robot.Y, pimulator.Robot.dir
        state_lock.release()

    # Gracefully handle attempts to update without initialization
    # TODO perhaps this is something that would be best handled with
    # object oriented programming.
    else:
        return

def set_keep_going(val):
    """Safely set whether to keep going"""
    global keep_going_lock
    global keep_going
    keep_going_lock.acquire()
    keep_going = val
    keep_going_lock.release()

def get_keep_going():
    """Safely read whether to keep going"""
    global keep_going_lock
    global keep_going
    keep_going_lock.acquire()
    result = keep_going 
    keep_going_lock.release()
    return result

if __name__ == "__main__":
    main()
