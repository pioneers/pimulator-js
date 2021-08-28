# Pimulator Release Notes

## August 28, 2021
#### Changes
- Bug fixes for autonomous timer and dark mode
- Added tooltips for robot options and info on robot speeds and sizes

## July 31, 2021
#### New
- Button added to clear console
- Default field (four tapelines, interactable object) added as a pre-set option

## April 26, 2021
#### New
- Ramps added as a field element
- Pre-set fields can be selected
    - The autonomous section of the Spring 2021 field has been added
- Updates will now come with Release Notes

## April 12, 2021
#### Changes
- Interactable object collision
    - Interactable objects will collide with non-interactable objects (Robot, walls)
    - Interactable objects will ***not*** collide with interactable objects (objects that can be picked up)
<br>

## April 10, 2021
#### Changes
- API updated for Spring 2021 Competition
- Bug fixes
<br>

## March 29, 2021
#### New
- Support for interactable objects
    - Interactable objects can be picked up and dropped by the robot using `pick_up` and `drop`
- Customizable field
    - A `.json` file can be uploaded under the 'Field' tab
    - The field may be modified directly using the on-page code editor
<br>

## March 20, 2021
#### New
- Support for different robot types
    - Three robot types: Swift, Spry, Sturdy
    - Type may be set in 'Settings'
    - Each is a different size and has a different acceleration
<br>

## February 27, 2021
#### New
- Robots will drive with an acceleration
- The robot starting position can be set in 'Settings'
- The console will display the timestamp for the message being printed

#### Changes
- Bug fixes
<br>

## February 20, 2021
#### New
- Support for Dark Mode, which may be set in 'Settings'
- Support for Editor themes, which may be set in 'Settings'

#### Changes
- Bug fixes
<br>

## February 1, 2021
#### New
- Limit switches added to the robot
    - Readings can be seen in 'Sensors'

#### Changes
- Bug fixes
<br>

## January 30, 2021
#### New
- Support for Keyboard operations
    - Keyboard input may be set in 'Settings'
    - Most keyboard keys may be used in user-defined code

#### Changes
- Bug fixes
<br>

## January 24, 2021
#### New
- UI Overhaul
- Added 'Help' tab for Pimulator documentation and tips for using the simulator
<br>

## January 4, 2021
#### New
- Support for collision detection
    - Robot now collides with field objects (walls)

#### Changes
- Bug fixes
<br>

## December 21, 2020
#### New
- Support for line following added
    - Tape lines added to the field
    - Line sensors added
        - Readings can be seen in 'Sensors'
<br>

## November 20, 2020
#### New
- Support for Gamepad compatibility
    - Under the input gamepad mode, a X-box controller may be used to control the robot in Teleop mode

#### Changes
- Bug fixes
<br>

## November 23, 2020
#### New
- Console added
    - Displays simulator messages
    - Displays printed messages from user-code
<br>

## October 24, 2020
#### New
- Timer for autonomous mode added
<br>

## October 17, 2020
#### Base Version
- Robot operable in Teleop and Autonomous Mode
- Support for student code
    - Code may be uploaded by the user
    - Code may be edited using the on-page code editor
