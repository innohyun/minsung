/** Browser entry and input boundary. */
(async function(P){
  'use strict';
  const loaded=P.State.load();P.state=loaded.state;
  // Preserve unreadable stored bytes; never silently replace the only copy.
  if(loaded.warning){try{const old=localStorage.getItem(P.CONFIG.saveKey);if(old)localStorage.setItem(P.CONFIG.saveKey+'-recovery',old);}catch{}}
  if(!localStorageAvailable())P.state.settings.reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  P.game=new P.Game(document.getElementById('game'));P.UI.init();
  await P.Art.init();document.getElementById('loading').hidden=true;
  if(P.state.active)P.UI.restoreActive();
  else P.UI.home();
  if(loaded.warning)P.UI.toast(loaded.warning);
  // Safari gesture/callout suppression supplements touch-action and the fixed viewport.
  for(const event of ['pointerdown','touchstart','keydown'])document.addEventListener(event,()=>P.Audio.unlock(),{passive:true});
  for(const event of ['gesturestart','gesturechange','gestureend','dblclick','contextmenu','selectstart'])document.addEventListener(event,e=>{
    if(e.target.tagName!=='TEXTAREA')e.preventDefault();
  },{passive:false});
  window.addEventListener('keydown',e=>{
    if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
    const key=e.key.toLowerCase(),g=P.game;
    if(key==='escape'){e.preventDefault();if(document.getElementById('modal').open)P.UI.close();else if(g.mode==='play')P.UI.pause();else if(g.mode==='pause')P.UI.pause();return;}
    if(g.mode!=='play')return;
    const valid=['a','d','arrowleft','arrowright','j','k','e','q','m','b','shift',' ','w','arrowup','1','2','3'];if(!valid.includes(key))return;
    e.preventDefault();P.Audio.unlock();P.Controls.input('keyboard-'+key,key,true);if(e.repeat)return;
    if(key===' '||key==='w'||key==='arrowup')g.jump();if(key==='j')g.punch();if(key==='k')g.kick();if(key==='e')g.interact();if(key==='q')g.command();if(key==='b')g.toggleShield();if(key==='m')P.UI.worldMap();if(['1','2','3'].includes(key))g.skill(Number(key)-1);
  });
  window.addEventListener('keyup',e=>P.Controls.input('keyboard-'+e.key.toLowerCase(),e.key.toLowerCase(),false));
  function suspend(){P.game.clearInput();if(P.game.mode==='play')P.UI.pause();}
  window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
  window.addEventListener('pagehide',()=>{if(P.state.active)P.game.snapshot();});
  document.getElementById('game').addEventListener('pointerdown',e=>{
    P.Audio.unlock();const g=P.game;if(g.mode!=='play')return;const r=g.canvas.getBoundingClientRect(),scale=Math.min(r.width/1280,r.height/720),left=r.left+(r.width-1280*scale)/2,top=r.top+(r.height-720*scale)/2;
    const x=(e.clientX-left)/scale+g.camera,y=(e.clientY-top)/scale+g.cameraY-P.World.height(g.room,x);if(Math.abs(x-g.pig.x)<52&&y>g.pig.y-92&&y<g.pig.y+10)g.command();
  });
  const originalTick=P.game.tick.bind(P.game);P.game.tick=dt=>{if(P.game.mode==='play'){if(P.game.keys.has('j')&&!P.Exploration.hasHands(P.game))P.game.punch();if(P.game.keys.has('k'))P.game.kick();}originalTick(dt);};
  if(location.hash==='#source')P.UI.sources();
  requestAnimationFrame(t=>P.game.frame(t));
  function localStorageAvailable(){try{localStorage.getItem(P.CONFIG.saveKey);return true;}catch{return false;}}
})(globalThis.PIGGY = globalThis.PIGGY || {});
