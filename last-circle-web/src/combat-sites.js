import{POIS,BUILDINGS,COMPOUNDS,terrainHeight,roadAt,riverDistance}from'./map.js';
import{localPoint}from'./building-utils.js';
// Contextual compounds share the real solid parts used by bullets, walking and vehicles.
export function combatSites(){const out=[];
 const add=(x,z,w,d,h,kind,color=0x8c8a78,y=terrainHeight(x,z),extra={})=>{const b={x,z,w,d,h,y,kind,color,shape:'box',...extra};out.push(b);return b;};
 const free=(x,z,r=2)=>riverDistance(x,z)>20&&roadAt(x,z).distance>2&&!BUILDINGS.some(b=>x>b.bounds.minX-r&&x<b.bounds.maxX+r&&z>b.bounds.minZ-r&&z<b.bounds.maxZ+r);
 function crate(x,z,w=1.4,h=1.2,y=terrainHeight(x,z)){add(x,z,w,1.3,h,'cargo-crate',0x92724c,y);for(const side of[-1,1])add(x+side*(w/2-.06),z,.1,1.34,h,'crate-band',0x6e563c,y,{solid:false});}
 function wreck(x,z,yaw=0){const y=terrainHeight(x,z),c=Math.cos(yaw),s=Math.sin(yaw),part=(xx,zz,w,d,h,dy,kind,color)=>add(x+xx*c+zz*s,z-xx*s+zz*c,w,d,h,kind,color,y+dy,{shape:'obb',yaw});part(0,0,1.9,4.1,.65,.35,'abandoned-car',0x666957);part(0,-.55,1.75,1.65,.12,1.9,'wreck-roof',0x767462);for(const side of[-1,1]){part(side*.84,-.55,.12,1.7,.9,1,'wreck-pillar',0x60645a);for(const end of[-1,1])part(side*.88,end*1.4,.27,.65,.65,.03,'wreck-wheel',0x303c39);}part(0,1.35,1.8,1.25,.30,1,'wreck-hood',0x757561);}
 function pipe(x,z,y=terrainHeight(x,z)){add(x,z,3.3,5,3.3,'concrete-pipe',0xa3a092,y,{solid:false});const count=48,step=3.3/count;for(let row=0;row<count;row++){const lo=-1.65+row*step,hi=lo+step,near=Math.min(Math.abs(lo),Math.abs(hi)),outer=Math.sqrt(Math.max(0,1.65**2-near**2)),far=Math.max(Math.abs(lo),Math.abs(hi)),inner=far<1.25?Math.sqrt(Math.max(0,1.25**2-far**2)):0;if(inner>0){for(const sign of[-1,1])add(x+sign*(inner+outer)/2,z,outer-inner,5,step,'pipe-solid',0xa3a092,y+1.65+lo,{hidden:true});}else add(x,z,outer*2,5,step,'pipe-solid',0xa3a092,y+1.65+lo,{hidden:true});}}
 for(const b of BUILDINGS.filter(b=>b.index%7===2&&b.style!=='warehouse')){const p=localPoint(b,b.w/2+1.3,b.d*.28);if(!free(p.x,p.z,.6))continue;const y=terrainHeight(p.x,p.z);add(p.x,p.z,1.5,2.1,1.35,'dumpster',0x516c63,y);add(p.x,p.z,1.64,2.24,.16,'dumpster-lid',0x394c49,y+1.35);}
 for(const c of COMPOUNDS){
  if(c.id==='freight-yard'){for(let row=0;row<2;row++)for(let col=0;col<4;col++){const x=c.x-42+col*28,z=c.z+32+row*9,y=terrainHeight(x,z);add(x,z,11.5,5,2.6,'cargo-container',[0x546e74,0x846e4b,0x697857,0x874f42][col],y);if((col+row)%3===0)add(x,z,11.5,5,2.6,'cargo-container',0x686e71,y+2.6);crate(x-7,z,1.4,.8);crate(x-7,z+1.6,1.4,1.6);}
   for(const side of[-1,1])for(let n=0;n<5;n++)crate(c.x+side*49,c.z-25+n*8,1.1+n%2*.6,.7+n%3*.4);
  }
  if(c.id==='construction'){for(const side of[-1,1])for(let n=0;n<4;n++){const x=c.x+side*35,z=c.z-25+n*6;add(x,z,.7,5.85,1.15,'construction-barrier',n%2?0xb2a883:0x8e948c);add(x,z,.74,5.85,.18,'barrier-stripe',0xb59c58,terrainHeight(x,z)+.7,{solid:false});}pipe(c.x+23,c.z+24);pipe(c.x+27,c.z+24);pipe(c.x+25,c.z+24,terrainHeight(c.x+25,c.z+24)+Math.sqrt(3.3**2-2**2));
   for(const side of[-1,1])for(const end of[-1,1]){const x=c.x+side*10,z=c.z+26+end*8;add(x,z,.55,.55,7,'construction-column',0x9e9c8b);}
   for(const side of[-1,1])add(c.x+side*10,c.z+26,.55,16,.5,'construction-beam',0x9d9989,c.y+6.5);for(const end of[-1,1])add(c.x,c.z+26+end*8,20,.55,.5,'construction-beam',0x9d9989,c.y+6.5);for(let n=0;n<5;n++)crate(c.x-25+n*3,c.z+30,1.6,.7+n%3*.6);
  }
  if(c.id==='parking'){for(const side of[-1,1])for(let n=0;n<4;n++){const x=c.x+side*(12+n*6),z=c.z+29;add(x,z,.13,10,.025,'parking-mark',0xd0c5a1,terrainHeight(x,z)+.035,{solid:false});}wreck(c.x-28,c.z+28,0);for(let n=0;n<4;n++)add(c.x-36+n*7,c.z-23,6.8,.55,.85,'construction-barrier',0x999b8a);}
 }
 // Vehicles on verges and loading bays belong to roads rather than empty woodland.
 for(const poi of POIS.filter(p=>p.kind==='village')){const vertical=['north','south'].includes(poi.id),x=poi.x+(vertical?12:110),z=poi.z+(vertical?110:12);if(free(x,z,2.4))wreck(x,z,vertical?0:Math.PI/2);}
 // Stacks of cut timber beside the lumber cabins form low climbing cover.
 for(const b of BUILDINGS.filter(b=>b.style==='lumberjack')){const p=localPoint(b,-b.w/2-3.5,b.d*.25);if(!free(p.x,p.z,.8))continue;for(let row=0;row<2;row++)for(let n=0;n<3-row;n++)add(p.x+(n-(2-row)/2)*.72,p.z,.72,4,.72,'stacked-log',0x846746,terrainHeight(p.x,p.z)+row*.62,{shape:'log',yaw:0});}
 return out;}
