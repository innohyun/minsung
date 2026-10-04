'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../src/config.js');require('../src/state.js');require('../src/motion.js');require('../src/art.js');
const P=globalThis.PIGGY;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);

test('resting feet are together and adult legs occupy about half the body',()=>{
  const p=P.Motion.pose();const height=13-p.head[1];
  assert.ok(Math.abs(p.frontFoot[0]-p.rearFoot[0])<=12);
  assert.ok(-p.hip[1]/height>.47&&-p.hip[1]/height<.55);
  assert.ok(height/26>6.8&&height/26<7.5);
});
test('contact foot stays at the same world position as the character moves',()=>{
  const a=P.Motion.pose({walkDistance:15,speed:230}),b=P.Motion.pose({walkDistance:30,speed:230});
  assert.equal(a.frontPlanted,true);assert.equal(b.frontPlanted,true);
  assert.ok(Math.abs((15+a.frontFoot[0])-(30+b.frontFoot[0]))<1e-6);
  assert.equal(a.frontFoot[1],0);assert.equal(b.frontFoot[1],0);
});
test('arms rotate at the shoulder and counter-swing the advancing leg',()=>{
  const a=P.Motion.pose({phase:.125,speed:230}),b=P.Motion.pose({phase:.625,speed:230});
  for(const phase of [0,.125,.375,.5,.625,.875]){
    const p=P.Motion.pose({phase,speed:230});
    assert.ok(p.frontFoot[0]*(p.frontHand[0]-p.shoulder[0])<0);
  }
  assert.ok(distance(a.frontElbow,b.frontElbow)>20);
});
test('two punches extend alternating arms without stretching their bones',()=>{
  const jab=P.Motion.pose({pose:'punch',age:.055}),cross=P.Motion.pose({pose:'punch',age:.215});
  assert.equal(jab.attackArm,'front');assert.equal(cross.attackArm,'rear');
  assert.ok(jab.frontHand[0]>60&&cross.rearHand[0]>60);
  for(const p of [jab,cross,P.Motion.pose({pose:'punch',age:.055,aimY:-34})]){
    assert.ok(distance(p.shoulder,p.frontHand)<=62.001);assert.ok(distance(p.shoulder,p.rearHand)<=62.001);
  }
});
test('kick reaches extension in 45ms and retracts with its support foot planted',()=>{
  const peak=P.Motion.pose({pose:'kick',age:.045}),end=P.Motion.pose({pose:'kick',age:.22});
  assert.equal(peak.kickExtension,1);assert.ok(end.kickExtension<.001);assert.equal(peak.rearFoot[1],0);
  for(const h of [-74,-28]){const p=P.Motion.pose({pose:'kick',age:.045,kickAimY:h});assert.ok(distance(p.hip,p.frontFoot)<95.01);}
});
test('all actors stand on the middle of the visible road',()=>{
  assert.equal(P.CONFIG.ground,(P.CONFIG.roadTop+P.CONFIG.roadBottom)/2);
});
test('scenery preserves feature identity and continuous offsets across a wrap boundary',()=>{
  for(const speed of [.12,.32,.62,1,1.12]){
    const a=P.Art.anchors(339,speed,340),b=P.Art.anchors(341,speed,340);
    for(const item of a){const same=b.find(x=>x.id===item.id);if(same){assert.equal(item.worldX,same.worldX);assert.ok(Math.abs(same.x-item.x+2*speed)<1e-6);}}
  }
});
test('old completed saves retain progress and unlock the added third map',()=>{
  const raw=P.State.fresh();delete raw.progress.brook;raw.progress.wind.cleared=true;raw.progress.amber.cleared=true;raw.unlocked=['wind','amber'];raw.coins=333;
  const s=P.State.normalize(raw);assert.equal(s.coins,333);assert.ok(s.unlocked.includes('brook'));assert.equal(s.progress.brook.cleared,false);
});
test('every map has complete reachable areas and a deepest boss approach',()=>{
  assert.equal(P.MAPS.length,3);
  for(const map of P.MAPS){assert.ok(map.rooms.main.bossX<map.rooms.main.width);const seen=new Set(['main']);
    for(let pass=0;pass<10;pass++)for(const id of [...seen])for(const p of map.rooms[id].portals){assert.ok(map.rooms[p.target]);assert.ok(p.x>=0&&p.x<map.rooms[id].width);seen.add(p.target);}
    assert.equal(seen.size,Object.keys(map.rooms).length);
    for(const room of Object.values(map.rooms)){assert.ok(room.landmarks.length>=3);for(const enemy of room.enemies)assert.ok(enemy.x>0&&enemy.x<room.width);}
  }
});
