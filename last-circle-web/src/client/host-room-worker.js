import {GameRoom,digest} from '../realtime/engine.js';
import {forViewer,diffLive} from '../presence.js';
import {reconcileMutation} from '../room-mutations.js';
let room,host,offset=0,timer,checkpointAt=0,latest;const peers=new Map(),now=()=>Date.now()+offset;
function send(peer,full=false){if(!latest||peer.pending||peer.unacked.length>=3||!full&&peer.previous?.revision>=latest.revision)return;const view=forViewer(latest,peer.id),packet=full?{...view,full:true}:diffLive(peer.previous,view);peer.pending=view;postMessage({type:'out',target:peer.id,packet});}
function emit(live){latest=live;for(const p of peers.values())send(p);}
function tick(){if(!room)return;try{room.update(now());room.emit();if(now()>checkpointAt){checkpointAt=now()+1000;postMessage({type:'checkpoint',state:structuredClone(room.s)});}}catch(e){postMessage({type:'error',message:e.message});}timer=setTimeout(tick,40);}
async function message(m){if(m.type==='init'){clearTimeout(timer);host=m.host;offset=m.serverNow-(m.clientTime||Date.now());room=new GameRoom(m.state,emit);const p=room.s.players.find(p=>p.id===host);p.motionEpoch=(p.motionEpoch||0)+1;p.commandMode=false;p.passive=false;Object.assign(p.input,{mx:0,mz:0,fire:false,sprint:false,carThrottle:0,carBrake:0});peers.set(host,{id:host,previous:null,pending:null,unacked:[]});postMessage({type:'host-ready'});room.changed();room.emit();tick();return;}if(!room)return;
 if(m.type==='proofs'){for(const x of m.proofs||[]){const p=room.s.players.find(p=>p.id===x.player_id);if(p)p.rtcHash=x.proof_hash;}return;}
 if(m.type==='sync'){const s=m.state,current=room.s;if(s.rulesVersion!==current.rulesVersion||s.code!==current.code)return;const same=current.round===s.round&&current.mode===s.mode&&current.duel?.round===s.duel?.round&&current.controlMutation?.key===s.controlMutation?.key&&current.phase===s.phase;
  if(same&&['flight','battle','finished'].includes(current.phase)){for(const p of s.players){const q=current.players.find(q=>q.id===p.id);if(q&&p.rtcHash)q.rtcHash=p.rtcHash;}return;}
  room.adopt(reconcileMutation(current,s));return;
 }
 if(m.type==='auth'){const p=room.s.players.find(p=>p.id===m.peer&&p.connected!==false);if(!p||!p.rtcHash||p.rtcHash!==await digest(m.proof)){postMessage({type:'auth-failed',target:m.peer});return;}p.motionEpoch=(p.motionEpoch||0)+1;p.commandMode=false;p.passive=false;Object.assign(p.input,{mx:0,mz:0,fire:false,sprint:false,carThrottle:0,carBrake:0});p.commandBudget=0;room.touch(p,now());peers.set(p.id,{id:p.id,previous:null,pending:null,unacked:[]});postMessage({type:'authenticated',target:p.id});room.changed();room.emit();return;}
 const peer=peers.get(m.peer);if(m.type==='remove'){peers.delete(m.peer);return;}if(m.type==='snapshot'){postMessage({type:'snapshot',requestId:m.requestId,state:structuredClone(room.s)});return;}
 if(m.type==='sent'&&peer){if(peer.pending&&peer.pending.revision===m.revision){if(m.ok){peer.previous=peer.pending;peer.unacked.push(m.revision);}peer.pending=null;}return;}
 if(!peer)return;const actor=room.s.players.find(p=>p.id===m.peer&&p.connected!==false);if(!actor)return;room.touch(actor,now());if(Number.isFinite(m.ack))peer.unacked=peer.unacked.filter(v=>v>m.ack);
 if(m.type==='input')room.input(actor,m.packet,now());else if(m.type==='ack')send(peer);
}
self.onmessage=e=>{message(e.data).then(()=>{if(e.data.type==='sync'&&e.data.requestId)postMessage({type:'synced',requestId:e.data.requestId});}).catch(err=>postMessage({type:'error',message:err.message}));};
