export class TouchControls {
 constructor(onAction,onLook,onInteract){
  this.enabled=matchMedia('(pointer:coarse)').matches;this.mx=0;this.mz=0;this.fire=false;this.aim=false;this.crouch=false;this.pointer=null;this.lookPointer=null;this.onAction=onAction;
  document.body.classList.toggle('touch-device',this.enabled);
  if(!this.enabled)return;
  const stick=document.getElementById('joystick'),knob=document.getElementById('stick-knob'),zone=document.getElementById('touch-look');
  const update=e=>{const b=stick.getBoundingClientRect(),dx=(e.clientX-b.left-b.width/2)/42,dy=(e.clientY-b.top-b.height/2)/42,n=Math.max(1,Math.hypot(dx,dy));this.mx=dx/n;this.mz=-dy/n;knob.style.transform=`translate(${this.mx*35}px,${-this.mz*35}px)`;};
  stick.addEventListener('pointerdown',e=>{e.preventDefault();if(this.pointer!==null)return;this.pointer=e.pointerId;stick.setPointerCapture(e.pointerId);update(e);});
  stick.addEventListener('pointermove',e=>{if(e.pointerId===this.pointer){e.preventDefault();update(e);}});
  const end=e=>{if(e.pointerId!==this.pointer)return;this.pointer=null;this.mx=this.mz=0;knob.style.transform='';};
  for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,end);
  zone.addEventListener('pointerdown',e=>{e.preventDefault();if(this.lookPointer!==null)return;this.lookPointer=e.pointerId;this.lastX=e.clientX;this.lastY=e.clientY;zone.setPointerCapture(e.pointerId);});
  zone.addEventListener('pointermove',e=>{if(e.pointerId===this.lookPointer){e.preventDefault();onLook(e.clientX-this.lastX,e.clientY-this.lastY);this.lastX=e.clientX;this.lastY=e.clientY;}});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])zone.addEventListener(event,e=>{if(e.pointerId===this.lookPointer)this.lookPointer=null;});
  const shot=document.getElementById('touch-fire');let fireId=null;
  shot.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();fireId=e.pointerId;this.fire=true;shot.setPointerCapture(e.pointerId);shot.classList.add('held');});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])shot.addEventListener(event,e=>{if(e.pointerId===fireId){fireId=null;this.fire=false;shot.classList.remove('held');}});
  for(const [id,action]of [['touch-jump','jump'],['touch-loot','loot'],['touch-heal','heal'],['touch-switch','switch']])document.getElementById(id).addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();onAction(action);});
  for(const id of ['touch-aim','touch-crouch'])document.getElementById(id).addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();const prop=id==='touch-aim'?'aim':'crouch';this[prop]=!this[prop];document.getElementById(id).classList.toggle('held',this[prop]);});
  document.getElementById('minimap').addEventListener('pointerdown',e=>{e.preventDefault();e.currentTarget.classList.toggle('expanded');});
  document.addEventListener('touchmove',e=>{if(document.body.classList.contains('playing')&&!e.target.closest('.modal,dialog'))e.preventDefault();},{passive:false});
 }
 reset(){this.mx=this.mz=0;this.fire=false;this.pointer=null;this.lookPointer=null;const k=document.getElementById('stick-knob');if(k)k.style.transform='';document.getElementById('touch-fire')?.classList.remove('held');}
 setVisible(visible){document.getElementById('touch-controls').hidden=!visible||!this.enabled;}
}
