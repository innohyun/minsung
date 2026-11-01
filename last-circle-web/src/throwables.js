export const THROWABLES=[
 {id:'frag',name:'수류탄',field:'grenades',color:'#667844',fuse:3.1},
 {id:'smoke',name:'연막탄',field:'smokes',color:'#aeb9ad',fuse:1.8},
 {id:'flash',name:'섬광탄',field:'flashes',color:'#a99c70',fuse:1.4},
 {id:'molotov',name:'화염병',field:'molotovs',color:'#997237',fuse:3.1}
];
export const TRAP={id:'trap',name:'강철 덫',field:'traps',color:'#9da5a1',place:true};
export const UTILITIES=[...THROWABLES,TRAP];
export const throwableInfo=id=>UTILITIES.find(t=>t.id===id)||THROWABLES[0];
export const throwableCount=(p,id=p.throwable)=>p[throwableInfo(id).field]||0;
export function equipThrowable(p,id){const t=UTILITIES.find(t=>t.id===id);if(!t||!p[t.field]||p.dead||p.downed||p.onPlane||p.falling||p.gliding||p.vehicleId||p.reload||p.switchLeft||p.usingPain)return false;p.held='throwable';p.throwable=id;p.grenadeAim=true;p.equipLeft=.45;p.input.fire=false;return true;}
export function weaponCycle(p){return [...(p.loadout||[]).flatMap((g,i)=>g?['equip:'+i]:[]),...UTILITIES.filter(t=>p[t.field]>0).map(t=>'utility:'+t.id)];}
export function cycleWeapon(p,direction=1){const choices=weaponCycle(p);if(!choices.length)return null;const current=p.held==='throwable'?'utility:'+p.throwable:'equip:'+p.activeSlot,index=choices.indexOf(current);return choices[(index+direction+choices.length)%choices.length];}
export function segmentDistance(a,b,p){const d=b.map((v,i)=>v-a[i]),len=d.reduce((n,v)=>n+v*v,0),t=len?Math.max(0,Math.min(1,d.reduce((n,v,i)=>n+(p[i]-a[i])*v,0)/len)):0;const point=a.map((v,i)=>v+d[i]*t);return{distance:Math.hypot(...point.map((v,i)=>v-p[i])),point};}
export function smokeBlocks(s,a,b){return(s.smokeClouds||[]).some(c=>{if(s.time<c.at+.45||s.time>c.until)return false;const r=c.r*Math.min(1,(s.time-c.at)/2);return segmentDistance(a,b,[c.x,c.y+1.7,c.z]).distance<r*.8;});}
