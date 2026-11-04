#!/usr/bin/env python3
"""Original LAST CIRCLE 0.14 botanical trees: 5 species × 3 irregular variants.
Writes ONLY trees-v014* source artifacts and a standalone manifest patch. No production manifest edits.
Run: python scripts/create-trees-v014.py (Pillow/numpy, Blender4.3+).
"""
from pathlib import Path
import math,random,json,hashlib,struct,sys,subprocess,io
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/source';PREFIX='trees-v014'
SPECIES=['oak','birch','pine','maple','metasequoia']
PROFILES={
 'oak':[(13,.70,5.4,4,(.6,.2)),(11.8,.77,5.9,5,(-1.25,.7)),(15.0,.64,4.7,3,(1.5,-.5))],
 'birch':[(19,.38,3.8,12,(.65,.3)),(16.5,.42,4.2,10,(-1.3,.75)),(21,.35,3.4,13,(1.6,-.6))],
 'pine':[(22,.52,5.3,12,(.65,.3)),(18.5,.59,6.0,11,(-1.7,.8)),(25,.48,4.5,13,(1.1,-.6))],
 'maple':[(13.2,.60,4.4,4,(.45,.3)),(11.8,.68,4.9,5,(-1.0,.7)),(15,.55,4.0,3,(1.35,-.45))],
 'metasequoia':[(38,1.65,6.8,31,(.65,.35)),(35,1.80,7.3,34,(-.8,.6)),(40,1.50,6.0,29,(1.0,-.45))]}

