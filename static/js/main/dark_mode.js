/**
 * Initialize Nightly and manually change the color of certain elements
 */
var darkToggle = false;
var nightly = new Nightly();
function toggle() {

    nightly.toggle();
    //TODO: Fix into CSS-variables next time
    let headerElements = document.getElementsByClassName('card-header')
    let bodyElements = document.getElementsByClassName('card-body')
    let footerElements = document.getElementsByClassName('card-footer')
    let tableElements = document.getElementsByTagName("table")
    let codeElements = document.getElementsByTagName("code")
    let consoleLog = document.getElementById("console")
    let field = document.getElementById("field")
    let summaryElements = document.getElementsByTagName("summary")
    let fieldPresets = document.getElementsByClassName('field-presets-cont')

    let colorDefault = "#000000"
    let backgroundColorDefault = "#ffffff"
    let colorDark = "#ffffff"
    let backgroundColorDark = "#313131"
    let fieldColorDark = "#bbbbbb"
    let codeElementsBackgroundColor = "#f1f1f1"
    let codeElementsDarkBackgroundColor = "#3f3f3f"
    let linkDarkColor = "#009688"
    let linkColor = "#007bff"
    let buttonDarkBackground = "#757575"
    let buttonBackground = "#007bff!important"

    // If theme is default light/dark, switch to default dark/light
    // Otherwise, keep the existing theme
    let editorTheme = localStorage.getItem("theme")

    if (!darkToggle){
        for (var h = 0; h < headerElements.length; h++){
            headerElements[h].style.backgroundColor =  backgroundColorDark
        }
        for (var h = 0; h < bodyElements.length; h++){
            bodyElements[h].style.backgroundColor = backgroundColorDark
        }
        for (var h = 0; h < footerElements.length; h++){
            footerElements[h].style.backgroundColor = backgroundColorDark
        }
        for (var h = 0; h < fieldPresets.length; h++){
            fieldPresets[h].classList.remove("bg-light");
            fieldPresets[h].style.backgroundColor = backgroundColorDark
        }
        for (var h = 0; h < tableElements.length; h++){
            tableElements[h].style.color = colorDark
        }
        for (var h = 0; h < codeElements.length; h++){
            codeElements[h].style.backgroundColor = codeElementsDarkBackgroundColor
        }
        for (var h = 0; h < summaryElements.length; h++){
            summaryElements[h].style.color = linkDarkColor
        }
        document.getElementById(robotType + "-btn").style.backgroundColor = "#404040"; // robotType to dark gray
        document.getElementById(inputMode + "-btn").style.backgroundColor = "#404040"; // inputMode to dark gray
        document.getElementById("dark-toggle").style.backgroundColor = "#404040";
        if (!(mode === "idle")) {
            if (mode === "auto") {
                document.getElementById("autonomous-btn").style.backgroundColor = "#404040";
            } else {
                document.getElementById("teleop-btn").style.backgroundColor = "#404040";
            }
        }
        
        consoleLog.style.color = colorDark
        field.style.backgroundColor = fieldColorDark

        if (editorTheme === 0 || editorTheme === "0" || editorTheme === null) { // Default light
            changeTheme(1) // Change to default dark
        }

    } else {
        for (var h = 0; h < headerElements.length; h++){
            headerElements[h].style.backgroundColor = backgroundColorDefault
        }
        for (var h = 0; h < bodyElements.length; h++){
            bodyElements[h].style.backgroundColor = backgroundColorDefault
        }
        for (var h = 0; h < footerElements.length; h++){
            footerElements[h].style.backgroundColor = backgroundColorDefault
        }
        for (var h = 0; h < fieldPresets.length; h++){
            fieldPresets[h].classList.add("bg-light");
        }
        for (var h = 0; h < tableElements.length; h++){
            tableElements[h].style.color = colorDefault
        }
        for (var h = 0; h < codeElements.length; h++){
            codeElements[h].style.backgroundColor = codeElementsBackgroundColor
        }
        for (var h = 0; h < summaryElements.length; h++){
            summaryElements[h].style.color = linkColor
        }

        consoleLog.style.color = colorDefault
        if (editorTheme === 1 || editorTheme === "1" || editorTheme === null) { // Default dark
            changeTheme(0) // Change to default light
        }
    }
    darkToggle = !darkToggle
    localStorage.setItem("mode", darkToggle)
}

var savedMode = localStorage.getItem("mode")
var savedTheme = localStorage.getItem("theme")
if (savedMode === 'true') {
    toggle()
}
if (savedTheme === "" || savedTheme === null) {
    cm.setOption("theme",'default')
} else {
    changeTheme(savedTheme)
}
