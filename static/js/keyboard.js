class Keyboard{
    static keyCodeMatch = {65: 'a', 66: 'b', 67: 'c', 68: 'd', 69: 'e', 70: 'f', 71: 'g', 72: 'h',
                           73: 'i', 74: 'j', 75: 'k', 76: 'l', 77: 'm', 78: 'n', 79: 'o', 80: 'p',
                           81: 'q', 82: 'r', 83: 's', 84: 't', 85: 'u', 86: 'v', 87: 'w', 88: 'x',
                           89: 'y', 90: 'z', 188: ",", 190: ".", 191: "/", 186: ";", 222: "'", 219:"[",
                           221: "]", 37: "left_arrow", 39: "right_arrow", 38: "up_arrow", 40: "down_arrow",
                           48: '0', 49: '1', 50: '2', 51: '3', 52: '4', 53: '5', 54: '6', 55: '7',
                           56: '8', 57: '9'};

    constructor() {
        this.keys = {'a': false, 'b': false, 'c': false, 'd': false, 'e': false, 'f': false, 'g': false, 'h': false,
                     'i': false, 'j': false, 'k': false, 'l': false, 'm': false, 'n': false, 'o': false, 'p': false,
                     'q': false, 'r': false, 's': false, 't': false, 'u': false, 'v': false, 'w': false, 'x': false,
                     'y': false, 'z': false, ",": false, ".": false, "/": false, ";": false, "'": false, "[": false,
                     "]": false, "left_arrow": false, "right_arrow": false, "up_arrow": false, "down_arrow": false,
                     '0': false, '1': false, '2': false, '3': false, '4': false, '5': false, '6': false, '7': false,
                     '8': false, '9': false};
    }

    get_value(key) {
        if (key in this.keys){
            return this.keys[key];
        } else {
            console.log("The " + key + " key is not supported.");
            return false;
        }
    }

    press(key) {
        if (key in this.keys){
            this.keys[key] = true;
        }
    }

    release(key) {
        if (key in this.keys){
            this.keys[key] = false;
        }
    }
}