def synthesize():
 from PIL import Image,ImageDraw
 import numpy as np
 random.seed(14163);S=512;atlas=Image.new('RGBA',(2048,2048))
 palettes={'oak':(86,119,44),'birch':(123,151,61),'pine':(57,100,62),'maple':(103,134,48),'metasequoia':(90,139,61)}
 def leaf(draw,root,length,width,angle,species,color):
  cx,cy=root;ca=math.cos(angle);sa=math.sin(angle)
  def transform(x,y):return(cx+x*ca-y*sa,cy+x*sa+y*ca)
  if species=='maple':
   pp=[(0,0),(-.14,-.12),(-.48,-.02),(-.34,-.26),(-.70,-.34),(-.44,-.42),(-.66,-.68),(-.28,-.63),(-.30,-.94),(-.12,-.78),(0,-1.12),(.13,-.79),(.33,-.95),(.30,-.64),(.66,-.72),(.44,-.43),(.70,-.35),(.35,-.27),(.49,-.04),(.14,-.13)]
   points=[transform(x*width,y*length/1.12) for x,y in pp]
  else:
   points=[]
   for sign,ts in [(1,range(35)),(-1,range(34,-1,-1))]:
    for j in ts:
     t=j/34;base=math.sin(math.pi*t)**(.72 if species=='oak' else .92)
     if species=='oak':base*=.71+.29*math.cos(t*math.pi*7-.8)
     if species=='birch':base*=.91+.09*math.sin(t*math.pi*28)
     points.append(transform(sign*width*.5*base,-length*t))
  dark=tuple(max(0,int(c*.70)) for c in color)+(255,);draw.polygon(points,fill=dark)
  mid=(cx,cy-length*.44);inner=[(mid[0]+(x-mid[0])*.95,mid[1]+(y-mid[1])*.96) for x,y in points];draw.polygon(inner,fill=(*color,255))
  # Asymmetric lamina light and fine branching veins, without large opaque silhouettes.
  vein=tuple(min(255,int(c*1.28)+6) for c in color)+(242,)
  draw.line([transform(0,5),transform(0,-length*.93)],fill=vein,width=max(1,int(length/150)))
  for t in [.22,.37,.52,.67,.80]:
   vv=math.sin(math.pi*t)*width*.40
   for sign in [-1,1]:draw.line([transform(0,-length*t),transform(sign*vv,-length*(t+.075))],fill=tuple(int(c*.85) for c in vein[:3])+(200,),width=1)
  if species=='maple':
   for x,y in [(-.64,-.67),(-.67,-.34),(.64,-.67),(.67,-.34)]:draw.line([transform(0,-length*.14),transform(x*width*.85,y*length*.92)],fill=vein,width=1)
 def needles(draw,species,variation):
  color=palettes[species];base=(256,493);tips=[(256+random.uniform(-55,55),50)] if species=='pine' else[(94,126),(168,62),(271,30),(356,83),(426,162)]
  if species=='pine':tips+=[(94,170),(404,191)]
  for branch_tip in tips:
   draw.line([base,branch_tip],fill=(104,83,45,255),width=5 if species=='pine' else 3)
   vx=branch_tip[0]-base[0];vy=branch_tip[1]-base[1];L=math.hypot(vx,vy);ux=vx/L;uy=vy/L;px=-uy;py=ux
   count=58 if species=='metasequoia' else 36
   for j in range(count):
    t=.10+.88*j/count;cx=base[0]+vx*t;cy=base[1]+vy*t
    for sign in [-1,1]:
     if species=='metasequoia':
      length=(12+19*math.sin(t*math.pi)**.75)*random.uniform(.8,1.15);dx=px*length*sign+ux*8;dy=py*length*sign+uy*8
      points=[(cx,cy),(cx+dx*.52-py*4.8,cy+dy*.52+px*4.8),(cx+dx,cy+dy),(cx+dx*.52+py*4.8,cy+dy*.52-px*4.8)]
      col=tuple(min(255,int(c*random.uniform(.80,1.16))) for c in color);draw.polygon(points,fill=(*col,255));draw.line([(cx,cy),(cx+dx,cy+dy)],fill=(*tuple(min(255,c+25) for c in col),245),width=1)
     else:
      for pair in range(3):
       length=random.uniform(42,88)*(1-.25*t);angle=random.uniform(.35,1.0)*sign
       dx=ux*length*math.cos(angle)+px*length*math.sin(angle);dy=uy*length*math.cos(angle)+py*length*math.sin(angle)
       col=tuple(min(255,int(c*random.uniform(.75,1.20))) for c in color);draw.line([(cx,cy),(cx+dx,cy+dy)],fill=(*col,255),width=3);draw.line([(cx+1,cy),(cx+dx,cy+dy)],fill=(102,139,72,220),width=1)
 for si,species in enumerate(SPECIES):
  for mode in range(3):
   tile=Image.new('RGBA',(S,S));d=ImageDraw.Draw(tile);color=palettes[species]
   if species in ['pine','metasequoia']:needles(d,species,mode)
   elif mode in [0,2]:
    col=tuple(min(255,int(c*(1.08 if mode==2 else .95))) for c in color)
    if species=='maple' and mode==2:col=(143,143,54)
    leaf(d,(256,474),402,270 if species=='oak' else 310 if species=='maple' else 278,random.uniform(-.08,.08),species,col)
   else:
    # Fine woody twig carrying correctly scaled small leaves; one card is <.7m at runtime.
    stem=[(256,494),(244,372),(264,240),(253,91)];d.line(stem,fill=(102,91,48,255),width=5)
    count=32 if species in ['oak','maple'] else 40
    for j in range(count):
     t=(j+.3)/count;cy=455-t*350;cx=253+10*math.sin(t*5);side=-1 if j%2 else 1;ex=cx+side*random.uniform(45,103);ey=cy-random.uniform(8,32);d.line([(cx,cy),(ex,ey)],fill=(107,100,49,255),width=2)
     col=tuple(min(255,int(c*random.uniform(.82,1.17))) for c in color);leaf(d,(ex,ey),random.uniform(100,137) if species!='birch' else random.uniform(72,96),random.uniform(65,95) if species!='birch' else random.uniform(52,70),side*random.uniform(.5,1.1),species,col)
   idx=si*3+mode;atlas.alpha_composite(tile,((idx%4)*S,(idx//4)*S))
 atlas.save(OUT/(PREFIX+'-leaf-atlas-basecolor.webp'),quality=94,method=6)
 # Birch: chalky white papery bark with irregular lenticels and peeling scars.
 n=512;rng=np.random.default_rng(14163);y,x=np.mgrid[0:n,0:n]/n;grain=rng.random((n,n));broad=(np.sin(x*math.tau*5+y*math.tau)*.5+.5)
 color=np.dstack((220+grain*15-broad*8,218+grain*14-broad*9,200+grain*13-broad*8)).clip(0,255).astype('uint8');im=Image.fromarray(color);d=ImageDraw.Draw(im)
 for j in range(185):
  px=random.randrange(512);py=random.randrange(512);length=random.randrange(7,47);height=random.randrange(1,5);shade=random.randrange(44,100);d.line([(px,py),(px+length,py+random.uniform(-1.5,1.5))],fill=(shade,shade-3,shade-8),width=height)
 for j in range(22):
  px=random.randrange(512);py=random.randrange(512);w=random.randrange(10,43);h=random.randrange(6,25);d.polygon([(px,py),(px+w,py-3),(px+w*.75,py+h),(px+w*.10,py+h*.70)],fill=(64,66,60));d.line([(px,py),(px+w,py-3)],fill=(245,241,218),width=2)
 for j in range(20):
  px=random.randrange(512);py=random.randrange(435,512);d.polygon([(px,py),(px+random.randrange(8,30),py-10),(px+15,py+42)],fill=(80,80,66))
 im.save(OUT/(PREFIX+'-birch-basecolor.webp'),quality=91,method=6)
 arr=np.asarray(im).astype(float);h=arr.mean(axis=2)/255;gy,gx=np.gradient(h);normal=np.dstack((-gx*1.8,-gy*1.8,np.ones_like(h)));normal/=np.linalg.norm(normal,axis=2)[:,:,None]
 Image.fromarray(((normal*.5+.5)*255).astype('uint8')).save(OUT/(PREFIX+'-birch-normal.webp'),quality=90,method=6)
 orm=np.dstack((np.ones_like(h),.81+grain*.09,np.zeros_like(h)));Image.fromarray((orm*255).astype('uint8')).save(OUT/(PREFIX+'-birch-orm.webp'),quality=89,method=6)

def patch_and_package():
 from PIL import Image
 def read(path):
  data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];return json.loads(data[20:20+n]),data[20+n:]
 assets=[]
 def add(id,file,kind):
  data=file.read_bytes();sha=hashlib.sha256(data).hexdigest();assets.append({'id':id,'path':'assets/art/'+sha+file.suffix,'sourcePath':'assets/source/'+file.name,'mime':'model/gltf-binary' if file.suffix=='.glb' else 'image/webp','sha256':sha,'size':len(data),'kind':kind});return id
 for species in SPECIES:
  path=OUT/(PREFIX+'-'+species+'.glb');doc,remainder=read(path)
  for material in doc.get('materials',[]):
   if 'foliage' in material.get('name','').lower():material.update({'alphaMode':'MASK','alphaCutoff':.45,'doubleSided':True})
  content=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode();content+=b' '*((-len(content))%4);path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(content)+len(remainder))+struct.pack('<II',len(content),0x4e4f534a)+content+remainder)
  add(PREFIX+'-'+species,path,'model')
 for suffix in ['leaf-atlas-basecolor','birch-basecolor','birch-normal','birch-orm']:add(PREFIX+'-'+suffix,OUT/(PREFIX+'-'+suffix+'.webp'),'texture')
 metadata=json.loads((OUT/(PREFIX+'-bounds.json')).read_text());models={};impostors={};materials={}
 for name,spec in metadata['models'].items():
  path=OUT/(PREFIX+'-'+name+'-impostor.png');image=Image.open(path).convert('RGBA').resize((256,512),Image.Resampling.LANCZOS);out=path.with_suffix('.webp');image.save(out,quality=92,method=6);path.unlink();id=add(name+'-impostor-v014',out,'texture')
  models[name]={'assetId':PREFIX+'-'+spec['species'],'node':name,'bounds':spec['bounds'],'trunkDiameter':spec['trunkDiameter'],'species':spec['species'],'variant':spec['variant'],'triangles':spec['triangles']}
  impostors[name]={'assetId':id,**spec['impostor']};materials[name]={'baseColor':id,'alphaMode':'MASK','alphaCutoff':.40,'doubleSided':True,'depthWrite':True}
 materials['treesV014Foliage']={'baseColor':PREFIX+'-leaf-atlas-basecolor','alphaMode':'MASK','alphaCutoff':.45,'doubleSided':True,'depthWrite':True,'roughness':.88}
 materials['treesV014BirchBark']={'baseColor':PREFIX+'-birch-basecolor','normal':PREFIX+'-birch-normal','orm':PREFIX+'-birch-orm'}
 patch={'revision':'0.14.0','assets':assets,'models':models,'impostors':impostors,'materials':materials,'species':{s:['tree_'+s+'_'+str(i) for i in range(3)] for s in SPECIES},'sharedImages':['surface-atlas-basecolor','surface-atlas-normal','surface-atlas-orm'],'coordinateSystem':{'units':'meters','up':'+Y','forward':'+Z','origin':'trunk at ground, bottom exactly-.1m; NO roots or buttresses'}}
 (OUT/(PREFIX+'-manifest-patch.json')).write_text(json.dumps(patch,indent=2)+'\n')
 assert len(models)==15 and len(impostors)==15
 assert max(a['size'] for a in assets)<8*1024*1024
 for path in OUT.glob(PREFIX+'*.blend1'):path.unlink()
 print('TREES_V014_READY',len(assets),'assets',sum(a['size'] for a in assets),'total bytes')

