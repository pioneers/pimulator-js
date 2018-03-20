import threading
import time

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

def status():
    return robot_thread, keep_going_lock, keep_going, state_lock, state

def main():
    state_init()

def robot():
    """Continually update state"""
    while(get_keep_going()):
        update_state()

def state_init():
    """Initialize the state var
    
    Do not erase state_lock if already exists"""
    global state_lock
    global state

    if state_lock is None:
        state_lock = threading.Lock()
        state = None

def get_state():
    global state_lock
    global state
    state_lock.acquire()
    result = state 
    state_lock.release()
    return result

def update_state():
    global state_lock
    global state
    state_lock.acquire()
    state = str(time.ctime(time.time()))
    state_lock.release()
    pass

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
