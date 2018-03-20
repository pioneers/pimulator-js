function req(arg, act) {
    var xhttp = new XMLHttpRequest();
    if (act) {
        xhttp.onreadystatechange = function() {
              if (this.readyState == 4 && this.status == 200) {
                     document.getElementById("demo").innerHTML = this.responseText;
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
setInterval(update, 1000)
