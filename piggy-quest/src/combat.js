/** Deterministic, simulation-time boss telegraphs and swept wooden-shield collisions. */
(function(P){
  'use strict';
  const C=P.CONFIG,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  function shieldActive(g){const p=g.player;return p.hp>0&&!!P.state.skills.woodshield&&p.shieldRaised&&!g.pig.carrying&&!p.carryingObject&&p.pose==='idle'&&!p.knock;}
  function blocking(g){return shieldActive(g)&&Math.abs(g.player.vx)<18;}
  function shieldBox(g){const p=g.player;return {x:p.x+p.dir*42,y:p.y-(blocking(g)?83:112),rx:26,ry:68};}
  function intercept(g,before,shot){
    if(!shieldActive(g)||shot.vx*g.player.dir>=0)return false;
    const box=shieldBox(g),min=Math.min(before.x,shot.x),max=Math.max(before.x,shot.x);
    if(max<box.x-box.rx||min>box.x+box.rx)return false;
    const t=shot.x===before.x?0:clamp((box.x-before.x)/(shot.x-before.x),0,1),y=before.y+(shot.y-before.y)*t;
    return Math.abs(y-box.y)<box.ry+shot.r;
  }
  function woodHit(g){P.Audio.play('wood');g.shieldHits=(g.shieldHits||0)+1;g.particles.push({type:'ring',x:shieldBox(g).x,y:shieldBox(g).y,r:9,life:.14,max:.14});}
  function caveTick(g,e,dt){
    const def=g.enemyConfig(e);
    if(e.charging>0){
      e.charging=Math.max(0,e.charging-dt);e.x=clamp(e.x+e.chargeDir*470*dt,40,g.room.width-60);
      const victims=g.targets?g.targets():[{kind:'player',x:g.player.x,y:g.player.y,actor:g.player},{kind:'pig',x:g.pig.x,y:g.pig.y,actor:g.pig},...g.helpers.filter(h=>P.state.helpers[h.id].hp>0).map(h=>({kind:'helper',x:h.x,y:h.y,actor:h}))];
      for(const v of victims){const id=v.kind+(v.actor.id||'');if(!e.chargeHits.has(id)&&Math.abs(v.x-e.x)<65&&v.y>C.ground-def.h+4){e.chargeHits.add(id);g.hurt(v,def.attack*g.map.scale,e.x,true);}}
      if(e.charging===0)e.cd=def.cooldown;return;
    }
    if(e.animAttack&&e.windup<=0)return;
    const target=g.targetFor(e);
    if(e.windup>0){
      e.windup=e.windup-dt<=1e-9?0:e.windup-dt;if(e.windup>0)return;
      if(e.type==='cave-archer'){
        const x=e.x+e.attackDir*28,y=C.ground-85,T=clamp(Math.abs(e.aimX-x)/450,.55,1.1),gravity=720;
        g.enemyShots.push({type:'arrow',x,y,vx:(e.aimX-x)/T,vy:(e.aimY-y-.5*gravity*T*T)/T,gravity,r:3,life:2.2,damage:def.attack*g.map.scale,theme:'cave'});P.Audio.play('monster-bow-release');e.cd=def.cooldown;
      }else if(e.type==='cave-charger'){P.Audio.play('monster-charge');e.charging=.72;e.chargeDir=e.attackDir;e.chargeHits=new Set();}
      else{P.Audio.play('monster-slam');if(target&&Math.abs(target.x-e.x)<def.range+25)g.hurt(target,def.attack*g.map.scale,e.x);e.cd=def.cooldown;}
      return;
    }
    if(!target)return;
    const distance=target.x-e.x;e.dir=distance>=0?1:-1;
    if(Math.abs(distance)>def.range)e.x+=e.dir*def.speed*dt;
    else if(e.type==='cave-archer'&&Math.abs(distance)<170)e.x-=e.dir*def.speed*.65*dt;
    if(Math.abs(distance)<=def.range&&e.cd<=0){
      e.animAttack={age:-dt,duration:e.type==='cave-charger'?1.42:e.type==='cave-archer'?1.3:1};e.windup=e.type==='cave-guard'?.5:.7;e.attackDir=e.dir;e.aimX=target.x;e.aimY=target.y-(target.kind==='pig'?28:100);
      if(e.type==='cave-archer')P.Audio.play('monster-bow-draw');
      e.warning=e.type==='cave-archer'?'화살 · 점프 또는 방패':e.type==='cave-charger'?'돌진 준비 · 뛰어넘으세요':'내려치기 · 거리 유지';P.Audio.play('warning');
    }
  }
  function surfaceTick(g,e,dt){
    const def=g.enemyConfig(e),target=g.targetFor(e);
    if(e.clawFollow>0){e.clawFollow=Math.max(0,e.clawFollow-dt);if(e.clawFollow===0){P.Audio.play('monster-claw');}if(e.clawFollow===0&&target&&Math.abs(target.x-e.x)<def.range+28)g.hurt(target,def.attack*g.map.scale,e.x);return;}
    if(e.windup>0){
      e.windup=e.windup-dt<=1e-9?0:e.windup-dt;if(e.windup>0)return;
      P.Audio.play('monster-'+({slime:'claw',boar:'spikes',rock:'guard',bat:'venom'}[e.type]));
      if(e.type==='slime'){if(target&&Math.abs(target.x-e.x)<def.range+28)g.hurt(target,def.attack*g.map.scale,e.x);e.clawFollow=.2;}
      if(e.type==='boar')g.fieldEffects.push({kind:'spikes',x:e.x+e.attackDir*90,age:0,life:2.5,r:58,damage:def.attack*g.map.scale,hit:new Set()});
      if(e.type==='rock')e.guardTime=.65;
      if(e.type==='bat'){const x=e.x+e.attackDir*28,y=C.ground-104,tx=target?.x??x+e.attackDir*250,ty=(target?.y??C.ground)-(target?.kind==='pig'?28:95),T=clamp(Math.abs(tx-x)/340,.3,1.2);g.enemyShots.push({type:'venom',x,y,vx:(tx-x)/T,vy:(ty-y)/T,r:9,life:1.7,damage:def.attack*g.map.scale,age:0});}
      return;
    }
    if(e.guardTime>0){e.guardTime=Math.max(0,e.guardTime-dt);return;}
    if(e.animAttack||!target)return;
    const dx=target.x-e.x;e.dir=dx>=0?1:-1;
    if(Math.abs(dx)>def.range)e.x+=e.dir*def.speed*dt;
    else if(e.cd<=0){e.attackDir=e.dir;e.windup=e.type==='slime'?.3:e.type==='rock'?.35:.5;e.cd=def.cooldown;
      e.animAttack={age:-dt,duration:e.type==='slime'?.85:e.type==='rock'?1.15:1};
      e.warning={slime:'발톱 연타',boar:'가시 함정 · 점프로 피하세요',rock:'철갑 방어 · 반사 주의',bat:'독씨 발사 · 점프 또는 방패'}[e.type];}
  }
  function fieldsTick(g,dt){
    for(const f of g.fieldEffects){f.age+=dt;f.life-=dt;if(f.age<.25)continue;
      if(f.kind==='poison')f.y=Math.min(P.CONFIG.ground-30,f.y+65*dt);
      const targets=g.targets?g.targets():[{kind:'player',x:g.player.x,y:g.player.y,actor:g.player},{kind:'pig',x:g.pig.x,y:g.pig.y,actor:g.pig},...(g.helpers||[]).filter(h=>P.state.helpers[h.id]?.hp>0).map(h=>({kind:'helper',x:h.x,y:h.y,actor:h}))];
      for(const t of targets){const id=t.kind+(t.actor.id||'');if(f.hit.has(id)||Math.abs(t.x-f.x)>f.r)continue;
        if(f.kind==='spikes'&&t.y<P.CONFIG.ground-28)continue;
        if(f.kind==='poison'&&(t.y<P.CONFIG.ground-115||f.y<P.CONFIG.ground-70))continue;
        f.hit.add(id);g.hurt(t,f.damage);}
    }
    g.fieldEffects=g.fieldEffects.filter(f=>f.life>0);
  }
  function shotsTick(g,dt){
    for(const shot of g.enemyShots){
      if(shot.life<=0)continue;
      const previous={x:shot.x,y:shot.y};shot.age=(shot.age||0)+dt;shot.life-=dt;shot.x+=shot.vx*dt;shot.y+=shot.vy*dt+.5*(shot.gravity||0)*dt*dt;shot.vy+=(shot.gravity||0)*dt;
      if(P.Companions?.intercept(g,previous,shot))continue;
      if(intercept(g,previous,shot)){shot.life=0;woodHit(g);continue;}
      const p=g.player;
      if(p.hp>0&&Math.max(previous.x,shot.x)>p.x-15&&Math.min(previous.x,shot.x)<p.x+15&&shot.y>p.y-(blocking(g)?150:185)&&shot.y<p.y+4){
        g.hurt({kind:'player',x:p.x,y:p.y,actor:p},shot.damage,previous.x);shot.life=0;continue;
      }
      for(const h of g.helpers||[]){if(P.state.helpers[h.id]?.hp>0&&Math.abs(shot.x-h.x)<16&&shot.y>h.y-155&&shot.y<h.y){g.hurt({kind:'helper',x:h.x,y:h.y,actor:h},shot.damage,previous.x);shot.life=0;break;}}
      if(shot.life<=0)continue;
      if(Math.abs(shot.x-g.pig.x)<32&&shot.y>g.pig.y-60&&shot.y<g.pig.y+4){g.hurt({kind:'pig',x:g.pig.x,y:g.pig.y,actor:g.pig},shot.damage,previous.x);shot.life=0;}
    }
    g.enemyShots=g.enemyShots.filter(s=>s.life>0&&s.x>0&&s.x<g.room.width&&(!s.gravity||s.y<C.ground+12));
  }
  P.Combat={shieldActive,blocking,shieldBox,intercept,woodHit,caveTick,surfaceTick,fieldsTick,shotsTick};
})(globalThis.PIGGY=globalThis.PIGGY||{});
