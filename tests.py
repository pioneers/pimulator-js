import unittest
import queue
import threading
import time
import pimulator

class RobotTestCase(unittest.TestCase):
    def setUp(self):
        self.robot = pimulator.RobotClass()

    def test_move_forward(self):
        self.robot.set_value("left_motor", "duty_cycle", 1)
        self.robot.set_value("right_motor", "duty_cycle", -1)

        original_x = self.robot.X
        original_y = self.robot.Y

        self.assertEqual(72, original_x)
        self.assertEqual(72, original_y)
        self.assertEqual(0, self.robot.dir)

        self.robot.update_position()

        self.assertEqual(original_y, self.robot.Y)
        self.assertTrue(original_x > self.robot.X)
        self.assertEqual(0, self.robot.dir)

    def test_spin(self):
        self.robot.set_value("left_motor", "duty_cycle", 1)
        self.robot.set_value("right_motor", "duty_cycle", 1)

        original_x = self.robot.X
        original_y = self.robot.Y

        self.assertEqual(72, original_x)
        self.assertEqual(72, original_y)
        self.assertEqual(0, self.robot.dir)

        self.robot.update_position()

        self.assertEqual(original_y, self.robot.Y)
        self.assertEqual(original_x, self.robot.X)
        self.assertTrue(0 < self.robot.dir)

    def test_run_basic(self):
        pass

class SimulatorTestCase(unittest.TestCase):
    def setUp(self):
        self.queue = queue.Queue(maxsize=5)
        self.sim = pimulator.Simulator(self.queue)

    def test_runs_fine(self):
        """Ensure normal code executes without error"""
        robot_thread = threading.Thread(group=None, target=self.sim.simulate,
                                        name="robot thread", daemon=True)
        robot_thread.start()

        result = self.queue.get(timeout=1)
        self.assertFalse(result['x'] != 72.0 and result['y'] != 72.0 
                         and result['dir'] != 0)
        
if __name__ == '__main__':
    unittest.main()