if '--blender' not in sys.argv:
 synthesize();subprocess.run(['/usr/bin/blender','--background','--factory-startup','--python',str(Path(__file__).resolve()),'--','--blender']+(['--draft'] if '--draft' in sys.argv else []),check=True)
 if '--draft' not in sys.argv:patch_and_package()
 sys.exit(0)

import bpy,numpy as np
from mathutils import Vector,Quaternion
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
V=lambda p:Vector((p[0],-p[2],p[1]));G=lambda p:Vector((p[0],p[2],-p[1]))
def pbr(name,base,normal,orm):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF')
 def tex(file,linear=False):
  t=n.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(OUT/file),check_existing=True)
  if linear:t.image.colorspace_settings.name='Non-Color'
  return t
 a=tex(base);vc=n.new('ShaderNodeVertexColor');vc.layer_name='Color';multiply=n.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;l.new(a.outputs['Color'],multiply.inputs[1]);l.new(vc.outputs['Color'],multiply.inputs[2]);l.new(multiply.outputs[0],p.inputs['Base Color'])
 a=tex(normal,True);nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.68;l.new(a.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],p.inputs['Normal'])
 a=tex(orm,True);sep=n.new('ShaderNodeSeparateColor');l.new(a.outputs['Color'],sep.inputs['Color']);l.new(sep.outputs['Green'],p.inputs['Roughness']);l.new(sep.outputs['Blue'],p.inputs['Metallic']);return m
