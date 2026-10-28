// One terrain/cover definition is shared by rendering, movement and server hitscan.
export const HALF=118;
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function rng(seed=1){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const hill=(x,z,cx,cz,s,h)=>h*Math.exp(-((x-cx)**2+(z-cz)**2)/(s*s));
function rawHeight(x,z){
 return hill(x,z,-36,37,25,11)+hill(x,z,37,-32,24,13)+hill(x,z,-97,94,30,17)+hill(x,z,70,92,28,8)
  +hill(x,z,-38,-110,30,10)+smooth(80,86,x)*11-smooth(-83,-74,z)*smooth(-73,-64,x)*3
  +Math.sin(x*.06)*Math.cos(z*.047)*.7;
}
const definitions=[
 [-66,-66,16,13,0,'cottage',3.5,0xb6ab8b], [0,-66,25,17,0,'warehouse',5,0xaab5ad], [66,-66,19,17,1,'ruins',3.1,0xb3a58b],
 [-66,0,12,13,0,'tower',6.5,0x969e91], [0,0,21,15,1,'barn',4.4,0x9b7e64], [66,0,23,21,0,'courtyard',3.3,0xc0b294],
 [-66,66,16,20,1,'farmhouse',4,0xc3b899], [0,66,27,12,1,'garage',3.6,0x909c9d], [66,66,15,23,0,'chapel',5.8,0xb7ae9b]
];
export const BUILDINGS=definitions.map(([x,z,w,d,rot,style,h,color],index)=>({x,z,w,d,rot,style,h,color,index,y:rawHeight(x,z)}));
function heightFormula(x,z){
 let h=rawHeight(x,z);
 for(const b of BUILDINGS){const w=b.rot?b.d:b.w,d=b.rot?b.w:b.d;const edge=Math.max(Math.abs(x-b.x)-w/2,Math.abs(z-b.z)-d/2);h+=(b.y-h)*(1-smooth(1,10,edge));}
 return h;
}
const RES=2,COUNT=161,MIN=-160,heights=new Float32Array(COUNT*COUNT);
for(let z=0;z<COUNT;z++)for(let x=0;x<COUNT;x++)heights[z*COUNT+x]=heightFormula(MIN+x*RES,MIN+z*RES);
export function terrainHeight(x,z){
 const gx=clamp((x-MIN)/RES,0,COUNT-1.001),gz=clamp((z-MIN)/RES,0,COUNT-1.001),ix=Math.floor(gx),iz=Math.floor(gz),a=gx-ix,b=gz-iz;
 return (heights[iz*COUNT+ix]*(1-a)+heights[iz*COUNT+ix+1]*a)*(1-b)+(heights[(iz+1)*COUNT+ix]*(1-a)+heights[(iz+1)*COUNT+ix+1]*a)*b;
}
export const TREES=(()=>{const r=rng(771),out=[];for(let i=0;i<95;i++){const x=(r()-.5)*286,z=(r()-.5)*286;if(BUILDINGS.some(b=>Math.abs(x-b.x)<19&&Math.abs(z-b.z)<19)||Math.abs(x)<7||Math.abs(z)<7)continue;out.push({x,z,y:terrainHeight(x,z),h:4+r()*5,type:i%3});}return out;})();
export function mapGeometry(){
 const boxes=[];
 for(const b of BUILDINGS){
  const add=(lx,lz,w,d,h=b.h,dy=0,kind='wall')=>boxes.push({x:b.x+(b.rot?-lz:lx),z:b.z+(b.rot?lx:lz),w:b.rot?d:w,d:b.rot?w:d,h,y:b.y+dy,kind,color:kind==='wall'?b.color:0x806341,building:b.index});
  const front=b.style==='garage'?7:b.style==='warehouse'?5:3;
  add(-(b.w+front)/4,-b.d/2,(b.w-front)/2,.55);add((b.w+front)/4,-b.d/2,(b.w-front)/2,.55);
  add(0,b.d/2,b.w,.55);
  // Usable window gaps in the side walls, with cover below and above eye height.
  for(const side of [-1,1]){
   add(side*b.w/2,0,.55,b.d,1.0);
   add(side*b.w/2,0,.55,b.d,Math.max(.6,b.h-2.15),2.15);
   add(side*b.w/2,-b.d*.36,.55,b.d*.28,1.15,1);
   add(side*b.w/2,b.d*.36,.55,b.d*.28,1.15,1);
  }
  if(['warehouse','garage'].includes(b.style))add(0,0,b.w+.9,b.d+.9,.25,b.h,'roof');
  if(b.style==='chapel')add(-b.w*.34,b.d*.42,3.5,3.5,8.5,0,'spire');
  if(b.style==='garage'){add(b.w*.25,-b.d/2-2,2,2,1.8,0,'metal');add(-b.w*.2,-b.d/2-2,2.8,1.3,1.3,0,'metal');}
  if(['cottage','farmhouse'].includes(b.style))add(-b.w*.25,2,.9,.9,2.4,b.h,'chimney');
  if(b.style==='tower'){add(0,0,b.w+1,b.d+1,.35,b.h+.225,'platform');add(0,b.d*.45,b.w,.3,.9,b.h+.7,'parapet');}

  if(b.style==='courtyard'){add(0,2,b.w*.4,.6,1.4);add(4,5,2,2,1.4,0,'crate');}
  else if(b.style==='ruins'){add(-3,0,.7,7,1.3);add(3,3,4,1,1.1,0,'rubble');}
  else{add(b.w*.18,b.d*.15,2.4,1.8,1.2,0,'crate');add(-b.w*.23,-b.d*.15,1.6,1.3,.95,0,'crate');}
 }
 const r=rng(1277);
 for(let i=0;i<74;i++){
  const x=(r()-.5)*227,z=(r()-.5)*227;
  if(BUILDINGS.some(b=>Math.abs(x-b.x)<17&&Math.abs(z-b.z)<17))continue;
  boxes.push({x,z,w:1.5+r()*3.5,d:1.5+r()*3.5,h:1+r()*3.6,y:terrainHeight(x,z)-.15,kind:i%5===0?'log':'rock',color:i%3?0x828d80:0x66746b});
 }
 // Cliff-side boulders and chest-high broken retaining walls create firing positions.
 for(let i=0;i<7;i++){const x=85,z=-49+i*15;boxes.push({x,z,w:3.5,d:6,h:2.1,y:terrainHeight(x,z),kind:'rock',color:0x757d70});}
 boxes.push({x:-35,z:16,w:12,d:1.2,h:1.25,y:terrainHeight(-35,16),kind:'rubble',color:0x8c947d});
 for(const t of TREES)boxes.push({x:t.x,z:t.z,w:.48,d:.48,h:t.h*.65,y:t.y,kind:'trunk',color:0x6a593f});
 return boxes;
}
export const BOXES=mapGeometry();
export function rayBox(o,d,b,max=1e4){
 let near=0,far=max;
 for(const [i,min,mx] of [[0,b.x-b.w/2,b.x+b.w/2],[1,b.y,b.y+b.h],[2,b.z-b.d/2,b.z+b.d/2]]){
  if(Math.abs(d[i])<1e-7){if(o[i]<min||o[i]>mx)return Infinity;}
  else{let a=(min-o[i])/d[i],c=(mx-o[i])/d[i];if(a>c)[a,c]=[c,a];near=Math.max(near,a);far=Math.min(far,c);if(near>far)return Infinity;}
 }
 return near;
}
export function rayTerrain(o,d,max){
 let previous=0;
 for(let t=.4;t<max;t+=1.3){const x=o[0]+d[0]*t,y=o[1]+d[1]*t,z=o[2]+d[2]*t;
  if(y<=terrainHeight(x,z)){let lo=previous,hi=t;for(let i=0;i<7;i++){const m=(lo+hi)/2;if(o[1]+d[1]*m<=terrainHeight(o[0]+d[0]*m,o[2]+d[2]*m))hi=m;else lo=m;}return hi;}previous=t;
 }return Infinity;
}
export function blocked(x,z,y=terrainHeight(x,z),r=.38){return BOXES.some(b=>y<b.y+b.h-.06&&y+1.65>b.y+.06&&x>b.x-b.w/2-r&&x<b.x+b.w/2+r&&z>b.z-b.d/2-r&&z<b.z+b.d/2+r);}
export function supportHeight(x,z,ceiling=Infinity){
 let h=terrainHeight(x,z);
 for(const b of BOXES)if(b.y+b.h<=ceiling+.08&&x>b.x-b.w/2&&x<b.x+b.w/2&&z>b.z-b.d/2&&z<b.z+b.d/2)h=Math.max(h,b.y+b.h);
 return h;
}
export function move(p,dx,dz){
 const accept=(x,z)=>{const ground=terrainHeight(x,z),oldGround=terrainHeight(p.x,p.z),distance=Math.hypot(x-p.x,z-p.z);const steep=p.y<oldGround+.3&&ground-oldGround>distance*1.08+.025;return !steep&&ground<=p.y+.52&&!blocked(x,z,p.y);};
 const x=clamp(p.x+dx,-HALF,HALF),z=clamp(p.z+dz,-HALF,HALF);
 if(accept(x,p.z))p.x=x;if(accept(p.x,z))p.z=z;
}
export function integrateMovement(p,i,dt,time=0){
 if(p.dead){p.vx=0;p.vz=0;return;}
 const oldX=p.x,oldZ=p.z;
 if(p.onPlane){p.x=-105+clamp(time/12,0,1)*210;p.z=((p.seat||0)%5-2)*1.2;p.y=52;p.vy=0;p.vx=17.5;p.vz=0;p.chute=false;return;}
 const groundBefore=supportHeight(p.x,p.z,p.y+.15),wasGrounded=p.y<=groundBefore+.13&&p.vy<=0;
 const heightAbove=p.y-groundBefore;p.chute=heightAbove>2&&heightAbove<21&&p.vy<0;
 const speed=p.heal?1.2:p.chute?5:i.crouch?2:i.aim?3:i.sprint?7.5:4.7;
 const n=Math.max(1,Math.hypot(i.mx||0,i.mz||0)),dx=(i.mx||0)/n,dz=(i.mz||0)/n;
 move(p,(-Math.cos(i.yaw)*dx+Math.sin(i.yaw)*dz)*speed*dt,(Math.sin(i.yaw)*dx+Math.cos(i.yaw)*dz)*speed*dt);
 const ground=supportHeight(p.x,p.z,p.y+.52);
 if(wasGrounded&&ground>=p.y-.35&&ground<=p.y+.52){p.y=ground;p.vy=0;}
 else{const oldY=p.y;p.vy=Math.max(p.chute?-4.8:-30,(p.vy||0)-(p.chute?2:17)*dt);p.y+=p.vy*dt;const landing=supportHeight(p.x,p.z,oldY);if(p.y<=landing){p.y=landing;p.vy=0;p.chute=false;}}
 p.vx=(p.x-oldX)/Math.max(.001,dt);p.vz=(p.z-oldZ)/Math.max(.001,dt);
}
