'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
require('../src/config.js');require('../src/world.js');require('../src/state.js');require('../src/motion.js');require('../src/art.js');
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
  const jab=P.Motion.pose({pose:'punch',age:.09}),cross=P.Motion.pose({pose:'punch',age:.29});
  assert.equal(jab.attackArm,'front');assert.equal(cross.attackArm,'rear');
  assert.ok(jab.frontHand[0]>60&&cross.rearHand[0]>60);
  for(const p of [jab,cross,P.Motion.pose({pose:'punch',age:.09,aimY:-34})]){
    for(const side of ['rear','front']){assert.ok(Math.abs(distance(p[side+'Shoulder'],p[side+'Elbow'])-32)<1e-6);assert.ok(Math.abs(distance(p[side+'Elbow'],p[side+'Hand'])-31)<1e-6);}
  }
});
test('both walking arms retain the same forward elbow hinge across every phase',()=>{
  for(let i=0;i<32;i++)for(const running of [false,true]){
    const p=P.Motion.pose({phase:i/32,speed:230,running});
    for(const side of ['rear','front']){const s=p[side+'Shoulder'],e=p[side+'Elbow'],h=p[side+'Hand'];
      const cross=(e[0]-s[0])*(h[1]-e[1])-(e[1]-s[1])*(h[0]-e[0]);assert.ok(cross<0,'elbow reversed: '+side+' '+i);
      assert.ok(Math.abs(distance(s,e)-32)<1e-6);assert.ok(Math.abs(distance(e,h)-31)<1e-6);
    }
  }
});
test('carrying keeps elbows outside and the two arm chains do not cross',()=>{
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const intersects=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0;
  for(const pose of ['idle','kick','spin'])for(let i=0;i<20;i++){
    const p=P.Motion.pose({carrying:true,pose,age:i/32,phase:i/20,speed:230,running:true});
    assert.ok(p.rearHand[0]<p.frontHand[0]);
    assert.equal(p.rearHand[1],-196);assert.equal(p.frontHand[1],-196);
    const rear=[p.rearShoulder,p.rearElbow,p.rearHand],front=[p.frontShoulder,p.frontElbow,p.frontHand];
    for(let a=0;a<2;a++)for(let b=0;b<2;b++)assert.ok(!intersects(rear[a],rear[a+1],front[b],front[b+1]));
  }
});
test('walking and running share a continuous phase while speed blends',()=>{
  const a=P.Motion.pose({phase:.45,walkBlend:1,runBlend:.49}),b=P.Motion.pose({phase:.45,walkBlend:1,runBlend:.51});
  assert.ok(distance(a.frontFoot,b.frontFoot)<2);assert.ok(distance(a.frontHand,b.frontHand)<2);
});
test('roundhouse chambers the knee and pivots before its separate strike and recovery',()=>{
  const chamber=P.Motion.pose({pose:'spin',age:.13}),contact=P.Motion.pose({pose:'spin',age:.26}),end=P.Motion.pose({pose:'spin',age:.62});
  assert.ok(chamber.frontKnee[1]<chamber.hip[1]&&chamber.frontFoot[1]<-50);
  assert.ok(contact.frontFoot[0]>80&&contact.turn>.5&&contact.spinArc>.9);assert.ok(end.frontFoot[1]===0&&end.spinArc===0);
  assert.notDeepEqual(chamber.frontFoot,P.Motion.pose({pose:'kick',age:.13}).frontFoot);
});
test('legacy jump and fire purchases are refunded once without retaining player abilities',()=>{const raw=P.State.fresh();raw.schema=2;raw.version='0.3.0';raw.skills={jump:2,fire:1};raw.coins=333;const s=P.State.normalize(raw);assert.equal(s.skills.run,undefined);assert.equal(s.skills.fire,undefined);assert.equal(s.coins,893);assert.equal(P.State.normalize(s).coins,893);});
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
test('every map has complete reachable areas without bosses',()=>{
  assert.equal(P.MAPS.length,3);
  for(const map of P.MAPS){assert.equal(map.rooms.main.bossX,undefined);const seen=new Set(['main']);
    for(let pass=0;pass<10;pass++)for(const id of [...seen])for(const p of map.rooms[id].portals){assert.ok(map.rooms[p.target]);assert.ok(p.x>=0&&p.x<map.rooms[id].width);seen.add(p.target);}
    assert.equal(seen.size,Object.keys(map.rooms).length);
    for(const room of Object.values(map.rooms)){assert.ok(room.landmarks.length>=3);for(const enemy of room.enemies)assert.ok(enemy.x>0&&enemy.x<room.width);}
  }
});
