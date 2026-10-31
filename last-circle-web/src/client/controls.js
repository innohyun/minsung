export class TouchControls{
 constructor(onAction,onLook){
  this.enabled=matchMedia('(pointer:coarse)').matches;this.mx=this.mz=0;this.fire=false;this.aim=false;this.stance='stand';this.pointer=null;this.lookPointer=null;document.body.classList.toggle('touch-device',this.enabled);if(!this.enabled)return;
  const $=id=>document.getElementById(id),stick=$('joystick'),knob=$('stick-knob'),zone=$('touch-look');
  const update=e=>{const b=stick.getBoundingClientRect(),dx=(e.clientX-b.left-b.width/2)/42,dy=(e.clientY-b.top-b.height/2)/42,n=Math.max(1,Math.hypot(dx,dy));this.mx=dx/n;this.mz=-dy/n;knob.style.transform=`translate(${this.mx*35}px,${-this.mz*35}px)`;};
  stick.addEventListener('pointerdown',e=>{e.preventDefault();if(this.pointer!==null)return;this.pointer=e.pointerId;stick.setPointerCapture(e.pointerId);update(e);});stick.addEventListener('pointermove',e=>{if(e.pointerId===this.pointer){e.preventDefault();update(e);}});
  const release=e=>{if(e.pointerId===this.pointer){this.pointer=null;this.mx=this.mz=0;knob.style.transform='';}};for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,release);
  zone.addEventListener('pointerdown',e=>{e.preventDefault();if(this.lookPointer!==null)return;this.lookPointer=e.pointerId;this.lastX=e.clientX;this.lastY=e.clientY;zone.setPointerCapture(e.pointerId);});zone.addEventListener('pointermove',e=>{if(e.pointerId===this.lookPointer){e.preventDefault();onLook(e.clientX-this.lastX,e.clientY-this.lastY);this.lastX=e.clientX;this.lastY=e.clientY;}});for(const event of ['pointerup','pointercancel','lostpointercapture'])zone.addEventListener(event,e=>{if(e.pointerId===this.lookPointer)this.lookPointer=null;});
  const fire=$('touch-fire');let fireId=null,fx=0,fy=0;
  fire.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();fireId=e.pointerId;fx=e.clientX;fy=e.clientY;this.fire=true;onAction('fire-start');fire.setPointerCapture(e.pointerId);fire.classList.add('held');});
  fire.addEventListener('pointermove',e=>{if(e.pointerId===fireId){e.preventDefault();const dx=e.clientX-fx,dy=e.clientY-fy,gain=.32+Math.min(1.6,Math.hypot(dx,dy)*.045);onLook(dx*gain,dy*gain);fx=e.clientX;fy=e.clientY;}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])fire.addEventListener(event,e=>{if(e.pointerId===fireId){fireId=null;this.fire=false;fire.classList.remove('held');}});
  $('touch-aim').addEventListener('pointerdown',e=>{e.preventDefault();this.aim=!this.aim;onAction('combat');$('touch-aim').classList.toggle('held',this.aim);});
  $('touch-stance').addEventListener('pointerdown',e=>{e.preventDefault();this.stance={stand:'crouch',crouch:'prone',prone:'stand'}[this.stance];onAction('stance:'+this.stance);});
  for(const[id,action]of[['touch-jump','jump'],['touch-loot','context'],['touch-switch','switch'],['touch-view','view']])$(id).addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();onAction(action);});
  $('touch-kit').onclick=()=>{this.fire=false;$('touch-fire').classList.remove('held');$('kit-tray').hidden=!$('kit-tray').hidden;};
  for(const b of document.querySelectorAll('[data-kit]'))b.onclick=()=>{onAction(b.dataset.kit);$('kit-tray').hidden=true;};
  $('minimap').addEventListener('pointerdown',e=>{e.preventDefault();e.currentTarget.classList.toggle('expanded');});
  document.addEventListener('touchmove',e=>{if(document.body.classList.contains('playing')&&!e.target.closest('.modal,dialog'))e.preventDefault();},{passive:false});
 }
 reset(){this.mx=this.mz=0;this.fire=false;this.pointer=this.lookPointer=null;const k=document.getElementById('stick-knob');if(k)k.style.transform='';document.getElementById('touch-fire')?.classList.remove('held');}
 setVisible(value){document.getElementById('touch-controls').hidden=!value||!this.enabled;if(!value)document.getElementById('kit-tray').hidden=true;}
}
