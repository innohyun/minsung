/** Deterministic, simulation-time boss telegraphs and swept wooden-shield collisions. */
(function(P){
  'use strict';
  const C=P.CONFIG,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  function shieldActive(g){const p=g.player;return !!P.state.skills.woodshield&&p.shieldRaised&&!g.pig.carrying&&!p.carryingObject&&p.pose==='idle';}
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
  function bossTick(g,e,dt){
    const p=g.player,def=g.enemyConfig(e),raged=e.hp/e.max<.45;
    e.patternIndex ||= 0;e.bossLift ||=0;
    if(e.action){
      e.actionTime-=dt;
      if(e.action==='charge'){
        const previous=e.x;e.x=clamp(e.x+e.chargeDir*(raged?430:340)*dt,40,g.room.width-80);
        const targets=[{kind:'player',x:p.x,y:p.y,actor:p},{kind:'pig',x:g.pig.x,y:g.pig.y,actor:g.pig}];
        for(const t of targets)if(!e.chargeHits.has(t.kind)&&Math.abs(t.x-e.x)<96&&t.y>C.ground-150){e.chargeHits.add(t.kind);g.hurt(t,def.attack*g.map.scale,e.x);}
        if(previous===e.x)e.actionTime=0;
      }else if(e.action==='leap'){
        const q=clamp(1-e.actionTime/.8,0,1);e.x=e.leapFrom+(e.leapTo-e.leapFrom)*q;e.bossLift=-Math.sin(q*Math.PI)*145;e.y=C.ground+e.bossLift;
      }
      if(e.actionTime<=0){
        if(e.action==='leap')g.hazards.push({x:e.x,life:1.8,age:0,radius:0,speed:240,hit:new Set()});
        e.action='';e.bossLift=0;e.y=C.ground;e.cd=raged?1.1:1.7;
      }return;
    }
    if(e.windup>0){
      e.windup-=dt;if(e.windup>0)return;
      const dir=e.attackDir;
      if(e.pattern==='volley'){
        const count=raged?5:3;
        for(let i=0;i<count;i++)g.enemyShots.push({x:e.x+dir*70,y:C.ground-82-(i%3)*28,vx:dir*(245+i*25),vy:i%2?16:-12,
          r:g.map.theme==='brook'?10:9,life:5,damage:12*g.map.scale,theme:g.map.theme});
        e.cd=raged?1.2:1.8;
      }else if(e.pattern==='charge'){e.action='charge';e.actionTime=.72;e.chargeDir=dir;e.chargeHits=new Set();}
      else if(e.pattern==='leap'){e.action='leap';e.actionTime=.8;e.leapFrom=e.x;e.leapTo=clamp(e.aimX,60,g.room.width-80);}
      else {
        g.hazards.push({x:e.x,life:2.2,age:0,radius:0,speed:g.map.boss?.wave||210,hit:new Set()});
        if(raged||g.map.theme==='brook')g.hazards.push({x:e.x,life:2.65,age:-.45,radius:0,speed:260,hit:new Set()});
        if(Math.abs(p.x-e.x)<def.range)g.hurt({kind:'player',x:p.x,y:p.y,actor:p},def.attack*g.map.scale,e.x);
        e.cd=raged?1.2:2;
      }
      e.patternIndex++;return;
    }
    e.dir=p.x>=e.x?1:-1;
    if(Math.abs(p.x-e.x)>480)e.x+=e.dir*def.speed*dt;
    if(e.cd<=0){
      const patterns=g.map.theme==='forest'?['volley','charge','slam']:g.map.theme==='amber'?['leap','volley','slam','charge']:['volley','charge','slam','leap'];
      e.pattern=patterns[e.patternIndex%patterns.length];e.windup=raged?.55:.8;e.attackDir=e.dir;e.aimX=clamp(p.x+e.dir*90,60,g.room.width-80);
      e.warning={volley:'투사체 · 방패 또는 거리 유지',charge:'돌진 · 방향을 보고 피하세요',leap:'도약 · 착지 지점에서 벗어나세요',slam:'내려찍기 · 뒤로 피하세요'}[e.pattern];
      P.Audio.play('warning');
    }
  }
  function shotsTick(g,dt){
    for(const shot of g.enemyShots){
      const previous={x:shot.x,y:shot.y};shot.life-=dt;shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;
      if(intercept(g,previous,shot)){shot.life=0;woodHit(g);continue;}
      const p=g.player;
      if(Math.max(previous.x,shot.x)>p.x-15&&Math.min(previous.x,shot.x)<p.x+15&&shot.y>p.y-(blocking(g)?150:185)&&shot.y<p.y+4){
        g.hurt({kind:'player',x:p.x,y:p.y,actor:p},shot.damage,previous.x);shot.life=0;continue;
      }
      if(Math.abs(shot.x-g.pig.x)<32&&shot.y>g.pig.y-60&&shot.y<g.pig.y+4){g.hurt({kind:'pig',x:g.pig.x,y:g.pig.y,actor:g.pig},shot.damage,previous.x);shot.life=0;}
    }
    g.enemyShots=g.enemyShots.filter(s=>s.life>0&&s.x>0&&s.x<g.room.width);
  }
  P.Combat={shieldActive,blocking,shieldBox,intercept,woodHit,bossTick,shotsTick};
})(globalThis.PIGGY=globalThis.PIGGY||{});
