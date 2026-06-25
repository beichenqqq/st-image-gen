// SillyTavern Extension: AI Image Gen
(function() {
    'use strict';
    console.log('[ST-IG] init');
    var S = {enabled:true,engine:'novelai',novelaiApiKey:'',novelaiModel:'nai3',sdEndpoint:'http://127.0.0.1:7860',comfyuiEndpoint:'http://127.0.0.1:8188',comfyuiWorkflow:'{}',width:512,height:768,steps:28,scale:11,nsfw:true,autoGenerate:true};
    function load(){try{var r=localStorage.getItem('stig_cfg');if(r){var o=JSON.parse(r);for(var k in o)if(o.hasOwnProperty(k))S[k]=o[k];}}catch(e){}}
    function save(){try{localStorage.setItem('stig_cfg',JSON.stringify(S));}catch(e){}}
    function esc(s){return(s||'').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
    function makePanel(){
        var p=document.createElement('div');
        p.id='stig-panel';
        p.style.cssText='position:fixed;top:60px;right:20px;width:340px;max-height:80vh;overflow-y:auto;background:#1a1a2e;border:1px solid #444;border-radius:12px;z-index:99999;color:#ddd;font-size:14px;box-shadow:0 8px 32px rgba(0,0,0,0.5);display:none';
        var h='';
        h+='<div style="display:flex;align-items:center;padding:10px 14px;font-weight:700;border-bottom:1px solid #444"><span style="flex:1">AI Image Gen</span><span id="stig-close" style="cursor:pointer;opacity:.6">X</span></div>';
        h+='<div style="padding:8px 14px">';
        h+='<label style="display:flex;align-items:center;justify-content:space-between;padding:4px 0"><span>Enable</span><input type="checkbox" id="stig-en"'+(S.enabled?' checked':'')+'></label>';
        h+='<label style="display:flex;align-items:center;justify-content:space-between;padding:4px 0"><span>Engine</span><select id="stig-eng">';
        h+='<option value="novelai"'+(S.engine==='novelai'?' selected':'')+'>NovelAI</option>';
        h+='<option value="sd"'+(S.engine==='sd'?' selected':'')+'>SD</option>';
        h+='<option value="comfyui"'+(S.engine==='comfyui'?' selected':'')+'>ComfyUI</option></select></label>';
        h+='<div id="stig-nai-sec"'+(S.engine==='novelai'?'':' style="display:none"')+' style="margin:4px 0;padding:6px;border:1px solid rgba(255,255,255,0.1);border-radius:6px">';
        h+='<div style="font-size:11px;font-weight:600;opacity:.5;margin-bottom:4px">NOVELAI</div>';
        h+='<input type="password" id="stig-nai-key" placeholder="API Key" value="'+esc(S.novelaiApiKey)+'" style="width:100%;margin:2px 0">';
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
        h+='<label style="display:flex;align-items:center;justify-content:space-between;padding:4px 0"><span>NSFW</span><input type="checkbox" id="stig-nsfw"'+(S.nsfw?' checked':'')+'></label>';
        h+='<label style="display:flex;align-items:center;justify-content:space-between;padding:4px 0"><span>Auto</span><input type="checkbox" id="stig-auto"'+(S.autoGenerate?' checked':'')+'></label>';
        h+='<div style="display:flex;gap:6px;padding:6px 0"><button id="stig-save" class="menu_button" style="flex:1">Save</button><button id="stig-test" class="menu_button" style="flex:1">Test</button></div>';
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
            d.innerHTML='<div style="padding:10px;color:#888">[ST-IG loaded. Click IG button to configure]</div>';
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
