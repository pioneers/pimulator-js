import threading
import multiprocessing
import time
import pimulator
import queue
robot_thread = None
state_queue = None

def start(auto=0):
    """
    Start the robot thread

    Return if started robot thread
    """

    global robot_thread
    
    if robot_thread:
        return False
    else:
        global state_queue
        state_queue = queue.Queue(5)
        pimulator.robot_on = True

        # We utilize a daemon thread to such that the thread exits even if we
        # do not exit gracefully from __main__
        robot_thread = threading.Thread(group=None, target=pimulator.main, args=(state_queue,auto),
                                        name="robot thread", daemon=True)
        robot_thread.start()
        print("robot started")
        
        return True

def stop():
    """Stop the robot thread

    Return whether stopped robot thread
    """
    global robot_thread, state_queue
    robot_thread = None
    pimulator.robot_on = False
    state_queue = None
    return True

def get_state():
    """Attempt to return the state.

    Attempt fails if no state is added after 3 seconds
    """

    return state_queue.get(timeout=0.1)
