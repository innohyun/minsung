import {rayWorld,terrainHeight,supportHeight} from './world.js';
import {eyePosition} from './weapons.js';
import{throwableInfo}from'./throwables.js';
import {rayVehicle} from './vehicles.js';
function trace(o,d,max,doors,vehicles){const hit=rayWorld(o,d,max,doors);for(const v of vehicles||[]){const t=rayVehicle(o,d,v,max);if(t<hit.distance){hit.distance=t;hit.object=v;}}return hit;}
export function grenadeLaunch(p,doors,vehicles){const power=Math.max(0,Math.min(1,p.throwPower??.65)),speed=4+power*20,type=throwableInfo(p.throwable),eye=eyePosition(p),dx=Math.sin(p.yaw),dz=Math.cos(p.yaw),safe=trace(eye,[dx,0,dz],.65,doors,vehicles).distance,offset=Math.min(.6,Math.max(.05,safe-.08));return{x:eye[0]+dx*offset,y:eye[1]-.06,z:eye[2]+dz*offset,vx:dx*speed,vy:2.1+power*3.1+Math.max(-1.5,Math.min(5,Math.sin(p.pitch)*speed*.45)),vz:dz*speed,fuse:type.fuse,kind:type.id,delay:.28};}
export function moveGrenade(g,dt,doors,vehicles){g.fuse-=dt;if(g.delay>0){g.delay-=dt;return;}if(g.sleeping)return;g.vy-=12*dt;const speed=Math.hypot(g.vx,g.vy,g.vz);if(speed<1e-6)return;const d=[g.vx/speed,g.vy/speed,g.vz/speed],hit=trace([g.x,g.y,g.z],d,speed*dt+.08,doors,vehicles);if(hit.distance<speed*dt+.08){g.contacted=true;if(g.kind==='molotov')g.fuse=0;const travel=Math.max(0,hit.distance-.09);g.x+=d[0]*travel;g.y+=d[1]*travel;g.z+=d[2]*travel;const floor=supportHeight(g.x,g.z,g.y+.2);if(!hit.object||g.y-floor<.26||d[1]<-.65){g.y=Math.max(g.y,floor+.10);g.vy=Math.abs(g.vy)*.16;g.vx*=.58;g.vz*=.58;g.grounded=true;}else{const b=hit.object,dx=Math.abs((g.x-b.x)/(b.w||2)),dz=Math.abs((g.z-b.z)/(b.d||2));if(dx>dz)g.vx*=-.22;else g.vz*=-.22;g.vy*=.5;}}
 else{g.x+=g.vx*dt;g.y+=g.vy*dt;g.z+=g.vz*dt;g.grounded=false;}const floor=supportHeight(g.x,g.z,g.y+.16);if(g.y<floor+.12){g.contacted=true;if(g.kind==='molotov')g.fuse=0;g.y=floor+.12;g.vy=Math.abs(g.vy)*.12;g.grounded=true;}
 if(g.grounded){const horizontal=Math.hypot(g.vx,g.vz),factor=horizontal?Math.max(0,1-8*dt/horizontal):0;g.vx*=factor;g.vz*=factor;if(Math.hypot(g.vx,g.vz)<.25&&Math.abs(g.vy)<.7){g.vx=g.vy=g.vz=0;g.sleeping=true;}}
}
export function predictGrenade(p,doors,vehicles){const g=grenadeLaunch(p,doors,vehicles),steps=Math.ceil(g.fuse/.04),points=[[g.x,g.y,g.z]];for(let i=0;i<steps;i++){moveGrenade(g,.04,doors,vehicles);if(i%2===0)points.push([g.x,g.y,g.z]);if(g.fuse<=0||g.sleeping)break;}return{points,landing:[g.x,g.y,g.z]};}
// A short presentation buffer smooths 25 Hz snapshots without changing impact authority.
export class ProjectileTrack{
 constructor(){this.samples=[];}
 push(g,time){const a=this.samples;if(a.at(-1)?.time===time)return;a.push({time,g:{...g}});if(a.length>5)a.shift();}
 sample(time,doors,vehicles){const a=this.samples;if(!a.length)return null;for(let i=1;i<a.length;i++)if(a[i].time>=time){const lo=a[i-1],hi=a[i],t=Math.max(0,Math.min(1,(time-lo.time)/Math.max(.001,hi.time-lo.time))),g={...lo.g};for(const k of['x','y','z'])g[k]=lo.g[k]+(hi.g[k]-lo.g[k])*t;return g;}const last=a.at(-1),g={...last.g};let age=Math.min(.12,Math.max(0,time-last.time));while(age>1e-6){const dt=Math.min(1/60,age);moveGrenade(g,dt,doors,vehicles);age-=dt;}return g;}
}
