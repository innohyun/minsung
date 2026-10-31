import {HALF,clamp,rng,BOXES,BUILDINGS,LOOT_SPOTS,terrainHeight,supportHeight,blocked,move,rayBox,rayTerrain,rayWorld,integrateMovement,beginJump,angleDiff,inGrass,FLIGHT_HEIGHT,FLIGHT_SECONDS,FLIGHT_START,localPoint,DOORS,doorBox,contains} from './world.js';
import {WEAPONS,STANCES,getWeapon,reserveAmmo,stanceOf,eyePosition,hitBody,bodyDamage} from './weapons.js';
import {VEHICLE_SPAWNS,updateVehicles,enterOrExit,rayVehicle} from './vehicles.js';
import {grenadeLaunch,moveGrenade} from './projectiles.js';
export {HALF,clamp,rng,BOXES,BUILDINGS,terrainHeight,supportHeight,blocked,move,rayBox,integrateMovement,WEAPONS,STANCES,getWeapon,reserveAmmo,eyePosition};
export const SLOTS=10,STEP=.04,RULES_VERSION=4;
export const MAGAZINES=WEAPONS.map(w=>w.magazine),RELOAD_SECONDS=WEAPONS.map(w=>w.reload),FIRE_SECONDS=WEAPONS.map(w=>w.interval);
export function player(id,name,bot=false){return{id,name,bot,x:0,y:0,z:0,vx:0,vy:0,vz:0,yaw:0,pitch:0,hp:100,dead:false,onPlane:false,gliding:false,chute:false,bank:0,armor:0,helmet:0,vehicleId:null,switchLeft:0,switchTotal:1.45,switchFrom:0,switchTo:0,stowedWeapon:null,grenadeAim:false,stance:'stand',view:'third',weapon:0,guns:Array(5).fill(false),ammo:Array(5).fill(0),bag:{556:0,762:0,45:0,'12g':0},meds:0,painkillers:0,grenades:0,reload:0,heal:0,usingPain:0,boost:0,nextShot:0,lastShot:-10,lastSeq:-1,lastSeen:0,input:{mx:0,mz:0,yaw:0,pitch:0,fire:false,sprint:false,aim:false,stance:'stand',view:'third'},ai:{react:1,target:null,think:0,tx:0,tz:0,burst:0,pause:0,seed:id.split('').reduce((n,c)=>n+c.charCodeAt(0),0)},kills:0};}
export function makeRoom(code,name,host){return{code,name,rulesVersion:RULES_VERSION,host:host.id,players:[host],phase:'lobby',time:0,seed:721,loot:[],shots:[],grenades:[],explosions:[],doors:Object.fromEntries(DOORS.map(d=>[d.id,false])),vehicles:VEHICLE_SPAWNS.map(v=>({...v,y:supportHeight(v.x,v.z,Infinity)})),events:[],shotId:0,round:0,lastWall:0,winner:null,closed:false,zone:{stage:0,x:0,z:0,r:291,nextX:0,nextZ:0,nextR:193,closing:false,left:55,fromR:291,fromX:0,fromZ:0}};}
export function start(s,who){
 if(who!==s.host)throw Error('방장만 시작할 수 있어요.');if(s.phase!=='lobby')throw Error('이미 경기가 시작됐어요.');
 const humans=s.players.filter(p=>!p.bot);if(humans.length<1||humans.length>SLOTS)throw Error('참가 인원을 확인하세요.');const random=rng(s.seed+(++s.round)*73);
 s.players=humans.map(p=>({...player(p.id,p.name),tokenHash:p.tokenHash,lastSeen:p.lastSeen}));for(let i=humans.length;i<SLOTS;i++)s.players.push(player(`bot-${i}`,`AI ${String(i-humans.length+1).padStart(2,'0')}`,true));
 s.players.forEach((p,i)=>{p.onPlane=true;p.y=FLIGHT_HEIGHT;p.x=FLIGHT_START;p.z=(i%5-2)*1.25;p.seat=i;p.ai.drop=3+random()*14;});
 Object.assign(s,{rulesVersion:RULES_VERSION,phase:'flight',time:0,phaseLeft:FLIGHT_SECONDS,winner:null,loot:[],shots:[],grenades:[],explosions:[],doors:Object.fromEntries(DOORS.map(d=>[d.id,false])),vehicles:VEHICLE_SPAWNS.map(v=>({...v,y:supportHeight(v.x,v.z,Infinity)})),events:[],shotId:0});
 s.zone={stage:0,x:0,z:0,r:291,nextX:0,nextZ:0,nextR:193,closing:false,left:55,fromR:291,fromX:0,fromZ:0};
 for(const spot of LOOT_SPOTS){const k=spot.type;let item;
  if(k===0||k===3)item={kind:'weapon',weapon:(spot.building+(k===3?2:0)+s.round)%5};
  else if(k===1||k===4){const weapon=(spot.building+(k===4?2:0)+s.round)%5;item={kind:'ammo',caliber:WEAPONS[weapon].caliber,amount:weapon===3?15:weapon===4?10:30};}
  else if(k===2)item={kind:'med',amount:1};else if(k===5)item={kind:'pain',amount:1};else if(k===6)item={kind:'grenade',amount:2};
  else if(k===7)item={kind:'armor',armor:'vest',amount:100};else item={kind:'armor',armor:'helmet',amount:100};
  s.loot.push({...spot,...item});
 }
}
export function returnLobby(s,who){if(who!==s.host||s.phase!=='finished')throw Error('방장만 돌아갈 수 있어요.');s.players=s.players.filter(p=>!p.bot&&p.connected!==false).map(p=>({...player(p.id,p.name),tokenHash:p.tokenHash,lastSeen:p.lastSeen}));s.phase='lobby';s.time=0;s.winner=null;s.loot=[];s.shots=[];s.grenades=[];s.explosions=[];}
export function startReload(p){const w=getWeapon(p);if(p.dead||p.onPlane||p.gliding||p.vehicleId||p.switchLeft>0||p.reload>0||p.heal>0||p.usingPain>0||!p.guns[p.weapon]||reserveAmmo(p)<=0||p.ammo[p.weapon]>=w.magazine)return false;p.reload=w.reload;return true;}
export function clearSight(a,b,doors){const len=Math.hypot(...b.map((v,i)=>v-a[i]));if(len<.01)return true;const d=b.map((v,i)=>(v-a[i])/len);return rayWorld(a,d,len,doors).distance>=len-.12;}
export function applyInput(s,p,input={}){
 if(!Number.isSafeInteger(input.seq)||input.seq<=p.lastSeq)return;p.lastSeq=input.seq;
 const num=(x,a,b)=>Number.isFinite(x)?clamp(x,a,b):0,stance=['stand','crouch','prone'].includes(input.stance)?input.stance:'stand';
 p.input={mx:num(input.mx,-1,1),mz:num(input.mz,-1,1),yaw:num(input.yaw,-10000,10000),pitch:num(input.pitch,-1.25,1.25),fire:input.fire===true,sprint:input.sprint===true,aim:input.aim===true,stance,grenadeAim:input.grenadeAim===true,view:input.view==='first'?'first':'third'};
 p.yaw=p.input.yaw;p.pitch=p.input.pitch;p.view=p.vehicleId?'third':p.input.view;p.grenadeAim=p.input.grenadeAim;
 if(!['flight','battle'].includes(s.phase)||p.dead)return;
 if(p.usingPain&&(Math.hypot(p.input.mx,p.input.mz)>.06||stance!==p.stance||p.input.fire)){p.usingPain=0;p.useCancelled=s.time;}
 for(const action of Array.isArray(input.actions)?input.actions.slice(0,6):[])act(s,p,action);
}
export function act(s,p,action){
 if(p.dead)return;
 if(action==='jump'){p.usingPain=0;if(!p.vehicleId)beginJump(p,s.doors,s.vehicles);}
 if(p.onPlane||p.gliding)return;
 if(action==='shoot'){p.usingPain=0;fire(s,p);}
 if(action==='loot')loot(s,p);if(action==='interact')interact(s,p);
 if(action==='reload'){p.usingPain=0;startReload(p);}
 if(action==='heal'&&p.hp<100&&p.meds>0&&!p.reload&&!p.heal){p.usingPain=0;p.heal=3;}
 if(action==='pain'&&!p.vehicleId&&!p.switchLeft&&p.painkillers>0&&!p.reload&&!p.heal&&!p.usingPain){p.usingPain=8;p.painStart={x:p.x,z:p.z,stance:p.stance};}
 if(action==='grenade')throwGrenade(s,p);
 const m=typeof action==='string'&&action.match(/^equip:([0-4])$/);if(m)beginSwitch(p,+m[1]);
}
export function beginSwitch(p,to){if(to===p.weapon||!p.guns[to]||p.reload||p.switchLeft||p.vehicleId||p.usingPain)return false;p.switchFrom=p.weapon;p.switchTo=to;p.switchLeft=p.switchTotal=1.45;p.input.fire=false;return true;}
export function interact(s,p){if(p.vehicleId)return enterOrExit(s,p);let closest=null,d=2.9;for(const door of DOORS){const dist=Math.hypot(p.x-door.x,p.z-door.z);if(dist<d&&Math.abs(p.y-door.y)<2){d=dist;closest=door;}}if(closest){if(s.doors[closest.id]){const box=doorBox(closest,false);if(s.players.some(q=>!q.dead&&Math.abs(q.y-closest.y)<2&&contains(box,q.x,q.z,.36)))return false;}s.doors[closest.id]=!s.doors[closest.id];return true;}return enterOrExit(s,p);}
export function canLoot(p,l){if(l.kind==='weapon')return!p.guns[l.weapon];if(l.kind==='ammo')return(p.bag[l.caliber]||0)<300;if(l.kind==='med')return p.meds<5;if(l.kind==='pain')return p.painkillers<5;if(l.kind==='grenade')return p.grenades<5;if(l.kind==='armor')return (l.armor==='helmet'?p.helmet:p.armor)<70;return false;}
function loot(s,p){let best=null,d=2.65**2;for(const l of s.loot){const dd=(l.x-p.x)**2+(l.z-p.z)**2;if(dd<d&&Math.abs(l.y-(p.y+.8))<1.7&&canLoot(p,l)&&clearSight(eyePosition(p),[l.x,l.y,l.z],s.doors)){d=dd;best=l;}}if(!best)return;
 if(best.kind==='weapon'){const held=!!p.guns[p.weapon];p.guns[best.weapon]=true;p.ammo[best.weapon]=WEAPONS[best.weapon].magazine;if(held)beginSwitch(p,best.weapon);else p.weapon=best.weapon;}
 if(best.kind==='ammo')p.bag[best.caliber]=Math.min(300,(p.bag[best.caliber]||0)+best.amount);
 if(best.kind==='armor'){if(best.armor==='helmet')p.helmet=100;else p.armor=100;}if(best.kind==='med')p.meds++;if(best.kind==='pain')p.painkillers++;if(best.kind==='grenade')p.grenades=Math.min(5,p.grenades+best.amount);s.loot=s.loot.filter(l=>l.id!==best.id);
}
export function damage(s,v,amount,killer,zone='torso'){
 if(v.dead||s.phase==='finished')return;if(zone==='torso'&&v.armor>0){const absorb=Math.min(v.armor,amount*.35);v.armor-=absorb;amount-=absorb;}if(zone==='head'&&v.helmet>0){const absorb=Math.min(v.helmet,amount*.18);v.helmet-=absorb;amount-=absorb;}v.hp=Math.max(0,v.hp-amount);v.heal=v.usingPain=0;v.lastHit={at:s.time,zone,amount};if(v.hp>0)return;
 v.dead=true;v.input.fire=false;v.reload=v.heal=v.usingPain=0;if(killer&&killer!==v)killer.kills++;
 s.events.push({id:++s.shotId,text:`${killer?killer.name:'자기장'} → ${v.name}${zone==='head'?' · HEADSHOT':''}`,at:s.time});s.events=s.events.slice(-6);
 const alive=s.players.filter(p=>!p.dead);if(alive.length<=1){s.phase='finished';s.winner=alive[0]?.id??null;}
}
export function fire(s,p){
 const w=getWeapon(p);if(p.dead||p.onPlane||p.gliding||p.vault||p.vehicleId||p.switchLeft||p.grenadeAim||p.view!=='first'||p.usingPain||p.heal||p.reload||!p.guns[p.weapon]||p.ammo[p.weapon]<=0||s.time+1e-6<p.nextShot||!['flight','battle'].includes(s.phase))return false;
 p.nextShot=s.time+w.interval;p.lastShot=s.time;p.ammo[p.weapon]--;const random=rng(s.seed+s.shotId*31+p.seat*101),o=eyePosition(p),rays=[],hits=[];
 for(let pellet=0;pellet<(w.pellets||1);pellet++){
  const spread=w.spread*(p.stance==='prone'?.3:p.stance==='crouch'?.6:1)*(p.input.aim&&!w.pellets?.35:1),yaw=p.yaw+(random()-.5)*spread*2,pitch=p.pitch+(random()-.5)*spread*2;
  const d=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];let distance=Math.min(w.range,rayWorld(o,d,w.range,s.doors).distance),victim=null,zone=null;for(const v of s.vehicles||[])distance=Math.min(distance,rayVehicle(o,d,v,distance));
  for(const q of s.players){if(q===p||q.dead||q.onPlane)continue;const hit=hitBody(o,d,q,distance);if(hit&&hit.distance<distance){distance=hit.distance;victim=q;zone=hit.zone;}}
  if(pellet<4)rays.push(o.map((v,i)=>v+d[i]*distance));if(victim){hits.push({id:victim.id,zone});damage(s,victim,bodyDamage(w,zone),p,zone);}
 }
 s.shots.push({id:++s.shotId,by:p.id,weapon:p.weapon,from:o,to:rays[0],rays,at:s.time,hit:hits.length>0,zone:hits.some(h=>h.zone==='head')?'head':hits[0]?.zone});s.shots=s.shots.slice(-36);if(p.ammo[p.weapon]===0)startReload(p);return true;
}
export function throwGrenade(s,p){if(s.time-(p.throwAt??-10)<.8||p.grenades<=0||p.onPlane||p.gliding||p.vehicleId||p.switchLeft||p.heal||p.reload||p.dead)return false;p.usingPain=0;p.grenades--;p.throwAt=s.time;p.view='third';s.grenades.push({id:++s.shotId,owner:p.id,...grenadeLaunch(p,s.doors,s.vehicles)});return true;}
function grenadesStep(s,dt){
 for(const g of s.grenades){moveGrenade(g,dt,s.doors,s.vehicles);
  if(g.fuse<=0){s.explosions.push({id:g.id,x:g.x,y:g.y,z:g.z,at:s.time});const owner=s.players.find(p=>p.id===g.owner);for(const p of s.players){const distance=Math.hypot(p.x-g.x,p.y+.7-g.y,p.z-g.z);if(distance<8&&!p.dead){const cover=clearSight([g.x,g.y+.15,g.z],[p.x,p.y+.8,p.z],s.doors)?1:.17;damage(s,p,Math.max(0,115*(1-distance/8))*cover,owner,'blast');}}}
 }
 s.grenades=s.grenades.filter(g=>g.fuse>0);s.explosions=s.explosions.filter(e=>s.time-e.at<6);
}
function bot(s,p,dt){
 const a=p.ai;if(p.onPlane){if(s.time>a.drop)beginJump(p,s.doors,s.vehicles);return;}if(p.gliding){const landing=BUILDINGS[p.seat%BUILDINGS.length];p.input.mx=-clamp(angleDiff(Math.atan2(landing.x-p.x,landing.z-p.z),p.glideYaw??p.yaw)*1.5,-1,1);p.input.yaw=p.glideLookYaw??p.yaw;p.input.mz=.35;return;}
 a.think-=dt;if(a.think>0)return;a.think=.2;const random=rng(a.seed+Math.floor(s.time*5)*701);let target=null,best=70**2;
 for(const q of s.players){if(q===p||q.dead||q.onPlane)continue;const dx=q.x-p.x,dz=q.z-p.z,dd=dx*dx+dz*dz;if(q.stance==='prone'&&inGrass(q.x,q.z)&&dd>22*22)continue;const dot=(dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw))/Math.max(.01,Math.sqrt(dd));if(dd<best&&dot>.1&&clearSight(eyePosition(p),[q.x,q.y+stanceOf(q).eye*.8,q.z],s.doors)){target=q;best=dd;}}
 if(a.target!==target?.id){a.target=target?.id??null;a.react=.8+random()*.65;a.burst=0;a.pause=.2;}
 a.react-=.2;a.pause-=.2;let tx=p.x,tz=p.z;const outside=Math.hypot(p.x-s.zone.x,p.z-s.zone.z)>s.zone.r-9;
 p.input.fire=false;p.input.aim=!!target;p.input.sprint=!target;p.input.stance='stand';p.view=p.input.view=target?'first':'third';
 if(target&&p.guns.some(Boolean)){
  const distance=Math.sqrt(best),wanted=distance>40&&p.guns[3]?3:distance<13&&p.guns[4]?4:[0,1,2,3,4].find(i=>p.guns[i]&&(p.ammo[i]>0||p.bag[WEAPONS[i].caliber]>0));if(wanted!==undefined&&!p.reload)beginSwitch(p,wanted);
  const yaw=Math.atan2(target.x-p.x,target.z-p.z),pitch=Math.atan2(target.y+stanceOf(target).eye*.78-(p.y+stanceOf(p).eye),distance);
  p.input.stance=distance>24?(p.seat%4===0?'prone':'crouch'):'stand';
  // Deliberate aim settling, imperfect corrections, short bursts and pauses.
  const error=.018+Math.sin(s.time*1.2+a.seed)*.01;p.input.yaw=p.yaw+clamp(angleDiff(yaw,p.yaw),-.32,.32)+(random()-.5)*error;
  p.input.pitch=p.pitch+clamp(pitch-p.pitch,-.08,.08)+(random()-.5)*.025;
  if(a.pause<=0&&a.burst<=0){a.burst=.25+random()*.4;a.pause=0;}
  if(a.burst>0){a.burst-=.2;p.input.fire=a.react<=0&&Math.abs(angleDiff(yaw,p.yaw))<.16;if(a.burst<=0)a.pause=.45+random()*.8;}
  const sign=Math.sin(s.time*.5+p.seat)>0?1:-1;tx=p.x+Math.cos(yaw)*3*sign;tz=p.z-Math.sin(yaw)*3*sign;
  if(p.stance==='prone'){tx=p.x;tz=p.z;}
 }else{
  let item=null,d=Infinity;for(const l of s.loot){if(!canLoot(p,l))continue;if(l.kind==='pain'&&p.painkillers>=1||l.kind==='grenade'&&p.grenades>=2||l.kind==='med'&&p.meds>=2)continue;const priority=!p.guns.some(Boolean)?(l.kind==='weapon'?.35:2.5):1;const cost=((l.x-p.x)**2+(l.z-p.z)**2+Math.max(0,l.y-p.y)*12)*priority;if(cost<d){d=cost;item=l;}}
  if(item){tx=item.x;tz=item.z;if(Math.hypot(item.x-p.x,item.z-p.z)<2.6)act(s,p,'loot');
   const building=BUILDINGS[item.building];
   if(a.item!==item.id){a.item=item.id;a.route=[];const dx=p.x-building.x,dz=p.z-building.z,lx=building.rot?dz:dx,lz=building.rot?-dx:dz;
    if(Math.abs(lx)>building.w/2-.7||Math.abs(lz)>building.d/2-.7)a.route.push(localPoint(building,0,-building.d/2-2),localPoint(building,0,-building.d/2+2));
    const currentFloor=Math.min(building.floors,Math.max(0,Math.floor((p.y-building.y+.25)/building.level)));
    if(currentFloor>item.floor){for(let floor=currentFloor-1;floor>=item.floor;floor--)a.route.push(...building.routes[floor].slice().reverse().map(v=>({...v})));}
    else if(item.floor>currentFloor)for(let floor=currentFloor;floor<item.floor;floor++)a.route.push(...building.routes[floor].map(v=>({...v})));
   }
   const point=a.route?.[0];if(point){tx=point.x;tz=point.z;if(Math.hypot(p.x-tx,p.z-tz)<.75&&p.y>point.y-.6)a.route.shift();}
  }else{if(Math.hypot(p.x-a.tx,p.z-a.tz)<5){a.tx=s.zone.x+(random()-.5)*s.zone.r;a.tz=s.zone.z+(random()-.5)*s.zone.r;}tx=a.tx;tz=a.tz;}
 }
 for(const d of DOORS)if(!s.doors[d.id]&&Math.hypot(p.x-d.x,p.z-d.z)<2.8&&Math.abs(p.y-d.y)<2)s.doors[d.id]=true;
 if(outside){tx=s.zone.x;tz=s.zone.z;p.input.stance='stand';}if(p.hp<55&&!target)act(s,p,'heal');if(p.ammo[p.weapon]===0)startReload(p);
 let dx=tx-p.x,dz=tz-p.z,n=Math.hypot(dx,dz);if(n<.4){p.input.mx=p.input.mz=0;}else{
  dx/=n;dz/=n;if(blocked(p.x+dx*.9,p.z+dz*.9,p.y,.32,stanceOf(p).height,.28,s.doors,s.vehicles)){const side=blocked(p.x+dz*.9,p.z-dx*.9,p.y,.32,stanceOf(p).height,.28,s.doors,s.vehicles)?-1:1;[dx,dz]=[dz*side,-dx*side];if(random()<.08)if(!p.vehicleId)beginJump(p,s.doors,s.vehicles);}
  if(!target)p.input.yaw=p.yaw+clamp(angleDiff(Math.atan2(dx,dz),p.yaw),-.45,.45);p.input.mx=-dx*Math.cos(p.input.yaw)+dz*Math.sin(p.input.yaw);p.input.mz=dx*Math.sin(p.input.yaw)+dz*Math.cos(p.input.yaw);
 }
 p.yaw=p.input.yaw;p.pitch=p.input.pitch;
}
function zoneStep(s,dt){const z=s.zone;z.left-=dt;if(z.closing){const t=clamp(1-z.left/38,0,1);z.r=z.fromR+(z.nextR-z.fromR)*t;z.x=z.fromX+(z.nextX-z.fromX)*t;z.z=z.fromZ+(z.nextZ-z.fromZ)*t;}if(z.left<=0){if(z.closing){z.r=z.nextR;z.x=z.nextX;z.z=z.nextZ;z.closing=false;z.left=38;z.nextR=z.stage>=6?0:z.r*.62;const random=rng(s.seed+z.stage*433+s.round),a=random()*Math.PI*2,off=(z.r-z.nextR)*.32;z.nextX=z.x+Math.sin(a)*off;z.nextZ=z.z+Math.cos(a)*off;}else{z.stage++;z.closing=true;z.left=38;z.fromR=z.r;z.fromX=z.x;z.fromZ=z.z;}}}
export function step(s,dt=STEP){
 if(!['flight','battle'].includes(s.phase))return;s.time+=dt;updateVehicles(s,dt);if(s.phase==='flight'){s.phaseLeft-=dt;if(s.phaseLeft<=0){s.phase='battle';s.players.forEach(p=>{if(p.onPlane)if(!p.vehicleId)beginJump(p,s.doors,s.vehicles);});}}else zoneStep(s,dt);
 for(const p of s.players){if(p.dead)continue;if(p.bot)bot(s,p,dt);if(p.switchLeft>0){p.switchLeft=Math.max(0,p.switchLeft-dt);const progress=1-p.switchLeft/p.switchTotal;if(progress>=.5){p.weapon=p.switchTo;p.stowedWeapon=p.switchFrom;}}if(p.onPlane){integrateMovement(p,p.input,dt,s.time,s.doors,s.vehicles);continue;}const i=p.input;if(!p.bot&&s.wallNow-p.lastSeen>1400){i.mx=i.mz=0;i.fire=false;}
  if(p.usingPain){if(Math.hypot(i.mx,i.mz)>.06||p.vault||p.stance!==p.painStart?.stance||Math.hypot(p.x-p.painStart.x,p.z-p.painStart.z)>.05){p.usingPain=0;p.useCancelled=s.time;}else{p.usingPain=Math.max(0,p.usingPain-dt);if(p.usingPain===0&&p.painkillers>0){p.painkillers--;p.boost=60;}}}
  if(p.boost>0){p.boost=Math.max(0,p.boost-dt);p.hp=Math.min(100,p.hp+dt*.5);}
  if(p.reload>0){p.reload=Math.max(0,p.reload-dt);if(p.reload===0){const w=getWeapon(p),n=Math.min(w.magazine-p.ammo[p.weapon],p.bag[w.caliber]);p.ammo[p.weapon]+=n;p.bag[w.caliber]-=n;}}
  if(p.heal>0){p.heal=Math.max(0,p.heal-dt);if(p.heal===0&&p.meds>0){p.meds--;p.hp=Math.min(100,p.hp+50);}}
  if(!p.vehicleId)integrateMovement(p,i,dt,s.time,s.doors,s.vehicles);if(p.ammo[p.weapon]===0)startReload(p);if(i.fire)fire(s,p);
  if(s.phase==='battle'&&Math.hypot(p.x-s.zone.x,p.z-s.zone.z)>s.zone.r)damage(s,p,(2+s.zone.stage*1.5)*dt,null,'zone');
 }
 grenadesStep(s,dt);s.shots=s.shots.filter(x=>s.time-x.at<6);
}
export function advance(s,now){const elapsed=Math.max(0,Math.min(3,(now-(s.lastWall||now))/1000));s.wallNow=now;let left=elapsed;while(left>1e-6){const dt=Math.min(STEP,left);step(s,dt);left-=dt;}s.lastWall=now;}
export function snapshot(s,you){return{code:s.code,rulesVersion:s.rulesVersion,ack:s.players.find(p=>p.id===you)?.lastSeq??-1,revision:s.revision||0,name:s.name,host:s.host,you,phase:s.phase,time:s.time,phaseLeft:s.phaseLeft,zone:s.zone,winner:s.winner,round:s.round,loot:s.loot,doors:s.doors,vehicles:s.vehicles,shots:s.shots,grenades:s.grenades,explosions:s.explosions,events:s.events,players:s.players.map(({tokenHash,input,ai,lastSeen,lastSeq,...p})=>({...p,aim:input.aim,sprint:input.sprint}))};}
