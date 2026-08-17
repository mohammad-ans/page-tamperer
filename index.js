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
const mainPg = document.querySelector(".main-page");
const settingsPg = document.querySelector(".settings-page");
addGoBack(mainPg, settingsPg, "settings-button");

const exportScripts = document.querySelector(".export-scripts");
const dashboardPg = document.querySelector(".dashboard");
const addScriptPg = document.querySelector(".add-script-page")
const runningScriptsPg = document.querySelector(".running-scripts-page")
const allScriptsPg = document.querySelector(".all-scripts-page")
addGoBack(mainPg, exportScripts, "export-scripts-option");
addGoBack(mainPg, dashboardPg, "dashboard-open")
addGoBack(mainPg, addScriptPg, "add-new-script")
saveScript(mainPg, runningScriptsPg, "see-running-scripts")
saveScript(mainPg, allScriptsPg, "all-scripts-page")


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
    const siteInput = addScriptPg.getElementById("script-site")
    const nameInput = addScriptPg.getElementById("script-name")
    const typeOpts = addScriptPg.querySelectorAll(".type-option")
    const runAtSelect = addScriptPg.getElementById("script-run-at")
    const codeTextArea = addScriptPg.getElementById("script-code")
    const uploadBtn = addScriptPg.getElementById("upload-script-file")
    const fileInput = addScriptPg.getElementById("script-file-input")
    const saveBtn = addScriptPg.getElementById("save-script-btn")
    const status = addScriptPg.getElementById("save-script-status")

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
        if(!host) {
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
            await PTStorage.add(host, {
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

async function refreshStats() {
    const [allScripts, runningScripts] = await Promise.all([
        PTStorage.getAllScripts(),
        PTStorage.getRunning()
    ])
    const active = allScripts.filter((s) => s.enabled).length
    const inActive = allScripts.length - active
    document.querySelector(".total-running .number").textContent = runningScripts.length
    document.querySelector(".total-active .number").textContent = active;
    document.querySelector(".total-inactive .number").textContent = inActive
}
refreshStats()

document.querySelectorAll(".back-button").forEach((btn) => btn.addEventListener("click", refreshStats))


const typeLabels = {js: "JavaScript", css: "CSS", "dom-edit" : "Visual Edit"}

function buildScriptRow(script, onChange) {
    const row = document.createElement("div")
    row.className = "single-script"

    const details = document.createElement("div")
    details.className = "single-script-details"
    const meta = document.createElement("div")
    meta.className = "single-script-meta"
    const site = document.createElement("span")
    site.className = "single-script-site"
    site.textContent = script.host
    const type = document.createElement("span")
    type.className = "single-script-type"
    type.textContent = typeLabels[type] || type
    const name = document.createElement("div")
    name.className = "single-script-name"
    name.textContent = script.name
    meta.append(site, type)
    details.append(name, meta)

    const actions = document.createElement("div")
    actions.className = "single-script-actions"
    const scriptBtn = document.createElement("button")
    scriptBtn.className = "single-script-toggle"
    scriptBtn.classList.toggle("script-on", script.enabled)
    scriptBtn.textContent = script.enabled ? "On" : "Off"
    scriptBtn.addEventListener("click", async () => {
        await PTStorage.scriptEnable(script.host, script.id, !script.enabled)
        onChange()
    })
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "single-script-delete"
    deleteBtn.textContent = "Delete"
    deleteBtn.addEventListener("click", async ()=> {
        await PTStorage.deleteScript(script.host, script.id)
        onChange();
    })
    actions.append(scriptBtn, deleteBtn)

    row.append(details, actions)
    return row;
}
function renderScripts(container, scripts, onChange) {
    container.innerHTML = "";
    if(scripts.length === 0) {
        const empty = document.createElement("div")
        empty.className = "scripts-list-empty"
        empty.textContent = "No scripts yet"
        container.appendChild(empty)
        return;
    }
    for (const script of scripts)
        container.appendChild(buildScriptRow(script, onChange))
}
