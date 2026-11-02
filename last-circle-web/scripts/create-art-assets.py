#!/usr/bin/env python3
"""Original LAST CIRCLE art. No downloads; deterministic texture synthesis and Blender mesh authoring.
Run: python scripts/create-art-assets.py [--preview]
Requires Blender 4.3+, Python Pillow and numpy. All authored dimensions are meters, +Z forward/Y up.
"""
from pathlib import Path
import sys, os, math, random, json, hashlib, struct, subprocess, shutil
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/source'; ART=ROOT/'assets/art'
SOURCE.mkdir(parents=True,exist_ok=True); ART.mkdir(parents=True,exist_ok=True)
SEED=73129
TILES={'bark':0,'stone':1,'hay':2,'rubber':3,'wood':4,'olive':5,'red':6,'metal':7,'cloth':8,'vest':9,'skin':10,'glass':11,'soil':12,'grass':13,'gravel':14,'dark':15}

def synthesize():
 import numpy as np
 from PIL import Image, ImageDraw, ImageFilter
 rng=np.random.default_rng(SEED); n=512; y,x=np.mgrid[0:n,0:n]/n
 def noise(freq):
  a=rng.random((freq,freq)); gx=x*freq;gy=y*freq;ix=np.floor(gx).astype(int)%freq;iy=np.floor(gy).astype(int)%freq;fx=gx%1;fy=gy%1;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy)
  return a[iy,ix]*(1-fx)*(1-fy)+a[iy,(ix+1)%freq]*fx*(1-fy)+a[(iy+1)%freq,ix]*(1-fx)*fy+a[(iy+1)%freq,(ix+1)%freq]*fx*fy
 low=noise(7); mid=noise(33); fine=rng.random((n,n)); small=noise(100)
 atlas=np.zeros((n*4,n*4,3),dtype=np.uint8); norms=np.zeros_like(atlas); orm=np.zeros_like(atlas)
 palettes=[(83,69,49),(116,118,108),(167,141,77),(32,34,31),(113,80,45),(76,91,70),(143,56,40),(112,116,110),(80,89,67),(135,123,87),(171,131,102),(85,123,134),(95,79,57),(85,95,48),(137,130,111),(43,49,47)]
 for name,i in TILES.items():
  h=.30*low+.25*mid+.12*small+.04*fine
  if name=='bark':
   ridge=np.sin(x*math.pi*57+np.sin(y*24+x*9)*1.6+low*6); h=.5+.16*ridge+.08*mid+.07*small
   v=(ridge*.18+(low-.5)*.6+(small-.5)*.16); col=np.array(palettes[i])[None,None,:]*(1+v[:,:,None]); col[:,:,1]+=4*low
  elif name=='stone':
   seams=(np.abs(np.sin(x*19+y*13+low*5))<.05)*.2; h=.35*low+.2*mid+.12*small-seams
   col=np.array(palettes[i])[None,None,:]*(.60+h[:,:,None]); col+=(mid>.71)[:,:,None]*19
  elif name=='hay':
   straw=np.sin(y*math.pi*210+x*3+mid*2); h=.5+.11*straw+.12*mid
   col=np.array(palettes[i])[None,None,:]*(.86+.20*straw[:,:,None]+.24*low[:,:,None])
  elif name=='wood':
   grain=np.sin(y*125+np.sin(x*8)*3+low*5); h=.5+.05*grain+.06*small
   col=np.array(palettes[i])[None,None,:]*(.9+.17*grain[:,:,None]+.16*low[:,:,None])
  elif name in ['cloth','vest']:
   weave=(np.sin(x*n*math.pi)*np.sin(y*n*math.pi)); h=.5+.04*weave+.10*small
   col=np.array(palettes[i])[None,None,:]*(.8+.23*low[:,:,None]+.12*small[:,:,None])
  elif name in ['olive','red','metal','dark']:
   chip=(small>.70)&(mid>.6); h=.5+.015*small-chip*.08
   col=np.array(palettes[i])[None,None,:]*(.85+.26*low[:,:,None]+.07*fine[:,:,None]); col[chip]=[94,82,65]
  elif name=='rubber':
   h=.45+.09*small+.015*fine; col=np.array(palettes[i])[None,None,:]*(.7+.35*mid[:,:,None]+.12*fine[:,:,None])
  elif name=='grass':
   blades=np.sin(x*440+y*52+mid*8); h=.4+.1*blades+.22*mid
   col=np.array(palettes[i])[None,None,:]*(.58+.48*low[:,:,None]+.30*mid[:,:,None]+.14*blades[:,:,None]); col[:,:,1]+=small*15
  elif name=='gravel':
   h=.32*mid+.30*small+.12*fine; col=np.array(palettes[i])[None,None,:]*(.5+.75*h[:,:,None]); col+=(small>.65)[:,:,None]*23
  elif name=='soil':
   h=.3*mid+.3*small+.07*fine; col=np.array(palettes[i])[None,None,:]*(.6+.8*h[:,:,None]); col[:,:,0]+=low*7
  elif name=='skin':
   h=.5+.012*fine; col=np.array(palettes[i])[None,None,:]*(.91+.13*low[:,:,None]+.035*fine[:,:,None]); col[:,:,0]+=mid*5
  else:
   h=.5+.02*low; col=np.array(palettes[i])[None,None,:]*(.9+.15*low[:,:,None])
  gy,gx=np.gradient(h); strength=18 if name in ['bark','stone','hay','gravel','soil','grass'] else 8
  normal=np.dstack((-gx*strength,-gy*strength,np.ones_like(h))); normal/=np.linalg.norm(normal,axis=2)[:,:,None]
  rough=.8 if name in ['bark','hay','cloth','vest','soil','grass','gravel'] else .65
  if name in ['metal','dark']:rough=.37
  if name in ['olive','red']:rough=.56
  if name=='glass':rough=.14
  packed=np.dstack((np.ones_like(h),np.clip(rough+(mid-.5)*.12,0,1),np.ones_like(h)*(.8 if name in ['metal','dark'] else .18 if name in ['olive','red'] else 0)))
  yy=(i//4)*n;xx=(i%4)*n; atlas[yy:yy+n,xx:xx+n]=np.clip(col,0,255).astype('uint8');norms[yy:yy+n,xx:xx+n]=((normal*.5+.5)*255).astype('uint8');orm[yy:yy+n,xx:xx+n]=(packed*255).astype('uint8')
 for suffix,data in [('basecolor',atlas),('normal',norms),('orm',orm)]:Image.fromarray(data).save(SOURCE/f'surface-atlas-{suffix}.webp',quality=88,method=6)
 Image.fromarray(orm[:,:,1]).save(SOURCE/'surface-atlas-roughness.webp',quality=87,method=6)
 # Independent seamless repeatable terrain PBR maps, sampled from atlas recipes.
 for tile in ['grass','soil','gravel','stone','wood','metal']:
  i=TILES[tile]; yy=i//4*n; xx=i%4*n
  for suffix,data in [('basecolor',atlas),('normal',norms),('roughness',orm[:,:,1])]:
   cut=data[yy:yy+n,xx:xx+n];Image.fromarray(cut).save(SOURCE/f'terrain-{tile}-{suffix}.webp',quality=88,method=6)
 # Fine weathered asphalt shares the stone recipe, with low-amplitude aggregate.
 i=TILES['gravel'];yy=i//4*n;xx=i%4*n
 asphalt=(atlas[yy:yy+n,xx:xx+n].astype(float)*.37).astype('uint8')
 Image.fromarray(asphalt).save(SOURCE/'terrain-asphalt-basecolor.webp',quality=88,method=6)
 Image.fromarray(norms[yy:yy+n,xx:xx+n]).save(SOURCE/'terrain-asphalt-normal.webp',quality=88,method=6)
 Image.fromarray(np.clip(orm[yy:yy+n,xx:xx+n,1].astype(float)*.88,0,255).astype('uint8')).save(SOURCE/'terrain-asphalt-roughness.webp',quality=87,method=6)
 # Hand-built masonry course and chalky plaster for world architecture.
 for material_name in ['brick','plaster']:
  if material_name=='brick':
   row=np.floor(y*8).astype(int);colidx=np.floor((x+(row%2)*.125)*4).astype(int)
   horizontal=(y*8)%1;vertical=((x+(row%2)*.125)*4)%1
   mortar=(horizontal<.075)|(vertical<.035)
   br=.72+.16*np.sin(row*3.7+colidx*7.2)+.18*mid+.08*small
   color=np.dstack((153*br,87*br,57*br));color[mortar]=np.dstack((129+mid*20,123+mid*20,102+mid*20))[mortar]
   hh=.62+.07*small+.04*mid;hh[mortar]=.34+mid[mortar]*.05
  else:
   color=np.array((183,178,155))[None,None,:]*(.86+.13*low[:,:,None]+.09*mid[:,:,None]+.025*fine[:,:,None])
   chip=(small>.75)&(mid>.65);color[chip]*=.77;hh=.52+.025*small+.02*mid;hh[chip]-=.05
  gy,gx=np.gradient(hh);nn=np.dstack((-gx*13,-gy*13,np.ones_like(hh)));nn/=np.linalg.norm(nn,axis=2)[:,:,None]
  Image.fromarray(np.clip(color,0,255).astype('uint8')).save(SOURCE/f'terrain-{material_name}-basecolor.webp',quality=89,method=6)
  Image.fromarray(((nn*.5+.5)*255).astype('uint8')).save(SOURCE/f'terrain-{material_name}-normal.webp',quality=89,method=6)
  Image.fromarray(np.clip(207+mid*20,0,255).astype('uint8')).save(SOURCE/f'terrain-{material_name}-roughness.webp',quality=88,method=6)
 # A botanical card atlas: hand-authored branch structures, individual shaped leaves, light veins.
 im=Image.new('RGBA',(1024,1024));d=ImageDraw.Draw(im);random.seed(SEED)
 for variant in range(4):
  ox=(variant%2)*512;oy=(variant//2)*512
  branch=(ox+256,oy+487,ox+249,oy+42)
  d.line(branch,fill=(93,84,43,255),width=8)
  for row in range(10):
   cy=oy+465-row*39; span=165*(1-row/15);cx=ox+253+random.uniform(-10,10)
   for side in [-1,1]:
    ex=cx+side*span;ey=cy-40-random.uniform(8,28)
    d.line((cx,cy,ex,ey),fill=(96,96,41,255),width=3)
    for j in range(5):
     t=(j+1)/5;lx=cx+(ex-cx)*t;ly=cy+(ey-cy)*t
     for sign in [-1,1]:
      length=random.uniform(31,46);angle=side*.7+sign*.78
      dx=math.sin(angle)*length;dy=-math.cos(angle)*length
      px=-dy*.35;py=dx*.35
      pts=[]
      for direction,ts in [(1,[0,.15,.3,.5,.7,.85,1]),(-1,[1,.85,.7,.5,.3,.15,0])]:
       for t in ts:
        bulge=math.sin(t*math.pi)**.8*.77*direction;pts.append((lx+dx*t+px*bulge,ly+dy*t+py*bulge))
      c=random.choice([(77,105,39,255),(94,123,48,255),(110,134,52,255),(60,88,34,255),(127,143,57,255)])
      d.polygon(pts,fill=c); d.line((lx,ly,lx+dx,ly+dy),fill=(137,152,69,245),width=1)
 im.save(SOURCE/'foliage-basecolor.webp',quality=91,method=6)
 # Inspectable source provenance.
 (SOURCE/'PROVENANCE.json').write_text(json.dumps({'creator':'Original LAST CIRCLE procedural art','seed':SEED,'externalSources':[],'pipeline':'Pillow/numpy texture synthesis and custom Blender meshes','license':'Original project assets; no third party dependencies or source media'},indent=2)+'\n')

def package_art():
 """Patch stable foliage alpha semantics and create content-addressed runtime artifacts."""
 def read_glb(path):
  data=path.read_bytes();length,kind=struct.unpack_from('<II',data,12)
  return json.loads(data[20:20+length]),data[20+length:]
 def write_glb(path,doc,remainder):
  data=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();data+=b' '*((-len(data))%4)
  path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(data)+len(remainder))+struct.pack('<II',len(data),0x4e4f534a)+data+remainder)
 for name in ['world-kit','character','weapons']:
  path=SOURCE/(name+'.glb');doc,remainder=read_glb(path)
  for material in doc.get('materials',[]):
   if 'botanical' in material.get('name',''):
    material['alphaMode']='MASK';material['alphaCutoff']=.47;material['doubleSided']=True
  write_glb(path,doc,remainder)
 for p in ART.iterdir():
  if p.is_file():p.unlink()
 assets=[]
 def add(id,source,kind):
  data=source.read_bytes();sha=hashlib.sha256(data).hexdigest();suffix=source.suffix;out=ART/(sha+suffix);out.write_bytes(data)
  assets.append({'id':id,'path':'assets/art/'+out.name,'mime':'model/gltf-binary' if suffix=='.glb' else 'image/webp','sha256':sha,'size':len(data),'kind':kind})
 for name in ['world-kit','character','weapons']+(['hands'] if (SOURCE/'hands.glb').exists() else []):add(name,SOURCE/(name+'.glb'),'model')
 for name in ['surface-atlas-basecolor','surface-atlas-normal','surface-atlas-orm','surface-atlas-roughness','foliage-basecolor']:
  add(name,SOURCE/(name+'.webp'),'texture')
 for tile in ['grass','soil','gravel','stone','wood','metal','asphalt','brick','plaster']:
  for suffix in ['basecolor','normal','roughness']:
   name='terrain-'+tile+'-'+suffix;add(name,SOURCE/(name+'.webp'),'texture')
 layout={}
 if (SOURCE/'tree-impostor-layout.json').exists():
  from PIL import Image
  layout=json.loads((SOURCE/'tree-impostor-layout.json').read_text())
  for tree_name in layout:
   image=Image.open(SOURCE/(tree_name+'-impostor.png')).convert('RGBA').resize((256,512),Image.Resampling.LANCZOS)
   image.save(SOURCE/(tree_name+'-impostor.webp'),quality=91,method=6)
   add(tree_name+'-impostor',SOURCE/(tree_name+'-impostor.webp'),'texture')
 bounds=json.loads((SOURCE/'model-bounds.json').read_text())
 if (SOURCE/'hands-bounds.json').exists():bounds.update(json.loads((SOURCE/'hands-bounds.json').read_text()))
 models={}
 worlds=['tree_broadleaf','tree_metasequoia','boulder','hay_stack','tractor','plow','wheelbarrow','grain_pallet']
 for name in worlds:models[name]={'assetId':'world-kit','node':name,'bounds':bounds[name]}
 for id in ['m416','akm','ump45','kar98k','s12k','aug','vector','awm','mini14','m249','p10','groza','mk14','summit-300']:
  name='weapon_'+id;doc,_=read_glb(SOURCE/'weapons.glb');node=next(n for n in doc['nodes'] if n.get('name')==name)
  models[name]={'assetId':'weapons','node':name,'magazineNode':'mag_'+id,'muzzleNode':'muzzle_'+id,'opticNode':'optic_'+id,'opticalHeight':node.get('extras',{}).get('opticalHeight'),'bounds':bounds[name]}
 models['survivor']={'assetId':'character','node':'survivor','rigNode':'SurvivorRig','weaponSocket':'weapon_socket','rightHandBone':'hand_r','bounds':bounds['survivor'],'animations':['idle','walk','run','crouch_idle','crouch_walk','prone_idle','prone_crawl','jump','throw','aim','reload']}
 models['first_person_arms']={'assetId':'weapons','node':'first_person_arms','bounds':bounds['first_person_arms'],'animation':'static receiver-space arms; inherit weapon sway/recoil, rotate whole node for reload'}
 for hand_name in ['hand_right','hand_left','forearm_right','forearm_left']:
  if hand_name in bounds:models[hand_name]={'assetId':'hands','node':hand_name,'origin':'wrist','forward':'+Z palm / -Z sleeve','up':'+Y knuckles','bounds':bounds[hand_name]}
 materials={'surfaceAtlas':{'baseColor':'surface-atlas-basecolor','normal':'surface-atlas-normal','roughness':'surface-atlas-roughness','orm':'surface-atlas-orm','tiles':TILES,'grid':[4,4]},'foliage':{'baseColor':'foliage-basecolor','alphaMode':'MASK','alphaCutoff':.47,'doubleSided':True,'depthWrite':True,'roughness':.86}}
 for name,tile in [('meadow','grass'),('dirt','soil'),('gravel','gravel'),('rock','stone'),('wood','wood'),('weatheredMetal','metal'),('asphalt','asphalt'),('brick','brick'),('plaster','plaster')]:
  materials[name]={'baseColor':'terrain-'+tile+'-basecolor','normal':'terrain-'+tile+'-normal','roughness':'terrain-'+tile+'-roughness','tileMeters':3 if tile in ['grass','soil','gravel','stone','asphalt'] else 1,'resolution':[512,512],'metalness':.8 if tile=='metal' else 0}
 impostors={}
 for tree_name,spec in layout.items():
  impostors[tree_name]={'assetId':tree_name+'-impostor',**spec}
  materials[tree_name]={'baseColor':tree_name+'-impostor','alphaMode':'MASK',**spec}
 manifest={'impostors':impostors,'revision':'0.13.0','coordinateSystem':{'units':'meters','up':'+Y','forward':'+Z','origin':'ground for world props; feet for survivor; receiver for firearms'},'assets':assets,'models':models,'materials':materials,'provenance':{'externalSources':[],'originalSource':'assets/source/last-circle-original-art.blend','generator':'scripts/create-art-assets.py'}}
 (ROOT/'assets/art-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 assert sum(a['size'] for a in assets)<15*1024*1024
 assert max(a['size'] for a in assets)<8*1024*1024
 doc,_=read_glb(SOURCE/'character.glb');assert len(doc['skins'])==1 and len(doc['animations'])==11
 doc,_=read_glb(SOURCE/'world-kit.glb');assert len(doc['scenes'][0]['nodes'])==8
 doc,_=read_glb(SOURCE/'weapons.glb');assert len(doc['scenes'][0]['nodes'])==15
 for a in assets:assert hashlib.sha256((ROOT/a['path']).read_bytes()).hexdigest()==a['sha256']
 for stale in ['last-circle-original-art.blend1','first-person-arms.glb']:
  (SOURCE/stale).unlink(missing_ok=True)
 print('ART_MANIFEST_COMPLETE',len(assets),'assets;',sum(a['size'] for a in assets),'runtime bytes')

if '--blender' not in sys.argv:
 synthesize()
 subprocess.run(['/usr/bin/blender','--background','--factory-startup','--python',str(Path(__file__).resolve()),'--','--blender'],check=True)
 package_art()
 sys.exit(0)

import bpy
from mathutils import Vector, Quaternion
random.seed(SEED)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# Author in game coordinates and convert to Blender: X right, Y up, +Z forward.
def V(p):return Vector((p[0],-p[2],p[1]))
def B(p):return Vector((p[0],p[2],-p[1]))

def image_node(nodes,path,space='sRGB'):
 n=nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(SOURCE/path),check_existing=True);n.image.colorspace_settings.name=space;return n
