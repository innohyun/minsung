import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRoom,player,start,step,fire,act,applyInput,RELOAD_SECONDS} from '../src/sim.js';
import {terrainHeight,BOXES,BUILDINGS,integrateMovement,move,rayTerrain,supportHeight} from '../src/world.js';
import {Motion} from '../src/client/motion.js';
const still={mx:0,mz:0,yaw:0,pitch:0,fire:false,sprint:false,aim:false,crouch:false};
function match(){const s=makeRoom('ABCDEF','test',player('host','Tester'));start(s,'host');for(const p of s.players){p.onPlane=false;p.x=-105;p.z=-30;p.y=terrainHeight(p.x,p.z);p.bot=false;p.input={...still};}return s;}
test('rifle fires a full 30-round magazine before automatic reload; reserve and ammo conserved',()=>{
 const s=match(),p=s.players[0];p.guns=[true,false];p.ammo=[30,0];p.reserve=[60,0];
 for(let i=0;i<30;i++){s.time=i*.131;assert.equal(fire(s,p),true);if(i<29)assert.equal(p.reload,0);}
 assert.equal(p.ammo[0],0);assert.equal(p.reload,RELOAD_SECONDS[0]);assert.equal(p.reserve[0],60);assert.equal(fire(s,p),false);
 const t=s.time;for(let i=0;i<105;i++)step(s,.02);assert.ok(s.time>t+2);assert.equal(p.ammo[0],30);assert.equal(p.reserve[0],30);assert.equal(p.reload,0);
});
test('pistol has 12 rounds, and the final partial reserve reloads without pressing R',()=>{
 const s=match(),p=s.players[0];p.weapon=1;p.guns=[false,true];p.ammo=[0,12];p.reserve=[0,4];
 for(let i=0;i<12;i++){s.time=i*.321;assert.equal(fire(s,p),true);if(i<11)assert.equal(p.reload,0);}
 assert.equal(p.ammo[1],0);assert.ok(p.reload>0);for(let i=0;i<80;i++)step(s,.02);assert.equal(p.ammo[1],4);assert.equal(p.reserve[1],0);
 p.ammo[1]=0;for(let i=0;i<10;i++)step(s,.02);assert.equal(p.reload,0);
});
test('hills and cliff elevation affect movement and bullets; buildings have distinct footprints',()=>{
 assert.ok(terrainHeight(-36,37)>terrainHeight(-8,37)+4);
 const x=83,z=-17,p={x,z,y:terrainHeight(x,z),vy:0};const old=p.x;move(p,2,0);assert.equal(p.x,old,'cliff face cannot be walked through');
 const tiny={x:83,z:-17,y:terrainHeight(83,-17),vy:0};for(let i=0;i<60;i++)integrateMovement(tiny,{...still,mx:-1},1/60);assert.ok(tiny.x<83.4,'small real movement steps cannot climb the cliff either');
 const from=[-8,terrainHeight(-8,37)+1.4,37],to=[-62,terrainHeight(-62,37)+1.4,37],len=Math.hypot(...to.map((v,i)=>v-from[i])),dir=to.map((v,i)=>(v-from[i])/len);
 assert.ok(rayTerrain(from,dir,len)<len,'hill occludes the shot');assert.ok(new Set(BUILDINGS.map(b=>b.w+'x'+b.d)).size>=7);
});
test('parachute descent lands ON cover instead of becoming embedded inside a crate',()=>{
 const b=BOXES.find(b=>b.kind==='crate'),p={...player('x','x'),x:b.x,z:b.z,y:b.y+b.h+4,vy:-4.8};
 for(let i=0;i<300;i++)integrateMovement(p,still,.016);
 assert.ok(Math.abs(p.y-(b.y+b.h))<.03);assert.equal(p.vy,0);assert.equal(p.chute,false);
});
test('jump works from elevated ground, not only world y=0',()=>{
 const s=match(),p=s.players[0];p.x=-36;p.z=37;p.y=terrainHeight(p.x,p.z);assert.ok(p.y>5);act(s,p,'jump');assert.equal(p.vy,5.2);
});
test('snapshot reconciliation is continuous horizontally and during parachute descent',()=>{
 const m=new Motion(),p={...player('you','you'),x:-105,z:-30,y:terrainHeight(-105,-30)+12,vy:-4.8,chute:true};let clock=0;m.receive(p,0,clock,still,0);let last=m.display.y,largest=0;
 for(let i=0;i<90;i++){
  integrateMovement(p,still,1/60);clock+=1000/60;
  if(i%12===0)m.receive(p,clock/1000,clock,still,0);
  const visual=m.frame(1/60,still,clock);largest=Math.max(largest,Math.abs(visual.y-last));assert.ok(visual.y<=last+.015);last=visual.y;
 }
 assert.ok(largest<.15,`largest visual jump: ${largest}`);
 const before={...m.display};m.receive({...p,x:p.x+.6},2,clock,still,0);assert.equal(m.display.x,before.x,'receipt does not teleport visual position');const after=m.frame(1/60,still,clock+16.67);assert.ok(Math.abs(after.x-before.x)<.14);
});
