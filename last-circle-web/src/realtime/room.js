import {GameRoom} from './engine.js';
import {RULES_VERSION} from '../sim.js';
import {forViewer,diffLive} from '../presence.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
export class MatchRoom {
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.engine=null;this.peers=new Set();this.streams=new Set();this.timer=null;this.saving=null;this.checkpointing=null;this.lastSave=0;this.lastCheckpoint=0;this.dbVersion=0;this.nextHeartbeat=0;
  this.ready=ctx.blockConcurrencyWhile(async()=>{const r=await ctx.storage.get('room');if(r){this.dbVersion=r.version;this.install(r.state,true);}});
 }
 install(state,restored=false){if(restored&&['flight','battle'].includes(state.phase))for(const p of state.players)if(!p.bot){p.motionEpoch=(p.motionEpoch||0)+1;p.commandMode=false;p.passive=false;p.commandBudget=0;}this.engine=new GameRoom(state,live=>this.broadcast(live));this.arm();}
 arm(){if(this.timer||!this.engine||this.engine.s.closed)return;this.timer=setTimeout(()=>this.tick(),40);}
 tick(){this.timer=null;if(!this.engine)return;const now=Date.now();try{
  this.engine.update(now);this.engine.emit();
  if(now>this.nextHeartbeat){this.nextHeartbeat=now+1000;for(const p of this.streams)try{p.controller.enqueue(p.encoder.encode('event: ping\ndata: {}\n\n'));}catch{this.streams.delete(p);}}
  if(now-this.lastSave>2000)this.persist();if(now-this.lastCheckpoint>5000)this.checkpoint();
 }catch(e){console.error('Room tick failed:',e.message);}
 const active=this.peers.size||this.streams.size||this.engine.s.players.some(p=>!p.bot&&p.connected!==false&&now-p.lastSeen<65000);
 if(!this.engine.s.closed&&active)this.arm();else this.persist(true);
 }
 broadcast(live){for(const p of this.peers)this.sendState(p,live);for(const p of this.streams){if((p.controller.desiredSize??1)<=0)continue;try{const next=forViewer(live,p.playerId),delta=diffLive(p.previous,next);p.controller.enqueue(p.encoder.encode('event: state\ndata: '+JSON.stringify(delta)+'\n\n'));p.previous=next;}catch{this.streams.delete(p);}}}
 sendState(peer,live,full=false){if(!peer.playerId||peer.socket.readyState!==1||!full&&peer.previous?.revision>=live.revision)return;if(peer.unacked.length>=3)return;try{const next=forViewer(live,peer.playerId),delta=full?{...next,full:true}:diffLive(peer.previous,next);peer.socket.send(JSON.stringify({type:'state',state:delta}));peer.previous=next;peer.unacked.push(next.revision);}catch{this.close(peer,1011,'연결을 다시 열어 주세요.');}}
 close(peer,code=1000,reason=''){clearTimeout(peer.authTimer);this.peers.delete(peer);try{peer.socket.close(code,reason);}catch{}}
 async message(peer,raw){if(typeof raw!=='string'||raw.length>16384){this.close(peer,1009,'입력이 너무 큽니다.');return;}let m;try{m=JSON.parse(raw);if(!m||typeof m!=='object'||Array.isArray(m))throw Error('Invalid message');}catch{this.close(peer,1008,'잘못된 입력');return;}
  if(!peer.playerId){if(m.type!=='auth'||m.rules!==RULES_VERSION){this.close(peer,4409,'새로고침해 주세요.');return;}const p=await this.engine.authenticate(m.token);if(!p||this.engine.s.closed){this.close(peer,4401,'입장 정보가 만료됐어요.');return;}
   for(const other of this.peers)if(other!==peer&&other.playerId===p.id)this.close(other,4001,'다른 연결로 이동했어요.');peer.playerId=p.id;clearTimeout(peer.authTimer);this.engine.touch(p);peer.socket.send(JSON.stringify({type:'ready',playerId:p.id,serverNow:Date.now(),protocol:1}));this.sendState(peer,structuredClone(this.fullLive()),true);this.arm();return;
  }
  const p=this.engine.s.players.find(p=>p.id===peer.playerId&&p.connected!==false);if(!p){this.close(peer,4401,'방에서 나갔어요.');return;}
  this.engine.touch(p);if(Number.isFinite(m.ack))peer.unacked=peer.unacked.filter(v=>v>m.ack);
  if(m.type==='input'){this.engine.input(p,m.packet);}
  else if(m.type==='ping')peer.socket.send(JSON.stringify({type:'pong',sent:m.sent,serverNow:Date.now()}));
  else if(m.type==='ack')this.sendState(peer,this.fullLive());
 }
 fullLive(){return structuredClone(this.engine.live());}
 async persist(force=false){if(!this.engine)return;if(this.saving){await this.saving;if(!force)return;}const record={state:structuredClone(this.engine.s),version:this.dbVersion};this.lastSave=Date.now();this.saving=this.ctx.storage.put('room',record).catch(e=>console.error('Room persistence failed:',e.message)).finally(()=>{this.saving=null;});return this.saving;}
 async checkpoint(force=false){if(!this.engine||!this.env.SITE_ORIGIN||!this.env.ROOM_SERVICE_KEY)return;if(this.checkpointing){await this.checkpointing;if(force)return this.checkpoint(true);return;}const saved=structuredClone(this.engine.s),version=this.dbVersion;this.lastCheckpoint=Date.now();this.checkpointing=(async()=>{try{const r=await fetch(this.env.SITE_ORIGIN+'/api/realtime/checkpoint',{method:'POST',headers:{'content-type':'application/json','x-room-service-key':this.env.ROOM_SERVICE_KEY},body:JSON.stringify({state:saved,version})});if(!r.ok)return;const b=await r.json();if(b.accepted)this.dbVersion=b.version;else if(b.state){this.dbVersion=b.version;if(this.engine.s.phase==='matching'&&b.state.phase==='prepare')this.engine.adopt(b.state);}this.persist(true);}catch(e){console.error('Room listing checkpoint failed:',e.message);}finally{this.checkpointing=null;}})();return this.checkpointing;}
 async fetch(req){await this.ready;const url=new URL(req.url),operation=url.pathname.split('/').at(-1);
  if(operation==='bootstrap'){
   const b=await req.json();if(!b.state||b.state.code!==url.pathname.split('/')[2]||b.state.rulesVersion!==RULES_VERSION||!Array.isArray(b.state.players)||b.state.players.length>25)return json({error:'방 상태가 올바르지 않습니다.'},400);
   if(!this.engine){this.dbVersion=b.version;this.install(b.state);}else if(this.engine.s.phase==='matching'&&b.state.phase==='prepare'&&b.state.players.length===2){this.dbVersion=b.version;this.engine.adopt(b.state);}await this.persist(true);return json({ok:true});
  }
  if(!this.engine)return json({bootstrap:true},409);const s=this.engine.s;
  if(operation==='socket'){
   if(this.peers.size>=44)return new Response('방 연결이 가득 찼어요.',{status:429});const pair=new WebSocketPair(),client=pair[0],server=pair[1];server.accept();const peer={socket:server,playerId:null,previous:null,unacked:[]};this.peers.add(peer);peer.authTimer=setTimeout(()=>this.close(peer,4401,'인증 시간이 지났어요.'),5000);server.addEventListener('message',e=>{this.message(peer,e.data).catch(()=>this.close(peer,1011,'연결을 다시 열어 주세요.'));});server.addEventListener('close',()=>this.close(peer));server.addEventListener('error',()=>this.close(peer));this.arm();return new Response(null,{status:101,webSocket:client});
  }
  const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
  if(operation==='stream'){
   const p=await this.engine.authenticate(token);if(!p)return json({error:'입장 정보를 확인하세요.'},401);const self=this;let peer;const stream=new ReadableStream({start(controller){peer={controller,encoder:new TextEncoder(),playerId:p.id,previous:self.engine.viewer(p.id)};controller.enqueue(peer.encoder.encode('event: ready\ndata: {}\n\nevent: state\ndata: '+JSON.stringify({...peer.previous,full:true})+'\n\n'));self.streams.add(peer);},cancel(){self.streams.delete(peer);}});this.arm();return new Response(stream,{headers:{'content-type':'text/event-stream; charset=utf-8','cache-control':'no-cache, no-transform','x-accel-buffering':'no'}});
  }
  let body={};try{const text=await req.text();if(text.length>16384)return json({error:'입력이 너무 큽니다.'},413);if(text)body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Invalid body');}catch{return json({error:'잘못된 요청입니다.'},400);}
  const result=await this.engine.action(operation,body,token);if(result.error)return json({error:result.error},result.status);
  if(operation==='session')result.body.websocket=url.origin.replace(/^http/,'ws')+'/rooms/'+s.code+'/socket';
  if(!['input','controls','session'].includes(operation)){await this.persist(true);await this.checkpoint(true);}else this.arm();return json(result.body,result.status);
 }
}
