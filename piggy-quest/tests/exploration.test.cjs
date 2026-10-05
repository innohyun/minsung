'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../src/config.js');require('../src/world.js');require('../src/exploration.js');require('../src/state.js');
const P=globalThis.PIGGY;P.Audio={play(){}};
function game(){P.state=P.State.fresh();const map=P.MAPS[0],progress=P.state.progress.wind;
 const g={map,room:map.rooms.main,roomId:'main',progress,player:{x:1000,y:600,vy:0,dir:1},pig:{carrying:false},helpers:[],snapshot(){P.Exploration.snapshot(this);}};P.Exploration.load(g);return g;}
test('secret rooms are optional, have companions and require no purchased skill',()=>{
 for(const map of P.MAPS){const hidden=Object.values(map.rooms).filter(r=>r.hidden);assert.equal(hidden.length,1);assert.ok(hidden[0].helper);assert.ok(hidden[0].enemies.length>0);
  const required=new Set(P.requiredEnemies(map).map(e=>e.id));assert.ok(hidden[0].enemies.every(e=>!required.has(e.id)));
  const portal=map.rooms.main.portals.find(p=>p.secret);assert.ok(portal.height>120);assert.ok(map.rooms.main.objects.filter(o=>o.id.startsWith(map.id+'-secret')).length>=3);
 }
});
test('falling player lands on a solid crate rather than falling through it',()=>{
 const g=game();g.objects=[{id:'one',kind:'crate',x:1000,y:600,w:72,h:60,vy:0,carried:false}];g.player.y=544;g.player.vy=80;
 P.Exploration.physics(g,1/60,1000,538);assert.equal(g.player.y,540);assert.equal(g.player.vy,0);assert.ok(g.player.grounded);
});
test('grounded movement is blocked by the side of a solid crate',()=>{
 const g=game();g.objects=[{id:'one',kind:'crate',x:1000,y:600,w:72,h:60,vy:0,carried:false}];g.player.x=967;
 P.Exploration.physics(g,1/60,950,600);assert.ok(g.player.x<960);
});
test('carry, stack, save and normalize preserve stable object IDs and layout',()=>{
 const g=game(),a=g.objects[0],b=g.objects[1];b.x=1100;b.y=600;g.player.x=1100-a.w/2-25;
 assert.ok(P.Exploration.pickup(g,a));assert.ok(a.carried);assert.ok(P.Exploration.drop(g));assert.equal(a.x,b.x);assert.equal(a.y,b.y-b.h);
 const s=P.State.normalize(P.state);assert.deepEqual(s.progress.wind.objects[a.id],{x:a.x,y:a.y});assert.equal(s.progress.wind.carriedObject,'');
});
test('an elevated secret entrance is hidden from ground interaction until entered',()=>{
 const g=game(),portal=g.room.portals.find(p=>p.secret);assert.equal(P.Exploration.accessible(g,portal),false);g.player.y=600-portal.height;assert.ok(P.Exploration.accessible(g,portal));g.player.y=600;g.progress.visited.push(portal.target);assert.ok(P.Exploration.accessible(g,portal));
});
test('found companion joins current expedition without buying a slot or replacing party',()=>{
 const g=game(),def=P.helperById('scout');P.state.helpers.scout={hp:def.hp,revive:0};P.Exploration.join(g,def);P.Exploration.join(g,def);
 assert.deepEqual(P.state.party,['sprout']);assert.equal(P.state.slots,1);assert.equal(g.helpers.filter(h=>h.id==='scout').length,1);assert.deepEqual(g.progress.guests,['scout']);
 P.state.active=true;P.state.helpers.scout={hp:0,revive:1};P.State.reviveTick(P.state,1);assert.equal(P.state.helpers.scout.hp,48);
});
test('individual control sizes clamp independently and legacy global defaults remain intact',()=>{
 const raw=P.State.fresh();raw.settings.controls.sizes={'punch-btn':76,'jump-btn':999,joystick:1,unknown:99};const s=P.State.normalize(raw);
 assert.equal(s.settings.controls.size,56);assert.deepEqual(s.settings.controls.sizes,{'joystick':88,'jump-btn':96,'punch-btn':76});
});
test('shop offers agree with real purchase charges and affordability',()=>{
 const s=P.State.fresh();for(const t of P.SKILLS){const o=P.State.offer(s,'skill',t.id);assert.equal(o.cost,t.price);assert.equal(o.affordable,t.price<=120);}
 const o=P.State.offer(s,'skill','run');assert.equal(P.State.purchase(s,'skill','run'),'');assert.equal(s.coins,120-o.cost);assert.equal(P.State.offer(s,'skill','woodshield').affordable,false);
});
