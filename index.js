const themeCurr = localStorage.getItem("theme")
if(themeCurr){
    document.querySelector(`.${themeCurr}`).classList.add("selected-theme")
    document.documentElement.setAttribute("data-theme", themeCurr)
}
else{
    document.querySelector(".dark-theme").classList.add("selected-theme")
}

PTStorage.updateSettings({theme: themeCurr || "dark-theme"});

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


async function changeTheme(e) {
    const currTheme = document.querySelector(".selected-theme");
    currTheme.classList.remove("selected-theme");
    const property = e.currentTarget.classList[0];
    e.currentTarget.classList.add("selected-theme");
    document.documentElement.setAttribute("data-theme", property);
    localStorage.setItem("theme", property);

    PTStorage.updateSettings({theme: property || "dark-theme"});
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if(!tab || !tab.id)
        return;
    try{
        await chrome.tabs.sendMessage(tab.id, {type: "CHANGE_THEME"});
    }
    catch{

    }
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
addGoBack(mainPg, runningScriptsPg, "see-running-scripts")
addGoBack(mainPg, allScriptsPg, "see-all-scripts")


const editPgBtn = document.querySelector("#edit-page");

editPgBtn.addEventListener("click", editPg);


async function editPg() {
    const settings = await PTStorage.getSettings();
    const anyOn = Object.values(settings.editOptions || {}).some(Boolean)
    if(!anyOn) {
        editPgBtn.textContent = "Enable options in settings first"
        setTimeout(() => {
            editPgBtn.textContent = "Start Editing"
        }, 3000)
        return
    }
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if(!tab || !tab.id)
        return;
    try{
        await chrome.tabs.sendMessage(tab.id, {type: "ENTER_EDIT_MODE"});
        editPgBtn.textContent = "Editing..."
        window.close();
    }
    catch(err) {
        console.log(err);
        editPgBtn.textContent = "Could not edit this page";;
        setTimeout(() => {editPgBtn.textContent = "Start Editing"}, 2000);
    }
}

const EDIT_OPTION_IDS = {
    text: "edit_opt_text",
    attributes: "edit_opt_attribute",
    textColor: "edit_opt_txtClr",
    backgroundColor: "edit_opt_bgClr",
    forceShow: "edit_opt_forceShow",
    border: "edit_opt_border",
    borderRadius: "edit_opt_borderRadius",
    opacity: "edit_opt_opacity",
    fontSW: "edit_opt_fontSizeWeight",
    padding: "edit_opt_padding",
    margin: "edit_opt_margin",
    size: "edit_opt_widthHeight",
    zIdx: "edit_opt_zIndex",
    hide: "edit_opt_hide",
    delete: "edit_opt_delete"
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
    let countOn = 0;
    const editOpts = settings.editOptions || {};
    for (const [key, id] of Object.entries(EDIT_OPTION_IDS)) {
        const btn = document.querySelector(`#${id}`)
        if(!btn)
            continue
        if(editOpts[key] && countOn < 5){
            btn.classList.toggle("toggle_on", true)
            countOn++
        }
        else if(editOpts[key]){
                await PTStorage.updateSettings({editOptions: {...editOpts, [key]: false}})
        }

        btn.addEventListener("click", async () => {
            const curr = await PTStorage.getSettings()
            const currOpts = curr.editOptions || {}
            const nxtVal = !btn.classList.contains("toggle_on")
            console.log(countOn)
            if(nxtVal && countOn == 5){
                alert("Max 5 options are allowed")
                return
            }
            else if(nxtVal)
                countOn++
            else
                countOn--
            const updated = await PTStorage.updateSettings({editOptions: {...currOpts, [key] : nxtVal}})
            btn.classList.toggle("toggle_on", !!updated.editOptions[key])
        })
    }
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
    const siteInput = addScriptPg.querySelector("#script-site")
    const nameInput = addScriptPg.querySelector("#script-name")
    const typeOpts = addScriptPg.querySelectorAll(".type-option")
    const runAtSelect = addScriptPg.querySelector("#script-run-at")
    const codeTextArea = addScriptPg.querySelector("#script-code")
    const uploadBtn = addScriptPg.querySelector("#upload-script-file")
    const fileInput = addScriptPg.querySelector("#script-file-input")
    const saveBtn = addScriptPg.querySelector("#save-script-btn")
    const status = addScriptPg.querySelector("#save-script-status")

    let currentType = "js"
    function setType(type) {
        currentType = type
        typeOpts.forEach((btn) => btn.classList.toggle("selected", btn.dataset.type === type))
        fileInput.accept = type === "css" ? ".css,text/css" : ".js,text/javascript"
        addScriptPg.querySelector(".toggle_on").classList.toggle("toggle_on")
        addScriptPg.querySelector(`.${type}-btn`).classList.toggle("toggle_on")
        
    }
    typeOpts.forEach((btn) => btn.addEventListener("click", (e)=> setType(btn.dataset.type)))
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

        if (/\.css$/i.test(file.name))
            setType("css")
        else if(/\.js$/i.test(file.name))
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
            status.textContent = `Saved for ${host}, reload to see results if current site.`
            nameInput.value = ""
            codeTextArea.value = ""
            saveBtn.textContent = "Save Script"
        }
        catch(err) {
            console.error("Failed to save script", err)
            status.textContent = "Something went wrong saving script"
        }
        finally{
            saveBtn.disabled = false
        }
    })
})()

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
    type.textContent = typeLabels[script.type] || script.type
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

