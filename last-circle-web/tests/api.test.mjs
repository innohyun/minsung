import test from 'node:test';import assert from 'node:assert/strict';import {api} from '../src/server/api.js';import {database} from '../scripts/db-local.mjs';
const req=(path,b={},token)=>new Request('http://local'+path,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:JSON.stringify(b)});
test('real SQLite: create, password, join, capacity, host authority, ten-slot start, late join and guest leave',async()=>{
 const env={DB:database()};let r=await api(req('/api/rooms',{nick:'방장',name:'테스트',password:'1234'}),env);assert.equal(r.status,201);const h=await r.json();const c=h.state.code;
 r=await api(req(`/api/rooms/${c}/join`,{password:'wrong'}),env);assert.equal(r.status,403);
 r=await api(req(`/api/rooms/${c}/join`,{nick:'친구',password:'1234'}),env);assert.equal(r.status,200);const g=await r.json();assert.equal(g.state.players.length,2);assert.ok(!JSON.stringify(g.state).includes('tokenHash'));assert.ok(!JSON.stringify(g.state).includes('passwordHash'));
 r=await api(req(`/api/rooms/${c}/start`,{},g.token),env);assert.equal(r.status,400);
 r=await api(req(`/api/rooms/${c}/start`,{},h.token),env);assert.equal(r.status,200);const match=await r.json();assert.equal(match.state.players.length,10);assert.equal(match.state.players.filter(p=>p.bot).length,8);
 r=await api(req(`/api/rooms/${c}/join`,{password:'1234'}),env);assert.equal(r.status,409);
 r=await api(req(`/api/rooms/${c}/input`,{seq:1,mx:1,mz:0},'invalid'),env);assert.equal(r.status,401);
 r=await api(req(`/api/rooms/${c}/leave`,{},g.token),env);assert.equal(r.status,200);assert.equal((await r.json()).state.players.find(p=>p.id===g.state.you).dead,true);
 await api(req(`/api/rooms/${c}/leave`,{},h.token),env);r=await api(req(`/api/rooms/${c}/input`,{seq:2},g.token),env);assert.equal(r.status,410);
});
test('ten real seats reject eleventh and lobby listing never returns credentials',async()=>{const env={DB:database()};const h=await(await api(req('/api/rooms',{}),env)).json();for(let i=0;i<9;i++)assert.equal((await api(req(`/api/rooms/${h.state.code}/join`,{nick:'p'+i}),env)).status,200);assert.equal((await api(req(`/api/rooms/${h.state.code}/join`,{}),env)).status,409);const list=await(await api(new Request('http://local/api/rooms'),env)).json();assert.equal(list.rooms[0].count,10);assert.ok(!JSON.stringify(list).includes('tokenHash'));});
