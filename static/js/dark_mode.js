/**
 * Initialize Nightly and manually change the color of certain elements
 */
var darkToggle = false;
var nightly = new Nightly();
function toggle() {
  nightly.toggle();
  let headerElements = document.getElementsByClassName('card-header')
  let bodyElements = document.getElementsByClassName('card-body')
  let footerElements = document.getElementsByClassName('card-footer')
  let tableElements = document.getElementsByTagName("table")
  let codeElements = document.getElementsByTagName("code")
  let consoleLog = document.getElementById("console")
  let field = document.getElementById("field")
  if (!darkToggle){
    for (var h = 0; h < headerElements.length; h++){
      headerElements[h].style.backgroundColor = "#313131"
    }
    for (var h = 0; h < bodyElements.length; h++){
      bodyElements[h].style.backgroundColor = "#313131"
    }
    for (var h = 0; h < footerElements.length; h++){
      footerElements[h].style.backgroundColor = "#313131"
    }
    for (var h = 0; h < tableElements.length; h++){
      tableElements[h].style.color = "#ffffff"
    }
    for (var h = 0; h < codeElements.length; h++){
      codeElements[h].style.backgroundColor = "#3f3f3f"
    }
    consoleLog.style.color = "#f5f5f5"
    field.style.backgroundColor = "#bbbbbb"
    changeTheme(1)

  } else {
    for (var h = 0; h < headerElements.length; h++){
      headerElements[h].style.backgroundColor = "#ffffff"
    }
    for (var h = 0; h < bodyElements.length; h++){
      bodyElements[h].style.backgroundColor = "#ffffff"
    }
    for (var h = 0; h < footerElements.length; h++){
      footerElements[h].style.backgroundColor = "#ffffff"
    }
    for (var h = 0; h < tableElements.length; h++){
      tableElements[h].style.color = "#000000"
    }
    for (var h = 0; h < codeElements.length; h++){
      codeElements[h].style.backgroundColor = "#f1f1f1"
    }
    consoleLog.style.color = "#000000"

    changeTheme(0)
  }
  darkToggle = !darkToggle
  localStorage.setItem("mode", darkToggle)

}
var savedMode = localStorage.getItem("mode")
var savedTheme = localStorage.getItem("theme")
if (savedMode === 'true') {
  toggle()
}
if (savedTheme == "" || savedTheme === null) {
  cm.setOption("theme",'default');
} else {
  changeTheme(savedTheme)
}