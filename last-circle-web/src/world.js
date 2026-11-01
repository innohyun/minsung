import {rockContains,rockTop,rayRock} from './rock-geometry.js';
import {STANCES,stanceOf,rayCapsule} from './weapons.js';
import {clamp,smooth,angleDiff,rng} from './math.js';
import {ARENA,HALF,MAP_SIZE,MAP_ID,FLIGHT_HEIGHT,FLIGHT_SECONDS,FLIGHT_START,FLIGHT_SPAN,WATER_Y,POIS,BRIDGES,FORDS,ROADS,BUILDINGS,buildingsNear,riverX,branchZ,riverDistance,roadAt,landscapeHeight,naturalHeight,terrainHeight,heightFormula,heightCacheSize,flightPosition,LANDING_POINTS} from './map.js';
export {clamp,smooth,angleDiff,rng,ARENA,HALF,MAP_SIZE,MAP_ID,FLIGHT_HEIGHT,FLIGHT_SECONDS,FLIGHT_START,FLIGHT_SPAN,WATER_Y,POIS,BRIDGES,FORDS,ROADS,BUILDINGS,buildingsNear,riverX,branchZ,riverDistance,roadAt,landscapeHeight,naturalHeight,terrainHeight,heightFormula,heightCacheSize,flightPosition,LANDING_POINTS};
export const TERRAIN_SIZE=1536,TERRAIN_SEGMENTS=768;
export function localPoint(b,x,z,y=0){return{x:b.x+(b.rot?-z:x),z:b.z+(b.rot?x:z),y:b.y+y};}
export function toLocal(b,x,z){return{x:b.rot?z-b.z:x-b.x,z:b.rot?b.x-x:z-b.z};}
export const TREES=(()=>{const random=rng(771),out=[],cells=new Map();for(let i=0;i<23000;i++){const x=(random()-.5)*1530,z=(random()-.5)*1530,density=.49+.21*Math.sin(x*.009+z*.007)+.17*Math.cos(z*.017);if(random()>density||riverDistance(x,z)<20||roadAt(x,z).distance<6||buildingsNear(x,z).some(b=>Math.abs(x-b.x)<(b.rot?b.d:b.w)/2+5&&Math.abs(z-b.z)<(b.rot?b.w:b.d)/2+5)||POIS.some(p=>p.kind==='camp'&&Math.hypot(x-p.x,z-p.z)<12))continue;const cx=Math.floor(x/5),cz=Math.floor(z/5);let near=false;for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const q of cells.get((cx+dx)+','+(cz+dz))||[])if(Math.hypot(q.x-x,q.z-z)<4)near=true;if(near)continue;const t={x,z,y:terrainHeight(x,z),h:8+random()*9,type:Math.floor(random()*5),seed:i};out.push(t);const key=cx+','+cz;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(t);}return out;})();
export const GRASS_PATCHES=Array.from({length:150},(_,i)=>{const r=rng(431+i*113);return{x:(r()-.5)*1450,z:(r()-.5)*1450,r:12+r()*18};}).concat(POIS.flatMap((p,i)=>[[-70,25],[65,-40]].map(([x,z])=>({x:p.x+x,z:p.z+z,r:11+i%4})))).filter(p=>riverDistance(p.x,p.z)>19);
export const inGrass=(x,z)=>GRASS_PATCHES.some(p=>(x-p.x)**2+(z-p.z)**2<p.r*p.r);
export const DOORS=BUILDINGS.map(b=>({...localPoint(b,0,-b.d/2,0),id:'door-'+b.index,building:b.index,rot:b.rot,w:3.14,h:2.68}));
const doorCache=new Map();
export function doorBox(d,open){const key=d.id+':'+!!open;if(doorCache.has(key))return doorCache.get(key);const b=BUILDINGS[d.building],p=localPoint(b,open?-d.w/2:0,-b.d/2+(open?d.w/2:0));const box={...p,w:open?(b.rot?d.w:.16):(b.rot?.16:d.w),d:open?(b.rot?.16:d.w):(b.rot?d.w:.16),h:d.h,shape:'box',kind:'door',id:d.id};doorCache.set(key,box);return box;}
export function dynamicBoxes(doors,x,z){return doors?DOORS.filter(d=>x===undefined||Math.abs(d.x-x)<6&&Math.abs(d.z-z)<6).map(d=>doorBox(d,!!doors[d.id])):[];}
export const WINDOWS=BUILDINGS.flatMap(b=>{const out=[];for(let f=0;f<b.floors;f++){for(const side of [-1,1])for(const z of [-b.d*.2,b.d*.2]){const p=localPoint(b,side*b.w/2,z,f*b.level);out.push({...p,nx:b.rot?0:side,nz:b.rot?side:0,width:b.d*.4-2.2,building:b.index,floor:f});}for(const side of [-1,1]){if(side<0&&f===0)continue;for(const x of [-b.w*.19,b.w*.19]){const p=localPoint(b,x,side*b.d/2,f*b.level);out.push({...p,nx:b.rot?-side:0,nz:b.rot?0:side,width:b.w*.38-2.3,building:b.index,floor:f});}}}return out;});
export const LOOT_SPOTS=[];
export function mapGeometry(){
 const list=[];
 for(const b of BUILDINGS){
  const add=(lx,lz,w,d,h,y=0,kind='wall',color=b.color)=>{const p=localPoint(b,lx,lz,y);list.push({...p,w:b.rot?d:w,d:b.rot?w:d,h,kind,color,shape:'box',building:b.index});};
  const strip=5.4,main=b.w-strip,run=b.d-4,steps=18;
  add(0,0,b.w,b.d,.18,-.18,'floor',0x795738);add(0,0,b.w+.32,b.d+.32,.48,-.68,'foundation',0x685e4d);add(0,-b.d/2-.6,3.6,1.2,.2,-.4,'step',0x8b7a5b);
  // Every level has continuous wall sections and real window openings.
  for(let f=0;f<b.floors;f++){
   const y=f*b.level;
   for(const side of [-1,1]){
    add(side*b.w/2,0,.48,b.d,1,y);add(side*b.w/2,0,.48,b.d,1.15,y+2.25);
    for(const z of [-b.d*.4,0,b.d*.4])add(side*b.w/2,z,.48,2.2,1.25,y+1);
   }
   for(const z of [-b.d/2,b.d/2]){
    const door=f===0&&z<0?3.2:2.2;
    if(f===0&&z<0){add(-(b.w+door)/4,z,(b.w-door)/2,.48,3.4,y);add((b.w+door)/4,z,(b.w-door)/2,.48,3.4,y);add(0,z,door,.48,.7,y+2.7);}
    else{add(0,z,b.w,.48,1,y);add(0,z,b.w,.48,1.15,y+2.25);for(const x of [-b.w*.38,0,b.w*.38])add(x,z,2.3,.48,1.25,y+1);}
   }
  }
  // Floors and roofs share an enclosed U-stairwell: two separate lanes, no decorative fake roof.
  for(let f=1;f<=b.floors;f++){
   const y=f*b.level;add(-strip/2,0,main,b.d,.22,y-.22,f===b.floors?'roof':'floor',f===b.floors?0x5b5143:0x795738);
   const end=f%2===1?1:-1;add(b.w/2-strip/2,end*(b.d/2-1),strip,2,.22,y-.22,f===b.floors?'roof':'floor',0x756248);
  }
  b.routes=[];
  for(let f=0;f<b.floors;f++){
   const lane=b.w/2-(f%2===0?1.4:4),dir=f%2===0?1:-1;
   const route=[localPoint(b,lane,-dir*(run/2),f*b.level),localPoint(b,lane,dir*(b.d/2-.8), (f+1)*b.level),localPoint(b,b.w/2-strip-.9,dir*(b.d/2-1.6),(f+1)*b.level)];b.routes.push(route);
   for(let j=0;j<steps;j++){const z=-dir*run/2+dir*(j+.5)*run/steps,top=(j+1)*b.level/steps;add(lane,z,2.35,run/steps+.025,top,f*b.level,'step',0x929c97);}
  }
  const roof=b.h,exit=b.floors%2===1?1:-1,cx=b.w/2-strip/2;
  // Weatherproof roof over the stair opening, with a doorway onto the walkable roof.
  add(cx,0,strip,b.d,.22,roof+2.55,'roof',0x5d5845);
  add(b.w/2,0,.35,b.d,2.55,roof,'stairwall',0x846443);
  for(const end of [-1,1])add(cx,end*b.d/2,strip,.35,2.55,roof,'stairwall',0x846443);
  const doorway=2.6,doorZ=exit*(b.d/2-2.1),left=b.w/2-strip;
  const lo=-b.d/2,hi=b.d/2;
  if(doorZ-doorway/2>lo)add(left,(lo+doorZ-doorway/2)/2,.35,doorZ-doorway/2-lo,2.55,roof,'stairwall',0x846443);
  if(doorZ+doorway/2<hi)add(left,(hi+doorZ+doorway/2)/2,.35,hi-doorZ-doorway/2,2.55,roof,'stairwall',0x846443);
  add(left,doorZ,.35,doorway,.4,roof+2.15,'stairwall',0x846443);
  for(const z of [-b.d/2,b.d/2]){if(b.index===0&&z<0){const lo=-b.w/2,hi=b.w/2-strip;add((lo-1.6)/2,z,-1.6-lo,.25,.65,roof,'parapet',0x6a5942);if(hi>1.6)add((hi+1.6)/2,z,hi-1.6,.25,.65,roof,'parapet',0x6a5942);}else add(-strip/2,z,main,.25,.65,roof,'parapet',0x6a5942);}
  if(b.index===1){for(const side of [-1,1])add(-b.w/2,side*(b.d/4+.8),.25,b.d/2-1.6,.65,roof,'parapet',0x6a5942);}else add(-b.w/2,0,.25,b.d,.65,roof,'parapet',0x6a5942);
  const porch=['cottage','farmhouse','lodge','cabin','courtyard','hunter','lumberjack'].includes(b.style),balcony=b.floors===2&&['farmhouse','lodge','courtyard'].includes(b.style);
  if(porch){const pw=b.w*.74;add(0,-b.d/2-1.5,pw,3,.2,-.4,'porch',0x8e6e48);const roofY=balcony?b.level-.08:2.8;add(0,-b.d/2-1.4,pw+.3,2.9,.18,roofY-.18,balcony?'balcony':'awning',0x806241);for(const side of[-1,1])add(side*(pw/2-.2),-b.d/2-2.6,.18,.18,roofY,0,'post',0x725235);if(balcony){add(0,-b.d/2-2.8,pw,.15,.75,roofY,'balcony-rail',0x685039);for(const side of[-1,1])add(side*pw/2,-b.d/2-1.5,.15,2.8,.75,roofY,'balcony-rail',0x685039);}}
  // Supplies live on tables/shelves, both ground and upper floor, never scattered along roads.
  const spots=[[-b.w*.22,-b.d*.24,0],[-b.w*.22,b.d*.24,0],[-b.w*.08,0,b.floors>1?b.level:0]];
  spots.forEach(([x,z,y],i)=>{add(x,z,2.8,1.15,.84,y,'table',0x906b45);for(let k=0;k<3;k++){const p=localPoint(b,x+(k-1)*.8,z,y+.96);LOOT_SPOTS.push({...p,id:`b${b.index}t${i}i${k}`,building:b.index,floor:y?1:0,zone:b.zone,outdoor:false,category:'table'});}});
  add(-b.w*.25,b.d*.43,3,.6,1.6,0,'shelf',0x76573b);
  for(let f=0;f<b.floors;f++)for(const [x,z]of[[-b.w*.3,-b.d*.12],[-b.w*.4,b.d*.1],[b.w*.06,-b.d*.27],[b.w*.08,b.d*.27]]){const p=localPoint(b,x,z,f*b.level+.09);LOOT_SPOTS.push({...p,id:`b${b.index}f${f}-${x}-${z}`,building:b.index,floor:f,zone:b.zone,outdoor:false,category:'floor'});}
  if(b.style==='lumberjack'){add(-b.w*.37,-.4,1.25,2.2,.84,0,'workbench',0x987142);add(-b.w*.35,-.4,.8,.9,.15,.84,'wood-offcut',0xb68c54);for(let i=0;i<4;i++)add(-b.w*.43,b.d*.41-i*.55,.65,.45,.3,0,'split-wood',0x9b733f);add(-b.w*.43,-b.d*.16,.06,.12,1.1,.3,'axe-handle',0x967547);add(-b.w*.43,-b.d*.16,.16,.38,.3,1.2,'axe-head',0x65726c);}
  if(b.style==='hunter'){add(b.w*.04,b.d*.41,1.1,.9,1,0,'stove',0x454e48);add(b.w*.04,b.d*.41,.19,.19,1.6,1,'chimney',0x62675a);for(const side of[-1,1]){add(-b.w*.38+side*.3,b.d*.46,.12,.16,.7,1.7,'antler',0xc0b28c);add(-b.w*.38+side*.45,b.d*.46,.4,.13,.13,2.15,'antler',0xc0b28c);}add(-b.w*.36,-.4,1.1,1.8,.18,0,'bedroll',0x5e7153);add(-b.w*.42,-.4,.16,1.9,1.4,.25,'tool-rack',0x8c6940);}
  // Room partitions leave a full doorway and keep the stair lane clear.
  for(let f=0;f<b.floors;f++){const y=f*b.level;add(-b.w*.27,1.4,b.w*.42,.22,2.9,y,'partition',0x8b6948);add(-b.w*.27,b.d*.32,3.3,1.5,.5,y,'bed',0x665846);add(-b.w*.31,b.d*.32,3.1,1.3,.16,y+.5,'mattress',0x818372);add(-b.w*.35,-b.d*.35,.8,1.2,1.7,y,'cabinet',0x67482e);}

 }
 for(const bridge of BRIDGES){list.push({...bridge,h:.45,y:bridge.y-.45,shape:'box',kind:'roadbridge',color:0x8a8068});for(const side of [-1,1])list.push({x:bridge.x+(bridge.rot?side*(bridge.w/2-.15):0),z:bridge.z+(bridge.rot?0:side*(bridge.d/2-.15)),y:bridge.y,w:bridge.rot?.26:bridge.w,d:bridge.rot?bridge.d:.26,h:.85,shape:'box',kind:'bridge-rail',color:0x6c705e});}
 // Contextual outdoor supplies sit on pallets and work benches beside cover.
 for(const poi of POIS){const count=Math.max(poi.outdoor?Math.ceil(poi.outdoor/2):0,poi.kind==='camp'?1:0);for(let i=0;i<count;i++){let x=poi.x+(poi.kind==='camp'?(i-1)*7:(i%3-1)*9),z=poi.z+(poi.kind==='camp'?0:poi.kind==='port'?66:poi.kind==='ruins'?-58:poi.kind==='quarry'?52:70+Math.floor(i/3)*8);const base=Math.max(terrainHeight(x-1.5,z-.6),terrainHeight(x+1.5,z+.6),terrainHeight(x,z))+.04,h=poi.kind==='ruins'?.45:.72;list.push({x,z,y:base,w:3.2,d:1.4,h,kind:poi.kind==='ruins'?'stone-supply':'supply-pallet',color:poi.kind==='ruins'?0x7a8065:0x92734a,shape:'box'});for(let slot=0;slot<6;slot++){LOOT_SPOTS.push({id:`${poi.id}-yard-${i}-${slot}`,x:x+(slot%3-1)*.9,z:z+(slot<3?-.28:.28),y:base+h+.1,zone:poi.id,outdoor:true,category:'pallet'});}if(i%2===0)list.push({x:x-4,z:z+2,y:terrainHeight(x-4,z+2),w:2,d:1.3,h:1.2,kind:'crate',color:0x81633e,shape:'box'});}
  if(poi.kind==='camp'){for(const side of[-1,1])list.push({x:poi.x+side*3,z:poi.z-2,y:terrainHeight(poi.x+side*3,poi.z-2),w:.15,d:.15,h:2.6,kind:'camp-post',color:0x796443,shape:'box'});list.push({x:poi.x,z:poi.z-2,y:Math.max(terrainHeight(poi.x-3,poi.z-2),terrainHeight(poi.x+3,poi.z-2))+2.6,w:7,d:5,h:.12,kind:'tarp',color:0x777e50,shape:'box'});}
  if(poi.kind==='port')for(let i=0;i<12;i++){const x=poi.x-65+(i%4)*14,z=poi.z-70+Math.floor(i/4)*9;list.push({x,z,y:terrainHeight(x,z),w:11.5,d:5,h:2.5+(i%4===0?2.5:0),kind:'container',color:[0x697b71,0x8b7454,0x626b78][i%3],shape:'box'});}
  if(poi.kind==='ruins')for(let i=0;i<12;i++){const x=poi.x-60+(i%4)*18,z=poi.z+30+Math.floor(i/4)*13;list.push({x,z,y:terrainHeight(x,z),w:i%2?1.7:9,d:1.4,h:i%3?1.2:3,kind:'ruin-wall',color:0x747f63,shape:'box'});}
 }
 const r=rng(1277);for(let i=0;i<460;i++){const x=(r()-.5)*1450,z=(r()-.5)*1450,sx=terrainHeight(x+2,z)-terrainHeight(x-2,z),sz=terrainHeight(x,z+2)-terrainHeight(x,z-2),slope=Math.hypot(sx,sz)/4;if(slope<.12||slope>.9||roadAt(x,z).distance<12||riverDistance(x,z)<25||buildingsNear(x,z).some(b=>Math.abs(x-b.x)<30&&Math.abs(z-b.z)<30))continue;const yaw=Math.atan2(sz,-sx);for(let k=0;k<2+i%3;k++){const a=yaw+(r()-.5)*.3,xx=x+Math.cos(a)*(k-1)*5,zz=z-Math.sin(a)*(k-1)*5;list.push({x:xx,z:zz,w:5+r()*8,d:3+r()*5,h:1.6+r()*3.2,y:terrainHeight(xx,zz)-.9,shape:'bedrock',yaw:a,kind:'outcrop',color:i%3?0x858d77:0x747c6b});}}
 for(let i=0;i<TREES.length;i+=53){const t=TREES[i],yaw=(t.seed%100)*.06283,length=4.5+(i%4),x=t.x+Math.sin(yaw)*3,z=t.z+Math.cos(yaw)*3;if(roadAt(x,z).distance<9||riverDistance(x,z)<22||buildingsNear(x,z).some(b=>Math.abs(x-b.x)<24&&Math.abs(z-b.z)<24))continue;list.push({x,z,y:terrainHeight(x,z)-.12,w:.72,d:length,h:.72,shape:'log',yaw,kind:'fallen-log',color:0x736044});list.push({x:t.x+.9,z:t.z+.8,y:t.y,w:1.05,d:1.05,h:.72,shape:'cylinder',kind:'stump',color:0x8a704b});}
 // Root plates and eroded banks belong to fallen timber, creating low natural cover.
 for(let i=0;i<TREES.length;i+=83){const t=TREES[i],x=t.x+1.8,z=t.z+1.3;if(roadAt(x,z).distance<10||riverDistance(x,z)<23||buildingsNear(x,z).some(b=>Math.hypot(b.x-x,b.z-z)<29))continue;list.push({x,z,y:terrainHeight(x,z)-.35,w:2.6,d:1.6,h:1.45,shape:'bedrock',yaw:t.seed*.19,kind:'root-plate',color:0x655c3d});}
 for(const poi of POIS.filter(p=>p.kind==='village'))for(const side of[-1,1])for(let i=0;i<4;i++){const x=poi.x+side*(54+i*2),z=poi.z+25+i*9;list.push({x,z,y:terrainHeight(x,z),w:.16,d:6.5,h:1.1,shape:'box',kind:'farm-fence',color:0x807450});}
 // A separate enclosed arena, outside the survival map's movement bounds.
 const a=ARENA,addArena=(x,z,w,d,h,y=0,kind='arena-cover',color=0x828374,shape='box')=>list.push({x:a.x+x,z:a.z+z,w,d,h,y:a.y+y,kind,color,shape});
 for(const side of[-1,1]){addArena(side*37,0,.7,66,5,0,'arena-boundary');addArena(0,side*33,74,.7,5,0,'arena-boundary');addArena(side*25,side*26,22,12,3,0,'arena-platform',0x796b53);addArena(side*25,side*26,22,12,.2,6.2,'arena-roof',0x695c44);for(const corner of[-1,1])for(const end of[-1,1])addArena(side*25+corner*10.5,side*26+end*5.5,.24,.24,3.2,3,'arena-post',0x776548);addArena(side*25,side*31,22,.3,1.2,3,'arena-rail');addArena(side*33,side*26,.3,12,1.2,3,'arena-rail');addArena(side*24,side*23,4,.6,1.15,3,'arena-spawn-cover',0x786b4e);for(let j=0;j<18;j++)addArena(side*17,side*(12+j*.48),3,.5,(j+1)/6,0,'arena-step');
  addArena(side*12,side*5,11,4.5,2.5,0,'arena-container',side>0?0x526d6b:0x80704c);addArena(side*24,-side*5,5,1.1,1.15,0,'arena-sandbag',0x9a9270);addArena(side*25,-side*13,1.1,8,1.15,0,'arena-sandbag',0x9a9270);addArena(side*4,-side*16,5,2.7,1.7,0,'arena-crate',0x92734a);addArena(side*2,side*3,1.8,2.6,2.8,0,'arena-pillar');for(let j=0;j<3;j++)addArena(side*(19+j),side*14,1.1,1.1,1.3,0,'arena-barrel',j%2?0x646e6a:0x8a754f,'cylinder');}
 for(const t of TREES)list.push({x:t.x,z:t.z,w:.55,d:.55,h:t.h*.65,y:t.y,shape:'cylinder',kind:'trunk',color:0x6a593f});
 return list;
}
export const BOXES=mapGeometry();
const CELL=12,grid=new Map(),neighborhoods=new Map();
for(const b of BOXES){const rotated=b.shape==='bedrock'||b.shape==='log'||b.shape==='obb',c=rotated?Math.abs(Math.cos(b.yaw||0)):1,s=rotated?Math.abs(Math.sin(b.yaw||0)):0,w=c*b.w+s*b.d,d=s*b.w+c*b.d;for(let x=Math.floor((b.x-w/2)/CELL);x<=Math.floor((b.x+w/2)/CELL);x++)for(let z=Math.floor((b.z-d/2)/CELL);z<=Math.floor((b.z+d/2)/CELL);z++){const key=x+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(b);}}
export function nearby(x,z){const cx=Math.floor(x/CELL),cz=Math.floor(z/CELL),key=cx+','+cz;if(!neighborhoods.has(key)){const set=new Set();for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const b of grid.get((cx+dx)+','+(cz+dz))||[])set.add(b);neighborhoods.set(key,[...set]);}return neighborhoods.get(key);}
function rayCandidates(o,d,max){const set=new Set();let x=Math.floor(o[0]/CELL),z=Math.floor(o[2]/CELL),t=0;const sx=d[0]>=0?1:-1,sz=d[2]>=0?1:-1,dx=Math.abs(d[0])<1e-8?Infinity:CELL/Math.abs(d[0]),dz=Math.abs(d[2])<1e-8?Infinity:CELL/Math.abs(d[2]);let tx=dx===Infinity?Infinity:((x+(sx>0?1:0))*CELL-o[0])/d[0],tz=dz===Infinity?Infinity:((z+(sz>0?1:0))*CELL-o[2])/d[2];
 for(let n=0;n<150&&t<=max;n++){for(const b of grid.get(x+','+z)||[])set.add(b);if(tx===Infinity&&tz===Infinity)break;if(tx<tz){t=tx;tx+=dx;x+=sx;}else{t=tz;tz+=dz;z+=sz;}}
 return set;
}

