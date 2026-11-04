// Real Three GLTFLoader/SkeletonUtils/AnimationMixer geometry and skinning validation.
// Node supplies a bitmap shim; embedded WebP bitstreams are separately decoded by Pillow and Blender.
import fs from'node:fs/promises';import crypto from'node:crypto';
import{fileURLToPath}from'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const T=await import(root+'node_modules/three/build/three.module.js');
const{GLTFLoader}=await import(root+'node_modules/three/examples/jsm/loaders/GLTFLoader.js');
const{clone}=await import(root+'node_modules/three/examples/jsm/utils/SkeletonUtils.js');
globalThis.self={URL};globalThis.createImageBitmap=async()=>({width:2048,height:2048,close(){}});
const data=await fs.readFile(root+'assets/source/survivor-v014.glb');const gltf=await new Promise((ok,no)=>new GLTFLoader().parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'',ok,no));
const assert=(truth,message)=>{if(!truth)throw Error(message)};
const source=gltf.scene.getObjectByName('survivor');assert(source,'survivor root');assert(source.quaternion.angleTo(new T.Quaternion())<1e-6,'root identity rotation');
const model=clone(source),mixer=new T.AnimationMixer(model);let meshCount=0,triangles=0;model.traverse(n=>{if(n.isMesh){meshCount++;triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3}});
assert(model.getObjectByName('hand_r')!==source.getObjectByName('hand_r'),'independent cloned skeleton');
const required=['idle','aim','walk','run','crouch_idle','crouch_walk','prone_idle','prone_crawl','jump','throw','reload','walk_left','walk_right','walk_backward','run_left','run_right','run_backward','crouch_walk_left','crouch_walk_right','crouch_walk_backward'];
assert(required.every(name=>gltf.animations.some(c=>c.name===name)),'all20 named animation clips');
const p=name=>model.getObjectByName(name).getWorldPosition(new T.Vector3());
function bounds(){model.traverse(n=>{if(n.isSkinnedMesh){n.skeleton.update();n.computeBoundingBox()}});const b=new T.Box3().setFromObject(model);return{min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(new T.Vector3()).toArray()}}
const report={sha256:crypto.createHash('sha256').update(data).digest('hex'),size:data.length,root:'survivor',meshCount,triangles,clipNames:gltf.animations.map(c=>c.name),checks:{rootIdentity:true,skeletonCloneIndependent:true,all20Clips:true},clips:{}};
for(const name of required){
 const clip=T.AnimationClip.findByName(gltf.animations,name);mixer.stopAllAction();const action=mixer.clipAction(clip).setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();
 const knee=[],footYs=[],hipYs=[],hipXs=[],rootLengths=[];let sampleBounds=null;
 for(let i=0;i<=20;i++){
  mixer.setTime(clip.duration*i/20);model.updateMatrixWorld(true);const a=p('thigh_l'),b=p('shin_l'),c=p('foot_l');const flex=180-T.MathUtils.radToDeg(a.clone().sub(b).angleTo(c.clone().sub(b)));knee.push(flex);footYs.push(c.y);hipYs.push(p('hips').y);hipXs.push(p('hips').x);rootLengths.push(model.getObjectByName('root').position.length());
  if(i===10)sampleBounds=bounds();
 }
 const socket=model.getObjectByName('weapon_socket'),forward=new T.Vector3(0,0,1).applyQuaternion(socket.getWorldQuaternion(new T.Quaternion()));
 report.clips[name]={duration:clip.duration,kneeFlexDegrees:[Math.min(...knee),Math.max(...knee)],ankleYRange:[Math.min(...footYs),Math.max(...footYs)],hipsYRange:[Math.min(...hipYs),Math.max(...hipYs)],hipsXRange:[Math.min(...hipXs),Math.max(...hipXs)],maxRootTranslation:Math.max(...rootLengths),midpointBounds:sampleBounds,socketPosition:socket.getWorldPosition(new T.Vector3()).toArray(),socketForward:forward.toArray()};
 assert(Math.max(...rootLengths)<1e-5,name+' no root translation');
}
assert(report.clips.walk.kneeFlexDegrees[1]>30,'walk visibly flexes knee');assert(report.clips.run.kneeFlexDegrees[1]>70,'run folds lower leg');assert(report.clips.crouch_idle.kneeFlexDegrees[1]>100,'crouch actual lower-body compression');assert(report.clips.jump.kneeFlexDegrees[1]>70,'jump folds knees');
assert(report.clips.idle.midpointBounds.max[1]>1.76&&report.clips.idle.midpointBounds.max[1]<1.84,'human height');
for(const name of ['idle','aim','crouch_idle','prone_idle'])assert(new T.Vector3(...report.clips[name].socketForward).dot(new T.Vector3(0,0,1))>.999,name+' weapon socket +Z');
await fs.writeFile(root+'assets/source/survivor-v014-validation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({sha256:report.sha256,size:report.size,meshCount,triangles,checks:report.checks,poses:Object.fromEntries(['walk','run','crouch_idle','prone_idle','jump'].map(n=>[n,report.clips[n]]))},null,2));
