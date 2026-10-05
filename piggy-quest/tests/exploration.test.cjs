'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../src/config.js');require('../src/world.js');require('../src/exploration.js');require('../src/state.js');
const P=globalThis.PIGGY;P.Audio={play(){}};
function game(){P.state=P.State.fresh();const map=P.MAPS[0],progress=P.state.progress.wind;
 const g={map,room:map.rooms.main,roomId:'main',progress,player:{x:1000,y:600,vy:0,dir:1,grounded:true,dig:0},pig:{carrying:false},helpers:[],particles:[],toast(){},snapshot(){P.Exploration.snapshot(this);}};P.Exploration.load(g);return g;}
test('hidden cave enemies and companions remain optional for every boss',()=>{
 for(const map of P.MAPS){const hidden=Object.values(map.rooms).filter(r=>r.hidden);assert.equal(hidden.length,1);assert.ok(hidden[0].helper);
  const required=new Set(P.requiredEnemies(map).map(e=>e.id));assert.ok(hidden[0].enemies.every(e=>!required.has(e.id)));
  assert.deepEqual(new Set(hidden[0].enemies.map(e=>e.type)),new Set(['cave-archer','cave-charger','cave-guard']));
  for(const r of Object.values(map.rooms))assert.deepEqual(r.objects,[]);
 }
 assert.deepEqual(P.MAPS.map(m=>P.requiredEnemies(m).length),[48,40,46]);
});
test('obsolete carried objects are cleared without changing current coins, kills or chests',()=>{
 const g=game();g.progress.dead=['wind-main-0'];g.progress.opened=['w-c1'];P.state.coins=333;
 g.progress.carriedObject='wind-secret-crate';g.player.carryingObject=g.progress.carriedObject;g.objects=[{id:'old'}];P.Exploration.load(g);
 assert.deepEqual(g.objects,[]);assert.equal(g.player.carryingObject,'');assert.equal(g.progress.carriedObject,'');
 const s=P.State.normalize(P.state);assert.equal(s.coins,333);assert.deepEqual(s.progress.wind.dead,['wind-main-0']);assert.deepEqual(s.progress.wind.opened,['w-c1']);
});
test('free jumping lands on the ground without an old object platform',()=>{
 const g=game();g.player.y=544;g.player.vy=80;P.Exploration.physics(g);assert.equal(g.player.y,544);assert.equal(g.player.grounded,false);
 g.player.y=605;P.Exploration.physics(g);assert.equal(g.player.y,600);assert.equal(g.player.vy,0);assert.equal(g.player.grounded,true);
});
test('sealed soil requires an owned shovel and rejects airborne digging',()=>{
 const g=game(),q=g.room.portals.find(p=>p.secret);g.player.x=q.x;
 assert.equal(P.Exploration.site(g),q);P.Exploration.dig(g,q);assert.equal(g.progress.excavations[q.digId],undefined);
 assert.equal(P.State.purchase(P.state,'skill','shovel'),'');assert.equal(P.state.coins,30);assert.deepEqual(P.state.equipped,[]);
 g.player.grounded=false;P.Exploration.dig(g,q);assert.equal(g.progress.excavations[q.digId],undefined);
});
test('three separate digs open a passage without revealing it on the map',()=>{
 const g=game(),q=g.room.portals.find(p=>p.secret);g.player.x=q.x;P.state.skills.shovel=1;
 for(let n=1;n<=3;n++){
  g.player.dig=0;P.Exploration.dig(g,q);assert.equal(g.progress.excavations[q.digId],n);
  P.Exploration.dig(g,q);assert.equal(g.progress.excavations[q.digId],n,'rapid repeated input cannot skip digging recovery');
  assert.equal(P.Exploration.accessible(g,q),n===3);
 }
 assert.equal(g.progress.visited.includes(q.target),false);assert.ok(!P.World.chart(g).includes(g.map.rooms[q.target].name));
 assert.equal(P.Exploration.site(g),undefined);assert.equal(P.state.coins,120);
});
test('partial excavation survives normalization and clamps imported progress',()=>{
 const g=game(),q=g.room.portals.find(p=>p.secret);g.progress.excavations[q.digId]=2;g.progress.excavations.unknown=99;
 const s=P.State.normalize(P.state);assert.equal(s.progress.wind.excavations[q.digId],2);assert.equal(s.progress.wind.excavations.unknown,undefined);
 s.progress.wind.excavations[q.digId]=999;assert.equal(P.State.normalize(s).progress.wind.excavations[q.digId],3);
});
test('previously discovered secret rooms remain accessible after save migration',()=>{
 const g=game(),q=g.room.portals.find(p=>p.secret);g.progress.visited.push(q.target);delete g.progress.excavations;
 const s=P.State.normalize(P.state);assert.equal(s.progress.wind.excavations[q.digId],3);g.progress=s.progress.wind;
 assert.ok(P.Exploration.accessible(g,q));assert.ok(P.World.chart(g).includes(g.map.rooms[q.target].name));
});
test('every map connection has one matching entry and exit with its actual edge ID',()=>{
 const g=game();g.progress.visited=Object.keys(g.map.rooms);const chart=P.World.chart(g),edges=new Map();
 for(const match of chart.matchAll(/data-connector="([^"]+)" data-end="([AB])"/g)){const ends=edges.get(match[1])||[];ends.push(match[2]);edges.set(match[1],ends);}
 assert.ok(edges.size>=6);for(const [edge,ends] of edges){assert.ok(edge.includes(':'));assert.deepEqual(ends,['A','B']);}
});
test('found companion joins current expedition without buying a slot or replacing party',()=>{
 const g=game(),def=P.helperById('scout');P.state.helpers.scout={hp:def.hp,revive:0};P.Exploration.join(g,def);P.Exploration.join(g,def);
 assert.deepEqual(P.state.party,['sprout']);assert.equal(P.state.slots,1);assert.equal(g.helpers.filter(h=>h.id==='scout').length,1);assert.deepEqual(g.progress.guests,['scout']);
 P.state.active=true;P.state.helpers.scout={hp:0,revive:1};P.State.reviveTick(P.state,1);assert.equal(P.state.helpers.scout.hp,48);
});
test('individual control sizes clamp independently and legacy global defaults remain intact',()=>{
 const raw=P.State.fresh();raw.settings.controls.sizes={'punch-btn':76,'jump-btn':999,joystick:1,unknown:99};const s=P.State.normalize(raw);
 assert.equal(s.settings.controls.size,56);assert.deepEqual(s.settings.controls.sizes,{'joystick':88,'jump-btn':96,'attack-btn':76});
});
test('shop offers agree with real purchase charges and affordability',()=>{
 const s=P.State.fresh();for(const t of P.SKILLS){const o=P.State.offer(s,'skill',t.id);assert.equal(o.cost,t.price);assert.equal(o.affordable,t.price<=120);}
 const o=P.State.offer(s,'skill','run');assert.equal(P.State.purchase(s,'skill','run'),'');assert.equal(s.coins,120-o.cost);assert.equal(P.State.offer(s,'skill','woodshield').affordable,false);
});
test('room checks require every local enemy and never expose an undiscovered cave',()=>{
 const g=game();g.player.x=1000;
 for(const map of P.MAPS){g.map=map;g.room=map.rooms.main;g.progress=P.State.freshProgress(map);
  assert.ok(!P.World.chart(g).includes('data-cleared-room'));
  g.progress.dead=map.rooms.main.enemies.slice(0,-1).map(e=>e.id);
  assert.ok(!P.World.chart(g).includes('data-cleared-room="main"'));
  g.progress.dead.push(map.rooms.main.enemies.at(-1).id);
  assert.ok(!P.World.chart(g).includes('data-cleared-room="main"'),'boss still alive');
  g.progress.cleared=true;assert.ok(P.World.chart(g).includes('data-cleared-room="main"'));
  const [id,hidden]=Object.entries(map.rooms).find(([,r])=>r.hidden);g.progress.dead.push(...hidden.enemies.map(e=>e.id));
  assert.ok(!P.World.chart(g).includes('data-cleared-room="'+id+'"'));
  g.progress.visited.push(id);assert.ok(P.World.chart(g).includes('data-cleared-room="'+id+'"'));
  const s=P.State.fresh();s.progress[map.id]=g.progress;g.progress=P.State.normalize(s).progress[map.id];
  assert.ok(P.World.chart(g).includes('data-cleared-room="main"'));
 }
});
test('unified attack layout prefers current settings, then legacy kick, then punch',()=>{
 const s=P.State.fresh();s.coins=333;s.progress.wind.dead=['wind-main-0'];
 s.settings.controls.sizes={'kick-btn':72,'punch-btn':80};s.settings.controls.positions={'punch-btn':{x:.7,y:.8}};
 let n=P.State.normalize(s);assert.equal(n.settings.controls.sizes['attack-btn'],72);assert.deepEqual(n.settings.controls.positions['attack-btn'],{x:.7,y:.8});
 assert.equal(n.coins,333);assert.deepEqual(n.progress.wind.dead,['wind-main-0']);
 s.settings.controls.sizes['attack-btn']=60;s.settings.controls.positions['attack-btn']={x:.8,y:.7};n=P.State.normalize(s);
 assert.equal(n.settings.controls.sizes['attack-btn'],60);assert.deepEqual(n.settings.controls.positions['attack-btn'],{x:.8,y:.7});
 assert.equal(n.settings.controls.sizes['kick-btn'],undefined);
});
