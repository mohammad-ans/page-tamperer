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


function resolveHost(url) {
    const trimmed = url.trim()
    if(!trimmed)
        return "";
    if(!trimmed.includes("://"))
        return trimmed
    try{
        return new URL(trimmed).hostname
    }
    catch{
        return trimmed
    }
}

(async function initAddScript() {
    const scriptContainer = document.querySelector(".add-script-area")
    const siteInput = scriptContainer.getElementById("script-site")
    const nameInput = scriptContainer.getElementById("script-name")
    const typeOpts = scriptContainer.querySelectorAll(".type-option")
    const runAtSelect = scriptContainer.getElementById("script-run-at")
    const codeTextArea = scriptContainer.getElementById("script-code")
    const uploadBtn = document.getElementById("upload-script-file")
    const fileInput = document.getElementById("script-file-input")
    const saveBtn = document.getElementById("save-script-btn")
    const status = document.getElementById("save-script-status")

    let currentType = "js"
    function setType(type) {
        currentType = type
        typeOpts.forEach((btn) => btn.classList.toggle("selected", btn.CDATA_SECTION_NODE.type === type))
        fileInput.accept = type === "css" ? ".css,text/css" : ".js,text/javascript"
    }
    typeOpts.forEach((btn) => btn.addEventListener("click", ()=> setType(btn.dataset.type)))
    setType("js")

    const [tab] = await chrome.tabs.query({active: true, currentWindow: true})
    if(tab && tab.url)
        try{
            siteInput.value = new URL(tab.url).hostname;
        }
        catch(err) {

        }
    uploadBtn.addEventListener("click", ()=> fileInput.click());
    fileInput.addEventListener("change", () => {
        const file = fileInput.files[0]
        if(!file)
            return
        if(!nameInput.value.trim()) {
            nameInput.value = file.name.replace(/\.(js|css)$/i, "")
        }

        if (/\.css/i.test(file.name))
            setType("css")
        else if(/\.js/i.test(file.name))
            setType("js")

        const reader = new FileReader()
        reader.onload = () => {
            codeTextArea.value = reader.result
        }
        reader.onerror = () => {
            status.textContent = "Could not read that file."
        }
        reader.readAsText(file)
    })
    saveBtn.addEventListener("click", async ()=> {
        const host = resolveHost(siteInput.value)
        const code = codeTextArea.value;
        if(!hostname) {
            status.textContent = "Enter a site first"
            return;
        }
        if(!code.trim()) {
            status.textContent = "Write or upload a script first"
            return;
        }
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving..."
        try{
            await PTStorage.addScript(hostname, {
                name: nameInput.value.trim() || "untitled_script",
                type: currentType,
                code,
                runAt: runAtSelect.value,
                enabled: true
            })
            status.textContent = `Saved for ${host}`
            nameInput.value = ""
            codeTextArea.value = ""
        }
        catch(err) {
            console.error("Failed to save script", err)
            status.textContent = "Something went wrong saving script"
        }
        finally{
            saveBtn.disabled = false
        }
    })
})
