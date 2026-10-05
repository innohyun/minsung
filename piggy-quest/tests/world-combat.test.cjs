'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../src/config.js');require('../src/world.js');require('../src/state.js');require('../src/motion.js');require('../src/combat.js');
const P=globalThis.PIGGY;
const game=()=>{P.state=P.State.fresh();P.state.skills.woodshield=1;return {player:{x:1000,y:600,vx:0,dir:1,pose:'idle',shieldRaised:true},pig:{x:800,y:600,carrying:false},particles:[],enemyShots:[],hurtCalls:[],hurt(t,d){this.hurtCalls.push([t.kind,d]);}};};
test('shoulders share the exact trunk joint in every walking phase',()=>{
  for(let i=0;i<32;i++){const p=P.Motion.pose({phase:i/32,walkBlend:1});assert.deepEqual(p.frontShoulder,p.shoulder);assert.deepEqual(p.rearShoulder,p.shoulder);}
});
test('walking upper body rises by less than one pixel over a stride',()=>{
  const values=Array.from({length:64},(_,i)=>P.Motion.pose({phase:i/64,walkBlend:1}).shoulder[1]);
  assert.ok(Math.max(...values)-Math.min(...values)<1);
});
test('expanded regions and loop branches are reachable in both directions',()=>{
  for(const map of P.MAPS){assert.ok(map.rooms.main.width>=15500);assert.ok(Object.keys(map.rooms).length>=5);
    for(const start of Object.keys(map.rooms)){
      const seen=new Set([start]);for(let i=0;i<8;i++)for(const id of [...seen])for(const p of map.rooms[id].portals){const next=map.rooms[p.target];assert.ok(next);assert.ok(p.spawn>=30&&p.spawn<next.width);seen.add(p.target);}
      assert.equal(seen.size,Object.keys(map.rooms).length);
    }
    assert.ok(map.rooms.main.enemies.some(e=>e.id===map.id+'-main-0'));
  }
});
test('road and map position remain continuous at every curve knot',()=>{
  for(const map of P.MAPS)for(const room of Object.values(map.rooms)){
    assert.ok(Math.max(...room.route.map(p=>p.y))-Math.min(...room.route.map(p=>p.y))>40);
    for(const p of room.route){assert.ok(Math.abs(P.World.height(room,p.x-.01)-P.World.height(room,p.x+.01))<.1);}
    assert.notDeepEqual(P.World.mapPoint(room,room.width*.2),P.World.mapPoint(room,room.width*.8));
  }
});
test('new map normalization preserves cleared saves and existing kills',()=>{
  const raw=P.State.fresh();raw.version='0.4.0';raw.coins=432;raw.progress.wind.dead=['wind-main-0'];raw.progress.amber.cleared=true;
  const s=P.State.normalize(raw);assert.equal(s.coins,432);assert.deepEqual(s.progress.wind.dead,['wind-main-0']);assert.equal(s.progress.amber.cleared,true);
});
test('wood shield costs real bank coins, has no skill slot and cannot be bought twice',()=>{
  const s=P.State.fresh();assert.equal(P.State.purchase(s,'skill','woodshield'),'');assert.equal(s.coins,0);assert.equal(s.skills.woodshield,1);assert.deepEqual(s.equipped,[]);
  assert.ok(P.State.purchase(s,'skill','woodshield'));assert.equal(s.coins,0);
});
test('swept shield stops a fast front projectile but not a rear projectile',()=>{
  const g=game();assert.equal(P.Combat.intercept(g,{x:1400,y:510},{x:800,y:510,vx:-600,r:9}),true);
  assert.equal(P.Combat.intercept(g,{x:800,y:510},{x:1400,y:510,vx:600,r:9}),false);
  g.pig.carrying=true;assert.equal(P.Combat.intercept(g,{x:1400,y:510},{x:800,y:510,vx:-600,r:9}),false);
});
test('stationary crouch covers lower shots and stays planted',()=>{
  const g=game();assert.equal(P.Combat.intercept(g,{x:1400,y:578},{x:800,y:578,vx:-600,r:9}),true);
  const p=P.Motion.pose({playerShield:true,blocking:true});assert.equal(p.rearFoot[1],0);assert.equal(p.frontFoot[1],0);assert.ok(p.head[1]>-145);
  g.player.vx=100;assert.equal(P.Combat.intercept(g,{x:1400,y:578},{x:800,y:578,vx:-600,r:9}),false);
});
test('projectile disappears on shield impact without harming player',()=>{
  const g=game();P.Audio={play:()=>{}};g.room={width:2000};g.enemyShots=[{x:1200,y:510,vx:-600,vy:0,r:9,life:2,damage:12}];
  P.Combat.shotsTick(g,.5);assert.equal(g.enemyShots.length,0);assert.equal(g.shieldHits,1);assert.equal(g.hurtCalls.length,0);
});
test('control import clamps size/position and starts sound enabled',()=>{
  const raw=P.State.fresh();raw.settings={sound:false,soundExplicit:true,volume:99,controls:{mode:'bad',size:999,stickSize:1,positions:{'punch-btn':{x:-9,y:4},bad:{x:.5,y:.5}}}};
  const s=P.State.normalize(raw);assert.equal(s.settings.sound,true);assert.equal(s.settings.controls.size,88);assert.equal(s.settings.controls.stickSize,88);assert.deepEqual(s.settings.controls.positions,{'punch-btn':{x:.02,y:.98}});assert.equal(s.settings.volume,1);
});
test('every boss cycles multiple telegraphs, projectiles and movement',()=>{
  for(const map of P.MAPS){const g=game();g.map=map;g.room=map.rooms.main;g.hazards=[];g.enemyConfig=()=>({...P.ENEMIES.boss,...map.boss});g.player.x=2000;g.pig.x=1900;
    const e={x:1750,hp:1000,max:1000,dir:1,windup:0,cd:0};const seen=new Set();let moved=0;
    for(let i=0;i<2400;i++){e.cd=Math.max(0,e.cd-1/60);const x=e.x;P.Combat.bossTick(g,e,1/60);moved+=Math.abs(e.x-x);if(e.pattern)seen.add(e.pattern);}
    assert.ok(seen.size>=3);assert.ok(g.enemyShots.length>=3);assert.ok(g.hazards.length>0);assert.ok(moved>150);
  }
});
