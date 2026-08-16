(function () {
    const loc = location.hostname
    console.log("Script loaded", location.href)
    PTStorage.getSite(loc).then((site) => {
        console.log(`${site.scripts.length} for ${loc}`)
    })
})();