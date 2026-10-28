// Shared deterministic geometry and server-authoritative rules, ported from LCRules.
import {HALF,clamp,rng,BOXES,BUILDINGS,terrainHeight,supportHeight,blocked,move,rayBox,rayTerrain,integrateMovement} from './world.js';
export {HALF,clamp,rng,BOXES,BUILDINGS,terrainHeight,supportHeight,blocked,move,rayBox,integrateMovement};
export const SLOTS=10, STEP=.05, RULES_VERSION=2;
export const MAGAZINES=[30,12], RELOAD_SECONDS=[2.05,1.45], FIRE_SECONDS=[.13,.32];
export function startReload(p){
 if(p.dead||p.onPlane||p.chute||p.reload>0||p.heal>0||!p.guns[p.weapon]||p.reserve[p.weapon]<=0||p.ammo[p.weapon]>=MAGAZINES[p.weapon])return false;
 p.reload=RELOAD_SECONDS[p.weapon];return true;
}
export function player(id,name,bot=false){return{id,name,bot,x:0,z:0,y:0,vy:0,yaw:0,pitch:0,hp:100,dead:false,onPlane:false,chute:false,weapon:0,guns:[false,false],ammo:[0,0],reserve:[0,0],meds:0,reload:0,heal:0,nextShot:0,lastSeq:-1,lastSeen:0,input:{mx:0,mz:0,yaw:0,pitch:0,fire:false,sprint:false,aim:false,crouch:false},ai:{react:0,target:null,side:1,think:0,tx:0,tz:0},kills:0};}
export function makeRoom(code,name,host){return{code,name,rulesVersion:RULES_VERSION,host:host.id,players:[host],phase:'lobby',time:0,seed:721,loot:[],shots:[],events:[],shotId:0,zone:{stage:0,x:0,z:0,r:167,nextX:0,nextZ:0,nextR:105,closing:false,left:38,fromR:167,fromX:0,fromZ:0},winner:null,closed:false,round:0,lastWall:0};}
export function start(s,who){
 if(who!==s.host)throw Error('방장만 시작할 수 있어요.');
 if(s.phase!=='lobby')throw Error('이미 경기가 시작됐어요.');
 const humans=s.players.filter(p=>!p.bot);if(humans.length<1||humans.length>SLOTS)throw Error('참가 인원을 확인하세요.');
 const r=rng(s.seed+(++s.round)*73);s.players=humans.map(p=>({...player(p.id,p.name),tokenHash:p.tokenHash,lastSeen:p.lastSeen}));
 for(let i=humans.length;i<SLOTS;i++)s.players.push(player(`bot-${i}`,`AI ${String(i-humans.length+1).padStart(2,'0')}`,true));
 s.players.forEach((p,i)=>{p.onPlane=true;p.y=52;p.x=-105;p.z=(i%5-2)*1.2;p.seat=i;p.ai.drop=2+r()*8;});
 s.rulesVersion=RULES_VERSION;s.phase='flight';s.time=0;s.phaseLeft=12;s.winner=null;s.loot=[];s.shots=[];s.events=[];s.shotId=0;
 s.zone={stage:0,x:0,z:0,r:167,nextX:0,nextZ:0,nextR:105,closing:false,left:38,fromR:167,fromX:0,fromZ:0};
 for(const building of BUILDINGS){
  for(let k=0;k<6;k++){const lx=(k%3-1)*building.w*.27,lz=(Math.floor(k/3)-.5)*building.d*.45;
   const x=building.x+(building.rot?-lz:lx),z=building.z+(building.rot?lx:lz);
   s.loot.push({id:`b${building.index}:${k}`,x,z,y:terrainHeight(x,z)+.2,kind:k===0?0:k===1?1:k===2?3:2});
  }
 }
 for(let i=0;i<14;i++){const x=-100+i*15,z=i%2?14:-14;s.loot.push({id:`road${i}`,x,z,y:terrainHeight(x,z)+.2,kind:i%4});}
}
export function returnLobby(s,who){
 if(who!==s.host||s.phase!=='finished')throw Error('방장만 결과 화면에서 돌아갈 수 있어요.');
 s.players=s.players.filter(p=>!p.bot&&p.connected!==false).map(p=>({...player(p.id,p.name),tokenHash:p.tokenHash,lastSeen:p.lastSeen}));s.phase='lobby';s.time=0;s.winner=null;s.loot=[];s.shots=[];
}
export function applyInput(s,p,input={}){
 if(!Number.isSafeInteger(input.seq)||input.seq<=p.lastSeq)return;
 p.lastSeq=input.seq;
 const num=(x,a,b)=>Number.isFinite(x)?clamp(x,a,b):0;
 p.input={mx:num(input.mx,-1,1),mz:num(input.mz,-1,1),yaw:num(input.yaw,-10000,10000),pitch:num(input.pitch,-.85,.85),fire:input.fire===true,sprint:input.sprint===true,aim:input.aim===true,crouch:input.crouch===true};
 p.yaw=p.input.yaw;p.pitch=p.input.pitch;
 if(!['flight','battle'].includes(s.phase)||p.dead)return;
 for(const action of Array.isArray(input.actions)?input.actions.slice(0,5):[])act(s,p,action);
}
export function act(s,p,action){
 if(p.dead)return;
 if(action==='jump'){
  if(p.onPlane)p.onPlane=false;
  else if(p.y<=supportHeight(p.x,p.z,p.y+.15)+.15)p.vy=5.2;
 }
 if(p.onPlane||p.chute)return;
 if(action==='loot')loot(s,p);
 if(action==='reload')startReload(p);
 if(action==='heal'&&p.hp<100&&p.meds>0&&!p.reload&&!p.heal)p.heal=3;
 if(action==='rifle'&&p.guns[0]&&!p.reload)p.weapon=0;
 if(action==='pistol'&&p.guns[1]&&!p.reload)p.weapon=1;
}
function loot(s,p){
 let best=null,d=3.2**2;
 for(const l of s.loot){const dd=(l.x-p.x)**2+(l.z-p.z)**2;if(dd<d&&clearSight(p.x,p.y+1,p.z,l.x,l.y??terrainHeight(l.x,l.z)+.2,l.z)){d=dd;best=l;}}
 if(!best)return;
 const k=best.kind;
 if(k<2){if(p.guns[k])return;p.guns[k]=true;p.ammo[k]=k?12:30;p.reserve[k]+=k?36:60;if(!p.guns[p.weapon]||k===0)p.weapon=k;}
 if(k===2){if(p.reserve[0]>=240&&p.reserve[1]>=120)return;p.reserve[0]=Math.min(240,p.reserve[0]+45);p.reserve[1]=Math.min(120,p.reserve[1]+24);}
 if(k===3){if(p.meds>=5)return;p.meds++;}
 s.loot=s.loot.filter(l=>l.id!==best.id);
}
function clearSight(x,y,z,tx,ty,tz){const len=Math.hypot(tx-x,ty-y,tz-z);if(len<.01)return true;const d=[(tx-x)/len,(ty-y)/len,(tz-z)/len];return rayTerrain([x,y,z],d,len)>=len-.15&&!BOXES.some(b=>rayBox([x,y,z],d,b,len)<len-.15);}
function damage(s,v,amount,killer){
 if(v.dead||s.phase==='finished')return;v.hp=Math.max(0,v.hp-amount);v.heal=0;
 if(v.hp>0)return;
 v.dead=true;v.input.fire=false;v.reload=0;v.heal=0;
 if(killer)killer.kills++;
 s.events.push({id:++s.shotId,text:`${killer?killer.name:'자기장'} → ${v.name}`,at:s.time});s.events=s.events.slice(-6);
 const alive=s.players.filter(p=>!p.dead);
 if(alive.length<=1){s.phase='finished';s.winner=alive[0]?.id??null;}
}
export function fire(s,p){
 if(p.dead||p.onPlane||p.chute||p.heal||p.reload||!p.guns[p.weapon]||p.ammo[p.weapon]<=0||s.time+1e-6<p.nextShot||!['flight','battle'].includes(s.phase))return false;
 p.nextShot=s.time+FIRE_SECONDS[p.weapon];p.ammo[p.weapon]--;
 const d=[Math.sin(p.yaw)*Math.cos(p.pitch),Math.sin(p.pitch),Math.cos(p.yaw)*Math.cos(p.pitch)],o=[p.x,p.y+1.4,p.z];
 let distance=p.weapon?75:170,victim=null;
 distance=Math.min(distance,rayTerrain(o,d,distance));
 for(const b of BOXES)distance=Math.min(distance,rayBox(o,d,b,distance));
 for(const q of s.players){
  if(q===p||q.dead||q.onPlane)continue;
  const v=[q.x-o[0],q.y+1-o[1],q.z-o[2]],t=v[0]*d[0]+v[1]*d[1]+v[2]*d[2];
  if(t<0||t>distance)continue;
  const hx=o[0]+d[0]*t-q.x,hz=o[2]+d[2]*t-q.z,hy=o[1]+d[1]*t-q.y;
  if(hx*hx+hz*hz<.43**2&&hy>0&&hy<1.85){distance=t;victim=q;}
 }
 const end=o.map((v,i)=>v+d[i]*distance);
 s.shots.push({id:++s.shotId,by:p.id,from:o,to:end,at:s.time,hit:!!victim});s.shots=s.shots.slice(-28);
 if(victim)damage(s,victim,p.weapon?22:26,p);
 if(p.ammo[p.weapon]===0)startReload(p);
 return true;
}
function bot(s,p,dt){
 const a=p.ai;
 if(p.onPlane){if(s.time>a.drop)p.onPlane=false;return;}
 if(p.chute){p.input.mx=0;p.input.mz=1;p.input.yaw=Math.atan2(-p.x,-p.z);return;}
 a.think-=dt;
 if(a.think>0)return;
 a.think=.2;let target=null,dist=60**2;
 for(const q of s.players){
  if(q===p||q.dead||q.onPlane)continue;
  const dx=q.x-p.x,dz=q.z-p.z,dd=dx*dx+dz*dz;
  const dot=(dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw))/Math.max(.01,Math.sqrt(dd));
  if(dd<dist&&dot>-.05&&clearSight(p.x,p.y+1.4,p.z,q.x,q.y+1,q.z)){target=q;dist=dd;}
 }
 if(a.target!==target?.id){a.target=target?.id??null;a.react=.7;}
 a.react=Math.max(0,a.react-.2);
 let tx=p.x,tz=p.z;
 const outside=Math.hypot(p.x-s.zone.x,p.z-s.zone.z)>s.zone.r-8;
 p.input.fire=false;p.input.sprint=!target;p.input.aim=!!target;
 if(target&&p.guns[p.weapon]){
  p.input.yaw=Math.atan2(target.x-p.x,target.z-p.z)+Math.sin(s.time*4+p.seat)*.025;
  p.input.pitch=Math.atan2(target.y-p.y-.3,Math.sqrt(dist));p.input.fire=a.react<=0;
  const sign=Math.sin(s.time*.45+p.seat)>0?1:-1;
  tx=p.x+Math.cos(p.input.yaw)*4*sign;tz=p.z-Math.sin(p.input.yaw)*4*sign;
 }else{
  let best=null,dd=Infinity;
  for(const l of s.loot){if(l.kind<2&&p.guns[l.kind]||l.kind===2&&p.reserve[0]>120||l.kind===3&&p.meds>=2)continue;
   const d=(l.x-p.x)**2+(l.z-p.z)**2;if(d<dd){dd=d;best=l;}}
  if(best){tx=best.x;tz=best.z;if(dd<8)act(s,p,'loot');}
  else{if(Math.hypot(p.x-a.tx,p.z-a.tz)<5){a.tx=Math.sin(p.seat+s.time*.2)*s.zone.r*.5+s.zone.x;a.tz=Math.cos(p.seat+s.time*.2)*s.zone.r*.5+s.zone.z;}tx=a.tx;tz=a.tz;}
 }
 if(outside){tx=s.zone.x;tz=s.zone.z;}
 if(p.hp<55&&!target)act(s,p,'heal');
 if(p.ammo[p.weapon]===0)act(s,p,'reload');
 let dx=tx-p.x,dz=tz-p.z,len=Math.hypot(dx,dz);dx/=Math.max(len,.01);dz/=Math.max(len,.01);
 if(blocked(p.x+dx*1.2,p.z+dz*1.2,p.y)){
  let side=1;if(blocked(p.x+dz*1.2,p.z-dx*1.2,p.y))side=-1;
  [dx,dz]=[dz*side,-dx*side];
 }
 if(!target)p.input.yaw=Math.atan2(dx,dz);
 const yaw=p.input.yaw;
 p.input.mx=-dx*Math.cos(yaw)+dz*Math.sin(yaw);p.input.mz=dx*Math.sin(yaw)+dz*Math.cos(yaw);
 p.yaw=yaw;p.pitch=p.input.pitch;
}
export function step(s,dt=STEP){
 if(!['flight','battle'].includes(s.phase))return;
 s.time+=dt;
 if(s.phase==='flight'){
  s.phaseLeft-=dt;
  if(s.phaseLeft<=0){s.phase='battle';s.players.forEach(p=>p.onPlane=false);}
 }else{
  const z=s.zone;z.left-=dt;
  if(z.closing){const t=clamp(1-z.left/32,0,1);z.r=z.fromR+(z.nextR-z.fromR)*t;z.x=z.fromX+(z.nextX-z.fromX)*t;z.z=z.fromZ+(z.nextZ-z.fromZ)*t;}
  if(z.left<=0){
   if(z.closing){z.r=z.nextR;z.x=z.nextX;z.z=z.nextZ;z.closing=false;z.left=35;z.nextR=z.stage>=6?0:z.r*.61;
    const r=rng(s.seed+z.stage*433+s.round);const a=r()*Math.PI*2,off=(z.r-z.nextR)*.35;
    z.nextX=z.x+Math.sin(a)*off;z.nextZ=z.z+Math.cos(a)*off;
   }else{z.stage++;z.closing=true;z.left=32;z.fromR=z.r;z.fromX=z.x;z.fromZ=z.z;}
  }
 }
 for(const p of s.players){
  if(p.dead)continue;
  if(p.bot)bot(s,p,dt);
  if(p.onPlane){integrateMovement(p,p.input,dt,s.time);continue;}
  const i=p.input;
  // Stop stale held inputs if a real client has not refreshed them.
  if(!p.bot&&s.wallNow-p.lastSeen>1400){i.mx=0;i.mz=0;i.fire=false;}
  if(p.reload>0){p.reload-=dt;if(p.reload<=0){p.reload=0;const w=p.weapon,n=Math.min((w?12:30)-p.ammo[w],p.reserve[w]);p.ammo[w]+=n;p.reserve[w]-=n;}}
  if(p.heal>0){p.heal-=dt;if(p.heal<=0){p.heal=0;if(p.meds>0){p.meds--;p.hp=Math.min(100,p.hp+50);}}}
  integrateMovement(p,i,dt,s.time);
  if(p.ammo[p.weapon]===0)startReload(p);
  if(i.fire)fire(s,p);
  if(s.phase==='battle'&&Math.hypot(p.x-s.zone.x,p.z-s.zone.z)>s.zone.r)damage(s,p,(2+s.zone.stage*1.5)*dt,null);
 }
 s.shots=s.shots.filter(x=>s.time-x.at<1.5);
}
export function advance(s,now){
 const elapsed=Math.max(0,Math.min(3,(now-(s.lastWall||now))/1000));s.wallNow=now;
 let left=elapsed;while(left>1e-6){const dt=Math.min(STEP,left);step(s,dt);left-=dt;}
 s.lastWall=now;
}
export function snapshot(s,you){return{code:s.code,rulesVersion:s.rulesVersion,ack:s.players.find(p=>p.id===you)?.lastSeq??-1,revision:s.revision||0,name:s.name,host:s.host,you,phase:s.phase,time:s.time,phaseLeft:s.phaseLeft,zone:s.zone,winner:s.winner,round:s.round,loot:s.loot,shots:s.shots,events:s.events,players:s.players.map(({tokenHash,input,ai,lastSeen,lastSeq,...p})=>({...p,aim:input.aim,sprint:input.sprint,crouch:input.crouch}))};}
