function addGoBack(first, second, tagClass) {
    function toggleBtwFS(e) {
        if(first.checkVisibility()){
            first.style.display = "none";
            second.style.display = "block";
        }
        else{
            first.style.display = "block";
            second.style.display = "none";
        }
    }
    const goToBtn = first.querySelector(`.${tagClass}`)
    goToBtn.addEventListener("click", toggleBtwFS);
    const backBtn = second.querySelector(".back-button");
    backBtn.addEventListener("click", toggleBtwFS);
}

function moveToLoc(url, tagClass) {
    
    function moveToListener(e){

    }
    const goToBtn = document.querySelector(`.${tagClass}`);
    goToBtn.addEventListener("click", moveToListener)
}







function changeTheme(e) {
    const currTheme = document.querySelector(".selected-theme");
    currTheme.classList.remove("selected-theme");
    const property = e.currentTarget.classList[0];
    e.currentTarget.classList.add("selected-theme");
    document.body.setAttribute("data-theme", property);
}
const themes = document.querySelector(".theme-boxes").children;
for(const theme of themes){
    theme.addEventListener("click", changeTheme)
}
const main = document.querySelector(".main-page");
const settings = document.querySelector(".settings-page");
addGoBack(main, settings, "settings-button");

const exportScripts = document.querySelector(".export-scripts");
addGoBack(main, exportScripts, "export-scripts-option");
const dashboard = document.querySelector(".dashboard");
addGoBack(main, dashboard, "dashboard-open")




