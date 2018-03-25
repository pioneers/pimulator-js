import unittest
import time
import pimulator
import student_code
import threading

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
        self.sim = pimulator.Simulator(threading.Lock())

    def test_time_out_setup(self):
        long_wait = lambda: time.sleep(100)
        self.assertRaises(TimeoutError, self.sim.simulate, long_wait, 
                          long_wait)

    def test_time_out_main(self):
        long_wait = lambda: time.sleep(100)
        self.assertRaises(TimeoutError, self.sim.simulate, 
                          student_code.teleop_setup, long_wait)

        
if __name__ == '__main__':
    unittest.main()
