import {makeRoom,player,start,returnLobby,advance,applyInput,snapshot,SLOTS} from '../sim.js';
export function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
const safe=(x,n)=>typeof x==='string'?x.trim().slice(0,n):'';
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const key=(n=24)=>Array.from(crypto.getRandomValues(new Uint8Array(n)),x=>x.toString(16).padStart(2,'0')).join('');
async function body(req){if(Number(req.headers.get('content-length'))>4096)throw Error('요청이 너무 커요.');const text=await req.text();if(text.length>4096)throw Error('요청이 너무 커요.');try{return JSON.parse(text);}catch{throw Error('잘못된 요청이에요.');}}
export async function api(req,env){
 const u=new URL(req.url),path=u.pathname;
 if(!env.DB)return json({error:'온라인 서버 데이터베이스가 연결되지 않았어요.'},503);
 try{
  if(req.method==='GET'&&path==='/api/rooms'){
   const {results}=await env.DB.prepare("SELECT code,json_extract(state,'$.name') AS name,json_array_length(json_extract(state,'$.players')) AS count,json_extract(state,'$.locked') AS locked FROM rooms WHERE updated_at>? AND json_extract(state,'$.phase')='lobby' AND json_extract(state,'$.closed')=0 ORDER BY updated_at DESC LIMIT 20").bind(Date.now()-60000).all();return json({rooms:results});
  }
  if(req.method==='POST'&&path==='/api/rooms'){
   const b=await body(req),name=safe(b.name,32)||'친구들과 한 판',nick=safe(b.nick,16)||'플레이어',password=safe(b.password,24),token=key();
   const p=player(key(8),nick);p.tokenHash=await hash(token);p.lastSeen=Date.now();
   let code=key(3).toUpperCase();const s=makeRoom(code,name,p);s.locked=!!password;s.passwordHash=await hash(password);s.lastWall=Date.now();
   await env.DB.prepare('DELETE FROM rooms WHERE updated_at<?').bind(Date.now()-7200000).run();
   await env.DB.prepare('INSERT INTO rooms(code,state,version,updated_at) VALUES(?,?,0,?)').bind(code,JSON.stringify(s),Date.now()).run();return json({token,state:snapshot(s,p.id)},201);
  }
  const m=path.match(/^\/api\/rooms\/([A-F0-9]{6})\/(join|input|start|return|leave)$/);if(!m||req.method!=='POST')return json({error:'요청 경로를 찾을 수 없어요.'},404);
  const [,code,operation]=m,b=await body(req),now=Date.now();
  const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');const tokenHash=await hash(token);
  const newToken=operation==='join'?key():null,newHash=newToken?await hash(newToken):null;
  for(let attempt=0;attempt<8;attempt++){
   const row=await env.DB.prepare('SELECT state,version FROM rooms WHERE code=?').bind(code).first();if(!row)return json({error:'방 코드를 확인하세요.'},404);
   const s=JSON.parse(row.state);
   const host=s.players.find(p=>p.id===s.host);
   if(s.closed||!host||now-host.lastSeen>60000)return json({error:'방장이 나갔거나 연결이 종료됐어요.'},410);
   advance(s,now);
   let p=s.players.find(x=>x.tokenHash===tokenHash);
   if(operation==='join'){
    if(s.phase!=='lobby')return json({error:'이미 진행 중인 경기예요.'},409);
    if(s.players.length>=SLOTS)return json({error:'10명이 모두 찼어요.'},409);
    if(await hash(safe(b.password,24))!==s.passwordHash)return json({error:'방 비밀번호가 맞지 않아요.'},403);
    p=player(key(8),safe(b.nick,16)||'플레이어');p.tokenHash=newHash;p.lastSeen=now;s.players.push(p);
   }else{
    if(!p||!token)return json({error:'입장 정보가 만료됐어요. 다시 참가하세요.'},401);
    p.lastSeen=now;
    if(operation==='input')applyInput(s,p,b);
    if(operation==='start')start(s,p.id);
    if(operation==='return')returnLobby(s,p.id);
    if(operation==='leave'){
     if(p.id===s.host)s.closed=true;
     else if(s.phase==='lobby')s.players=s.players.filter(q=>q.id!==p.id);
     else{p.hp=0;p.dead=true;p.connected=false;const alive=s.players.filter(q=>!q.dead);if(alive.length<=1){s.phase='finished';s.winner=alive[0]?.id??null;}}
    }
   }
   // Remove absent lobby guests and eliminate absent match guests. The host gets its own grace period above.
   for(const q of s.players)if(!q.bot&&q.id!==s.host&&now-q.lastSeen>60000){q.dead=true;q.connected=false;}
   if(s.phase==='lobby')s.players=s.players.filter(q=>q.connected!==false);
   if(['flight','battle'].includes(s.phase)){const alive=s.players.filter(q=>!q.dead);if(alive.length<=1){s.phase='finished';s.winner=alive[0]?.id??null;}}
   s.revision=row.version+1;
   const update=await env.DB.prepare('UPDATE rooms SET state=?,version=version+1,updated_at=? WHERE code=? AND version=?').bind(JSON.stringify(s),now,code,row.version).run();
   if(update.meta.changes===1)return json({...(newToken?{token:newToken}:{}),state:snapshot(s,p.id)});
  }
  return json({error:'서버가 잠시 바빠요. 다시 시도하세요.'},503);
 }catch(e){return json({error:/SQLITE|D1|database|table/i.test(e.message)?'온라인 서버를 준비하고 있어요. 잠시 뒤 다시 시도하세요.':e.message||'요청을 처리하지 못했어요.'},400);}
}
