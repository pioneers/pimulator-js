/**
 * Initialize Nightly and manually change the color of certain elements
 */
var darkToggle = false;
var nightly = new Nightly();
function toggle() {

  console.log("toggling")
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
  let dropdownMenuElements = document.getElementsByClassName("dropdown-menu")
  console.log(dropdownMenuElements)
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
  let buttonBackground = "#007bff"

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
    for (var h = 0; h < tableElements.length; h++){
      tableElements[h].style.color = colorDark
    }
    for (var h = 0; h < codeElements.length; h++){
      codeElements[h].style.backgroundColor = codeElementsDarkBackgroundColor
    }
    for (var h = 0; h < summaryElements.length; h++){
      summaryElements[h].style.color = linkDarkColor
    }

    for (var h = 0; h < dropdownMenuElements.length; h++){
      dropdownMenuElements[h].style.backgroundColor = buttonDarkBackground
    }


    consoleLog.style.color = colorDark
    field.style.backgroundColor = fieldColorDark
    changeTheme(1)

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
    for (var h = 0; h < tableElements.length; h++){
      tableElements[h].style.color = colorDefault
    }
    for (var h = 0; h < codeElements.length; h++){
      codeElements[h].style.backgroundColor = codeElementsBackgroundColor
    }
    for (var h = 0; h < summaryElements.length; h++){
      summaryElements[h].style.color = linkColor
    }

    for (var h = 0; h < dropdownMenuElements.length; h++){
      dropdownMenuElements[h].style.backgroundColor = buttonBackground
    }


    consoleLog.style.color = colorDefault
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
