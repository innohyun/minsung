export const WEAPONS=[
 {id:'m416',name:'M416',caliber:'556',magazine:30,reload:2.1,interval:.09,damage:40,head:2.65,range:240,spread:.009,recoil:.026,sight:'dot',zoom:1.35,color:0x576b65,length:1.02,family:'ar'},
 {id:'akm',name:'AKM',caliber:'762',magazine:30,reload:2.5,interval:.10,damage:48,head:2.3,range:240,spread:.014,recoil:.039,sight:'iron',zoom:1.25,color:0x967044,length:1.12,family:'ar'},
 {id:'ump45',name:'UMP45',caliber:'45',magazine:25,reload:2,interval:.09,damage:36,head:3,range:140,spread:.012,recoil:.019,sight:'holo',zoom:1.4,color:0x414e55,length:.76,family:'smg'},
 {id:'kar98k',name:'Kar98k',caliber:'762',magazine:5,reload:4,interval:1.8,damage:85,head:2.5,range:360,spread:.001,recoil:.075,sight:'scope',zoom:4,color:0x91683d,length:1.38,family:'bolt'},
 {id:'s12k',name:'S12K',caliber:'12g',magazine:5,reload:3,interval:.25,damage:15,head:1,pellets:6,maxDamage:90,range:65,spread:.052,recoil:.06,sight:'shotgun',zoom:1.15,color:0x526052,length:1.03,family:'shotgun'},
 {id:'aug',name:'AUG',caliber:'556',magazine:30,reload:2.2,interval:.085,damage:42,head:2.6,range:250,spread:.0075,recoil:.024,sight:'dot',zoom:1.6,color:0x819079,length:.92,family:'bullpup'},
 {id:'vector',name:'Vector',caliber:'45',magazine:19,reload:2.1,interval:.055,damage:31,head:3.3,range:125,spread:.012,recoil:.017,sight:'holo',zoom:1.4,color:0x6e745f,length:.68,family:'smg'},
 {id:'awm',name:'AWM',caliber:'300',magazine:5,reload:4.5,interval:1.9,damage:110,head:2.5,range:480,spread:.0007,recoil:.09,sight:'scope',zoom:6,color:0x7a8665,length:1.48,family:'bolt'},
 {id:'mini14',name:'Mini14',caliber:'556',magazine:20,reload:2.4,interval:.14,damage:45,head:2.4,range:330,spread:.003,recoil:.037,sight:'scope',zoom:2,color:0x727c73,length:1.22,family:'dmr'},
 {id:'m249',name:'M249',caliber:'556',magazine:75,reload:5,interval:.075,damage:42,head:2.5,range:270,spread:.014,recoil:.038,sight:'iron',zoom:1.25,color:0x66745d,length:1.32,family:'lmg'},
 {id:'p10',name:'P10 권총',caliber:'9mm',magazine:10,reload:1.5,interval:.22,damage:24,head:2.3,range:90,spread:.015,recoil:.024,sight:'iron',zoom:1.2,color:0x4e5c60,length:.35,family:'pistol'},
 {id:'groza',name:'GROZA',exclusive:true,caliber:'762',magazine:30,reload:2.6,interval:.08,damage:49,head:2.4,range:250,spread:.008,recoil:.031,sight:'dot',zoom:1.6,color:0x4e6a58,length:.91,family:'bullpup'},
 {id:'mk14',name:'Mk14',exclusive:true,caliber:'762',magazine:20,reload:3.2,interval:.12,damage:61,head:2.5,range:400,spread:.002,recoil:.05,sight:'scope',zoom:4,color:0x6f7768,length:1.25,family:'dmr'},
 {id:'summit-300',name:'침봉 .300',exclusive:true,summitOnly:true,caliber:'300',magazine:5,reload:4.2,interval:1.7,damage:125,head:2.6,range:550,spread:.0005,recoil:.09,sight:'scope',zoom:8,color:0x687981,length:1.5,family:'bolt'}
];
export const PISTOL=10,PRIMARY_WEAPONS=WEAPONS.slice(0,10);
export const STANCES={stand:{height:1.78,eye:1.53,speed:3.2,radius:.32,recoil:1},crouch:{height:1.22,eye:1.05,speed:1.8,radius:.34,recoil:.55},prone:{height:.55,eye:.36,speed:.8,radius:.29,recoil:.23}};
export const CALIBERS={556:'5.56mm',762:'7.62mm',45:'.45 ACP','12g':'12게이지',300:'.300 Magnum','9mm':'9mm'};
export const getWeapon=p=>WEAPONS[p.weapon]||WEAPONS[0];
const INJURED_STANCE={height:1.24,eye:1.04,speed:1,radius:.34,recoil:1.4};
const VAULT_STANCE={...STANCES.crouch,height:1.12,eye:.87};
export const stanceOf=p=>p.downed?INJURED_STANCE:p.vault?.window?VAULT_STANCE:STANCES[p.stance]||STANCES.stand;
export const magazineSize=p=>getWeapon(p).magazine;
export const reserveAmmo=p=>(p.bag?.[getWeapon(p).caliber]||0)+(p.universalAmmo||0);
export function eyePosition(p){const e=stanceOf(p).eye,forward=p.stance==='prone'?.63:0;return[p.x+Math.sin(p.yaw)*forward,p.y+e,p.z+Math.cos(p.yaw)*forward];}
export function bodyParts(p){
 const compact=!!p.vault?.window,stance=compact||p.downed?'crouch':p.stance||'stand',out=[],sin=Math.sin(p.yaw||0),cos=Math.cos(p.yaw||0);
 const point=(x,y,z)=>{if(p.gliding){const r=p.bank||0,nx=x*Math.cos(r)-y*Math.sin(r);y=x*Math.sin(r)+y*Math.cos(r);x=nx;}return[p.x+x*cos+z*sin,p.y+y,p.z-x*sin+z*cos];};
 const sphere=(zone,x,y,z,r)=>out.push({zone,a:point(x,y,z),b:point(x,y,z),r});
 const limb=(zone,a,b,r)=>out.push({zone,a:point(...a),b:point(...b),r});
 if(p.vehicleId){sphere('head',0,.9,.075,.205);limb('torso',[0,.15,0],[0,.7,.04],.265);for(const side of[-1,1]){limb('leg',[side*.15,.15,0],[side*.15,-.38,.55],.13);limb('arm',[side*.29,.7,.04],[side*.26,.72,.72],.11);}return out;}
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