async function showRunningScripts() {
    const listEl = document.querySelector("#running-scripts-list")
    const noticeEl = document.querySelector(".scripts-list-notice")
    const settings = await PTStorage.getSettings();
    if(!settings.allowScripts) {
        noticeEl.hidden = false
        noticeEl.textContent = "Scripts are turned off globally in settings - nothing is currently running"
    }
    else{
        noticeEl.hidden = true
        noticeEl.textContent = ""
    }
    const scripts = await PTStorage.getRunning()
    renderScripts(listEl, scripts, showRunningScripts)
}

async function showAllScripts() {
    const listEl = document.querySelector("#all-scripts-list")
    const scripts = await PTStorage.getAllScripts()
    renderScripts(listEl, scripts, showAllScripts)
}
document.querySelector(".see-running-scripts").addEventListener("click", showRunningScripts)
document.querySelector(".see-all-scripts").addEventListener("click", showAllScripts)

function validateName(name) {
    return (name || "script").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "script"
}
function extension(type) {
    return {js: "js", css: "css", "dom-edit": "json"}[type] || "txt";
}
function scriptToFile(script) {
    const filename = `${validateName(script.name)}.${extension(script.type)}`
    const data = script.type === "dom-edit" ? JSON.stringify(JSON.parse(script.code || "[]"), null, 2) : script.code || ""
    return {host: script.host, filename, data}
}
function uniqueNames(usedNames, basePath) {
    if(!usedNames.has(basePath)) {
        usedNames.add(basePath)
        return basePath
    }
    let i = 2
    let candidate;
    do{
        candidate = basePath.replace(/(\.[^./]+)$/, `-${i}$1`)
        i++
    } while(usedNames.has(candidate))
    return candidate;
}

(function initExport() {
    const zipBtn = document.querySelector(".export-as-zip")
    const filesBtn = document.querySelector(".export-as-files")
    const status = document.querySelector("#export-status")
    filesBtn.addEventListener("click", async () => {
        const scripts = await PTStorage.getAllScripts()
        if(scripts.length === 0) {
            status.textContent = "No scripts to export yet"
            return
        }
        status.textContent = `Exporting ${scripts.length} files...`;
        const usedNames = new Set()
        let failed = 0
        for(const script of scripts){
            const {host, filename, data} = scriptToFile(script)
            const path = uniqueNames(usedNames, `${host}/${filename}`)
            const url = URL.createObjectURL(new Blob([data], {type: "text/plain"}))
            try{
                await chrome.downloads.download({url, filename: path, saveAs: false})
            }
            catch(err) {
                console.warn(`Could not export ${script.name}`, err)
                failed++;
            }
            finally{
                setTimeout(() => URL.revokeObjectURL(url), 10000)
            }
        }
        status.textContent = `Successfully exported: ${scripts.length}. Failed: ${failed}.`
    })
    zipBtn.addEventListener("click", async () => {
        const scripts = await PTStorage.getAllScripts()
        if (scripts.length === 0) {
            status.textContent = "No scripts to export yet"
            return
        }
        status.textContent = "Building Zip..."
        const usedNames = new Set()
        const entries = scripts.map((script) => {
            const {host, filename, data} = scriptToFile(script)
            return {name: uniqueNames(usedNames, `${host}/${filename}`), data}
        })
        const blob = PTZip.createZip(entries)
        const url = URL.createObjectURL(blob)
        try{
            await chrome.downloads.download({
                url, filename: `page-tamperer-export-${Date.now()}.zip`, saveAs: false
            })
            status.textContent = `Exported ${scripts.length} scripts as a zip`
        }
        catch(err) {
            console.error("Zip export failed", err)
            status.textContent = "ZIP Export failed"
        }
        finally{
            setTimeout(() => URL.revokeObjectURL(url), 10000)
        }
    })
})()

async function showDashboard(){
    const [sites, appSettings] = await Promise.all([PTStorage.getAllSites(), PTStorage.getSettings()])
    const hosts = Object.keys(sites).sort()
    const totalScripts = hosts.reduce((sum, h) => sum + sites[h].scripts.length, 0)
    const totalRunning = appSettings.allowScripts ? hosts.reduce((sum, h) => sum + sites[h].scripts.filter((s) => s.enabled).length, 0) : 0;

    document.querySelector(".dashboard-stat-scripts .number").textContent = totalScripts
    document.querySelector(".dashboard-stat-sites .number").textContent = hosts.length
    document.querySelector(".dashboard-stat-running .number").textContent = totalRunning

    const listEl = document.querySelector(".dashboard-sites-list")
    listEl.innerHTML = "";
    if(hosts.length === 0) {
        const empty = document.createElement("div")
        empty.className = "scripts-list-empty";
        empty.texContent = "No sites with saved scripts yet."
        listEl.appendChild(empty)
        return;
    }
    for(const host of hosts) {
        const scripts = sites[host].scripts
        const count = scripts.filter((s) => s.enabled).length

        const row = document.createElement("div")
        row.className = "dashboard-site-row"
        const name = document.createElement("div")
        name.className = "dashboard-site-name"
        name.textContent = host
        const countEl = document.createElement("div")
        countEl.className = "dashboard-site-count"
        countEl.textContent = `${count}/${scripts.length} enabled`

        row.append(name, countEl)
        listEl.append(row)
    }
}

function goTo(close, open) {
    close.style.display = "none"
    open.style.display = "block"
}

(function initDashboard() {
    document.querySelector(".dashboard-open").addEventListener("click", showDashboard)
    document.querySelector(".dashboard-settings").addEventListener("click", ()=> goTo(dashboardPg, settingsPg))
    document.querySelector(".dashboard-add-script").addEventListener("click", () => goTo(dashboardPg, addScriptPg))
    document.querySelector(".dashboard-all-scripts").addEventListener("click", ()=> {
        goTo(dashboardPg, allScriptsPg)
        showAllScripts()
    })
})()