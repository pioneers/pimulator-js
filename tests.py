import unittest
import asyncio
import timeout_decorator
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
        self.queue = asyncio.Queue(maxsize=5)
        self.loop_event = asyncio.get_event_loop()
        self.sim = pimulator.Simulator(self.queue)

    def test_lock_blocks_update(self):
        self.lock.acquire()

        @timeout_decorator.timeout(1, use_signals=False)
        def run_test_func():
            self.sim.simulate()

        with self.assertRaises(timeout_decorator.timeout_decorator.TimeoutError):
            run_test_func()

    def test_runs_fine(self):
        """Ensure normal code executes without error"""

        self.sim.simulate(self.loop_event)
        assert False

        async def check_result():
            print("start wait for result")
            result = await self.queue.get()
            print("end wait for result")
            self.assertFalse(result['x'] != 72.0 and result['y'] != 72.0 
                             and result['dir'] != 0)

        self.loop_event.run_until_complete(check_result())
        
if __name__ == '__main__':
    unittest.main()