BARK=pbr('LC • weathered surface atlas','surface-atlas-basecolor.webp','surface-atlas-normal.webp','surface-atlas-orm.webp')
BIRCH=pbr('Trees014 • birch papery bark',PREFIX+'-birch-basecolor.webp',PREFIX+'-birch-normal.webp',PREFIX+'-birch-orm.webp')
FOLIAGE=bpy.data.materials.new('Trees014 • foliage leaf cards');FOLIAGE.use_nodes=True;FOLIAGE.surface_render_method='DITHERED';FOLIAGE.use_backface_culling=False;FOLIAGE.alpha_threshold=.45
n=FOLIAGE.node_tree.nodes;l=FOLIAGE.node_tree.links;p=n.get('Principled BSDF');image=n.new('ShaderNodeTexImage');image.image=bpy.data.images.load(str(OUT/(PREFIX+'-leaf-atlas-basecolor.webp')),check_existing=True);l.new(image.outputs['Color'],p.inputs['Base Color']);l.new(image.outputs['Alpha'],p.inputs['Alpha']);p.inputs['Roughness'].default_value=.88

class Geometry:
 def __init__(self):self.verts=[];self.faces=[];self.uv=[];self.colors=[];self._tris=0
 def add(self,verts,faces,uv,colors=None):
  offset=len(self.verts);self.verts.extend(verts);self.faces.extend(tuple(offset+i for i in f) for f in faces);self.uv.extend(uv);self.colors.extend(colors or[(1,1,1,1)]*len(verts));self._tris+=sum(len(f)-2 for f in faces)
 def object(self,name,material,parent):
  me=bpy.data.meshes.new(name);me.from_pydata([V(v) for v in self.verts],[],self.faces);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);ob.parent=parent;me.materials.append(material)
  uv=me.uv_layers.new(name='UVMap');index=np.empty(len(me.loops),dtype=np.int32);me.loops.foreach_get('vertex_index',index);uv.data.foreach_set('uv',np.array(self.uv,dtype=np.float32)[index].ravel())
  color=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');color.data.foreach_set('color',np.array(self.colors,dtype=np.float32).ravel())
  for face in me.polygons:face.use_smooth=material is not FOLIAGE
  return ob
 @property
 def tris(self):return self._tris

def tube(geo,path,radii,sides=8,birch=False,tint=(1,1,1),phase=0):
 verts=[];uv=[];colors=[];faces=[];A=None
 for k,(p,radius) in enumerate(zip(path,radii)):
  axis=(Vector(path[min(k+1,len(path)-1)])-Vector(path[max(k-1,0)])).normalized()
  if A is None:
   ref=Vector((1,0,0)) if abs(axis.x)<.9 else Vector((0,0,1));A=axis.cross(ref).normalized()
  else:A=(A-axis*A.dot(axis)).normalized()
  B=axis.cross(A).normalized()
  for j in range(sides+1):
   angle=math.tau*j/sides;grain=1+.026*math.sin(angle*5+phase)*math.sin(math.pi*k/(len(path)-1));point=Vector(p)+radius*grain*(A*math.cos(angle)+B*math.sin(angle));verts.append(point)
   u=j/sides;t=k/(len(path)-1)
   uv.append((u,t) if birch else((.015+.97*u)/4,1-(.015+.97*(1-t))/4))
   colors.append((*tint,1))
 for k in range(len(path)-1):
  for j in range(sides):a=k*(sides+1)+j;faces.append((a,a+1,a+sides+2,a+sides+1))
 faces.extend([tuple(range(sides-1,-1,-1)),tuple((len(path)-1)*(sides+1)+j for j in range(sides))]);geo.add(verts,faces,uv,colors)

def card(geo,center,width,height,normal,twist,tile,folded):
 N=Vector(normal).normalized();ref=Vector((0,1,0)) if abs(N.y)<.95 else Vector((1,0,0));A=N.cross(ref).normalized();B=N.cross(A).normalized();old=A;A=A*math.cos(twist)+B*math.sin(twist);B=-old*math.sin(twist)+B*math.cos(twist)
 if folded:coords=[(-.5,-.5,0),(0,-.5,.045),(.5,-.5,0),(-.5,.5,0),(0,.5,.045),(.5,.5,0)];faces=[(0,1,4,3),(1,2,5,4)]
 else:coords=[(-.5,-.5,0),(.5,-.5,0),(.5,.5,0),(-.5,.5,0)];faces=[(0,1,2,3)]
 verts=[Vector(center)+A*(x*width)+B*(y*height)+N*(z*width) for x,y,z in coords];tx=tile%4;ty=tile//4
 uv=[((tx+.018+.964*(x+.5))/4,1-(ty+.018+.964*(.5-y))/4) for x,y,z in coords];geo.add(verts,faces,uv)

