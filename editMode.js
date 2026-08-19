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
    let editOptions = {text: true, textColor: true, backgroundColor: true, hide: true, delete: true}

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
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
        .${HIGHLIGHT_CLASS} {
            outline: 2px solid #5850EC !important;
            outline-offset: -1px !important;
            cursor: pointer !important;
        }
        .${SELECTED_CLASS} {
            outline: 2px solid #16A34A !important;
            outline-offset: -1px !important;
        }
        #${TOOLBAR_ID} {
            all: initial;
            position: fixed;
            top: 12px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 2147483647;
            background: #111827;
            color: #fff;
            font-family: system-ui, sans-serif;
            font-size: 13px;
            padding: 8px 12px;
            border-radius: 10px;
            display: flex;
            gap: 8px;
            align-items: center;
            box-shadow: 0 4px 16px rgba(0,0,0,.3);
        }
        #${TOOLBAR_ID} button {
            all: unset;
            cursor: pointer;
            padding: 6px 10px;
            border-radius: 6px;
            font-family: inherit;
            font-size: 12px;
        }
        #${TOOLBAR_ID} .pt-save{
            background: #16A34A;
            color: #fff;
        }
        #${TOOLBAR_ID} .pt-exit{
            background: #374151;
            color: #fff;
        }
        #${TOOLBAR_ID} input {
            all: unset;
            background: #1F2937;
            padding: 6px 8px;
            border-radius: 6px;
            width: 140px;
        }
        #${PANEL_ID} {
            all: initial;
            position: absolute;
            z-index: 2147483647;
            background: #111827;
            color: #fff;
            font-family: system-ui, sans-serif;
            font-size: 12px;
            padding: 8px;
            border-radius: 8px;
            display: flex;
            flex-direction: column;
            gap: 6px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
            min-width: 170px;
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
            background: #1F2937;
            color: #fff;
        }
        #${PANEL_ID} button:hover {
            background: #374151;
        }
        #${PANEL_ID} input[type=text] {
            all: unset;
            background: #1F2937;
            padding: 6px 8px;
            border-radius: 6px;
            width: 100%;
            box-sizing: border-box;
        }
        #${PANEL_ID} input[type=color] {
            width: 100%;
            height: 28px;
            border: none;
        }
        #${PANEL_ID} .pt-empty-panel{
            font-size: 12px;
            line-height: 1.4;
            max-width: 200px;
        }
        `;
        document.documentElement.appendChild(style)
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

    function onClick(e) {
        if(!isEditableTarget(e.target))
            return
        e.preventDefault();
        e.stopPropagation();
        selectElement(e.target)
    }
    function onMouseOver(e) {
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

    function openPanel(el) {
        closePanel();
        const panel = document.createElement("div")
        panel.id = PANEL_ID

        const rect = el.getBoundingClientRect()
        panel.style.top = `${window.scrollY + rect.bottom +6}px`
        panel.style.left = `${window.scrollX + rect.left}px`
        const hasDirectText = Array.from(el.childNodes).some( (n) =>
            n.nodeType === Node.TEXT_NODE && n.textContent.trim()
        )
        const txt = editOptions.text && hasDirectText
        const bgClr = editOptions.backgroundColor
        const del = editOptions.delete
        const hide = editOptions.hide
        const txtClr = editOptions.textColor
        const anyOn = txt || bgClr || del || hide || txtClr

        if (!anyOn) {
            panel.innerHTML = `
                <div class="pt-empty--panel">No live-edit options are enabled. Turn some on in the Settings.</div>
                <button class="pt-close">Close</>
            `
            panel.querySelector(".pt-close").addEventListener("click", ()=> {
                closePanel()
                deselect()
            })
            return
        }
        panel.innerHTML = `
            ${txt ? `<input type="text" class="pt-text-input" />` : ""}
            ${txtClr && `<label>Text color <input type="color" class="pt-color-input" /></label>`}
            ${bgClr && `<label>Background <input type="color" class="pt-bg-input" /></label>`}
            ${hide && `<button class="pt-hide">Hide Element</button>`}
            ${del && `<button class="pt-delete">Delete Element</button>`}
            <button class="pt-close">Close</button>
        `;
        document.documentElement.appendChild(panel);

        const textInput = panel.querySelector(".pt-text-input")
        if(textInput) {
            textInput.value = el.textContent.trim();
            textInput.addEventListener("input", ()=> {
                el.textContent = textInput.value;
                queueEdit({
                    type: "text", selector: cssPath(el), value: textInput.value
                })
            })
        }

        const colorInput = panel.querySelector(".pt-color-input")
        colorInput.value = rgbToHex(getComputedStyle(el).color)
        colorInput.addEventListener("input", (e) => {
            el.style.color = e.target.value
            queueEdit({type: "style", selector: cssPath(el), property: "color", value: e.target.value})
        })

        const bgInput = panel.querySelector(".pt-bg-input");
        if(bgInput){
            bgInput.value = rgbToHex(getComputedStyle(el).backgroundColor)
            bgInput.addEventListener("input", (e) => {
                el.style.backgroundColor = e.target.value
                queueEdit({type: "style", selector: cssPath(el), property: "background-color", value: e.target.value})
            })
        }
        const hideBtn = panel.querySelector(".pt-hide")
        if(hideBtn)
            hideBtn.addEventListener("click", ()=>{ 
                el.style.display = "none";
                queueEdit({type: "style", selector: cssPath(el), property: "display", value: "none"})
                closePanel()
                deselect()
            });
        const delBtn = panel.querySelector(".pt-delete")
        if(delBtn)
            delBtn.addEventListener("click", ()=> {
                const selectorVal = cssPath(el)
                el.remove();
                queueEdit({type: "remove", selector: selectorVal})
                closePanel();
                currentTarget = null;
            })
        panel.querySelector(".pt-close").addEventListener("click", ()=> {
            closePanel()
            deselect();
        })
    }
    
    function closePanel() {
        const existing = document.getElementById(PANEL_ID)
        if(existing)
            existing.remove()
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
        deselect()
        closePanel()
        document.removeEventListener("mouseover", onMouseOver, true)
        document.removeEventListener("mouseout", onMouseOut, true)
        document.removeEventListener("click", onClick, true)
        document.removeEventListener("keydown", onKeyDown, true)
        const toolbar = document.getElementById(TOOLBAR_ID)
        if (toolbar)
            toolbar.remove()
        document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((n) => n.classList.remove(HIGHLIGHT_CLASS))
        pending = []
        console.log(`Page tamperer exited edit mode ${saved ? " (saved)" : ""}`)
    }
    function enterEditMode() {
        if(active)
            return
        active = true
        injectBaseStyles();
        buildToolbar();
        document.addEventListener("mouseover", onMouseOver, true)
        document.addEventListener("mouseout", onMouseOut, true)
        document.addEventListener("click", onClick, true)
        document.addEventListener("keydown", onKeyDown, true)
        console.log("Entered edit mode")
    }
    chrome.runtime.onMessage.addListener((message, sender, response) => {
        if(message && message.type === "ENTER_EDIT_MODE") {
            enterEditMode()
            response({ok : true})
        }
        if (message && message.type === "EXIT_EDIT_MODE") {
            exitEditMode(false)
            response({ok: true})
        }
    })
})()