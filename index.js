// ==UserScript==
// @name         ??AI????
// @description  ????????<image>???????AI??
// @version      1.0.0
// @namespace    st-image-gen
// @match        *://*/*
// @grant        none
// ==/UserScript==

+(function() {
    // inject CSS inline
    (function() {
        var s = document.createElement('style');
        s.textContent = '/* st-image-gen styles */

.st-image-gen-panel {
    position: fixed;
    top: 60px;
    right: 20px;
    width: 380px;
    max-height: 85vh;
    overflow-y: auto;
    background: var(--black70bg, #1a1a2e);
    border: 1px solid var(--solid-border, #444);
    border-radius: 12px;
    z-index: 99999;
    font-size: 14px;
    color: var(--text, #ddd);
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}

.st-image-gen-panel-header {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    font-size: 15px;
    font-weight: 700;
    border-bottom: 1px solid var(--solid-border, #444);
    background: rgba(255,255,255,0.04);
}

.st-image-gen-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    gap: 10px;
}
.st-image-gen-row span {
    flex-shrink: 0;
    min-width: 70px;
    font-size: 13px;
}
.st-image-gen-row input[type="text"],
.st-image-gen-row input[type="url"],
.st-image-gen-row input[type="password"],
.st-image-gen-row input[type="number"],
.st-image-gen-row select,
.st-image-gen-row textarea {
    flex: 1;
    min-width: 0;
    padding: 5px 8px;
    border-radius: 6px;
    border: 1px solid var(--solid-border, #555);
    background: var(--black50bg, #222);
    color: var(--text, #eee);
    font-size: 13px;
}
.st-image-gen-row textarea {
    font-family: monospace;
    resize: vertical;
}

.stig-section {
    border-bottom: 1px solid rgba(255,255,255,0.06);
}
.stig-section-title {
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.6;
}

.st-image-gen-container {
    margin: 8px 0;
    text-align: center;
}
.st-image-gen-container .st-image-gen-result {
    max-width: 100%;
    max-height: 300px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.st-image-gen-loading {
    padding: 20px;
    color: #888;
    font-size: 13px;
}
.st-image-gen-error {
    padding: 12px 16px;
    background: rgba(255,60,60,0.12);
    border: 1px solid rgba(255,60,60,0.3);
    border-radius: 8px;
    color: #f66;
    font-size: 13px;
    white-space: pre-wrap;
    word-break: break-all;
}

/* toast */
.st-image-gen-toast {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 24px;
    background: #333;
    color: #fff;
    border-radius: 20px;
    font-size: 14px;
    z-index: 100000;
    opacity: 1;
    transition: opacity 0.4s;
}
.st-image-gen-toast-hide {
    opacity: 0;
}

/* floating button fallback */
#stig-fab {
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: #6a5acd;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    cursor: pointer;
    z-index: 99999;
    box-shadow: 0 4px 16px rgba(106,90,205,0.6);
    transition: transform 0.2s;
    user-select: none;
    -webkit-user-select: none;
}
#stig-fab:active {
    transform: scale(0.92);
}
';
        // Only add if not already present
        if (!document.getElementById('st-image-gen-css')) {
            s.id = 'st-image-gen-css';
            document.head.appendChild(s);
        }
    })();

    'use strict';

    const TAG_PATTERN = /<image>\s*image###([\s\S]+?)###\s*<\/image>/gi;

    const DEFAULTS = {
        enabled:          true,
        engine:           'novelai',
        novelaiApiKey:    '',
        novelaiModel:     'nai3',
        sdEndpoint:       'http://127.0.0.1:7860',
        comfyuiEndpoint:  'http://127.0.0.1:8188',
        comfyuiWorkflow:  '{}',
        width:            512,
        height:           768,
        steps:            28,
        scale:            11,
        nsfw:             true,
        autoGenerate:     true,
    };

    let settings = { ...DEFAULTS };
    const processedIds = new Set();

    function loadSettings() {
        try {
            const raw = localStorage.getItem('st_image_gen_settings');
            if (raw) settings = { ...DEFAULTS, ...JSON.parse(raw) };
        } catch (e) {}
    }
    function saveSettings() {
        try { localStorage.setItem('st_image_gen_settings', JSON.stringify(settings)); } catch (e) {}
    }

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => {
                const s = r.result;
                resolve(s.substring(s.indexOf(',') + 1));
            };
            r.onerror = reject;
            r.readAsDataURL(blob);
        });
    }

    async function callNovelAI(prompt) {
        const body = {
            input: prompt,
            model: settings.novelaiModel,
            parameters: {
                width: settings.width,
                height: settings.height,
                scale: settings.scale,
                sampler: 'k_euler_ancestral',
                steps: settings.steps,
                n_samples: 1,
                uc: 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
                ucPreset: 0,
                qualityToggle: true,
                sm: true,
                sm_dyn: false,
            },
        };
        const res = await fetch('https://api.novelai.net/ai/generate-image', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + settings.novelaiApiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            throw new Error('NovelAI ' + res.status + ': ' + (await res.text().catch(() => '')));
        }
        const ct = (res.headers.get('content-type') || '');
        if (ct.includes('json')) {
            const d = await res.json();
            if (d.data) return d.data;
            if (Array.isArray(d)) return d[0];
            throw new Error('NovelAI unknown JSON format');
        }
        return blobToBase64(await res.blob());
    }

    async function callSD(prompt) {
        const url = settings.sdEndpoint.replace(/\\/+$/, '') + '/sdapi/v1/txt2img';
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: prompt,
                negative_prompt: 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, jpeg artifacts, signature, watermark, blurry',
                steps: settings.steps,
                width: settings.width,
                height: settings.height,
                cfg_scale: 7,
                sampler_index: 'Euler a',
                batch_size: 1,
                n_iter: 1,
            }),
        });
        if (!res.ok) {
            throw new Error('SD ' + res.status + ': ' + (await res.text().catch(() => '')));
        }
        const d = await res.json();
        if (d.images && d.images[0]) return d.images[0];
        throw new Error('SD no image returned');
    }

    function injectPromptIntoWorkflow(obj, prompt) {
        if (typeof obj === 'string') return obj.replace(/\{\{prompt\}\}/g, prompt);
        if (Array.isArray(obj)) return obj.map(v => injectPromptIntoWorkflow(v, prompt));
        if (obj && typeof obj === 'object') {
            for (const k of Object.keys(obj)) {
                if (k === 'inputs' && obj.class_type === 'CLIPTextEncode') {
                    obj.inputs.text = prompt;
                } else {
                    obj[k] = injectPromptIntoWorkflow(obj[k], prompt);
                }
            }
        }
        return obj;
    }

    async function callComfyUI(prompt) {
        const ep = settings.comfyuiEndpoint.replace(/\\/+$/, '');
        let workflow;
        try {
            workflow = JSON.parse(settings.comfyuiWorkflow);
        } catch (e) {
            throw new Error('Workflow JSON parse error: ' + e.message);
        }
        injectPromptIntoWorkflow(workflow, prompt);
        const sr = await fetch(ep + '/prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: workflow }),
        });
        if (!sr.ok) throw new Error('ComfyUI submit ' + sr.status);
        const promptId = (await sr.json()).prompt_id;
        for (let i = 0; i < 120; i++) {
            await sleep(2000);
            const hr = await fetch(ep + '/history/' + promptId);
            if (!hr.ok) continue;
            const hist = await hr.json();
            const outputs = hist[promptId]?.outputs;
            if (!outputs) continue;
            for (const nid of Object.keys(outputs)) {
                const imgs = outputs[nid]?.images;
                if (imgs && imgs[0]) {
                    const img = imgs[0];
                    const vr = await fetch(
                        ep + '/view?filename=' + encodeURIComponent(img.filename) +
                        '&subfolder=' + encodeURIComponent(img.subfolder || '') +
                        '&type=' + encodeURIComponent(img.type || 'output')
                    );
                    if (vr.ok) return blobToBase64(await vr.blob());
                }
            }
        }
        throw new Error('ComfyUI generation timeout');
    }

    async function generateImage(prompt, msgEl) {
        if (!settings.enabled || !prompt.trim()) return;
        if (settings.nsfw && !prompt.toLowerCase().includes('nsfw')) {
            prompt = 'nsfw, ' + prompt;
        }
        const container = document.createElement('div');
        container.className = 'st-image-gen-container';
        container.innerHTML = '<div class="st-image-gen-loading">\\u{1F3A8} \\u751F\\u56FE\\u4E2D\\u2026</div>';
        msgEl.appendChild(container);
        try {
            let b64;
            switch (settings.engine) {
                case 'novelai': b64 = await callNovelAI(prompt); break;
                case 'sd': b64 = await callSD(prompt); break;
                case 'comfyui': b64 = await callComfyUI(prompt); break;
                default: throw new Error('Unknown engine');
            }
            const img = document.createElement('img');
            img.src = 'data:image/png;base64,' + b64;
            img.className = 'st-image-gen-result';
            img.alt = prompt;
            img.loading = 'lazy';
            container.innerHTML = '';
            container.appendChild(img);
        } catch (err) {
            container.innerHTML = '<div class="st-image-gen-error">\\u274C ' + err.message.replace(/</g, '&lt;') + '</div>';
            console.error('[ST-ImageGen]', err);
        }
    }

    function scanMessage(el) {
        const id = el.getAttribute('data-message-id') || el.innerText.substring(0, 80);
        if (processedIds.has(id)) return;
        processedIds.add(id);
        const text = el.innerText || el.textContent || '';
        TAG_PATTERN.lastIndex = 0;
        let m;
        while ((m = TAG_PATTERN.exec(text)) !== null) {
            const p = m[1].trim();
            if (p && settings.autoGenerate) generateImage(p, el);
        }
    }

    function scanExisting() {
        document.querySelectorAll('.mes, .message, [data-message-id]').forEach(scanMessage);
    }

    function startObserver() {
        const target = document.querySelector(
            '#chat_messages, .chat-container, .messages, #message-container'
        ) || document.body;
        const obs = new MutationObserver(muts => {
            for (const m of muts) {
                for (const n of m.addedNodes) {
                    if (n.nodeType !== 1) continue;
                    if (n.matches?.('.mes, .message, [data-message-id]')) scanMessage(n);
                    n.querySelectorAll?.('.mes, .message, [data-message-id]').forEach(scanMessage);
                }
            }
        });
        obs.observe(target, { childList: true, subtree: true });
    }

    function createSettingsUI() {
        const panel = document.createElement('div');
        panel.id = 'st-image-gen-settings';
        panel.className = 'st-image-gen-panel';
        panel.style.display = 'none';

        const sel = v => settings.engine === v ? 'selected' : '';
        const chk = v => settings[v] ? 'checked' : '';
        const modSel = v => settings.novelaiModel === v ? 'selected' : '';
        const disp = v => settings.engine === v ? '' : 'style="display:none"';

        panel.innerHTML = [
            '<div class="st-image-gen-panel-header">\\u{1F5BC}\\uFE0F AI \\u63D2\\u56FE\\u751F\\u6210 \\u2014 \\u8BBE\\u7F6E</div>',

            '<label class="st-image-gen-row"><span>\\u542F\\u7528\\u751F\\u56FE</span><input type="checkbox" id="stig-enabled" ' + chk('enabled') + '></label>',

            '<label class="st-image-gen-row"><span>\\u751F\\u56FE\\u5F15\\u64CE</span><select id="stig-engine">',
            '<option value="novelai" ' + sel('novelai') + '>NovelAI</option>',
            '<option value="sd" ' + sel('sd') + '>Stable Diffusion</option>',
            '<option value="comfyui" ' + sel('comfyui') + '>ComfyUI</option>',
            '</select></label>',

            '<div class="stig-section stig-section-novelai" ' + disp('novelai') + '>',
            '<div class="stig-section-title">NovelAI \\u8BBE\\u7F6E</div>',
            '<label class="st-image-gen-row"><span>API Key</span><input type="password" id="stig-novelai-key" value="' + settings.novelaiApiKey + '" placeholder="sk-..."></label>',
            '<label class="st-image-gen-row"><span>\\u6A21\\u578B</span><select id="stig-novelai-model">',
            '<option value="nai3" ' + modSel('nai3') + '>NAI3</option>',
            '<option value="nai3-full" ' + modSel('nai3-full') + '>NAI3 Full</option>',
            '<option value="nai4" ' + modSel('nai4') + '>NAI4</option>',
            '<option value="nai4-kv" ' + modSel('nai4-kv') + '>NAI4 KV</option>',
            '</select></label></div>',

            '<div class="stig-section stig-section-sd" ' + disp('sd') + '>',
            '<div class="stig-section-title">Stable Diffusion \\u8BBE\\u7F6E</div>',
            '<label class="st-image-gen-row"><span>API \\u5730\\u5740</span><input type="url" id="stig-sd-endpoint" value="' + settings.sdEndpoint + '" placeholder="http://127.0.0.1:7860"></label></div>',

            '<div class="stig-section stig-section-comfyui" ' + disp('comfyui') + '>',
            '<div class="stig-section-title">ComfyUI \\u8BBE\\u7F6E</div>',
            '<label class="st-image-gen-row"><span>API \\u5730\\u5740</span><input type="url" id="stig-comfyui-endpoint" value="' + settings.comfyuiEndpoint + '" placeholder="http://127.0.0.1:8188"></label>',
            '<label class="st-image-gen-row" style="align-items:flex-start"><span>Workflow JSON</span>',
            '<textarea id="stig-comfyui-workflow" rows="4" placeholder=' + JSON.stringify('{"3":{"class_type":"CLIPTextEncode","inputs":{"text":"{{prompt}}"}}}') + '>' + settings.comfyuiWorkflow + '</textarea></label></div>',

            '<div class="stig-section stig-section-params">',
            '<div class="stig-section-title">\\u751F\\u6210\\u53C2\\u6570</div>',
            '<label class="st-image-gen-row"><span>\\u5BBD\\u5EA6</span><input type="number" id="stig-width" value="' + settings.width + '" min="256" max="2048" step="64"></label>',
            '<label class="st-image-gen-row"><span>\\u9AD8\\u5EA6</span><input type="number" id="stig-height" value="' + settings.height + '" min="256" max="2048" step="64"></label>',
            '<label class="st-image-gen-row"><span>\\u6B65\\u6570</span><input type="number" id="stig-steps" value="' + settings.steps + '" min="1" max="150"></label>',
            '<label class="st-image-gen-row"><span>CFG Scale</span><input type="number" id="stig-scale" value="' + settings.scale + '" min="1" max="30" step="0.5"></label>',
            '<label class="st-image-gen-row"><span>\\u5141\\u8BB8 NSFW</span><input type="checkbox" id="stig-nsfw" ' + chk('nsfw') + '></label></div>',

            '<div class="stig-section"><label class="st-image-gen-row"><span>\\u81EA\\u52A8\\u751F\\u56FE</span><input type="checkbox" id="stig-auto" ' + chk('autoGenerate') + '></label></div>',

            '<div style="padding:8px 12px;text-align:right">',
            '<button id="stig-save-btn" class="menu_button">\\u{1F4BE} \\u4FDD\\u5B58</button>',
            '<button id="stig-test-btn" class="menu_button">\\u{1F9EA} \\u6D4B\\u8BD5</button>',
            '<button id="stig-rescan-btn" class="menu_button">\\u{1F504} \\u91CD\\u65B0\\u626B\\u63CF</button>',
            '</div>',
        ].join('\\n');
        document.body.appendChild(panel);
        bindUI(panel);
    }

    function bindUI(p) {
        p.querySelector('#stig-engine').addEventListener('change', function() {
            const v = this.value;
            p.querySelector('.stig-section-novelai').style.display = v === 'novelai' ? '' : 'none';
            p.querySelector('.stig-section-sd').style.display = v === 'sd' ? '' : 'none';
            p.querySelector('.stig-section-comfyui').style.display = v === 'comfyui' ? '' : 'none';
        });
        p.querySelector('#stig-save-btn').addEventListener('click', function() {
            settings.enabled = p.querySelector('#stig-enabled').checked;
            settings.engine = p.querySelector('#stig-engine').value;
            settings.novelaiApiKey = p.querySelector('#stig-novelai-key').value;
            settings.novelaiModel = p.querySelector('#stig-novelai-model').value;
            settings.sdEndpoint = p.querySelector('#stig-sd-endpoint').value;
            settings.comfyuiEndpoint = p.querySelector('#stig-comfyui-endpoint').value;
            settings.comfyuiWorkflow = p.querySelector('#stig-comfyui-workflow').value;
            settings.width = parseInt(p.querySelector('#stig-width').value) || DEFAULTS.width;
            settings.height = parseInt(p.querySelector('#stig-height').value) || DEFAULTS.height;
            settings.steps = parseInt(p.querySelector('#stig-steps').value) || DEFAULTS.steps;
            settings.scale = parseFloat(p.querySelector('#stig-scale').value) || DEFAULTS.scale;
            settings.nsfw = p.querySelector('#stig-nsfw').checked;
            settings.autoGenerate = p.querySelector('#stig-auto').checked;
            saveSettings();
            toast('\\u8BBE\\u7F6E\\u5DF2\\u4FDD\\u5B58');
        });
        p.querySelector('#stig-test-btn').addEventListener('click', function() {
            const prompt = '1girl, white hair, red eyes, smile, school uniform, standing, outdoors, cherry blossoms';
            const dummy = document.createElement('div');
            dummy.className = 'mes';
            const target = document.querySelector('#chat_messages, .chat-container, .messages, #message-container') || document.body;
            target.appendChild(dummy);
            generateImage(prompt, dummy);
        });
        p.querySelector('#stig-rescan-btn').addEventListener('click', function() {
            processedIds.clear();
            scanExisting();
            toast('\\u5DF2\\u91CD\\u65B0\\u626B\\u63CF');
        });
        var closeBtn = p.querySelector('#stig-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                p.style.display = 'none';
            });
        }
    }

    function injectSettingsButton() {
        // Always create a floating action button (FAB)
        let fab = document.getElementById('stig-fab');
        if (!fab) {
            fab = document.createElement('div');
            fab.id = 'stig-fab';
            fab.textContent = '\u{1F5BC}';
            fab.title = '\u63D2\u56FE\u751F\u6210';
            fab.addEventListener('click', function() {
                const panel = document.getElementById('st-image-gen-settings');
                if (panel) {
                    const vis = panel.style.display !== 'none';
                    panel.style.display = vis ? 'none' : '';
                }
            });
            document.body.appendChild(fab);
        }

        // Also try to inject into sidebar (best effort)
        try {
            const bar = document.querySelector('#settings-toolbar, .settings_toolbar, .left_menu, .side_panel, .st-settings-bar, .lm_panel, .panelControlPanel, .menu_button_bar');
            if (bar && !document.getElementById('stig-sidebar-btn')) {
                const b = document.createElement('div');
                b.id = 'stig-sidebar-btn';
                b.className = 'menu_button settings_button';
                b.textContent = '\u{1F5BC}';
                b.title = '\u63D2\u56FE\u751F\u6210';
                b.addEventListener('click', function() {
                    const panel = document.getElementById('st-image-gen-settings');
                    if (panel) panel.style.display = panel.style.display === 'none' ? '' : 'none';
                });
                bar.appendChild(b);
            }
        } catch (e) {
            console.log('[ST-ImageGen] sidebar inject skipped:', e.message);
        }
    }

    function toast(msg) {
        const el = document.createElement('div');
        el.className = 'st-image-gen-toast';
        el.textContent = msg;
        document.body.appendChild(el);
        setTimeout(function() { el.classList.add('st-image-gen-toast-hide'); }, 2000);
        setTimeout(function() { el.remove(); }, 2600);
    }

    function init() {
        loadSettings();
        createSettingsUI();
        injectSettingsButton();
        startObserver();
        setTimeout(scanExisting, 1000);
        window.addEventListener('load', function() { setTimeout(scanExisting, 1000); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
