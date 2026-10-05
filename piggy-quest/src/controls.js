/** Independent pointer sources and per-control, reversible persistent layout editing. */
(function(P){
  'use strict';
  const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),sources=new Map();
  let editing=false,draft=null,drag=null,returnMode='play',stickPointer=null,selected='joystick';
  const buttons=()=>[...document.querySelectorAll('.movement button,.action-dock button,#joystick')];
  function identify(){for(const b of buttons())if(!b.id)b.id=b.dataset.skill!==undefined?'skill-'+b.dataset.skill:'move-'+b.dataset.hold;}
  function size(config,id){return config.sizes?.[id]||(id==='joystick'?config.stickSize:config.size);}
  function input(source,key,down){
    if(down){sources.set(source,key);P.game.keys.add(key);}else{const old=sources.get(source);sources.delete(source);if(old&&![...sources.values()].includes(old))P.game.keys.delete(old);}
  }
  function apply(settings=P.state.settings.controls){
    identify();const config=settings;
    $('joystick').hidden=config.mode==='buttons';$('direction-buttons').hidden=config.mode!=='buttons';
    for(const b of buttons()){
      const n=size(config,b.id);b.style.setProperty(b.id==='joystick'?'--stick-size':'--control-size',n+'px');
      b.classList.toggle('control-selected',editing&&b.id===selected);const p=config.positions?.[b.id];
      if(p){const half=n/2;b.style.position='fixed';b.style.left=clamp(p.x*innerWidth,half+4,innerWidth-half-4)+'px';b.style.top=clamp(p.y*innerHeight,half+4,innerHeight-half-4)+'px';b.style.right='auto';b.style.bottom='auto';b.style.transform='translate(-50%,-50%)';b.style.zIndex='52';}
      else for(const key of ['position','left','top','right','bottom','transform','zIndex'])b.style[key]='';
      if(editing)b.disabled=false;
    }
  }
  function release(){stickPointer=null;input('joystick-a','a',false);input('joystick-d','d',false);$('joystick-knob').style.transform='translate(-50%,-50%)';}
  function releaseAll(){release();sources.clear();}
  function move(e){
    const box=$('joystick').getBoundingClientRect(),dx=e.clientX-box.x-box.width/2,dy=e.clientY-box.y-box.height/2,range=box.width*.3,d=Math.hypot(dx,dy),factor=d>range?range/d:1;
    $('joystick-knob').style.transform=`translate(calc(-50% + ${dx*factor}px),calc(-50% + ${dy*factor}px))`;
    input('joystick-a','a',Math.abs(dx)>box.width*.1&&dx<0);input('joystick-d','d',Math.abs(dx)>box.width*.1&&dx>0);
  }
  function select(id){selected=id;$('control-target').value=id;const range=$('control-size');range.min=id==='joystick'?88:44;range.max=id==='joystick'?150:96;range.value=size(draft,id);$('control-size-value').textContent=range.value+'px';apply(draft);}
  function finish(save){
    if(save){P.state.settings.controls=draft;P.State.save(P.state);}
    editing=false;draft=null;drag=null;$('control-editor')?.remove();document.body.classList.remove('editing-controls');apply();P.game.mode=returnMode;P.game.clearInput();P.UI.updateHUD();P.UI.toast(save?'선택한 조작 크기와 배치를 저장했어요.':'기존 조작 배치를 유지했어요.');
  }
  function edit(){
    if(!P.state.active){P.UI.toast('원정을 시작한 뒤 일시정지에서 편집하세요.');return;}
    P.UI.close();returnMode=P.game.mode;P.game.mode='pause';P.game.clearInput();editing=true;draft=structuredClone(P.state.settings.controls);draft.sizes ||= {};document.body.classList.add('editing-controls');
    const panel=document.createElement('section');panel.id='control-editor';panel.setAttribute('aria-label','조이스틱 편집');
    panel.innerHTML='<strong>조이스틱 · 버튼 편집</strong><p>버튼을 누르거나 목록에서 선택한 뒤 크기를 바꾸세요. 끌어서 위치를 옮길 수 있어요.</p><label>이동 방식 <select id="control-mode"><option value="joystick">조이스틱</option><option value="buttons">방향 버튼</option></select></label><label>선택한 조작 <select id="control-target"></select></label><label>선택한 조작 크기 <input id="control-size" type="range"><output id="control-size-value"></output></label><div class="button-row"><button id="control-reset-selected" class="secondary">선택 초기화</button><button id="control-reset" class="secondary">전체 기본 배치</button><button id="control-cancel" class="secondary">취소</button><button id="control-save" class="primary">저장</button></div>';
    $('stage').append(panel);identify();for(const b of buttons()){const option=document.createElement('option');option.value=b.id;option.textContent=b.getAttribute('aria-label')||b.textContent.trim();$('control-target').append(option);}
    $('control-mode').value=draft.mode;$('control-mode').onchange=e=>{draft.mode=e.target.value;apply(draft);};$('control-target').onchange=e=>select(e.target.value);
    $('control-size').oninput=e=>{draft.sizes[selected]=Number(e.target.value);$('control-size-value').textContent=e.target.value+'px';apply(draft);};
    $('control-reset-selected').onclick=()=>{delete draft.positions[selected];delete draft.sizes[selected];select(selected);};
    $('control-reset').onclick=()=>{draft={mode:'joystick',size:56,stickSize:112,positions:{},sizes:{}};$('control-mode').value=draft.mode;select('joystick');};
    $('control-save').onclick=()=>finish(true);$('control-cancel').onclick=()=>finish(false);select('joystick');
  }
  function init(){
    // WebKit's native long-press selection can start despite pointerdown cancellation.
    // Cancel touch defaults on the actual controls, without swallowing either pointer.
    for(const type of ['touchstart','touchmove','touchend'])document.addEventListener(type,e=>{
      if(!e.target.closest?.('.movement,.action-dock'))return;
      e.preventDefault();window.getSelection()?.removeAllRanges();
    },{passive:false,capture:true});
    const stick=$('joystick');stick.onpointerdown=e=>{if(editing||P.game.mode!=='play'||stickPointer!==null)return;e.preventDefault();P.Audio.unlock();stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);move(e);};
    stick.onpointermove=e=>{if(e.pointerId===stickPointer&&!editing){e.preventDefault();move(e);}};
    const end=e=>{if(e.pointerId===stickPointer)release();};stick.onpointerup=end;stick.onpointercancel=end;stick.onlostpointercapture=end;
    document.addEventListener('pointerdown',e=>{
      if(!editing)return;const b=e.target.closest('.movement button,.action-dock button,#joystick');if(!b||b.hidden)return;e.preventDefault();e.stopImmediatePropagation();select(b.id);
      const r=b.getBoundingClientRect();drag={id:b.id,pointer:e.pointerId,dx:e.clientX-r.x-r.width/2,dy:e.clientY-r.y-r.height/2};b.setPointerCapture(e.pointerId);
    },true);
    document.addEventListener('pointermove',e=>{if(!editing||!drag||drag.pointer!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();draft.positions[drag.id]={x:clamp((e.clientX-drag.dx)/innerWidth,.02,.98),y:clamp((e.clientY-drag.dy)/innerHeight,.02,.98)};apply(draft);},true);
    for(const type of ['pointerup','pointercancel'])document.addEventListener(type,e=>{if(editing&&drag?.pointer===e.pointerId){e.preventDefault();e.stopImmediatePropagation();drag=null;}},true);
    window.addEventListener('resize',()=>apply(editing?draft:P.state.settings.controls));apply();
  }
  P.Controls={apply,release,releaseAll,input,edit,init,size,get editing(){return editing;}};
})(globalThis.PIGGY=globalThis.PIGGY||{});
