importScripts("storage.js");

chrome.runtime.onInstalled.addListener(async (d) => {
    const settings = await PTStorage.getSettings();
    console.log(settings);
})

chrome.runtime.onMessage.addListener((msg, sender, response) => {
    if(msg && msg.type === "RUN_MAIN_WORLD_SCRIPT") {
        if(!sender.tab || !sender.tab.id) {
            response({ok: false, error: "no tab context to run in"})
            return
        }
        chrome.scripting.executeScript({
            target: {tabId: sender.tab.id},
            world: "MAIN",
            func: (code) => {
                new Function(code)();
            },
            args: [msg.code]
        }).then(() => response({ok: true}))
        .catch((err) => response({ok: false, error: String(err)}))
        return true;
    }
    console.log("Page tamperer message", msg)
})