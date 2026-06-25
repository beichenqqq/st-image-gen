// SillyTavern Extension: AI 插图生成
(function() {
    'use strict';
    console.log('[ST-IG] init');
    var S = {enabled:true,engine:'novelai',novelaiApiKey:'',novelaiModel:'nai3',sdEndpoint:'http://127.0.0.1:7860',comfyuiEndpoint:'http://127.0.0.1:8188',comfyuiWorkflow:'{}',width:512,height:768,steps:28,scale:11,nsfw:true,autoGenerate:true};
    function load(){try{var r=localStorage.getItem('stig_cfg');if(r){var o=JSON.parse(r);for(var k in o)if(o.hasOwnProperty(k))S[k]=o[k];}}catch(e){}}
    function save(){try{localStorage.setItem('stig_cfg',JSON.stringify(S));}catch(e){}}
    function esc(s){return(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
    function sleep(ms){return new Promise(function(r){setTimeout(r,ms);})}
    function b64(blob){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){var s=r.result;res(s.substring(s.indexOf(',')+1));};r.onerror=rej;r.readAsDataURL(blob);})}
    function q(s){return document.querySelector(s)}
    function qa(s){return document.querySelectorAll(s)}

    async function callNovelAI(p){var b={input:p,model:S.novelaiModel,parameters:{width:S.width,height:S.height,scale:S.scale,sampler:'k_euler_ancestral',steps:S.steps,n_samples:1,uc:'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',ucPreset:0,qualityToggle:true,sm:true,sm_dyn:false}};var r=await fetch('https://api.novelai.net/ai/generate-image',{method:'POST',headers:{'Authorization':'Bearer '+S.novelaiApiKey,'Content-Type':'application/json'},body:JSON.stringify(b)});if(!r.ok)throw new Error('NovelAI '+r.status);var ct=(r.headers.get('content-type')||'');if(ct.indexOf('json')>=0){var d=await r.json();if(d.data)return d.data;if(Array.isArray(d)&&d[0])return d[0];throw new Error('NAI format error');}return b64(await r.blob());}
    async function callSD(p){var url=S.sdEndpoint.replace(/\\+$/,'')+'/sdapi/v1/txt2img';var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:p,negative_prompt:'lowres, bad anatomy, bad hands, text, error, missing fingers, cropped, worst quality, jpeg artifacts, signature, watermark, blurry',steps:S.steps,width:S.width,height:S.height,cfg_scale:7,sampler_index:'Euler a',batch_size:1,n_iter:1})});if(!r.ok)throw new Error('SD '+r.status);var d=await r.json();if(d.images&&d.images[0])return d.images[0];throw new Error('SD no img');}
    function injectPrompt(obj,p){if(typeof obj==='string')return obj.split('{{prompt}}').join(p);if(Array.isArray(obj)){for(var i=0;i<obj.length;i++)obj[i]=injectPrompt(obj[i],p);return obj;}if(obj&&typeof obj==='object'){for(var k in obj){if(obj.hasOwnProperty(k)){if(k==='inputs'&&obj.class_type==='CLIPTextEncode')obj.inputs.text=p;else obj[k]=injectPrompt(obj[k],p);}}}return obj;}
    async function callComfyUI(p){var ep=S.comfyuiEndpoint.replace(/\\+$/,'');var wf;try{wf=JSON.parse(S.comfyuiWorkflow);}catch(e){throw new Error('WF: '+e.message);}injectPrompt(wf,p);var sr=await fetch(ep+'/prompt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:wf})});if(!sr.ok)throw new Error('CF '+sr.status);var pid=(await sr.json()).prompt_id;for(var i=0;i<120;i++){await sleep(2000);var hr=await fetch(ep+'/history/'+pid);if(!hr.ok)continue;var hist=await hr.json();var outs=hist[pid]&&hist[pid].outputs;if(!outs)continue;var keys=Object.keys(outs);for(var j=0;j<keys.length;j++){var imgs=outs[keys[j]]&&outs[keys[j]].images;if(imgs&&imgs[0]){var img=imgs[0];var vr=await fetch(ep+'/view?filename='+encodeURIComponent(img.filename)+'&subfolder='+encodeURIComponent(img.subfolder||'')+'&type='+encodeURIComponent(img.type||'output'));if(vr.ok)return b64(await vr.blob());}}}throw new Error('CF timeout');}
    var TAG_RE = /<image>\s*image###([\s\S]+?)###\s*<\/image>/gi;
    function scanMessage(el){
        var id=el.getAttribute('data-message-id')||el.innerText.substring(0,80);
        if(processed.has(id))return;processed.add(id);
        var text=el.innerText||el.textContent||'';
        TAG_RE.lastIndex=0;var m;
        while((m=TAG_RE.exec(text))!==null){var p=m[1].trim();if(p&&S.autoGenerate)generateImage(p,el);}
    }
    function scanAll(){var els=qa('.mes, .message, [data-message-id]');for(var i=0;i<els.length;i++)scanMessage(els[i]);}
    function startObserver(){
        var target=q('#chat_messages, .chat-container, .messages, #message-container')||document.body;
        var obs=new MutationObserver(function(muts){
            for(var m=0;m<muts.length;m++){var nodes=muts[m].addedNodes;
                for(var n=0;n<nodes.length;n++){var node=nodes[n];
                    if(node.nodeType!==1)continue;
                    if(node.matches&&node.matches('.mes, .message, [data-message-id]'))scanMessage(node);
                    if(node.querySelectorAll){var sub=node.querySelectorAll('.mes, .message, [data-message-id]');for(var s=0;s<sub.length;s++)scanMessage(sub[s]);}}}
        });
        obs.observe(target,{childList:true,subtree:true});
    }
    async function generateImage(prompt, msgEl){
        if(!S.enabled||!prompt.trim())return;
        if(S.nsfw&&prompt.toLowerCase().indexOf('nsfw')<0)prompt='nsfw, '+prompt;
        var c=document.createElement('div');
        c.style.cssText='margin:8px 0;text-align:center';
        c.innerHTML='<div style=\"padding:20px;color:#888\">[\u751f\u6210\u4e2d...]</div>';
        msgEl.appendChild(c);
        try{
            var b;
            if(S.engine==='novelai')b=await callNovelAI(prompt);
            else if(S.engine==='sd')b=await callSD(prompt);
            else if(S.engine==='comfyui')b=await callComfyUI(prompt);
            else throw new Error('\u672a\u77e5\u5f15\u64ce');
            var img=document.createElement('img');
            img.src='data:image/png;base64,'+b;
            img.style.cssText='max-width:100%;max-height:300px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.3)';
            c.innerHTML='';c.appendChild(img);
        }catch(err){
            c.innerHTML='<div style=\"padding:10px 14px;background:rgba(255,60,60,0.1);border:1px solid rgba(255,60,60,0.3);border-radius:8px;color:#f66;font-size:13px\">[\u9519\u8bef] '+err.message.replace(/</g,'&lt;')+'</div>';
            console.error('[ST-IG]',err);
        }
    }
    function makePanel(){
        var p=document.createElement('div');
        p.id='stig-panel';
        p.style.cssText='position:fixed;top:60px;right:20px;width:340px;max-height:80vh;overflow-y:auto;background:#1a1a2e;border:1px solid #444;border-radius:12px;z-index:99999;color:#ddd;font-size:14px;box-shadow:0 8px 32px rgba(0,0,0,0.5);display:none';
        var h='';
        h+='<div style="display:flex;align-items:center;padding:10px 14px;font-weight:700;border-bottom:1px solid #444"><span style="flex:1">AI 插图生成</span><span id="stig-close" style="cursor:pointer;opacity:.6">X</span></div>';
        h+='<div style="padding:8px 14px">';
        h+='<label style="display:flex;align-items:center;justify-content:space-between;padding:4px 0"><span>启用</span><input type="checkbox" id="stig-en"'+(S.enabled?' checked':'')+'></label>';
        h+='<label style="display:flex;align-items:center;justify-content:space-between;padding:4px 0"><span>引擎</span><select id="stig-eng">';
        h+='<option value="novelai"'+(S.engine==='novelai'?' selected':'')+'>NovelAI</option>';
        h+='<option value="sd"'+(S.engine==='sd'?' selected':'')+'>SD</option>';
        h+='<option value="comfyui"'+(S.engine==='comfyui'?' selected':'')+'>ComfyUI</option></select></label>';
        h+='<div id="stig-nai-sec"'+(S.engine==='novelai'?'':' style="display:none"')+' style="margin:4px 0;padding:6px;border:1px solid rgba(255,255,255,0.1);border-radius:6px">';
        h+='<div style="font-size:11px;font-weight:600;opacity:.5;margin-bottom:4px">NovelAI 设置</div>';
        h+='<input type="password" id="stig-nai-key" placeholder="API 密钥" value="'+esc(S.novelaiApiKey)+'" style="width:100%;margin:2px 0">';
        h+='<select id="stig-nai-mdl" style="width:100%;margin:2px 0"><option value="nai3"'+(S.novelaiModel==='nai3'?' selected':'')+'>NAI3</option><option value="nai4"'+(S.novelaiModel==='nai4'?' selected':'')+'>NAI4</option></select></div>';
        h+='<div id="stig-sd-sec"'+(S.engine==='sd'?'':' style="display:none"')+' style="margin:4px 0;padding:6px;border:1px solid rgba(255,255,255,0.1);border-radius:6px">';
        h+='<div style="font-size:11px;font-weight:600;opacity:.5;margin-bottom:4px">SD</div>';
        h+='<input type="url" id="stig-sd-ep" value="'+esc(S.sdEndpoint)+'" style="width:100%;margin:2px 0"></div>';
        h+='<div id="stig-cf-sec"'+(S.engine==='comfyui'?'':' style="display:none"')+' style="margin:4px 0;padding:6px;border:1px solid rgba(255,255,255,0.1);border-radius:6px">';
        h+='<div style="font-size:11px;font-weight:600;opacity:.5;margin-bottom:4px">COMFYUI</div>';
        h+='<input type="url" id="stig-cf-ep" value="'+esc(S.comfyuiEndpoint)+'" style="width:100%;margin:2px 0">';
        h+='<textarea id="stig-cf-wf" rows="2" style="width:100%;margin:2px 0">'+esc(S.comfyuiWorkflow)+'</textarea></div>';
        h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:4px 0">';
        h+='<input type="number" id="stig-w" value="'+S.width+'" style="width:100%">';
        h+='<input type="number" id="stig-h" value="'+S.height+'" style="width:100%">';
        h+='<input type="number" id="stig-st" value="'+S.steps+'" style="width:100%">';
        h+='<input type="number" id="stig-sc" value="'+S.scale+'" style="width:100%"></div>';
        h+='<label style="display:flex;align-items:center;justify-content:space-between;padding:4px 0"><span>允许 NSFW</span><input type="checkbox" id="stig-nsfw"'+(S.nsfw?' checked':'')+'></label>';
        h+='<label style="display:flex;align-items:center;justify-content:space-between;padding:4px 0"><span>自动生图</span><input type="checkbox" id="stig-auto"'+(S.autoGenerate?' checked':'')+'></label>';
        h+='<div style="display:flex;gap:6px;padding:6px 0"><button id="stig-save" class="menu_button" style="flex:1">保存</button><button id="stig-test" class="menu_button" style="flex:1">测试</button></div>';
        h+='</div>';
        p.innerHTML=h;
        document.body.appendChild(p);
        bindPanel(p);
    }
    function bindPanel(p){
        var eng=p.querySelector('#stig-eng');
        if(eng)eng.onchange=function(){
            var v=this.value;
            var n=document.getElementById('stig-nai-sec');
            var s=document.getElementById('stig-sd-sec');
            var c=document.getElementById('stig-cf-sec');
            if(n)n.style.display=v==='novelai'?'':'none';
            if(s)s.style.display=v==='sd'?'':'none';
            if(c)c.style.display=v==='comfyui'?'':'none';
        };
        var close=p.querySelector('#stig-close');
        if(close)close.onclick=function(){p.style.display='none';};
        var save=p.querySelector('#stig-save');
        if(save)save.onclick=function(){
            S.enabled=document.getElementById('stig-en').checked;
            S.engine=document.getElementById('stig-eng').value;
            S.novelaiApiKey=document.getElementById('stig-nai-key').value;
            S.novelaiModel=document.getElementById('stig-nai-mdl').value;
            S.sdEndpoint=document.getElementById('stig-sd-ep').value;
            S.comfyuiEndpoint=document.getElementById('stig-cf-ep').value;
            S.comfyuiWorkflow=document.getElementById('stig-cf-wf').value;
            S.width=parseInt(document.getElementById('stig-w').value)||512;
            S.height=parseInt(document.getElementById('stig-h').value)||768;
            S.steps=parseInt(document.getElementById('stig-st').value)||28;
            S.scale=parseFloat(document.getElementById('stig-sc').value)||11;
            S.nsfw=document.getElementById('stig-nsfw').checked;
            S.autoGenerate=document.getElementById('stig-auto').checked;
            save();
        };
        var test=p.querySelector('#stig-test');
        if(test)test.onclick=function(){
            var d=document.createElement('div');d.className='mes';
            var c=document.querySelector('#chat_messages,.chat-container,.messages')||document.body;
            c.appendChild(d);
            generateImage('1girl, white hair, red eyes, smile, school uniform, standing, outdoors, cherry blossoms', d);
        };
    }
    function makeFAB(){
        if(document.getElementById('stig-fab'))return;
        var f=document.createElement('div');
        f.id='stig-fab';
        f.textContent='IG';
        f.style.cssText='position:fixed;bottom:80px;right:20px;width:50px;height:50px;border-radius:50%;background:#6a5acd;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;cursor:pointer;z-index:99999;box-shadow:0 4px 16px rgba(106,90,205,0.6)';
        f.onclick=function(){var p=document.getElementById('stig-panel');if(p)p.style.display=p.style.display==='none'?'':'none';};
        document.body.appendChild(f);
    }
    function init(){
        try{load();makePanel();makeFAB();console.log('[ST-IG] ready');}
        catch(e){console.error('[ST-IG] error:',e);}
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
    else init();
})();
