import * as T from 'three';
import {BOXES,rng,rayBox} from '../sim.js';
const v3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export function createView(canvas){
 const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
 const scene=new T.Scene();scene.background=new T.Color('#a9bbc0');scene.fog=new T.Fog('#b5c2b2',100,290);
 const camera=new T.PerspectiveCamera(58,innerWidth/innerHeight,.08,500);
 const ambient=new T.HemisphereLight('#d6e4ee','#667c39',2.5);scene.add(ambient);
 const sun=new T.DirectionalLight('#ffdfaa',3.1);sun.position.set(-55,90,-40);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-105,right:105,top:105,bottom:-105,near:1,far:250});sun.shadow.normalBias=.04;sun.shadow.bias=-.00015;scene.add(sun);sun.target.position.set(0,0,0);scene.add(sun.target);
 const mat=(c,extra={})=>new T.MeshStandardMaterial({color:c,roughness:.9,...extra});
 const M={grass:mat('#819353'),wall:mat('#c0b795'),wood:mat('#78603f'),roof:mat('#6d7257'),rock:mat('#879087',{flatShading:true}),dark:mat('#303f32'),bark:mat('#6f6546'),leaf:mat('#6a8051',{flatShading:true}),leaf2:mat('#89945a',{flatShading:true}),path:mat('#ad9e70')};
 function box(x,y,z,w,h,d,material,shadow=true,parent=scene){const o=new T.Mesh(new T.BoxGeometry(w,h,d),material);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;}
 const ground=new T.Mesh(new T.PlaneGeometry(720,720),M.grass);ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 box(0,.015,0,7,.02,250,M.path,false);box(0,.025,0,250,.02,7,M.path,false);
 for(const b of BOXES){
  if(b.kind==='rock'){const o=new T.Mesh(new T.DodecahedronGeometry(1,0),M.rock);o.position.set(b.x,b.h*.43,b.z);o.scale.set(b.w*.62,b.h*.72,b.d*.65);o.rotation.y=b.x;o.castShadow=true;o.receiveShadow=true;scene.add(o);}
  else box(b.x,b.y+b.h/2,b.z,b.w,b.h,b.d,b.kind==='crate'?M.wood:M.wall);
 }
 for(const x of [-66,0,66])for(const z of [-66,0,66]){
  box(x,0.035,z,18,.07,18,mat('#ada58b'),false);
  box(x-9,3.75,z,.8,.22,18.8,M.roof);box(x+9,3.75,z,.8,.22,18.8,M.roof);box(x,3.75,z+9,18.8,.22,.8,M.roof);
  for(const dx of [-9,9])for(const dz of [-9,9])box(x+dx,2,z+dz,.35,4,.35,M.wood);
  // A sloped canopy at the back leaves the central room open to the camera.
  const roof=box(x,4.1,z+7,18.8,.18,5,M.roof);roof.rotation.x=-.12;
  for(const dx of [-4.8,4.8])box(x+dx,2,z-9.34,.95,1.15,.05,M.dark,false);
  box(x,0.1,z-11,5,.2,3,M.wood);
 }
 const r=rng(771);
 for(let i=0;i<85;i++){
  const x=(r()-.5)*350,z=(r()-.5)*350;
  if(Math.abs(x)<12||Math.abs(z)<12||([-66,0,66].some(a=>Math.abs(x-a)<15)&&[-66,0,66].some(a=>Math.abs(z-a)<15)))continue;
  const h=4+r()*5;
  box(x,h*.34,z,.35,h*.7,.35,M.bark);
  const leaves=new T.Mesh(new T.IcosahedronGeometry(1,1),i%2?M.leaf:M.leaf2);leaves.position.set(x,h*.8,z);leaves.scale.set(h*.4,h*.55,h*.4);leaves.castShadow=true;scene.add(leaves);
 }
 // Distant hills frame the map and keep the horizon coherent.
 for(let i=0;i<16;i++){const angle=i/16*Math.PI*2;const hill=new T.Mesh(new T.SphereGeometry(1,20,12),mat(i%2?'#849367':'#748765'));hill.position.set(Math.sin(angle)*240,-6,Math.cos(angle)*240);hill.scale.set(65,22+r()*23,60);scene.add(hill);}
 const ring=new T.Mesh(new T.CylinderGeometry(1,1,16,128,1,true),new T.MeshBasicMaterial({color:'#68cce8',transparent:true,opacity:.16,side:T.DoubleSide,depthWrite:false}));ring.position.y=8;scene.add(ring);
 const ringLine=new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({length:128},(_,i)=>v3(Math.sin(i/128*Math.PI*2),.1,Math.cos(i/128*Math.PI*2)))),new T.LineBasicMaterial({color:'#88e9ff'}));scene.add(ringLine);
 const plane=new T.Group();box(0,0,0,2,.7,7,M.dark,true,plane);box(0,.1,0,11,.2,1.8,M.roof,true,plane);box(0,.5,-2.7,3.2,.2,1.4,M.roof,true,plane);box(0,1,-3,.2,1.6,1.3,M.roof,true,plane);scene.add(plane);
 const characters=new Map(),pickups=new Map(),traces=[];
 const lootColors=['#f2be61','#9bbede','#e4d895','#8fe6ab'];const lootMaterials=lootColors.map(c=>mat(c,{emissive:c,emissiveIntensity:.12}));
 function character(id){
  const root=new T.Group(),body=new T.Group();root.add(body);scene.add(root);
  const jacket=mat(id.startsWith('bot')?'#655f4b':'#375b60'),pants=mat('#384239'),skin=mat('#b98d69'),helmet=mat('#4b5944'),boots=mat('#2b332c'),black=mat('#29322e');
  function capsule(parent,x,y,z,r,h,m){const o=new T.Mesh(new T.CapsuleGeometry(r,h,4,8),m);o.position.set(x,y,z);o.castShadow=true;parent.add(o);return o;}
  capsule(body,0,1.18,0,.24,.35,jacket);box(0,1.28,-.23,.38,.45,.22,M.wood,true,body);
  capsule(body,0,1.72,0,.155,.10,skin);const hat=new T.Mesh(new T.SphereGeometry(.195,12,8,0,Math.PI*2,0,Math.PI*.58),helmet);hat.position.set(0,1.81,0);hat.castShadow=true;body.add(hat);box(0,1.73,.153,.26,.09,.04,black,false,body);
  const legs=[],arms=[];
  for(const side of [-1,1]){
   const leg=new T.Group();leg.position.set(side*.14,.91,0);body.add(leg);capsule(leg,0,-.2,0,.105,.24,pants);
   const knee=new T.Group();knee.position.y=-.43;leg.add(knee);capsule(knee,0,-.18,0,.095,.22,pants);box(0,-.38,.06,.21,.14,.34,boots,true,knee);legs.push({joint:leg,knee});
   const arm=new T.Group();arm.position.set(side*.29,1.46,0);body.add(arm);capsule(arm,0,-.19,0,.085,.23,jacket);
   const elbow=new T.Group();elbow.position.y=-.36;arm.add(elbow);capsule(elbow,0,-.13,0,.075,.16,skin);arms.push({joint:arm,elbow});
  }
  const gun=new T.Group();gun.position.set(.18,1.22,.43);body.add(gun);box(0,0,.02,.105,.13,.5,black,true,gun);box(0,.035,.45,.05,.05,.45,black,true,gun);box(0,-.12,.03,.06,.2,.1,black,true,gun);box(0,.11,.04,.045,.07,.15,black,true,gun);
  const flash=new T.Mesh(new T.SphereGeometry(.18,6,4),new T.MeshBasicMaterial({color:'#ffe19b'}));flash.position.set(0,.04,.73);flash.visible=false;gun.add(flash);
  const chute=new T.Group();chute.position.y=2.8;root.add(chute);
  const canopy=new T.Mesh(new T.SphereGeometry(1,16,8,0,Math.PI*2,0,Math.PI*.5),new T.MeshStandardMaterial({color:'#d4b05c',side:T.DoubleSide,roughness:1}));canopy.scale.set(2.1,.7,1.8);chute.add(canopy);
  for(const x of [-1.5,1.5])for(const z of [-1.2,1.2]){const geom=new T.BufferGeometry().setFromPoints([v3(x,.1,z),v3(0,-1.2,0)]);chute.add(new T.Line(geom,new T.LineBasicMaterial({color:'#d8d2a8'})));}
  return{root,body,legs,arms,gun,flash,chute,pos:v3(),yaw:0,stride:0,aim:0,death:0,lastX:0,lastZ:0,flashLeft:0};
 }
 function sync(state,dt,ownPred){
  const present=new Set();
  for(const p of state.players){
   present.add(p.id);let c=characters.get(p.id);if(!c){c=character(p.id);characters.set(p.id,c);c.root.position.set(p.x,p.y,p.z);c.yaw=p.yaw;}
   const target=p.id===state.you&&ownPred?ownPred:p;
   const old=c.root.position.clone();const blend=p.id===state.you?1:1-Math.exp(-dt*13);
   c.root.position.lerp(v3(target.x,target.y,target.z),blend);
   const speed=Math.hypot(c.root.position.x-old.x,c.root.position.z-old.z)/Math.max(.001,dt);
   c.stride+=dt*Math.min(10,speed*1.6);
   let diff=Math.atan2(Math.sin(p.yaw-c.yaw),Math.cos(p.yaw-c.yaw));c.yaw+=diff*(1-Math.exp(-dt*16));c.root.rotation.y=c.yaw;
   c.aim=T.MathUtils.damp(c.aim,p.aim||p.guns[p.weapon]?1:0,12,dt);c.death=T.MathUtils.damp(c.death,p.dead?1:0,5,dt);
   c.body.rotation.z=c.death*Math.PI/2;c.body.position.y=T.MathUtils.damp(c.body.position.y,p.crouch?-.38:0,10,dt);
   const swing=Math.sin(c.stride)*Math.min(.65,speed*.11)*(p.dead?0:1);
   c.legs[0].joint.rotation.x=swing;c.legs[1].joint.rotation.x=-swing;
   c.legs.forEach((l,i)=>l.knee.rotation.x=Math.max(0,Math.sin(c.stride+i*Math.PI))*.55*(p.dead?0:1)+(p.crouch?.65:0));
   c.arms[0].joint.rotation.x=-swing*.5-c.aim*.95;c.arms[1].joint.rotation.x=swing*.5-c.aim*1.15;
   c.arms[0].elbow.rotation.x=-c.aim*.75;c.arms[1].elbow.rotation.x=-c.aim*.45;
   c.gun.visible=p.guns[p.weapon]&&!p.dead;c.gun.scale.z=p.weapon?.65:1;c.gun.rotation.x=-p.pitch*.7;
   if(p.reload>0){c.gun.rotation.z=Math.sin(p.reload*5)*.18;c.arms[0].joint.rotation.x=-1.1+Math.sin(p.reload*6)*.3;}else c.gun.rotation.z=0;
   c.flashLeft-=dt;c.flash.visible=c.flashLeft>0;
   c.chute.visible=p.chute&&!p.dead;c.root.visible=!p.onPlane;
  }
  for(const [id,c]of characters)if(!present.has(id)){scene.remove(c.root);characters.delete(id);}
  const loots=new Set();for(const l of state.loot){loots.add(l.id);let o=pickups.get(l.id);if(!o){o=new T.Group();const mesh=new T.Mesh(l.kind<2?new T.BoxGeometry(.6,.13,.18):new T.BoxGeometry(.36,.3,.3),lootMaterials[l.kind]);mesh.castShadow=true;o.add(mesh);const disc=new T.Mesh(new T.RingGeometry(.32,.38,24),new T.MeshBasicMaterial({color:lootColors[l.kind],side:T.DoubleSide,transparent:true,opacity:.65}));disc.rotation.x=-Math.PI/2;disc.position.y=-.15;o.add(disc);scene.add(o);pickups.set(l.id,o);}o.position.set(l.x,.3+Math.sin(performance.now()*.002+l.x)*.035,l.z);}
  for(const [id,o]of pickups)if(!loots.has(id)){scene.remove(o);pickups.delete(id);}
  ring.visible=ringLine.visible=state.phase==='battle';ring.position.x=ringLine.position.x=state.zone.x;ring.position.z=ringLine.position.z=state.zone.z;ring.scale.set(state.zone.r,1,state.zone.r);ringLine.scale.set(state.zone.r,1,state.zone.r);
  plane.visible=state.phase==='flight';plane.position.set(-105+Math.min(1,state.time/12)*210,38,0);plane.rotation.y=Math.PI/2;
 }
 function shot(s){const geometry=new T.BufferGeometry().setFromPoints([v3(...s.from),v3(...s.to)]);const material=new T.LineBasicMaterial({color:'#fff0a3',transparent:true,opacity:.9});const line=new T.Line(geometry,material);scene.add(line);traces.push({line,life:.13});const c=characters.get(s.by);if(c)c.flashLeft=.08;}
 let cameraReady=false;
 function render(dt,state,follow,yaw,pitch,aim,home=false){
  for(let i=traces.length-1;i>=0;i--){const q=traces[i];q.life-=dt;q.line.material.opacity=q.life/.13;if(q.life<=0){scene.remove(q.line);q.line.geometry.dispose();q.line.material.dispose();traces.splice(i,1);}}
  if(home){const t=performance.now()*.000022;camera.position.set(44+Math.sin(t)*9,15,43+Math.cos(t)*6);camera.lookAt(-10,1,0);cameraReady=false;}
  else if(follow){
   const eyes=v3(follow.x,follow.y+1.5,follow.z),dir=v3(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch));
   const dist=follow.onPlane?13:aim?2.8:5.3;const desired=eyes.clone().addScaledVector(dir,-dist).add(v3(-Math.cos(yaw)*.6,.35,Math.sin(yaw)*.6));
   const delta=desired.clone().sub(eyes),len=delta.length(),d=delta.clone().normalize().toArray();let collision=len;
   for(const b of BOXES)collision=Math.min(collision,rayBox(eyes.toArray(),d,{...b,w:b.w+.2,d:b.d+.2,h:b.h+.2},len));
   if(collision<len)desired.copy(eyes).addScaledVector(v3(...d),Math.max(.25,collision-.2));
   if(!cameraReady||camera.position.distanceTo(desired)>25){camera.position.copy(desired);cameraReady=true;}else camera.position.lerp(desired,1-Math.exp(-dt*17));
   camera.lookAt(eyes.clone().addScaledVector(dir,60));camera.fov=T.MathUtils.damp(camera.fov,aim?47:62,10,dt);camera.updateProjectionMatrix();
  }
  renderer.render(scene,camera);
 }
 window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
 return{sync,render,shot,renderer,scene,camera};
}
