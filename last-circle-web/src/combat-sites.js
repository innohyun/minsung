import{POIS,BUILDINGS,COMPOUNDS,FARM_FIELDS,terrainHeight,roadAt,riverDistance}from'./map.js';
import{localPoint}from'./building-utils.js';
// Contextual compounds share the real solid parts used by bullets, walking and vehicles.
export function combatSites(){const out=[];
 const add=(x,z,w,d,h,kind,color=0x8c8a78,y=terrainHeight(x,z),extra={})=>{const b={x,z,w,d,h,y,kind,color,shape:'box',...extra};out.push(b);return b;};
 const free=(x,z,r=2)=>riverDistance(x,z)>20&&roadAt(x,z).distance>2&&!BUILDINGS.some(b=>x>b.bounds.minX-r&&x<b.bounds.maxX+r&&z>b.bounds.minZ-r&&z<b.bounds.maxZ+r);
 function crate(x,z,w=1.4,h=1.2,y=terrainHeight(x,z)){add(x,z,w,1.3,h,'cargo-crate',0x92724c,y);for(const side of[-1,1])add(x+side*(w/2-.06),z,.1,1.34,h,'crate-band',0x6e563c,y,{solid:false});}
 function wreck(x,z,yaw=0){const y=terrainHeight(x,z),c=Math.cos(yaw),s=Math.sin(yaw),part=(xx,zz,w,d,h,dy,kind,color)=>add(x+xx*c+zz*s,z-xx*s+zz*c,w,d,h,kind,color,y+dy,{shape:'obb',yaw});part(0,0,1.9,4.1,.65,.35,'abandoned-car',0x666957);part(0,-.55,1.75,1.65,.12,1.9,'wreck-roof',0x767462);for(const side of[-1,1]){part(side*.84,-.55,.12,1.7,.9,1,'wreck-pillar',0x60645a);for(const end of[-1,1])part(side*.88,end*1.4,.27,.65,.65,.03,'wreck-wheel',0x303c39);}part(0,1.35,1.8,1.25,.30,1,'wreck-hood',0x757561);}
 for(const b of BUILDINGS.filter(b=>b.index%7===2&&b.style!=='warehouse')){const p=localPoint(b,b.w/2+1.3,b.d*.28);if(!free(p.x,p.z,.6))continue;const y=terrainHeight(p.x,p.z);add(p.x,p.z,1.5,2.1,1.35,'dumpster',0x516c63,y);add(p.x,p.z,1.64,2.24,.16,'dumpster-lid',0x394c49,y+1.35);}
 for(const c of COMPOUNDS){
  if(c.id==='freight-yard')for(const side of[-1,1])for(let n=0;n<5;n++)crate(c.x+side*49,c.z-25+n*8,1.1+n%2*.6,.7+n%3*.4);
  if(c.id==='parking'){for(const side of[-1,1])for(let n=0;n<8;n++){const x=c.x-26+n*7.4,z=c.z+side*11;add(x,z,.12,5.8,.025,'parking-mark',0xd0c5a1,terrainHeight(x,z)+.035,{solid:false});}wreck(c.x+22,c.z-10,0);for(const side of[-1,1])add(c.x+side*29,c.z,.2,32,.6,'parking-rail',0x8a8e7d);}

 }
 for(const f of FARM_FIELDS)for(const side of[-1,1]){const x=f.x+side*18,z=f.z+18,y=terrainHeight(x,z),h=side<0?1.15:2.0;add(x,z,2.4,1.7,h,'hay-stack',0xb09a54,y,{model:'hay_stack'});}
 // Vehicles on verges and loading bays belong to roads rather than empty woodland.
 for(const poi of POIS.filter(p=>p.kind==='village')){const vertical=['north','south'].includes(poi.id),x=poi.x+(vertical?12:110),z=poi.z+(vertical?110:12);if(free(x,z,2.4))wreck(x,z,vertical?0:Math.PI/2);}
 // Stacks of cut timber beside the lumber cabins form low climbing cover.
 for(const b of BUILDINGS.filter(b=>b.style==='lumberjack')){const p=localPoint(b,-b.w/2-3.5,b.d*.25);if(!free(p.x,p.z,.8))continue;for(let row=0;row<2;row++)for(let n=0;n<3-row;n++)add(p.x+(n-(2-row)/2)*.72,p.z,.72,4,.72,'stacked-log',0x846746,terrainHeight(p.x,p.z)+row*.62,{shape:'log',yaw:0});}
 return out;}
