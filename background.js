importScripts("storage.js");

chrome.runtime.onInstalled.addListener(async (d) => {
    const settings = await PTStorage.getSettings();
    console.log(settings);
})

chrome.runtime.onMessage.addListener((m, s, response) => {
    console.log(m, s.tab ? s.tab.url : "popup");
})