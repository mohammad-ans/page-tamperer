(function (global) {
    "use_strict";
    const DEFAULT_SETTINGS = {
        automaticManipulation: true, allowScripts: true
    };

    function get(keys) {
        return new Promise((resolve, rej) => {
            chrome.storage.local.get(keys, (res) => {
                if(chrome.runtime.lastError)
                    rej(chrome.runtime.lastError);
                else
                    resolve(res);
            })
        })
    }
    function set(items) {
        return new Promise((resolve, rej) => {
            chrome.storage.local.set(items, () => {
                if(chrome.runtime.lastError)
                    rej(chrome.runtime.lastError);
                else
                    resolve();
            })
        })
    }
    function newId() {
        return (global.crypto && global.crypto.randomUUID) ? global.crypto.randomUUID() : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    async function getSettings() {
        const {settings} = await get("settings");
        return {...DEFAULT_SETTINGS, ...(settings || {})};
    }
    async function updateSettings(patch) {
        const curr = await getSettings();
        const updated = {...curr, ...patch};
        await set({["settings"]: updated});
        return updated;
    }
    async function getAllSites() {
        const {sites} = await get("sites");
        return sites || {};
    }
    async function getSite(host) {
        const sites = await getAllSites;
        return sites[host] || {"scripts": []};
    }
    async function save(host, data) {
        const sites = await getAllSites();
        sites[host] = data;
        await set({"sites": sites});
        return data;
    }

    async function add(host, script) {
        const site = await getSite(host);
        const now = Date.now()
        const newS = {
            id: newId(),
            name: script.name || "Untitle script",
            type: script.type || "js",
            code: script.code || "",
            runAt: script.runAt || "document_idle",
            enabled: script.enabled !== undefined ? script.enabled : true,
            createdAt: now,
            updatedAt: now
        }
        site.scripts.push(newS);
        await save(host, site);
        return newS;
    }
    async function update(host, id, patch) {
        const site = await getSite(host);
        const i = site.scripts.findIndex((s) => s.id == id);
        if(i === -1)
            throw new Error(`Script ${id} not found for ${host}`)
        site.scripts[i] = {...site.scripts[i], ...patch, updatedAt: Date.now()}
        await saveSite(host, site);
        return site.scripts[i]
    }
    async function deleteScript(host, id) {
        const site = await getSite(host);
        site.scripts = site.scripts.filter((s) => s.id != id)
        await save(host, site)
    }
    async function scriptEnable(host, id, enable) {
        return update(host, id, {enable});
    }
    async function getAllScripts() {
        const sites = await getAllSites()
        const arr = []
        for (const host of Object.keys(sites)) {
            for (const script of sites[host].scripts) {
                arr.push({...script, host})
            }
        }
        return arr;
    }
    async function getRunning() {
        const [all, settings] = await Promise.all([getAllScripts(), getSettings()]);
        if (!settings.allowScripts)
            return [];
        return all.filter((s) => s.enabled);
    }
    async function clearAll() {
        await set({"sites" : {}});
    }
    function onChange(f) {
        chrome.storage.addListener((changes, area) => {
            if(area == "local")
                f(changes);
        })
    }

    global.PTStorage = {
        getSettings,
        updateSettings,
        getAllSites,
        getSite,
        add,
        update,
        deleteScript,
        scriptEnable,
        getAllScripts,
        getRunning,
        clearAll,
        onChange
    }
})(typeof self !== "undefined" ? self : this)