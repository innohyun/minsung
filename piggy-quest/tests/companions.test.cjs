'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
require('../src/config.js');require('../src/world.js');require('../src/exploration.js');require('../src/state.js');require('../src/motion.js');
const P=globalThis.PIGGY;P.SOURCE_FILES={'assets/companions-atlas.json':fs.readFileSync(__dirname+'/../assets/companions-atlas.json','utf8')};P.Audio={play(){}};require('../src/companions.js');
function game(id='brawler',x=600){P.state=P.State.fresh();P.state.helpers[id]=P.newHelper(id);const h={id,x:150,y:600,vx:0,dir:1,pose:'idle',age:0,cd:0,inv:0,walkDistance:0,walkBlend:0};
 const e={id:'test',type:'slime',x,y:600,hp:1000};const g={camera:0,map:P.MAPS[0],room:P.MAPS[0].rooms.main,player:{x:180,y:600,hp:100,dir:1},helpers:[h],enemies:[e],enemyShots:[],enemyConfig:e=>P.ENEMIES[e.type],hits:[],hitEnemy(e,d,k){e.hp-=d;e.kb=k;this.hits.push({d,k});}};P.Companions.initRoom(g);return g;}
function steps(g,n){for(let i=0;i<n;i++)P.Companions.tick(g,1/60);}
test('schema 2 refunds only known old purchases once and preserves exploration and vitals',()=>{
 const r=P.State.fresh();r.schema=2;r.coins=333;r.runCoins=51;r.player.hp=17;r.pig.hp=29;r.slots=3;r.skills={run:2,fire:1,shovel:1,woodshield:1};r.helpers={sprout:{hp:31,revive:0},shield:{hp:0,revive:7},ember:{hp:70,revive:0},scout:{hp:0,revive:4},glow:{hp:45,revive:0},dew:{hp:61,revive:0},unknown:{hp:999}};r.party=['sprout','shield'];r.progress.wind.dead=['wind-main-0'];r.progress.wind.opened=['w-c1'];r.progress.wind.visited=['main','cave'];r.progress.wind.guests=['scout'];
 const s=P.State.normalize(r);assert.equal(s.schema,3);assert.equal(s.coins,1793);assert.equal(s.runCoins,51);assert.equal(s.player.hp,17);assert.equal(s.pig.hp,29);assert.equal(s.helpers.brawler.hp,31);assert.equal(s.helpers.archer.revive,4);assert.equal(s.slots,3);assert.deepEqual(s.party,['brawler','sword']);assert.deepEqual(s.progress.wind.guests,['archer']);assert.equal(s.progress.wind.dead[0],'wind-main-0');assert.equal(s.progress.wind.opened[0],'w-c1');assert.equal(s.progress.wind.visited[1],'cave');assert.deepEqual(s.skills,{shovel:1,woodshield:1});assert.equal(P.State.normalize(JSON.parse(JSON.stringify(s))).coins,1793);
});
test('skill costs are real bank deductions and health/speed levels have separate caps without free healing',()=>{
 const s=P.State.fresh();s.coins=10000;s.runCoins=77;s.helpers.brawler.hp=8;
 for(const key of ['health','speed']){const n=P.helperNode('brawler',key);for(let i=0;i<n.max;i++){const o=P.State.offer(s,'helper-node','brawler:'+key),before=s.coins;assert.equal(P.State.purchase(s,'helper-node','brawler:'+key),'');assert.equal(s.coins,before-o.cost);}assert.ok(P.State.purchase(s,'helper-node','brawler:'+key));}
 assert.equal(P.helperStats(s,'brawler').max,160);assert.equal(P.helperStats(s,'brawler').speed,252);assert.equal(s.helpers.brawler.hp,8);assert.equal(s.runCoins,77);assert.equal(P.State.normalize(s).helpers.brawler.hp,8);
});
test('radial abilities are independent, unknown or unowned upgrades never charge',()=>{
 const s=P.State.fresh();s.coins=5000;assert.equal(P.State.purchase(s,'helper-node','brawler:dash'),'');assert.equal(P.helperLevel(s,'brawler','dash'),1);assert.equal(P.helperLevel(s,'brawler','run'),0);
 const before=s.coins;for(const id of ['archer:bow','brawler:evil','__proto__:speed'])assert.ok(P.State.purchase(s,'helper-node',id));assert.equal(s.coins,before);
});
test('all five bow levels improve damage/speed/range/cooldown/gravity monotonically',()=>{
 const s=P.State.fresh();s.helpers.archer=P.newHelper('archer');const stats=[];for(let n=1;n<=5;n++){s.helpers.archer.levels.bow=n;stats.push(P.helperStats(s,'archer'));}for(let n=1;n<5;n++){for(const k of ['attack','arrowSpeed','range'])assert.ok(stats[n][k]>stats[n-1][k]);for(const k of ['cooldown','gravity'])assert.ok(stats[n][k]<stats[n-1][k]);}assert.equal(stats[0].gravity,720);assert.equal(stats[4].gravity,140);
});
test('viewport acquisition starts at long distances and ignores historical active offscreen enemies',()=>{
 const g=game('brawler',1200);g.enemies[0].active=false;steps(g,1);assert.equal(g.helpers[0].targetId,'test');assert.ok(g.helpers[0].x>150);
 g.enemies[0].x=1500;g.enemies[0].active=true;steps(g,1);assert.equal(g.helpers[0].targetId,'');
});
test('basic companion punches hit on two separate animation phases, never on every frame',()=>{
 const g=game('brawler',220);steps(g,1);assert.equal(g.hits.length,0);steps(g,6);assert.equal(g.hits.length,1);steps(g,12);assert.equal(g.hits.length,2);steps(g,12);assert.equal(g.hits.length,2);
});
test('bow release has real ballistic flight, a reload phase and one impact',()=>{
 const g=game('archer',345);steps(g,40);assert.equal(g.allyShots.length,1);const s={...g.allyShots[0]};steps(g,6);assert.ok(g.allyShots[0].vy>s.vy);steps(g,80);assert.equal(g.hits.length,1);
});
test('upgraded sword knocks back, chases within a cap and makes exactly two strikes',()=>{
 const g=game('sword',265);P.state.helpers.sword.levels.sword=2;steps(g,25);assert.equal(g.hits.length,1);assert.ok(g.hits[0].k>200);g.enemies[0].x+=130;const x=g.helpers[0].x;steps(g,60);assert.equal(g.hits.length,2);assert.ok(g.helpers[0].x>x);assert.ok(g.helpers[0].x-x<=160);
});
test('support heals only living allies and respects maxima; pig health is never changed',()=>{
 const g=game('support');g.player.hp=99;g.pig={hp:12};steps(g,45);assert.equal(g.player.hp,100);assert.equal(g.pig.hp,12);g.player.hp=0;steps(g,260);assert.equal(g.player.hp,0);
});
test('barrier consumes one fast swept projectile once and exhausts its finite charges',()=>{
 const g=game('support');g.barriers=[{x:300,y:500,dir:1,life:1,charges:1}];const s={x:250,y:500,vx:-900,r:3,life:1};assert.equal(P.Companions.intercept(g,{x:380,y:500},s),true);assert.equal(s.life,0);assert.equal(P.Companions.intercept(g,{x:380,y:500},{...s,life:1}),false);
});
test('flame pursuit explodes once and residual fire applies bounded periodic damage',()=>{
 const g=game('flame',345);P.state.helpers.flame.levels.fireball=1;steps(g,80);assert.ok(g.hits.length>=1);assert.ok(g.burns.length===1);g.helpers=[];const before=g.hits.length;steps(g,6);assert.ok(g.hits.length-before<=1);steps(g,240);assert.equal(g.burns.length,0);assert.equal(g.allyShots.length,0);
});
test('flight ends and returns to the floor without perpetual reactivation',()=>{
 const g=game('flame',400);P.state.helpers.flame.levels.flight=1;steps(g,80);assert.ok(g.helpers[0].y<520);assert.ok(g.helpers[0].flight>0);steps(g,200);assert.equal(g.helpers[0].flight,0);assert.equal(g.helpers[0].y,600);
});
test('brawler evades a telegraphed attack with backward air movement and finite invulnerability',()=>{
 const g=game('brawler',300);P.state.helpers.brawler.levels.dodge=1;g.enemies[0].windup=.5;const h=g.helpers[0],x=h.x;steps(g,6);assert.equal(h.pose,'dodge');assert.ok(h.x<x&&h.y<600&&h.inv>0);g.enemies[0].windup=0;steps(g,38);assert.ok(h.pose!=='dodge');assert.equal(h.y,600);assert.ok(h.timers.dodge>0);
});
test('dash is a short committed move and not a continuous run or repeated damage',()=>{
 const g=game('brawler',380);P.state.helpers.brawler.levels.dash=1;steps(g,21);assert.ok(g.helpers[0].x>200);assert.equal(g.hits.length,1);assert.ok(g.helpers[0].timers.dash>0);assert.notEqual(g.helpers[0].pose,'dash');
});
test('new weapon poses keep both arm chains attached to their actual shoulders',()=>{
 const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
 for(const id of ['archer','sword','flame'])for(let n=0;n<80;n++){const age=n/60,f=P.Companions.swordFrame(age),r=P.Motion.pose({companionId:id,pose:id==='archer'?'bow':id==='sword'?'sword':'cast',age,weaponGrip:f.gripDir});for(const side of ['front','rear']){assert.deepEqual(r[side+'Shoulder'],r.shoulder);assert.ok(Math.abs(distance(r.shoulder,r[side+'Elbow'])-32)<1e-6);assert.ok(Math.abs(distance(r[side+'Elbow'],r[side+'Hand'])-31)<1e-6);}}
});
