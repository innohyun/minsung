import{localPoint,footprintParts}from'./building-utils.js';
import {clamp,smooth,rng} from './math.js';
export const HALF=750,MAP_SIZE=1500,MAP_ID='emerald-towns',FLIGHT_HEIGHT=300,FLIGHT_SECONDS=40,FLIGHT_START=-720,FLIGHT_SPAN=1440,WATER_Y=-1.1;
export const ARENA={x:940,z:940,w:74,d:66,y:8,bounds:{minX:905,maxX:975,minZ:909,maxZ:971}};
const rollingHills=Array.from({length:28},(_,i)=>{const r=rng(1853+i*311);return{x:(r()-.5)*1400,z:(r()-.5)*1400,r:35+r()*60,h:5+r()*16};});
export const POIS=[
 {id:'training',name:'중앙 훈련장',x:-40,z:-20,kind:'training',buildings:12,guns:28,outdoor:10},
 {id:'resort',name:'정글 휴양지',x:430,z:-460,kind:'resort',buildings:12,guns:24,outdoor:4},
 {id:'port',name:'동남 부두',x:470,z:500,kind:'port',buildings:10,guns:24,outdoor:10},
 {id:'northwest',name:'반얀 마을',x:-500,z:-480,kind:'village',buildings:20,guns:28,outdoor:4},
 {id:'north',name:'강바람 마을',x:-60,z:-520,kind:'village',buildings:20,guns:28,outdoor:4},
 {id:'southwest',name:'대나무 마을',x:-480,z:460,kind:'village',buildings:20,guns:28,outdoor:4},
 {id:'south',name:'남쪽 논밭 마을',x:-20,z:480,kind:'village',buildings:20,guns:28,outdoor:4},
 {id:'ruins',name:'이끼 유적',x:-500,z:10,kind:'ruins',buildings:5,guns:10,outdoor:3},
 {id:'quarry',name:'붉은 채석장',x:520,z:80,kind:'quarry',buildings:5,guns:10,outdoor:3},
 ...[[-660,-110],[-310,-670],[270,-650],[680,270],[-660,640],[260,650]].map(([x,z],i)=>({id:'homestead-'+i,name:i%2?'사냥꾼의 오두막':'나무꾼의 집',x,z,kind:'homestead',style:i%2?'hunter':'lumberjack',buildings:1,guns:1,outdoor:0})),
 ...[[-280,-500],[185,-490],[-270,-5],[240,50],[-250,470],[225,490]].map(([x,z],i)=>({id:'camp-'+i,name:`숲 보급 야영지 ${i+1}`,x,z,kind:'camp',buildings:0,guns:3,outdoor:3}))
];
export const riverX=z=>112+37*Math.sin(z*.0055)+14*Math.sin(z*.014);
export const branchZ=x=>160+20*Math.sin(x*.008);
export function riverDistance(x,z){const main=Math.abs(x-riverX(z)),branch=x<riverX(z)?Math.abs(z-branchZ(x)):Infinity;return Math.min(main,branch);}
export const BRIDGES=[[-340,'main'],[40,'main'],[430,'main'],[-450,'branch'],[-150,'branch']].map(([v,kind],i)=>kind==='main'?{id:'bridge-'+i,x:riverX(v),z:v,y:2.1,w:62,d:8.8,rot:0}:{id:'bridge-'+i,x:v,z:branchZ(v),y:2.1,w:8.8,d:62,rot:1});
export const FORDS=[{x:-625,z:branchZ(-625),kind:'branch'},{x:riverX(640),z:640,kind:'main'}];
export function inFord(x,z){return FORDS.some(f=>Math.hypot(x-f.x,z-f.z)<19);}
const hill=(x,z,cx,cz,s,h)=>h*Math.exp(-((x-cx)**2+(z-cz)**2)/(s*s));
export function landscapeHeight(x,z){return hill(x,z,-365,-255,135,74)+hill(x,z,345,-100,125,82)+hill(x,z,-410,300,110,58)+hill(x,z,310,350,145,43)+hill(x,z,-90,230,110,28)+hill(x,z,15,-655,95,39)+hill(x,z,620,-580,90,53)+rollingHills.reduce((n,q)=>n+hill(x,z,q.x,q.z,q.r,q.h),0)+Math.sin(x*.012)*Math.cos(z*.016)*4.5+Math.sin(x*.044+z*.019)*.65;}
export function naturalHeight(x,z){const dist=riverDistance(x,z),h=landscapeHeight(x,z),depth=inFord(x,z)?1.55:3.6;return h*smooth(9,43,dist)-depth*(1-smooth(5,17,dist));}
function spline(points){const out=[];for(let j=0;j<points.length-1;j++)for(let k=0;k<28;k++){const t=k/28,a=points[Math.max(0,j-1)],b=points[j],c=points[j+1],d=points[Math.min(points.length-1,j+2)],v=i=>.5*(2*b[i]+(-a[i]+c[i])*t+(2*a[i]-5*b[i]+4*c[i]-d[i])*t*t+(-a[i]+3*b[i]-3*c[i]+d[i])*t*t*t);out.push({x:v(0),z:v(1)});}out.push({x:points.at(-1)[0],z:points.at(-1)[1]});return out;}
const n=BRIDGES[0],m=BRIDGES[1],s=BRIDGES[2],bw=BRIDGES[3],bc=BRIDGES[4];
export const ROADS=[
 {id:'north-loop',width:7.5,points:[[-680,-540],[-525,-550],[-300,-560],[-65,-590],[n.x-48,-340],[n.x+48,-340],[350,-370],[430,-390],[570,-360],[650,-150],[590,80]]},
 {id:'central-link',width:7,points:[[-680,65],[-520,80],[-300,50],[-40,65],[m.x-48,40],[m.x+48,40],[330,70],[520,145],[650,90]]},
 {id:'south-loop',width:7,points:[[-660,525],[-480,530],[-250,550],[-20,550],[s.x-48,430],[s.x+48,430],[360,470],[470,570],[650,530]]},
 {id:'west-jungle',width:5.6,points:[[-525,-550],[-630,-355],[-610,-90],[-520,80],[bw.x,bw.z-48],[bw.x,bw.z+48],[-570,310],[-480,530]]},
 {id:'inner-forest',width:5.5,points:[[-65,-590],[-155,-370],[-175,-185],[-40,65],[bc.x,bc.z-48],[bc.x,bc.z+48],[-100,340],[-20,550]]},
 {id:'east-coast',width:6.4,points:[[430,-390],[580,-280],[650,-100],[590,80],[650,270],[550,400],[470,570]]},
 {id:'camp-west',width:3.4,points:[[-520,80],[-455,-60],[-315,-200],[-300,-560]]},
 {id:'ridge-trail',width:3,points:[[-630,-355],[-520,-265],[-370,-180],[-260,-100],[-40,65]]},
 ...POIS.filter(p=>p.kind==='village').flatMap(p=>{const vertical=['north','south'].includes(p.id),point=(a,b)=>vertical?[p.x+b,p.z+a]:[p.x+a,p.z+b];return[{id:p.id+'-high-street',kind:'street',width:7.2,points:[point(-188,0),point(-95,-2),point(0,1),point(95,0),point(188,3)]},{id:p.id+'-cross-street',kind:'street',width:5.2,points:[point(0,-88),point(0,1),point(0,88)]},...[-1,1].map(side=>({id:p.id+'-back-lane-'+side,kind:'lane',width:3.4,points:[point(-182,side*57),point(-85,side*54),point(85,side*56),point(182,side*59)]}))];})
].map(r=>({...r,points:spline(r.points)}));
for(const r of ROADS)for(const p of r.points){p.y=naturalHeight(p.x,p.z);for(const b of BRIDGES){const q=Math.max(Math.abs(p.x-b.x)/(b.rot?17:52),Math.abs(p.z-b.z)/(b.rot?52:17));p.y+=(b.y-p.y)*(1-smooth(.58,1,q));}}
const roadGrid=new Map();for(const r of ROADS)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],seg={a,b,width:r.width};for(let x=Math.floor((Math.min(a.x,b.x)-16)/32);x<=Math.floor((Math.max(a.x,b.x)+16)/32);x++)for(let z=Math.floor((Math.min(a.z,b.z)-16)/32);z<=Math.floor((Math.max(a.z,b.z)+16)/32);z++){const key=x+','+z;if(!roadGrid.has(key))roadGrid.set(key,[]);roadGrid.get(key).push(seg);}}
export function roadAt(x,z){let best={distance:Infinity,y:0,width:0};for(const s of roadGrid.get(Math.floor(x/32)+','+Math.floor(z/32))||[]){const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=clamp(((x-s.a.x)*dx+(z-s.a.z)*dz)/(dx*dx+dz*dz),0,1),d=Math.hypot(x-s.a.x-dx*t,z-s.a.z-dz*t);if(d<best.distance)best={distance:d,y:s.a.y+(s.b.y-s.a.y)*t,width:s.width};}return best;}
export const BUILDINGS=[];
const styles=['brick-home','plaster-villa','timber-cottage','corner-shop','garage','farmhouse','workshop','clinic','lodge','courtyard','row-house','storehouse'];
const wallColors=[0xc5b995,0xa88660,0x9c6650,0xc7c4ad,0x8e704e,0xa9afa1,0xb9a57f,0x77634c],roofColors=[0x864c36,0x635c4e,0x69726a,0x8a7250,0x5f6561,0x8b634b];
for(const poi of POIS)for(let i=0;i<poi.buildings;i++){
 const random=rng(11471+BUILDINGS.length*941),village=poi.kind==='village',vertical=['north','south'].includes(poi.id),side=i%2?1:-1,style=poi.kind==='homestead'?poi.style:poi.kind==='port'?(i%3?'storehouse':'corner-shop'):poi.kind==='quarry'?(i%2?'garage':'workshop'):styles[(i+POIS.indexOf(poi)*3)%styles.length],w=poi.kind==='homestead'?14:village?14+Math.floor(random()*5)*1.2:poi.kind==='port'?22+Math.floor(random()*3)*2:16+Math.floor(random()*4)*1.6,d=poi.kind==='homestead'?13:13+Math.floor(random()*5)*1.1,rot=village?+vertical:i%2,flip=village?side<0:!!(i%3===1),floors=['garage','storehouse','workshop','hunter','lumberjack'].includes(style)?1:(i%4===0?1:2),annex=i%4===1&&i%3!==0&&w<20?{x:-w/2-2.8,z:d*.16,w:5.6,d:6.5+random()*1.5}:null;
 let offset=poi.kind==='homestead'?[0,0]:village?[(((i>>1)%5)-2)*36,side*(25+Math.floor(i/10)*62+random()*4)]:poi.kind==='resort'?[(i%4-1.5)*39,(Math.floor(i/4)-1)*38]:poi.kind==='port'?[(i%5-2)*42,(Math.floor(i/5)-.5)*49]:poi.kind==='training'?[(i%4-1.5)*37,(Math.floor(i/4)-1)*38]:[(i%3-1)*34,(Math.floor(i/3)-.5)*36];
 let chosen=null;
 for(let attempt=0;attempt<120&&!chosen;attempt++){
  const a=offset[0]+(attempt?((attempt%5)-2)*6:0),across=offset[1]+(attempt?Math.floor(attempt/5)*3*(village?side:attempt%2?1:-1):0),x=poi.x+(village&&vertical?across:a),z=poi.z+(village&&vertical?a:across),b={index:BUILDINGS.length,x,z,w,d,rot,flip,annex,style,floors,color:wallColors[(i+POIS.indexOf(poi)*2)%wallColors.length],roofColor:roofColors[(i*3+POIS.indexOf(poi))%roofColors.length],zone:poi.id,y:naturalHeight(x,z)+.42,level:3.4,h:floors*3.4,externalStairs:floors===1,variant:Math.floor(random()*100000),stairSide:i%3===0?-1:1,stairStart:i%4<2?1:-1,roofType:i%4===0?'terrace':i%4===1?'hiproof':'gable',wallTexture:['timber-cottage','farmhouse','lodge','hunter','lumberjack'].includes(style)?'wood':i%3?'plaster':'brick'};
  const parts=footprintParts(b).map(p=>({...localPoint(b,p.x,p.z),w:rot?p.d:p.w,d:rot?p.w:p.d}));b.bounds={minX:Math.min(...parts.map(p=>p.x-p.w/2)),maxX:Math.max(...parts.map(p=>p.x+p.w/2)),minZ:Math.min(...parts.map(p=>p.z-p.d/2)),maxZ:Math.max(...parts.map(p=>p.z+p.d/2))};
  if(Math.max(Math.abs(b.bounds.minX),Math.abs(b.bounds.maxX),Math.abs(b.bounds.minZ),Math.abs(b.bounds.maxZ))>HALF-14||parts.some(p=>riverDistance(p.x,p.z)<Math.max(p.w,p.d)/2+12)||roadAt(x,z).distance<Math.min(w,d)/2+4||BUILDINGS.some(q=>!(b.bounds.maxX+3<q.bounds.minX||b.bounds.minX-3>q.bounds.maxX||b.bounds.maxZ+3<q.bounds.minZ||b.bounds.minZ-3>q.bounds.maxZ)))continue;
  chosen=b;
 }
 if(!chosen)throw Error('마을 건물 배치 공간이 부족해요: '+poi.id+' / '+i);BUILDINGS.push(chosen);
}
const buildingGrid=new Map();for(const b of BUILDINGS)for(let x=Math.floor((b.bounds.minX-10)/64);x<=Math.floor((b.bounds.maxX+10)/64);x++)for(let z=Math.floor((b.bounds.minZ-10)/64);z<=Math.floor((b.bounds.maxZ+10)/64);z++){const key=x+','+z;if(!buildingGrid.has(key))buildingGrid.set(key,[]);buildingGrid.get(key).push(b);}
export function buildingsNear(x,z){return buildingGrid.get(Math.floor(x/64)+','+Math.floor(z/64))||[];}
export function heightFormula(x,z){let h=naturalHeight(x,z);const ae=Math.max(Math.abs(x-ARENA.x)-ARENA.w/2,Math.abs(z-ARENA.z)-ARENA.d/2);if(ae<12)h+=(ARENA.y-h)*(1-smooth(1,12,ae));const r=roadAt(x,z);if(riverDistance(x,z)>18&&r.distance<r.width/2+7)h+=(r.y-h)*(1-smooth(r.width/2,r.width/2+7,r.distance));for(const bridge of BRIDGES){const along=Math.abs(bridge.rot?z-bridge.z:x-bridge.x),across=Math.abs(bridge.rot?x-bridge.x:z-bridge.z);if(along<33&&across<6)h=Math.min(h,bridge.y-.22);}
 let closest=null,edge=Infinity;for(const b of buildingsNear(x,z)){const e=Math.min(...footprintParts(b).map(p=>{const q=localPoint(b,p.x,p.z);return Math.max(Math.abs(x-q.x)-(b.rot?p.d:p.w)/2,Math.abs(z-q.z)-(b.rot?p.w:p.d)/2);}));if(e<edge){edge=e;closest=b;}}if(closest&&edge<9)h+=(closest.y-.4-h)*(1-smooth(2,9,edge));return h;}
