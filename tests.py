import unittest
import asyncio
import timeout_decorator
import time
import pimulator

class RobotTestCase(unittest.TestCase):
    def setUp(self):
        self.robot = pimulator.RobotClass()
        self.loop_event = asyncio.get_event_loop()

    def test_move_forward(self):
        self.robot.set_value("left_motor", "duty_cycle", 1)
        self.robot.set_value("right_motor", "duty_cycle", -1)

        original_x = self.robot.X
        original_y = self.robot.Y

        self.assertEqual(72, original_x)
        self.assertEqual(72, original_y)
        self.assertEqual(0, self.robot.dir)

        self.loop_event.run_until_complete(self.robot.update_position())

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

        self.loop_event.run_until_complete(self.robot.update_position())

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

    def test_runs_fine(self):
        """Ensure normal code executes without error"""

        async def check_result():
            result = await self.queue.get()
            self.assertFalse(result['x'] != 72.0 and result['y'] != 72.0 
                             and result['dir'] != 0)

            # End the infinite looping of robot execution after passing the
            # assertion
            tasks[0].cancel()

        tasks = [
            asyncio.ensure_future(self.sim.simulate(self.loop_event)),
            asyncio.ensure_future(check_result())
        ]
        self.loop_event.run_until_complete(asyncio.wait(tasks, timeout=1))
        
if __name__ == '__main__':
    unittest.main()
