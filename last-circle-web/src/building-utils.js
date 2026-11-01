export function localPoint(b,x,z,y=0){const f=b.flip?-1:1;return{x:b.x+(b.rot?-z:x)*f,z:b.z+(b.rot?x:z)*f,y:b.y+y};}
export function toLocal(b,x,z){const f=b.flip?-1:1,dx=(x-b.x)*f,dz=(z-b.z)*f;return{x:b.rot?dz:dx,z:b.rot?-dx:dz};}
export const buildingYaw=b=>(b.rot?-Math.PI/2:0)+(b.flip?Math.PI:0);
export function footprintParts(b){return[{x:0,z:0,w:b.w,d:b.d},...(b.annex?[b.annex]:[]),...(b.externalStairs?[{x:b.w/2+1.5,z:0,w:3.2,d:b.d+1.5}]:[])];}
