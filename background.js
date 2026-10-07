if (typeof importScripts === "function" && typeof PTStorage === "undefined")
importScripts("storage.js");

chrome.runtime.onInstalled.addListener(async (d) => {
    const settings = await PTStorage.getSettings();
    console.log(settings);
})

chrome.runtime.onMessage.addListener((msg, sender, response) => {
    if(msg && msg.type === "RUN_MAIN_WORLD_SCRIPT") {
        if(!sender.tab || sender.tab.id == null) {
            response({ok: false, error: "no tab context to run in"})
            return
        }
        if(!chrome.userScripts || typeof chrome.userScripts.execute !== "function") {
            response({
                ok: false,
                error: "JavaScript execution permission is not enabled. Re-save the script and grant the requested permission."
            });
            return
        }
        chrome.userScripts.execute({
            target: {tabId: sender.tab.id},
            world: "MAIN",
            injectImmediately: true,
            js: [{code: String(msg.code || "")}],
        }).then(() => response({ok: true}))
        .catch((err) => response({ok: false, error: String(err)}))
        return true;
    }

    console.log("Page tamperer message", msg)
});
