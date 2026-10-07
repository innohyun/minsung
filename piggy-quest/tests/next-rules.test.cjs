'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
require('../src/config.js');require('../src/world.js');require('../src/exploration.js');require('../src/state.js');require('../src/motion.js');require('../src/combat.js');
const P=globalThis.PIGGY;P.SOURCE_FILES={'assets/companions-atlas.json':fs.readFileSync(__dirname+'/../assets/companions-atlas.json','utf8')};P.Audio={play(){}};require('../src/companions.js');
function battle(id,x){P.state=P.State.fresh();P.state.tutorial.complete=true;P.state.helpers[id]=P.newHelper(id);const h={id,x:350,y:600,dir:1,pose:'idle',age:0,cd:0,inv:0,walkDistance:0,walkBlend:0};const e={id:'foe',type:'rock',x,y:600,hp:1000};const g={helpers:[h],enemies:[e],camera:0,player:{x:200,y:600,hp:100},enemyShots:[],room:{width:3000},enemyConfig:e=>P.ENEMIES[e.type],hits:[],hitEnemy(e,d){this.hits.push(d);e.hp-=d;}};P.Companions.initRoom(g);return g;}
test('archer starts at 520 range and both ranged companions retreat from close monsters',()=>{
 assert.equal(P.helperStats(P.State.fresh(),'archer').range,520);for(const id of ['archer','flame']){const g=battle(id,430);P.Companions.tick(g,1/60);assert.ok(g.helpers[0].x<350);assert.equal(g.helpers[0].dir,1);}
});
test('fire jet grows from the hand and delivers bounded sustained pulses, rather than a single burst',()=>{
 const g=battle('flame',670);for(let i=0;i<25;i++)P.Companions.tick(g,1/60);const jet=g.allyEffects.find(f=>f.type==='pillar');assert.ok(jet);assert.ok(jet.r>0&&jet.r<420);const first=g.hits.length;
 for(let i=0;i<45;i++)P.Companions.tick(g,1/60);assert.ok(g.hits.length>first);assert.ok(g.hits.length<=5);assert.ok(g.hits.every(d=>d<12));
});
test('bow stance changes the whole body and releases only after retrieving and drawing',()=>{
 const idle=P.Motion.pose(),pose=P.Motion.pose({companionId:'archer',pose:'bow',age:.8});assert.notDeepEqual(idle.frontFoot,pose.frontFoot);assert.notDeepEqual(idle.hip,pose.hip);assert.ok(pose.rearHand[0]<0);assert.ok(pose.frontHand[0]>45);
 const g=battle('archer',760);for(let i=0;i<55;i++)P.Companions.tick(g,1/60);assert.equal(g.allyShots.length,0);for(let i=0;i<4;i++)P.Companions.tick(g,1/60);assert.equal(g.allyShots.length,1);
});
test('sword winds behind the torso before sweeping forward and grips above the pommel',()=>{
 const back=P.Companions.swordFrame(.72),front=P.Companions.swordFrame(1.06);assert.ok(back.gripDir[0]<0);assert.ok(front.gripDir[0]>0);const native=P.Companions.meta['sword-sprites'].rows[front.row].frames[front.index];assert.notDeepEqual(front.pivot,native.pivot);
 assert.ok(P.Motion.pose({companionId:'sword',pose:'sword',age:.8,weaponGrip:back.gripDir}).frontHand[0]<0);
});
test('manual return rounds down half and cannot duplicate currency; clearing keeps full reward',()=>{
 const s=P.State.fresh();s.active=true;s.runCoins=101;const result=P.State.settle(s,'return');assert.deepEqual([result.kept,result.lost,s.coins,s.runCoins],[50,51,170,0]);P.State.settle(s,'return');assert.equal(s.coins,170);s.runCoins=101;assert.equal(P.State.settle(s,'clear').kept,101);
});
test('tutorial and pending player revival persist without resetting previous exploration',()=>{
 const old=P.State.fresh();old.player.hp=0;old.player.revive=6.4;old.progress.wind.x=5880;old.progress.wind.pigX=5800;old.progress.wind.dead=['wind-main-0'];old.tutorial.step=4;const s=P.State.normalize(old);assert.equal(s.player.revive,6.4);assert.equal(s.progress.wind.x,5880);assert.deepEqual(s.progress.wind.dead,['wind-main-0']);assert.equal(s.tutorial.step,4);
 const legacy={...old,stats:{kills:3,runs:2}};delete legacy.tutorial;assert.equal(P.State.normalize(legacy).tutorial.complete,true);
});
test('map current position is explicitly red and cleared rooms need no boss',()=>{
 const map=P.MAPS[0],progress=P.State.freshProgress(map);progress.dead=map.rooms.main.enemies.map(e=>e.id);const g={map,room:map.rooms.main,player:{x:200},progress};assert.ok(P.World.roomCleared(g,'main'));const chart=P.World.chart(g);assert.match(chart,/data-current-position="true" fill="#d74646"/);assert.ok(!chart.includes('이끼 거인'));
});

test('tutorial explanations hold companion targeting until the first combat step',()=>{const g=battle('brawler',420);g.training=()=>P.state.tutorial.step<5;P.state.tutorial={complete:false,step:0};const x=g.helpers[0].x;P.Companions.tick(g,1/60);assert.equal(g.helpers[0].targetId,'');P.state.tutorial.step=5;P.Companions.tick(g,1/60);assert.equal(g.helpers[0].targetId,'foe');});

test('a straight fire jet aims at low monsters both on the ground and during flight',()=>{for(const flight of [0,1]){const g=battle('flame',660);g.enemies[0].type='cave-charger';if(flight)P.state.helpers.flame.levels.flight=1;for(let n=0;n<100;n++)P.Companions.tick(g,1/60);assert.ok(g.hits.length>0,'jet missed low monster; flight='+flight);assert.ok(g.helpers[0].castAngle>0);}});
