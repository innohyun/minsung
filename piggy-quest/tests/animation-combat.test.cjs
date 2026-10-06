'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
require('../src/config.js');require('../src/world.js');require('../src/exploration.js');require('../src/state.js');
const P=globalThis.PIGGY;P.SOURCE_FILES={'assets/animation-atlas.json':fs.readFileSync(__dirname+'/../assets/animation-atlas.json','utf8')};require('../src/animation.js');require('../src/combat.js');P.Audio={play(){}};
function game(){P.state=P.State.fresh();return {map:P.MAPS[0],room:P.MAPS[0].rooms.main,player:{x:1000,y:600,vx:0,dir:1,pose:'idle'},pig:{x:700,y:600},helpers:[],fieldEffects:[],enemyShots:[],calls:[],enemyConfig:e=>P.ENEMIES[e.type],targetFor(){return {kind:'player',x:this.player.x,y:this.player.y,actor:this.player};},hurt(t,d,x,charge){this.calls.push({kind:t.kind,d,charge});}};}
test('surface ground creatures have eight distinct walk frames and a full wing cycle',()=>{
  for(const [i,type] of ['slime','boar','rock','bat'].entries()){const frames=P.Animation.meta['surface-walk'].rows[i].frames;assert.equal(frames.length,type==='bat'?6:8);assert.equal(new Set(frames.map(f=>JSON.stringify(f.rect))).size,frames.length);}
});
test('ground movement selects distance frames and standing does not animate walking',()=>{
  const e={type:'slime',x:100,active:true,stun:0};P.Animation.advance(e,.1);const start=P.Animation.frame(e).index;
  P.Animation.advance(e,1);assert.equal(P.Animation.frame(e).index,start);e.x+=12;P.Animation.advance(e,.1);assert.notEqual(P.Animation.frame(e).index,start);
});
test('cave arrow release and subsequent reload frames match the combat phases',()=>{
  const e={type:'cave-archer',animAttack:{age:.65,duration:1.3}};assert.equal(P.Animation.frame(e).index,2);e.animAttack.age=.72;assert.equal(P.Animation.frame(e).index,3);e.animAttack.age=.95;assert.equal(P.Animation.frame(e).index,4);e.animAttack.age=1.12;assert.equal(P.Animation.frame(e).index,5);
});
test('stunned attack does not advance and recovery releases walking',()=>{
  const e={type:'cave-guard',x:0,active:true,stun:1,animAttack:{age:.4,duration:1}};P.Animation.advance(e,.5);assert.equal(e.animAttack.age,.4);e.stun=0;P.Animation.advance(e,.7);assert.equal(e.animAttack,null);
});
test('surface skills use claws, stationary spikes, guard and a distinct venom projectile without cave attacks',()=>{
  for(const type of ['slime','boar','rock','bat']){const g=game(),e={type,x:950,dir:1,attackDir:1,windup:.01,cd:0};P.Combat.surfaceTick(g,e,.02);assert.equal(g.enemyShots.length,type==='bat'?1:0);assert.equal(e.charging,undefined);
    if(type==='slime'){assert.equal(g.calls.length,1);P.Combat.surfaceTick(g,e,.2);assert.equal(g.calls.length,2);}
    if(type==='boar'){assert.equal(g.fieldEffects[0].kind,'spikes');assert.equal(e.x,950);}
    if(type==='rock'){assert.ok(e.guardTime>0);assert.equal(g.fieldEffects.length,0);}
    if(type==='bat'){assert.equal(g.enemyShots[0].type,'venom');assert.equal(g.fieldEffects.length,0);}}
});
test('ground spikes are telegraphed, avoidable by jumping, and hit each target only once',()=>{
 const g=game();g.fieldEffects=[{kind:'spikes',x:1000,age:0,life:2.5,r:58,damage:8,hit:new Set()}];P.Combat.fieldsTick(g,.1);assert.equal(g.calls.length,0);g.player.y=500;P.Combat.fieldsTick(g,.2);assert.equal(g.calls.length,0);g.player.y=600;P.Combat.fieldsTick(g,.1);P.Combat.fieldsTick(g,.1);assert.equal(g.calls.length,1);
});
test('poison must settle, can be left behind and expires on simulation time',()=>{
 const g=game();g.fieldEffects=[{kind:'poison',x:1000,y:525,age:0,life:2.3,r:65,damage:5,hit:new Set()}];g.player.x=1200;P.Combat.fieldsTick(g,.4);assert.equal(g.calls.length,0);g.player.x=1000;P.Combat.fieldsTick(g,.2);assert.equal(g.calls.length,1);P.Combat.fieldsTick(g,2);assert.equal(g.fieldEffects.length,0);
});
test('shield artwork contains two lateral views and is a separate grass-free atlas',()=>{assert.equal(P.Animation.meta['shield-motion'].rows[0].frames.length,2);assert.ok(P.Animation.meta['shield-motion'].sha256);});
