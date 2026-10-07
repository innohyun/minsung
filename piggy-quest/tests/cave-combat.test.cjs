'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../src/config.js');require('../src/world.js');require('../src/exploration.js');require('../src/state.js');require('../src/combat.js');
const P=globalThis.PIGGY;P.Audio={play(){}};
function game(){P.state=P.State.fresh();return {map:P.MAPS[0],room:{width:5000},player:{hp:100,x:1000,y:600,dir:1,vx:0,pose:'idle'},pig:{x:700,y:600,carrying:false},helpers:[],enemyShots:[],particles:[],hurtCalls:[],
 enemyConfig:e=>P.ENEMIES[e.type],targetFor(){return {kind:'player',x:this.player.x,y:this.player.y,actor:this.player};},hurt(t,d){this.hurtCalls.push([t.kind,d]);}};}
function enemy(type,x=1300){return {type,x,hp:200,max:200,dir:-1,windup:0,cd:0};}
test('archer warns first, locks the aim and releases an arrow after the warning',()=>{
 const g=game(),e=enemy('cave-archer');P.Combat.caveTick(g,e,1/60);assert.ok(e.windup>=.69);assert.equal(g.enemyShots.length,0);
 const aim=e.aimX;g.player.x=1600;P.Combat.caveTick(g,e,.3);assert.equal(g.enemyShots.length,0);assert.equal(e.aimX,aim);
 P.Combat.caveTick(g,e,.41);assert.equal(g.enemyShots.length,1);assert.ok(g.enemyShots[0].vx<0);assert.ok(g.enemyShots[0].vy<0);assert.equal(g.enemyShots[0].type,'arrow');
});
test('ballistic arrow bends down and reaches the locked target regardless of step partition',()=>{
 for(const splits of [[.5,.5],[.15,.25,.6]]){
  const g=game(),e=enemy('cave-archer');P.Combat.caveTick(g,e,.01);P.Combat.caveTick(g,e,.71);const shot=g.enemyShots[0],T=(e.aimX-shot.x)/shot.vx,startY=shot.y,initialVy=shot.vy;
  g.player.x=g.pig.x=-1000;let elapsed=0;
  for(const part of splits){P.Combat.shotsTick(g,T*part);elapsed+=T*part;assert.ok(Math.abs(shot.y-(startY+initialVy*elapsed+.5*720*elapsed*elapsed))<1e-6);}
  assert.ok(Math.abs(shot.x-e.aimX)<1e-6);assert.ok(Math.abs(shot.y-e.aimY)<1e-6);assert.ok(shot.vy>0);
 }
});
test('wooden shield consumes a cave arrow with a wood impact and no damage',()=>{
 const g=game();P.state.skills.woodshield=1;g.player.shieldRaised=true;
 g.enemyShots=[{type:'arrow',x:1200,y:508,vx:-600,vy:0,gravity:720,r:3,life:2,damage:17}];
 P.Combat.shotsTick(g,.3);assert.equal(g.enemyShots.length,0);assert.equal(g.shieldHits,1);assert.deepEqual(g.hurtCalls,[]);
});
test('an unblocked arrow damages the player once and disappears',()=>{
 const g=game();g.enemyShots=[{type:'arrow',x:1010,y:510,vx:-450,vy:0,gravity:720,r:3,life:2,damage:17}];
 P.Combat.shotsTick(g,1/60);P.Combat.shotsTick(g,1/60);assert.deepEqual(g.hurtCalls,[['player',17]]);assert.equal(g.enemyShots.length,0);
});
test('charge keeps its warned direction after the target moves and only hits each actor once',()=>{
 const g=game(),e=enemy('cave-charger',900);P.Combat.caveTick(g,e,.01);assert.ok(e.windup>0);assert.equal(e.x,900);
 g.player.x=800;P.Combat.caveTick(g,e,.71);assert.equal(e.chargeDir,1);assert.ok(e.charging>0);
 g.player.x=1010;for(let i=0;i<30;i++)P.Combat.caveTick(g,e,1/60);
 assert.ok(e.x>1100);assert.deepEqual(g.hurtCalls,[['player',24]]);
});
test('jumping out of targeting range does not freeze an already committed charge',()=>{
 const g=game(),e=enemy('cave-charger',900);P.Combat.caveTick(g,e,.01);P.Combat.caveTick(g,e,.71);
 g.player.y=440;g.pig.x=-1000;g.targetFor=()=>null;for(let i=0;i<44;i++)P.Combat.caveTick(g,e,1/60);
 assert.ok(e.x>1200);assert.equal(e.charging,0);assert.deepEqual(g.hurtCalls,[]);assert.ok(e.cd>0);
});
test('cave enemies have higher health and damage than early surface enemies',()=>{
 for(const id of ['cave-archer','cave-charger','cave-guard']){assert.ok(P.ENEMIES[id].hp>P.ENEMIES.boar.hp);assert.ok(P.ENEMIES[id].attack>P.ENEMIES.slime.attack);}
});
