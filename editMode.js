(function () {
    "use strict";

    const HIGHLIGHT_CLASS = "__pt-hover-highlight__";
    const SELECTED_CLASS = "__pt-selected__";
    const TOOLBAR_ID = "__pt-edit-toolbar__";
    const PANEL_ID = "__pt-edit-panel__";
    const STYLE_ID = "__pt-edit-style";

    let pending = [];
    let active = false;
    let currentTarget = null;
    let editOptions = {text: true, textColor: true, backgroundColor: true, hide: true, delete: true, attribute: false, forceShow: false, opacity: false, border: false, padding: false, margin: false, borderRadius: false, size: false, fontSW: false, zIdx: false}
    let isTouchSession = false;
    let styleEl = null;
    
    const THEMES = {
        "dark-theme": {
            surface: "#08080c",
            text: "#f5f5f5",
            lowTxt: "gray",
            inputBg: "#161620b8",
            hoverBg: "#242433",
            border: "rgba(255, 255, 255, 0.14)"
        },
        "light-theme": {
            surface: "#f5f4f2",
            text: "#080808",
            lowTxt: "gray",
            inputBg: "#f5f4f2",
            hoverBg: "white",
            border: "rgba(0, 0, 0, 0.14)"
        }
    }
    let theme = THEMES["dark-theme"]

    function removeTheme() {
        if(styleEl)
            document.documentElement.removeChild(styleEl)
    }
    async function updateTheme() {
        if(!active)
            return
        removeTheme()
        const settings = await PTStorage.getSettings()
        if (settings)
            theme = THEMES[settings.theme] || THEMES["dark-theme"]
        injectBaseStyles();
    }
    function cssPath(el) {
        if (!(el instanceof Element))
            return null
        if (el.id)
            return `#${CSS.escape(el.id)}`
        const parts = []
        let node = el;
        while(node && node.nodeType == Node.ELEMENT_NODE && node != document.body) {
            if(node.id) {
                parts.unshift(`#${CSS.escape(node.id)}`);
                break;
            }
            let selector = node.tagName.toLowerCase();
            let sibling = node.previousElementSibling;
            let n = 1;
            while(sibling) {
                if(sibling.tagName == node.tagName)
                    n++
                sibling = sibling.previousElementSibling
            }
            selector += `:nth-of-type(${n})`
            parts.unshift(selector);
            node = node.parentElement
        }
        return "body > " + parts.join(" > ")
    }

    function injectBaseStyles() {
        if(document.getElementById(STYLE_ID))
            return
        styleEl = document.createElement("style");
        styleEl.id = STYLE_ID;
        styleEl.textContent = `
        .${HIGHLIGHT_CLASS} {
            outline: 2px solid #7c3aed !important;
            outline-offset: -1px !important;
            cursor: pointer !important;
        }
        .${SELECTED_CLASS} {
            outline: 2px solid #39FF14 !important;
            outline-offset: -1px !important;
        }
        #${TOOLBAR_ID} {
            all: initial;
            position: fixed;
            top: 12px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 2147483647;
            background: ${theme.surface};
            color: ${theme.text};
            font-family: system-ui, sans-serif;
            font-size: 13px;
            padding: 8px 12px;
            border-radius: 10px;
            display: flex;
            gap: 8px;
            align-items: center;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
            border: 1px solid ${theme.border};
        }
        #${TOOLBAR_ID} button {
            all: unset;
            cursor: pointer;
            padding: 6px 10px;
            border-radius: 6px;
            font-family: inherit;
            font-size: 12px;
            background-color: ${theme.inputBg}
        }
        #${TOOLBAR_ID} .pt-save{
            background-color: #2563eb;
            color: #fff;
        }
        #${TOOLBAR_ID} .pt-exit{
            background-color: #242423;
            color: #fff;
        }
        #${TOOLBAR_ID} input {
            all: unset;
            background: ${theme.inputBg};
            color: ${theme.text}
            padding: 6px 8px;
            border-radius: 6px;
            width: 140px;
        }
        #${PANEL_ID} {
            all: initial;
            position: fixed;
            z-index: 2147483647;
            background: ${theme.surface};
            color: ${theme.text};
            font-family: system-ui, sans-serif;
            font-size: 12px;
            padding: 8px;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
            min-width: 170px;
            max-width: min(260px, calc(100vw - 16px));
            max-height: min(70vh, calc(100vh - 24px));
            overflow-y: auto;
            border: 1px solid ${theme.border};
        }
        #${PANEL_ID} label {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        #${PANEL_ID} button {
            all: unset;
            cursor: pointer;
            padding: 6px 8px;
            border-radius: 6px;
            background: ${theme.inputBg};
            color: ${theme.text};
            min-height: 20px;
        }
        #${PANEL_ID} button:hover {
            background: ${theme.hoverBg};
        }
        #${PANEL_ID} input {
            background: ${theme.inputBg};
            color: ${theme.text};
            padding: 6px 8px;
            border-radius: 6px;
        }
        #${PANEL_ID} input[type=text] {
            all: unset;
            background: ${theme.inputBg};
            color: ${theme.text};
            padding: 6px 8px;
            border-radius: 6px;
            width: 100%;
            box-sizing: border-box;
        }
        #${PANEL_ID} textarea{
            all: unset;
            background: ${theme.inputBg};
            color: ${theme.text};
            padding: 6px 8px;
            border-radius: 6px;
            width: 100%;
            box-sizing: border-box;
            resize: none;
            height: 24px;
        }
        #${PANEL_ID} input[type=color] {
            width: 100%;
            height: 32px;
            border: none;
        }
        #${PANEL_ID} .pt-empty-panel{
            font-size: 12px;
            line-height: 1.4;
            max-width: 200px;
            color: ${theme.lowTxt};
        }
        #${PANEL_ID} select{
            all:unset;
            background: ${theme.inputBg};
            color: ${theme.text};
            padding: 8px;
            border-radius: 6px;
            width: 100%;
            box-sizing: border-box;
        }
        #${PANEL_ID} .pt-attr{
            display: flex;
            gap: 4px;
        }
        #${PANEL_ID} .pt-attr input{
            all: unset;
            background: ${theme.inputBg};
            color: ${theme.text};
            padding: 8px;
            border-radius: 6px;
            width: 0;
            flex: 1;
            box-sizing: border-box;
        }
        `;
        document.documentElement.appendChild(styleEl)
    }

    function buildToolbar() {
        const toolbar = document.createElement("div");
        toolbar.id = TOOLBAR_ID;
        toolbar.innerHTML = `
            <span>Editing, click any element</span>
            <input type="text" id="__pt-script-name__" placeholder="Name this edit"/>
            <button class="pt-save">Save</button>
            <button class="pt-exit">Exit</button>
        `;
        toolbar.querySelector(".pt-save").addEventListener("click", saveEdits);
        toolbar.querySelector(".pt-exit").addEventListener("click", () => exitEditMode(false))
        document.documentElement.appendChild(toolbar)
        return toolbar;
    }

    function isEditableTarget(el) {
        if (!(el instanceof Element))
            return false;
        if (el == document.body || el == document.documentElement)
            return false;
        if (el.closest(`#${TOOLBAR_ID}, #${PANEL_ID}`))
            return false;
        return true;
    }
    function onPointerDown(e) {
        if(e.pointerType === "touch")
            isTouchSession = true
        if(!isEditableTarget(e.target))
            return
        e.preventDefault()
        e.stopPropagation()
        selectElement(e.target)
    }
    function onClick(e) {
        if(!isEditableTarget(e.target))
            return
        e.preventDefault();
        e.stopPropagation();
    }
    function onMouseOver(e) {
        if(isTouchSession)
            return
        if(isEditableTarget(e.target))
            e.target.classList.add(HIGHLIGHT_CLASS);
    }
    function onMouseOut(e) {
        if(e.target.classList)
            e.target.classList.remove(HIGHLIGHT_CLASS);
    }

    function onKeyDown(e) {
        if(e.key === "Escape")
            exitEditMode(false);
    }
    function onScroll() {
        if(document.querySelector(`#${PANEL_ID}`)){
            closePanel()
            deselect()
        }
    }
    function selectElement(el) {
        if(currentTarget)
            currentTarget.classList.remove(SELECTED_CLASS)
        currentTarget = el;
        el.classList.add(SELECTED_CLASS);
        openPanel(el);
    }
    function deselect() {
        if (currentTarget)
            currentTarget.classList.remove(SELECTED_CLASS);
        currentTarget = null
    }
    function applyStyle(el, property, value, important) {
        el.style.setProperty(property, value, important ? "important" : "")
        queueEdit({type: "style", selector: cssPath(el), property: property, value: value, important: !!important})
    }
    function pxNumber(computedVal, fallback) {
        const n = parseFloat(computedVal)
        return Number.isFinite(n) ? Math.round(n) : fallback
    }

    function panelPos(panel, el) {
        const targetRect = el.getBoundingClientRect()
        const panelRect = panel.getBoundingClientRect()
        const margin = 8;
        const vpW = window.innerWidth
        const vpH = window.innerHeight

        let top = targetRect.bottom + 6;
        if(top + panelRect.height + margin > vpH)
            top = targetRect.top - panelRect.height - 6;
        top = Math.max(margin, Math.min(top, vpH - panelRect.height - margin))
        let left = targetRect.left;
        left = Math.max(margin, Math.min(left, vpW - panelRect.width - margin))

        panel.style.top = `${top}px`
        panel.style.left = `${left}px`
        panel.style.visibility = "visible"
    }

    function closePanel() {
        const existing = document.getElementById(PANEL_ID)
        if(existing)
            existing.remove()
    }

    function openPanel(el) {
        closePanel();
        const panel = document.createElement("div")
        panel.id = PANEL_ID
        panel.style.visibility = "hidden"
        document.documentElement.appendChild(panel)
        const hasDirectText = Array.from(el.childNodes).some( (n) =>
            n.nodeType === Node.TEXT_NODE && n.textContent.trim()
        )
        const txt = editOptions.text && hasDirectText
        const bgClr = editOptions.backgroundColor
        const del = editOptions.delete
        const hide = editOptions.hide
        const txtClr = editOptions.textColor
        const opacity = editOptions.opacity
        const border = editOptions.border
        const forceShow = editOptions.forceShow
        const attribute = editOptions.attribute
        const borderRadius = editOptions.borderRadius
        const padding = editOptions.padding
        const margin = editOptions.margin
        const fontSw = editOptions.fontSW
        const size = editOptions.size
        const zIdx = editOptions.zIdx

        const anyOn = txt || bgClr || del || hide || txtClr || opacity || border || forceShow
        || attribute || borderRadius || padding || margin || fontSw || size || zIdx

        if (!anyOn) {
            panel.innerHTML = `
                <div class="pt-empty--panel">No live-edit options are enabled. Turn some on in the Settings.</div>
                <button class="pt-close">Close</>
            `
            panel.querySelector(".pt-close").addEventListener("click", ()=> {
                closePanel()
                deselect()
            })
            panelPos(panel, el)
            return
        }
        panel.innerHTML = `
            ${txt ? `<textarea class="pt-text-input" ></textarea>` : ""}
            ${txtClr ? `<label>Text color <input type="color" class="pt-color-input" /></label>`: ""}
            ${bgClr ? `<label>Background <input type="color" class="pt-bg-input" /></label>`: ""}
            ${border ? `<label>Border <input type="number" class="pt-border-width" min="0" style="width:50px"/> px<input type="color" class="pt-border-color"/></label>`: ""}
            ${borderRadius ? `<label>Corner radius <input type="number" class="pt-radius-input" min="0" style="width:60px"/> px</label>`: ""}
            ${opacity ? `<label>Opacity <input type="range" class="pt-opacity-input" min="0" max="1" step="0.05""/></label>`: ""}
            ${fontSw ? `<label>Font size <input type="number" class="pt-fontsize-input" min="1" style="width:60px"/> px</label>`: ""}
            ${fontSw ? `<label>Font weight <select class="pt-fontweight-input"><option value="400">Normal</options><option value="500">Medium</option><option value="700">Semi bold</option><option value="800">Bold</option><option value="900">Bolder</option></select></label>`: ""}
            ${padding ? `<label>Padding <input type="number" class="pt-padding-input" min="0" style="width:60px"/> px</label>` : ""}
            ${margin ? `<label>Margin <input type="number" class="pt-margin-input" min="0" style="width:60px"/> px</label>` : ""}
            ${size ? `<label>Width <input type="number" class="pt-width-input" min="0" style="width:70px" /> px</label>` : ""}
            ${size ? `<label>Height <input type="number" class="pt=height-input" min="0" style="width:70px"/> px</label>` : ""}
            ${zIdx ? `<label>Z-Index <input type="number" class="pt-zindex-input" style="width:70px"/></label>` : ""}
            ${attribute ? `<div class="pt-attr"><input type="text" class="pt-attr-name" placeholder="attribute" /><input type="text" class="pt-attr-value" placeholder="value"/><button class="pt-attr-apply>Set</button></div>` : ""}
            ${forceShow ? `<button class="pt-force-show">Force show</button>`: ""}
            ${hide ? `<button class="pt-hide">Hide Element</button>` : ""}
            ${del ? `<button class="pt-delete">Delete Element</button>` : ""}
            <button class="pt-close">Close</button>
        `;

        if(txt) {
            const textInput = panel.querySelector(".pt-text-input")
            textInput.value = el.textContent.trim();
            textInput.addEventListener("input", (e)=> {
                e.stopPropagation()
                el.textContent = textInput.value;
                queueEdit({
                    type: "text", selector: cssPath(el), value: textInput.value
                })
            })
        }

        if(txtClr) {
            const colorInput = panel.querySelector(".pt-color-input")
            colorInput.value = rgbToHex(getComputedStyle(el).color)
            colorInput.addEventListener("input", (e) => {
                el.style.color = e.target.value
                queueEdit({type: "style", selector: cssPath(el), property: "color", value: e.target.value})
            })
        }

        if(bgClr){
            const bgInput = panel.querySelector(".pt-bg-input");
            bgInput.value = rgbToHex(getComputedStyle(el).backgroundColor)
            bgInput.addEventListener("input", (e) => {
                el.style.backgroundColor = e.target.value
                queueEdit({type: "style", selector: cssPath(el), property: "background-color", value: e.target.value})
            })
        }

        if(hide)
            panel.querySelector(".pt-hide").addEventListener("click", ()=>{ 
                el.style.display = "none";
                queueEdit({type: "style", selector: cssPath(el), property: "display", value: "none"})
                closePanel()
                deselect()
            });
        if(del)
            panel.querySelector(".pt-delete").addEventListener("click", ()=> {
                const selectorVal = cssPath(el)
                el.remove();
                queueEdit({type: "remove", selector: selectorVal})
                closePanel();
                currentTarget = null;
            })
        
        if(border) {
            const borderW = panel.querySelector(".pt-border-width")
            const borderClr = panel.querySelector(".pt-border-color")
            const css = getComputedStyle(el)
            borderW.value = pxNumber(css.borderTopWidth, 1)
            borderClr.value = rgbToHex(css.borderTopColor)
            const applyBorder = () => applyStyle(el, "border", `${borderW.value || 0}px solid ${borderClr.value}`)
            borderW.addEventListener("input", applyBorder)
            borderClr.addEventListener("input", applyBorder)
        }
        if(borderRadius) {
            const bRadius = panel.querySelector(".pt-radius-input")
            bRadius.value = pxNumber(getComputedStyle(el).borderRadius, 0)
            bRadius.addEventListener("input", ()=> applyStyle(el, "border-radius", `${bRadius.value || 0}px`))
        }
        if(opacity) {
            const opacityInp = panel.querySelector(".pt-opacity-input")
            opacityInp.value = getComputedStyle(el).opacity || "1"
            opacityInp.addEventListener("input", ()=> applyStyle(el, "opacity", opacityInp.value))
        }
        if(fontSw) {
            const fontInp = panel.querySelector(".pt-fontsize-input")
            fontInp.value = pxNumber(getComputedStyle(el).fontSize, 16)
            fontInp.addEventListener("input", ()=> applyStyle(el, "font-size", `${fontInp.value || 16}px`))
            const fontWeight = panel.querySelector(".pt-fontweight-input")
            const weight = getComputedStyle(el).fontWeight
            fontWeight.value = ["400", "500", "800", "700", "900"].includes(weight) ? weight : "500"
            fontWeight.addEventListener("change", ()=> applyStyle(el, "font-weight", fontWeight.value))
        }
        if(padding) {
            const paddingInp = panel.querySelector(".pt-padding-input")
            paddingInp.value = pxNumber(getComputedStyle(el).paddingTop, 0)
            paddingInp.addEventListener("input", ()=> applyStyle(el, "padding", `${paddingInp.value || 0}px`))
        }
        if(margin) {
            const marginInp = panel.querySelector(".pt-margin-input")
            marginInp.value = pxNumber(getComputedStyle(el).marginTop, 0)
            marginInp.addEventListener("input", ()=> applyStyle(el, "margin", `${marginInp.value || 0}px`))
        }
        if(size) {
            const widthInp = panel.querySelector(".pt-width-input")
            widthInp.value = Math.round(el.getBoundingClientRect().width)
            widthInp.addEventListener("input", ()=> applyStyle(el, "width", `${widthInp.val || 0}px`))
            const heightInp = document.querySelector(".pt-height-input")
            heightInp.value = Math.round(el.getBoundingClientRect().height)
            heightInp.addEventListener("input", ()=> applyStyle(el, "height", `${heightInp.value || 0}px`))
        }
        if(zIdx) {
            const zIdxInp = panel.querySelector(".pt-zindex-input")
            const zVal = getComputedStyle(el).zIndex
            zIdxInp.value = zVal === "auto" ? 0 : zVal
            zIdxInp.addEventListener("input", ()=> applyStyle(el, `"z-index", ${zIdxInp.value || 0}px`))
        }
        if(attribute) {
            const nameInp = panel.querySelector(".pt-attr-name")
            const valInp = panel.querySelector(".pt-attr-value")
            const applyBtn = panel.querySelector(".pt-attr-apply")
            const guessed = {A: "href", IMG: "src", INPUT: "placeholder", TEXTAREA: "placeholder"}[el.tagName] || ""
            nameInp.value = guessed
            valInp.value = guessed ? (el.getAttribute(guessed) || "") : ""
            applyBtn.addEventListener("click", ()=> {
                const name = nameInp.value.trim()
                if(!name) 
                    return
                el.setAttribute(name, valInp.value)
                queueEdit({type: "attribute", selector: cssPath(el), property: name, value: valInp.value})
            })

        }
        if(forceShow) {
            panel.querySelector(".pt-force-show").addEventListener("click", ()=> {
                applyStyle(el, "display", "revert", true)
                applyStyle(el, "visibility", "visible", true)
                applyStyle(el, opacity, "1", true)
                closePanel()
                deselect()
            })
        }
        
        panel.querySelector(".pt-close").addEventListener("click", ()=> {
            closePanel()
            deselect();
        })
        panelPos(panel, el)
    }

    function queueEdit(edit) {
        const i = pending.findIndex((e) =>
            e.selector === edit.selector && e.type === edit.type && e.property === edit.property
        )
        if(i !== -1)
            pending[i] = edit;
        else
            pending.push(edit);
    }
    async function saveEdits()  {
        if(pending.length === 0) {
            exitEditMode(false)
            return
        }
        const nameInput = document.getElementById("__pt-script-name__");
        const name = (nameInput && nameInput.value.trim()) || `Edit ${new Date().toLocaleString()}`
        await PTStorage.add(location.hostname, {
            name, 
            type: "dom-edit",
            code: JSON.stringify(pending),
            runAt: "document_idle",
            enabled: true
        })

        exitEditMode(true)
    }

    function rgbToHex(rgb) {
        const nums = rgb.match(/d[\d.]+/g)
        if(!nums)
            return '#ffffff'
        const [r,g,b,a] = nums.map(Number)
        if(a === 0)
            return "#ffffff"
        return "#" + [r,g,b].map((x) => Math.round(x).toString(16).padStart(2, "0")).join("")
    }
    function exitEditMode(saved) {
        active = false
        isTouchSession = false
        deselect()
        closePanel()

        document.removeEventListener("mouseover", onMouseOver, true)
        document.removeEventListener("mouseout", onMouseOut, true)
        document.removeEventListener("click", onClick, true)
        document.removeEventListener("keydown", onKeyDown, true)
        document.removeEventListener("scroll", onScroll, true)
        document.removeEventListener("pointerdown", onPointerDown, true)
        const toolbar = document.getElementById(TOOLBAR_ID)
        if (toolbar)
            toolbar.remove()
        document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((n) => n.classList.remove(HIGHLIGHT_CLASS))
        pending = []
        console.log(`Page tamperer exited edit mode ${saved ? " (saved)" : ""}`)
    }
    async function enterEditMode() {
        if(active)
            return
        active = true
        const settings = await PTStorage.getSettings()
        editOptions = settings.editOptions || editOptions
        theme = THEMES[settings.theme] || THEMES["dark-theme"]

        injectBaseStyles();
        buildToolbar();
        document.addEventListener("mouseover", onMouseOver, true)
        document.addEventListener("mouseout", onMouseOut, true)
        document.addEventListener("pointerdown", onPointerDown, true)
        document.addEventListener("click", onClick, true)
        document.addEventListener("keydown", onKeyDown, true)
        document.addEventListener("scroll", onScroll, true)
        console.log("Entered edit mode")
    }
    chrome.runtime.onMessage.addListener((message, sender, response) => {
        if(message && message.type === "ENTER_EDIT_MODE") {
            if(active) {
                response({ok: false})
            }
            else{
                enterEditMode()
                response({ok : true})
            }
        }
        if (message && message.type === "EXIT_EDIT_MODE") {
            exitEditMode(false)
            response({ok: true})
        }
        if(message && message.type === "CHANGE_THEME"){
            updateTheme()
        }
    })
})()