mat=bpy.data.materials.new('LC • weathered surface atlas');mat.use_nodes=True
n=mat.node_tree.nodes;l=mat.node_tree.links;p=n.get('Principled BSDF')
a=image_node(n,'surface-atlas-basecolor.webp');l.new(a.outputs['Color'],p.inputs['Base Color'])
r=image_node(n,'surface-atlas-orm.webp','Non-Color');sep=n.new('ShaderNodeSeparateColor');l.new(r.outputs['Color'],sep.inputs['Color']);l.new(sep.outputs['Green'],p.inputs['Roughness']);l.new(sep.outputs['Blue'],p.inputs['Metallic'])
nm=image_node(n,'surface-atlas-normal.webp','Non-Color');normal=n.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.72;l.new(nm.outputs['Color'],normal.inputs['Color']);l.new(normal.outputs['Normal'],p.inputs['Normal'])
leaf=bpy.data.materials.new('LC • botanical broadleaf cards');leaf.use_nodes=True;leaf.surface_render_method='DITHERED';leaf.use_backface_culling=False
n=leaf.node_tree.nodes;l=leaf.node_tree.links;p=n.get('Principled BSDF');a=image_node(n,'foliage-basecolor.webp');l.new(a.outputs['Color'],p.inputs['Base Color']);l.new(a.outputs['Alpha'],p.inputs['Alpha']);p.inputs['Roughness'].default_value=.86
# Alpha clipping is stable in glTF and avoids transparent sort artifacts.
leaf['alphaMode']='MASK';leaf.alpha_threshold=.47
solid={}
def flat(name,color,rough=.7,metal=0):
 if name in solid:return solid[name]
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;solid[name]=m;return m
black=flat('LC • seam and aperture',(.025,.031,.027));eye=flat('LC • eye ivory',(.52,.48,.37));iris=flat('LC • iris',(.08,.10,.068));rust=flat('LC • oxidized seams',(.20,.12,.055));teal=flat('LC • instrument glass',(.11,.25,.23),.15,.25)

