chrome.runtime.onInstalled.addListener((d) => {
    console.log(d.reason);
})

chrome.runtime.onMessage.addListener((m, s, response) => {
    console.log(m, s.tab ? s.tab.url : "popup");
})