const heightCache=new Map();export function heightCacheSize(){return heightCache.size;}
function heightSample(ix,iz){const cx=Math.floor(ix/32),cz=Math.floor(iz/32),key=cx+','+cz;let arr=heightCache.get(key);if(!arr){arr=new Float32Array(1024);arr.fill(NaN);heightCache.set(key,arr);if(heightCache.size>256)heightCache.delete(heightCache.keys().next().value);}const index=(iz-cz*32)*32+ix-cx*32;if(Number.isNaN(arr[index]))arr[index]=heightFormula(ix*2,iz*2);return arr[index];}
export function terrainHeight(x,z){const gx=x/2,gz=z/2,ix=Math.floor(gx),iz=Math.floor(gz),a=gx-ix,b=gz-iz;return(heightSample(ix,iz)*(1-a)+heightSample(ix+1,iz)*a)*(1-b)+(heightSample(ix,iz+1)*(1-a)+heightSample(ix+1,iz+1)*a)*b;}
export function flightPosition(time,route=0){const q=FLIGHT_START+clamp(time/FLIGHT_SECONDS,0,1)*FLIGHT_SPAN;return route%2?{x:0,z:route>1?-q:q,y:FLIGHT_HEIGHT,yaw:route>1?Math.PI:0}:{x:route>1?-q:q,z:0,y:FLIGHT_HEIGHT,yaw:route>1?-Math.PI/2:Math.PI/2};}
export const LANDING_POINTS=POIS.map(p=>({zone:p.id,x:p.x,z:p.z+(p.kind==='camp'?8:75)}));