def uv_tile(obj,tile='metal',scale=1):
 if not obj.data.uv_layers:obj.data.uv_layers.new(name='UVMap')
 idx=TILES[tile];tx=idx%4;ty=idx//4
 for loop in obj.data.uv_layers.active.data:
  u,v=loop.uv; u=u if 0<=u<=1 else u%1; v=v if 0<=v<=1 else v%1; loop.uv=((tx+.015+.97*u)/4,1-(ty+.015+.97*(1-v))/4)

def mesh(name,verts,faces,tile='metal',material=None,uvs=None,parent=None,smooth=False):
 me=bpy.data.meshes.new(name);me.from_pydata([V(v) for v in verts],[],faces);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);ob.data.materials.append(material or mat)
 uv=me.uv_layers.new(name='UVMap')
 for poly in me.polygons:
  poly.use_smooth=smooth
  for li in poly.loop_indices:
   vi=me.loops[li].vertex_index
   if uvs: uv.data[li].uv=uvs[vi]
   else:
    pt=verts[vi];uv.data[li].uv=((pt[0]*.7)%1,(pt[1]*.7+pt[2]*.17)%1)
 if material is None:uv_tile(ob,tile)
 ob.parent=parent
 return ob

def root(name):
 ob=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(ob);return ob

def box(name,pos,size,tile='metal',parent=None,bevel=.02,material=None,rot=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=V(pos));ob=bpy.context.object;ob.name=name;ob.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 ob.data.materials.append(material or mat)
 if rot:ob.rotation_euler=(rot[0],-rot[2],rot[1])
 if bevel:
  mod=ob.modifiers.new('soft machined edges','BEVEL');mod.width=min(bevel,min(size)*.35);mod.segments=2;bpy.context.view_layer.objects.active=ob;bpy.ops.object.modifier_apply(modifier=mod.name)
  for f in ob.data.polygons:f.use_smooth=True
  mod=ob.modifiers.new('weighted corner normals','WEIGHTED_NORMAL');mod.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=mod.name)
 # UV cube project creates texture direction independent of object placement.
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.cube_project(cube_size=1);bpy.ops.object.mode_set(mode='OBJECT')
 if material is None:uv_tile(ob,tile)
 ob.parent=parent;return ob

def tube(name,a,b,r1,r2=None,tile='metal',parent=None,sides=12,material=None,rings=1):
 a=Vector(a);b=Vector(b);axis=(b-a).normalized();ref=Vector((1,0,0)) if abs(axis.x)<.9 else Vector((0,0,1));u=axis.cross(ref).normalized();v=axis.cross(u).normalized();verts=[];uv=[]
 r2=r1 if r2 is None else r2
 for j in range(rings+1):
  t=j/rings;c=a.lerp(b,t);rad=r1*(1-t)+r2*t
  for i in range(sides):
   an=i*math.tau/sides;verts.append(c+rad*(u*math.cos(an)+v*math.sin(an)));uv.append((i/sides,t))
 faces=[]
 for j in range(rings):
  for i in range(sides):faces.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
 faces.extend([tuple(range(sides-1,-1,-1)),tuple(rings*sides+i for i in range(sides))])
 return mesh(name,verts,faces,tile,material,uv,parent,True)

def ellipsoid(name,pos,size,tile='cloth',parent=None,material=None,segments=16,rings=10):
 verts=[];uv=[]
 for j in range(rings+1):
  lat=math.pi*j/rings
  for i in range(segments+1):
   an=math.tau*i/segments;verts.append((pos[0]+size[0]*math.sin(lat)*math.cos(an),pos[1]+size[1]*math.cos(lat),pos[2]+size[2]*math.sin(lat)*math.sin(an)));uv.append((i/segments,j/rings))
 faces=[]
 for j in range(rings):
  for i in range(segments):a=j*(segments+1)+i;faces.append((a,a+1,a+segments+2,a+segments+1))
 return mesh(name,verts,faces,tile,material,uv,parent,True)

def ring(name,pos,radius,thick,axis='x',tile='rubber',parent=None,major=32,minor=10):
 verts=[];uv=[]
 for j in range(major):
  a=math.tau*j/major
  for i in range(minor):
   b=math.tau*i/minor;q=radius+thick*math.cos(b);x=thick*math.sin(b)
   p=(pos[0]+x,pos[1]+q*math.cos(a),pos[2]+q*math.sin(a)) if axis=='x' else (pos[0]+q*math.cos(a),pos[1]+q*math.sin(a),pos[2]+x)
   verts.append(p);uv.append((j/major,i/minor))
 faces=[]
 for j in range(major):
  for i in range(minor):faces.append((j*minor+i,j*minor+(i+1)%minor,((j+1)%major)*minor+(i+1)%minor,((j+1)%major)*minor+i))
 return mesh(name,verts,faces,tile,None,uv,parent,True)

def join_children(rt,keep=[]):
 children=[o for o in rt.children_recursive if o.type=='MESH' and o.name not in keep and not any(p.name in keep for p in [o.parent] if p)]
 # Joining all children preserves material slots/UVs but keep attachment children separate.
 if not children:return
 bpy.ops.object.select_all(action='DESELECT')
 for o in children:o.select_set(True)
 bpy.context.view_layer.objects.active=children[0];bpy.ops.object.join();children[0].name=rt.name+'_mesh';children[0].parent=rt

