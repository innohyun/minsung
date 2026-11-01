import {advance,applyInput,snapshot,start,returnLobby,player,eliminate,SLOTS,RULES_VERSION} from '../sim.js';
import {readyDuel,forfeitDuel,resolveDuel} from '../duel.js';
import {liveSnapshot,forViewer} from '../presence.js';
export const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
const randomToken=(n=24)=>Array.from(crypto.getRandomValues(new Uint8Array(n)),v=>v.toString(16).padStart(2,'0')).join('');
export class GameRoom {
 constructor(state,onChange=()=>{}){this.s=state;this.onChange=onChange;this.dirty=true;this.sequence=Math.ceil(state.revision||0);}
 changed(){this.s.revision=++this.sequence;this.dirty=true;}
 async authenticate(token){if(typeof token!=='string'||token.length<16||token.length>128)return null;const hash=await digest(token);return this.s.players.find(p=>p.tokenHash===hash&&p.connected!==false)||null;}
 touch(p,now=Date.now()){p.lastSeen=Math.max(p.lastSeen||0,now);}
 update(now=Date.now()){
  const s=this.s;if(s.closed)return;const before=s.time;advance(s,now);
  for(const p of s.players)if(!p.bot&&p.connected!==false&&now-p.lastSeen>(s.mode==='duel'?20000:60000)){
   if(s.mode==='duel')forfeitDuel(s,p);else if(p.id===s.host)s.closed=true;else if(s.phase==='lobby')p.connected=false;else{eliminate(s,p);p.connected=false;}
   this.changed();
  }
  resolveDuel(s);if(s.phase==='lobby')s.players=s.players.filter(p=>p.connected!==false);
  if(s.time!==before&&!['matching','prepare'].includes(s.phase))this.changed();
 }
 input(p,packet,now=Date.now()){
  if(!p||p.connected===false||this.s.closed)return false;
  if(!Number.isSafeInteger(packet.seq)||packet.seq<0)return false;
  this.update(now);this.touch(p,now);const before=p.lastSeq;applyInput(this.s,p,packet);if(p.lastSeq!==before)this.changed();return true;
 }
 async action(operation,body,token,now=Date.now()){
  let s=this.s;if(s.closed)return{status:410,error:'방장이 방을 닫았어요.'};
  let p,newToken;if(operation==='join'){
   if(s.mode==='duel'||s.phase!=='lobby')return{status:409,error:'이미 진행 중인 경기예요.'};
   if(s.players.length>=SLOTS)return{status:409,error:'20명이 모두 찼어요.'};
   newToken=randomToken();p=player(randomToken(8),(typeof body.nick==='string'?body.nick.trim().slice(0,16):'')||'플레이어');p.tokenHash=await digest(newToken);if(this.s!==s||s.phase!=='lobby')return{status:409,error:'이미 시작된 경기예요.'};if(s.players.length>=SLOTS)return{status:409,error:'20명이 모두 찼어요.'};this.touch(p,now);s.players.push(p);
  }else{
   p=await this.authenticate(token);s=this.s;if(!p)return{status:401,error:'입장 정보를 확인하세요.'};this.update(now);this.touch(p,now);
   try{
    if(operation==='start'){if(s.mode==='duel')throw Error('두 사람이 준비하면 자동으로 시작해요.');start(s,p.id);s.lastWall=now;}
    else if(operation==='ready')readyDuel(s,p,body);
    else if(operation==='return'){if(s.mode==='duel')throw Error('새 상대 찾기를 눌러 주세요.');returnLobby(s,p.id);s.lastWall=now;}
    else if(operation==='leave'){
     if(s.mode==='duel')forfeitDuel(s,p);else if(p.id===s.host)s.closed=true;else if(s.phase==='lobby')s.players=s.players.filter(q=>q.id!==p.id);else{eliminate(s,p);p.connected=false;}
    }else if(operation==='input'||operation==='controls'){if(!this.input(p,body,now))return{status:400,error:'입력 번호를 확인하세요.'};}
    else if(operation!=='session')return{status:404,error:'요청을 찾을 수 없어요.'};
   }catch(e){return{status:400,error:e.message};}
  }
  this.changed();this.emit();return{status:operation==='controls'?202:200,body:{...(newToken?{token:newToken}:{}),...(operation==='controls'?{queued:true,seq:body.seq}:{}),state:snapshot(s,p.id)}};
 }
 emit(){if(!this.dirty)return;this.dirty=false;this.onChange(structuredClone(liveSnapshot(this.s)));}
 live(){return liveSnapshot(this.s);}
 viewer(id){return forViewer(liveSnapshot(this.s),id);}
 adopt(state){if(state.rulesVersion!==RULES_VERSION||state.code!==this.s.code)throw Error('방 버전이 다릅니다.');this.s=state;this.sequence=Math.max(this.sequence,Math.ceil(state.revision||0));this.changed();this.emit();}
}
