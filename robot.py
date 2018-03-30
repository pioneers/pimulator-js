import threading
import time
import pimulator
import queue

robot_thread = None
state_queue = None

def start():
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

        # We utilize a daemon thread to such that the thread exits even if we
        # do not exit gracefully from __main__
        robot_thread = threading.Thread(group=None, target=pimulator.main, args=(state_queue,),
                                        name="robot thread", daemon=True)
        robot_thread.start()
        return True

def stop():
    """Stop the robot thread
    
    Return whether stopped robot thread
    """
    return False

def get_state():
    """Attempt to return the state.

    Attempt fails if no state is added after 3 seconds
    """
    
    return state_queue.get(timeout=3)
