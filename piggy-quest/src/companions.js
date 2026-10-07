/** Companion actions, friendly shots and bounded effects use simulation time only. */
(function(P){
 'use strict';
 const C=P.CONFIG,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const meta=JSON.parse(P.SOURCE_FILES['assets/companions-atlas.json']);
 if(P.Animation)Object.assign(P.Animation.meta,meta);
 const lv=(h,n)=>P.helperLevel(P.state,h.id,n);
 function visible(g,e){const d=g.enemyConfig(e);return e.hp>0&&e.x+d.w/2>=g.camera&&e.x-d.w/2<=g.camera+C.width;}
 function target(g,h){if(g.training?.()){h.targetId='';return undefined;}const current=g.enemies.find(e=>e.id===h.targetId&&visible(g,e));
   const e=current||g.enemies.filter(e=>visible(g,e)).sort((a,b)=>Math.abs(a.x-h.x)-Math.abs(b.x-h.x))[0];h.targetId=e?.id||'';return e;}
 function initRoom(g){g.allyShots=[];g.burns=[];g.allyEffects=[];g.barriers=[];
   for(const h of g.helpers){h.action=null;h.pose='idle';h.flight=0;h.flightCd=0;h.y=C.ground;h.vy=0;h.targetId='';h.timers={};}}
 function start(h,type,duration,e){h.castAngle=0;h.action={type,age:0,duration,targetId:e?.id};h.pose=type==='pillar'||type==='fireball'?'cast':type;h.age=0;h.vx=0;}
 function hand(h){const options={companionId:h.id,pose:h.pose,age:h.age,speed:h.vx,companionRun:h.running,walkDistance:h.walkDistance,running:h.running,weaponGrip:swordFrame(h.age).gripDir,castAngle:h.castAngle||0};
   const p=P.Motion.pose(options).frontHand;return {x:h.x+p[0]*.86*h.dir,y:h.y+p[1]*.86};}
 function swordFrame(age){const row=age<.64?0:1,index=row===0?(age<.12?0:age<.24?1:age<.32?2:age<.5?3:age<.6?4:5):(age<.76?0:age<.87?1:age<.98?2:age<1.1?3:age<1.24?4:5);
   const f=meta['sword-sprites'].rows[row].frames[index],v=f.gripDir,t=clamp((age-.84)/.18,0,1),rotation=row===1?-Math.PI*(1-t*t*(3-2*t)):0;return {...f,pivot:[f.pivot[0]+v[0]*34,f.pivot[1]+v[1]*34],gripDir:[v[0]*Math.cos(rotation)-v[1]*Math.sin(rotation),v[0]*Math.sin(rotation)+v[1]*Math.cos(rotation)],rotation,row,index};}
 function sound(name){P.Audio.play('companion-'+name);}
 function strike(g,h,a,damage,range,kb=0,all=false,key='hit'){
   if(a[key])return;a[key]=true;sound(a.type==='sword'?(key==='down'?'sword-down':'sword-side'):a.type);
   const enemies=g.enemies.filter(e=>visible(g,e)&&Math.abs(e.x-h.x)<=range+g.enemyConfig(e).w*.25&&Math.abs(e.y-h.y)<180&&(e.x-h.x)*h.dir>=-15);
   for(const e of all?enemies:enemies.slice(0,1))g.hitEnemy(e,damage,h.dir*kb);
 }
 function shootArrow(g,h,stats,e){if(!e||e.hp<=0)return;const p=hand(h),tx=e.x,ty=e.y-g.enemyConfig(e).h*.55,T=clamp(Math.abs(tx-p.x)/stats.arrowSpeed,.24,1.8);
   g.allyShots.push({type:'arrow',owner:h.id,x:p.x,y:p.y,vx:(tx-p.x)/T,vy:(ty-p.y-.5*stats.gravity*T*T)/T,gravity:stats.gravity,damage:stats.attack,life:T+.45,r:3,age:0});sound('bow-release');}
 function burst(g,shot){const level=shot.level,r=66+level*14;g.allyEffects.push({type:'burst',x:shot.x,y:C.ground,age:0,life:.6,r});
   for(const e of g.enemies)if(e.hp>0&&Math.abs(e.x-shot.x)<=r+g.enemyConfig(e).w*.2)g.hitEnemy(e,14+level*7,Math.sign(e.x-shot.x)*65);
   g.burns.push({x:shot.x,y:C.ground,age:0,life:1.6+level*.6,next:.5,r,damage:2+level*2});if(g.burns.length>6)g.burns.shift();sound('fire-explosion');}
 function healTarget(g,h){const targets=[{id:'player',actor:g.player,max:P.state.player.max},...g.helpers.filter(a=>P.state.helpers[a.id]?.hp>0).map(a=>({id:a.id,actor:P.state.helpers[a.id],max:P.helperStats(P.state,a.id).max,x:a.x,y:a.y}))];
   return targets.filter(t=>t.actor.hp>0&&t.actor.hp<t.max&&Math.abs((t.x??t.actor.x)-h.x)<470).sort((a,b)=>a.actor.hp/a.max-b.actor.hp/b.max)[0];}
 function tickActor(g,h,dt){const stored=P.state.helpers[h.id];if(!stored||stored.hp<=0){h.action=null;h.flight=0;h.vx=0;return;}
   const stats=P.helperStats(P.state,h.id),oldX=h.x;h.timers||={};for(const k of Object.keys(h.timers))h.timers[k]=Math.max(0,h.timers[k]-dt);h.cd=Math.max(0,h.cd-dt);h.inv=Math.max(0,h.inv-dt);h.flightCd=Math.max(0,(h.flightCd||0)-dt);
   const e=target(g,h);h.running=false;
   if(h.id==='flame'&&lv(h,'flight')&&e&&!h.flight&&!h.flightCd){h.flight=1.5+lv(h,'flight')*1.2;h.flightCd=10;h.flightAge=0;sound('flight');}
   if(h.flight>0){h.flight=Math.max(0,h.flight-dt);h.flightAge+=dt;h.y+=(C.ground-105-h.y)*Math.min(1,dt*5);}else if(h.pose!=='dodge')h.y=Math.min(C.ground,h.y+220*dt);
   const threat=e&&(e.windup>0||e.charging>0)&&Math.abs(e.x-h.x)<240||g.enemyShots.some(s=>s.life>0&&(s.x-h.x)*s.vx<0&&Math.abs(s.x-h.x)<140&&Math.abs(s.y-(h.y-100))<95);
   if(h.id==='brawler'&&lv(h,'dodge')&&!h.timers.dodge&&threat&&h.pose!=='dodge'){start(h,'dodge',.52,e);h.vy=-330;h.inv=.55;h.timers.dodge=4.4-lv(h,'dodge')*.5;sound('dodge');}
   if(h.action){if(e&&(h.id==='flame'||h.id==='archer')&&Math.abs(e.x-h.x)<stats.range*.28){h.vx=-h.dir*stats.speed*.5;h.x+=h.vx*dt;}const a=h.action;a.age+=dt*(a.speed||1);h.age=a.age;const victim=g.enemies.find(e=>e.id===a.targetId&&e.hp>0);
     if(a.type==='dodge'){h.x-=h.dir*270*dt;h.y+=h.vy*dt;h.vy+=C.gravity*dt;h.y=Math.min(C.ground,h.y);}
     if(a.type==='dash'){const stop=victim?victim.x-h.dir*45:h.x+h.dir*10;h.x+=h.dir*Math.min(570*dt,Math.max(0,(stop-h.x)*h.dir));if(a.age>=.07&&victim&&Math.abs(victim.x-h.x)<=105+g.enemyConfig(victim).w*.25)strike(g,h,a,9+lv(h,'dash')*3,105,120);}
     if(a.type==='punch'){if(a.age>=.09)strike(g,h,a,stats.attack,stats.range,22,false,'first');if(a.age>=.29)strike(g,h,a,stats.attack,stats.range,22,false,'second');}
     if(a.type==='kick'&&a.age>=.045)strike(g,h,a,12+lv(h,'kick')*5,135,190);
     if(a.type==='push'&&a.age>=.13)strike(g,h,a,3+lv(h,'push'),100,300+lv(h,'push')*65);
     if(a.type==='bow'){if(a.age>=.43&&!a.draw){a.draw=true;sound('bow-draw');}if(a.age>=.94&&!a.fired){a.fired=true;shootArrow(g,h,stats,victim);}if(a.age>=.06&&!a.reload){a.reload=true;sound('bow-reload');}}
     if(a.type==='sword'){
       if(a.age>=.32)strike(g,h,a,stats.attack+5,145,lv(h,'sword')>=2?450+lv(h,'sword')*75:35,true,'down');
       if(lv(h,'sword')>=2&&a.age>=.62&&a.age<.94&&victim){const distance=(victim.x-h.x)*h.dir-65,step=Math.min(Math.max(0,distance),550*dt,Math.max(0,160-(a.chased||0)));h.x+=step*h.dir;a.chased=(a.chased||0)+step;}
       if(a.age>=.94)strike(g,h,a,stats.attack+2,155,60,true,'side');
     }
     if(a.type==='pillar'&&a.age>=.22&&a.age<1.35){
       const before=hand(h),aim=victim?clamp(Math.atan2(victim.y-g.enemyConfig(victim).h*.55-before.y,Math.abs(victim.x-before.x)),-.4,.8):0;h.castAngle+=(aim-h.castAngle)*Math.min(1,dt*12);const p=hand(h),length=Math.min(stats.range,(a.age-.22)*1200),pulse=Math.floor((a.age-.22)/.25);
       if(!a.jet){a.jet={type:'pillar',x:p.x,y:p.y,dir:h.dir,r:length,angle:h.castAngle,age:0,life:.12};g.allyEffects.push(a.jet);sound('pillar');}
       Object.assign(a.jet,{x:p.x,y:p.y,dir:h.dir,r:length,angle:h.castAngle,life:.12});
       if(a.pulse!==pulse){a.pulse=pulse;for(const foe of g.enemies){const d=g.enemyConfig(foe),tip={x:p.x+Math.cos(h.castAngle)*h.dir*length,y:p.y+Math.sin(h.castAngle)*length,r:22};if(foe.hp>0&&segmentHit(p,tip,foe,d))g.hitEnemy(foe,stats.attack*.28,h.dir*9);}if(pulse%2===0)sound('pillar');}
     }
     if(a.type==='fireball'&&a.age>=.22&&!a.fired){a.fired=true;const p=hand(h);g.allyShots.push({type:'fireball',owner:h.id,targetId:a.targetId,x:p.x,y:p.y,vx:h.dir*330,vy:0,speed:330,life:2.3,age:0,level:lv(h,'fireball'),r:15});sound('fireball');}
     if(a.type==='heal'&&a.age>=.3&&!a.done){a.done=true;const t=healTarget(g,h);if(t){const amount=8+lv(h,'heal')*5;t.actor.hp=Math.min(t.max,t.actor.hp+amount);g.allyEffects.push({type:'heal',x:t.x??t.actor.x,y:t.y??t.actor.y,age:0,life:.6});sound('heal');}}
     if(a.type==='barrier'&&a.age>=.18&&!a.done){a.done=true;g.barriers=g.barriers.filter(b=>b.owner!==h.id);g.barriers.push({owner:h.id,x:(g.anchor?.()||g.player).x+(g.anchor?.()||g.player).dir*70,y:(g.anchor?.()||g.player).y-95,dir:(g.anchor?.()||g.player).dir,life:1.2+lv(h,'barrier')*.5,charges:1+lv(h,'barrier')});sound('barrier');}
     if(a.age>=a.duration){h.action=null;h.pose='idle';h.age=0;}
   }else{
     h.pose='idle';h.age=0;const dx=e?e.x-h.x:(g.followAnchor?.(h)??g.player.x-65-g.helpers.indexOf(h)*42)-h.x;
     if(e)h.dir=dx>=0?1:-1;
     const desired=e?(h.id==='support'?250:stats.range*.75):20;
     const ranged=h.id==='archer'||h.id==='flame';
     if(e&&ranged&&Math.abs(dx)<stats.range*.48){h.vx=-Math.sign(dx)*stats.speed*.85;h.x+=h.vx*dt;}else
     if(Math.abs(dx)>desired){h.running=h.id==='brawler'&&!!lv(h,'run')&&!!e;h.vx=Math.sign(dx)*(h.running?(300+lv(h,'run')*25)*(1+.1*lv(h,'speed')):stats.speed);h.x+=h.vx*dt;if(!e)h.dir=Math.sign(dx);}else h.vx=0;
     if(h.id==='support'){
       const incoming=g.enemyShots.some(s=>s.life>0&&Math.abs(s.x-(g.anchor?.()||g.player).x)<420&&s.vx*(s.x-(g.anchor?.()||g.player).x)<0);
       if(lv(h,'barrier')&&incoming&&!h.timers.barrier){start(h,'barrier',.5);h.timers.barrier=6;}
       else if(healTarget(g,h)&&h.cd<=0){start(h,'heal',.65);h.cd=3.5-Math.min(1.3,lv(h,'heal')*.2);}
     }else if(e){const distance=Math.abs(e.x-h.x);
       if(h.id==='brawler'&&lv(h,'dash')&&distance>125&&distance<280&&!h.timers.dash){start(h,'dash',.32,e);h.timers.dash=4.5;sound('dash');}
       else if((h.id==='flame'?Math.hypot(distance,e.y-g.enemyConfig(e).h*.55-(h.y-120)):distance)<=stats.range+6&&h.cd<=0){
         if(h.id==='brawler'){
           h.turn=(h.turn||0)+1;const ability=lv(h,'push')&&h.turn%3===0?'push':lv(h,'kick')&&h.turn%2===0?'kick':'punch';start(h,ability,ability==='punch'?.46:ability==='kick'?.25:.36,e);h.cd=stats.cooldown;
         }else if(h.id==='archer'){start(h,'bow',1.4,e);h.action.speed=Math.max(1,1.4/(stats.cooldown*.85));h.cd=stats.cooldown;}
         else if(h.id==='sword'){start(h,'sword',1.38,e);h.cd=stats.cooldown;}
         else if(h.id==='flame'){const ball=lv(h,'fireball')&&!h.timers.fireball;start(h,ball?'fireball':'pillar',ball?.8:1.55,e);if(ball)h.timers.fireball=4;h.cd=stats.cooldown;}
       }
     }
   }
   h.x=clamp(h.x,30,g.room.width-30);const moved=Math.abs(h.x-oldX);h.walkDistance+=moved;h.walkBlend+=(clamp(moved/dt/C.walkSpeed,0,1)-h.walkBlend)*Math.min(1,dt*12);
   h.stepDistance=(h.stepDistance||0)+moved;if(h.stepDistance>75&&h.y>=C.ground-1&&h.x>=g.camera&&h.x<=g.camera+C.width){h.stepDistance=0;sound(h.running?'run-step':'step');}
 }
 function segmentHit(before,s,e,def){const dx=s.x-before.x,dy=s.y-before.y,t=clamp(((e.x-before.x)*dx+(e.y-def.h*.5-before.y)*dy)/(dx*dx+dy*dy||1),0,1);
   const x=before.x+dx*t,y=before.y+dy*t;return Math.abs(x-e.x)<def.w*.5+s.r&&y>e.y-def.h-s.r&&y<e.y+s.r;}
 function tick(g,dt){for(const h of g.helpers)tickActor(g,h,dt);
   for(const s of g.allyShots){const before={x:s.x,y:s.y};s.age+=dt;s.life-=dt;
     if(s.type==='fireball'){const e=g.enemies.find(e=>e.id===s.targetId&&e.hp>0);if(e){const angle=Math.atan2(e.y-g.enemyConfig(e).h*.5-s.y,e.x-s.x),old=Math.atan2(s.vy,s.vx),diff=Math.atan2(Math.sin(angle-old),Math.cos(angle-old)),next=old+clamp(diff,-dt*3.4,dt*3.4);s.vx=Math.cos(next)*s.speed;s.vy=Math.sin(next)*s.speed;}}
     s.x+=s.vx*dt;s.y+=s.vy*dt+.5*(s.gravity||0)*dt*dt;s.vy+=(s.gravity||0)*dt;
     const e=g.enemies.find(e=>e.hp>0&&segmentHit(before,s,e,g.enemyConfig(e)));
     if(e){s.life=0;if(s.type==='fireball')burst(g,s);else if(e.type==='rock'&&e.guardTime>0){g.enemyShots.push({type:'reflected',x:e.x-Math.sign(s.vx)*48,y:s.y,vx:-s.vx,vy:-s.vy,gravity:s.gravity,r:3,damage:s.damage*.5,life:1.4});P.Audio.play('monster-reflect');}else {g.hitEnemy(e,s.damage,Math.sign(s.vx)*30);sound('arrow-hit');}}
     else if(s.type==='fireball'&&(s.life<=0||s.y>C.ground)){s.life=0;burst(g,s);}
   }
   g.allyShots=g.allyShots.filter(s=>s.life>0&&s.x>0&&s.x<g.room.width&&s.y<C.ground+12);
   for(const f of g.burns){f.age+=dt;f.life-=dt;f.next-=dt;if(f.next<=0){f.next+=.5;for(const e of g.enemies)if(e.hp>0&&Math.abs(e.x-f.x)<f.r+g.enemyConfig(e).w*.2&&e.y>C.ground-120)g.hitEnemy(e,f.damage,0);}}
   g.burns=g.burns.filter(f=>f.life>0);for(const f of g.allyEffects){f.age+=dt;f.life-=dt;}g.allyEffects=g.allyEffects.filter(f=>f.life>0);
   for(const b of g.barriers)b.life-=dt;g.barriers=g.barriers.filter(b=>b.life>0&&b.charges>0);
 }
 function intercept(g,before,s){for(const b of g.barriers||[]){if(b.life<=0||b.charges<=0||s.vx*b.dir>=0)continue;
   const min=Math.min(before.x,s.x),max=Math.max(before.x,s.x);if(max<b.x-16||min>b.x+16)continue;
   const t=s.x===before.x?0:clamp((b.x-before.x)/(s.x-before.x),0,1),y=before.y+(s.y-before.y)*t;
   if(Math.abs(y-b.y)<=93+s.r){b.charges--;s.life=0;sound('barrier-hit');return true;}}
   return false;
 }
 function sample(c,name,row,index,x,y,scale){const f=meta[name].rows[row].frames[index],im=P.Art.images[name];if(!im?.naturalWidth)return;
   c.drawImage(im,...f.rect,x-f.pivot[0]*scale,y-f.pivot[1]*scale,f.rect[2]*scale,f.rect[3]*scale);
 }
 function weapon(c,o,rig){const {frontHand:hand}=rig,A=P.Art;
   if(o.companionId==='sword'){const f=swordFrame(o.pose==='sword'?o.age:0);const im=A.images['sword-sprites'],sc=125/f.unit;if(im?.naturalWidth){c.save();c.translate(...hand);c.rotate(f.rotation);c.drawImage(im,...f.rect,-f.pivot[0]*sc,-f.pivot[1]*sc,f.rect[2]*sc,f.rect[3]*sc);c.restore();}}
   if(o.companionId==='archer'){
     const age=o.age||0,bow=A.images.bow,arrow=A.images.arrow;
     c.save();c.translate(...hand);
     if(bow?.naturalWidth)c.drawImage(bow,-700*.06,-768*.06,bow.naturalWidth*.06,bow.naturalHeight*.06);
     const nocked=o.pose==='bow'&&age>=.28&&age<.94;
     const nock=nocked?[rig.rearHand[0]-hand[0],rig.rearHand[1]-hand[1]]:[-22,0];
     A.line(c,[[-22,-44],nock,[-22,44]],'#e8ddbd',1.2);
     if(nocked&&arrow?.naturalWidth)c.drawImage(arrow,nock[0]-1,nock[1]-13.4,82,27.3);
     c.restore();
     if(o.pose==='bow'&&age<.28&&arrow?.naturalWidth){c.save();c.translate(...rig.rearHand);c.rotate(-1.2+age*2.5);c.drawImage(arrow,0,-10,62,20.7);c.restore();}
   }
   if(o.companionId==='flame'&&o.flight){for(const foot of [rig.rearFoot,rig.frontFoot]){c.save();c.translate(...foot);c.rotate(Math.PI/2);sample(c,'fireball',0,Math.floor(o.time*12)%6,0,0,.095);c.restore();}}
 }
 function backWeapon(c,o,rig){const im=P.Art.images.quiver;if(!im?.naturalWidth)return;const sc=.045;c.drawImage(im,rig.rearShoulder[0]-28,rig.rearShoulder[1]-25,im.naturalWidth*sc,im.naturalHeight*sc);}
 function drawActor(c,g,h){const d=P.helperStats(P.state,h.id),stored=P.state.helpers[h.id];if(stored.hp<=0)return;
   P.Art.ellipse(c,h.x,C.ground+3,22,5,'rgba(45,80,60,.12)');const f=swordFrame(h.age);
   P.Art.stick(c,h.x,h.y,{time:g.time,speed:h.vx,walkDistance:h.walkDistance,walkBlend:h.walkBlend,dir:h.dir,pose:h.pose,age:h.age,color:d.color,band:'#d4ddbc',scale:.86,companionId:h.id,companionRun:h.running,running:h.running,weaponGrip:f.gripDir,castAngle:h.castAngle||0,flight:h.flight,hit:h.inv>.1,air:h.pose==='dodge'});
   P.Art.bar(c,h.x,h.y-169,stored.hp,d.max,55,stored.hp/d.max<.3?'#c85555':'#7ca598');
 }
 function draw(c,g){const A=P.Art;
   for(const b of g.barriers){c.save();c.globalAlpha=Math.min(.8,b.life*2);A.line(c,[[b.x,b.y-91],[b.x+b.dir*13,b.y],[b.x,b.y+91]],'#8ebdbb',10);A.ellipse(c,b.x,b.y,17,88,'#daeee552');c.restore();}
   for(const s of g.allyShots){if(s.type==='fireball'){c.save();c.translate(s.x,s.y);c.rotate(Math.atan2(s.vy,s.vx));sample(c,'fireball',0,Math.floor(s.age*12)%6,0,0,.16);c.restore();}else{c.save();c.translate(s.x,s.y);c.rotate(Math.atan2(s.vy,s.vx));const im=A.images.arrow;if(im?.naturalWidth)c.drawImage(im,-35,-12,72,24);c.restore();}}
   for(const f of g.burns)sample(c,'fireburst-burning',1,Math.floor(f.age*10)%6,f.x,C.ground+3,.42);
   for(const f of g.allyEffects){if(f.type==='burst')sample(c,'fireburst-burning',0,Math.min(5,Math.floor(f.age/.6*6)),f.x,f.y+3,.48);
     else if(f.type==='pillar'){const im=A.images['fire-jet'];if(im?.naturalWidth&&f.r>0){const cell=im.naturalHeight/4,index=Math.floor(f.age*16)%4;c.save();c.translate(f.x,f.y);c.scale(f.dir,1);c.rotate(f.angle||0);c.drawImage(im,0,index*cell,im.naturalWidth,cell,0,-24,f.r,48);c.restore();}}
     else {c.save();c.globalAlpha=f.life;A.ellipse(c,f.x,f.y-82,30+f.age*45,45,'#95c1a3');c.restore();}}
 }
 P.Companions={meta,visible,target,initRoom,tick,tickActor,intercept,sample,weapon,backWeapon,drawActor,draw,swordFrame,segmentHit};
})(globalThis.PIGGY=globalThis.PIGGY||{});
