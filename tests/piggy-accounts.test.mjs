import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createMinsungServer} from '../server.mjs';
test('player accounts isolate saves, require authentication, reject stale saves and revoke sessions',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'piggy-account-test-'));
 const app=createMinsungServer({dbPath:join(directory,'dashboard.sqlite'),piggyDbPath:join(directory,'players.sqlite')});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+app.server.address().port;
 async function request(path,{method='GET',body,cookie,site=origin}={}){const res=await fetch(origin+'/api/piggy/'+path,{method,headers:{Origin:site,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:res.status===204?null:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0],attributes:res.headers.get('set-cookie')};}
 try{
  assert.equal((await request('save')).status,401);
  assert.equal((await request('register',{method:'POST',body:{name:'test',password:randomBytes(20).toString('hex')},site:'https://unknown.example'})).status,403);
  const password=randomBytes(20).toString('hex'),a=await request('register',{method:'POST',body:{name:'Archer',password}});assert.equal(a.status,201);assert.equal(a.data.user.name,'archer');assert.match(a.attributes,/HttpOnly/);assert.ok(!('sessionToken' in a.data));
  assert.equal((await request('register',{method:'POST',body:{name:'ARCHER',password}})).status,409);
  assert.equal((await request('login',{method:'POST',body:{name:'archer',password:'invalid-credentials'}})).status,401);
  const logged=await request('login',{method:'POST',body:{name:'archer',password}});assert.equal(logged.status,200);const cookie=logged.cookie;
  assert.equal((await request('session',{cookie})).data.user.name,'archer');
  const save={schema:3,coins:441,runCoins:23,player:{hp:17},progress:{wind:{dead:['wind-main-0']}}};
  const saved=await request('save',{method:'PUT',cookie,body:{revision:0,save}});assert.equal(saved.status,200);assert.equal(saved.data.revision,1);
  const stale=await request('save',{method:'PUT',cookie,body:{revision:0,save:{...save,coins:999}}});assert.equal(stale.status,409);
  assert.deepEqual((await request('save',{cookie})).data.save,save);
  const b=await request('register',{method:'POST',body:{name:'Sword',password:randomBytes(20).toString('hex')}});assert.equal((await request('save',{cookie:b.cookie})).data.save,null);
  assert.equal((await request('logout',{method:'POST',cookie})).status,200);assert.equal((await request('save',{cookie})).status,401);
  assert.equal((await request('session',{cookie:b.cookie})).data.user.name,'sword');
  const raw=readFileSync(join(directory,'players.sqlite')).toString('latin1');assert.ok(!raw.includes(password));
 }finally{await new Promise(r=>app.server.close(r));app.close();rmSync(directory,{recursive:true,force:true});}
});