MODELS={};ROOTS={s:[] for s in SPECIES}
class Tree:
 def __init__(self,species,variant):
  self.species=species;self.variant=variant;self.H,self.D,self.R,self.primary,self.lean=PROFILES[species][variant];self.rng=random.Random(14261+SPECIES.index(species)*301+variant*71);self.wood=Geometry();self.leaves=Geometry();self.clusters=[];self.crown_lobes=[];self.branches=0;self.primaryCount=0;self.gap=self.rng.uniform(0,math.tau);self.root=bpy.data.objects.new('tree_'+species+'_'+str(variant),None);bpy.context.collection.objects.link(self.root);ROOTS[species].append(self.root)
  self.tint={'oak':(.83,.91,.98),'maple':(.93,.95,.94),'pine':(1,.78,.61),'metasequoia':(1,.73,.57),'birch':(1,1,1)}[species]
 def trunk_point(self,y):
  t=max(0,y/self.H);lx,lz=self.lean;return Vector((lx*t**1.6+.22*math.sin(t*math.tau*1.3)*t,y,lz*t**1.8+.15*math.sin(t*math.tau*.85)*t))
 def trunk(self):
  stop=self.H*(.91 if self.species in ['oak','maple'] else .94 if self.species=='pine' else 1)
  ys=[-.1,0,.35]+[.35+(stop-.35)*(j/19) for j in range(1,20)];path=[self.trunk_point(y) for y in ys];radii=[]
  for y in ys:
   t=max(0,y/stop);r=self.D*.5 if y<=.35 else max(.010,self.D*.5*(1-t)**1.04);radii.append(r)
  tube(self.wood,path,radii,18 if self.species=='metasequoia' else 14,birch=self.species=='birch',tint=self.tint,phase=self.rng.random()*5)
  self.clusters.append((path[-2],Vector((0,1,0)),.38))
 def branch(self,start,end,radius,level=1,sag=.12):
  start=Vector(start);end=Vector(end);delta=end-start;L=delta.length;rng=self.rng;side=delta.cross(Vector((0,1,0)))
  if side.length<.01:side=Vector((1,0,0))
  side.normalize();bend=rng.uniform(-.12,.12)*L;arch=rng.uniform(.03,.12)*L
  count=(5 if level==1 else 3 if level==2 else 2) if self.species=='metasequoia' else(6 if level==1 else 4 if level==2 else 3);path=[];radii=[]
  for i in range(count):
   t=i/(count-1);p=start+delta*t+side*(math.sin(math.pi*t)*bend)+Vector((0,math.sin(math.pi*t)*arch-sag*t*t,0));path.append(p);radii.append(max(.006,radius*(1-t)**.82+.004*t))
  tint=self.tint
  if self.species=='birch' and radius<.055:tint=tuple(c*(.34 if radius<.025 else .65) for c in tint)
  tube(self.wood,path,radii,(7 if level==1 else 5 if level==2 else 4) if self.species=='metasequoia' else(8 if level==1 else 6 if level==2 else 5),birch=self.species=='birch',tint=tint,phase=rng.random()*6)
  self.branches+=1;return path
 def broadleaf(self):
  rng=self.rng;si=self.species;H=self.H;R=self.R;main=self.primary
  angles=[]
  for i in range(main):
   for trial in range(20):
    a=rng.uniform(0,math.tau)
    if all(abs(math.atan2(math.sin(a-b),math.cos(a-b)))>.50 for b in angles):break
   angles.append(a)
  # Asymmetric tall leader and unequal scaffold boughs, never an eight-way radial fork.
  for i,a in enumerate(angles):
   sy=H*rng.uniform(.22,.43);reach=R*rng.uniform(.58,.98);ey=H*rng.uniform(.65 if si=='maple' else .60,.91 if si=='maple' else .88);start=self.trunk_point(sy);end=Vector((math.cos(a)*reach,ey,math.sin(a)*reach))+Vector((self.lean[0]*.7,0,self.lean[1]*.7));path=self.branch(start,end,self.D*rng.uniform(.18,.25),1,.10);self.primaryCount+=1;self.crown_lobes.append((Vector((end.x*.86,H*.72+(end.y-H*.72)*.35,end.z*.86)),R*rng.uniform(.52,.68),H*rng.uniform(.19,.25),R*rng.uniform(.50,.67)))
   for j in range(rng.randint(4,6)):
    u=rng.uniform(.42,.96);p=path[min(len(path)-1,round(u*(len(path)-1)))];an=a+rng.uniform(-1.35,1.35);length=rng.uniform(1.6,3.2)*(H/13)**.4;end2=p+Vector((math.cos(an)*length,rng.uniform(.9,2.3) if si=='maple' else rng.uniform(.55,1.9),math.sin(an)*length));b=self.branch(p,end2,self.D*rng.uniform(.065,.100),2,.11)
    for k in range(rng.randint(2,3)):
     center=b[rng.randint(2,len(b)-1)];an2=an+rng.uniform(-1.5,1.5);tip=center+Vector((math.cos(an2)*rng.uniform(.55,1.25),rng.uniform(-.10,.8),math.sin(an2)*rng.uniform(.55,1.25)));twig=self.branch(center,tip,self.D*rng.uniform(.018,.032),3,rng.uniform(.02,.18));self.clusters.append((twig[-1],(twig[-1]-twig[-2]).normalized(),rng.uniform(.45,.75)))
  for j in range(3):
   a=rng.uniform(0,math.tau);p=self.trunk_point(H*rng.uniform(.62,.82));end=p+Vector((math.cos(a)*R*.35,rng.uniform(.6,1.9),math.sin(a)*R*.35));path=self.branch(p,end,self.D*.07,2,.04);self.clusters.append((path[-1],Vector((0,1,0)),.70))
 def birch(self):
  rng=self.rng;H=self.H;R=self.R
  for i in range(self.primary):
   y=H*rng.uniform(.30,.91);a=rng.uniform(0,math.tau);shape=max(.18,math.sin((y/H-.20)/.84*math.pi))**.55;reach=R*shape*rng.uniform(.66,1.0);p=self.trunk_point(y);end=p+Vector((math.cos(a)*reach,rng.uniform(.7,1.9),math.sin(a)*reach));path=self.branch(p,end,self.D*rng.uniform(.12,.18),1,.20);self.primaryCount+=1
   for j in range(3):
    p=path[rng.randint(3,len(path)-1)];aa=a+rng.uniform(-1.15,1.15);end=p+Vector((math.cos(aa)*rng.uniform(.7,1.4),rng.uniform(-.15,.9),math.sin(aa)*rng.uniform(.7,1.4)));b=self.branch(p,end,self.D*.065,2,.22)
    for k in range(2):
     aa+=rng.uniform(-.8,.8);p=b[rng.randint(2,len(b)-1)];end=p+Vector((math.cos(aa)*rng.uniform(.4,.8),rng.uniform(-.8,.2),math.sin(aa)*rng.uniform(.4,.8)));twig=self.branch(p,end,self.D*.025,3,.15);self.clusters.append((twig[-1],(twig[-1]-twig[-2]).normalized(),rng.uniform(.36,.55)))
 def pine(self):
  rng=self.rng;H=self.H;R=self.R
  for i in range(self.primary):
   y=H*rng.uniform(.48,.89);a=rng.uniform(0,math.tau);spread=max(.25,1-abs(y/H-.70)*2.7);reach=R*spread*rng.uniform(.60,1);p=self.trunk_point(y);end=p+Vector((math.cos(a)*reach,rng.uniform(.4,2.3),math.sin(a)*reach));path=self.branch(p,end,self.D*rng.uniform(.12,.21),1,.32);self.primaryCount+=1
   for j in range(rng.randint(3,4)):
    p=path[rng.randint(3,len(path)-1)];aa=a+rng.uniform(-1.1,1.1);end=p+Vector((math.cos(aa)*rng.uniform(1,2),rng.uniform(.3,1.6),math.sin(aa)*rng.uniform(1,2)));b=self.branch(p,end,self.D*.068,2,.13)
    for k in range(2):
     p=b[rng.randint(2,len(b)-1)];aa+=rng.uniform(-1,1);end=p+Vector((math.cos(aa)*rng.uniform(.4,.9),rng.uniform(.1,.8),math.sin(aa)*rng.uniform(.4,.9)));twig=self.branch(p,end,self.D*.027,3,.08);self.clusters.append((twig[-1],(twig[-1]-twig[-2]).normalized(),rng.uniform(.42,.64)))
  # A few irregular broken lower stubs, not a continuous visible branch tier.
  for i in range(3):
   y=H*rng.uniform(.23,.47);a=rng.uniform(0,math.tau);p=self.trunk_point(y);self.branch(p,p+Vector((math.cos(a)*rng.uniform(.25,.7),rng.uniform(-.2,.2),math.sin(a)*rng.uniform(.25,.7))),self.D*.055,3,.03)
 def metasequoia(self):
  rng=self.rng;H=self.H;R=self.R
  heights=sorted(rng.uniform(H*(.16 if self.variant==1 else .22),H*.95) for i in range(self.primary))
  for y in heights:
   a=rng.uniform(0,math.tau);reach=R*(1-y/H)**.64*rng.uniform(.76,1.35);p=self.trunk_point(y);end=p+Vector((math.cos(a)*reach,rng.uniform(-.25,1.1),math.sin(a)*reach));path=self.branch(p,end,self.D*rng.uniform(.050,.085)*(1-y/H)**.4,1,rng.uniform(.18,.55));self.primaryCount+=1
   for j in range(rng.randint(2,3)):
    p=path[rng.randint(3,len(path)-1)];aa=a+rng.uniform(-1.05,1.05);L=rng.uniform(.7,1.7)*(1-y/H)**.3;end=p+Vector((math.cos(aa)*L,rng.uniform(-.3,.65),math.sin(aa)*L));b=self.branch(p,end,self.D*.025*(1-y/H)**.3,2,.13)
    for k in range(2):
     p=b[rng.randint(2,len(b)-1)];aa+=rng.uniform(-1.0,1.0);end=p+Vector((math.cos(aa)*rng.uniform(.25,.65),rng.uniform(-.25,.30),math.sin(aa)*rng.uniform(.25,.65)));twig=self.branch(p,end,self.D*.008,3,.10);self.clusters.append((twig[-1],(twig[-1]-twig[-2]).normalized(),rng.uniform(.35,.57)))
 def foliage(self):
  rng=self.rng;species=self.species;si=SPECIES.index(species);target={'oak':14500,'maple':14500,'birch':12000,'pine':14500,'metasequoia':17500}[species];budget=target-self.wood.tris
  # Mature canopy occupies overlapping ramified crown volumes. Fine foliage is not restricted
  # to tiny endpoint balls: branch-end wisps coexist with a continuous, irregular open canopy.
  H=self.H;R=self.R;lx,lz=self.lean
  def sphere():
   y=rng.uniform(-1,1);a=rng.uniform(0,math.tau);r=rng.random()**(1/3);q=math.sqrt(max(0,1-y*y));return Vector((math.cos(a)*q,y,math.sin(a)*q))*r
  while self.leaves.tris+4<=budget:
   if rng.random()<.20:
    center,tangent,spread=rng.choice(self.clusters);pos=center-tangent*rng.uniform(0,.95)+sphere()*rng.uniform(.30,.65)
   elif species in ['oak','maple']:
    center,rx,ry,rz=rng.choice(self.crown_lobes);q=sphere();pos=center+Vector((q.x*rx,q.y*ry,q.z*rz));pos.x+=lx*.25;pos.z+=lz*.25
   elif species=='birch':
    q=sphere();pos=Vector((lx*.70+q.x*R*.96,H*.66+q.y*H*.32,lz*.70+q.z*R*.91))
   elif species=='pine':
    a=rng.uniform(0,math.tau);r=R*rng.random()**.50;ratio=r/R;pos=Vector((lx*.75+math.cos(a)*r,H*(.94-.19*ratio**1.6)+rng.gauss(0,H*.041),lz*.75+math.sin(a)*r))
   else:
    y=rng.uniform(H*(.19 if self.variant==1 else .23),H*.985);radius=R*(1-y/H)**.64*rng.uniform(1.05,1.24);r=radius*rng.random()**.5;a=rng.uniform(0,math.tau);center=self.trunk_point(y);pos=center+Vector((math.cos(a)*r,rng.gauss(0,.30),math.sin(a)*r))
   # Different off-center gaps are retained without emptying a whole branch level.
   a=math.atan2(pos.z-lz*.6,pos.x-lx*.6);gap=abs(math.atan2(math.sin(a-self.gap),math.cos(a-self.gap)))
   if gap<(.25 if self.variant!=1 else .16) and H*.52<pos.y<H*.81 and rng.random()<.58:continue
   twig=species in ['pine','metasequoia'] or rng.random()<.87;tile=si*3+(1 if twig else rng.choice([0,2]));folded=twig
   normal=Vector((rng.uniform(-1,1),rng.uniform(.12,.90) if rng.random()<.70 else rng.uniform(-.3,.4),rng.uniform(-1,1)))
   if species=='metasequoia':width=rng.uniform(.44,.58);height=rng.uniform(.58,.69)
   elif species=='pine':width=rng.uniform(.44,.60);height=rng.uniform(.52,.69)
   elif twig:width=rng.uniform(.48,.59) if species!='birch' else rng.uniform(.35,.44);height=rng.uniform(.56,.69) if species!='birch' else rng.uniform(.44,.57)
   else:height=rng.uniform(.105,.165) if species!='birch' else rng.uniform(.065,.095);width=height*(.70 if species=='oak' else .90 if species=='maple' else .76)
   card(self.leaves,pos,width,height,normal,rng.uniform(0,math.tau),tile,folded)
 def build(self):
  self.trunk()
  getattr(self,'broadleaf' if self.species in ['oak','maple'] else self.species)();self.foliage();wood=self.wood.object(self.root.name+'_bark',BIRCH if self.species=='birch' else BARK,self.root);leaves=self.leaves.object(self.root.name+'_foliage_leaf',FOLIAGE,self.root)
  allv=self.wood.verts+self.leaves.verts;lo=[min(v[i] for v in allv) for i in range(3)];hi=[max(v[i] for v in allv) for i in range(3)];bounds={'min':[round(v,4) for v in lo],'max':[round(v,4) for v in hi],'width':round(hi[0]-lo[0],4),'height':round(hi[1]-lo[1],4),'length':round(hi[2]-lo[2],4)}
  pw=bounds['width']*1.075;ph=bounds['height']*1.075;cx=(lo[0]+hi[0])/2;cy=(lo[1]+hi[1])/2
  spec={'species':self.species,'variant':self.variant,'trunkDiameter':self.D,'bounds':bounds,'triangles':self.wood.tris+self.leaves.tris,'barkTriangles':self.wood.tris,'foliageTriangles':self.leaves.tris,'primaryBranches':self.primaryCount,'totalBranches':self.branches,'leafClusters':len(self.clusters),'lean':list(self.lean),'gapAzimuth':round(self.gap,4),'impostor':{'planeWidth':round(pw,4),'planeHeight':round(ph,4),'center':[round(cx,4),round(cy,4),0],'anchor':[.5,round((ph*.5-cy)/ph,6)],'alphaCutoff':.40,'doubleSided':True,'depthWrite':True,'resolution':[256,512]},'notes':'Mature distributed crown volumes plus terminal ramification; no roots/buttresses/repeated tiers. Botanical cards <=.7m.'};MODELS[self.root.name]=spec
  self.root['species']=self.species;self.root['variant']=self.variant;self.root['trunkDiameter']=self.D;self.root['rootGeometry']='none';self.root['cardMaxHeightMeters']=.70
  print('TREE_BUILT',self.root.name,spec['triangles'],bounds)