export const vehicleBoxes=(vehicles,x,z)=>(vehicles||[]).filter(v=>x===undefined||Math.abs(v.x-x)<7&&Math.abs(v.z-z)<7).map(v=>({x:v.x,z:v.z,y:v.y+.2,w:1.9,d:3.8,h:1.6,yaw:v.yaw,shape:'obb'}));
export function contains(b,x,z,pad=0){if(b.shape==='bedrock')return rockContains(b,x,z,pad);if(b.shape==='log'){const q=toLog(b,x,z),zv=Math.max(-b.d/2+.36,Math.min(b.d/2-.36,q.z));return q.x*q.x+(q.z-zv)**2<(.36+pad)**2;}if(b.shape==='obb'){const dx=x-b.x,dz=z-b.z,c=Math.cos(b.yaw),s=Math.sin(b.yaw);return Math.abs(dx*c-dz*s)<b.w/2+pad&&Math.abs(dx*s+dz*c)<b.d/2+pad;}if(b.shape==='ellipsoid'||b.shape==='cylinder'){return((x-b.x)/(b.w/2+pad))**2+((z-b.z)/(b.d/2+pad))**2<1;}return Math.abs(x-b.x)<b.w/2+pad&&Math.abs(z-b.z)<b.d/2+pad;}
function toLog(b,x,z){const dx=x-b.x,dz=z-b.z,c=Math.cos(b.yaw||0),s=Math.sin(b.yaw||0);return{x:dx*c-dz*s,z:dx*s+dz*c};}
export function topAt(b,x,z){if(!contains(b,x,z))return-Infinity;if(b.shape==='bedrock')return rockTop(b,x,z);if(b.shape==='log'){const q=toLog(b,x,z);return b.y+.36+Math.sqrt(Math.max(0,.36**2-q.x*q.x));}if(b.shape==='ellipsoid'){const n=1-((x-b.x)/(b.w/2))**2-((z-b.z)/(b.d/2))**2;return b.y+b.h/2+b.h/2*Math.sqrt(Math.max(0,n));}return b.y+b.h;}
export function rayBox(o,d,b,max=1e4){
 if(b.shape==='bedrock')return rayRock(o,d,b,max);if(b.shape==='log'){const sx=Math.sin(b.yaw||0)*(b.d/2-.36),sz=Math.cos(b.yaw||0)*(b.d/2-.36);return rayCapsule(o,d,[b.x-sx,b.y+.36,b.z-sz],[b.x+sx,b.y+.36,b.z+sz],.36,max);}if(b.shape==='obb'){const q=toLog(b,o[0],o[2]),c=Math.cos(b.yaw),s=Math.sin(b.yaw);return rayBox([q.x,o[1],q.z],[d[0]*c-d[2]*s,d[1],d[0]*s+d[2]*c],{...b,x:0,z:0,shape:'box'},max);}
 if(b.shape==='ellipsoid'){
  const c=[b.x,b.y+b.h/2,b.z],r=[b.w/2,b.h/2,b.d/2],v=o.map((x,i)=>(x-c[i])/r[i]),w=d.map((x,i)=>x/r[i]),A=w.reduce((s,x)=>s+x*x,0),B=v.reduce((s,x,i)=>s+x*w[i],0),C=v.reduce((s,x)=>s+x*x,0)-1,h=B*B-A*C;if(h<0)return Infinity;const t=(-B-Math.sqrt(h))/A,far=(-B+Math.sqrt(h))/A;return far>=0&&t<=max?Math.max(0,t):Infinity;
 }
 if(b.shape==='cylinder'){
  const ox=(o[0]-b.x)/(b.w/2),oz=(o[2]-b.z)/(b.d/2),dx=d[0]/(b.w/2),dz=d[2]/(b.d/2),A=dx*dx+dz*dz,B=ox*dx+oz*dz,C=ox*ox+oz*oz-1;let near=Infinity;
  const h=B*B-A*C;if(A>1e-9&&h>=0)for(const t of [(-B-Math.sqrt(h))/A,(-B+Math.sqrt(h))/A])if(t>=0&&t<=max&&o[1]+d[1]*t>=b.y&&o[1]+d[1]*t<=b.y+b.h)near=Math.min(near,t);
  if(Math.abs(d[1])>1e-9)for(const y of [b.y,b.y+b.h]){const t=(y-o[1])/d[1];if(t>=0&&t<=max&&contains(b,o[0]+d[0]*t,o[2]+d[2]*t))near=Math.min(near,t);}return near;
 }
 let near=0,far=max;for(const[i,min,mx]of[[0,b.x-b.w/2,b.x+b.w/2],[1,b.y,b.y+b.h],[2,b.z-b.d/2,b.z+b.d/2]]){if(Math.abs(d[i])<1e-8){if(o[i]<min||o[i]>mx)return Infinity;}else{let a=(min-o[i])/d[i],c=(mx-o[i])/d[i];if(a>c)[a,c]=[c,a];near=Math.max(near,a);far=Math.min(far,c);if(near>far)return Infinity;}}return near;
}
export function rayTerrain(o,d,max){let last=0;for(let t=.35;t<max;t+=1.2){if(o[1]+d[1]*t<=terrainHeight(o[0]+d[0]*t,o[2]+d[2]*t)){let lo=last,hi=t;for(let i=0;i<8;i++){const m=(lo+hi)/2;if(o[1]+d[1]*m<=terrainHeight(o[0]+d[0]*m,o[2]+d[2]*m))hi=m;else lo=m;}return hi;}last=t;}return Infinity;}
export function rayWorld(o,d,max,doors){let distance=rayTerrain(o,d,max),object=null;for(const b of rayCandidates(o,d,Math.min(max,distance))){const t=rayBox(o,d,b,Math.min(max,distance));if(t<distance){distance=t;object=b;}}for(const b of dynamicBoxes(doors)){const t=rayBox(o,d,b,Math.min(max,distance));if(t<distance){distance=t;object=b;}}return{distance,object};}
function collisionCandidates(x,z,r=0){const minX=Math.floor((x-r)/CELL),maxX=Math.floor((x+r)/CELL),minZ=Math.floor((z-r)/CELL),maxZ=Math.floor((z+r)/CELL);if(minX===maxX&&minZ===maxZ)return grid.get(minX+','+minZ)||[];const set=new Set();for(let cx=minX;cx<=maxX;cx++)for(let cz=minZ;cz<=maxZ;cz++)for(const b of grid.get(cx+','+cz)||[])set.add(b);return set;}
export function blocked(x,z,y=terrainHeight(x,z),r=.32,height=1.78,step=.0,doors,vehicles){const hit=b=>{if(b.y>=y+height-.04||b.y+b.h<=y+.045||!contains(b,x,z,r))return false;const top=b.shape==='bedrock'?rockTop(b,x,z):b.y+b.h;return top>y+.045&&!(top<=y+step&&b.y<=y+.1);};for(const b of collisionCandidates(x,z,r))if(hit(b))return true;for(const b of dynamicBoxes(doors,x,z))if(hit(b))return true;for(const b of vehicleBoxes(vehicles,x,z))if(hit(b))return true;return false;}
export function supportHeight(x,z,ceiling=Infinity,vehicles){let h=terrainHeight(x,z);if(riverDistance(x,z)<9&&h<WATER_Y-.85&&WATER_Y-.85<=ceiling+.06)h=WATER_Y-.85;for(const b of collisionCandidates(x,z)){const top=topAt(b,x,z);if(top<=ceiling+.06&&top>h)h=top;}for(const b of vehicleBoxes(vehicles,x,z)){const top=topAt(b,x,z);if(top<=ceiling+.06&&top>h)h=top;}return h;}
function actorBlocked(p,x,z,step=0,stance=p.stance||'stand',doors,vehicles){const s=STANCES[stance]||STANCES.stand;const positions=stance==='prone'?[-.88,-.3,.3,.65]:[0];return positions.some(t=>blocked(x+Math.sin(p.yaw)*t,z+Math.cos(p.yaw)*t,p.y,s.radius,s.height,step,doors,vehicles));}
export function move(p,dx,dz,doors,vehicles){const accept=(x,z)=>{const g=terrainHeight(x,z),og=terrainHeight(p.x,p.z),distance=Math.hypot(x-p.x,z-p.z),step=p.stance==='prone'?.12:.27;return !(p.y<og+.3&&g-og>distance*1.12+.03)&&g<=p.y+step&&!actorBlocked(p,x,z,step,p.stance,doors,vehicles);};const x=clamp(p.x+dx,p.bounds?.minX??-HALF,p.bounds?.maxX??HALF),z=clamp(p.z+dz,p.bounds?.minZ??-HALF,p.bounds?.maxZ??HALF);if(accept(x,p.z))p.x=x;if(accept(p.x,z))p.z=z;}
export function beginJump(p,doors,vehicles){
 if(p.knockdown)return false;if(p.onPlane){p.onPlane=false;p.falling=true;p.gliding=p.chute=false;p.glideYaw=p.yaw;p.glideLookYaw=p.yaw;p.vy=-5;p.vx=Math.sin(p.yaw)*10;p.vz=Math.cos(p.yaw)*10;return true;}
 if(p.falling){p.falling=false;p.gliding=p.chute=true;p.chuteOpen=0;p.glideYaw=p.yaw;p.glideLookYaw=p.yaw;return true;}
 if(p.vault||p.gliding||p.stance!=='stand'||p.y>supportHeight(p.x,p.z,p.y+.1,vehicles)+.16)return false;
 // Windows use a tucked body: lift, pass through the opening, then lower.
 for(const w of WINDOWS){const along=(p.x-w.x)*w.nx+(p.z-w.z)*w.nz,side=along>=0?1:-1,tangent=Math.abs((p.x-w.x)*w.nz-(p.z-w.z)*w.nx),facing=-(Math.sin(p.yaw)*w.nx+Math.cos(p.yaw)*w.nz)*side;if(Math.abs(p.y-w.y)<.55&&Math.abs(along)<1.55&&Math.abs(along)>.35&&tangent<w.width/2-.38&&facing>.7){const x=p.x-w.nx*(along+side*1.05),z=p.z-w.nz*(along+side*1.05);const floor=Math.max(supportHeight(x,z,w.y+.2),w.y-.4);if(!blocked(x,z,floor,.3,1.78,0,doors)&&!blocked(w.x,w.z,w.y+1.04,.27,.96,0,doors)){p.vault={x0:p.x,y0:p.y,z0:p.z,x,z,y:floor,t:0,h:w.y+1.04,window:true,duration:.74};return true;}}}
 // Vault only a narrow, reachable obstacle, with a clear landing and headroom.
 const sx=Math.sin(p.yaw),sz=Math.cos(p.yaw);for(const b of nearby(p.x,p.z)){const distance=rayBox([p.x,p.y+.7,p.z],[sx,0,sz],b,1.35),top=b.y+b.h;if(distance<1.35&&top<=p.y+2.15&&top>p.y+.45){for(const span of [1.7,2.1,2.6]){const x=clamp(p.x+sx*span,p.bounds?.minX??-HALF,p.bounds?.maxX??HALF),z=clamp(p.z+sz*span,p.bounds?.minZ??-HALF,p.bounds?.maxZ??HALF),y=supportHeight(x,z,top+.28);if(y<=p.y+2.2&&!blocked(x,z,y,.34,1.78,0,doors)){const h=Math.max(top,p.y,y)+.48;let clear=true;for(const t of [.2,.4,.6,.8]){const qx=p.x+(x-p.x)*t,qz=p.z+(z-p.z)*t,qy=p.y+(y-p.y)*t+Math.sin(t*Math.PI)*(h-Math.max(p.y,y));if(nearby(qx,qz).some(q=>q!==b&&q.y<qy+1.78-.04&&q.y+q.h>qy+.05&&contains(q,qx,qz,.3))){clear=false;break;}}if(clear){p.vault={x0:p.x,y0:p.y,z0:p.z,x,z,y,t:0,h};return true;}}}}}
 p.vy=8.4;p.jumpTime=0;p.landPose=0;return true;
}
export function integrateMovement(p,i,dt,time=0,doors,vehicles){
 if(p.dead){p.vx=p.vz=0;return;}if(p.vehicleId)return;const oldX=p.x,oldZ=p.z;
 if(p.knockdown>0){p.knockdown=Math.max(0,p.knockdown-dt);p.stance='prone';move(p,(p.vx||0)*dt,(p.vz||0)*dt,doors,vehicles);p.vx*=Math.exp(-dt*2.6);p.vz*=Math.exp(-dt*2.6);p.vy=(p.vy||0)-18*dt;const floor=supportHeight(p.x,p.z,p.y+.2,vehicles);p.y=Math.max(floor,p.y+p.vy*dt);if(p.y<=floor+.02)p.vy=0;if(!p.knockdown&&!actorBlocked(p,p.x,p.z,0,'stand',doors,vehicles))p.stance='stand';return;}if(p.onPlane){const f=flightPosition(time,p.flightRoute||0);p.x=f.x;p.z=f.z;p.y=f.y;p.vx=Math.sin(f.yaw)*FLIGHT_SPAN/FLIGHT_SECONDS;p.vz=Math.cos(f.yaw)*FLIGHT_SPAN/FLIGHT_SECONDS;p.vy=0;return;}
 if(p.vault){const v=p.vault;v.t+=dt;const a=clamp(v.t/(v.duration||.52),0,1),t=v.window?smooth(.22,.78,a):a*a*(3-2*a);p.x=v.x0+(v.x-v.x0)*t;p.z=v.z0+(v.z-v.z0)*t;p.y=v.window?(a<.22?v.y0+(v.h-v.y0)*smooth(0,.22,a):v.h+(v.y-v.h)*smooth(.78,1,a)):v.y0+(v.y-v.y0)*t+Math.sin(t*Math.PI)*(v.h-Math.max(v.y0,v.y));p.vx=(p.x-oldX)/dt;p.vz=(p.z-oldZ)/dt;p.vy=0;if(a>=1)p.vault=null;return;}
 if(p.falling){const n=Math.max(1,Math.hypot(i.mx||0,i.mz||0)),speed=9+Math.max(0,i.mz||0)*5,a=1-Math.exp(-dt*3);p.vx+=(Math.sin(i.yaw)*speed-Math.cos(i.yaw)*(i.mx||0)*6/n-p.vx)*a;p.vz+=(Math.cos(i.yaw)*speed+Math.sin(i.yaw)*(i.mx||0)*6/n-p.vz)*a;p.vy=Math.max(-55,p.vy-28*dt);move(p,p.vx*dt,p.vz*dt,doors,vehicles);const oldY=p.y;p.y+=p.vy*dt;const ground=supportHeight(p.x,p.z,oldY,vehicles);if(p.y<=ground){p.landImpact=-p.vy;p.y=ground;p.vy=0;p.falling=false;p.landPose=.24;}return;}
 if(p.gliding){p.chuteOpen=Math.min(1,(p.chuteOpen||0)+dt/ .65);
  const heading=p.glideYaw??p.yaw,lookDelta=angleDiff(i.yaw,p.glideLookYaw??i.yaw);p.glideLookYaw=i.yaw;
  const turn=clamp(-(i.mx||0)*1.45+clamp(lookDelta/Math.max(dt,.001),-1.5,1.5),-1.75,1.75);
  p.glideYaw=heading+turn*dt;p.bank=(p.bank||0)+(clamp(-turn*.34,-.55,.55)-(p.bank||0))*(1-Math.exp(-dt*5));
  const speed=11+(i.mz||0)*4,sink=5.3+Math.max(0,i.mz||0)*2-Math.min(0,i.mz||0)*.4,a=1-Math.exp(-dt*2.5);p.vx=(p.vx||0)+(Math.sin(p.glideYaw)*speed-(p.vx||0))*a;p.vz=(p.vz||0)+(Math.cos(p.glideYaw)*speed-(p.vz||0))*a;p.vy+=( -sink-p.vy)*(1-Math.exp(-dt*3));
  move(p,p.vx*dt,p.vz*dt,doors,vehicles);const oldY=p.y;p.y+=p.vy*dt;const ground=supportHeight(p.x,p.z,oldY,vehicles);if(p.y<=ground+.08){p.y=ground;p.vy=0;p.gliding=p.chute=false;p.bank=0;}return;
 }
 const wanted=['stand','crouch','prone'].includes(i.stance)?i.stance:'stand';if(wanted===p.stance||!actorBlocked(p,p.x,p.z,0,wanted,doors,vehicles))p.stance=wanted;
 const s=stanceOf(p),groundBefore=supportHeight(p.x,p.z,p.y+.12,vehicles),grounded=p.y<=groundBefore+.14&&p.vy<=0,boost=p.boost>0?1.035:1;
 p.wading=riverDistance(p.x,p.z)<9&&p.y<WATER_Y-.4;const speed=p.usingPain?0:p.wading?1.7:p.heal?1.1:(p.stance==='stand'&&i.sprint&&!i.aim&&(i.mz||0)>.5&&Math.abs(i.mx||0)<.65?6.8:s.speed)*(i.aim?.75:1)*boost;
 const n=Math.max(1,Math.hypot(i.mx||0,i.mz||0)),dx=(i.mx||0)/n*1.08,dz=(i.mz||0)/n*((i.mz||0)<0?.9:1);
 move(p,(-Math.cos(i.yaw)*dx+Math.sin(i.yaw)*dz)*speed*dt,(Math.sin(i.yaw)*dx+Math.cos(i.yaw)*dz)*speed*dt,doors,vehicles);
 const step=p.stance==='prone'?.12:.28,ground=supportHeight(p.x,p.z,p.y+step,vehicles);
 if(grounded&&ground>=p.y-.32&&ground<=p.y+step){p.y=ground;p.vy=0;}else{const oldY=p.y;p.vy=Math.max(-32,(p.vy||0)-18*dt);const next=p.y+p.vy*dt;
  if(p.vy>0){const ceiling=nearby(p.x,p.z).filter(b=>contains(b,p.x,p.z,s.radius)&&b.y>=oldY+s.height-.07&&b.y<next+s.height).sort((a,b)=>a.y-b.y)[0];if(ceiling){p.y=ceiling.y-s.height-.04;p.vy=0;}else p.y=next;}
  else{p.y=next;const landing=supportHeight(p.x,p.z,oldY+.02,vehicles);if(p.y<=landing){if(p.vy<-1.5)p.landPose=.24;p.y=landing;p.vy=0;}}
 }
 p.landPose=Math.max(0,(p.landPose||0)-dt);if(!grounded)p.jumpTime=(p.jumpTime||0)+dt;else p.jumpTime=0;
 p.vx=(p.x-oldX)/Math.max(.001,dt);p.vz=(p.z-oldZ)/Math.max(.001,dt);if(grounded)p.gaitPhase=(p.gaitPhase||0)+Math.hypot(p.x-oldX,p.z-oldZ)*(p.stance==='prone'?2.5:1.95);
}
