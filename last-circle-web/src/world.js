import {STANCES,stanceOf} from './weapons.js';
export const HALF=118,FLIGHT_HEIGHT=185,FLIGHT_SECONDS=20;
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function rng(seed=1){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const hill=(x,z,cx,cz,s,h)=>h*Math.exp(-((x-cx)**2+(z-cz)**2)/(s*s));
function rawHeight(x,z){return hill(x,z,-36,37,26,11)+hill(x,z,37,-32,25,13)+hill(x,z,-97,94,31,17)+hill(x,z,70,92,28,8)+hill(x,z,-38,-110,30,10)+smooth(80,87,x)*11+Math.sin(x*.06)*Math.cos(z*.047)*.6;}
const defs=[[-58,-52,18,16,1,'cottage',2,0xd7c5a0],[-31,-52,26,20,0,'warehouse',2,0xa9c1c6],[66,-66,20,18,1,'workshop',1,0xc9b39a],[-66,0,15,17,0,'tower',2,0xb0b9aa],[0,0,22,18,1,'barn',1,0xb78365],[66,0,24,21,0,'courtyard',2,0xd8c6a5],[-66,66,19,22,1,'farmhouse',2,0xe1d2b1],[0,66,26,16,1,'garage',1,0xaebdc5],[66,66,18,23,0,'chapel',1,0xcfc9b9]];
export const BUILDINGS=defs.map(([x,z,w,d,rot,style,floors,color],index)=>({x,z,w,d,rot,style,floors,color,index,y:rawHeight(x,z),level:3.4,h:floors*3.4}));
export function localPoint(b,x,z,y=0){return{x:b.x+(b.rot?-z:x),z:b.z+(b.rot?x:z),y:b.y+y};}
function heightFormula(x,z){let h=rawHeight(x,z);for(const b of BUILDINGS){const w=b.rot?b.d:b.w,d=b.rot?b.w:b.d,edge=Math.max(Math.abs(x-b.x)-w/2,Math.abs(z-b.z)-d/2);h+=(b.y-h)*(1-smooth(1,10,edge));}return h;}
const RES=2,COUNT=161,MIN=-160,heights=new Float32Array(COUNT*COUNT);for(let z=0;z<COUNT;z++)for(let x=0;x<COUNT;x++)heights[z*COUNT+x]=heightFormula(MIN+x*RES,MIN+z*RES);
export function terrainHeight(x,z){const gx=clamp((x-MIN)/RES,0,COUNT-1.001),gz=clamp((z-MIN)/RES,0,COUNT-1.001),ix=Math.floor(gx),iz=Math.floor(gz),a=gx-ix,b=gz-iz;return(heights[iz*COUNT+ix]*(1-a)+heights[iz*COUNT+ix+1]*a)*(1-b)+(heights[(iz+1)*COUNT+ix]*(1-a)+heights[(iz+1)*COUNT+ix+1]*a)*b;}
export const TREES=(()=>{const r=rng(771),out=[];for(let i=0;i<100;i++){const x=(r()-.5)*286,z=(r()-.5)*286;if(BUILDINGS.some(b=>Math.abs(x-b.x)<20&&Math.abs(z-b.z)<20)||Math.abs(x)<7||Math.abs(z)<7)continue;out.push({x,z,y:terrainHeight(x,z),h:4+r()*5,type:i%3});}return out;})();
export const GRASS_PATCHES=[[-35,39,7],[35,-31,8],[-103,35,6],[31,101,7],[-37,-104,7],[102,-39,6],[-102,-103,6],[100,103,6],[-30,98,6],[36,35,8]].map(([x,z,r])=>({x,z,r}));
export const inGrass=(x,z)=>GRASS_PATCHES.some(p=>(x-p.x)**2+(z-p.z)**2<p.r*p.r);
export const LOOT_SPOTS=[];
export function mapGeometry(){
 const list=[];
 for(const b of BUILDINGS){
  const add=(lx,lz,w,d,h,y=0,kind='wall',color=b.color)=>{const p=localPoint(b,lx,lz,y);list.push({...p,w:b.rot?d:w,d:b.rot?w:d,h,kind,color,shape:'box',building:b.index});};
  const strip=5.4,main=b.w-strip,run=b.d-4,steps=18;
  add(0,0,b.w,.0+b.d,.15,-.15,'floor',0xb7ad97);
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
   const y=f*b.level;add(-strip/2,0,main,b.d,.22,y-.22,f===b.floors?'roof':'floor',f===b.floors?0x647785:0xb7ad97);
   const end=f%2===1?1:-1;add(b.w/2-strip/2,end*(b.d/2-1),strip,2,.22,y-.22,f===b.floors?'roof':'floor',0x8c9b99);
  }
  b.routes=[];
  for(let f=0;f<b.floors;f++){
   const lane=b.w/2-(f%2===0?1.4:4),dir=f%2===0?1:-1;
   const route=[localPoint(b,lane,-dir*(run/2),f*b.level),localPoint(b,lane,dir*(b.d/2-.8), (f+1)*b.level),localPoint(b,b.w/2-strip-.9,dir*(b.d/2-1.6),(f+1)*b.level)];b.routes.push(route);
   for(let j=0;j<steps;j++){const z=-dir*run/2+dir*(j+.5)*run/steps,top=(j+1)*b.level/steps;add(lane,z,2.35,run/steps+.025,top,f*b.level,'step',0x929c97);}
  }
  const roof=b.h,exit=b.floors%2===1?1:-1,cx=b.w/2-strip/2;
  // Weatherproof roof over the stair opening, with a doorway onto the walkable roof.
  add(cx,0,strip,b.d,.22,roof+2.55,'roof',0x667f89);
  add(b.w/2,0,.35,b.d,2.55,roof,'stairwall',0xa8b5b3);
  for(const end of [-1,1])add(cx,end*b.d/2,strip,.35,2.55,roof,'stairwall',0xa8b5b3);
  const doorway=2.6,doorZ=exit*(b.d/2-2.1),left=b.w/2-strip;
  const lo=-b.d/2,hi=b.d/2;
  if(doorZ-doorway/2>lo)add(left,(lo+doorZ-doorway/2)/2,.35,doorZ-doorway/2-lo,2.55,roof,'stairwall',0xa8b5b3);
  if(doorZ+doorway/2<hi)add(left,(hi+doorZ+doorway/2)/2,.35,hi-doorZ-doorway/2,2.55,roof,'stairwall',0xa8b5b3);
  add(left,doorZ,.35,doorway,.4,roof+2.15,'stairwall',0xa8b5b3);
  for(const z of [-b.d/2,b.d/2]){if(b.index===0&&z<0){const lo=-b.w/2,hi=b.w/2-strip;add((lo-1.6)/2,z,-1.6-lo,.25,.65,roof,'parapet',0x889894);if(hi>1.6)add((hi+1.6)/2,z,hi-1.6,.25,.65,roof,'parapet',0x889894);}else add(-strip/2,z,main,.25,.65,roof,'parapet',0x889894);}
  if(b.index===1){for(const side of [-1,1])add(-b.w/2,side*(b.d/4+.8),.25,b.d/2-1.6,.65,roof,'parapet',0x889894);}else add(-b.w/2,0,.25,b.d,.65,roof,'parapet',0x889894);
  // Supplies live on tables/shelves, both ground and upper floor, never scattered along roads.
  const spots=[[-b.w*.22,-b.d*.24,0],[-b.w*.22,b.d*.24,0],[-b.w*.08,0,b.floors>1?b.level:0]];
  spots.forEach(([x,z,y],i)=>{add(x,z,2.8,1.15,.84,y,'table',0x906b45);for(let k=0;k<3;k++){const p=localPoint(b,x+(k-1)*.8,z,y+.96);LOOT_SPOTS.push({...p,id:`b${b.index}t${i}i${k}`,building:b.index,floor:y?1:0,type:i*3+k});}});
  add(-b.w*.25,b.d*.43,3,.6,1.6,0,'shelf',0x987453);
 }
 // A stepped maintenance catwalk connects the two-storey cottage and warehouse roofs.
 const a=BUILDINGS[0],b=BUILDINGS[1],x0=a.x+(a.rot?a.d:a.w)/2,x1=b.x-b.w/2;
 for(let i=0;i<10;i++){const t=(i+.5)/10,x=x0+(x1-x0)*t,y=a.y+a.h+(b.y+b.h-a.y-a.h)*t;list.push({x,z:a.z,w:(x1-x0)/10+.025,d:2.4,h:.2,y:y-.2,shape:'box',kind:'bridge',color:0x98784f});for(const side of [-1,1])list.push({x,z:a.z+side*1.15,w:(x1-x0)/10+.025,d:.12,h:.6,y:y,shape:'box',kind:'rail',color:0x6f8a87});}
 const r=rng(1277);for(let i=0;i<64;i++){const x=(r()-.5)*225,z=(r()-.5)*225;if(BUILDINGS.some(b=>Math.abs(x-b.x)<20&&Math.abs(z-b.z)<20))continue;list.push({x,z,w:2+r()*3.6,d:2+r()*3.6,h:1.3+r()*3.5,y:terrainHeight(x,z)-.1,shape:'ellipsoid',kind:'rock',color:i%3?0x8c9b85:0x687e75});}
 for(let i=0;i<7;i++){const x=86,z=-50+i*16;list.push({x,z,w:3.5,d:5,h:2.1,y:terrainHeight(x,z)-.1,shape:'ellipsoid',kind:'rock',color:0x73857b});}
 // Real low cover links hills, entrances, and climbable routes.
 for(const [x,z,w,d]of [[-36,16,11,1.1],[27,39,10,1.2],[-83,-42,1,12],[17,-94,9,1.1]])list.push({x,z,w,d,h:1.3,y:terrainHeight(x,z),shape:'box',kind:'cover',color:0x9b987e});
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

export function contains(b,x,z,pad=0){if(b.shape==='ellipsoid'||b.shape==='cylinder'){return((x-b.x)/(b.w/2+pad))**2+((z-b.z)/(b.d/2+pad))**2<1;}return Math.abs(x-b.x)<b.w/2+pad&&Math.abs(z-b.z)<b.d/2+pad;}
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
export function rayWorld(o,d,max){let distance=rayTerrain(o,d,max),object=null;for(const b of rayCandidates(o,d,Math.min(max,distance))){const t=rayBox(o,d,b,Math.min(max,distance));if(t<distance){distance=t;object=b;}}return{distance,object};}
export function blocked(x,z,y=terrainHeight(x,z),r=.32,height=1.78,step=.0){return nearby(x,z).some(b=>b.y<y+height-.04&&b.y+b.h>y+.045&&!(b.y+b.h<=y+step&&b.y<=y+.1)&&contains(b,x,z,r));}
export function supportHeight(x,z,ceiling=Infinity){let h=terrainHeight(x,z);for(const b of nearby(x,z)){const top=topAt(b,x,z);if(top<=ceiling+.06&&top>h)h=top;}return h;}
function actorBlocked(p,x,z,step=0,stance=p.stance||'stand'){const s=STANCES[stance]||STANCES.stand;const positions=stance==='prone'?[-.88,-.3,.3,.65]:[0];return positions.some(t=>blocked(x+Math.sin(p.yaw)*t,z+Math.cos(p.yaw)*t,p.y,s.radius,s.height,step));}
export function move(p,dx,dz){const accept=(x,z)=>{const g=terrainHeight(x,z),og=terrainHeight(p.x,p.z),distance=Math.hypot(x-p.x,z-p.z),step=p.stance==='prone'?.12:.27;return !(p.y<og+.3&&g-og>distance*1.12+.03)&&g<=p.y+step&&!actorBlocked(p,x,z,step);};const x=clamp(p.x+dx,-HALF,HALF),z=clamp(p.z+dz,-HALF,HALF);if(accept(x,p.z))p.x=x;if(accept(p.x,z))p.z=z;}
export function beginJump(p){
 if(p.onPlane){p.onPlane=false;p.gliding=true;p.chute=true;p.glideYaw=p.yaw;p.vy=-2;p.vx=Math.sin(p.yaw)*10;p.vz=Math.cos(p.yaw)*10;return true;}
 if(p.gliding||p.stance!=='stand'||p.y>supportHeight(p.x,p.z,p.y+.1)+.16)return false;
 // Vault only a narrow, reachable obstacle, with a clear landing and headroom.
 const sx=Math.sin(p.yaw),sz=Math.cos(p.yaw);for(const b of nearby(p.x,p.z)){const distance=rayBox([p.x,p.y+.7,p.z],[sx,0,sz],b,1.35),top=b.y+b.h;if(distance<1.35&&top<=p.y+2.15&&top>p.y+.45){for(const span of [1.7,2.1,2.6]){const x=clamp(p.x+sx*span,-HALF,HALF),z=clamp(p.z+sz*span,-HALF,HALF),y=supportHeight(x,z,top+.28);if(y<=p.y+2.2&&!blocked(x,z,y,.34,1.78)){const h=Math.max(top,p.y,y)+.48;let clear=true;for(const t of [.2,.4,.6,.8]){const qx=p.x+(x-p.x)*t,qz=p.z+(z-p.z)*t,qy=p.y+(y-p.y)*t+Math.sin(t*Math.PI)*(h-Math.max(p.y,y));if(nearby(qx,qz).some(q=>q!==b&&q.y<qy+1.78-.04&&q.y+q.h>qy+.05&&contains(q,qx,qz,.3))){clear=false;break;}}if(clear){p.vault={x0:p.x,y0:p.y,z0:p.z,x,z,y,t:0,h};return true;}}}}}
 p.vy=8.4;return true;
}
export function integrateMovement(p,i,dt,time=0){
 if(p.dead){p.vx=p.vz=0;return;}const oldX=p.x,oldZ=p.z;
 if(p.onPlane){p.x=-110+clamp(time/FLIGHT_SECONDS,0,1)*220;p.z=((p.seat||0)%5-2)*1.25;p.y=FLIGHT_HEIGHT;p.vx=220/FLIGHT_SECONDS;p.vy=p.vz=0;return;}
 if(p.vault){const v=p.vault;v.t+=dt;const a=clamp(v.t/.52,0,1),t=a*a*(3-2*a);p.x=v.x0+(v.x-v.x0)*t;p.z=v.z0+(v.z-v.z0)*t;p.y=v.y0+(v.y-v.y0)*t+Math.sin(t*Math.PI)*(v.h-Math.max(v.y0,v.y));p.vx=(p.x-oldX)/dt;p.vz=(p.z-oldZ)/dt;p.vy=0;if(a>=1)p.vault=null;return;}
 if(p.gliding){
  const edge=(p.x>HALF-28&&p.vx>0)||(p.x<-HALF+28&&p.vx<0)||(p.z>HALF-28&&p.vz>0)||(p.z<-HALF+28&&p.vz<0);if(edge&&time>(p.autoTurnUntil||0))p.autoTurnUntil=time+2.6;p.boundaryTurn=time<(p.autoTurnUntil||0);
  const heading=p.glideYaw??p.yaw,target=p.boundaryTurn?Math.atan2(-p.x,-p.z):i.yaw+(i.mx||0)*.9,diff=angleDiff(target,heading),turn=clamp(diff*2,-1.65,1.65);p.glideYaw=heading+turn*dt;p.bank=(p.bank||0)+(clamp(-turn*.34,-.55,.55)-(p.bank||0))*(1-Math.exp(-dt*5));
  const speed=11+(i.mz||0)*4,sink=5.3+Math.max(0,i.mz||0)*2-Math.min(0,i.mz||0)*.4,a=1-Math.exp(-dt*2.5);p.vx=(p.vx||0)+(Math.sin(p.glideYaw)*speed-(p.vx||0))*a;p.vz=(p.vz||0)+(Math.cos(p.glideYaw)*speed-(p.vz||0))*a;p.vy+=( -sink-p.vy)*(1-Math.exp(-dt*3));
  move(p,p.vx*dt,p.vz*dt);const oldY=p.y;p.y+=p.vy*dt;const ground=supportHeight(p.x,p.z,oldY);if(p.y<=ground+.08){p.y=ground;p.vy=0;p.gliding=p.chute=false;p.bank=0;}return;
 }
 const wanted=['stand','crouch','prone'].includes(i.stance)?i.stance:'stand';if(wanted===p.stance||!actorBlocked(p,p.x,p.z,0,wanted))p.stance=wanted;
 const s=stanceOf(p),groundBefore=supportHeight(p.x,p.z,p.y+.12),grounded=p.y<=groundBefore+.14&&p.vy<=0,boost=p.boost>0?1.035:1;
 const speed=p.usingPain?0:p.heal?1.1:(p.stance==='stand'&&i.sprint&&!i.aim?7.5:s.speed)*(i.aim?.75:1)*boost;
 const n=Math.max(1,Math.hypot(i.mx||0,i.mz||0)),dx=(i.mx||0)/n,dz=(i.mz||0)/n;
 move(p,(-Math.cos(i.yaw)*dx+Math.sin(i.yaw)*dz)*speed*dt,(Math.sin(i.yaw)*dx+Math.cos(i.yaw)*dz)*speed*dt);
 const step=p.stance==='prone'?.12:.28,ground=supportHeight(p.x,p.z,p.y+step);
 if(grounded&&ground>=p.y-.32&&ground<=p.y+step){p.y=ground;p.vy=0;}else{const oldY=p.y;p.vy=Math.max(-32,(p.vy||0)-18*dt);const next=p.y+p.vy*dt;
  if(p.vy>0){const ceiling=nearby(p.x,p.z).filter(b=>contains(b,p.x,p.z,s.radius)&&b.y>=oldY+s.height-.07&&b.y<next+s.height).sort((a,b)=>a.y-b.y)[0];if(ceiling){p.y=ceiling.y-s.height-.04;p.vy=0;}else p.y=next;}
  else{p.y=next;const landing=supportHeight(p.x,p.z,oldY+.02);if(p.y<=landing){p.y=landing;p.vy=0;}}
 }
 p.vx=(p.x-oldX)/Math.max(.001,dt);p.vz=(p.z-oldZ)/Math.max(.001,dt);
}
