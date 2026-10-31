import {HALF,clamp,rng,BOXES,BUILDINGS,LOOT_SPOTS,terrainHeight,supportHeight,blocked,move,rayBox,rayTerrain,rayWorld,integrateMovement,beginJump,angleDiff,inGrass,FLIGHT_HEIGHT,FLIGHT_SECONDS,FLIGHT_START,localPoint,DOORS,doorBox,contains,MAP_ID,POIS,LANDING_POINTS,flightPosition,riverDistance,buildingsNear,toLocal} from './world.js';
import {WEAPONS,STANCES,getWeapon,reserveAmmo,stanceOf,eyePosition,hitBody,bodyDamage} from './weapons.js';
import {VEHICLE_SPAWNS,updateVehicles,enterOrExit,rayVehicle} from './vehicles.js';
import {grenadeLaunch,moveGrenade} from './projectiles.js';
import {createLoot} from './loot.js';
import {activeGun,syncLoadout,setMagazine,giveWeapon,startSwitch,advanceSwitch,takeWeapon,dropEquipment} from './inventory.js';
import {routeBetween,closestRegion} from './navigation.js';
export {activeGun,giveWeapon,syncLoadout} from './inventory.js';
export {HALF,clamp,rng,BOXES,BUILDINGS,terrainHeight,supportHeight,blocked,move,rayBox,integrateMovement,WEAPONS,STANCES,getWeapon,reserveAmmo,eyePosition};
export const SLOTS=10,STEP=.04,RULES_VERSION=5;
export const MAGAZINES=WEAPONS.map(w=>w.magazine),RELOAD_SECONDS=WEAPONS.map(w=>w.reload),FIRE_SECONDS=WEAPONS.map(w=>w.interval);
export function player(id,name,bot=false){return{id,name,bot,x:0,y:0,z:0,vx:0,vy:0,vz:0,yaw:0,pitch:0,hp:100,dead:false,onPlane:false,gliding:false,chute:false,bank:0,armor:0,helmet:0,vehicleId:null,switchLeft:0,switchTotal:1.45,switchFrom:0,switchTo:0,stowedWeapon:null,grenadeAim:false,stance:'stand',view:'third',weapon:0,loadout:[null,null],activeSlot:0,dropped:false,guns:Array(5).fill(false),ammo:Array(5).fill(0),bag:{556:0,762:0,45:0,'12g':0},meds:0,painkillers:0,grenades:0,reload:0,heal:0,usingPain:0,boost:0,nextShot:0,lastShot:-10,lastSeq:-1,lastSeen:0,input:{mx:0,mz:0,yaw:0,pitch:0,fire:false,sprint:false,aim:false,stance:'stand',view:'third'},ai:{react:1,target:null,think:0,tx:0,tz:0,burst:0,pause:0,seed:id.split('').reduce((n,c)=>n+c.charCodeAt(0),0)},kills:0};}
export function makeRoom(code,name,host){return{code,name,rulesVersion:RULES_VERSION,host:host.id,players:[host],phase:'lobby',time:0,seed:721,mapId:MAP_ID,flightRoute:0,itemSeq:1000,loot:[],containers:[],shots:[],grenades:[],explosions:[],doors:Object.fromEntries(DOORS.map(d=>[d.id,false])),vehicles:VEHICLE_SPAWNS.map(v=>({...v})),events:[],shotId:0,round:0,lastWall:0,winner:null,closed:false,zone:{stage:0,x:0,z:0,r:291,nextX:0,nextZ:0,nextR:193,closing:false,left:55,fromR:291,fromX:0,fromZ:0}};}
const ZONE_RADII=[650,450,285,160,85,35,0],ZONE_WAIT=[120,40,35,30,25,20,15],ZONE_CLOSE=[100,80,70,60,50,45,45];
const initialZone=()=>({stage:0,x:0,z:0,r:1080,nextX:0,nextZ:0,nextR:650,closing:false,left:120,duration:100,fromR:1080,fromX:0,fromZ:0});
export function start(s,who){
 if(who!==s.host)throw Error('방장만 시작할 수 있어요.');if(s.phase!=='lobby')throw Error('이미 경기가 시작됐어요.');
 const humans=s.players.filter(p=>!p.bot);if(humans.length<1||humans.length>SLOTS)throw Error('참가 인원을 확인하세요.');const random=rng(s.seed+(++s.round)*73);
 s.players=humans.map(p=>({...player(p.id,p.name),tokenHash:p.tokenHash,lastSeen:p.lastSeen}));for(let i=humans.length;i<SLOTS;i++)s.players.push(player(`bot-${i}`,`AI ${String(i-humans.length+1).padStart(2,'0')}`,true));
 s.flightRoute=Math.floor(random()*4);const counts=new Map(),pool=[...POIS.filter(p=>p.kind!=='camp'),...POIS.filter(p=>['training','resort','port'].includes(p.kind))];
 s.players.forEach((p,i)=>{const f=flightPosition(0,s.flightRoute);Object.assign(p,{onPlane:true,y:FLIGHT_HEIGHT,x:f.x,z:f.z,seat:i,flightRoute:s.flightRoute,yaw:f.yaw});p.input.yaw=f.yaw;p.ai.drop=3+random()*32;let landing=pool[Math.floor(random()*pool.length)];for(let n=0;(counts.get(landing.id)||0)>=3&&n<pool.length;n++)landing=pool[(i+n)%pool.length];counts.set(landing.id,(counts.get(landing.id)||0)+1);p.ai.landing=LANDING_POINTS.find(q=>q.zone===landing.id);});
 Object.assign(s,{rulesVersion:RULES_VERSION,mapId:MAP_ID,itemSeq:1000,phase:'flight',time:0,phaseLeft:FLIGHT_SECONDS,winner:null,loot:createLoot(s.seed,s.round),containers:[],shots:[],grenades:[],explosions:[],doors:Object.fromEntries(DOORS.map(d=>[d.id,false])),vehicles:VEHICLE_SPAWNS.map(v=>({...v})),events:[],shotId:0});s.zone=initialZone();
}
export function returnLobby(s,who){if(who!==s.host||s.phase!=='finished')throw Error('방장만 돌아갈 수 있어요.');s.players=s.players.filter(p=>!p.bot&&p.connected!==false).map(p=>({...player(p.id,p.name),tokenHash:p.tokenHash,lastSeen:p.lastSeen}));s.phase='lobby';s.time=0;s.winner=null;s.loot=[];s.containers=[];s.shots=[];s.grenades=[];s.explosions=[];}
export function startReload(p){const w=getWeapon(p);if(p.dead||p.onPlane||p.gliding||p.vehicleId||p.switchLeft>0||p.reload>0||p.heal>0||p.usingPain>0||!activeGun(p)||reserveAmmo(p)<=0||activeGun(p).ammo>=w.magazine)return false;p.reload=w.reload;return true;}
export function clearSight(a,b,doors){const len=Math.hypot(...b.map((v,i)=>v-a[i]));if(len<.01)return true;const d=b.map((v,i)=>(v-a[i])/len);return rayWorld(a,d,len,doors).distance>=len-.12;}
export function applyInput(s,p,input={}){
 if(!Number.isSafeInteger(input.seq)||input.seq<=p.lastSeq)return;p.lastSeq=input.seq;
 const num=(x,a,b)=>Number.isFinite(x)?clamp(x,a,b):0,stance=['stand','crouch','prone'].includes(input.stance)?input.stance:'stand';
 p.input={carSteer:num(input.carSteer,-1,1),carThrottle:num(input.carThrottle,0,1),carBrake:num(input.carBrake,0,1),mx:num(input.mx,-1,1),mz:num(input.mz,-1,1),yaw:num(input.yaw,-10000,10000),pitch:num(input.pitch,-1.25,1.25),fire:input.fire===true,sprint:input.sprint===true,aim:input.aim===true,stance,grenadeAim:input.grenadeAim===true,view:input.view==='first'?'first':'third'};
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
 if(action==='loot')loot(s,p);if(action&&typeof action==='object'){if(action.type==='loot')loot(s,p,action.itemId,action.slot);if(action.type==='take')takeFromContainer(s,p,action.containerId,action.itemId,action.slot);}if(action==='interact')interact(s,p);
 if(action==='reload'){p.usingPain=0;startReload(p);}
 if(action==='heal'&&p.hp<100&&p.meds>0&&!p.reload&&!p.heal){p.usingPain=0;p.heal=3;}
 if(action==='pain'&&!p.vehicleId&&!p.switchLeft&&p.painkillers>0&&!p.reload&&!p.heal&&!p.usingPain){p.usingPain=8;p.painStart={x:p.x,z:p.z,stance:p.stance};}
 if(action==='grenade')throwGrenade(s,p);
 const m=typeof action==='string'&&action.match(/^equip:([0-1])$/);if(m)beginSwitch(p,+m[1]);
}
export function beginSwitch(p,to){return startSwitch(p,to);}
export function interact(s,p){if(p.vehicleId)return enterOrExit(s,p);let closest=null,d=2.9;for(const door of DOORS){const distance=Math.hypot(p.x-door.x,p.z-door.z);if(distance<d&&Math.abs(p.y-door.y)<2){d=distance;closest=door;}}if(closest){if(s.doors[closest.id]){const box=doorBox(closest,false);if(s.players.some(q=>!q.dead&&Math.abs(q.y-closest.y)<2&&contains(box,q.x,q.z,.36)))return false;}s.doors[closest.id]=!s.doors[closest.id];return true;}return enterOrExit(s,p);}
export function canLoot(p,l){if(l.kind==='weapon')return!p.switchLeft&&!p.reload;if(l.kind==='ammo')return(p.bag[l.caliber]||0)<300;if(l.kind==='med')return p.meds<5;if(l.kind==='pain')return p.painkillers<5;if(l.kind==='grenade')return p.grenades<5;if(l.kind==='armor')return(l.armor==='helmet'?p.helmet:p.armor)<l.amount;return false;}
function closeEnough(s,p,l){return!p.dead&&!p.vehicleId&&(l.x-p.x)**2+(l.z-p.z)**2<2.65**2&&Math.abs(l.y-(p.y+.8))<1.8&&clearSight(eyePosition(p),[l.x,l.y,l.z],s.doors);}
function applyItem(s,p,item,slot){if(item.kind==='weapon')return takeWeapon(s,p,item,slot);
 if(item.kind==='ammo'){const n=Math.min(item.amount,300-(p.bag[item.caliber]||0));p.bag[item.caliber]=(p.bag[item.caliber]||0)+n;item.amount-=n;return n>0;}
 const field={med:'meds',pain:'painkillers',grenade:'grenades'}[item.kind];if(field){const n=Math.min(item.amount,5-p[field]);p[field]+=n;item.amount-=n;return n>0;}
 if(item.kind==='armor'){const field=item.armor==='helmet'?'helmet':'armor';if(p[field]>0)s.loot.push({id:'armor-drop-'+(++s.itemSeq),kind:'armor',armor:item.armor,amount:p[field],x:p.x,y:supportHeight(p.x,p.z,p.y+.5)+.1,z:p.z});p[field]=item.amount;item.amount=0;return true;}return false;
}
export function loot(s,p,itemId,slot){let best=null,d=2.65**2;for(const l of s.loot){if(itemId&&l.id!==itemId)continue;const dd=(l.x-p.x)**2+(l.z-p.z)**2;if(dd<d&&canLoot(p,l)&&closeEnough(s,p,l)){d=dd;best=l;}}if(!best||!applyItem(s,p,best,slot))return false;if(best.kind==='weapon'||best.amount===0)s.loot=s.loot.filter(l=>l.id!==best.id);return true;}
export function takeFromContainer(s,p,containerId,itemId,slot){const box=s.containers.find(c=>c.id===containerId);if(!box||!closeEnough(s,p,box))return false;const item=box.items.find(i=>i.id===itemId);if(!item||!canLoot(p,item)||!applyItem(s,p,item,slot))return false;if(item.kind==='weapon'||item.amount===0)box.items=box.items.filter(i=>i.id!==itemId);return true;}
export function eliminate(s,p,killer=null,zone='disconnect'){
 if(p.dead)return;p.dead=true;p.hp=0;p.input.fire=false;p.reload=p.heal=p.usingPain=0;dropEquipment(s,p);if(p.vehicleId){const v=s.vehicles.find(v=>v.id===p.vehicleId);if(v){v.driver=null;v.speed=0;}p.vehicleId=null;}
 if(killer&&killer!==p)killer.kills++;s.events.push({id:++s.shotId,text:`${killer?killer.name:zone==='zone'?'자기장':'탈락'} → ${p.name}${zone==='head'?' · HEADSHOT':''}`,at:s.time});s.events=s.events.slice(-6);const alive=s.players.filter(q=>!q.dead);if(alive.length<=1&&['flight','battle'].includes(s.phase)){s.phase='finished';s.winner=alive[0]?.id??null;}
}
export function damage(s,v,amount,killer,zone='torso'){
 if(v.dead||s.phase==='finished')return;if(zone==='torso'&&v.armor>0){const absorb=Math.min(v.armor,amount*.35);v.armor-=absorb;amount-=absorb;}if(zone==='head'&&v.helmet>0){const absorb=Math.min(v.helmet,amount*.18);v.helmet-=absorb;amount-=absorb;}v.hp=Math.max(0,v.hp-amount);v.heal=v.usingPain=0;v.lastHit={at:s.time,zone,amount};if(v.hp>0)return;
 eliminate(s,v,killer,zone);
}
export function fire(s,p){
 const w=getWeapon(p);if(p.dead||p.onPlane||p.gliding||p.vault||p.vehicleId||p.switchLeft||p.grenadeAim||p.view!=='first'||p.usingPain||p.heal||p.reload||!activeGun(p)||activeGun(p).ammo<=0||s.time+1e-6<p.nextShot||!['flight','battle'].includes(s.phase))return false;
 p.nextShot=s.time+w.interval;p.lastShot=s.time;setMagazine(p,activeGun(p).ammo-1);const random=rng(s.seed+s.shotId*31+p.seat*101),o=eyePosition(p),rays=[],hits=[];
 for(let pellet=0;pellet<(w.pellets||1);pellet++){
  const spread=w.spread*(p.stance==='prone'?.3:p.stance==='crouch'?.6:1)*(p.input.aim&&!w.pellets?.35:1),yaw=p.yaw+(random()-.5)*spread*2,pitch=p.pitch+(random()-.5)*spread*2;
  const d=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];let distance=Math.min(w.range,rayWorld(o,d,w.range,s.doors).distance),victim=null,zone=null;for(const v of s.vehicles||[])distance=Math.min(distance,rayVehicle(o,d,v,distance));
  for(const q of s.players){if(q===p||q.dead||q.onPlane)continue;const hit=hitBody(o,d,q,distance);if(hit&&hit.distance<distance){distance=hit.distance;victim=q;zone=hit.zone;}}
  if(pellet<4)rays.push(o.map((v,i)=>v+d[i]*distance));if(victim){hits.push({id:victim.id,zone});damage(s,victim,bodyDamage(w,zone),p,zone);}
 }
 s.shots.push({id:++s.shotId,by:p.id,weapon:p.weapon,from:o,to:rays[0],rays,at:s.time,hit:hits.length>0,zone:hits.some(h=>h.zone==='head')?'head':hits[0]?.zone});s.shots=s.shots.slice(-36);if(activeGun(p)&&activeGun(p).ammo===0)startReload(p);return true;
}
export function throwGrenade(s,p){if(s.time-(p.throwAt??-10)<.8||p.grenades<=0||p.onPlane||p.gliding||p.vehicleId||p.switchLeft||p.heal||p.reload||p.dead)return false;p.usingPain=0;p.grenades--;p.throwAt=s.time;p.view='third';s.grenades.push({id:++s.shotId,owner:p.id,...grenadeLaunch(p,s.doors,s.vehicles)});return true;}
function grenadesStep(s,dt){
 for(const g of s.grenades){moveGrenade(g,dt,s.doors,s.vehicles);
  if(g.fuse<=0){s.explosions.push({id:g.id,x:g.x,y:g.y,z:g.z,at:s.time});const owner=s.players.find(p=>p.id===g.owner);for(const p of s.players){const distance=Math.hypot(p.x-g.x,p.y+.7-g.y,p.z-g.z);if(distance<8&&!p.dead){const cover=clearSight([g.x,g.y+.15,g.z],[p.x,p.y+.8,p.z],s.doors)?1:.17;damage(s,p,Math.max(0,115*(1-distance/8))*cover,owner,'blast');}}}
 }
 s.grenades=s.grenades.filter(g=>g.fuse>0);s.explosions=s.explosions.filter(e=>s.time-e.at<6);
}
function botPath(p,item){
 const path=[],here=buildingsNear(p.x,p.z).find(b=>{const v=toLocal(b,p.x,p.z);return Math.abs(v.x)<b.w/2&&Math.abs(v.z)<b.d/2;}),dest=Number.isInteger(item.building)?BUILDINGS[item.building]:null;let from={x:p.x,z:p.z};
 if(here&&here!==dest){const floor=Math.min(here.floors,Math.max(0,Math.floor((p.y-here.y+.25)/here.level)));for(let f=floor-1;f>=0;f--)path.push(...here.routes[f].slice().reverse());path.push(localPoint(here,0,-here.d/2+1.9),localPoint(here,0,-here.d/2-2.1));from=path.at(-1);}
 if(dest&&here!==dest){const door=localPoint(dest,0,-dest.d/2-2.1);path.push(...routeBetween(from,door),localPoint(dest,0,-dest.d/2+1.9));from=path.at(-1);}
 if(dest){const floor=here===dest?Math.min(dest.floors,Math.max(0,Math.floor((p.y-dest.y+.25)/dest.level))):0;if(floor>(item.floor||0))for(let f=floor-1;f>=(item.floor||0);f--)path.push(...dest.routes[f].slice().reverse());else for(let f=floor;f<(item.floor||0);f++)path.push(...dest.routes[f]);}
 else path.push(...routeBetween(from,item));path.push({x:item.x,z:item.z,y:dest?dest.y+(item.floor||0)*dest.level:undefined});return path.map(q=>({...q}));
}
function bot(s,p,dt){
 const a=p.ai;if(p.onPlane){if(s.time>a.drop)beginJump(p,s.doors,s.vehicles);return;}if(p.gliding){const landing=a.landing||LANDING_POINTS[p.seat%LANDING_POINTS.length];p.input.mx=-clamp(angleDiff(Math.atan2(landing.x-p.x,landing.z-p.z),p.glideYaw??p.yaw)*1.5,-1,1);p.input.yaw=p.glideLookYaw??p.yaw;p.input.mz=.35;return;}
 a.think-=dt;if(a.think>0)return;a.think=.2;const random=rng(a.seed+Math.floor(s.time*5)*701);let target=null,best=70**2;
 for(const q of s.players){if(q===p||q.dead||q.onPlane)continue;const dx=q.x-p.x,dz=q.z-p.z,dd=dx*dx+dz*dz;if(q.stance==='prone'&&inGrass(q.x,q.z)&&dd>22*22)continue;const dot=(dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw))/Math.max(.01,Math.sqrt(dd));if(dd<best&&dot>.1&&clearSight(eyePosition(p),[q.x,q.y+stanceOf(q).eye*.8,q.z],s.doors)){target=q;best=dd;}}
 if(a.target!==target?.id){a.target=target?.id??null;a.react=.8+random()*.65;a.burst=0;a.pause=.2;}a.react-=.2;a.pause-=.2;let tx=p.x,tz=p.z;const outside=Math.hypot(p.x-s.zone.x,p.z-s.zone.z)>s.zone.r-9;
 p.input.fire=false;p.input.aim=!!target;p.input.sprint=!target;p.input.stance='stand';p.view=p.input.view=target?'first':'third';
 if(target&&activeGun(p)){
  const distance=Math.sqrt(best),available=p.loadout.map((g,i)=>g&&(g.ammo>0||p.bag[WEAPONS[g.weapon].caliber]>0)?i:null).filter(i=>i!==null),preferred=available.find(i=>distance>45?p.loadout[i].weapon===3:distance<12?p.loadout[i].weapon===4:p.loadout[i].weapon<3);if(preferred!==undefined)beginSwitch(p,preferred);
  const yaw=Math.atan2(target.x-p.x,target.z-p.z),pitch=Math.atan2(target.y+stanceOf(target).eye*.78-(p.y+stanceOf(p).eye),distance);p.input.stance=distance>24?(p.seat%4===0?'prone':'crouch'):'stand';
  const error=.018+Math.sin(s.time*1.2+a.seed)*.01;p.input.yaw=p.yaw+clamp(angleDiff(yaw,p.yaw),-.32,.32)+(random()-.5)*error;p.input.pitch=p.pitch+clamp(pitch-p.pitch,-.08,.08)+(random()-.5)*.025;
  if(a.pause<=0&&a.burst<=0){a.burst=.25+random()*.4;a.pause=0;}if(a.burst>0){a.burst-=.2;p.input.fire=a.react<=0&&Math.abs(angleDiff(yaw,p.yaw))<.16;if(a.burst<=0)a.pause=.45+random()*.8;}
  const sign=Math.sin(s.time*.5+p.seat)>0?1:-1;tx=p.x+Math.cos(yaw)*2*sign;tz=p.z-Math.sin(yaw)*2*sign;if(p.stance==='prone'){tx=p.x;tz=p.z;}
 }else{
  let item=null,d=Infinity,container=null;const carried=p.loadout.filter(Boolean),calibers=new Set(carried.map(g=>WEAPONS[g.weapon].caliber));
  const consider=(l,box)=>{if(!canLoot(p,l))return;if(l.kind==='weapon'&&carried.length>=2)return;if(l.kind==='ammo'&&(!calibers.has(l.caliber)||p.bag[l.caliber]>=(WEAPONS[carried.find(g=>WEAPONS[g.weapon].caliber===l.caliber)?.weapon]?.magazine||30)*3))return;if(l.kind==='pain'&&p.painkillers>=1||l.kind==='grenade'&&p.grenades>=2||l.kind==='med'&&p.meds>=2)return;const pos=box||l,priority=!activeGun(p)?(l.kind==='weapon'?.12:3):l.kind==='ammo'?.5:1,cost=((pos.x-p.x)**2+(pos.z-p.z)**2+Math.max(0,pos.y-p.y)*18)*priority;if(cost<d){d=cost;item={...l,x:pos.x,y:pos.y,z:pos.z,building:box?undefined:l.building};container=box;}};
  for(const l of s.loot)consider(l,null);for(const box of s.containers)for(const l of box.items)consider(l,box);
  if(item){if(Math.hypot(item.x-p.x,item.z-p.z)<2.6){if(container)takeFromContainer(s,p,container.id,item.id);else loot(s,p,item.id);}
   if(a.item!==item.id){a.item=item.id;a.route=botPath(p,item);}const point=a.route?.[0];if(point){tx=point.x;tz=point.z;if(Math.hypot(p.x-tx,p.z-tz)<.9&&(point.y===undefined||p.y>point.y-.5))a.route.shift();}else{tx=item.x;tz=item.z;}
  }else{if(Math.hypot(p.x-a.tx,p.z-a.tz)<5){a.tx=s.zone.x+(random()-.5)*s.zone.r;a.tz=s.zone.z+(random()-.5)*s.zone.r;}tx=a.tx;tz=a.tz;}
 }
 for(const d of DOORS)if(!s.doors[d.id]&&Math.hypot(p.x-d.x,p.z-d.z)<2.8&&Math.abs(p.y-d.y)<2)s.doors[d.id]=true;
 if(outside){if(!a.escape||s.time-a.escapeAt>8){a.escape=routeBetween(p,{x:s.zone.x,z:s.zone.z});a.escapeAt=s.time;}const q=a.escape[0]||s.zone;tx=q.x;tz=q.z;if(Math.hypot(p.x-tx,p.z-tz)<2)a.escape.shift();p.input.stance='stand';}if(p.hp<55&&!target)act(s,p,'heal');if(activeGun(p)&&activeGun(p).ammo===0)startReload(p);
 let dx=tx-p.x,dz=tz-p.z,n=Math.hypot(dx,dz);if(n<.4){p.input.mx=p.input.mz=0;}else{dx/=n;dz/=n;if(blocked(p.x+dx*.9,p.z+dz*.9,p.y,.32,stanceOf(p).height,.28,s.doors,s.vehicles)){const side=blocked(p.x+dz*.9,p.z-dx*.9,p.y,.32,stanceOf(p).height,.28,s.doors,s.vehicles)?-1:1;[dx,dz]=[dz*side,-dx*side];if(random()<.06)beginJump(p,s.doors,s.vehicles);}if(!target)p.input.yaw=p.yaw+clamp(angleDiff(Math.atan2(dx,dz),p.yaw),-.45,.45);p.input.mx=-dx*Math.cos(p.input.yaw)+dz*Math.sin(p.input.yaw);p.input.mz=dx*Math.sin(p.input.yaw)+dz*Math.cos(p.input.yaw);}
 p.yaw=p.input.yaw;p.pitch=p.input.pitch;
}
function nextZone(z,random,radius){for(let i=0;i<120;i++){const angle=random()*Math.PI*2,d=random()*Math.max(0,z.r-radius)*.65,x=clamp(z.x+Math.sin(angle)*d,-HALF+30,HALF-30),zz=clamp(z.z+Math.cos(angle)*d,-HALF+30,HALF-30),y=supportHeight(x,zz);if(!buildingsNear(x,zz).some(b=>{const q=toLocal(b,x,zz);return Math.abs(q.x)<b.w/2+3&&Math.abs(q.z)<b.d/2+3;})&&y-terrainHeight(x,zz)<.6&&riverDistance(x,zz)>22&&Math.hypot(terrainHeight(x+2,zz)-terrainHeight(x-2,zz),terrainHeight(x,zz+2)-terrainHeight(x,zz-2))<2.5&&!blocked(x,zz,y,.4,1.8))return{x,z:zz};}return{x:z.x,z:z.z};}
function zoneStep(s,dt){const z=s.zone;if(z.stage>=ZONE_RADII.length)return;z.left-=dt;if(z.closing){const t=clamp(1-z.left/z.duration,0,1);z.r=z.fromR+(z.nextR-z.fromR)*t;z.x=z.fromX+(z.nextX-z.fromX)*t;z.z=z.fromZ+(z.nextZ-z.fromZ)*t;}if(z.left<=0){if(z.closing){z.r=z.nextR;z.x=z.nextX;z.z=z.nextZ;z.closing=false;z.stage++;if(z.stage>=ZONE_RADII.length){z.r=0;z.left=99999;return;}z.left=ZONE_WAIT[z.stage];z.nextR=ZONE_RADII[z.stage];const target=nextZone(z,rng(s.seed+z.stage*433+s.round),z.nextR);z.nextX=target.x;z.nextZ=target.z;}else{z.closing=true;z.duration=ZONE_CLOSE[z.stage];z.left=z.duration;z.fromR=z.r;z.fromX=z.x;z.fromZ=z.z;}}}
export function step(s,dt=STEP){
 if(!['flight','battle'].includes(s.phase))return;s.time+=dt;updateVehicles(s,dt);if(s.phase==='flight'){s.phaseLeft-=dt;if(s.phaseLeft<=0){s.phase='battle';s.players.forEach(p=>{if(p.onPlane)if(!p.vehicleId)beginJump(p,s.doors,s.vehicles);});}}else zoneStep(s,dt);
 for(const p of s.players){if(p.dead)continue;if(p.bot)bot(s,p,dt);advanceSwitch(p,dt);if(p.onPlane){integrateMovement(p,p.input,dt,s.time,s.doors,s.vehicles);continue;}const i=p.input;if(!p.bot&&s.wallNow-p.lastSeen>1400){i.mx=i.mz=0;i.carThrottle=i.carBrake=i.carSteer=0;i.fire=false;}
  if(p.usingPain){if(Math.hypot(i.mx,i.mz)>.06||p.vault||p.stance!==p.painStart?.stance||Math.hypot(p.x-p.painStart.x,p.z-p.painStart.z)>.05){p.usingPain=0;p.useCancelled=s.time;}else{p.usingPain=Math.max(0,p.usingPain-dt);if(p.usingPain===0&&p.painkillers>0){p.painkillers--;p.boost=60;}}}
  if(p.boost>0){p.boost=Math.max(0,p.boost-dt);p.hp=Math.min(100,p.hp+dt*.5);}
  if(p.reload>0){p.reload=Math.max(0,p.reload-dt);if(p.reload===0){const w=getWeapon(p),gun=activeGun(p);if(gun){const n=Math.min(w.magazine-gun.ammo,p.bag[w.caliber]);gun.ammo+=n;p.bag[w.caliber]-=n;syncLoadout(p);}}}
  if(p.heal>0){p.heal=Math.max(0,p.heal-dt);if(p.heal===0&&p.meds>0){p.meds--;p.hp=Math.min(100,p.hp+50);}}
  if(!p.vehicleId)integrateMovement(p,i,dt,s.time,s.doors,s.vehicles);if(activeGun(p)&&activeGun(p).ammo===0)startReload(p);if(i.fire)fire(s,p);
  if(s.phase==='battle'&&Math.hypot(p.x-s.zone.x,p.z-s.zone.z)>s.zone.r)damage(s,p,(2+s.zone.stage*1.5)*dt,null,'zone');
 }
 grenadesStep(s,dt);s.shots=s.shots.filter(x=>s.time-x.at<6);
}
export function advance(s,now){const elapsed=Math.max(0,Math.min(3,(now-(s.lastWall||now))/1000));s.wallNow=now;let left=elapsed;while(left>1e-6){const dt=Math.min(STEP,left);step(s,dt);left-=dt;}s.lastWall=now;}
export function snapshot(s,you){const own=s.players.find(p=>p.id===you),near=l=>!own||Math.hypot(l.x-own.x,l.z-own.z)<120;return{code:s.code,mapId:s.mapId,flightRoute:s.flightRoute,rulesVersion:s.rulesVersion,ack:own?.lastSeq??-1,revision:s.revision||0,name:s.name,host:s.host,you,phase:s.phase,time:s.time,phaseLeft:s.phaseLeft,zone:s.zone,winner:s.winner,round:s.round,loot:s.loot.filter(near),containers:s.containers.filter(near).map(c=>({id:c.id,name:c.name,x:c.x,y:c.y,z:c.z,count:c.items.length,...(own&&closeEnough(s,own,c)?{items:c.items}:{} )})),doors:s.doors,vehicles:s.vehicles,shots:s.shots,grenades:s.grenades,explosions:s.explosions,events:s.events,players:s.players.map(({tokenHash,input,ai,lastSeen,lastSeq,...p})=>({...p,aim:input.aim,sprint:input.sprint}))};}
