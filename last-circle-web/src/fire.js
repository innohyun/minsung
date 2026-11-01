import{riverDistance,WATER_Y,rayWorld}from'./world.js';
import{stanceOf}from'./weapons.js';
export function submerged(p){return !p.vehicleId&&riverDistance(p.x,p.z)<9&&p.y+stanceOf(p).height*.45<WATER_Y+.06;}
export function ignite(p,owner,time){if(p.dead||submerged(p)||(p.wetUntil||0)>time)return false;if(!p.burning){p.burning=true;p.burnTick=time+1;p.burnOwner=owner;}return true;}
function unobstructed(a,b,doors){const o=[a.x,a.y+.45,a.z],v=[b.x-o[0],b.y+.45-o[1],b.z-o[2]],n=Math.hypot(...v);return n<.01||rayWorld(o,v.map(x=>x/n),n,doors).distance>=n-.12;}
export function updateBurning(s,damage){
 for(const p of s.players){if(p.dead){p.burning=false;continue;}if(submerged(p)){p.burning=false;p.wetUntil=s.time+3;continue;}for(const f of s.firePatches)if(f.until>s.time&&Math.hypot(p.x-f.x,p.z-f.z)<f.r&&Math.abs(p.y-f.y)<1.5&&unobstructed(f,p,s.doors))ignite(p,f.owner,s.time);}
 const burning=s.players.filter(p=>p.burning&&!p.dead);for(const p of burning){for(const q of s.players)if(q!==p&&!q.dead&&!q.vehicleId&&Math.hypot(p.x-q.x,p.z-q.z)<.85&&Math.abs(p.y-q.y)<.8&&unobstructed(p,q,s.doors))ignite(q,p.burnOwner,s.time);while(p.burning&&!p.dead&&s.time+1e-6>=(p.burnTick||s.time+1)){p.burnTick+=1;damage(p,5,s.players.find(q=>q.id===p.burnOwner),'fire');}}
}
