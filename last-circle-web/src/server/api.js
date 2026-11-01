import{queueControls,pauseControls}from'./controls.js';
import{publishLive,openLive}from'./live.js';
import {makeRoom,player,start,returnLobby,advance,applyInput,snapshot,SLOTS,RULES_VERSION,eliminate} from '../sim.js';
import{configureDuel,prepareDuel,readyDuel,forfeitDuel,resolveDuel}from'../duel.js';
export function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
const safe=(x,n)=>typeof x==='string'?x.trim().slice(0,n):'';
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const key=(n=24)=>Array.from(crypto.getRandomValues(new Uint8Array(n)),x=>x.toString(16).padStart(2,'0')).join('');
async function body(req){if(Number(req.headers.get('content-length'))>16384)throw Error('요청이 너무 커요.');const text=await req.text();if(text.length>16384)throw Error('요청이 너무 커요.');try{return JSON.parse(text);}catch{throw Error('잘못된 요청이에요.');}}
const upgrade=()=>json({error:'게임이 업데이트됐어요. 새로고침한 뒤 새 방을 만들어 주세요.',upgrade:true},409);
function seat(nick,tokenHash,now){const p=player(key(8),safe(nick,16)||'플레이어');p.tokenHash=tokenHash;p.lastSeen=Math.max(p.lastSeen||0,now);return p;}
async function matchDuel(env,b){await env.DB.prepare('INSERT OR IGNORE INTO duel_queue(id,room_code,revision) VALUES(1,NULL,0)').run();const token=/^[a-f0-9]{64}$/.test(b.ticket||'')?b.ticket:key(32),tokenHash=await hash(token),now=Date.now();
 for(let attempt=0;attempt<12;attempt++){
  const existing=await env.DB.prepare("SELECT rooms.state FROM rooms,json_each(rooms.state,'$.players') member WHERE json_extract(member.value,'$.tokenHash')=? AND json_extract(rooms.state,'$.mode')='duel' AND json_extract(rooms.state,'$.rulesVersion')=8 AND json_extract(rooms.state,'$.closed')=0 AND json_extract(rooms.state,'$.phase')!='finished' AND rooms.updated_at>? LIMIT 1").bind(tokenHash,now-60000).first();if(existing){const s=JSON.parse(existing.state),p=s.players.find(p=>p.tokenHash===tokenHash);return json({token,state:snapshot(s,p.id)});}
  const q=await env.DB.prepare('SELECT room_code,revision FROM duel_queue WHERE id=1').first();if(!q)throw Error('매칭 서버를 준비하고 있어요. 잠시 후 다시 시도해 주세요.');
  if(q.room_code){const row=await env.DB.prepare('SELECT state,version FROM rooms WHERE code=?').bind(q.room_code).first(),s=row?JSON.parse(row.state):null;
   if(!s||s.closed||s.rulesVersion!==RULES_VERSION||s.phase!=='matching'||s.players.length!==1||now-s.players[0].lastSeen>15000){await env.DB.prepare('UPDATE duel_queue SET room_code=NULL,revision=revision+1 WHERE id=1 AND revision=?').bind(q.revision).run();continue;}
   const host=s.players[0];if(host.tokenHash===tokenHash)return json({token,state:snapshot(s,host.id)});const p=seat(b.nick,tokenHash,now);s.players.push(p);prepareDuel(s);s.lastWall=now;s.revision=row.version+1;
   const changed=await env.DB.prepare('UPDATE rooms SET state=?,version=version+1,updated_at=? WHERE code=? AND version=?').bind(JSON.stringify(s),now,s.code,row.version).run();if(changed.meta.changes!==1)continue;
   await env.DB.prepare('UPDATE duel_queue SET room_code=NULL,revision=revision+1 WHERE id=1 AND room_code=?').bind(s.code).run();return json({token,state:snapshot(s,p.id)});
  }
  const p=seat(b.nick,tokenHash,now),code=key(3).toUpperCase(),s=configureDuel(makeRoom(code,'1:1 아레나',p));s.lastWall=now;await env.DB.prepare('INSERT INTO rooms(code,state,version,updated_at) VALUES(?,?,0,?)').bind(code,JSON.stringify(s),now).run();
  const claimed=await env.DB.prepare('UPDATE duel_queue SET room_code=?,revision=revision+1 WHERE id=1 AND revision=? AND room_code IS NULL').bind(code,q.revision).run();if(claimed.meta.changes===1)return json({token,state:snapshot(s,p.id)},201);await env.DB.prepare('DELETE FROM rooms WHERE code=?').bind(code).run();
 }
 return json({error:'매칭 중이에요. 잠시 후 다시 시도해 주세요.'},503);
}
export async function api(req,env,ctx){const u=new URL(req.url),path=u.pathname;if(req.method==='POST'&&!path.endsWith('/leave')&&req.headers.get('x-game-rules')!==String(RULES_VERSION))return upgrade();if(!env.DB)return json({error:'온라인 서버 데이터베이스가 연결되지 않았어요.'},503);
 try{
  const controlsMatch=path.match(/^\/api\/rooms\/([A-F0-9]{6})\/controls$/);if(req.method==='POST'&&controlsMatch)return await queueControls(req,env,controlsMatch[1],await body(req),ctx);
  const streamMatch=path.match(/^\/api\/rooms\/([A-F0-9]{6})\/stream$/);if(req.method==='GET'&&streamMatch)return openLive(req,env,streamMatch[1],RULES_VERSION);
  if(req.method==='GET'&&path==='/api/rooms'){const{results}=await env.DB.prepare("SELECT code,json_extract(state,'$.name') AS name,json_array_length(json_extract(state,'$.players')) AS count FROM rooms WHERE updated_at>? AND json_extract(state,'$.phase')='lobby' AND json_extract(state,'$.mode')='survival' AND json_extract(state,'$.closed')=0 AND json_extract(state,'$.rulesVersion')=8 ORDER BY updated_at DESC LIMIT 30").bind(Date.now()-60000).all();return json({rooms:results});}
  if(req.method==='POST'&&path==='/api/matchmaking/duel')return await matchDuel(env,await body(req));
  if(req.method==='POST'&&path==='/api/rooms'){const b=await body(req),token=key(),now=Date.now(),p=seat(b.nick,await hash(token),now),code=key(3).toUpperCase(),s=makeRoom(code,safe(b.name,32)||'함께하는 20인 생존',p);s.lastWall=now;await env.DB.prepare('DELETE FROM rooms WHERE updated_at<?').bind(now-7200000).run();await env.DB.prepare('DELETE FROM room_live WHERE updated_at<?').bind(now-7200000).run();await env.DB.prepare('DELETE FROM room_inputs WHERE updated_at<?').bind(now-7200000).run();await env.DB.prepare('INSERT INTO rooms(code,state,version,updated_at) VALUES(?,?,0,?)').bind(code,JSON.stringify(s),now).run();return json({token,state:snapshot(s,p.id)},201);}
  const m=path.match(/^\/api\/rooms\/([A-F0-9]{6})\/(join|input|start|return|leave|ready)$/);if(!m||req.method!=='POST')return json({error:'요청 경로를 찾을 수 없어요.'},404);const[,code,operation]=m,b=await body(req),now=Date.now(),token=(req.headers.get('authorization')||'').replace(/^Bearer /,''),tokenHash=await hash(token),newToken=operation==='join'?key():null,newHash=newToken?await hash(newToken):null;
  const release=await pauseControls(env,code);try{
  for(let attempt=0;attempt<8;attempt++){
   const row=await env.DB.prepare('SELECT state,version FROM rooms WHERE code=?').bind(code).first();if(!row)return json({error:'방을 찾을 수 없어요. 목록을 새로고침해 주세요.'},404);const s=JSON.parse(row.state),host=s.players.find(p=>p.id===s.host),duel=s.mode==='duel';
   if(s.closed||!host||!duel&&now-host.lastSeen>60000)return json({error:'방장이 나갔거나 연결이 종료됐어요.'},410);if(s.rulesVersion!==RULES_VERSION&&operation!=='leave')return upgrade();let p=s.players.find(x=>x.tokenHash===tokenHash);if(operation!=='join'&&(!p||!token))return json({error:'입장 정보가 만료됐어요. 다시 참가하세요.'},401);if(s.rulesVersion===RULES_VERSION)advance(s,now);
   if(operation==='join'){if(duel||s.phase!=='lobby')return json({error:'이미 진행 중인 경기예요.'},409);if(s.players.length>=SLOTS)return json({error:'20명이 모두 찼어요.'},409);p=seat(b.nick,newHash,now);s.players.push(p);}else{
    if(!p||!token)return json({error:'입장 정보가 만료됐어요. 다시 참가하세요.'},401);p.lastSeen=Math.max(p.lastSeen||0,now);
    if(operation==='input')applyInput(s,p,b);if(operation==='ready')readyDuel(s,p,b);if(operation==='start'){if(duel)throw Error('두 사람이 준비하면 자동으로 시작해요.');start(s,p.id);}if(operation==='return'){if(duel)throw Error('새 1:1 매칭을 시작해 주세요.');returnLobby(s,p.id);}
    if(operation==='leave'){if(duel){forfeitDuel(s,p);await env.DB.prepare('UPDATE duel_queue SET room_code=NULL,revision=revision+1 WHERE id=1 AND room_code=?').bind(code).run();}else if(p.id===s.host)s.closed=true;else if(s.phase==='lobby')s.players=s.players.filter(q=>q.id!==p.id);else{if(s.rulesVersion===RULES_VERSION)eliminate(s,p);else{p.hp=0;p.dead=true;}p.connected=false;}}
   }
   for(const q of s.players)if(!q.bot&&q.id!==p.id&&now-q.lastSeen>(duel?20000:60000)){if(duel)forfeitDuel(s,q);else if(q.id!==s.host){if(s.phase==='lobby')q.dead=true;else eliminate(s,q);q.connected=false;}}
   if(s.phase==='lobby')s.players=s.players.filter(q=>q.connected!==false);if(duel)resolveDuel(s);else if(['flight','battle'].includes(s.phase)){const alive=s.players.filter(q=>!q.dead);if(alive.length<=1){s.phase='finished';s.winner=alive[0]?.id??null;}}
   s.controlMutation={key:crypto.randomUUID(),operation,player:p.id};s.revision=row.version+1;const update=await env.DB.prepare('UPDATE rooms SET state=?,version=version+1,updated_at=? WHERE code=? AND version=?').bind(JSON.stringify(s),now,code,row.version).run();if(update.meta.changes===1){const publish=publishLive(env,s);if(ctx?.waitUntil)ctx.waitUntil(publish.catch(()=>{}));else await publish;return json({...(newToken?{token:newToken}:{}),state:snapshot(s,p.id)});}
  }return json({error:'서버가 잠시 바빠요. 다시 시도하세요.'},503);
  }finally{release();}
 }catch(e){return json({error:/SQLITE|D1|database|table/i.test(e.message)?'온라인 서버를 준비하고 있어요. 잠시 뒤 다시 시도하세요.':e.message||'요청을 처리하지 못했어요.'},400);}
}