for species in SPECIES:
 for variant in range(3):Tree(species,variant).build()

# Content remains grouped by species; every bank stays below the service's per-file limit.
for species,roots in ROOTS.items():
 bpy.ops.object.select_all(action='DESELECT')
 for rt in roots:
  for ob in [rt,*rt.children_recursive]:ob.select_set(True)
 bpy.context.view_layer.objects.active=roots[0]
 bpy.ops.export_scene.gltf(filepath=str(OUT/(PREFIX+'-'+species+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_apply=False,export_image_format='WEBP',export_image_quality=90,export_animations=False,export_extras=True,export_cameras=False,export_lights=False)
(OUT/(PREFIX+'-bounds.json')).write_text(json.dumps({'revision':'0.14.0','models':MODELS,'rootGeometry':'none; trunk bottom-.1m','sharedImages':['surface-atlas-basecolor','surface-atlas-normal','surface-atlas-orm']},indent=2)+'\n')
for image in bpy.data.images:
 if image.source=='FILE':image.filepath='//'+Path(image.filepath).name
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(PREFIX+'.blend')),compress=True)

# Technical daylight renders from the authored meshes, no external photographs.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=False;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.resolution_percentage=100
scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.65,.76,.88,1);bg.inputs['Strength'].default_value=.7
bpy.ops.object.light_add(type='SUN');sun=bpy.context.object;sun.data.energy=2.0;sun.data.angle=.35;sun.rotation_euler=(.35,-.45,-.4)
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';scene.camera=camera
all_roots=[rt for roots in ROOTS.values() for rt in roots]
def visible(root,show):
 root.hide_render=not show
 for ob in root.children_recursive:ob.hide_render=not show
