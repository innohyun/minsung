import {clamp,smooth,rng} from './math.js';
export const HALF=750,MAP_SIZE=1500,MAP_ID='emerald-isles',FLIGHT_HEIGHT=300,FLIGHT_SECONDS=40,FLIGHT_START=-720,FLIGHT_SPAN=1440,WATER_Y=-1.1;
export const POIS=[
 {id:'training',name:'중앙 훈련장',x:-40,z:-20,kind:'training',buildings:8,guns:20,outdoor:8},
 {id:'resort',name:'정글 휴양지',x:430,z:-460,kind:'resort',buildings:8,guns:16,outdoor:0},
 {id:'port',name:'동남 부두',x:470,z:500,kind:'port',buildings:6,guns:16,outdoor:10},
 {id:'northwest',name:'반얀 마을',x:-500,z:-480,kind:'village',buildings:8,guns:10,outdoor:1},
 {id:'north',name:'강바람 마을',x:-60,z:-520,kind:'village',buildings:8,guns:10,outdoor:1},
 {id:'southwest',name:'대나무 마을',x:-480,z:460,kind:'village',buildings:8,guns:10,outdoor:1},
 {id:'south',name:'남쪽 논밭 마을',x:-20,z:480,kind:'village',buildings:8,guns:10,outdoor:1},
 {id:'ruins',name:'이끼 유적',x:-500,z:10,kind:'ruins',buildings:3,guns:8,outdoor:8},
 {id:'quarry',name:'붉은 채석장',x:520,z:80,kind:'quarry',buildings:3,guns:8,outdoor:6},
 ...[[-280,-500],[185,-490],[-270,-5],[240,50],[-250,470],[225,490]].map(([x,z],i)=>({id:'camp-'+i,name:`숲 보급 야영지 ${i+1}`,x,z,kind:'camp',buildings:0,guns:2,outdoor:2}))
];
export const riverX=z=>112+37*Math.sin(z*.0055)+14*Math.sin(z*.014);
export const branchZ=x=>160+20*Math.sin(x*.008);
export function riverDistance(x,z){const main=Math.abs(x-riverX(z)),branch=x<riverX(z)?Math.abs(z-branchZ(x)):Infinity;return Math.min(main,branch);}
export const BRIDGES=[[-340,'main'],[40,'main'],[430,'main'],[-450,'branch'],[-150,'branch']].map(([v,kind],i)=>kind==='main'?{id:'bridge-'+i,x:riverX(v),z:v,y:2.1,w:62,d:8.8,rot:0}:{id:'bridge-'+i,x:v,z:branchZ(v),y:2.1,w:8.8,d:62,rot:1});
export const FORDS=[{x:-625,z:branchZ(-625),kind:'branch'},{x:riverX(640),z:640,kind:'main'}];
export function inFord(x,z){return FORDS.some(f=>Math.hypot(x-f.x,z-f.z)<19);}
const hill=(x,z,cx,cz,s,h)=>h*Math.exp(-((x-cx)**2+(z-cz)**2)/(s*s));
export function landscapeHeight(x,z){return hill(x,z,-365,-255,135,74)+hill(x,z,345,-100,125,82)+hill(x,z,-410,300,110,58)+hill(x,z,310,350,145,43)+hill(x,z,-90,230,110,28)+hill(x,z,15,-655,95,39)+hill(x,z,620,-580,90,53)+Math.sin(x*.012)*Math.cos(z*.016)*4.5+Math.sin(x*.044+z*.019)*.65;}
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
 {id:'ridge-trail',width:3,points:[[-630,-355],[-520,-265],[-370,-180],[-260,-100],[-40,65]]}
].map(r=>({...r,points:spline(r.points)}));
for(const r of ROADS)for(const p of r.points){p.y=naturalHeight(p.x,p.z);for(const b of BRIDGES){const q=Math.max(Math.abs(p.x-b.x)/(b.rot?17:52),Math.abs(p.z-b.z)/(b.rot?52:17));p.y+=(b.y-p.y)*(1-smooth(.58,1,q));}}
const roadGrid=new Map();for(const r of ROADS)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],seg={a,b,width:r.width};for(let x=Math.floor((Math.min(a.x,b.x)-16)/32);x<=Math.floor((Math.max(a.x,b.x)+16)/32);x++)for(let z=Math.floor((Math.min(a.z,b.z)-16)/32);z<=Math.floor((Math.max(a.z,b.z)+16)/32);z++){const key=x+','+z;if(!roadGrid.has(key))roadGrid.set(key,[]);roadGrid.get(key).push(seg);}}
export function roadAt(x,z){let best={distance:Infinity,y:0,width:0};for(const s of roadGrid.get(Math.floor(x/32)+','+Math.floor(z/32))||[]){const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=clamp(((x-s.a.x)*dx+(z-s.a.z)*dz)/(dx*dx+dz*dz),0,1),d=Math.hypot(x-s.a.x-dx*t,z-s.a.z-dz*t);if(d<best.distance)best={distance:d,y:s.a.y+(s.b.y-s.a.y)*t,width:s.width};}return best;}
const ring=[[-31,-31],[0,-31],[31,-31],[-31,0],[31,0],[-31,31],[0,31],[31,31]],resort=[[-38,-38],[0,-38],[38,-38],[-38,0],[38,0],[-38,38],[38,38],[-73,-38]];
export const BUILDINGS=[];
for(const poi of POIS){for(let i=0;i<poi.buildings;i++){const q=poi.kind==='training'?[[-45,-30],[-15,-30],[15,-30],[45,-30],[-45,30],[-15,30],[15,30],[45,30]][i]:poi.kind==='resort'?resort[i]:poi.kind==='port'?[[-40,-25],[0,-25],[40,-25],[-40,25],[0,25],[40,25]][i]:ring[i],wood=poi.kind==='village',w=wood?15+(i%3)*1.5:poi.kind==='port'?25:poi.kind==='training'?18:poi.kind==='resort'?21:16,d=wood?14+(i%2)*2:poi.kind==='port'?20:17,rot=i%2,floors=poi.kind==='port'||poi.kind==='quarry'||poi.kind==='ruins'?1:(i%3===0?1:2),style=wood?['cottage','farmhouse','cabin','lodge'][i%4]:poi.kind,colors=wood?[0x8d6440,0x795333,0x9c7144]:poi.kind==='training'?[0x858771,0x6e795f]:poi.kind==='resort'?[0xa38c66,0x8b7758]:poi.kind==='port'?[0x70847d,0x8b7557]:[0x7b8069,0x82755a],x=poi.x+q[0],z=poi.z+q[1];BUILDINGS.push({index:BUILDINGS.length,x,z,w,d,rot,style,floors,color:colors[i%colors.length],zone:poi.id,y:naturalHeight(x,z)+.4,level:3.4,h:floors*3.4});}}
const buildingGrid=new Map();for(const b of BUILDINGS)for(let x=Math.floor((b.x-28)/64);x<=Math.floor((b.x+28)/64);x++)for(let z=Math.floor((b.z-28)/64);z<=Math.floor((b.z+28)/64);z++){const key=x+','+z;if(!buildingGrid.has(key))buildingGrid.set(key,[]);buildingGrid.get(key).push(b);}
export function buildingsNear(x,z){return buildingGrid.get(Math.floor(x/64)+','+Math.floor(z/64))||[];}
export function heightFormula(x,z){let h=naturalHeight(x,z);const r=roadAt(x,z);if(riverDistance(x,z)>18&&r.distance<r.width/2+7)h+=(r.y-h)*(1-smooth(r.width/2,r.width/2+7,r.distance));let closest=null,edge=Infinity;for(const b of buildingsNear(x,z)){const e=Math.max(Math.abs(x-b.x)-(b.rot?b.d:b.w)/2,Math.abs(z-b.z)-(b.rot?b.w:b.d)/2);if(e<edge){edge=e;closest=b;}}if(closest&&edge<9)h+=(closest.y-.4-h)*(1-smooth(2,9,edge));return h;}
const heightCache=new Map();export function heightCacheSize(){return heightCache.size;}
function heightSample(ix,iz){const cx=Math.floor(ix/32),cz=Math.floor(iz/32),key=cx+','+cz;let arr=heightCache.get(key);if(!arr){arr=new Float32Array(1024);arr.fill(NaN);heightCache.set(key,arr);if(heightCache.size>256)heightCache.delete(heightCache.keys().next().value);}const index=(iz-cz*32)*32+ix-cx*32;if(Number.isNaN(arr[index]))arr[index]=heightFormula(ix*2,iz*2);return arr[index];}
export function terrainHeight(x,z){const gx=x/2,gz=z/2,ix=Math.floor(gx),iz=Math.floor(gz),a=gx-ix,b=gz-iz;return(heightSample(ix,iz)*(1-a)+heightSample(ix+1,iz)*a)*(1-b)+(heightSample(ix,iz+1)*(1-a)+heightSample(ix+1,iz+1)*a)*b;}
export function flightPosition(time,route=0){const q=FLIGHT_START+clamp(time/FLIGHT_SECONDS,0,1)*FLIGHT_SPAN;return route%2?{x:0,z:route>1?-q:q,y:FLIGHT_HEIGHT,yaw:route>1?Math.PI:0}:{x:route>1?-q:q,z:0,y:FLIGHT_HEIGHT,yaw:route>1?-Math.PI/2:Math.PI/2};}
export const LANDING_POINTS=POIS.map(p=>({zone:p.id,x:p.x,z:p.z+(p.kind==='camp'?8:75)}));
