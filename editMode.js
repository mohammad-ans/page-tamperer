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
        `;
        document.documentElement.appendChild(style)
    }

    function buildToolbar() {
        const bar = document.createElement("div");
        bar.id = TOOLBAR_ID;
        bar.innerHTML = `
            <span>Editing, click any element</span>
            <input type="text" id="__pt-script-name__" placeholder="Name this edit"/>
            <button class="pt-save">Save</button>
            <button class="pt-exit">Exit</button>
        `;
        bar.querySelector(".pt-save").addEventListener("click", undefined);
        bar.querySelector(".pt-exit").addEventListener("click", () => undefined)
        document.documentElement.appendChild(bar)
        return bar;
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
        panel.innerHTML = `
            ${hasDirectText ? `<input type="text" class="pt-text-input" />` : ""}
            <label>Text color <input type="color" class="pt-color-input" /></label>
            <label>Background <input type="color" class="pt-bg-input" /></label>
            <button class="pt-hide">Hide Element</button>
            <button class="pt-delete>Delete Element</button>
            <button class="pt-close">Close</button>
        `;
        document.documentElement.appendChild(panel);

        const textInput = panel.querySelector(".pt-text-input")
        if(textInput) {
            textInput.value = el.textContent.trim();
            textInput.addEventListener("input", ()=> {
                el.textContent = textInput.value;
                
            })
        }
    }
    function closePanel() {
        const existing = document.getElementById(PANEL_ID)
        if(existing)
            existing.remove()
    }
    function exitEditMode(saved) {
        active = false

    }
})