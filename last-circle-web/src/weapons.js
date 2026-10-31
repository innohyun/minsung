export const WEAPONS=[
 {id:'m416',name:'M416',caliber:'556',magazine:30,reload:2.2,interval:.11,damage:32,head:3.3,range:185,spread:.009,recoil:.026,sight:'dot',zoom:1.35,color:0x576b65,length:1.02},
 {id:'akm',name:'AKM',caliber:'762',magazine:30,reload:2.45,interval:.13,damage:40,head:2.75,range:185,spread:.014,recoil:.039,sight:'iron',zoom:1.25,color:0x967044,length:1.12},
 {id:'ump45',name:'UMP45',caliber:'45',magazine:25,reload:1.95,interval:.085,damage:27,head:3.5,range:115,spread:.012,recoil:.019,sight:'holo',zoom:1.4,color:0x414e55,length:.76},
 {id:'kar98k',name:'Kar98k',caliber:'762',magazine:5,reload:3.15,interval:1.25,damage:85,head:2.5,range:260,spread:.001,recoil:.075,sight:'scope',zoom:4,color:0x91683d,length:1.38},
 {id:'s12k',name:'S12K',caliber:'12g',magazine:5,reload:2.65,interval:.37,damage:17,head:2,pellets:7,range:65,spread:.064,recoil:.06,sight:'shotgun',zoom:1.15,color:0x526052,length:1.03}
];
export const STANCES={stand:{height:1.78,eye:1.53,speed:4.7,radius:.32,recoil:1},crouch:{height:1.22,eye:1.05,speed:2.3,radius:.34,recoil:.55},prone:{height:.55,eye:.36,speed:.95,radius:.29,recoil:.23}};
export const CALIBERS={556:'5.56mm',762:'7.62mm',45:'.45 ACP','12g':'12게이지'};
export const getWeapon=p=>WEAPONS[p.weapon]||WEAPONS[0];
const VAULT_STANCE={...STANCES.crouch,height:1.12,eye:.87};
export const stanceOf=p=>p.vault?.window?VAULT_STANCE:STANCES[p.stance]||STANCES.stand;
export const magazineSize=p=>getWeapon(p).magazine;
export const reserveAmmo=p=>p.bag?.[getWeapon(p).caliber]||0;
export function eyePosition(p){const e=stanceOf(p).eye,forward=p.stance==='prone'?.63:0;return[p.x+Math.sin(p.yaw)*forward,p.y+e,p.z+Math.cos(p.yaw)*forward];}
export function bodyParts(p){
 const compact=!!p.vault?.window,stance=compact?'crouch':p.stance||'stand',out=[],sin=Math.sin(p.yaw||0),cos=Math.cos(p.yaw||0);
 const point=(x,y,z)=>{if(p.gliding){const r=p.bank||0,nx=x*Math.cos(r)-y*Math.sin(r);y=x*Math.sin(r)+y*Math.cos(r);x=nx;}return[p.x+x*cos+z*sin,p.y+y,p.z-x*sin+z*cos];};
 const sphere=(zone,x,y,z,r)=>out.push({zone,a:point(x,y,z),b:point(x,y,z),r});
 const limb=(zone,a,b,r)=>out.push({zone,a:point(...a),b:point(...b),r});
 if(stance==='prone'){
  sphere('head',0,.35,.69,.195);limb('torso',[0,.31,-.35],[0,.32,.39],.25);
  for(const side of [-1,1]){limb('arm',[side*.29,.27,.22],[side*.24,.22,.88],.11);limb('leg',[side*.15,.21,-.33],[side*.2,.13,-1.02],.13);}
 }else{
  const c=stance==='crouch';sphere('head',0,compact?.89:c?1.1:1.64,c?.12:.05,.205);
  limb('torso',[0,compact?.35:c?.5:.82,0],[0,compact?.72:c?.91:1.38,c?.12:.05],.265);
  for(const side of [-1,1]){
   const hip=compact?.3:c?.46:.88,shoulder=[side*.31,hip+.55,.08],elbow=[side*.42,hip+.29,.25],hand=p.view==='first'?[side>0?.04:-.25,hip+.31,side>0?.72:.37]:[side*.34,hip+.02,0];limb('arm',shoulder,elbow,.115);limb('arm',elbow,hand,.105);
   const knee=[side*.15,c?.28:.48,c?.37:.08],foot=[side*.15,.12,c?.12:.04];limb('leg',[side*.15,hip,0],knee,.135);limb('leg',knee,foot,.13);
  }
 }
 return out;
}
// Exact ray/sphere and ray/capsule intersections, including rays tangent to a head.
export function raySphere(o,d,c,r,max=Infinity){const ox=o[0]-c[0],oy=o[1]-c[1],oz=o[2]-c[2],b=ox*d[0]+oy*d[1]+oz*d[2],v=ox*ox+oy*oy+oz*oz-r*r,h=b*b-v;if(h<0)return Infinity;const t=-b-Math.sqrt(h),far=-b+Math.sqrt(h);return far<0?Infinity:Math.max(0,t)<=max?Math.max(0,t):Infinity;}
export function rayCapsule(o,d,a,b,r,max=Infinity){
 const ba=b.map((v,i)=>v-a[i]),oa=o.map((v,i)=>v-a[i]),dot=(v,w)=>v[0]*w[0]+v[1]*w[1]+v[2]*w[2],baba=dot(ba,ba);
 if(baba<1e-8)return raySphere(o,d,a,r,max);
 const bard=dot(ba,d),baoa=dot(ba,oa),rdoa=dot(d,oa),oaoa=dot(oa,oa),A=baba-bard*bard,B=baba*rdoa-baoa*bard,C=baba*oaoa-baoa*baoa-r*r*baba;
 let best=Math.min(raySphere(o,d,a,r,max),raySphere(o,d,b,r,max));
 const h=B*B-A*C;if(Math.abs(A)>1e-8&&h>=0){const t=(-B-Math.sqrt(h))/A,y=baoa+t*bard;if(t>=0&&t<=max&&y>=0&&y<=baba)best=Math.min(best,t);}
 return best;
}
export function hitBody(o,d,p,max){let best=null;for(const part of bodyParts(p)){const t=rayCapsule(o,d,part.a,part.b,part.r,max);if(t<max&&(!best||t<best.distance))best={distance:t,zone:part.zone};}return best;}
export function bodyDamage(weapon,zone){return weapon.damage*(zone==='head'?weapon.head:zone==='leg'?.55:zone==='arm'?.72:1);}
