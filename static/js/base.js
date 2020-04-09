var screenUpdate;

function req(arg, act) {
    var xhttp = new XMLHttpRequest();
    if (act) {
        xhttp.onreadystatechange = function() {
              if (this.readyState == 4 && this.status == 200) {
                  var state = JSON.parse(this.responseText);
                  console.log("StateX")
                  console.log(state.x)
                  document.getElementById("demo").innerHTML = String([state.x, state.y])
                  var robotRect = document.querySelector("rect")
                  console.log("SVG")
                  console.log(robotRect)
                  robotRect.setAttributeNS(null, "x", state.x)
                  robotRect.setAttributeNS(null, "y", state.y)
                  var rotateStr = "rotate(" + state.theta + " " + (state.x + 15) + " " + (state.y + 20) + ")"
                  console.log(rotateStr)
                  robotRect.setAttribute("transform", rotateStr)
                console.log("Adjusted")
              }
        };
    }
    xhttp.open("GET", arg, true);
    xhttp.send();
}

function update() {
    req("/state", true)
}

function stop() {
    req("/stop", false);
    clearInterval(screenUpdate);
}

function start_teleop() {
    req("/start_teleop", false)
    screenUpdate = setInterval(update, 50);
}
function start_auto(){
  req("/start_auto", false)
  screenUpdate = setInterval(update, 50)
}
