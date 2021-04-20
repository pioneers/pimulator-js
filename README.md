# Pimulator

Pimulator is a robotics simulator for the Pioneers in Engineering robotics kit. Pimulator seeks to allow students to gain experience in programming their robot with any internet-accessible computer. Students are able to execute code on this virtual robot, just as they can on a physical robot and receive the same feedback. Pimulator seeks to allow aspiring programers the ability to iterate and explore without the constraints of a single physical robot.

Pimulator is a fully client-side web application. It can be viewed as having two parts. The simulator, which runs in a Web Worker (see static/js/robot.js) calculates and determines the state of the robot after taking into account physics, student code, the game pad, etc. The UI (index.html and base.js) receives information from the simulator and displays the state of the simulator to the user.

## The Simulator

The simulator was largely developed as a Python-based server side application by Wing during Spring 2017. Wing and Scott originally released the simulator using a text based UI through repl.it for general students to use. The UI along with the robustness proved too large of a challenge to prove useful for general PiE students. It was later converted to JavaScript + [Pyodide](https://github.com/iodide-project/pyodide) for running student code by Charles, Kevin, and Ryan in Summer 2020.

The simulator models the robot as a cart with two independently powered wheels. It provides line follower and limit switch sensors, and objects that can be interacted with through the `drop()` and `pick_up()` abstracted functions. Users can input their own fields in a JSON format.

Ideally, the simulator will later have the flexibility for the student to add on their own other motors and sensors to interact with the world.

## The Web Application

The UI visualizes the state of the robot by updating an HTML Canvas diagram every time update() in base.js is called. The UI communicates the user intention to start and stop simulation with the simulator through buttons. 

## Containerization

To easily deploy, develop, and run the application, pimulator is packaged in images to run in portable containers.

`pie-bot-simulator-dev` is an image that allows developers to run pimulator on identical environments. Files are mounted into the container from the developer's current directory; changes to files on the developer's computer are immediately reflected in the container. Admittedly, the requirements of the environment are sparse, predominantly Flask and Python. I have yet to upload the image to a hoster.

`gcr.io/pimulator-198909/pie-bot-simulator` is an image to run the complete pimulator on a production environment such as Google Cloud or host. Individuals need only download the image and run the image on a container to run pimulator, no cloning required.

## Deployment

Pimulator is publicly hosted at [pimulator.pierobotics.org](https://pimulator.pierobotics.org/).

## Future Development

* Better error messages and feedback
* Customization of the robot to include sensors and motors, etc.
    - Visual reflection of this
* See the [Github project](https://github.com/pioneers/pimulator-js/projects/1) for the most recent updates.

