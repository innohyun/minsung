import {STANCES,stanceOf} from './weapons.js';
export const HALF=205,FLIGHT_HEIGHT=185,FLIGHT_SECONDS=24,FLIGHT_START=-195,FLIGHT_SPAN=390;
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function rng(seed=1){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const hill=(x,z,cx,cz,s,h)=>h*Math.exp(-((x-cx)**2+(z-cz)**2)/(s*s));
export const riverX=z=>47+17*Math.sin(z*.013)+6*Math.sin(z*.035);
export const WATER_Y=-1.1;
export function landscapeHeight(x,z){return hill(x,z,-138,32,39,36)+hill(x,z,131,-114,48,29)+hill(x,z,-13,154,37,16)+hill(x,z,-79,-155,38,19)+hill(x,z,151,121,45,25)+hill(x,z,-39,34,32,11)+hill(x,z,31,-30,27,12)+smooth(153,168,x)*10+Math.sin(x*.037)*Math.cos(z*.029)*2.1+Math.sin(x*.091+z*.047)*.42;}
export function naturalHeight(x,z){const d=Math.abs(x-riverX(z)),h=landscapeHeight(x,z);return h*smooth(7,25,d)-3.5*(1-smooth(4,12,d));}
export const BRIDGES=[-44,97].map((z,i)=>({id:'river-'+i,x:riverX(z),z,y:2.1,w:48,d:8.4}));
function spline(points){const out=[];for(let j=0;j<points.length-1;j++)for(let k=0;k<14;k++){const t=k/14,a=points[Math.max(0,j-1)],b=points[j],c=points[j+1],d=points[Math.min(points.length-1,j+2)],v=i=>.5*(2*b[i]+(-a[i]+c[i])*t+(2*a[i]-5*b[i]+4*c[i]-d[i])*t*t+(-a[i]+3*b[i]-3*c[i]+d[i])*t*t*t);out.push({x:v(0),z:v(1)});}out.push({x:points.at(-1)[0],z:points.at(-1)[1]});return out;}
const north=BRIDGES[0],south=BRIDGES[1];
export const ROADS=[
 {id:'valley-road',width:7.4,points:[[-220,-92],[-166,-95],[-116,-101],[-65,-95],[-9,-54],[north.x-28,-44],[north.x+28,-44],[102,-31],[151,-65],[220,-88]]},
 {id:'farm-road',width:6.2,points:[[-210,142],[-146,129],[-96,130],[-45,109],[south.x-28,97],[south.x+28,97],[139,96],[214,138]]},
 {id:'ridge-bypass',width:4.6,points:[[-166,-95],[-186,-62],[-193,-12],[-186,41],[-159,90],[-112,118],[-96,130]]},
 {id:'east-link',width:5.6,points:[[102,-31],[143,-3],[166,38],[162,71],[139,96]]}
].map(r=>({...r,points:spline(r.points)}));
for(const r of ROADS)for(const p of r.points){p.y=naturalHeight(p.x,p.z);for(const b of BRIDGES){const q=Math.max(Math.abs(p.x-b.x)/44,Math.abs(p.z-b.z)/16);p.y+=(b.y-p.y)*(1-smooth(.58,1,q));}}
const roadGrid=new Map();for(const r of ROADS)for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],seg={a,b,width:r.width};for(let x=Math.floor((Math.min(a.x,b.x)-14)/20);x<=Math.floor((Math.max(a.x,b.x)+14)/20);x++)for(let z=Math.floor((Math.min(a.z,b.z)-14)/20);z<=Math.floor((Math.max(a.z,b.z)+14)/20);z++){const k=x+','+z;if(!roadGrid.has(k))roadGrid.set(k,[]);roadGrid.get(k).push(seg);}}
export function roadAt(x,z){let best={distance:Infinity,y:0,width:0};for(const s of roadGrid.get(Math.floor(x/20)+','+Math.floor(z/20))||[]){const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=clamp(((x-s.a.x)*dx+(z-s.a.z)*dz)/(dx*dx+dz*dz),0,1),d=Math.hypot(x-s.a.x-dx*t,z-s.a.z-dz*t);if(d<best.distance)best={distance:d,y:s.a.y+(s.b.y-s.a.y)*t,width:s.width};}return best;}
const defs=[[-100,-65,18,16,1,'cottage',2,0x815a3b],[-73,-65,26,20,0,'warehouse',2,0x80644c],[-24,-128,20,18,1,'workshop',1,0x97734e],[-144,35,15,17,0,'tower',2,0x73583d],[-24,4,22,18,1,'barn',1,0x8b5434],[110,-56,24,21,0,'courtyard',2,0x956c44],[-90,113,19,22,1,'farmhouse',2,0x7c5339],[12,137,26,16,1,'garage',1,0x8e7352],[142,92,18,23,0,'chapel',1,0x947653],[153,-141,17,14,1,'cabin',1,0x75523c],[-159,-139,21,18,0,'lodge',2,0x8e6342],[-8,85,18,15,1,'mill',2,0x80684b],[0,-62,14,13,0,'hut',1,0x976c41]];
export const BUILDINGS=defs.map(([x,z,w,d,rot,style,floors,color],index)=>({x,z,w,d,rot,style,floors,color,index,y:naturalHeight(x,z)+.4,level:3.4,h:floors*3.4}));
export function localPoint(b,x,z,y=0){return{x:b.x+(b.rot?-z:x),z:b.z+(b.rot?x:z),y:b.y+y};}
export function toLocal(b,x,z){return{x:b.rot?z-b.z:x-b.x,z:b.rot?b.x-x:z-b.z};}
function heightFormula(x,z){let h=naturalHeight(x,z);const road=roadAt(x,z);if(Math.abs(x-riverX(z))>13&&road.distance<road.width/2+6)h+=(road.y-h)*(1-smooth(road.width/2,road.width/2+6,road.distance));for(const b of BUILDINGS){const w=b.rot?b.d:b.w,d=b.rot?b.w:b.d,edge=Math.max(Math.abs(x-b.x)-w/2,Math.abs(z-b.z)-d/2);h+=(b.y-.4-h)*(1-smooth(2,9,edge));}return h;}
export const TERRAIN_SIZE=512,TERRAIN_SEGMENTS=256;
const RES=2,COUNT=257,MIN=-256,heights=new Float32Array(COUNT*COUNT);for(let z=0;z<COUNT;z++)for(let x=0;x<COUNT;x++)heights[z*COUNT+x]=heightFormula(MIN+x*RES,MIN+z*RES);
export function terrainHeight(x,z){const gx=clamp((x-MIN)/RES,0,COUNT-1.001),gz=clamp((z-MIN)/RES,0,COUNT-1.001),ix=Math.floor(gx),iz=Math.floor(gz),a=gx-ix,b=gz-iz;return(heights[iz*COUNT+ix]*(1-a)+heights[iz*COUNT+ix+1]*a)*(1-b)+(heights[(iz+1)*COUNT+ix]*(1-a)+heights[(iz+1)*COUNT+ix+1]*a)*b;}
export const TREES=(()=>{const r=rng(771),out=[];for(let i=0;i<950;i++){const x=(r()-.5)*490,z=(r()-.5)*490,density=.44+.25*Math.sin(x*.031+z*.018)+.2*Math.cos(z*.046);if(r()>density||Math.abs(x-riverX(z))<16||roadAt(x,z).distance<7||BUILDINGS.some(b=>Math.abs(x-b.x)<(b.rot?b.d:b.w)/2+4&&Math.abs(z-b.z)<(b.rot?b.w:b.d)/2+4))continue;out.push({x,z,y:terrainHeight(x,z),h:6+r()*6,type:Math.floor(r()*3),seed:i});}return out;})();
export const GRASS_PATCHES=[[-35,39,10],[5,-30,10],[-170,4,8],[28,166,12],[-38,-104,7],[104,-11,9],[-117,-137,9],[178,127,10],[-60,98,8],[21,35,9],[-125,86,11],[114,139,8]].map(([x,z,r])=>({x,z,r}));
export const inGrass=(x,z)=>GRASS_PATCHES.some(p=>(x-p.x)**2+(z-p.z)**2<p.r*p.r);
export const DOORS=BUILDINGS.map(b=>({...localPoint(b,0,-b.d/2,0),id:'door-'+b.index,building:b.index,rot:b.rot,w:3.14,h:2.68}));
export function doorBox(d,open){const b=BUILDINGS[d.building],p=localPoint(b,open?-d.w/2:0,-b.d/2+(open?d.w/2:0));return{...p,w:open?(b.rot?d.w:.16):(b.rot?.16:d.w),d:open?(b.rot?.16:d.w):(b.rot?d.w:.16),h:d.h,shape:'box',kind:'door',id:d.id};}
export function dynamicBoxes(doors){return doors?DOORS.map(d=>doorBox(d,!!doors[d.id])):[];}
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
  const porch=['cottage','farmhouse','lodge','cabin','courtyard'].includes(b.style),balcony=b.floors===2&&['farmhouse','lodge','courtyard'].includes(b.style);
  if(porch){const pw=b.w*.74;add(0,-b.d/2-1.5,pw,3,.2,-.4,'porch',0x8e6e48);const roofY=balcony?b.level-.08:2.8;add(0,-b.d/2-1.4,pw+.3,2.9,.18,roofY-.18,balcony?'balcony':'awning',0x806241);for(const side of[-1,1])add(side*(pw/2-.2),-b.d/2-2.6,.18,.18,roofY,0,'post',0x725235);if(balcony){add(0,-b.d/2-2.8,pw,.15,.75,roofY,'balcony-rail',0x685039);for(const side of[-1,1])add(side*pw/2,-b.d/2-1.5,.15,2.8,.75,roofY,'balcony-rail',0x685039);}}
  // Supplies live on tables/shelves, both ground and upper floor, never scattered along roads.
  const spots=[[-b.w*.22,-b.d*.24,0],[-b.w*.22,b.d*.24,0],[-b.w*.08,0,b.floors>1?b.level:0]];
  spots.forEach(([x,z,y],i)=>{add(x,z,2.8,1.15,.84,y,'table',0x906b45);for(let k=0;k<3;k++){const p=localPoint(b,x+(k-1)*.8,z,y+.96);LOOT_SPOTS.push({...p,id:`b${b.index}t${i}i${k}`,building:b.index,floor:y?1:0,type:i*3+k});}});
  add(-b.w*.25,b.d*.43,3,.6,1.6,0,'shelf',0x76573b);
  // Room partitions leave a full doorway and keep the stair lane clear.
  for(let f=0;f<b.floors;f++){const y=f*b.level;add(-b.w*.27,1.4,b.w*.42,.22,2.9,y,'partition',0x8b6948);add(-b.w*.27,b.d*.32,3.3,1.5,.5,y,'bed',0x665846);add(-b.w*.31,b.d*.32,3.1,1.3,.16,y+.5,'mattress',0x818372);add(-b.w*.35,-b.d*.35,.8,1.2,1.7,y,'cabinet',0x67482e);}

 }
 // A stepped maintenance catwalk connects the two-storey cottage and warehouse roofs.
 const a=BUILDINGS[0],b=BUILDINGS[1],x0=a.x+(a.rot?a.d:a.w)/2,x1=b.x-b.w/2;
 for(let i=0;i<10;i++){const t=(i+.5)/10,x=x0+(x1-x0)*t,y=a.y+a.h+(b.y+b.h-a.y-a.h)*t;list.push({x,z:a.z,w:(x1-x0)/10+.025,d:2.4,h:.2,y:y-.2,shape:'box',kind:'bridge',color:0x98784f});for(const side of [-1,1])list.push({x,z:a.z+side*1.15,w:(x1-x0)/10+.025,d:.12,h:.6,y:y,shape:'box',kind:'rail',color:0x6f8a87});}
 for(const bridge of BRIDGES){list.push({...bridge,h:.45,y:bridge.y-.45,shape:'box',kind:'roadbridge',color:0x796a50});for(const side of [-1,1])list.push({x:bridge.x,z:bridge.z+side*(bridge.d/2-.15),y:bridge.y,w:bridge.w,d:.26,h:.9,shape:'box',kind:'bridge-rail',color:0x655c4d});}
 const r=rng(1277);for(let i=0;i<165;i++){const x=(r()-.5)*403,z=(r()-.5)*403;if(roadAt(x,z).distance<6||Math.abs(x-riverX(z))<14||BUILDINGS.some(b=>Math.abs(x-b.x)<20&&Math.abs(z-b.z)<20))continue;list.push({x,z,w:2+r()*3.6,d:2+r()*3.6,h:1.3+r()*3.5,y:terrainHeight(x,z)-.1,shape:'ellipsoid',kind:'rock',color:i%3?0x8c9b85:0x687e75});}
 for(let i=0;i<11;i++){const x=-167+r()*12,z=-35+i*8+r()*5;list.push({x,z,w:3.5,d:5,h:2.1,y:terrainHeight(x,z)-.1,shape:'ellipsoid',kind:'rock',color:0x73857b});}
 // Real low cover links hills, entrances, and climbable routes.
 for(const [x,z,w,d]of [[-42,17,11,1.1],[112,-40,10,1.2],[-122,-48,1,12],[-3,-85,9,1.1],[-93,99,9,1],[137,115,13,1.2],[-179,38,1.1,14],[-149,100,12,1],[76,107,1,10],[-16,61,12,1]])list.push({x,z,w,d,h:1.3,y:terrainHeight(x,z),shape:'box',kind:'cover',color:0x9b987e});
 for(const t of TREES)list.push({x:t.x,z:t.z,w:.55,d:.55,h:t.h*.65,y:t.y,shape:'cylinder',kind:'trunk',color:0x6a593f});
 return list;
}
export const BOXES=mapGeometry();
const CELL=12,grid=new Map(),neighborhoods=new Map();
for(const b of BOXES)for(let x=Math.floor((b.x-b.w/2)/CELL);x<=Math.floor((b.x+b.w/2)/CELL);x++)for(let z=Math.floor((b.z-b.d/2)/CELL);z<=Math.floor((b.z+b.d/2)/CELL);z++){const key=x+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(b);}
export function nearby(x,z){const cx=Math.floor(x/CELL),cz=Math.floor(z/CELL),key=cx+','+cz;if(!neighborhoods.has(key)){const set=new Set();for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const b of grid.get((cx+dx)+','+(cz+dz))||[])set.add(b);neighborhoods.set(key,[...set]);}return neighborhoods.get(key);}
function rayCandidates(o,d,max){const set=new Set();let x=Math.floor(o[0]/CELL),z=Math.floor(o[2]/CELL),t=0;const sx=d[0]>=0?1:-1,sz=d[2]>=0?1:-1,dx=Math.abs(d[0])<1e-8?Infinity:CELL/Math.abs(d[0]),dz=Math.abs(d[2])<1e-8?Infinity:CELL/Math.abs(d[2]);let tx=dx===Infinity?Infinity:((x+(sx>0?1:0))*CELL-o[0])/d[0],tz=dz===Infinity?Infinity:((z+(sz>0?1:0))*CELL-o[2])/d[2];
 for(let n=0;n<150&&t<=max;n++){for(const b of grid.get(x+','+z)||[])set.add(b);if(tx===Infinity&&tz===Infinity)break;if(tx<tz){t=tx;tx+=dx;x+=sx;}else{t=tz;tz+=dz;z+=sz;}}
 return set;
}

