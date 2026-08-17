(function () {
    async function main() {
        const settings = await PTStorage.getSettings();
        if(!(settings.automaticManipulation && !settings.allowScripts)) {
            console.log("playback disabled in settings")
            return;
        }
        
        const loc = location.hostname
        const site = await PTStorage.getSite(loc)
        const scripts = site.scripts.filter((s) => s.enabled)
        console.log(`${scripts.length}`)
        for (const script of scripts) {
            applyScript(script)
        }
    }
    function applyScript(script) {
        const run = () => {
            try {
                if (script.type === "dom-edit")
                    applyDomEdit(script)
                else if(script.type === "css")
                    applyCss(script)
                else if(script.type === "js")
                    applyJS(script)
                else
                    console.log("Not supported")
            }
            catch(err){
                console.error(err)
            }
        }
        runAtPhase(script.runAt || "document_idle", run);
    }

    function runAtPhase(phase, fn) {
        if(phase === "document_start")
            fn()
        else if(phase === "document_end")
            document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn, {once: true}) : fn()
        else
            document.readyState === "complete" ? fn() : window.addEventListener("load", fn, {once: true})
    }
    function applyDomEdit(script) {
        const edits = JSON.parse(script.code || [])
        for (const edit of edits) {
            const el = document.querySelector(edit.selector)
            if(!el) {
                console.log(`${script.name}: selector not found: ${edit.selector}`)
                continue
            }
            if (edit.type === "text")
                el.textContent = edit.value
            else if(edit.type === "style")
                el.style.setProperty(edit.property, edit.value)
            else if (edit.type === "remove")
                el.remove();
        }
    }
    function applyCss(script) {
        const style = document.createElement("style");
        style.setAttribute("data-page-tamperer-script", script.id)
        style.textContent = script.code || "";
        if (document.head)
            document.head.appendChild(style)
        else if (document.documentElement)
            document.documentElement.appendChild(style)
    }
    function applyJS(script) {
        chrome.runtime.sendMessage({type: "RUN_MAIN_WORLD_SCRIPT", code: script.code || ""}, (response) => {

                if(chrome.runtime.lastError) {
                    console.error(`${script.name} could not reach background`, chrome.runtime, lastError.message)
                }
                else if(response && !response.ok) {
                    console.error(`${script.name} threw error while running`, response.error)
                }
            }
        )
    }
    main();
})();