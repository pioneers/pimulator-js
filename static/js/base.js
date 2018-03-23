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
    req("/stop", false)
}

function start() {
    req("/start", false)
}

setInterval(update, 3000);