export const vehicleBoxes=vehicles=>(vehicles||[]).map(v=>({x:v.x,z:v.z,y:v.y+.2,w:1.9,d:3.8,h:1.6,yaw:v.yaw,shape:'obb'}));
export function contains(b,x,z,pad=0){if(b.shape==='obb'){const dx=x-b.x,dz=z-b.z,c=Math.cos(b.yaw),s=Math.sin(b.yaw);return Math.abs(dx*c-dz*s)<b.w/2+pad&&Math.abs(dx*s+dz*c)<b.d/2+pad;}if(b.shape==='ellipsoid'||b.shape==='cylinder'){return((x-b.x)/(b.w/2+pad))**2+((z-b.z)/(b.d/2+pad))**2<1;}return Math.abs(x-b.x)<b.w/2+pad&&Math.abs(z-b.z)<b.d/2+pad;}
export function topAt(b,x,z){if(!contains(b,x,z))return-Infinity;if(b.shape==='ellipsoid'){const n=1-((x-b.x)/(b.w/2))**2-((z-b.z)/(b.d/2))**2;return b.y+b.h/2+b.h/2*Math.sqrt(Math.max(0,n));}return b.y+b.h;}
export function rayBox(o,d,b,max=1e4){
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
export function blocked(x,z,y=terrainHeight(x,z),r=.32,height=1.78,step=.0,doors,vehicles){return [...nearby(x,z),...dynamicBoxes(doors),...vehicleBoxes(vehicles)].some(b=>b.y<y+height-.04&&b.y+b.h>y+.045&&!(b.y+b.h<=y+step&&b.y<=y+.1)&&contains(b,x,z,r));}
export function supportHeight(x,z,ceiling=Infinity,vehicles){let h=terrainHeight(x,z);if(Math.abs(x-riverX(z))<9&&h<WATER_Y-.85&&WATER_Y-.85<=ceiling+.06)h=WATER_Y-.85;for(const b of [...nearby(x,z),...vehicleBoxes(vehicles)]){const top=topAt(b,x,z);if(top<=ceiling+.06&&top>h)h=top;}return h;}
function actorBlocked(p,x,z,step=0,stance=p.stance||'stand',doors,vehicles){const s=STANCES[stance]||STANCES.stand;const positions=stance==='prone'?[-.88,-.3,.3,.65]:[0];return positions.some(t=>blocked(x+Math.sin(p.yaw)*t,z+Math.cos(p.yaw)*t,p.y,s.radius,s.height,step,doors,vehicles));}
export function move(p,dx,dz,doors,vehicles){const accept=(x,z)=>{const g=terrainHeight(x,z),og=terrainHeight(p.x,p.z),distance=Math.hypot(x-p.x,z-p.z),step=p.stance==='prone'?.12:.27;return !(p.y<og+.3&&g-og>distance*1.12+.03)&&g<=p.y+step&&!actorBlocked(p,x,z,step,p.stance,doors,vehicles);};const x=clamp(p.x+dx,-HALF,HALF),z=clamp(p.z+dz,-HALF,HALF);if(accept(x,p.z))p.x=x;if(accept(p.x,z))p.z=z;}
export function beginJump(p,doors,vehicles){
 if(p.onPlane){p.onPlane=false;p.gliding=true;p.chute=true;p.glideYaw=p.yaw;p.glideLookYaw=p.yaw;p.vy=-2;p.vx=Math.sin(p.yaw)*10;p.vz=Math.cos(p.yaw)*10;return true;}
 if(p.vault||p.gliding||p.stance!=='stand'||p.y>supportHeight(p.x,p.z,p.y+.1,vehicles)+.16)return false;
 // Windows use a tucked body: lift, pass through the opening, then lower.
 for(const w of WINDOWS){const along=(p.x-w.x)*w.nx+(p.z-w.z)*w.nz,side=along>=0?1:-1,tangent=Math.abs((p.x-w.x)*w.nz-(p.z-w.z)*w.nx),facing=-(Math.sin(p.yaw)*w.nx+Math.cos(p.yaw)*w.nz)*side;if(Math.abs(p.y-w.y)<.55&&Math.abs(along)<1.55&&Math.abs(along)>.35&&tangent<w.width/2-.38&&facing>.7){const x=p.x-w.nx*(along+side*1.05),z=p.z-w.nz*(along+side*1.05);const floor=Math.max(supportHeight(x,z,w.y+.2),w.y-.4);if(!blocked(x,z,floor,.3,1.78,0,doors)&&!blocked(w.x,w.z,w.y+1.04,.27,.96,0,doors)){p.vault={x0:p.x,y0:p.y,z0:p.z,x,z,y:floor,t:0,h:w.y+1.04,window:true,duration:.74};return true;}}}
 // Vault only a narrow, reachable obstacle, with a clear landing and headroom.
 const sx=Math.sin(p.yaw),sz=Math.cos(p.yaw);for(const b of nearby(p.x,p.z)){const distance=rayBox([p.x,p.y+.7,p.z],[sx,0,sz],b,1.35),top=b.y+b.h;if(distance<1.35&&top<=p.y+2.15&&top>p.y+.45){for(const span of [1.7,2.1,2.6]){const x=clamp(p.x+sx*span,-HALF,HALF),z=clamp(p.z+sz*span,-HALF,HALF),y=supportHeight(x,z,top+.28);if(y<=p.y+2.2&&!blocked(x,z,y,.34,1.78,0,doors)){const h=Math.max(top,p.y,y)+.48;let clear=true;for(const t of [.2,.4,.6,.8]){const qx=p.x+(x-p.x)*t,qz=p.z+(z-p.z)*t,qy=p.y+(y-p.y)*t+Math.sin(t*Math.PI)*(h-Math.max(p.y,y));if(nearby(qx,qz).some(q=>q!==b&&q.y<qy+1.78-.04&&q.y+q.h>qy+.05&&contains(q,qx,qz,.3))){clear=false;break;}}if(clear){p.vault={x0:p.x,y0:p.y,z0:p.z,x,z,y,t:0,h};return true;}}}}}
 p.vy=8.4;return true;
}
export function integrateMovement(p,i,dt,time=0,doors,vehicles){
 if(p.dead){p.vx=p.vz=0;return;}if(p.vehicleId)return;const oldX=p.x,oldZ=p.z;
 if(p.onPlane){p.x=FLIGHT_START+clamp(time/FLIGHT_SECONDS,0,1)*FLIGHT_SPAN;p.z=((p.seat||0)%5-2)*1.25;p.y=FLIGHT_HEIGHT;p.vx=FLIGHT_SPAN/FLIGHT_SECONDS;p.vy=p.vz=0;return;}
 if(p.vault){const v=p.vault;v.t+=dt;const a=clamp(v.t/(v.duration||.52),0,1),t=v.window?smooth(.22,.78,a):a*a*(3-2*a);p.x=v.x0+(v.x-v.x0)*t;p.z=v.z0+(v.z-v.z0)*t;p.y=v.window?(a<.22?v.y0+(v.h-v.y0)*smooth(0,.22,a):v.h+(v.y-v.h)*smooth(.78,1,a)):v.y0+(v.y-v.y0)*t+Math.sin(t*Math.PI)*(v.h-Math.max(v.y0,v.y));p.vx=(p.x-oldX)/dt;p.vz=(p.z-oldZ)/dt;p.vy=0;if(a>=1)p.vault=null;return;}
 if(p.gliding){
  const heading=p.glideYaw??p.yaw,lookDelta=angleDiff(i.yaw,p.glideLookYaw??i.yaw);p.glideLookYaw=i.yaw;
  const turn=clamp(-(i.mx||0)*1.45+clamp(lookDelta/Math.max(dt,.001),-1.5,1.5),-1.75,1.75);
  p.glideYaw=heading+turn*dt;p.bank=(p.bank||0)+(clamp(-turn*.34,-.55,.55)-(p.bank||0))*(1-Math.exp(-dt*5));
  const speed=11+(i.mz||0)*4,sink=5.3+Math.max(0,i.mz||0)*2-Math.min(0,i.mz||0)*.4,a=1-Math.exp(-dt*2.5);p.vx=(p.vx||0)+(Math.sin(p.glideYaw)*speed-(p.vx||0))*a;p.vz=(p.vz||0)+(Math.cos(p.glideYaw)*speed-(p.vz||0))*a;p.vy+=( -sink-p.vy)*(1-Math.exp(-dt*3));
  move(p,p.vx*dt,p.vz*dt,doors,vehicles);const oldY=p.y;p.y+=p.vy*dt;const ground=supportHeight(p.x,p.z,oldY,vehicles);if(p.y<=ground+.08){p.y=ground;p.vy=0;p.gliding=p.chute=false;p.bank=0;}return;
 }
 const wanted=['stand','crouch','prone'].includes(i.stance)?i.stance:'stand';if(wanted===p.stance||!actorBlocked(p,p.x,p.z,0,wanted,doors,vehicles))p.stance=wanted;
 const s=stanceOf(p),groundBefore=supportHeight(p.x,p.z,p.y+.12,vehicles),grounded=p.y<=groundBefore+.14&&p.vy<=0,boost=p.boost>0?1.035:1;
 p.wading=Math.abs(p.x-riverX(p.z))<9&&p.y<WATER_Y-.4;const speed=p.usingPain?0:p.wading?1.7:p.heal?1.1:(p.stance==='stand'&&i.sprint&&!i.aim?7.5:s.speed)*(i.aim?.75:1)*boost;
 const n=Math.max(1,Math.hypot(i.mx||0,i.mz||0)),dx=(i.mx||0)/n,dz=(i.mz||0)/n;
 move(p,(-Math.cos(i.yaw)*dx+Math.sin(i.yaw)*dz)*speed*dt,(Math.sin(i.yaw)*dx+Math.cos(i.yaw)*dz)*speed*dt,doors,vehicles);
 const step=p.stance==='prone'?.12:.28,ground=supportHeight(p.x,p.z,p.y+step,vehicles);
 if(grounded&&ground>=p.y-.32&&ground<=p.y+step){p.y=ground;p.vy=0;}else{const oldY=p.y;p.vy=Math.max(-32,(p.vy||0)-18*dt);const next=p.y+p.vy*dt;
  if(p.vy>0){const ceiling=nearby(p.x,p.z).filter(b=>contains(b,p.x,p.z,s.radius)&&b.y>=oldY+s.height-.07&&b.y<next+s.height).sort((a,b)=>a.y-b.y)[0];if(ceiling){p.y=ceiling.y-s.height-.04;p.vy=0;}else p.y=next;}
  else{p.y=next;const landing=supportHeight(p.x,p.z,oldY+.02,vehicles);if(p.y<=landing){p.y=landing;p.vy=0;}}
 }
 p.vx=(p.x-oldX)/Math.max(.001,dt);p.vz=(p.z-oldZ)/Math.max(.001,dt);
}
