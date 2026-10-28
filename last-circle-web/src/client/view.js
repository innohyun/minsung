import * as T from 'three';
import {BOXES,BUILDINGS,TREES,terrainHeight,supportHeight,rng,rayBox,rayTerrain,clamp} from '../world.js';
import {RELOAD_SECONDS} from '../sim.js';
const v3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
export function createView(canvas){
 const mobile=matchMedia('(pointer:coarse)').matches;
 const renderer=new T.WebGLRenderer({canvas,antialias:!mobile,powerPreference:'high-performance'});
 let pixelRatio=Math.min(devicePixelRatio,mobile?1:1.35),slowFrames=0;
 renderer.setPixelRatio(pixelRatio);renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=!mobile;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 const scene=new T.Scene();scene.background=new T.Color('#b0c5cc');scene.fog=new T.Fog('#b5c5b5',115,260);
 const camera=new T.PerspectiveCamera(62,innerWidth/innerHeight,.08,350);
 scene.add(new T.HemisphereLight('#dbeaf4','#637341',2.55));
 const sun=new T.DirectionalLight('#ffdda6',3.1);sun.position.set(-55,100,-40);sun.castShadow=!mobile;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:1,far:230});sun.shadow.normalBias=.04;sun.shadow.bias=-.00015;scene.add(sun,sun.target);
 const materials=new Map();
 const mat=(color,extra={})=>{const key=color+JSON.stringify(extra);if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color,roughness:.88,...extra}));return materials.get(key);};
 const M={grass:mat('#82965a'),wood:mat('#806342'),dark:mat('#293a31'),steel:mat('#81928a',{metalness:.4,roughness:.5}),bark:mat('#6d5940'),leaf:mat('#63834f',{flatShading:true}),leaf2:mat('#85955b',{flatShading:true})};
 const geometries={box:new T.BoxGeometry(1,1,1),rock:new T.DodecahedronGeometry(.5,0),sphere:new T.IcosahedronGeometry(.5,1),cone:new T.ConeGeometry(.5,1,7),cylinder:new T.CylinderGeometry(.5,.5,1,8)};
 const batches=new Map(),matrix=new T.Object3D();
 function instance(kind,x,y,z,w,h,d,material,rotation={}){
  const key=kind+material.uuid;if(!batches.has(key))batches.set(key,{kind,material,items:[]});
  batches.get(key).items.push({x,y,z,w,h,d,rx:rotation.x||0,ry:rotation.y||0,rz:rotation.z||0});
 }
 function box(x,y,z,w,h,d,material,parent=scene){const mesh=new T.Mesh(geometries.box,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=!mobile;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 // Shared height field: slopes, ridge, cliff terrace, and flattened building sites.
 const groundGeometry=new T.PlaneGeometry(320,320,160,160);groundGeometry.rotateX(-Math.PI/2);const positions=groundGeometry.attributes.position,colors=new Float32Array(positions.count*3);
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),z=positions.getZ(i),h=terrainHeight(x,z);positions.setY(i,h);
  const slope=Math.hypot(terrainHeight(x+1,z)-terrainHeight(x-1,z),terrainHeight(x,z+1)-terrainHeight(x,z-1));
  const color=new T.Color(slope>1.9?'#87917d':h>15?'#82916a':'#7f9755');
  const road=Math.min(Math.abs(x),Math.abs(z));if(road<3.2)color.lerp(new T.Color('#ad9d73'),.75);
  const patch=.94+Math.sin(x*.31)*Math.cos(z*.27)*.05;color.multiplyScalar(patch);color.toArray(colors,i*3);
 }
 groundGeometry.setAttribute('color',new T.BufferAttribute(colors,3));groundGeometry.computeVertexNormals();
 const ground=new T.Mesh(groundGeometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));ground.receiveShadow=true;scene.add(ground);
 for(const b of BOXES){
  if(['metal','chimney','platform','parapet'].includes(b.kind))continue;
  const m=b.kind==='roof'?mat('#596e6b'):b.kind==='crate'?M.wood:b.kind==='trunk'?M.bark:mat(b.color||0xa5aa94,{flatShading:b.kind==='rock'});
  const kind=b.kind==='rock'?'rock':b.kind==='log'?'cylinder':'box';
  instance(kind,b.x,b.y+b.h/2,b.z,b.w,b.h,b.d,m,b.kind==='log'?{z:Math.PI/2}:{});
  if(b.kind==='crate')for(const dy of [-.25,.25])instance('box',b.x,b.y+b.h/2+dy*b.h,b.z,b.w+.02,.07,b.d+.02,mat('#a18855'));
 }
 // Each building gets a distinct silhouette and local details, rather than nine copies.
 for(const b of BUILDINGS){
  const add=(lx,ly,lz,w,h,d,m,rot={})=>instance('box',b.x+(b.rot?-lz:lx),b.y+ly,b.z+(b.rot?lx:lz),w,h,d,m,{...rot,y:(rot.y||0)+(b.rot?Math.PI/2:0)});
  add(0,.035,0,b.w,.07,b.d,mat('#aaa48c'));
  if(!['warehouse','garage'].includes(b.style)){
   const roof=mat(['cottage','farmhouse'].includes(b.style)?'#89715e':'#64776a');
   for(const side of [-1,1])add(side*b.w*.34,b.h+.23,0,b.w*.37,.22,b.d+.8,roof,{z:side*.22});
  }
  if(b.style==='warehouse'){for(let k=-2;k<=2;k++)add(k*4,b.h+.4,0,.12,.1,b.d,M.steel);add(0,b.h+.4,3,3,.6,2,M.steel);}
  if(b.style==='cottage'||b.style==='farmhouse'){add(-b.w*.25,b.h+1.2,2,.9,2.4,.9,mat('#887560'));add(0,.12,-b.d/2-1.5,5,.24,3,M.wood);for(const side of [-1,1])add(side*2,1.4,-b.d/2-2,.18,2.8,.18,M.wood);}
  if(b.style==='barn'){add(0,b.h+.8,b.d*.35,2,1.3,2,mat('#526658'));add(-b.w*.27,1.15,-b.d/2-.1,3.5,2.3,.15,M.wood);}
  if(b.style==='ruins'){for(let k=0;k<8;k++)add(-5+k*1.3,.25,4+Math.sin(k)*2,1.1,.5,.8,mat(k%2?'#a89f86':'#8f947e'));}
  if(b.style==='tower'){add(0,b.h+.4,0,b.w+1,.35,b.d+1,M.wood);add(0,b.h+1.15,b.d*.45,b.w,.9,.3,M.wood);for(let k=0;k<5;k++)add(-3+k*1.4,.25,-b.d/2-2,1.2,.5,1.2,M.wood);}
  if(b.style==='garage'){add(b.w*.25,.9,-b.d/2-2,2,1.8,2,M.steel);add(-b.w*.2,.65,-b.d/2-2,2.8,1.3,1.3,mat('#63736b'));}
  if(b.style==='chapel'){add(0,b.h+.6,b.d*.22,.35,2.5,.35,M.wood);add(0,b.h+.9,b.d*.22,1.6,.25,.3,M.wood);}
  if(b.style==='courtyard'){for(const side of [-1,1])add(side*4,.35,0,2.2,.7,2.2,mat('#77856a'));}
 }
 for(const t of TREES){
  if(t.type===0){for(let k=0;k<3;k++)instance('cone',t.x,t.y+t.h*.45+k*t.h*.18,t.z,t.h*.65-k*.5,t.h*.6,t.h*.65-k*.5,M.leaf);}
  else{instance('sphere',t.x,t.y+t.h*.75,t.z,t.h*.8,t.h*(t.type===1?.8:.6),t.h*.75,t.type===1?M.leaf:M.leaf2);if(t.type===2)instance('sphere',t.x+.9,t.y+t.h*.6,t.z+.5,t.h*.5,t.h*.45,t.h*.5,M.leaf2);}
 }
 const rand=rng(731);for(let i=0;i<12;i++){const a=i/12*Math.PI*2;instance('sphere',Math.sin(a)*210,-4,Math.cos(a)*210,90,30+rand()*30,90,mat(i%2?'#85986b':'#748966'));}
 for(const batch of batches.values()){
  const mesh=new T.InstancedMesh(geometries[batch.kind],batch.material,batch.items.length);
  batch.items.forEach((p,i)=>{matrix.position.set(p.x,p.y,p.z);matrix.scale.set(p.w,p.h,p.d);matrix.rotation.set(p.rx,p.ry,p.rz);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix);});mesh.castShadow=!mobile;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);
 }
 const ring=new T.Mesh(new T.CylinderGeometry(1,1,45,96,1,true),new T.MeshBasicMaterial({color:'#68cce8',transparent:true,opacity:.13,side:T.DoubleSide,depthWrite:false}));ring.position.y=17;scene.add(ring);
 const plane=new T.Group();box(0,0,0,2,.7,7,M.dark,plane);box(0,.1,0,11,.2,1.8,M.steel,plane);box(0,.5,-2.7,3.2,.2,1.4,M.steel,plane);box(0,1,-3,.2,1.6,1.3,M.steel,plane);scene.add(plane);
 const characters=new Map(),pickups=new Map(),traces=[];const capsuleGeometry=new T.CapsuleGeometry(1,1,3,7),sphereGeometry=new T.SphereGeometry(1,10,7);
 const shadowMaterial=new T.MeshBasicMaterial({color:'#263527',transparent:true,opacity:.2,depthWrite:false});
 function nickname(name,bot){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.font='700 36px system-ui,sans-serif';ctx.strokeStyle='rgba(12,25,20,.9)';ctx.lineWidth=7;ctx.lineJoin='round';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=bot?'#c6d5b6':'#e4f8ca';ctx.strokeText(name,256,50,470);ctx.fillText(name,256,50,470);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:true}));sprite.scale.set(1.7,.31,1);sprite.position.y=2.43;return sprite;}
 function gunModel(parent,small=false){
  const g=new T.Group();parent.add(g);const steel=mat('#84918f',{metalness:.65,roughness:.35}),grip=mat('#463b2e'),black=mat('#27352f');
  box(0,0,0,.14,.17,small?.25:.55,steel,g);box(0,.025,small?.22:.56,.055,.055,small?.16:.52,black,g);box(0,-.14,-.06,.095,.25,.13,grip,g);
  if(!small){box(0,0,-.4,.17,.21,.3,grip,g);box(0,.15,.02,.08,.095,.21,black,g);box(0,.21,.02,.1,.09,.08,steel,g);}
  const magazine=box(0,-.17,.12,.08,.24,.14,black,g);const flash=new T.Mesh(new T.ConeGeometry(.13,.35,5),new T.MeshBasicMaterial({color:'#ffdd7a'}));flash.rotation.x=Math.PI/2;flash.position.set(0,.03,small?.43:.94);flash.visible=false;g.add(flash);return{group:g,magazine,flash};
 }
 function character(p){
  const root=new T.Group(),body=new T.Group();root.add(body);scene.add(root);
  const jacket=mat(p.bot?'#726449':'#35616b'),pants=mat('#3d483a'),skin=mat('#ba8e6b'),helmet=mat('#4b5d43'),boot=mat('#2c352c');
  function capsule(parent,x,y,z,r,length,m){const o=new T.Mesh(capsuleGeometry,m);o.scale.set(r,length/3,r);o.position.set(x,y,z);o.castShadow=!mobile;parent.add(o);return o;}
  // Separate body geometry gives a readable silhouette without per-frame mesh allocations.
  const torso=new T.Mesh(new T.CapsuleGeometry(.235,.33,3,8),jacket);torso.position.y=1.2;torso.castShadow=!mobile;body.add(torso);box(0,1.27,-.23,.4,.46,.23,M.wood,body);
  const head=new T.Mesh(sphereGeometry,skin);head.scale.set(.16,.19,.16);head.position.set(0,1.72,0);body.add(head);
  const hat=new T.Mesh(new T.SphereGeometry(.2,10,7,0,Math.PI*2,0,Math.PI*.6),helmet);hat.position.set(0,1.8,0);body.add(hat);box(0,1.74,.152,.27,.075,.045,M.dark,body);
  const legs=[],arms=[];
  for(const side of [-1,1]){
   const leg=new T.Group();leg.position.set(side*.14,.88,0);body.add(leg);capsule(leg,0,-.18,0,.105,.7,pants);
   const knee=new T.Group();knee.position.y=-.39;leg.add(knee);capsule(knee,0,-.17,0,.09,.65,pants);box(0,-.35,.055,.21,.14,.33,boot,knee);legs.push({joint:leg,knee});
   const arm=new T.Group();arm.position.set(side*.3,1.48,0);body.add(arm);capsule(arm,0,-.16,0,.09,.6,jacket);
   const elbow=new T.Group();elbow.position.y=-.32;arm.add(elbow);capsule(elbow,0,-.13,0,.075,.5,skin);arms.push({joint:arm,elbow});
  }
  const rifle=gunModel(body),pistol=gunModel(body,true);rifle.group.position.set(-.33,1.3,.3);pistol.group.position.copy(rifle.group.position);
  const flash=rifle.flash;
  const chute=new T.Group();chute.position.y=3;root.add(chute);const canopy=new T.Mesh(new T.SphereGeometry(1,12,6,0,Math.PI*2,0,Math.PI*.5),new T.MeshStandardMaterial({color:'#cba54d',side:T.DoubleSide,roughness:1}));canopy.scale.set(2.4,.75,2);chute.add(canopy);
  for(const x of [-1.8,1.8])for(const z of [-1.4,1.4])chute.add(new T.Line(new T.BufferGeometry().setFromPoints([v3(x,.1,z),v3(0,-1.4,0)]),new T.LineBasicMaterial({color:'#dcd8c1'})));
  const label=nickname(p.name,p.bot);root.add(label);
  const shadow=new T.Mesh(new T.CircleGeometry(.43,12),shadowMaterial);shadow.rotation.x=-Math.PI/2;scene.add(shadow);
  return{root,body,torso,head,legs,arms,rifle,pistol,flash,chute,label,shadow,name:p.name,yaw:p.yaw,stride:0,speed:0,aim:0,death:0,flashLeft:0,kick:0,lastHp:p.hp,hit:0};
 }
 const lootMaterials=['#e9ba65','#a6c8df','#e9d78a','#84d5a2'].map(c=>mat(c,{emissive:c,emissiveIntensity:.08}));
 let latest=null,localId=null,viewTime=0,cameraReady=false,cameraDistance=5.3,recoil=0;
 function sync(state,dt,ownPose,age=0){
  latest=state;localId=state.you;const present=new Set();viewTime=state.time+Math.min(age,.25);
  for(const p of state.players){
   present.add(p.id);let c=characters.get(p.id);if(!c){c=character(p);characters.set(p.id,c);c.root.position.set(p.x,p.y,p.z);}
   const own=p.id===state.you,target=own&&ownPose?ownPose:{...p,x:p.x+(p.dead?0:p.vx||0)*Math.min(age,.22),z:p.z+(p.dead?0:p.vz||0)*Math.min(age,.22),y:Math.max(supportHeight(p.x,p.z,p.y),p.y+(p.vy||0)*Math.min(age,.15))};
   if(own)c.root.position.set(target.x,target.y,target.z);else c.root.position.lerp(v3(target.x,target.y,target.z),1-Math.exp(-dt*14));
   const desiredYaw=own&&ownPose?ownPose.yaw:p.yaw;c.yaw+=Math.atan2(Math.sin(desiredYaw-c.yaw),Math.cos(desiredYaw-c.yaw))*(1-Math.exp(-dt*20));c.root.rotation.y=c.yaw;
   const speed=Math.min(8.5,Math.hypot(target.vx||0,target.vz||0));c.speed=T.MathUtils.damp(c.speed,p.dead||p.chute?0:speed,10,dt);c.stride+=dt*c.speed*1.7;
   c.aim=T.MathUtils.damp(c.aim,(own&&ownPose?ownPose.aim:p.aim)?1:0,12,dt);c.death=T.MathUtils.damp(c.death,p.dead?1:0,5,dt);
   const held=p.guns[p.weapon],crouch=own&&ownPose?ownPose.crouch:p.crouch,swing=Math.sin(c.stride)*Math.min(.7,c.speed*.1)*(p.dead?0:1);
   c.body.rotation.z=c.death*Math.PI/2;c.body.position.y=T.MathUtils.damp(c.body.position.y,crouch?-.37:0,12,dt);
   c.legs.forEach((l,i)=>{l.joint.rotation.x=(i?-swing:swing)+(crouch?-.4:0);l.knee.rotation.x=Math.max(0,Math.sin(c.stride+i*Math.PI))*.55+(crouch?.8:0);});
   // Both arms swing during locomotion; aiming blends into a two-handed shoulder hold.
   c.arms[0].joint.rotation.x=swing*(1-c.aim)*.65-(held?.82:0)-c.aim*.4;
   c.arms[1].joint.rotation.x=-swing*(1-c.aim)*.7-(held?.66:0)-c.aim*.55;
   c.arms[0].elbow.rotation.x=held?-.45:0;c.arms[1].elbow.rotation.x=held?-.7:0;
   c.kick=T.MathUtils.damp(c.kick,0,18,dt);c.flashLeft-=dt;c.rifle.flash.visible=c.flashLeft>0;c.pistol.flash.visible=c.flashLeft>0;c.rifle.flash.rotation.z+=dt*37;c.pistol.flash.rotation.z+=dt*37;
   c.rifle.group.visible=held&&!p.dead&&p.weapon===0;c.pistol.group.visible=held&&!p.dead&&p.weapon===1;
   for(const weapon of [c.rifle,c.pistol]){weapon.group.position.set(-.33,1.28+Math.sin(c.stride)*c.speed*.002,.32-c.kick);weapon.group.rotation.set(.12-c.aim*.12-(own&&ownPose?ownPose.pitch:p.pitch)*.65,-.5*(1-c.aim),0);weapon.magazine.position.y=-.17;}
   if(p.reload>0){
    const progress=clamp(1-p.reload/RELOAD_SECONDS[p.weapon],0,1),reach=Math.sin(progress*Math.PI),weapon=p.weapon?c.pistol:c.rifle;
    weapon.group.rotation.z=-reach*.45;weapon.group.position.y-=reach*.12;
    weapon.magazine.position.y-=Math.sin(clamp((progress-.1)/.65,0,1)*Math.PI)*.45;
    c.arms[1].joint.rotation.x=-.8-reach*.6;c.arms[1].joint.rotation.z=-reach*.6;c.arms[1].elbow.rotation.x=-reach*1.5;
   }else c.arms[1].joint.rotation.z=0;
   if(p.hp<c.lastHp)c.hit=.2;c.lastHp=p.hp;c.hit=Math.max(0,c.hit-dt);c.torso.scale.setScalar(1+c.hit*.08);c.head.rotation.z=c.hit*.5;
   c.chute.visible=p.chute&&!p.dead;c.root.visible=!p.onPlane&&c.root.position.distanceTo(camera.position)<175;
   c.label.visible=!p.dead&&(own||c.root.position.distanceTo(camera.position)<45);c.label.position.y=(crouch?2.05:2.43);
   c.shadow.position.set(target.x,terrainHeight(target.x,target.z)+.045,target.z);c.shadow.visible=mobile&&!p.dead&&!p.onPlane;
  }
  for(const [id,c]of characters)if(!present.has(id)){scene.remove(c.root,c.shadow);c.label.material.map.dispose();c.label.material.dispose();characters.delete(id);}
  if(sync.lootRef!==state.loot){
   const ids=new Set();for(const l of state.loot){ids.add(l.id);if(!pickups.has(l.id)){
    const group=new T.Group();if(l.kind<2){const model=gunModel(group,l.kind===1);model.group.rotation.y=.6;model.group.scale.setScalar(.8);}else box(0,0,0,.42,.3,.35,lootMaterials[l.kind],group);
    const disc=new T.Mesh(new T.RingGeometry(.35,.41,16),new T.MeshBasicMaterial({color:lootMaterials[l.kind].color,side:T.DoubleSide,transparent:true,opacity:.6}));disc.rotation.x=-Math.PI/2;disc.position.y=-.15;group.add(disc);group.position.set(l.x,l.y??terrainHeight(l.x,l.z)+.25,l.z);scene.add(group);pickups.set(l.id,group);
   }}for(const [id,o]of pickups)if(!ids.has(id)){scene.remove(o);pickups.delete(id);}sync.lootRef=state.loot;
  }
  ring.visible=state.phase==='battle';ring.position.set(state.zone.x,17,state.zone.z);ring.scale.set(state.zone.r,1,state.zone.r);
  plane.visible=state.phase==='flight';plane.position.set(-105+clamp(viewTime/12,0,1)*210,52,0);plane.rotation.y=Math.PI/2;
 }
 function shot(s,{local=false}={}){
  const geometry=new T.BufferGeometry().setFromPoints([v3(...s.from),v3(...s.to)]),material=new T.LineBasicMaterial({color:'#fff0ad',transparent:true,opacity:.9});const line=new T.Line(geometry,material);scene.add(line);traces.push({line,life:.09});
  const c=characters.get(s.by);if(c){c.flashLeft=.065;c.kick=Math.min(.24,c.kick+.13);}if(local)recoil=Math.min(.065,recoil+.024);
 }
 const aimAnchor=v3(),desired=v3(),eyes=v3(),direction=v3(),delta=v3();
 function render(dt,state,follow,yaw,pitch,aim,home=false){
  for(let i=traces.length-1;i>=0;i--){const q=traces[i];q.life-=dt;q.line.material.opacity=q.life/.09;if(q.life<=0){scene.remove(q.line);q.line.geometry.dispose();q.line.material.dispose();traces.splice(i,1);}}
  recoil=T.MathUtils.damp(recoil,0,15,dt);
  if(home){const t=performance.now()*.000016;camera.position.set(43+Math.sin(t)*8,terrainHeight(43,46)+18,46+Math.cos(t)*5);camera.lookAt(-10,terrainHeight(-10,0)+1,0);cameraReady=false;}
  else if(follow){
   const c=characters.get(follow.id),position=c?.root.position||follow;
   eyes.set(position.x,position.y+(follow.crouch?1.25:1.55),position.z);
   // Position AND look target use this one anchor. Movement never adds camera shake.
   if(!cameraReady||aimAnchor.distanceTo(eyes)>24){aimAnchor.copy(eyes);cameraDistance=follow.onPlane?13:5.3;cameraReady=true;}
   else aimAnchor.lerp(eyes,1-Math.exp(-dt*24));
   direction.set(Math.sin(yaw)*Math.cos(pitch+recoil),Math.sin(pitch+recoil),Math.cos(yaw)*Math.cos(pitch+recoil));
   const distance=follow.onPlane?13:aim?2.6:5.2;
   desired.copy(aimAnchor).addScaledVector(direction,-distance).add(v3(-Math.cos(yaw)*(mobile&&innerHeight>innerWidth?.38:.8),.24,Math.sin(yaw)*(mobile&&innerHeight>innerWidth?.38:.8)));
   delta.copy(desired).sub(aimAnchor);const length=delta.length();delta.normalize();let collision=length;
   for(const b of BOXES)collision=Math.min(collision,rayBox(aimAnchor.toArray(),delta.toArray(),{...b,w:b.w+.25,d:b.d+.25,h:b.h+.18},length));
   collision=Math.min(collision,rayTerrain(aimAnchor.toArray(),delta.toArray(),length));
   const safe=Math.max(.35,Math.min(length,collision-.22));cameraDistance=T.MathUtils.damp(cameraDistance,safe,safe<cameraDistance?30:7,dt);
   camera.position.copy(aimAnchor).addScaledVector(delta,Math.min(cameraDistance,safe+.08));camera.lookAt(desired.copy(aimAnchor).addScaledVector(direction,60));
   camera.fov=T.MathUtils.damp(camera.fov,aim?47:62,10,dt);camera.updateProjectionMatrix();
  }
  renderer.render(scene,camera);
  if(dt>.034)slowFrames++;else slowFrames=Math.max(0,slowFrames-1);
  if(slowFrames>100&&pixelRatio>.76){pixelRatio=Math.max(.75,pixelRatio-.15);renderer.setPixelRatio(pixelRatio);slowFrames=0;}
 }
 window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
 function localTrace(p,yaw,pitch){const d=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)],from=[p.x,p.y+1.4,p.z];let length=140;for(const b of BOXES)length=Math.min(length,rayBox(from,d,b,length));length=Math.min(length,rayTerrain(from,d,length));return{by:p.id,from,to:from.map((v,i)=>v+d[i]*length)};}
 return{sync,render,shot,localTrace,renderer,scene,camera,characters};
}