for rt in all_roots:visible(rt,False)
# Render every variant as a ground-anchored transparent card, correcting stored aspect through metadata.
if '--draft' not in sys.argv:
 scene.render.film_transparent=True;scene.cycles.samples=10
 for rt in all_roots:
  visible(rt,True);imp=MODELS[rt.name]['impostor'];cx,cy,_=imp['center'];camera.location=V((cx,cy,110));camera.rotation_euler=(V((cx,cy,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=max(imp['planeHeight'],imp['planeWidth']);scene.render.resolution_x=max(128,round(512*imp['planeWidth']/imp['planeHeight']));scene.render.resolution_y=512;scene.render.filepath=str(OUT/(PREFIX+'-'+rt.name+'-impostor.png'));bpy.ops.render.render(write_still=True);visible(rt,False)
# Shared ground for comparisons; roots have no mesh whatsoever below-.1m.
scene.render.film_transparent=False;scene.render.image_settings.color_mode='RGB';scene.cycles.samples=16
bpy.ops.mesh.primitive_plane_add(size=300);floor=bpy.context.object;m=bpy.data.materials.new('Trees014 review earth');m.diffuse_color=(.18,.20,.16,1);m.use_nodes=True;m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.18,.20,.16,1);floor.data.materials.append(m)
# Five actual species side by side at their real heights.
for i,species in enumerate(SPECIES):rt=ROOTS[species][0];rt.location=V(((i-2)*15,0,0));visible(rt,True)
camera.location=V((0,19,120));camera.rotation_euler=(V((0,19,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=86;scene.render.resolution_x=2400;scene.render.resolution_y=1200;scene.render.filepath=str(OUT/(PREFIX+'-species-comparison.png'));bpy.ops.render.render(write_still=True)
for rt in all_roots:rt.location=(0,0,0);visible(rt,False)
# Each species' three independent silhouettes must be inspected together.
if '--draft' not in sys.argv:
 scene.cycles.samples=12
 for species,roots in ROOTS.items():
  width=max(MODELS[rt.name]['bounds']['width'] for rt in roots);height=max(MODELS[rt.name]['bounds']['height'] for rt in roots);spacing=width+2.0
  for i,rt in enumerate(roots):rt.location=V(((i-1)*spacing,0,0));visible(rt,True)
  scale=max(height*1.14,(spacing*2+width)*.60);camera.location=V((0,height*.47,120));camera.rotation_euler=(V((0,height*.47,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale*(1500/900);scene.render.resolution_x=1500;scene.render.resolution_y=900;scene.render.filepath=str(OUT/(PREFIX+'-'+species+'-variants.png'));bpy.ops.render.render(write_still=True)
  for rt in roots:rt.location=(0,0,0);visible(rt,False)
print('TREES_V014_EXPORTED',len(MODELS),'models')
