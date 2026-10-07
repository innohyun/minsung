/** Isolated drag-and-drop battle sandbox using production AI, hitboxes and art. */
(function(P){
 'use strict';
 const C=P.CONFIG,A=P.Art,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 let root=null,battle=null,labState=null,active=false,paused=false,last=0,acc=0,serial=0,drag=null,ghost=null,returnMode='home';
 function scoped(fn){const saved=P.state;P.state=labState;try{return fn();}finally{P.state=saved;}}
 class Battle extends P.Game{
  constructor(canvas){super(canvas);this.mode='play';this.helpers=[];this.enemies=[];this.player={x:-10000,y:C.ground,hp:0,dir:1,vx:0,vy:0,pose:'idle',age:0,punch:0,kick:0,dig:0,skills:{},inv:0,walkDistance:0};this.pig={x:-10000,y:C.ground,hp:0,carrying:false};this.projectiles=[];this.enemyShots=[];this.fieldEffects=[];this.hazards=[];this.allyShots=[];this.burns=[];this.allyEffects=[];this.barriers=[];this.setMap('wind:main');}
  resize(){const d=Math.min(window.devicePixelRatio||1,2);this.viewHeight=Math.min(720,Math.max(270,(window.innerHeight-170)*1280/window.innerWidth));this.viewTop=720-this.viewHeight;this.canvas.width=1280*d;this.canvas.height=this.viewHeight*d;this.ctx.setTransform(d,0,0,d,0,0);}
  setMap(value){const [id,room]=value.split(':');this.map=P.mapById(id);this.room=this.map.rooms[room];this.roomId=room;this.camera=0;this.cameraY=0;this.enemies=[];this.helpers=[];this.player.hp=0;labState.helpers={};labState.party=[];this.resetEffects();}
  resetEffects(){P.Companions.initRoom(this);this.enemyShots=[];this.fieldEffects=[];this.floaters=[];this.particles=[];}
  snapshot(){} // The lab never writes player saves or awards progress/currency.
  toast(text){status(text);}
  kill(e){P.Audio.play('monster-death');status(P.ENEMIES[e.type].name+' 처치 · 저장/보상 없음');}
  anchor(){return this.player.hp>0?this.player:this.helpers.find(h=>labState.helpers[h.id]?.hp>0)||{x:this.camera+400,y:C.ground,dir:1};}
  followAnchor(h){return h.homeX;}
  targets(){return [...(this.player.hp>0?[{kind:'player',x:this.player.x,y:this.player.y,actor:this.player}]:[]),...this.helpers.filter(h=>labState.helpers[h.id]?.hp>0).map(h=>({kind:'helper',x:h.x,y:h.y,actor:h}))];}
  targetFor(e){return this.targets().sort((a,b)=>Math.abs(a.x-e.x)-Math.abs(b.x-e.x))[0];}
  spawn(type,x){const [kind,id]=type.split(':');x=clamp(x,40,this.room.width-40);
   if(kind==='helper'){
    let h=this.helpers.find(h=>h.id===id);if(h){h.x=h.homeX=x;h.action=null;labState.helpers[id].hp=P.helperStats(labState,id).max;return;}
    labState.helpers[id]=P.newHelper(id);const level=Number(root.querySelector('#lab-level').value);if(level>1)for(const node of P.HELPER_NODES[id])labState.helpers[id].levels[node.id]=Math.min(node.max,level);
    labState.helpers[id].hp=P.helperStats(labState,id).max;labState.party.push(id);h={id,x,homeX:x,y:C.ground,dir:1,pose:'idle',age:0,cd:0,inv:0,walkDistance:0,walkBlend:0,timers:{}};this.helpers.push(h);
   }else if(kind==='enemy'){this.enemies.push(this.makeEnemy({id:'lab-'+(++serial),type:id,x}));}
   else{Object.assign(this.player,{x,y:C.ground,hp:100,pose:'idle',age:0,inv:0,punch:0,kick:0,firstPending:false,secondPending:false,kickPending:false,knock:null});}
   status('배치 완료 · 화면/캐릭터를 드래그해 옮길 수 있어요.');
  }
  tick(dt){this.time+=dt;const p=this.player;
   if(p.hp>0){this.tickAttacks(dt);if(p.knock){p.knock.age+=dt;p.vx*=Math.max(0,1-dt*(p.knock.stage==='air'?.7:12));p.x=clamp(p.x+p.vx*dt,40,this.room.width-40);p.vy+=C.gravity*dt;p.y+=p.vy*dt;P.Exploration.physics(this);this.knockTick();}else{const foe=this.nearEnemy(1200,p.x);p.vx=0;if(foe){p.dir=foe.x>p.x?1:-1;if(Math.abs(foe.x-p.x)>90){p.vx=p.dir*180;p.x+=p.vx*dt;p.walkDistance+=Math.abs(p.vx*dt);}else this.punch();}}}
   P.State.reviveTick(labState,dt,id=>{const h=this.helpers.find(h=>h.id===id);h.x=h.homeX;h.y=C.ground;h.inv=1;});
   P.Companions.tick(this,dt);
   for(const e of this.enemies){if(e.hp<=0)continue;e.active=true;e.hit=Math.max(0,e.hit-dt);e.stun=Math.max(0,e.stun-dt);e.cd=Math.max(0,e.cd-dt);e.x=clamp(e.x+(e.kb||0)*dt,25,this.room.width-25);e.kb*=Math.max(0,1-dt*8);if(!e.stun){if(e.type.startsWith('cave-'))P.Combat.caveTick(this,e,dt);else P.Combat.surfaceTick(this,e,dt);}const before=e.walkDistance||0;P.Animation.advance(e,dt);e.stepDistance=(e.stepDistance||0)+e.walkDistance-before;if(e.stepDistance>65&&e.type!=='bat'){e.stepDistance=0;P.Audio.play('monster-step');}}
   P.Combat.fieldsTick(this,dt);P.Combat.shotsTick(this,dt);for(const f of this.floaters){f.life-=dt;f.y-=dt*25;}this.floaters=this.floaters.filter(f=>f.life>0);
  }
  draw(){const c=this.ctx;c.save();c.translate(0,-this.viewTop);P.Pixel.background(c,this.camera,0,this.map.theme,this.room.biome);c.save();c.translate(-this.camera,0);
   for(const e of this.enemies){if(e.hp<=0)continue;const def=this.enemyConfig(e);P.Animation.draw(c,e,def);A.bar(c,e.x,C.ground-def.h-15,e.hp,e.max,60,'#b88078');if(e.windup>0)A.label(c,e.warning||'!',e.x,C.ground-def.h-34,12);}
   for(const h of this.helpers)P.Companions.drawActor(c,this,h);if(this.player.hp>0){A.stick(c,this.player.x,this.player.y,{knock:this.player.knock,air:!this.player.grounded,pose:this.player.pose,age:this.player.age,aimY:this.player.aimY,dir:this.player.dir,speed:this.player.vx,walkDistance:this.player.walkDistance});A.bar(c,this.player.x,C.ground-205,this.player.hp,100,66);}
   for(const s of this.enemyShots){c.save();c.translate(s.x,s.y);c.rotate(Math.atan2(s.vy,s.vx));if(s.type==='arrow'){const im=A.images.arrow;if(im?.naturalWidth)c.drawImage(im,-25,-8,50,17);}else if(s.type==='venom')P.Companions.sample(c,'bat-projectile',2,Math.floor((s.age||0)*12)%4,0,0,.13);else A.ellipse(c,0,0,6,6,'#90a85d');c.restore();}
   for(const f of this.fieldEffects)A.ellipse(c,f.x,C.ground-6,f.r,10,'#b9a77670');P.Companions.draw(c,this);
   for(const f of this.floaters)A.label(c,f.text,f.x,f.y,14,f.color);c.restore();if(paused){c.fillStyle='#20322b55';c.fillRect(0,0,1280,720);A.label(c,'일시정지 · 배치하고 재생하세요',640,this.viewTop+this.viewHeight*.35,25,'#fff9df');}c.restore();}
 }
 function status(text){if(root)root.querySelector('#lab-status').textContent=text;}
 function coords(e){const r=battle.canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*1280,y:battle.viewTop+(e.clientY-r.top)/r.height*battle.viewHeight,inside:e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom};}
 function animate(now){if(!active)return;const dt=last?Math.min(.1,(now-last)/1000):0;last=now;scoped(()=>{if(!paused&&!drag&&!document.hidden){acc+=dt;while(acc>=C.fixedStep){battle.tick(C.fixedStep);acc-=C.fixedStep;}}else acc=0;battle.draw();});requestAnimationFrame(animate);}
 function open(){if(active)return;P.game.clearInput();returnMode=P.game.mode;if(P.state.active){P.game.snapshot();P.game.mode='pause';}P.UI.close();P.game.mode=P.state.active?'pause':'home';
   labState=P.State.fresh();labState.tutorial.complete=true;labState.helpers={};labState.party=[];labState.active=true;root=document.createElement('section');root.id='battle-lab';root.setAttribute('aria-label','개발자 전투 실험실');root.innerHTML=`<header class="lab-header"><strong>개발자 모드 · 전투 실험실</strong><select id="lab-map" aria-label="시험 맵"><option value="wind:main">바람숲</option><option value="wind:cave">비밀 동굴</option><option value="amber:main">노을 폐허</option><option value="brook:main">물안개 길</option></select><select id="lab-level" aria-label="새 조수 강화 단계"><option value="1">기본 능력</option><option value="3">모든 능력 Lv3</option><option value="5">최대 강화</option></select><button id="lab-pause">일시정지</button><button id="lab-revive">전원 부활</button><button id="lab-reset">비우기</button><button id="lab-close">닫기</button></header><div class="lab-scene"><canvas id="lab-canvas" width="1280" height="720" aria-label="드래그로 화면 이동·캐릭터 배치"></canvas></div><div id="lab-status" role="status">플레이어 없이 시작합니다. 아래에서 조수와 몬스터를 화면에 끌어다 놓으세요.</div><div class="lab-palette">${P.HELPERS.map(h=>`<button class="lab-card" data-spawn="helper:${h.id}">${h.name}<small>조수</small></button>`).join('')}<button class="lab-card" data-spawn="dummy:player">일반 졸라맨<small>자동 펀치 표적</small></button>${Object.entries(P.ENEMIES).filter(([id])=>id!=='boss').map(([id,e])=>`<button class="lab-card monster-card" data-spawn="enemy:${id}">${e.name}<small>몬스터</small></button>`).join('')}</div>`;
   document.body.append(root);battle=scoped(()=>new Battle(root.querySelector('canvas')));active=true;paused=false;last=acc=0;
   root.querySelector('#lab-close').onclick=close;root.querySelector('#lab-pause').onclick=()=>pause(!paused);root.querySelector('#lab-map').onchange=e=>scoped(()=>battle.setMap(e.target.value));root.querySelector('#lab-reset').onclick=()=>scoped(()=>battle.setMap(root.querySelector('#lab-map').value));
   root.querySelector('#lab-revive').onclick=()=>scoped(()=>{for(const h of battle.helpers){labState.helpers[h.id].hp=P.helperStats(labState,h.id).max;labState.helpers[h.id].revive=0;h.x=h.homeX;h.cd=0;}for(const e of battle.enemies){const fresh=battle.makeEnemy({id:e.id,type:e.type,x:e.animationX});Object.assign(e,fresh);}if(battle.player.x>=0)battle.player.hp=100;battle.resetEffects();});
   root.querySelectorAll('[data-spawn]').forEach(b=>{b.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();P.Audio.unlock();ghost=document.createElement('div');ghost.className='lab-ghost';ghost.textContent=b.firstChild.textContent;document.body.append(ghost);drag={kind:'palette',type:b.dataset.spawn,id:e.pointerId,startX:e.clientX,startY:e.clientY,scroll:root.querySelector('.lab-palette').scrollLeft};move(e);};b.onclick=e=>{if(e.detail===0)scoped(()=>battle.spawn(b.dataset.spawn,battle.camera+(b.dataset.spawn.startsWith('enemy')?850:330)));};});
   battle.canvas.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();const p=coords(e),actors=[...battle.helpers,...battle.enemies.filter(e=>e.hp>0),...(battle.player.hp>0?[battle.player]:[])],actor=actors.find(a=>Math.abs(a.x-battle.camera-p.x)<40&&p.y>C.ground-190&&p.y<C.ground+20);drag={kind:actor?'actor':'pan',actor,id:e.pointerId,start:e.clientX,camera:battle.camera};battle.canvas.setPointerCapture(e.pointerId);};
   document.addEventListener('pointermove',move,{passive:false});document.addEventListener('pointerup',drop);document.addEventListener('pointercancel',cancel);requestAnimationFrame(animate);
 }
 function move(e){if(!drag||e.pointerId!==drag.id)return;e.preventDefault();if(drag.kind==='palette'&&Math.abs(e.clientX-drag.startX)>50&&Math.abs(e.clientY-drag.startY)<25){drag.kind='palette-scroll';ghost?.remove();ghost=null;}if(drag.kind==='palette-scroll')root.querySelector('.lab-palette').scrollLeft=drag.scroll-(e.clientX-drag.startX);if(ghost){ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';}const p=coords(e);if(drag.kind==='pan')battle.camera=clamp(drag.camera-(e.clientX-drag.start)*1280/battle.canvas.getBoundingClientRect().width,0,battle.room.width-1280);if(drag.kind==='actor'){drag.actor.x=clamp(battle.camera+p.x,40,battle.room.width-40);drag.actor.homeX=drag.actor.x;}}
 function drop(e){if(!drag||e.pointerId!==drag.id)return;const p=coords(e);if(drag.kind==='palette'&&p.inside)scoped(()=>battle.spawn(drag.type,battle.camera+p.x));cancel();}
 function cancel(){drag=null;ghost?.remove();ghost=null;}
 function pause(value=true){paused=value;acc=0;if(root)root.querySelector('#lab-pause').textContent=paused?'재생':'일시정지';}
 function close(){active=false;cancel();document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',drop);document.removeEventListener('pointercancel',cancel);window.removeEventListener('resize',battle.onResize);root?.remove();root=null;if(P.state.active){P.game.mode='pause';P.UI.pause();}else P.UI.home();}
 P.Lab={open,close,pause,get active(){return active;},get battle(){return battle;},get state(){return labState;},scoped};
})(globalThis.PIGGY=globalThis.PIGGY||{});
