const themeCurr = localStorage.getItem("theme")
if(themeCurr){
    document.querySelector(`.${themeCurr}`).classList.add("selected-theme")
    document.documentElement.setAttribute("data-theme", themeCurr)
}
else{
    document.querySelector(".dark-theme").classList.add("selected-theme")
}

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

function saveScript() {
    const loc = location.href;
    console.log(loc)
}



function changeTheme(e) {
    const currTheme = document.querySelector(".selected-theme");
    currTheme.classList.remove("selected-theme");
    const property = e.currentTarget.classList[0];
    e.currentTarget.classList.add("selected-theme");
    document.documentElement.setAttribute("data-theme", property);
    localStorage.setItem("theme", property)
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


saveScript()


const editPgBtn = document.querySelector("#edit_page");

editPgBtn.addEventListener("click", editPg);


async function editPg() {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if(!tab || !tab.id)
        return;
    try{
        await chrome.tabs.sendMessage(tab.id, {type: "ENTER_EDIT_MODE"});
        window.close();
    }
    catch(err) {
        console.log(err);
        editPgBtn.textContent = "Could not edit this page";;
        setTimeout(() => {editPgBtn.textContent = "Start Editing"}, 2000);
    }
}

async function initSettings() {
    const settings = await PTStorage.getSettings();
    const autoToggle = document.querySelector("#automatic_manipulation");
    const scriptsToggle = document.querySelector("#allow_scripts");

    function reflect(btn, isOn) {
        btn.classList.toggle("toggle_on", isOn);
    }
    reflect(autoToggle, settings.automaticManipulation);
    reflect(scriptsToggle, settings.allowScripts);

    autoToggle.addEventListener("click", async ()=> {
        const nxtVal = !autoToggle.classList.contains("toggle_on");
        const updated = await PTStorage.updateSettings({automaticManipulation: nxtVal});
        reflect(autoToggle, updated.automaticManipulation);
    })
    scriptsToggle.addEventListener("click", async () => {
        const nxtVal = !scriptsToggle.classList.contains("toggle_on");
        const updated = await PTStorage.updateSettings({allowScripts: nxtVal});
        reflect(scriptsToggle, updated.allowScripts);
    })
}
initSettings();

(function initClearAll() {
    const clearBtn = document.querySelector("#clear_scripts");
    let armed = false;
    let resetTimer = null;

    clearBtn.addEventListener("click", async () => {
        if(!armed){
            armed = true
            clearBtn.classList.add("confirm-armed")
            resetTimer = setTimeout(() => {
                armed = false
                clearBtn.classList.remove("confirm-armed")
            }, 3000)
            return;
        }
        clearTimeout(resetTimer)
        armed = false
        clearBtn.classList.remove("confirm-armed")
        await PTStorage.clearAll()
    })
})();