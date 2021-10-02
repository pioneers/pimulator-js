// 32 = spacebar, 37 = left key, 38 = up key, 39 = right key, 40 = down key
window.addEventListener("keydown", function(e) {
    if([37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);