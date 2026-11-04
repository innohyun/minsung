// Actual Three GLTFLoader validation. Bitmap shim is only for Node's missing image API;
// Pillow separately decodes and inspects every embedded and standalone WebP.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const T=await import(root+'node_modules/three/build/three.module.js');
const {GLTFLoader}=await import(root+'node_modules/three/examples/jsm/loaders/GLTFLoader.js');
globalThis.self={URL};globalThis.createImageBitmap=async()=>({width:2048,height:2048,close(){}});
const assert=(truth,message)=>{if(!truth)throw Error(message)};
const patch=JSON.parse(await fs.readFile(root+'assets/source/trees-v014-manifest-patch.json','utf8'));
const metadata=JSON.parse(await fs.readFile(root+'assets/source/trees-v014-bounds.json','utf8'));
const report={revision:'0.14.0',checks:{actualGLTFLoader:true,allAssetHashes:true,rootIdentity:true,noExposedRoots:true,groundTrunkDiameter:true,leafAlphaMask:true,finiteGeometry:true,boundsMatch:true,all15Distinct:true},banks:{},models:{}};
for(const a of patch.assets){const bytes=await fs.readFile(root+a.sourcePath);assert(bytes.length===a.size,a.id+' size');assert(crypto.createHash('sha256').update(bytes).digest('hex')===a.sha256,a.id+' SHA256');assert(a.size<8*1024*1024,a.id+' <8MiB');assert(a.path==='assets/art/'+a.sha256+(a.mime==='model/gltf-binary'?'.glb':'.webp'),a.id+' hash URL');}
assert(Object.keys(patch.models).length===15,'15 models');assert(Object.keys(patch.impostors).length===15,'15 impostors');
const geometryHashes=new Set();
for(const species of Object.keys(patch.species)){
 const a=patch.assets.find(a=>a.id==='trees-v014-'+species);const bytes=await fs.readFile(root+a.sourcePath);
 const gltf=await new Promise((ok,no)=>new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'',ok,no));
 assert(gltf.animations.length===0,species+' static bank');
 const jlen=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+jlen).toString());
 const imageNames=doc.images.map(i=>i.name);assert(imageNames.includes('trees-v014-leaf-atlas-basecolor'),species+' leaf image name');
 if(species!=='birch')assert(patch.sharedImages.every(n=>imageNames.includes(n)),species+' 3 reusable surface images');
 assert(gltf.scene.children.length===3,species+' exactly3 roots');let bankTriangles=0;
 for(const name of patch.species[species]){
  const model=gltf.scene.getObjectByName(name);assert(model,name+' root exists');assert(model.position.length()<1e-7&&model.quaternion.angleTo(new T.Quaternion())<1e-7&&model.scale.distanceTo(new T.Vector3(1,1,1))<1e-7,name+' identity');
  model.updateMatrixWorld(true);const b=new T.Box3().setFromObject(model);const spec=patch.models[name];
  const min=b.min.toArray(),max=b.max.toArray();assert(min.every((v,i)=>Math.abs(v-spec.bounds.min[i])<.0002)&&max.every((v,i)=>Math.abs(v-spec.bounds.max[i])<.0002),name+' bounds exact');assert(Math.abs(min[1]+.1)<.0001,name+' bottom-.1');
  let triangles=0,meshes=0,leafTriangles=0,barkTriangles=0,ground=[];const hash=crypto.createHash('sha256');
  model.traverse(n=>{if(!n.isMesh)return;meshes++;const g=n.geometry,p=g.attributes.position;const count=(g.index?.count??p.count)/3;triangles+=count;hash.update(Buffer.from(p.array.buffer,p.array.byteOffset,p.array.byteLength));assert(g.attributes.uv,name+' UV');
   for(let i=0;i<p.count;i++)assert(Number.isFinite(p.getX(i))&&Number.isFinite(p.getY(i))&&Number.isFinite(p.getZ(i)),name+' finite coordinates');
   const mats=Array.isArray(n.material)?n.material:[n.material];const isLeaf=mats.some(m=>/leaf|foliage|needle/i.test(m.name));
   if(isLeaf){leafTriangles+=count;for(const m of mats){assert(m.alphaTest===.45&&!m.transparent&&m.depthWrite&&m.side===T.DoubleSide,name+' foliage mask .45/double/depth');assert(m.map,name+' foliage texture');}}
   else{barkTriangles+=count;for(let i=0;i<p.count;i++)if(p.getY(i)<.005)ground.push([p.getX(i),p.getY(i),p.getZ(i)]);}
  });
  assert(meshes===2,name+' 2 meshes');assert(triangles>=8000&&triangles<=18000,name+' 8-18k triangles');assert(triangles===spec.triangles,name+' triangle metadata');
  assert(ground.length>10,name+' ground trunk ring');const radii=ground.map(p=>Math.hypot(p[0],p[2]));const groundDiameter=2*Math.max(...radii),diameter=2*Math.max(...ground.filter(p=>p[1]<-.0999).map(p=>Math.hypot(p[0],p[2])));assert(Math.abs(diameter-spec.trunkDiameter)<.0001&&groundDiameter<spec.trunkDiameter*1.015,name+' nominal trunk diameter/ground bark allowance');assert(Math.min(...ground.map(p=>p[1]))>-.1001,name+' no geometry below-.1');
  const h=hash.digest('hex');assert(!geometryHashes.has(h),name+' independent variant geometry');geometryHashes.add(h);bankTriangles+=triangles;
  assert(spec.assetId===a.id&&spec.node===name,name+' manifest model reference');const imp=patch.impostors[name];assert(imp.planeWidth>spec.bounds.width&&imp.planeHeight>spec.bounds.height,name+' impostor margin');assert(imp.resolution[0]===256&&imp.resolution[1]===512,name+' impostor resolution contract');
  report.models[name]={triangles,barkTriangles,leafTriangles,meshes,bounds:{min,max,size:b.getSize(new T.Vector3()).toArray()},trunkDiameter:diameter,groundBarkDiameter:groundDiameter,declaredTrunkDiameter:spec.trunkDiameter,groundVertexCount:ground.length,geometryHash:h,primaryBranches:metadata.models[name].primaryBranches,lean:metadata.models[name].lean};
 }
 report.banks[species]={size:bytes.length,sha256:a.sha256,roots:patch.species[species],triangles:bankTriangles,materials:doc.materials.map(m=>({name:m.name,alphaMode:m.alphaMode??'OPAQUE',alphaCutoff:m.alphaCutoff})),embeddedImages:imageNames};
}
await fs.writeFile(root+'assets/source/trees-v014-validation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({checks:report.checks,models:Object.keys(report.models).length,banks:report.banks},null,2));
