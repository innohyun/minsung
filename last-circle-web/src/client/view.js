import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {BOXES,BUILDINGS,TREES,GRASS_PATCHES,terrainHeight,supportHeight,rng,rayWorld,clamp,FLIGHT_HEIGHT,FLIGHT_SECONDS} from '../world.js';
import {WEAPONS,stanceOf,eyePosition} from '../weapons.js';
const v3=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),UP=v3(0,1,0);
export function createView(canvas){
 const mobile=matchMedia('(pointer:coarse)').matches,renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 const sharpRatio=Math.min(devicePixelRatio,mobile?1.6:2);renderer.setPixelRatio(sharpRatio);renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=!mobile;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;
 const scene=new T.Scene();scene.background=new T.Color('#a9d3ed');scene.fog=new T.Fog('#b8d4de',290,670);
 const camera=new T.PerspectiveCamera(65,innerWidth/innerHeight,.035,900);scene.add(camera);scene.add(new T.HemisphereLight('#e4f2ff','#7b8f59',2.5));
 const sun=new T.DirectionalLight('#ffe4bb',3.1);sun.position.set(-65,120,-45);sun.castShadow=!mobile;sun.shadow.mapSize.set(1536,1536);Object.assign(sun.shadow.camera,{left:-115,right:115,top:115,bottom:-115,near:1,far:280});sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;scene.add(sun,sun.target);
 const mats=new Map();const mat=(color,extra={})=>{const key=color+JSON.stringify(extra);if(!mats.has(key))mats.set(key,new T.MeshStandardMaterial({color,roughness:.82,...extra}));return mats.get(key);};
 const M={wood:mat('#977144'),steel:mat('#637a83',{metalness:.4,roughness:.42}),dark:mat('#283c42'),leaf:mat('#4c864f'),leaf2:mat('#77a357'),bark:mat('#795e42'),trim:mat('#f0e7cf')};
 const geo={box:new T.BoxGeometry(1,1,1),rounded:new RoundedBoxGeometry(1,1,1,2,.06),sphere:new T.SphereGeometry(.5,14,10),rock:new T.IcosahedronGeometry(.5,1),cone:new T.ConeGeometry(.5,1,8),cylinder:new T.CylinderGeometry(.5,.5,1,10)};
 const batches=new Map(),dummy=new T.Object3D();
 function inst(kind,x,y,z,w,h,d,m,rot={}){const key=kind+m.uuid;if(!batches.has(key))batches.set(key,{kind,m,items:[]});batches.get(key).items.push({x,y,z,w,h,d,rx:rot.x||0,ry:rot.y||0,rz:rot.z||0});}
 function box(parent,x,y,z,w,h,d,m,rounded=false){const mesh=new T.Mesh(rounded?geo.rounded:geo.box,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=!mobile;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function texture(kind){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=kind==='wood'?'#a18052':'#dfd4bc';ctx.fillRect(0,0,128,128);const rand=rng(71);for(let i=0;i<80;i++){ctx.strokeStyle=`rgba(40,30,20,${.015+rand()*.06})`;ctx.beginPath();if(kind==='wood'){const y=rand()*128;ctx.moveTo(0,y);ctx.lineTo(128,y+rand()*3);}else{const x=rand()*128,y=rand()*128;ctx.moveTo(x,y);ctx.lineTo(x+rand()*8,y);}ctx.stroke();}if(kind==='wood'){ctx.fillStyle='#58493235';for(let y=0;y<128;y+=32)ctx.fillRect(0,y,128,1);}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;}
 const woodTexture=texture('wood'),plaster=texture('plaster');M.wood.map=woodTexture;
 const groundGeometry=new T.PlaneGeometry(320,320,160,160);groundGeometry.rotateX(-Math.PI/2);const positions=groundGeometry.attributes.position,colors=new Float32Array(positions.count*3);
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i),h=terrainHeight(x,z);positions.setY(i,h);const slope=Math.hypot(terrainHeight(x+1,z)-terrainHeight(x-1,z),terrainHeight(x,z+1)-terrainHeight(x,z-1));const color=new T.Color(slope>1.7?'#a5a493':h>15?'#7f9f64':'#80a455');if(Math.min(Math.abs(x),Math.abs(z))<3)color.lerp(new T.Color('#c4b58b'),.8);color.multiplyScalar(.98+Math.sin(x*.23)*Math.cos(z*.25)*.035);color.toArray(colors,i*3);}groundGeometry.setAttribute('color',new T.BufferAttribute(colors,3));groundGeometry.computeVertexNormals();const ground=new T.Mesh(groundGeometry,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));ground.receiveShadow=true;scene.add(ground);
 for(const b of BOXES){const type=b.shape==='ellipsoid'?'rock':b.shape==='cylinder'?'cylinder':'box';let material;
  if(['step','roof','floor'].includes(b.kind))material=mat(b.color);else if(['table','shelf'].includes(b.kind))material=M.wood;else if(b.kind==='trunk')material=M.bark;else material=mat(b.color||0xa8ae99,b.kind==='wall'?{map:plaster}:b.kind==='rock'?{flatShading:true}:{});
  inst(type,b.x,b.y+b.h/2,b.z,b.w,b.h,b.d,material);
  if(b.kind==='table'){inst('box',b.x,b.y+b.h+.025,b.z,b.w+.09,.07,b.d+.09,M.wood);}
 }
 // Continue the landscape beyond the playable area instead of leaving a floating square in the sky.
 for(const[x,z,w,d]of[[-580,0,840,2000],[580,0,840,2000],[0,-580,320,840],[0,580,320,840]]){const g=new T.PlaneGeometry(w,d,16,24);g.rotateX(-Math.PI/2);const a=g.attributes.position;for(let i=0;i<a.count;i++){const wx=x+a.getX(i),wz=z+a.getZ(i);a.setXYZ(i,wx,terrainHeight(wx,wz)-.025,wz);}g.computeVertexNormals();const m=new T.Mesh(g,mat('#80a455'));m.receiveShadow=true;scene.add(m);}
 // Architectural details follow the physical building dimensions; no decorative roofs without collision.
 for(const b of BUILDINGS){const add=(x,y,z,w,h,d,m)=>inst('box',b.x+(b.rot?-z:x),b.y+y,b.z+(b.rot?x:z),b.rot?d:w,h,b.rot?w:d,m);
  for(let f=0;f<b.floors;f++){for(const side of [-1,1]){for(const z of [-b.d*.22,b.d*.22]){add(side*(b.w/2+.04),f*b.level+1,.0+z,.09,.1,2.8,M.trim);add(side*(b.w/2+.04),f*b.level+2.25,z,.09,.11,2.8,M.trim);}}add(0,f*b.level+3.25,-b.d/2-.05,b.w,.14,.12,M.trim);}
  add(0,b.h+.08,-b.d/2,b.w,.12,.35,M.steel);
  if(b.style==='warehouse'||b.style==='garage')for(let i=-1;i<=1;i++)add(i*3,b.h+.35,0,1.6,.65,1.6,M.steel);
  if(b.style==='cottage'||b.style==='farmhouse'){add(-b.w*.32,b.h+.4,0,1,.8,1,mat('#b48c70'));add(-b.w*.32,b.h+.86,0,1.2,.12,1.2,M.trim);}
  if(b.style==='chapel'){add(-b.w*.27,b.h+1.2,2,.25,2.4,.25,M.wood);add(-b.w*.27,b.h+1.5,2,1.4,.22,.25,M.wood);}
 }
 for(const t of TREES){if(t.type===0){for(let i=0;i<3;i++)inst('cone',t.x,t.y+t.h*.4+i*t.h*.2,t.z,t.h*.7-i*.6,t.h*.65,t.h*.7-i*.6,M.leaf);}else{inst('sphere',t.x,t.y+t.h*.75,t.z,t.h*.9,t.h*.8,t.h*.85,t.type===1?M.leaf:M.leaf2);if(t.type===2)inst('sphere',t.x+1,t.y+t.h*.6,t.z+.6,t.h*.5,t.h*.5,t.h*.5,M.leaf2);}}
 // Tall grass is visual concealment, not bulletproof cover.
 const rand=rng(882);for(let i=0;i<620;i++){const x=(rand()-.5)*233,z=(rand()-.5)*233;if(BUILDINGS.some(b=>Math.abs(x-b.x)<19&&Math.abs(z-b.z)<19)||Math.abs(x)<7||Math.abs(z)<7)continue;if(Math.sin(x*.09)*Math.cos(z*.11)<-.1)continue;const h=.35+rand()*.45;inst('cone',x,terrainHeight(x,z)+h/2,z,.28,h,.22,mat(i%3?'#6d994a':'#8eae53'),{y:rand()*6.28});}
 for(const patch of GRASS_PATCHES)for(let i=0;i<105;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*patch.r,x=patch.x+Math.sin(a)*r,z=patch.z+Math.cos(a)*r,h=.55+rand()*.36;inst('cone',x,terrainHeight(x,z)+h/2,z,.32,h,.26,mat(i%2?'#749a4b':'#8bad58'),{y:rand()*6.28});}
 for(const batch of batches.values()){const mesh=new T.InstancedMesh(geo[batch.kind],batch.m,batch.items.length);batch.items.forEach((p,i)=>{dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.w,p.h,p.d);dummy.rotation.set(p.rx,p.ry,p.rz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=!mobile;mesh.receiveShadow=true;mesh.computeBoundingSphere();scene.add(mesh);}
 const zoneMaterial=new T.ShaderMaterial({transparent:true,side:T.DoubleSide,depthWrite:false,uniforms:{clock:{value:0}},vertexShader:'varying vec2 uvOut; void main(){uvOut=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 uvOut; uniform float clock; void main(){float stripe=step(.88,fract(uvOut.x*110.0+uvOut.y*24.0-clock*.18)); float pulse=.5+.5*sin(clock*2.0);gl_FragColor=vec4(.15,.72,1.0,.17+stripe*.32+pulse*.055);}'});
 const ring=new T.Mesh(new T.CylinderGeometry(1,1,240,128,1,true),zoneMaterial);ring.position.y=100;scene.add(ring);const ringGeo=new T.BufferGeometry();ringGeo.setAttribute('position',new T.BufferAttribute(new Float32Array(129*3),3));const ringLine=new T.Line(ringGeo,new T.LineBasicMaterial({color:'#9aeeff',transparent:true,opacity:.95}));scene.add(ringLine);
 const plane=new T.Group();box(plane,0,0,0,2.2,1.1,11,M.steel,true);box(plane,0,.15,0,17,.23,2.6,M.steel);box(plane,0,.7,-4,5,.2,1.7,M.steel);box(plane,0,1.2,-4,.25,2.2,1.5,M.dark);for(const x of [-4,4]){const engine=new T.Mesh(geo.cylinder,M.dark);engine.rotation.x=Math.PI/2;engine.scale.set(.9,2,.9);engine.position.set(x,-.5,1.1);plane.add(engine);}scene.add(plane);
 const characters=new Map(),pickups=new Map(),traces=[],grenadeMeshes=new Map(),explosions=new Map();
 const human={jacket:mat('#385f73'),npc:mat('#71876a'),pants:mat('#3e5054'),skin:mat('#c69d7b'),helmet:mat('#627c73'),boots:mat('#2b3840'),vest:mat('#596d61')};
 function gunModel(parent,index){const w=WEAPONS[index],group=new T.Group();parent.add(group);const metal=mat(w.color,{metalness:.5,roughness:.43}),black=M.dark,wood=mat(index===1||index===3?'#ac7a48':'#4e676d');
  box(group,0,0,0,.14,.17,index===2?.32:.5,metal,true);box(group,0,.035,w.length*.38,.055,.055,w.length*.55,black);box(group,0,-.13,-.08,.085,.23,.12,black,true);box(group,0,-.01,-.37,.16,.22,.3,wood,true);
  const magazine=box(group,0,-.18,.1,index===4?.14:.075,index===3?.09:.26,index===4?.22:.14,black,true);
  if(index===3){const scope=new T.Mesh(geo.cylinder,black);scope.rotation.x=Math.PI/2;scope.position.set(0,.18,.03);scope.scale.set(.14,.44,.14);group.add(scope);box(group,0,.11,0,.09,.1,.2,black);}
  else if(index===0||index===2){box(group,0,.15,.02,index===2?.16:.11,.14,.085,black,true);box(group,0,.17,.025,.075,.055,.09,mat('#72d6cb',{emissive:0x184c48,emissiveIntensity:.25}));}
  else{box(group,0,.12,.13,.07,.09,.07,black);box(group,0,.11,.5,.045,.07,.06,black);}
  const flash=new T.Mesh(new T.ConeGeometry(.13,.36,5),new T.MeshBasicMaterial({color:'#ffe495'}));flash.rotation.x=Math.PI/2;flash.position.set(0,.03,w.length*.66);flash.visible=false;group.add(flash);return{group,magazine,flash};
 }
 function label(name,bot){const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.font='700 36px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=7;ctx.strokeStyle='#172d2be6';ctx.strokeText(name,256,50,470);ctx.fillStyle=bot?'#cfdfc2':'#f3ffe6';ctx.fillText(name,256,50,470);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthWrite:false}));sprite.scale.set(1.7,.31,1);return sprite;}
 const vectorA=v3(),vectorB=v3(),vectorD=v3();
 function segment(mesh,a,b,r){vectorA.set(...a);vectorB.set(...b);mesh.position.copy(vectorA).add(vectorB).multiplyScalar(.5);vectorD.subVectors(vectorB,vectorA);mesh.quaternion.setFromUnitVectors(UP,vectorD.clone().normalize());mesh.scale.set(r*2,vectorD.length(),r*2);}
 function knee(hip,foot,length=.44){const dy=foot[1]-hip[1],dz=foot[2]-hip[2],d=Math.max(.01,Math.hypot(dy,dz)),h=Math.sqrt(Math.max(.002,length*length-Math.min(d,length*2-.01)**2/4));return[(hip[0]+foot[0])/2,(hip[1]+foot[1])/2+dz/d*h,(hip[2]+foot[2])/2-dy/d*h];}
 function character(p){const root=new T.Group(),body=new T.Group();root.add(body);scene.add(root);const jacket=p.bot?human.npc:human.jacket;
  const chest=box(body,0,1.2,0,.48,.53,.32,jacket,true),vest=box(body,0,1.2,.17,.43,.37,.08,human.vest,true),hips=box(body,0,.86,0,.4,.22,.28,human.pants,true),pack=box(body,0,1.12,-.24,.4,.48,.24,M.wood,true);
  const head=new T.Group();body.add(head);box(head,0,0,0,.29,.33,.29,human.skin,true);const helmet=box(head,0,.12,-.005,.34,.16,.35,human.helmet,true);box(head,0,.045,.151,.245,.055,.02,M.dark);for(const x of [-.065,.065])box(head,x,.005,.151,.025,.025,.015,M.dark);box(head,0,-.085,.154,.08,.017,.015,mat('#82614c'));
  const legs=[],arms=[];for(const side of [-1,1]){const leg={upper:new T.Mesh(geo.cylinder,human.pants),lower:new T.Mesh(geo.cylinder,human.pants),shoe:box(body,0,0,0,.22,.14,.35,human.boots,true)};body.add(leg.upper,leg.lower);legs.push(leg);const arm={upper:new T.Mesh(geo.cylinder,jacket),lower:new T.Mesh(geo.cylinder,human.skin),hand:box(body,0,0,0,.115,.13,.13,human.skin,true)};body.add(arm.upper,arm.lower);arms.push(arm);}
  const guns=WEAPONS.map((_,i)=>gunModel(body,i));
  const glider=new T.Group();root.add(glider);const wing=new T.BufferGeometry(),verts=[],indices=[],cols=[];
  for(let row=0;row<=4;row++)for(let col=0;col<=20;col++){const t=(col/20-.5)*2,x=t*4.6,z=(row/4-.5)*2.5,y=3.25+1.2*Math.sqrt(Math.max(0,1-t*t))-.23*(2*row/4-1)**2;verts.push(x,y,z);const color=new T.Color(col<4||col>16?'#276f99':col%4<2?'#e4b556':'#f1d28a');cols.push(color.r,color.g,color.b);}
  for(let r=0;r<4;r++)for(let c=0;c<20;c++){const i=r*21+c;indices.push(i,i+1,i+21,i+1,i+22,i+21);}wing.setAttribute('position',new T.Float32BufferAttribute(verts,3));wing.setAttribute('color',new T.Float32BufferAttribute(cols,3));wing.setIndex(indices);wing.computeVertexNormals();glider.add(new T.Mesh(wing,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.7})));
  for(const x of [-3,-1.7,1.7,3])for(const z of [-.9,.9]){const top=3.25+1.2*Math.sqrt(1-(x/4.6)**2);glider.add(new T.Line(new T.BufferGeometry().setFromPoints([v3(x,top,z),v3(x<0?-.5:.5,1.86,.1)]),new T.LineBasicMaterial({color:'#c8d4ce'})));}
  const name=label(p.name,p.bot);root.add(name);const heldGrenade=new T.Mesh(geo.sphere,mat('#71804f'));heldGrenade.scale.setScalar(.22);body.add(heldGrenade);const bottle=box(body,0,0,0,.09,.17,.09,mat('#d69744'),true);bottle.visible=false;
  return{root,body,chest,vest,hips,pack,head,legs,arms,guns,glider,label:name,bottle,heldGrenade,yaw:p.yaw,speed:0,stride:0,flashLeft:0,kick:0,death:0,lastHp:p.hp,hit:0,bank:0};
 }
 const fp=new T.Group();camera.add(fp);const fpGuns=WEAPONS.map((_,i)=>gunModel(fp,i));for(const g of fpGuns)g.group.rotation.y=Math.PI;
 fp.name='first-person-hands';
 const fpHands=[box(fp,.25,-.26,-.45,.13,.16,.17,human.skin,true),box(fp,-.12,-.25,-.73,.13,.16,.17,human.skin,true)];
 const fpArms=[0,1].map(()=>{const upper=new T.Mesh(geo.cylinder,human.jacket),lower=new T.Mesh(geo.cylinder,human.skin);fp.add(upper,lower);return{upper,lower};});
 const fpGrenade=new T.Mesh(geo.sphere,mat('#71804f'));fpGrenade.scale.setScalar(.21);fp.add(fpGrenade);const fpBottle=box(fp,0,0,0,.09,.17,.09,mat('#d69744'),true);
 let eyeHeight=1.53,eyeForward=0;let cameraReady=false,anchor=v3(),lastMode='third',cameraDistance=5.2,latest=null,recoil=0,nowTime=0,lastRing=0;
 function updateCharacter(c,p,target,dt,own){
  c.root.position.copy(v3(target.x,target.y,target.z));const yaw=p.gliding?(target.glideYaw??p.glideYaw??p.yaw):target.yaw??p.yaw;c.yaw+=Math.atan2(Math.sin(yaw-c.yaw),Math.cos(yaw-c.yaw))*(1-Math.exp(-dt*18));c.root.rotation.y=c.yaw;c.bank=T.MathUtils.damp(c.bank,p.gliding?(target.bank||p.bank||0):0,6,dt);c.root.rotation.z=c.bank;
  const stance=target.stance||p.stance,prone=stance==='prone',crouch=stance==='crouch',speed=Math.hypot(target.vx||0,target.vz||0);c.speed=T.MathUtils.damp(c.speed,p.gliding||p.dead?0:Math.min(8,speed),11,dt);c.stride+=dt*c.speed*(prone?2.3:1.7);c.death=T.MathUtils.damp(c.death,p.dead?1:0,6,dt);c.body.rotation.z=c.death*1.48;
  const viewMode=own?(target.view||p.view):p.view;const draw=viewMode==='first'&&(p.aim||nowTime-p.lastShot<1.3||speed<.35)&&p.guns[p.weapon]&&!p.gliding&&!p.usingPain&&nowTime-(p.throwAt??-10)>.6,targetHip=prone?.29:crouch?.46:draw?.85:.9,hip=c.poseHip===undefined?targetHip:T.MathUtils.damp(c.poseHip,targetHip,11,dt),lean=prone?Math.PI/2:crouch?.2:draw?.12:speed>4?.13:.035;
  c.poseHip=hip;c.hips.position.set(0,hip,prone?-.35:0);c.chest.position.set(0,prone?.31:hip+.33,prone?.15:lean*.34);c.chest.rotation.x=T.MathUtils.damp(c.chest.rotation.x,lean,11,dt);c.vest.position.copy(c.chest.position).add(v3(0,prone?-.12:0,prone?.09:.18));c.vest.rotation.x=lean;c.pack.position.set(0,prone?.47:hip+.3,prone?-.05:-.24);c.pack.rotation.x=prone?Math.PI/2:lean;
  c.head.position.lerp(v3(0,prone?.35:crouch?1.1:1.64,prone?.69:draw?.1:crouch?.15:.035),c.headReady?1-Math.exp(-dt*12):1);c.headReady=true;c.head.rotation.x=prone?-.08:draw?.13:.03;
  const swing=Math.sin(c.stride),lift=Math.max(0,Math.sin(c.stride)),gun=c.guns[p.weapon],reload=p.reload>0?1-p.reload/WEAPONS[p.weapon].reload:0,reach=Math.sin(reload*Math.PI);c.kick=T.MathUtils.damp(c.kick,0,20,dt);c.flashLeft-=dt;
  for(let i=0;i<2;i++){const side=i?1:-1;let shoulder,hand,elbow;
   if(prone){const h=[side*.15,.25,-.33],k=[side*.2,.16,-.68],f=[side*.24,.11,-1.05];segment(c.legs[i].upper,h,k,.105);segment(c.legs[i].lower,k,f,.085);c.legs[i].shoe.position.set(...f);c.legs[i].shoe.rotation.set(0,Math.PI,0);shoulder=[side*.29,.3,.3];hand=[draw?-.24:side*.21,.26,i?.99:.75];elbow=[side*.39,.12,.52];}
   else{const phase=c.stride+(i?Math.PI:0),walk=Math.sin(phase)*Math.min(.31,c.speed*.045),foot=[side*.15,.14+Math.max(0,Math.sin(phase))*Math.min(.12,c.speed*.016),walk+(crouch?.12:0)],h=[side*.15,hip,0],k=knee(h,foot);segment(c.legs[i].upper,h,k,.105);segment(c.legs[i].lower,k,foot,.085);c.legs[i].shoe.position.set(foot[0],foot[1]-.07,foot[2]+.04);c.legs[i].shoe.rotation.set(0,0,0);
    shoulder=[side*.31,hip+.55,lean*.2];hand=draw?[i?-.22:-.25,hip+.31,i?.72:.37]:[side*.34,hip+.02,Math.sin(phase)*Math.min(.25,c.speed*.035)];elbow=[side*.42,hip+.29,draw?.25:Math.sin(phase)*.12];
   }
   if(p.gliding){shoulder=[side*.3,1.4,.04];elbow=[side*.49,1.61,.05];hand=[side*.5,1.92,.1];c.legs[i].shoe.rotation.x=.2;}
   if(p.reload>0&&i===1){hand=[.1,hip+.12+reach*.2,.4];elbow=[.43,hip+.24,.22];}
   if(p.usingPain>0&&i===0){hand=[-.11,c.head.position.y-.06,c.head.position.z+.23];elbow=[-.4,hip+.35,.26];}
   if(nowTime-(p.throwAt??-10)<.6&&i===0){const t=(nowTime-p.throwAt)/.6;hand=[-.22,hip+.65+Math.sin(t*Math.PI)*.5,-.3+t*1.5];elbow=[-.45,hip+.5,.12];}
   segment(c.arms[i].upper,shoulder,elbow,.09);segment(c.arms[i].lower,elbow,hand,.075);c.arms[i].hand.position.set(...hand);
  }
  c.guns.forEach((g,i)=>{g.group.visible=p.guns[i]&&i===p.weapon&&!p.dead;g.flash.visible=c.flashLeft>0&&draw;g.magazine.position.y=-.18;if(draw){g.group.position.set(-.26,prone?.29:hip+.35,prone?.82:.36-c.kick);g.group.rotation.set(-(target.pitch||p.pitch)*.6+(prone?0:.06),0,-reach*.4);if(p.reload>0)g.magazine.position.y-=Math.sin(clamp((reload-.1)/.7,0,1)*Math.PI)*.43;}else{g.group.position.set(.24,prone?.52:hip+.26,prone?-.22:-.31);g.group.rotation.set(prone?0:-1.12,0,.22);}});
  c.heldGrenade.visible=nowTime-(p.throwAt??-10)>=0&&nowTime-(p.throwAt??-10)<.28;c.heldGrenade.position.copy(c.arms[0].hand.position);c.bottle.visible=p.usingPain>0;c.bottle.position.copy(c.arms[0].hand.position).add(v3(0,.06,.03));c.glider.visible=p.gliding&&!p.dead;
  c.label.position.y=prone?.83:crouch?1.45:2.05;c.label.visible=!p.dead&&!(own&&viewMode==='first')&&(own||c.root.position.distanceTo(camera.position)<(prone?13:43));
  c.root.visible=!p.onPlane&&!(own&&viewMode==='first')&&c.root.position.distanceTo(camera.position)<200;
 }
 function sync(state,dt,ownPose,age=0){latest=state;nowTime=state.time+Math.min(age,.22);zoneMaterial.uniforms.clock.value=nowTime;const ids=new Set();
  for(const p of state.players){ids.add(p.id);let c=characters.get(p.id);if(!c){c=character(p);characters.set(p.id,c);c.root.position.set(p.x,p.y,p.z);}
   const own=p.id===state.you;let target=own&&ownPose?ownPose:{...p,x:p.x+(p.dead?0:p.vx||0)*Math.min(age,.18),z:p.z+(p.dead?0:p.vz||0)*Math.min(age,.18),y:Math.max(supportHeight(p.x,p.z,p.y),p.y+(p.dead?0:p.vy||0)*Math.min(age,.13))};
   if(!own){const t=1-Math.exp(-dt*15);target={...target,x:c.root.position.x+(target.x-c.root.position.x)*t,y:c.root.position.y+(target.y-c.root.position.y)*t,z:c.root.position.z+(target.z-c.root.position.z)*t};}
   updateCharacter(c,p,target,dt,own);
  }
  for(const[id,c]of characters)if(!ids.has(id)){scene.remove(c.root);c.label.material.map.dispose();c.label.material.dispose();characters.delete(id);}
  const lootIds=new Set();for(const l of state.loot){lootIds.add(l.id);if(!pickups.has(l.id)){const group=new T.Group();if(l.kind==='weapon'){const g=gunModel(group,l.weapon);g.group.rotation.y=.65;g.group.scale.setScalar(.8);}else{const colors={ammo:'#d6b765',med:'#91d2b7',pain:'#e7af58',grenade:'#79915b'};box(group,0,0,0,l.kind==='ammo'?.3:.2,.18,.2,mat(colors[l.kind]),true);if(l.kind==='med'){box(group,0,.1,0,.12,.02,.04,M.trim);box(group,0,.1,0,.04,.02,.12,M.trim);}}group.position.set(l.x,l.y,l.z);scene.add(group);pickups.set(l.id,group);}}
  for(const[id,g]of pickups)if(!lootIds.has(id)){scene.remove(g);pickups.delete(id);}
  const gIds=new Set();for(const g of state.grenades||[]){gIds.add(g.id);let mesh=grenadeMeshes.get(g.id);if(!mesh){mesh=new T.Mesh(geo.sphere,mat('#738650'));mesh.scale.setScalar(.2);scene.add(mesh);grenadeMeshes.set(g.id,mesh);}mesh.visible=!(g.delay>0);mesh.position.set(g.x,g.y,g.z);mesh.rotation.x+=dt*8;}for(const[id,m]of grenadeMeshes)if(!gIds.has(id)){scene.remove(m);grenadeMeshes.delete(id);}
  for(const e of state.explosions||[]){if(explosions.has(e.id))continue;const group=new T.Group();group.position.set(e.x,e.y,e.z);const r=rng(e.id);for(let i=0;i<7;i++){const sphere=new T.Mesh(geo.sphere,new T.MeshBasicMaterial({color:i<2?'#ffc774':'#7b817b',transparent:true,opacity:.7,depthWrite:false}));sphere.userData={x:(r()-.5)*3,y:r()*2,z:(r()-.5)*3};group.add(sphere);}scene.add(group);explosions.set(e.id,{group,t:0});}
  ring.visible=ringLine.visible=state.phase==='battle'&&state.code!=='TITLE';ring.position.x=state.zone.x;ring.position.z=state.zone.z;ring.scale.set(state.zone.r,1,state.zone.r);
  if(nowTime-lastRing>.08){lastRing=nowTime;const attr=ringGeo.attributes.position;for(let i=0;i<=128;i++){const a=i/128*Math.PI*2,x=state.zone.x+Math.sin(a)*state.zone.r,z=state.zone.z+Math.cos(a)*state.zone.r;attr.setXYZ(i,x,terrainHeight(x,z)+.2,z);}attr.needsUpdate=true;ringGeo.computeBoundingSphere();}
  plane.visible=state.phase==='flight';plane.position.set(-110+clamp(nowTime/FLIGHT_SECONDS,0,1)*220,FLIGHT_HEIGHT,0);plane.rotation.y=Math.PI/2;
 }
 function shot(s,{local=false}={}){for(const to of s.rays||[s.to]){const line=new T.Line(new T.BufferGeometry().setFromPoints([v3(...s.from),v3(...to)]),new T.LineBasicMaterial({color:'#fff4c0',transparent:true,opacity:.9}));scene.add(line);traces.push({line,t:.085});}const c=characters.get(s.by);if(c){c.flashLeft=.06;c.kick=.13;}if(local)recoil=Math.min(.16,recoil+WEAPONS[s.weapon||0].recoil*(s.stance==='prone'?.23:s.stance==='crouch'?.55:1));}
 function render(dt,state,follow,yaw,pitch,aim,home=false){
  for(let i=traces.length-1;i>=0;i--){const q=traces[i];q.t-=dt;q.line.material.opacity=q.t/.085;if(q.t<=0){scene.remove(q.line);q.line.geometry.dispose();q.line.material.dispose();traces.splice(i,1);}}
  for(const[id,e]of explosions){e.t+=dt;for(const m of e.group.children){m.position.set(m.userData.x*e.t,m.userData.y*e.t,m.userData.z*e.t);m.scale.setScalar(.6+e.t*2.2);m.material.opacity=Math.max(0,.75-e.t*.38);}if(e.t>2.1){scene.remove(e.group);for(const m of e.group.children)m.material.dispose();explosions.delete(id);}}
  recoil=T.MathUtils.damp(recoil,0,12,dt);fp.visible=false;
  if(home){camera.position.set(43,terrainHeight(43,46)+21,48);camera.lookAt(-10,terrainHeight(-10,0)+2,0);cameraReady=false;}
  else if(follow){
   const first=follow.view==='first'&&!follow.onPlane&&!follow.gliding;eyeHeight=T.MathUtils.damp(eyeHeight,stanceOf(follow).eye,12,dt);eyeForward=T.MathUtils.damp(eyeForward,follow.stance==='prone'?.63:0,12,dt);const position=v3(follow.x+Math.sin(yaw)*eyeForward,follow.y+eyeHeight,follow.z+Math.cos(yaw)*eyeForward);const direction=v3(Math.sin(yaw)*Math.cos(pitch+recoil),Math.sin(pitch+recoil),Math.cos(yaw)*Math.cos(pitch+recoil));
   if(!cameraReady||position.distanceTo(anchor)>35){anchor.copy(position);cameraReady=true;}else anchor.copy(position);
   if(first){camera.position.copy(anchor);camera.lookAt(anchor.clone().add(direction));const w=WEAPONS[follow.weapon||0],fov=aim?(w.sight==='scope'?26:w.sight==='shotgun'?57:50):76;camera.fov=T.MathUtils.damp(camera.fov,fov,13,dt);
    const draw=follow.guns?.[follow.weapon]&&!follow.dead&&(aim||nowTime-follow.lastShot<1.3||Math.hypot(follow.vx||0,follow.vz||0)<.35);const throwing=nowTime-(follow.throwAt??-10)>=0&&nowTime-(follow.throwAt??-10)<.6;fp.visible=(draw||throwing||follow.usingPain>0)&&!(aim&&w.sight==='scope');const progress=follow.reload>0?1-follow.reload/w.reload:0,reach=Math.sin(progress*Math.PI);
    fpGuns.forEach((g,i)=>{g.group.visible=i===follow.weapon&&!throwing&&!follow.usingPain;g.group.position.set(aim?.035:.28,aim?-.33:-.25,-.62+recoil*.9);g.group.rotation.set(reach*.2,Math.PI,-reach*.45);g.magazine.position.y=-.18-Math.sin(clamp((progress-.1)/.7,0,1)*Math.PI)*.42;g.flash.visible=characters.get(follow.id)?.flashLeft>0;});const gunX=aim?.035:.28,gunY=aim?-.33:-.25;fpHands[0].position.set(gunX,gunY-.14,-.54);fpHands[1].position.set(gunX-.035-reach*.1,gunY-.09-reach*.27,-.97+reach*.27);
    if(throwing){const t=(nowTime-follow.throwAt)/.6;fpHands[0].position.set(.25,-.32+Math.sin(t*Math.PI)*.42,-.35-t*.8);}
    if(follow.usingPain>0)fpHands[0].position.set(.12,-.06+Math.sin(nowTime*2)*.012,-.33);
    fpGrenade.visible=throwing&&nowTime-follow.throwAt<.28;fpGrenade.position.copy(fpHands[0].position).add(v3(0,.03,-.04));fpBottle.visible=follow.usingPain>0;fpBottle.position.copy(fpHands[0].position).add(v3(0,.08,-.025));fpBottle.rotation.z=.22;
    for(let i=0;i<2;i++){const side=i?-1:1,elbow=[side*.39,-.39,-.29];segment(fpArms[i].upper,[side*.59,-.62,-.12],elbow,.105);segment(fpArms[i].lower,elbow,fpHands[i].position.toArray(),.085);}

   }else{
    const shoulder=mobile&&innerHeight>innerWidth?.4:.77,dist=follow.onPlane?17:follow.gliding?11:5.5,desired=anchor.clone().addScaledVector(direction,-dist).add(v3(-Math.cos(yaw)*shoulder,.34,Math.sin(yaw)*shoulder)),delta=desired.sub(anchor),len=delta.length();delta.normalize();const hit=rayWorld(anchor.toArray(),delta.toArray(),len).distance,safe=Math.max(.4,Math.min(len,hit-.18));cameraDistance=T.MathUtils.damp(cameraDistance,safe,safe<cameraDistance?30:8,dt);camera.position.copy(anchor).addScaledVector(delta,Math.min(cameraDistance,safe+.05));camera.lookAt(anchor.clone().addScaledVector(direction,60));camera.fov=T.MathUtils.damp(camera.fov,65,12,dt);
   }
   camera.updateProjectionMatrix();lastMode=first?'first':'third';
  }
  renderer.render(scene,camera);
 }
 function localTrace(p,yaw,pitch){const from=eyePosition({...p,yaw}),d=[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)],range=WEAPONS[p.weapon||0].range,t=Math.min(range,rayWorld(from,d,range).distance);return{by:p.id,weapon:p.weapon,stance:p.stance,from,to:from.map((v,i)=>v+d[i]*t)};}
 function quality(sharp=true){renderer.setPixelRatio(sharp?sharpRatio:1);renderer.shadowMap.enabled=sharp&&!mobile;}
 window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
 return{sync,render,shot,localTrace,quality,renderer,scene,camera,characters};
}