def export(name,objects,anim=False):
 bpy.ops.object.select_all(action='DESELECT')
 selected=set()
 for rt in objects:
  for ob in [rt,*rt.children_recursive]:ob.select_set(True);selected.add(ob)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.export_scene.gltf(filepath=str(SOURCE/(name+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_apply=False,export_image_format='WEBP',export_image_quality=87,export_animations=anim,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_nla_strips=False,export_skins=True,export_morph=False,export_extras=True,export_cameras=False,export_lights=False)

# Independently animated viewmodel gloves, with wrist-local origins.
def build_hands_bank():
 hand_roots=[]
 for side,sign in [('right',1),('left',-1)]:
  rt=root('hand_'+side);hand_roots.append(rt)
  rt['origin']='wrist';rt['forward']='+Z palm';rt['up']='+Y knuckles';rt['purpose']='independent pistol grip or utility throw hand'
  # Anatomical palm, short wrist cuff, fabric palm pad and raised knuckle guards.
  tube('glove wrist cuff',(0,0,-.015),(0,0,.030),.034,.037,'dark',rt,sides=18,rings=2)
  ellipsoid('shaped glove palm',(0,0,.069),(.047,.030,.055),'dark',rt,segments=18,rings=12)
  ellipsoid('palm reinforcement',(0,-.025,.067),(.038,.008,.042),'rubber',rt,segments=16,rings=8)
  box('flexible dorsal glove panel',(0,.029,.072),(.071,.009,.060),'cloth',rt,bevel=.009)
  for j in range(4):
   x=(j-1.5)*.0215;length=[.046,.057,.054,.042][j if side=='right' else 3-j]
   z=.106;ellipsoid('individual padded knuckle',(x,.025,z),(.012,.010,.015),'vest',rt,segments=10,rings=8)
   a=(x,.008,z);b=(x,.002,z+length*.51);c=(x,-.025,z+length*.86);d=(x,-.047,z+length*.60)
   tube('glove proximal finger',a,b,.0105,.010,'dark',rt,sides=10,rings=2)
   ellipsoid('glove middle finger joint',b,(.0102,.0102,.011),'dark',rt,segments=10,rings=8)
   tube('glove curled middle finger',b,c,.010,.009,'dark',rt,sides=10)
   tube('glove fingertip',c,d,.009,.008,'dark',rt,sides=10)
   # Finger crease seam follows the outside of each curled finger.
   tube('finger crease seam',(x-.007,-.015,z+length*.70),(x+.007,-.015,z+length*.70),.0014,tile='vest',parent=rt,sides=5)
  thumb=[(-sign*.036,-.004,.034),(-sign*.057,-.008,.065),(-sign*.061,-.024,.092),(-sign*.043,-.041,.110)]
  for j in range(3):tube('opposed articulated glove thumb',thumb[j],thumb[j+1],.015-j*.002,.013-j*.002,'dark',rt,sides=12,rings=2)
  box('wrist adjustment strap',(0,.032,.004),(.065,.009,.024),'vest',rt,bevel=.004)
  box('wrist strap clasp',(sign*.024,.038,.004),(.018,.007,.019),'dark',rt,bevel=.003)
  join_children(rt)
  armrt=root('forearm_'+side);hand_roots.append(armrt)
  armrt['origin']='wrist';armrt['forward']='+Z into palm';armrt['sleeveDirection']='-Z from wrist toward elbow'
  tube('tailored forearm sleeve',(0,0,-.32),(0,0,-.025),.066,.039,'cloth',armrt,sides=20,rings=7)
  tube('ribbed wrist cuff',(0,0,-.055),(0,0,0),.042,.036,'dark',armrt,sides=18,rings=3)
  # Fold bands are individual soft ridges along the lower sleeve.
  for j in range(4):
   z=-.072-j*.046;ring('sleeve fabric fold',(0,0,z),.039+j*.004,.004,'z','cloth',armrt,24,6)
  box('lower sleeve seam',(sign*.041,0,-.14),(.003,.013,.17),'vest',armrt,bevel=.002)
  join_children(armrt)
 export('hands',hand_roots)
 hand_bounds={}
 for rt in hand_roots:
  vs=[B(ob.matrix_world @ Vector(corner)) for ob in rt.children_recursive if ob.type=='MESH' for corner in ob.bound_box]
  lo=[min(v[i] for v in vs) for i in range(3)];hi=[max(v[i] for v in vs) for i in range(3)]
  hand_bounds[rt.name]={'min':[round(v,4) for v in lo],'max':[round(v,4) for v in hi],'width':round(hi[0]-lo[0],4),'height':round(hi[1]-lo[1],4),'length':round(hi[2]-lo[2],4)}
 (SOURCE/'hands-bounds.json').write_text(json.dumps(hand_bounds,indent=2)+'\n')
 return hand_roots

# WORLD KIT ------------------------------------------------------------------
world=[]
def world_root(name):
 rt=root(name);world.append(rt);return rt

def branch(name,points,radius,rt,tile='bark'):
 for i in range(len(points)-1):tube(name,points[i],points[i+1],radius*(1-i/len(points)),radius*(1-(i+1)/len(points)),tile,rt,10)

def leaf_card(rt,center,width,height,yaw,tilt,variant=0):
 # Slightly folded card with botanical branch silhouette and real leaf alpha.
 verts=[];uv=[];u0=(variant%2)*.5;v0=(variant//2)*.5
 for x,y,z,u,v in [(-.5,0,0,0,0),(0,0,.08,.5,0),(.5,0,0,1,0),(-.5,1,0,0,1),(0,1,.08,.5,1),(.5,1,0,1,1)]:
  x*=width;y=(y-.5)*height;z*=width
  yy=y*math.cos(tilt)-z*math.sin(tilt);zz=y*math.sin(tilt)+z*math.cos(tilt)
  xx=x*math.cos(yaw)+zz*math.sin(yaw);zz=-x*math.sin(yaw)+zz*math.cos(yaw)
  verts.append((center[0]+xx,center[1]+yy,center[2]+zz));uv.append((u0+u*.5,v0+v*.5))
 return mesh('leaf_sprig',verts,[(0,1,4,3),(1,2,5,4)],material=leaf,uvs=uv,parent=rt)

def make_tree(meta=False):
 rt=world_root('tree_metasequoia' if meta else 'tree_broadleaf');height=38 if meta else 12;radius=.825 if meta else .40
 # Tapered imperfect trunk with radial buttress roots and bent centerline.
 points=[(0,0,0),(.07,height*.12,.03),(-.08,height*.32,.06),(.12,height*.57,-.08),(.05,height*.80,.05),(0,height,0)]
 for i in range(len(points)-1):tube('trunk',points[i],points[i+1],radius*(1-i/5)**1.15+.03,radius*(1-(i+1)/5)**1.15+.025,'bark',rt,16, rings=3)
 for i in range(8):
  an=i*math.tau/8;branch('buttress root',[(math.cos(an)*radius*2.3,.04,math.sin(an)*radius*2.3),(math.cos(an)*radius*.9,.30,math.sin(an)*radius*.9),(0,1.5,0)],radius*.27,rt)
 if meta:
  # Metasequoia tiered crown, visibly distinct tall 38m conifer.
  for tier in range(15):
   y=6+tier*2.0;span=(1-(y/height))**.7*6.4
   for i in range(7):
    an=i*math.tau/7+tier*.72;end=(math.cos(an)*span,y+.3,math.sin(an)*span)
    branch('lateral branch',[(0,y,0),(end[0]*.55,y-.3,end[2]*.55),end],max(.055,.17*(1-y/height)),rt)
    for j in range(4):
     t=.35+j*.19;c=(end[0]*t,y+.3*t,end[2]*t)
     leaf_card(rt,c,span*.82,2.7,an+math.pi/2,math.pi*.31,random.randrange(4))
     leaf_card(rt,(c[0],c[1]+.5,c[2]),span*.67,2.5,an,math.pi*.34,random.randrange(4))
 else:
  for i in range(12):
   an=i*2.399;sy=3.0+(i%4)*.83;span=2.3+(i%3)*.72;end=(math.cos(an)*span,7.0+(i%4)*.85,math.sin(an)*span)
   branch('main bough',[(0,sy,0),(end[0]*.52,sy+1.9,end[2]*.52),end],.18,rt)
   for j in range(3):
    an2=an+(j-1)*.65;cx=end[0]+math.cos(an2)*.65;cz=end[2]+math.sin(an2)*.65;cy=end[1]+.65
    branch('twig',[(end[0]*.8,end[1]-.3,end[2]*.8),(cx,cy,cz)],.045,rt)
    for k in range(7):
     a=k*2.399;rad=math.sqrt(random.random())*1.35;center=(cx+math.cos(a)*rad,cy+random.uniform(-.5,1),cz+math.sin(a)*rad)
     leaf_card(rt,center,2.3,2.3,random.uniform(0,math.tau),random.uniform(-1,1),random.randrange(4))
 join_children(rt);rt['heightMeters']=height;return rt
make_tree(False);make_tree(True)

rt=world_root('boulder')
ob=ellipsoid('weathered granite',(0,1.30,0),(2.12,1.65,1.78),'stone',rt,segments=24,rings=14)
for v in ob.data.vertices:
 p=B(v.co);a=math.atan2(p.z,p.x);fac=1+.09*math.sin(a*5+p.y*2)+.07*math.sin(a*9-p.y*3);p.x*=fac;p.z*=fac;p.y=max(.02,p.y+.12*math.sin(p.x*3+p.z*4));v.co=V(p)
# split darker mineral veins and small stone flakes within the mesh texture.
join_children(rt)
rt=world_root('hay_stack')
for row in range(2):
 for col in range(2):
  ob=box('compressed straw bale',((col-.5)*1.19,.5+row*.96,0),(1.17,.94,1.67),'hay',rt,.10)
  for z in [-.48,.48]:
   tube('baling cord',((col-.5)*1.19-.54,.05+row*.96,z),((col-.5)*1.19-.54,.93+row*.96,z),.012,tile='dark',parent=rt,sides=6)
   box('baling cord',((col-.5)*1.19,.96+row*.96,z),(1.14,.018,.018),'dark',rt,0)
  for k in range(25):
   x=(col-.5)*1.19+random.uniform(-.55,.55); y=row*.96+random.uniform(.06,.95);z=random.choice([-.84,.84]);tube('loose straw',(x,y,z),(x+random.uniform(-.15,.15),y+random.uniform(-.1,.1),z+random.uniform(-.04,.04)),.005,tile='hay',parent=rt,sides=3)
join_children(rt)

# Mechanically recognizable aged farm tractor: tread blocks, wheel hardware, cab, engine and hydraulics.
rt=world_root('tractor')
box('chassis',(0,.68,0),(1.10,.24,3.10),'dark',rt,.07)
box('engine cowling',(0,1.21,.64),(1.03,.78,1.56),'red',rt,.11)
box('top hood',(0,1.62,.64),(.88,.12,1.48),'red',rt,.06)
box('front grille',(0,1.18,1.45),(.88,.59,.05),'dark',rt,.04)
for i in range(12):box('grille slat',((i-5.5)*.063,1.18,1.49),(.022,.52,.016),'metal',rt,.007)
for side in [-1,1]:
 for front in [False,True]:
  rr=.66 if front else .91;z=1.03 if front else -1.07;x=side*(.78 if front else .87);cy=rr+.02;thick=.15 if front else .23
  ring('agricultural tire',(x,cy,z),rr-thick,thick,'x','rubber',rt,36,12)
  tube('wheel dish',(x-side*.12,cy,z),(x+side*.14,cy,z),rr*.52,tile='red',parent=rt,sides=24)
  tube('wheel hub',(x+side*.15,cy,z),(x+side*.22,cy,z),rr*.19,tile='metal',parent=rt,sides=16)
  for j in range(8):
   a=j*math.tau/8;tube('lug bolt',(x+side*.16,cy+math.cos(a)*rr*.29,z+math.sin(a)*rr*.29),(x+side*.19,cy+math.cos(a)*rr*.29,z+math.sin(a)*rr*.29),.027,tile='metal',parent=rt,sides=6)
  for j in range(24):
   a=j*math.tau/24
   for lane in [-1,1]:
    ob=box('chevron tire tread',(x+lane*thick*.50,cy+math.cos(a)*(rr-.025),z+math.sin(a)*(rr-.025)),(thick*1.08,.085,.21),'rubber',rt,.025);ob.rotation_euler.x=a;ob.rotation_euler.z=lane*.45
 # curved top rear fenders with metal support bars.
 for a in range(7):
  ang=math.radians(30+a*20);box('rear fender',(side*.87,.93+math.sin(ang)*.98,-1.07+math.cos(ang)*.98),(.53,.055,.36),'red',rt,.03,rot=(-ang+math.pi/2,0,0))
 tube('front axle',(-.85,.57,1.03),(.85,.57,1.03),.10,tile='dark',parent=rt,sides=12)
 box('step',(side*.70,.58,-.4),(.45,.08,.58),'metal',rt,.025)
 for k in range(3):box('step grip',(side*.72,.63,-.59+k*.14),(.40,.016,.028),'dark',rt,.004)
 box('cab pillar',(side*.62,1.85,-.58),(.065,1.90,.065),'metal',rt,.02,rot=(.07,0,0))
 box('cab rear pillar',(side*.62,1.88,-1.57),(.065,1.84,.065),'metal',rt,.02)
 box('cab side window',(side*.615,2.01,-1.07),(.018,.83,.90),'glass',rt,.01)
 # hinged doors, handles, side mirrors.
 tube('door handle',(side*.66,1.77,-.62),(side*.66,1.77,-.84),.018,tile='metal',parent=rt,sides=6)
 tube('mirror arm',(side*.60,2.40,-.57),(side*.90,2.43,-.45),.022,tile='dark',parent=rt,sides=6)
 box('side mirror',(side*.91,2.41,-.43),(.12,.25,.055),'metal',rt,.025)
 box('front headlight',(side*.40,1.42,1.51),(.19,.18,.07),'glass',rt,.04)
box('cab roof',(0,2.79,-1.05),(1.50,.13,1.41),'red',rt,.065)
box('front windshield',(0,2.03,-.55),(1.15,1.15,.028),'glass',rt,.01,rot=(.07,0,0))
box('rear windshield',(0,2.09,-1.59),(1.16,1.10,.025),'glass',rt,.01)
box('seat cushion',(0,1.32,-1.05),(.54,.15,.57),'rubber',rt,.07)
box('seat back',(0,1.62,-1.30),(.53,.56,.14),'rubber',rt,.08,rot=(-.15,0,0))
tube('steering column',(0,1.00,-.28),(0,1.70,-.49),.048,tile='dark',parent=rt)
ring('steering wheel',(0,1.73,-.50),.20,.018,'z','dark',rt,24,6)
tube('exhaust stack',(.40,1.47,.38),(.40,2.50,.38),.066,tile='dark',parent=rt,sides=12)
tube('exhaust angled tip',(.40,2.50,.38),(.40,2.56,.56),.066,tile='metal',parent=rt,sides=12)
box('front bumper',(0,.66,1.72),(1.35,.21,.25),'metal',rt,.045)
for side in [-1,1]:tube('rear hydraulic link',(side*.35,.7,-1.45),(side*.5,.45,-2.0),.045,tile='metal',parent=rt)
box('rear hitch',(0,.42,-1.96),(.7,.10,.15),'metal',rt,.025)
join_children(rt)

rt=world_root('plow')
for side in [-1,1]:tube('tow triangle',(0,.60,1.20),(side*.82,.55,-.65),.07,tile='olive',parent=rt,sides=8)
box('plow beam',(0,.55,-.65),(2.20,.15,.18),'olive',rt,.025)
for i in range(4):
 x=(i-1.5)*.57;tube('shank',(x,.57,-.55),(x,.21,-.87),.055,tile='metal',parent=rt,sides=8)
 # Curved moldboard built from a rolled sheet.
 verts=[];faces=[]
 for j in range(7):
  t=j/6;verts.extend([(x-.25,.06+t*.43,-1.0+math.sin(t*1.7)*.45),(x+.25,.06+t*.43,-1.04+math.sin(t*1.7)*.45)])
 for j in range(6):faces.append((j*2,j*2+1,j*2+3,j*2+2))
 mesh('rolled moldboard',verts,faces,'metal',parent=rt,smooth=True)
join_children(rt)

rt=world_root('wheelbarrow')
# Tapered deep metal tray with rounded rim and inner surface.
verts=[(-.29,.75,.45),(.29,.75,.45),(.29,.75,-.40),(-.29,.75,-.40),(-.50,1.02,.63),(.50,1.02,.63),(.50,1.02,-.60),(-.50,1.02,-.60)]
mesh('pressed tray',verts,[(0,1,2,3),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],'olive',parent=rt)
for a,b in [(4,5),(5,6),(6,7),(7,4)]:tube('rolled lip',verts[a],verts[b],.025,tile='olive',parent=rt,sides=8)
for side in [-1,1]:
 tube('handle frame',(side*.35,.37,.56),(side*.45,.83,-1.2),.035,tile='metal',parent=rt,sides=8)
 tube('handle grip',(side*.45,.83,-1.20),(side*.47,.85,-1.52),.045,tile='rubber',parent=rt,sides=8)
 tube('leg',(side*.37,.70,-.37),(side*.40,.04,-.44),.030,tile='metal',parent=rt,sides=8)
ring('front wheel',(0,.30,.77),.22,.075,'x','rubber',rt,24,8);tube('wheel hub',(-.12,.30,.77),(.12,.30,.77),.11,tile='red',parent=rt,sides=16)
join_children(rt)

rt=world_root('grain_pallet')
for i in range(5):box('pallet plank',((i-2)*.27,.20,0),(.23,.06,1.06),'wood',rt,.008)
for x in [-.45,0,.45]:box('pallet runner',(x,.08,0),(.13,.15,1.04),'wood',rt,.008)
for row in range(2):
 for i in range(3):
  x=(i-1)*.40;z=(row-.5)*.49;ob=ellipsoid('filled jute sack',(x,.44,z),(.23,.25,.32),'vest',rt,segments=16,rings=10)
  tube('stitched sack seam',(x-.19,.57,z-.22),(x+.19,.57,z-.22),.010,tile='hay',parent=rt,sides=5)
  box('printed grain label',(x,.67,z),(.12,.005,.14),'cloth',rt,.002)
ellipsoid('top grain sack',(0,.85,0),(.40,.23,.27),'vest',rt,segments=18,rings=10)
join_children(rt)
export('world-kit',world)

# SURVIVOR: skinned human with clothing construction and a visible modeled face.
survivor=root('survivor'); parts=[]
def part(ob,bone):
 vg=ob.vertex_groups.new(name=bone);vg.add(list(range(len(ob.data.vertices))),1,'REPLACE');parts.append(ob);return ob

def human_box(name,pos,size,tile,bone,**kw):return part(box(name,pos,size,tile,survivor,**kw),bone)
def human_ell(name,pos,size,tile,bone,**kw):return part(ellipsoid(name,pos,size,tile,survivor,**kw),bone)
def human_tube(name,a,b,r1,r2,tile,bone,**kw):return part(tube(name,a,b,r1,r2,tile,survivor,**kw),bone)

# Shaped torso garment, widening to shoulder line then tapering into collar.
def torso():
 levels=[(.91,.145,.105),(1.02,.175,.12),(1.17,.205,.13),(1.34,.235,.135),(1.42,.245,.12),(1.46,.15,.095)]
 verts=[];uv=[];N=20
 for j,(y,rx,rz) in enumerate(levels):
  for i in range(N):
   a=i*math.tau/N;verts.append((math.cos(a)*rx,y,math.sin(a)*rz));uv.append((i/N,j/(len(levels)-1)))
 faces=[]
 for j in range(len(levels)-1):
  for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
 ob=mesh('field jacket tailored torso',verts,faces,'cloth',uvs=uv,parent=survivor,smooth=True)
 for bone in ['hips','spine','chest']:ob.vertex_groups.new(name=bone)
 for i,(x,y,z) in enumerate(verts):
  if y<1.06:weights={'hips':1}
  elif y<1.30:
   t=(y-1.06)/.24;weights={'spine':1-t,'chest':t}
  else:weights={'chest':1}
  for b,w in weights.items():ob.vertex_groups[b].add([i],w,'REPLACE')
 parts.append(ob)
torso()
human_ell('neck',(0,1.49,0),(.072,.095,.070),'skin','neck',segments=16,rings=10)
human_ell('head anatomy',(0,1.635,.012),(.105,.143,.100),'skin','head',segments=24,rings=18)
# jaw/chin, cheek planes, nose bridge/tip and eye sockets give a human face silhouette.
human_ell('jaw',(0,1.57,.034),(.080,.064,.077),'skin','head',segments=18,rings=10)
human_ell('chin',(0,1.546,.082),(.041,.025,.028),'skin','head',segments=12,rings=8)
for s in [-1,1]:
 human_ell('cheek',(s*.060,1.62,.078),(.034,.032,.027),'skin','head',segments=12,rings=8)
 human_ell('ear',(s*.108,1.635,.008),(.020,.040,.022),'skin','head',segments=12,rings=8)
 human_ell('inner ear',(s*.120,1.635,.014),(.006,.022,.011),'skin','head',material=rust,segments=10,rings=8)
 human_ell('eye',(s*.041,1.653,.098),(.022,.010,.008),'skin','head',material=eye,segments=12,rings=8)
 human_ell('iris',(s*.041,1.653,.105),(.007,.008,.003),'skin','head',material=iris,segments=10,rings=8)
 human_ell('brow ridge',(s*.043,1.675,.091),(.034,.009,.015),'skin','head',segments=12,rings=8)
 human_tube('eyebrow',(s*.019,1.678,.104),(s*.067,1.678,.097),.004,.002,'dark','head',sides=6)
 human_ell('nose wing',(s*.012,1.627,.117),(.012,.010,.014),'skin','head',segments=10,rings=8)
human_ell('nose bridge',(0,1.647,.108),(.012,.036,.022),'skin','head',segments=12,rings=10)
human_ell('nose tip',(0,1.630,.129),(.017,.013,.015),'skin','head',segments=12,rings=10)
human_tube('upper lip',(-.029,1.590,.105),(.029,1.590,.105),.004,.004,'skin','head',material=rust,sides=8)
human_ell('lower lip',(0,1.583,.105),(.026,.006,.006),'skin','head',segments=12,rings=8)
# Close-cropped hair and a fabric patrol cap, leaving modeled face visible.
human_ell('short hair',(0,1.716,-.015),(.107,.065,.091),'dark','head',segments=20,rings=10)
human_ell('patrol cap',(0,1.736,.006),(.116,.043,.112),'cloth','head',segments=20,rings=10)
human_box('cap visor',(0,1.724,.110),(.18,.012,.112),'cloth','head',bevel=.012,rot=(-.12,0,0))
human_box('cap seam',(0,1.760,.025),(.008,.006,.17),'vest','head',bevel=.002)
# Vest panels, webbing and magazine pouches are actual meshes.
human_box('plate carrier front',(0,1.265,.135),(.348,.365,.055),'vest','chest',bevel=.045)
human_box('plate carrier back',(0,1.280,-.138),(.34,.36,.070),'vest','chest',bevel=.035)
for s in [-1,1]:
 human_box('shoulder webbing',(s*.14,1.446,0),(.059,.034,.26),'vest','chest',bevel=.010)
 human_box('vest buckle',(s*.14,1.418,.13),(.062,.055,.020),'dark','chest',bevel=.009)
 for k in range(3):human_box('MOLLE horizontal seam',(s*.085,1.37-k*.055,.169),(.14,.012,.012),'cloth','chest',bevel=.003)
 human_box('front utility pouch',(s*.092,1.16,.185),(.138,.17,.079),'vest','spine',bevel=.020)
 human_box('pouch flap',(s*.092,1.228,.228),(.136,.049,.012),'vest','spine',bevel=.007)
 human_box('pouch clasp',(s*.092,1.213,.237),(.026,.037,.015),'dark','spine',bevel=.004)
human_box('belt',(0,.98,0),(.365,.055,.26),'dark','hips',bevel=.025)
human_box('belt buckle',(0,.980,.137),(.065,.046,.013),'metal','hips',bevel=.004)

bone_spec={
 'root':((0,0,0),(0,.15,0),None),
 'hips':((0,.90,0),(0,1.03,0),'root'),
 'spine':((0,1.03,0),(0,1.27,0),'hips'),
 'chest':((0,1.27,0),(0,1.44,0),'spine'),
 'neck':((0,1.44,0),(0,1.53,0),'chest'),
 'head':((0,1.53,0),(0,1.78,0),'neck')}
for side,s in [('l',-1),('r',1)]:
 hip=(s*.112,.91,0);knee=(s*.118,.51,.025);ankle=(s*.118,.15,-.005)
 bone_spec['thigh_'+side]=(hip,knee,'hips');bone_spec['shin_'+side]=(knee,ankle,'thigh_'+side);bone_spec['foot_'+side]=(ankle,(s*.118,.08,.17),'shin_'+side)
 human_tube('trouser thigh',hip,knee,.105,.082,'cloth','thigh_'+side,sides=18,rings=4)
 human_tube('trouser calf',knee,ankle,.083,.061,'cloth','shin_'+side,sides=18,rings=4)
 human_ell('knee fabric',(s*.118,.51,.030),(.086,.092,.085),'cloth','shin_'+side,segments=16,rings=10)
 human_box('knee pad',(s*.118,.51,.105),(.12,.145,.038),'dark','shin_'+side,bevel=.025,rot=(.05,0,0))
 human_box('cargo pocket',(s*.210,.71,.015),(.038,.17,.17),'cloth','thigh_'+side,bevel=.020)
 human_box('cargo pocket flap',(s*.232,.775,.019),(.012,.045,.17),'vest','thigh_'+side,bevel=.006)
 human_ell('boot ankle',(s*.118,.151,-.003),(.069,.13,.073),'rubber','foot_'+side,segments=16,rings=10)
 human_box('boot toe',(s*.118,.077,.083),(.146,.145,.29),'rubber','foot_'+side,bevel=.041)
 human_box('boot sole',(s*.118,.027,.073),(.152,.044,.31),'dark','foot_'+side,bevel=.012)
 for j in range(5):
  human_tube('boot lace',(s*.118-.046,.16-j*.018,.055+j*.011),(s*.118+.046,.16-j*.018,.055+j*.011),.003,.003,'vest','foot_'+side,sides=4)
 # Hold-rifle neutral pose with bent elbows, articulated glove fingers.
 shoulder=(s*.245,1.405,.0);elbow=(s*.355,1.16,.17);wrist=((-.17 if s<0 else .080),1.255 if s<0 else 1.220,.48 if s<0 else .42)
 hand=(wrist[0],wrist[1],wrist[2]+.10)
 bone_spec['shoulder_'+side]=((s*.12,1.42,0),shoulder,'chest')
 bone_spec['upperarm_'+side]=(shoulder,elbow,'shoulder_'+side)
 bone_spec['forearm_'+side]=(elbow,wrist,'upperarm_'+side)
 bone_spec['hand_'+side]=(wrist,hand,'forearm_'+side)
 human_tube('upper jacket sleeve',shoulder,elbow,.090,.073,'cloth','upperarm_'+side,sides=16,rings=4)
 human_ell('elbow sleeve',elbow,(.075,.078,.073),'cloth','forearm_'+side,segments=14,rings=10)
 human_tube('lower jacket sleeve',elbow,wrist,.074,.051,'cloth','forearm_'+side,sides=16,rings=4)
 human_tube('wrist cuff',Vector(wrist).lerp(Vector(elbow),.12),wrist,.057,.055,'dark','forearm_'+side,sides=14)
 human_ell('gloved palm',(wrist[0],wrist[1]-.005,wrist[2]+.055),(.048,.034,.067),'dark','hand_'+side,segments=14,rings=10)
 human_box('glove knuckle armor',(wrist[0],wrist[1]+.030,wrist[2]+.057),(.074,.012,.065),'vest','hand_'+side,bevel=.009)
 for j in range(4):
  fx=wrist[0]+(j-1.5)*.021
  human_tube('glove finger',(fx,wrist[1]-.003,wrist[2]+.085),(fx,wrist[1]-.031,wrist[2]+.129),.011,.009,'dark','hand_'+side,sides=8)
  human_tube('finger curled tip',(fx,wrist[1]-.031,wrist[2]+.129),(fx,wrist[1]-.059,wrist[2]+.105),.009,.008,'dark','hand_'+side,sides=8)
 human_tube('glove thumb',(wrist[0]-s*.04,wrist[1],wrist[2]+.02),(wrist[0]-s*.063,wrist[1]-.03,wrist[2]+.077),.016,.011,'dark','hand_'+side,sides=8)
 # Jacket elbow patch and forearm seams.
 human_ell('elbow reinforcement',(elbow[0],elbow[1]-.015,elbow[2]-.043),(.067,.067,.033),'vest','forearm_'+side,segments=12,rings=8)

# Combine skinned garment/face pieces; joining preserves each bone vertex group.
bpy.ops.object.select_all(action='DESELECT')
for ob in parts:ob.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=parts[0];body.name='survivor_skinned_mesh'
armdata=bpy.data.armatures.new('Survivor skeleton');arm=bpy.data.objects.new('SurvivorRig',armdata);bpy.context.collection.objects.link(arm);arm.parent=survivor
bpy.context.view_layer.objects.active=arm;bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for name,(head,tail,parent) in bone_spec.items():
 b=armdata.edit_bones.new(name);b.head=V(head);b.tail=V(tail)
 if parent:b.parent=armdata.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
mod=body.modifiers.new('Survivor skin','ARMATURE');mod.object=arm;body.parent=arm
socket=root('weapon_socket');socket.parent=arm;socket.parent_type='BONE';socket.parent_bone='hand_r';bpy.context.view_layer.update();socket.matrix_world=__import__('mathutils').Matrix.Translation(V((.080,1.395,.56)))
socket['forward']='+Z glTF in neutral gun hold';socket['gripOrigin']='receiver origin; optical axis above socket per weapon opticalHeight'
# First-person parts are also available as a static standalone root, with grip at origin.
fp=root('first_person_arms')
for s,side in [(-1,'l'),(1,'r')]:
 # Receiver-space grip positions: right on pistol grip, left under the handguard.
 wx,wy,wz=(0,-.175,-.14) if side=='r' else (-.045,-.11,.19)
 elbow=(s*.29,-.34,-.30);wrist=(wx,wy,wz)
 tube('view sleeve',elbow,wrist,.079,.052,'cloth',fp,sides=18,rings=4)
 ellipsoid('view glove',(wx,wy-.005,wz+.055),(.050,.036,.068),'dark',fp,segments=16,rings=10)
 box('view knuckle panel',(wx,wy+.031,wz+.057),(.073,.012,.065),'vest',fp,.009)
 for j in range(4):
  x=wx+(j-1.5)*.021;tube('view glove finger',(x,wy,wz+.088),(x,wy-.03,wz+.13),.011,.009,'dark',fp,sides=8);tube('view finger tip',(x,wy-.03,wz+.13),(x,wy-.055,wz+.10),.009,.008,'dark',fp,sides=8)
 tube('view glove thumb',(wx-s*.04,wy,wz+.02),(wx-s*.06,wy-.03,wz+.08),.016,.011,'dark',fp,sides=8)
join_children(fp)

bpy.context.scene.render.fps=24
from mathutils import Euler
def pose_rotation(name,angles):
 pb=arm.pose.bones[name];pb.rotation_mode='QUATERNION';rest=pb.bone.matrix_local.to_quaternion()
 # Convert requested game-axis rotation to the bone's local coordinate frame.
 q=Quaternion(V((1,0,0)),angles[0]) @ Quaternion(V((0,1,0)),angles[1]) @ Quaternion(V((0,0,1)),angles[2]);pb.rotation_quaternion=rest.inverted()@q@rest

def pose_translate(name,delta,add=False):
 pb=arm.pose.bones[name]; value=pb.bone.matrix_local.to_quaternion().inverted() @ V(delta)
 if add:pb.location+=value
 else:pb.location=value

def clip(name,length,stance='stand',motion=None):
 action=bpy.data.actions.new(name);arm.animation_data_create();arm.animation_data.action=action
 frames=list(range(1,length+1, max(2,length//8)))
 if length not in frames:frames.append(length)
 for frame in frames:
  t=(frame-1)/(length-1);wave=math.sin(t*math.tau);opp=-wave;cycle=math.cos(t*math.tau)
  for pb in arm.pose.bones:pb.location=(0,0,0);pb.rotation_mode='QUATERNION';pb.rotation_quaternion=(1,0,0,0)
  if stance=='crouch':
   pose_translate('hips',(0,-.44,.08));pose_rotation('thigh_l',(-1.25,0,0));pose_rotation('thigh_r',(-1.25,0,0));pose_rotation('shin_l',(2.29,0,0));pose_rotation('shin_r',(2.29,0,0));pose_rotation('foot_l',(-1.04,0,0));pose_rotation('foot_r',(-1.04,0,0));pose_rotation('spine',(.50,0,0));pose_rotation('chest',(.25,0,0));pose_rotation('neck',(-.45,0,0));pose_rotation('upperarm_l',(-.75,0,0));pose_rotation('upperarm_r',(-.75,0,0))
  if stance=='prone':
   pose_rotation('root',(math.pi/2,0,0));pose_translate('root',(0,.29,-.80));pose_rotation('neck',(-math.pi/2,0,0));pose_rotation('upperarm_l',(-math.pi/2,0,.08));pose_rotation('upperarm_r',(-math.pi/2,0,-.08))
  if motion in ['walk','run','crouch_walk','prone_crawl']:
   amount={'walk':.48,'run':.82,'crouch_walk':.29,'prone_crawl':.20}[motion]
   base=-1.25 if stance=='crouch' else 0
   for side,phase in [('l',wave),('r',opp)]:
    pose_rotation('thigh_'+side,(base+phase*amount,0,0));pose_rotation('shin_'+side,((2.29 if stance=='crouch' else 0)+max(0,-phase)*amount*1.3,0,0));pose_rotation('foot_'+side,((-1.04 if stance=='crouch' else 0)-phase*amount*.25,0,0))
   pose_translate('hips',(0,abs(wave)*(.035 if motion!='run' else .075),0),True)
   pose_rotation('chest',((.25 if stance=='crouch' else .15 if motion=='run' else .05),wave*.035,0))
  if motion=='jump':
   rise=math.sin(t*math.pi);pose_translate('root',(0,rise*.40,0));pose_rotation('thigh_l',(-.40*rise,0,0));pose_rotation('thigh_r',(-.32*rise,0,0));pose_rotation('shin_l',(.70*rise,0,0));pose_rotation('shin_r',(.55*rise,0,0))
  if motion=='throw':
   phase=math.sin(t*math.pi);pose_rotation('upperarm_r',(-1.6*phase,0,-.30*phase));pose_rotation('forearm_r',(-.8*phase,0,0));pose_rotation('chest',(0,-.25*phase,0))
  if motion=='reload':
   phase=math.sin(t*math.pi);pose_rotation('upperarm_l',(.20*phase,-.20*phase,.40*phase));pose_rotation('forearm_l',(.65*phase,0,-.20*phase));pose_rotation('hand_l',(0,0,-.45*phase));pose_rotation('chest',(.04*phase,0,0))
  if motion is None or motion=='aim':
   pose_translate('chest',(0,cycle*.0035,0));pose_rotation('neck',(-.45 if stance=='crouch' else -math.pi/2 if stance=='prone' else 0,wave*.015,0))
  for pb in arm.pose.bones:
   pb.keyframe_insert(data_path='location',frame=frame,group=pb.name);pb.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=pb.name)
 action.use_fake_user=True
 for fc in action.fcurves:
  for point in fc.keyframe_points:point.interpolation='LINEAR'
 return action
for name,length,stance,motion in [('idle',49,'stand',None),('walk',25,'stand','walk'),('run',19,'stand','run'),('crouch_idle',49,'crouch',None),('crouch_walk',29,'crouch','crouch_walk'),('prone_idle',49,'prone',None),('prone_crawl',33,'prone','prone_crawl'),('jump',33,'stand','jump'),('throw',25,'stand','throw'),('aim',49,'stand','aim'),('reload',49,'stand','reload')]:clip(name,length,stance,motion)
arm.animation_data.action=bpy.data.actions.get('idle');bpy.context.scene.frame_set(1)
export('character',[survivor],True)

# FIREARM BANK: original meshes based on each weapon's mechanical silhouette.
weapons=[]
W=[('m416',1.02,'ar','dot',.14,.17,.50,'rail',9),('akm',1.12,'ar','iron',.13,.15,.54,'wood',0),('ump45',.76,'smg','holo',.125,.16,.32,'skeleton',0),('kar98k',1.38,'bolt','scope',.10,.12,.54,'wood',0),('s12k',1.03,'shotgun','shotgun',.16,.19,.53,'skeleton',0),('aug',.92,'bullpup','dot',.19,.19,.58,None,0),('vector',.68,'smg','holo',.14,.18,.28,'rail',5),('awm',1.48,'bolt','scope',.13,.16,.61,'thumbhole',0),('mini14',1.22,'dmr','scope',.10,.12,.57,'wood',0),('m249',1.32,'lmg','iron',.21,.23,.57,'skeleton',0),('p10',.35,'pistol','iron',.10,.115,.19,None,0),('groza',.91,'bullpup','dot',.17,.22,.51,None,0),('mk14',1.25,'dmr','scope',.15,.17,.58,'precision',8),('summit-300',1.50,'bolt','scope',.145,.15,.64,'precision',12)]
def profile_mesh(name,width,profile,tile,rt,bevel=.008):
 verts=[(s*width/2,y,z) for s in [-1,1] for y,z in profile];N=len(profile);faces=[tuple(range(N-1,-1,-1)),tuple(range(N,N*2))]
 for j in range(N):faces.append((j,(j+1)%N,(j+1)%N+N,j+N))
 ob=mesh(name,verts,faces,tile,parent=rt)
 if bevel:
  bpy.context.view_layer.objects.active=ob;mod=ob.modifiers.new('receiver machined bevel','BEVEL');mod.width=bevel;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name);mod=ob.modifiers.new('weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
 return ob
for id,L,family,sight,width,height,bodylen,stock,rails in W:
 rt=root('weapon_'+id);weapons.append(rt);pistol=family=='pistol';bull=family=='bullpup';bolt=family=='bolt';lmg=family=='lmg';wood=id in ['akm','kar98k','mini14'];skin='wood' if wood else 'olive' if id in ['aug','awm','groza','m249','summit-300'] else 'dark'
 optical=.245 if sight in ['dot','holo'] else .18 if sight=='scope' else .088 if pistol else .13
 rt['opticalHeight']=optical;rt['weaponId']=id;rt['forward']='+Z';rt['units']='meters'
 offset=-.08 if bull else 0
 profile_mesh('forged upper receiver',width,[(-height*.44,-bodylen*.5+offset),(height*.42,-bodylen*.5+offset),(height*.58,bodylen*.28+offset),(height*.33,bodylen*.50+offset),(-height*.35,bodylen*.50+offset),(-height*.56,bodylen*.10+offset)],skin,rt)
 # Round barrel, stepped chamber collar, muzzle flash hider and black bore.
 end=L*.60;barrelStart=.06 if pistol else bodylen*.24
 tube('cold hammer forged barrel',(0,.03,barrelStart),(0,.03,end),.017 if pistol else .025,tile='metal',parent=rt,sides=20)
 tube('barrel locking collar',(0,.03,barrelStart),(0,.03,barrelStart+.08),.032 if pistol else .043,tile='dark',parent=rt,sides=16)
 tube('muzzle brake',(0,.03,end-.055),(0,.03,end+.015),.025 if pistol else .038,tile='dark',parent=rt,sides=20)
 tube('recessed barrel bore',(0,.03,end+.015),(0,.03,end+.016),.014 if pistol else .021,tile='dark',parent=rt,sides=20,material=black)
 if not pistol:
  for j in range(3):
   for s in [-1,1]:box('muzzle brake slot',(s*.038,.03,end-.04+j*.018),(.005,.025,.009),'dark',rt,.002,material=black)
 # Pistol grip with palm swell and stippled panels.
 gripZ=-.045 if pistol else -.09
 profile_mesh('pistol grip',.074,[(-.07,gripZ-.05),(-.27,gripZ-.085),(-.29,gripZ+.035),(-.10,gripZ+.055)],'rubber',rt)
 for s in [-1,1]:
  box('grip stipple insert',(s*.039,-.185,gripZ-.006),(.006,.13,.065),'dark',rt,.004,rot=(.12,0,0))
 # A curved trigger and guard built from real round sections, no flat symbol.
 for a,b in [((-.042,-.08,gripZ+.04),(-.042,-.15,gripZ+.08)),((-.042,-.15,gripZ+.08),(-.042,-.15,gripZ+.19)),((-.042,-.15,gripZ+.19),(-.042,-.07,gripZ+.20))]:tube('trigger guard',a,b,.008,tile='dark',parent=rt,sides=8)
 tube('curved trigger',(0,-.065,gripZ+.12),(0,-.115,gripZ+.10),.008,tile='metal',parent=rt,sides=8)
 # Visible controls, takedown pins, bolt catch and recessed ejection port.
 box('ejection port',(width*.505,.026,offset-.015),(.007,.041,.13),'dark',rt,.006,material=black)
 box('bolt visible through port',(width*.512,.027,offset-.026),(.009,.022,.065),'metal',rt,.004)
 box('selector lever',(-width*.52,-.025,-bodylen*.24+offset),(.015,.016,.060),'metal',rt,.005,rot=(.35,0,0))
 for s in [-1,1]:
  for z in [-bodylen*.33+offset,bodylen*.23+offset]:tube('receiver pin',(s*width*.49,-.025,z),(s*(width*.49+.006),-.025,z),.009,tile='metal',parent=rt,sides=8)
 # Physical removable magazine remains a named child for reload visibility.
 magrt=root('mag_'+id);magrt.parent=rt;mz=-.22 if bull else -.045 if pistol else .10
 if id in ['akm','groza']:
  for j in range(5):
   zz=mz-j*j*.005;ob=box('curved steel magazine',(0,-.135-j*.047,zz),(.075,.060,.133),'dark',magrt,.009,rot=(-j*.13,0,0))
  for s in [-1,1]:
   for k in [-.034,.012,.046]:tube('magazine stamped rib',(s*.039,-.17,mz+k),(s*.039,-.32,mz-.06+k),.004,tile='metal',parent=magrt,sides=5)
 else:
  ms=(.25,.25,.26) if lmg else (.055,.11,.085) if pistol else (.13,.22,.22) if id=='s12k' else (.078,.095 if bolt else .26,.13)
  box('magazine body',(0,-.19 if not pistol else -.24,mz),ms,'vest' if lmg else 'dark',magrt,.012,rot=(-.08 if not bolt else 0,0,0))
  box('magazine baseplate',(0,(-.19 if not pistol else -.24)-ms[1]*.51,mz), (ms[0]+.012,.025,ms[2]+.012),'rubber',magrt,.006)
  if not lmg:
   for s in [-1,1]:
    for z in [-.035,.025]:box('magazine witness rib',(s*(ms[0]*.5+.002),-.19,mz+z),(.005,ms[1]*.74,.008),'metal',magrt,.002)
 # Stock architecture and buttpad distinguish every weapon family.
 if stock in ['rail','skeleton']:
  for s in [-1,1]:tube('stock support',(s*.045,.035,-bodylen*.30),(s*.045,.025,-L*.48),.016,tile='metal',parent=rt,sides=10)
  profile_mesh('adjustable buttstock',.125,[(.09,-L*.40),(.04,-L*.55),(-.14,-L*.55),(-.13,-L*.46),(-.015,-L*.38)],skin,rt)
  box('rubber recoil pad',(0,-.035,-L*.557),(.135,.225,.025),'rubber',rt,.012)
  if id=='ump45':tube('folding stock diagonal',(-.042,-.10,-L*.48),(-.042,.03,-L*.28),.020,tile='dark',parent=rt,sides=10)
 elif stock=='wood':
  profile_mesh('shaped walnut stock',.137,[(.035,-bodylen*.28),(.025,-L*.42),(.07,-L*.54),(-.13,-L*.55),(-.13,-L*.44),(-.06,-bodylen*.21)],'wood',rt,.012)
  box('stock buttplate',(0,-.04,-L*.55),(.14,.20,.025),'dark',rt,.012)
  profile_mesh('walnut forearm',.11,[(-.07,.01),(.025,.03),(.025,L*.37),(-.04,L*.41)],'wood',rt,.012)
 elif stock in ['precision','thumbhole']:
  box('adjustable cheek rest',(0,.072,-L*.34),(.145,.074,.28),'olive',rt,.020)
  tube('stock spine',(0,.014,-bodylen*.32),(0,.014,-L*.52),.034,tile='metal',parent=rt,sides=12)
  box('precision recoil pad',(0,-.033,-L*.53),(.15,.255,.055),'rubber',rt,.015)
  box('lower stock strut',(0,-.11,-L*.37),(.09,.045,.31),'olive',rt,.012)
  for s in [-1,1]:tube('stock adjustment screw',(s*.065,-.04,-L*.42),(s*.086,-.04,-L*.42),.016,tile='metal',parent=rt,sides=10)
 elif bull:
  profile_mesh('bullpup rear body',width,[(.08,-L*.18),(.06,-L*.50),(-.15,-L*.51),(-.18,-L*.26),(-.05,-L*.12)],skin,rt,.018)
  box('bullpup shoulder pad',(0,-.05,-L*.52),(width+.015,.235,.04),'rubber',rt,.012)
 # Handguards have an octagonal section, inset vents, segmented rail and a round gas block.
 if not pistol:
  hgStart=.11;hgEnd=min(L*.40,.47);hgw=.125 if id not in ['m249','s12k'] else .17
  if not wood:profile_mesh('ventilated handguard',hgw,[(-.056,hgStart),(.065,hgStart),(.065,hgEnd),(-.048,hgEnd)],skin,rt,.012)
  for s in [-1,1]:
   for j in range(5):
    z=hgStart+.025+j*(hgEnd-hgStart-.05)/4;box('handguard cooling vent',(s*(hgw*.5+.002),.023,z),(.006,.025,.032),'dark',rt,.005,material=black)
  railCount=rails or (7 if not wood else 0)
  for j in range(railCount):box('Picatinny rail lug',(0,height*.5+.022,-.08+j*.035),(.12,.022,.017),'dark',rt,.004)
  tube('gas tube',(0,.078,hgStart),(0,.078,L*.47),.014,tile='metal',parent=rt,sides=10)
 # Model-specific mechanical features.
 if id=='m416':box('vertical foregrip',(0,-.18,.28),(.062,.22,.075),'rubber',rt,.025,rot=(.08,0,0))
 if id=='vector':
  profile_mesh('Vector delayed blowback housing',.17,[(-.04,-.03),(-.33,-.02),(-.31,.18),(-.02,.22)],'olive',rt,.015)
  box('Vector forward hand stop',(0,-.22,.24),(.07,.16,.065),'rubber',rt,.014)
 if id=='aug':
  profile_mesh('AUG enclosed trigger guard',.065,[(-.06,-.02),(-.26,-.04),(-.26,.20),(-.18,.23)],'olive',rt,.012)
  box('AUG folding foregrip',(0,-.18,.27),(.058,.19,.065),'olive',rt,.015,rot=(.18,0,0))
 if id=='groza':
  tube('Groza integrated foregrip',(0,-.055,.29),(0,-.20,.31),.035,tile='dark',parent=rt,sides=12)
  tube('Groza carry rail',(0,.14,-.25),(0,.14,.18),.027,tile='dark',parent=rt,sides=8)
 if id=='s12k':tube('shotgun gas regulator',(0,.105,.26),(0,.105,.48),.026,tile='dark',parent=rt,sides=14)
 if bolt:
  tube('bolt cylinder',(0,.050,-.22),(0,.050,.10),.030,tile='metal',parent=rt,sides=16)
  tube('bolt handle',(.025,.050,-.12),(.14,-.015,-.12),.013,tile='metal',parent=rt,sides=10)
  ellipsoid('bolt knob',(.14,-.017,-.12),(.024,.024,.024),'dark',rt,segments=12,rings=8)
 if lmg:
  box('feed cover',(0,.14,.02),(.19,.08,.43),'dark',rt,.015)
  tube('carry handle',(0,.17,.06),(0,.27,.06),.019,tile='metal',parent=rt,sides=10)
  tube('carry handle grip',(0,.27,.06),(0,.27,.28),.024,tile='rubber',parent=rt,sides=12)
  box('side ammunition bag',(-.18,-.12,.03),(.20,.25,.26),'vest',rt,.025)
 if pistol:
  box('P10 slide',(0,.027,.028),(.102,.078,.255),'metal',rt,.010)
  for s in [-1,1]:
   for j in range(7):box('slide serration',(s*.053,.030,-.07+j*.010),(.005,.055,.004),'dark',rt,.001)
 # Optics preserve the existing exact optical line and leave apertures clear for ADS.
 if sight=='scope':
  radius=.055 if family=='dmr' else .0725;sl=.32 if family=='dmr' else .48
  tube('scope body',(0,optical,-sl*.5),(0,optical,sl*.5),radius*.59,tile='dark',parent=rt,sides=24)
  for z in [-sl*.46,sl*.46]:
   tube('scope objective housing',(0,optical,z-.035),(0,optical,z+.035),radius,tile='dark',parent=rt,sides=24)
   tube('scope lens',(0,optical,z+(.036 if z>0 else -.036)),(0,optical,z+(.037 if z>0 else -.037)),radius*.87,tile='glass',parent=rt,sides=24)
  for z in [-.09,.09]:
   box('scope mount',(0,.115,z),(.09,.085,.035),'dark',rt,.007)
   ring('scope clamp',(0,optical,z),radius*.63,.009,'z','metal',rt,24,6)
  tube('elevation turret',(0,optical+.02,0),(0,optical+.09,0),.032,tile='dark',parent=rt,sides=16)
  tube('windage turret',(.015,optical,0),(.073,optical,0),.027,tile='dark',parent=rt,sides=16)
 elif sight=='dot':
  box('optic rail clamp',(0,.128,-.025),(.09,.065,.10),'dark',rt,.008)
  ring('reflex sight rim',(0,optical,-.025),.064,.011,'z','dark',rt,32,8)
  tube('reflex protective wing left',(-.069,.16,-.025),(-.069,.24,-.025),.008,tile='dark',parent=rt,sides=8)
  tube('reflex protective wing right',(.069,.16,-.025),(.069,.24,-.025),.008,tile='dark',parent=rt,sides=8)
  # No opaque disc in sight aperture: runtime reticle aligns to optical line.
 elif sight=='holo':
  box('holographic sight base',(0,.14,-.025),(.13,.06,.11),'dark',rt,.012)
  for s in [-1,1]:box('holo hood side',(s*.083,optical,-.025),(.018,.158,.072),'dark',rt,.009)
  box('holo hood top',(0,optical+.075,-.025),(.18,.019,.072),'dark',rt,.009)
  box('holo hood bottom',(0,optical-.075,-.025),(.18,.019,.072),'dark',rt,.009)
 else:
  for s in [-1,1]:box('rear sight notch',(s*(.028 if pistol else .041),optical-.014,-.08),(.012,.040,.028),'dark',rt,.004)
  box('front sight post',(0,optical-.020,L*.43),(.014,.040,.025),'metal',rt,.003)
 if id in ['awm','mk14','summit-300','m249']:
  for s in [-1,1]:tube('folded bipod',(s*.065,-.06,.40),(s*.10,-.12,.64),.014,tile='metal',parent=rt,sides=10)
 # Useful stable attachment nodes for client animation and muzzle effects.
 for name,pos in [('muzzle_'+id,(0,.03,end+.02)),('optic_'+id,(0,optical,0))]:
  socket=root(name);socket.parent=rt;socket.location=V(pos)
 join_children(magrt);join_children(rt,keep=[magrt.name])
export('weapons',weapons+[fp])
hands=build_hands_bank()

# Save compact editable authoring scene: no render or external input is necessary.
for authored_image in bpy.data.images:
 if authored_image.source=='FILE':authored_image.filepath='//'+Path(authored_image.filepath).name
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'last-circle-original-art.blend'),compress=True)
# Bounds are computed in authored world space after all bevels and joins.
bounds={}
for rt in world+weapons+[survivor,fp]+hands:
 vs=[B(ob.matrix_world @ Vector(corner)) for ob in rt.children_recursive if ob.type=='MESH' for corner in ob.bound_box]
 if vs:
  lo=[min(v[i] for v in vs) for i in range(3)];hi=[max(v[i] for v in vs) for i in range(3)]
  bounds[rt.name]={'min':[round(v,4) for v in lo],'max':[round(v,4) for v in hi],'width':round(hi[0]-lo[0],4),'height':round(hi[1]-lo[1],4),'length':round(hi[2]-lo[2],4)}
(SOURCE/'model-bounds.json').write_text(json.dumps(bounds,indent=2)+'\n')

def render_tree_impostors():
 """Bake a radial LOD card from each actual source tree, preserving physical aspect in metadata."""
 saved_visibility={ob:ob.hide_render for ob in bpy.data.objects}
 for ob in bpy.data.objects:ob.hide_render=True
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=False;scene.render.film_transparent=True
 scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.resolution_percentage=100
 scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.78,.86,1,1);bg.inputs['Strength'].default_value=.65
 bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.hide_render=False;sun.data.energy=2.0;sun.data.angle=.28;sun.rotation_euler=(.35,-.45,-.4)
 bpy.ops.object.camera_add();cam=bpy.context.object;cam.hide_render=False;cam.data.type='ORTHO';scene.camera=cam
 layout={}
 for name in ['tree_broadleaf','tree_metasequoia']:
  rt=bpy.data.objects[name];rt.hide_render=False
  for ob in rt.children_recursive:ob.hide_render=False
  spec=bounds[name];lo=spec['min'];hi=spec['max'];pw=spec['width']*1.08;ph=spec['height']*1.08;cx=(lo[0]+hi[0])*.5;cy=(lo[1]+hi[1])*.5
  cam.location=V((cx,cy,100));cam.rotation_euler=(V((cx,cy,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=ph
  scene.render.resolution_x=max(128,round(512*pw/ph));scene.render.resolution_y=512
  scene.render.filepath=str(SOURCE/(name+'-impostor.png'));bpy.ops.render.render(write_still=True)
  layout[name]={'planeWidth':round(pw,4),'planeHeight':round(ph,4),'center':[round(cx,4),round(cy,4),0],'anchor':[.5,round((ph*.5-cy)/ph,6)],'alphaCutoff':.40,'doubleSided':True,'depthWrite':True,'resolution':[256,512]}
  rt.hide_render=True
  for ob in rt.children_recursive:ob.hide_render=True
 (SOURCE/'tree-impostor-layout.json').write_text(json.dumps(layout,indent=2)+'\n')
 bpy.data.objects.remove(sun,do_unlink=True);bpy.data.objects.remove(cam,do_unlink=True)
 for ob,hidden in saved_visibility.items():ob.hide_render=hidden

render_tree_impostors()

print('ART_EXPORT_COMPLETE',len(world),'world models;',len(weapons),'weapons;',len(bpy.data.actions),'actions')
