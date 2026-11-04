#!/usr/bin/env python3
"""LAST CIRCLE 0.14 survivor: original continuous anatomical clothing and baked directional IK.
Only writes survivor-v014* source artifacts; never modifies production manifests or previous banks.
Run: python scripts/create-survivor-v014.py (Blender 4.3+, existing original surface atlas).
"""
from pathlib import Path
import sys,math,json,subprocess,hashlib,struct,random
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/source';PREFIX='survivor-v014'
if '--blender' not in sys.argv:
 subprocess.run(['/usr/bin/blender','--background','--factory-startup','--python',str(Path(__file__).resolve()),'--','--blender']+(['--draft'] if '--draft' in sys.argv else []),check=True)
 data=(OUT/(PREFIX+'.glb')).read_bytes();sha=hashlib.sha256(data).hexdigest();bounds=json.loads((OUT/(PREFIX+'-bounds.json')).read_text())
 patch={'revision':'0.14.0','assets':[{'id':'character-v014','path':'assets/art/'+sha+'.glb','sourcePath':'assets/source/'+PREFIX+'.glb','mime':'model/gltf-binary','sha256':sha,'size':len(data),'kind':'model'}],'models':{'survivor':{'assetId':'character-v014','node':'survivor','rigNode':'SurvivorRig','weaponSocket':'weapon_socket','rightHandBone':'hand_r','bounds':bounds['standingBounds'],'animations':bounds['clips']}},'coordinateSystem':{'units':'meters','up':'+Y','forward':'+Z','origin':'feet on ground; no forward root motion'},'anatomy':bounds['anatomy']}
 (OUT/(PREFIX+'-manifest-patch.json')).write_text(json.dumps(patch,indent=2)+'\n')
 print('SURVIVOR_V014_READY',sha,len(data));sys.exit(0)
import bpy,bmesh,numpy as np
from mathutils import Vector,Matrix,Quaternion
random.seed(14073)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
V=lambda p:Vector((p[0],-p[2],p[1]))
G=lambda p:Vector((p[0],p[2],-p[1]))
def smooth(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def mix(a,b,t):return Vector(a).lerp(Vector(b),t)
def atlas_material():
 m=bpy.data.materials.new('LC • weathered surface atlas');m.use_nodes=True;n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF')
 def tex(file,linear=False):
  t=n.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(OUT/file),check_existing=True)
  if linear:t.image.colorspace_settings.name='Non-Color'
  return t
 a=tex('surface-atlas-basecolor.webp');l.new(a.outputs['Color'],p.inputs['Base Color'])
 a=tex('surface-atlas-orm.webp',True);sep=n.new('ShaderNodeSeparateColor');l.new(a.outputs['Color'],sep.inputs['Color']);l.new(sep.outputs['Green'],p.inputs['Roughness']);l.new(sep.outputs['Blue'],p.inputs['Metallic'])
 a=tex('surface-atlas-normal.webp',True);nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.40;l.new(a.outputs['Color'],nm.inputs['Color']);l.new(nm.outputs['Normal'],p.inputs['Normal']);return m
ATLAS=atlas_material()
def material(name,color,rough=.7):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;return m
EYE=material('Survivor014 • eye ivory',(.36,.35,.31),.40);IRIS=material('Survivor014 • iris hazel',(.075,.095,.060),.3);CREASE=material('Survivor014 • dark seams',(.026,.028,.023));LIP=material('Survivor014 • lips',(.32,.16,.12));HAIR=material('Survivor014 • matte cropped hair',(.027,.022,.016),.96)
TILE={'cloth':8,'vest':9,'skin':10,'dark':15,'rubber':3,'metal':7,'olive':5}
COLLECTION=[]
def uv_project(ob,tile='cloth'):
 bpy.context.view_layer.objects.active=ob;bpy.ops.object.select_all(action='DESELECT');ob.select_set(True)
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.05,island_margin=.014);bpy.ops.object.mode_set(mode='OBJECT')
 idx=TILE[tile];tx=idx%4;ty=idx//4
 for uv in ob.data.uv_layers.active.data:
  u,v=uv.uv;uv.uv=((tx+.018+.964*u)/4,1-(ty+.018+.964*(1-v))/4)
def mesh(name,verts,faces,tile='cloth',mat=None,smooth_faces=True):
 me=bpy.data.meshes.new(name);me.from_pydata([V(p) for p in verts],[],faces);me.update();bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);ob.data.materials.append(mat or ATLAS)
 for f in me.polygons:f.use_smooth=smooth_faces
 if not mat:uv_project(ob,tile)
 COLLECTION.append(ob);return ob

def loft(name,rings,N=32,tile='cloth',mat=None,caps=True):
 # Ring fields are (center XYZ, ellipse radius along A, radius along B, cross-section A, B).
 verts=[]
 for center,rx,rz,A,B in rings:
  for j in range(N):
   a=j*math.tau/N;radial=Vector(A)*math.cos(a)*rx+Vector(B)*math.sin(a)*rz;verts.append(Vector(center)+radial)
 faces=[]
 for r in range(len(rings)-1):
  for j in range(N):faces.append((r*N+j,r*N+(j+1)%N,(r+1)*N+(j+1)%N,(r+1)*N+j))
 if caps:faces += [tuple(range(N-1,-1,-1)),tuple((len(rings)-1)*N+j for j in range(N))]
 return mesh(name,verts,faces,tile,mat)
def axial(name,samples,N=32,tile='cloth'):
 return loft(name,[(p,rx,rz,(1,0,0),(0,0,1)) for p,rx,rz in samples],N,tile)
def tube_loft(name,points,radii,N=24,tile='cloth'):
 rings=[]
 for i,(p,rr) in enumerate(zip(points,radii)):
  tangent=(Vector(points[min(i+1,len(points)-1)])-Vector(points[max(i-1,0)])).normalized();A=tangent.cross(Vector((0,0,1))).normalized();B=A.cross(tangent).normalized()
  rings.append((p,rr[0],rr[1],A,B))
 return loft(name,rings,N,tile)
def join(obs,name):
 bpy.ops.object.select_all(action='DESELECT')
 for ob in obs:ob.select_set(True)
 bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();ob=obs[0];ob.name=name;return ob
def unify(obs,name,voxel=.008,decimate=.7,tile='cloth'):
 ob=join(obs,name);bpy.context.view_layer.objects.active=ob
 ob.data.remesh_voxel_size=voxel;ob.data.use_remesh_preserve_volume=True;bpy.ops.object.voxel_remesh()
 mod=ob.modifiers.new('Relax connected anatomical surface','SMOOTH');mod.factor=.55;mod.iterations=5;bpy.ops.object.modifier_apply(modifier=mod.name)
 if decimate<1:
  mod=ob.modifiers.new('Character surface budget','DECIMATE');mod.ratio=decimate;bpy.ops.object.modifier_apply(modifier=mod.name)
 for f in ob.data.polygons:f.use_smooth=True
 uv_project(ob,tile);return ob

def box(name,pos,size,tile='vest',bevel=.008):
 bpy.ops.mesh.primitive_cube_add(size=1,location=V(pos));ob=bpy.context.object;ob.name=name;ob.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=ob.modifiers.new('Sewn rounded corners','BEVEL');mod.width=min(bevel,min(size)*.35);mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
 for f in ob.data.polygons:f.use_smooth=True
 mod=ob.modifiers.new('Tailored normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
 ob.data.materials.append(ATLAS);uv_project(ob,tile);COLLECTION.append(ob);return ob

def curve_tube(name,pts,radius,tile='dark',N=8):
 return tube_loft(name,pts,[(radius,radius)]*len(pts),N,tile)

def oval(name,pos,radius,tile='skin',mat=None,N=24,R=16):
 verts=[]
 for j in range(R+1):
  a=j*math.pi/R
  for i in range(N):
   t=i*math.tau/N;verts.append((pos[0]+radius[0]*math.sin(a)*math.cos(t),pos[1]+radius[1]*math.cos(a),pos[2]+radius[2]*math.sin(a)*math.sin(t)))
 faces=[]
 for j in range(R):
  for i in range(N):faces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
 return mesh(name,verts,faces,tile,mat)

# Continuous garment: anatomical shaped lofts become ONE welded manifold.
# No limb capsules, joint balls or disconnected sleeve/thigh pieces remain in the surface.
torso_specs=[(.835,.159,.107,-.01),(.88,.180,.139,-.025),(.94,.179,.134,-.018),(1.00,.163,.116,-.008),(1.07,.159,.106,0),(1.15,.181,.118,.003),(1.24,.210,.133,.008),(1.32,.230,.133,.004),(1.39,.232,.119,0),(1.435,.215,.098,-.006),(1.475,.141,.076,0),(1.493,.087,.066,0),(1.513,.075,.061,0)]
body_sources=[axial('Torso pelvis chest continuous pattern',[((0,y,z),rx,rz) for y,rx,rz,z in torso_specs],40)]
REST={
 'root':((0,0,0),(0,.16,0),None),
 'hips':((0,.93,0),(0,1.065,0),'root'),
 'spine':((0,1.065,0),(0,1.285,0),'hips'),
 'chest':((0,1.285,0),(0,1.445,0),'spine'),
 'neck':((0,1.445,0),(0,1.535,0),'chest'),
 'head':((0,1.535,0),(0,1.80,0),'neck')}
ARM={};LEG={}
for side,s in [('l',-1),('r',1)]:
 hip=(s*.101,.93,0);knee=(s*.108,.50,.024);ankle=(s*.108,.115,.0)
 LEG[side]=(Vector(hip),Vector(knee),Vector(ankle))
 REST['thigh_'+side]=(hip,knee,'hips');REST['shin_'+side]=(knee,ankle,'thigh_'+side);REST['foot_'+side]=(ankle,(s*.108,.065,.19),'shin_'+side)
 leg_specs=[(.945,.101,.092,.108,0),(.91,.106,.100,.122,-.015),(.83,.108,.094,.118,-.008),(.74,.110,.091,.110,.002),(.64,.110,.081,.094,.015),(.54,.108,.069,.078,.026),(.49,.108,.064,.072,.025),(.44,.108,.063,.071,.012),(.36,.108,.069,.083,-.014),(.29,.108,.060,.073,-.017),(.22,.108,.048,.055,-.008),(.15,.108,.038,.043,0),(.11,.108,.037,.042,0)]
 body_sources.append(axial('Anatomical trouser '+side,[((s*x,y,z),rx,rz) for y,x,rx,rz,z in leg_specs],32))
 shoulder=Vector((s*.218,1.43,0));elbow=Vector((s*.440,1.138,.018));wrist=Vector((s*.600,.884,.030));ARM[side]=(shoulder,elbow,wrist)
 REST['shoulder_'+side]=((s*.100,1.44,0),shoulder,'chest');REST['upperarm_'+side]=(shoulder,elbow,'shoulder_'+side);REST['forearm_'+side]=(elbow,wrist,'upperarm_'+side)
 handdir=(wrist-elbow).normalized();REST['hand_'+side]=(wrist,wrist+handdir*.125,'forearm_'+side)
 ts=[-.02,.02,.18,.39,.62,.82,1,1.14,1.31,1.50,1.70,1.86,2]
 points=[];radii=[]
 for t in ts:
  p=shoulder.lerp(elbow,t) if t<=1 else elbow.lerp(wrist,t-1)
  rx,rz=([(.050,.060),(.065,.069),(.065,.069),(.061,.065),(.057,.063),(.050,.055),(.046,.050),(.052,.053),(.055,.054),(.048,.046),(.040,.041),(.034,.038),(.032,.035)][ts.index(t)])
  points.append(p);radii.append((rx,rz))
 body_sources.append(tube_loft('Connected deltoid biceps elbow forearm '+side,points,radii,32))
body=unify(body_sources,'survivor_continuous_garment',.009,.60)
# Gentle sewn cloth fold relief, with dense anatomical surface left smooth at joints.
for v in body.data.vertices:
 p=G(v.co)
 if .19<p.y<.83:
  knee=math.exp(-((p.y-.50)/.115)**2);p.z+=.0027*math.sin(p.y*147+p.x*35)*knee
 elif 1.00<p.y<1.38 and abs(p.x)<.205:
  sidefold=(abs(p.x)/.23)**2;p.z+=.0025*math.sin(p.y*86+p.x*19)*sidefold
 v.co=V(p)

# Bone rig: stable old names, anatomical rest axes.
armdata=bpy.data.armatures.new('Survivor014 anatomical skeleton');arm=bpy.data.objects.new('SurvivorRig',armdata);bpy.context.collection.objects.link(arm)
bpy.context.view_layer.objects.active=arm;bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for name,(a,b,parent) in REST.items():
 bone=armdata.edit_bones.new(name);bone.head=V(a);bone.tail=V(b)
 if parent:bone.parent=armdata.edit_bones[parent]
 # Frame X points across the bend plane for unambiguous anatomical roll.
 X=Vector((0,0,1)) if any(k in name for k in ['shoulder','upperarm','forearm','hand']) else Vector((1,0,0))
 tangent=(Vector(b)-Vector(a)).normalized();Z=X.cross(tangent).normalized();bone.align_roll(V(Z))
bpy.ops.object.mode_set(mode='OBJECT')
root=bpy.data.objects.new('survivor',None);bpy.context.collection.objects.link(root);arm.parent=root
SKINNED=[]
def bind(ob,weight_fn):
 for name in REST:ob.vertex_groups.new(name=name)
 for v in ob.data.vertices:
  ws=weight_fn(G(ob.matrix_world@v.co));ws={k:max(0,float(w)) for k,w in ws.items() if w>1e-5};total=sum(ws.values())
  for name,w in ws.items():ob.vertex_groups[name].add([v.index],w/total,'REPLACE')
 mod=ob.modifiers.new('Smooth anatomical skin','ARMATURE');mod.object=arm;ob.parent=arm;SKINNED.append(ob);return ob

def garment_weights(p):
 side='r' if p.x>=0 else 'l';s=1 if p.x>=0 else -1;shoulder,elbow,wrist=ARM[side]
 axis=(elbow-shoulder).normalized();axis2=(wrist-elbow).normalized();L=(elbow-shoulder).length;L2=(wrist-elbow).length
 dist1=(p-shoulder).dot(axis);dist2=(p-elbow).dot(axis2)
 # Nearest sleeve field wins outside the tailored chest contour.
 arm_region=(abs(p.x)>.205 and p.y>.79 and p.y<1.48)
 if arm_region:
  if dist1<L*.68:w={'upperarm_'+side:1}
  elif dist2<.080:
   t=smooth(-.082,.082,dist2);w={'upperarm_'+side:1-t,'forearm_'+side:t}
  else:w={'forearm_'+side:1}
  shoulder_mix=smooth(-.03,.13,dist1)*smooth(.195,.270,abs(p.x))
  w={k:v*shoulder_mix for k,v in w.items()};w['chest']=1-shoulder_mix
  return w
 if p.y<.97:
  thigh_mix=1-smooth(.805,.975,p.y)
  knee_mix=smooth(.421,.579,p.y)
  legw={'thigh_'+side:knee_mix,'shin_'+side:1-knee_mix}
  return {**{k:v*thigh_mix for k,v in legw.items()},'hips':1-thigh_mix}
 if p.y<1.145:
  t=smooth(1.005,1.145,p.y);return {'hips':1-t,'spine':t}
 if p.y<1.34:
  t=smooth(1.17,1.34,p.y);return {'spine':1-t,'chest':t}
 return {'chest':1}
bind(body,garment_weights)
# Bone-heat skinning follows the welded shoulder/hip topology; diffusion removes hard field edges.
arm.data.pose_position='REST'
for group in list(body.vertex_groups):body.vertex_groups.remove(group)
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);arm.select_set(True);bpy.context.view_layer.objects.active=arm
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
# Keep only one deformation modifier after automatic parenting.
mods=[m for m in body.modifiers if m.type=='ARMATURE']
for duplicate in mods[1:]:body.modifiers.remove(duplicate)
W=np.zeros((len(body.data.vertices),len(body.vertex_groups)),dtype=np.float64)
for vertex in body.data.vertices:
 for group in vertex.groups:W[vertex.index,group.group]=group.weight
edges=np.array([tuple(e.vertices) for e in body.data.edges],dtype=np.int32)
degree=np.bincount(edges.ravel(),minlength=len(W));degree=np.maximum(1,degree)
for iteration in range(4):
 accumulated=np.zeros_like(W);np.add.at(accumulated,edges[:,0],W[edges[:,1]]);np.add.at(accumulated,edges[:,1],W[edges[:,0]])
 W=W*.65+accumulated/degree[:,None]*.35
# Four largest normalized influences retain glTF-compatible smooth knee/elbow/shoulder blending.
for vertex in body.data.vertices:
 weights=W[vertex.index];keep=np.argsort(weights)[-4:];total=sum(weights[i] for i in keep)
 for group in body.vertex_groups:group.remove([vertex.index])
 for i in keep:
  if weights[i]>1e-5:body.vertex_groups[int(i)].add([vertex.index],float(weights[i]/total),'REPLACE')
arm.data.pose_position='POSE'


def rigid(ob,bone):return bind(ob,lambda p:{bone:1})
# Curved plate carrier fits chest surface; cloth side panels wrap the ribcage.
vest_specs=[(1.105,.171,.134,.008),(1.15,.190,.146,.007),(1.28,.224,.152,.004),(1.37,.224,.145,0),(1.40,.192,.128,0)]
vest=axial('Fitted woven plate carrier',[((0,y,z),rx,rz) for y,rx,rz,z in vest_specs],40,'vest')
bind(vest,lambda p:{'spine':1-smooth(1.10,1.34,p.y),'chest':smooth(1.10,1.34,p.y)})
for s,side in [(-1,'l'),(1,'r')]:
 # Vertical shoulder straps follow a low curved ridge; rectangular pouches read as sewn gear.
 strap=curve_tube('Webbing shoulder strap '+side,[(s*.145,1.34,.143),(s*.16,1.43,.09),(s*.156,1.46,-.005),(s*.15,1.42,-.100),(s*.145,1.34,-.143)],.020,'vest',10);rigid(strap,'chest')
 for y in [1.20,1.25,1.30,1.35]:rigid(box('MOLLE sewn webbing',(s*.103,y,.153),(.16,.011,.014),'cloth',.003),'chest')
 for j in range(2):
  x=s*(.046+j*.083);rigid(box('Woven ammunition pouch',(x,1.165,.178),(.074,.130,.066),'vest',.014),'spine');rigid(box('Pouch flap',(x,1.211,.215),(.073,.035,.012),'cloth',.004),'spine')
 pocket=box('Tailored cargo pocket '+side,(s*.190,.735,-.004),(.043,.173,.147),'cloth',.016);rigid(pocket,'thigh_'+side)
 flap=box('Cargo flap '+side,(s*.214,.794,.003),(.012,.044,.144),'vest',.005);rigid(flap,'thigh_'+side)
 # Thin real seams run with the continuous garment instead of separating limb sections.
 seam=curve_tube('Trouser outseam '+side,[(s*.195,.85,-.018),(s*.195,.71,-.008),(s*.177,.59,.005),(s*.172,.51,.012),(s*.176,.39,-.015),(s*.155,.28,-.016),(s*.144,.18,0)],.0016,'vest',6);bind(seam,garment_weights)
# Belt wraps pelvis, buckle is a small hardware detail.
belt=axial('Woven utility belt',[((0,.985,-.006),.171,.123),((0,1.025,-.006),.169,.120)],40,'dark');rigid(belt,'hips');rigid(box('Belt buckle',(0,1.006,.121),(.061,.036,.012),'metal',.003),'hips')

# Boots with an anatomically shaped last, continuous ankle/toe vamp, toe cap and tread sole.
BOOT_VERTS={}
for side,s in [('l',-1),('r',1)]:
 x=s*.108;ankle=Vector((x,.115,0))
 boot_specs=[(.012,.064,.143,.057),(.033,.070,.150,.061),(.073,.068,.143,.064),(.115,.059,.118,.047),(.155,.045,.073,.016),(.205,.044,.052,-.005)]
 boot=axial('Leather combat boot '+side,[((x,y,z),rx,rz) for y,rx,rz,z in boot_specs],32,'rubber');rigid(boot,'foot_'+side)
 sole=axial('Treaded rubber sole '+side,[((x,.004,.062),.071,.151),((x,.026,.062),.073,.153),((x,.035,.062),.070,.150)],32,'dark');rigid(sole,'foot_'+side)
 for j in range(6):
  z=.027+j*.018;y=.166-j*.014;lace=curve_tube('Boot cross lace '+side,[(x-.027,y,z),(x,y+.002,z+.008),(x+.027,y,z)],.0021,'vest',6);rigid(lace,'foot_'+side)
 BOOT_VERTS[side]=[G(v.co)-ankle for ob in [boot,sole] for v in ob.data.vertices]

# A readable human face with continuous jaw, cheek, temple, brow and modeled nose planes.
def head_shape(y,a):
 specs=[(1.455,.062,.060,-.006),(1.49,.064,.063,-.004),(1.525,.068,.063,.012),(1.545,.082,.076,.012),(1.575,.100,.085,.004),(1.615,.111,.092,0),(1.655,.113,.095,-.002),(1.695,.112,.095,-.006),(1.735,.101,.087,-.012),(1.770,.074,.062,-.012),(1.793,.023,.022,-.012),(1.8,.001,.001,-.012)]
 for j in range(len(specs)-1):
  if specs[j][0]<=y<=specs[j+1][0]:
   a0,a1=specs[j],specs[j+1];before=specs[max(0,j-1)];after=specs[min(len(specs)-1,j+2)];dy=a1[0]-a0[0];t=(y-a0[0])/dy
   values=[]
   for k in [1,2,3]:
    m0=(a1[k]-before[k])/(a1[0]-before[0]);m1=(after[k]-a0[k])/(after[0]-a0[0]);values.append((2*t**3-3*t**2+1)*a0[k]+(t**3-2*t**2+t)*dy*m0+(-2*t**3+3*t**2)*a1[k]+(t**3-t**2)*dy*m1)
   rx,rz,cz=values;rx=max(.001,rx);rz=max(.001,rz);break
 else:rx,rz,cz=specs[0][1:]
 x=math.cos(a)*rx;z=math.sin(a)*rz+cz
 if math.sin(a)>.45:
  front=smooth(.45,.90,math.sin(a))
  def bump(cx,cy,sx,sy,h):return h*math.exp(-((x-cx)/sx)**2-((y-cy)/sy)**2)
  z+=front*(bump(0,1.653,.014,.041,.022)+bump(0,1.627,.019,.013,.031)+bump(-.018,1.622,.013,.010,.014)+bump(.018,1.622,.013,.010,.014)+bump(-.046,1.685,.035,.012,.007)+bump(.046,1.685,.035,.012,.007)-bump(-.043,1.664,.024,.014,.008)-bump(.043,1.664,.024,.014,.008)+bump(0,1.583,.035,.011,.008)+bump(0,1.547,.042,.016,.007))
 return Vector((x,y,z))
headverts=[];headfaces=[];N=64;R=58
for j in range(R+1):
 y=1.455+(1.80-1.455)*j/R
 for i in range(N):headverts.append(head_shape(y,i*math.tau/N))
for j in range(R):
 for i in range(N):headfaces.append((j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i))
headfaces.extend([tuple(range(N-1,-1,-1)),tuple(R*N+i for i in range(N))])
head=mesh('Continuous human head and neck',headverts,headfaces,'skin');bind(head,lambda p:{'neck':1-smooth(1.49,1.55,p.y),'head':smooth(1.49,1.55,p.y)})
for s in [-1,1]:
 # Eyes sit in sculpted orbital hollows and remain proportionate to the larger head.
 rigid(oval('Eye sclera',(s*.042,1.664,.086),(.0165,.0055,.004),'skin',EYE,20,10),'head')
 rigid(oval('Hazel iris',(s*.042,1.664,.0915),(.0057,.0057,.0015),'skin',IRIS,16,10),'head')
 rigid(curve_tube('Upper eyelid',[(s*.024,1.666,.089),(s*.042,1.672,.092),(s*.060,1.666,.088)],.0020,'skin',8),'head')
 rigid(curve_tube('Eyebrow',[(s*.021,1.687,.089),(s*.043,1.690,.096),(s*.071,1.684,.084)],.0024,'dark',8),'head')
 # Ears use a contoured rim and concha inset rather than a round ball.
 earpts=[(s*.109,1.681,.003),(s*.125,1.669,.006),(s*.129,1.646,.008),(s*.120,1.628,.013),(s*.111,1.637,.014)]
 rigid(curve_tube('Anatomical ear helix',earpts,.006,'skin',10),'head')
 rigid(oval('Ear concha',(s*.115,1.652,.006),(.010,.018,.009),'skin',None,16,10),'head')
rigid(curve_tube('Defined mouth',[(-.030,1.584,.090),(-.015,1.586,.096),(0,1.584,.098),(.015,1.586,.096),(.030,1.584,.090)],.0019,'skin',8),'head')
# Short textured hair follows the actual cranium with an irregular anatomical hairline.
hv=[];hf=[];HN=64;HR=18
for j in range(HR+1):
 for i in range(HN):
  a=i*math.tau/HN;front=(math.sin(a)+1)/2;base=1.664+.059*front+ .004*math.sin(a*5);y=base+(1.799-base)*j/HR;p=head_shape(y,a);p+=Vector((math.cos(a),.2,math.sin(a)))*(.002+.0008*math.sin(i*11+j*7));hv.append(p)
for j in range(HR):
 for i in range(HN):hf.append((j*HN+i,j*HN+(i+1)%HN,(j+1)*HN+(i+1)%HN,(j+1)*HN+i))
rigid(mesh('Close cropped hair silhouette',hv,hf,'dark',HAIR),'head')

# Anatomically connected gloves are lofted/remeshed together; no separate joint balls.
for side,s in [('l',-1),('r',1)]:
 shoulder,elbow,wrist=ARM[side];direction=(wrist-elbow).normalized();A=Vector((0,0,1));A=(A-direction*A.dot(direction)).normalized();B=direction.cross(A).normalized()
 # Local glove axes X across palm / Y knuckle side / Z forward from wrist.
 X=A;Y=B;Z=direction
 def handp(p):return wrist+X*p[0]+Y*p[1]+Z*p[2]
 def glove_loft(name,localpts,rads):
  return tube_loft(name,[handp(p) for p in localpts],rads,20,'dark')
 sources=[glove_loft('Anatomical glove palm '+side,[(0,0,-.015),(0,0,.018),(0,0,.052),(0,-.002,.093),(0,-.004,.113)],[(.033,.031),(.038,.030),(.048,.032),(.044,.030),(.032,.024)])]
 for j in range(4):
  x=(j-1.5)*.021;length=[.041,.057,.054,.045][j if s>0 else 3-j]
  sources.append(glove_loft('Continuous glove finger '+side,[(x,0,.095),(x,.001,.111),(x,-.015,.111+length*.60),(x,-.043,.111+length*.7),(x,-.055,.111+length*.43)],[(.012,.012),(.011,.011),(.010,.010),(.009,.009),(.006,.007)]))
 sources.append(glove_loft('Opposed thumb '+side,[(-s*.033,0,.030),(-s*.054,-.004,.060),(-s*.063,-.021,.091),(-s*.046,-.041,.113)],[(.017,.016),(.015,.014),(.013,.012),(.009,.010)]))
 glove=unify(sources,'Continuous gloved hand '+side,.004,.64,'rubber');rigid(glove,'hand_'+side)
 # Wrist joining textile strip follows the garment silhouette; hand keeps physical palm size.

# Attach all skinned meshes to the root through rig; no production files are mutated.
# Socket offset is expressed from the hand's anatomical frame, remaining receiver-space +Z.
def frame(head,tail,normal=(1,0,0)):
 y=V(Vector(tail)-Vector(head)).normalized();x=V(normal);x=(x-y*x.dot(y)).normalized();z=x.cross(y).normalized();x=y.cross(z).normalized();M=Matrix((x,y,z)).transposed().to_4x4();M.translation=V(head);return M
hand_reference=frame((0,0,0),(0,0,.125),(1,0,0))
socket=bpy.data.objects.new('weapon_socket',None);bpy.context.collection.objects.link(socket);socket.parent=arm;socket.parent_type='BONE';socket.parent_bone='hand_r';socket.matrix_parent_inverse=Matrix.Identity(4)
socket.matrix_basis=Matrix.Translation((0,-arm.data.bones['hand_r'].length,0)) @ hand_reference.inverted() @ Matrix.Translation(V((0,.175,.14)))
socket['contract']='receiver origin, +Z forward/+Y up in idle and aim; child of right (+X) hand_r'

# Pose generation uses anatomical 2-bone IK and explicit heel/toe contact constraints.
def rotate_game(v,angle,axis=(1,0,0)):return Quaternion(Vector(axis),angle)@Vector(v)
def ik(a,target,L1,L2,pole):
 a=Vector(a);target=Vector(target);d=target-a;dist=min(d.length,L1+L2-.00001);direction=d.normalized();q=Vector(pole)-a;q=(q-direction*q.dot(direction)).normalized();along=(L1*L1-L2*L2+dist*dist)/(2*dist);h=math.sqrt(max(1e-10,L1*L1-along*along));mid=a+direction*along+q*h;end=a+direction*dist;return mid,end

def desired_pose(t,kind='idle',direction=(0,0,1)):
 # Positions remain character-local. Root translation is ALWAYS zero, including jump.
 poses={};posemeta={};moving=kind in ['walk','run','crouch_walk','prone_crawl'];crouch=kind.startswith('crouch');prone=kind.startswith('prone');run=kind=='run';phase=t%1
 hipY=.910;lean=.02;hipX=0;hipRoll=0;hipYaw=0;chestYaw=0
 if moving and not prone:
  hipY=(.46 if crouch else .890 if not run else .815)+(.010 if crouch else .012 if not run else .025)*math.cos(phase*math.tau*2)
  lean=.55 if crouch else .15 if run else .04;hipX=.014*math.sin(phase*math.tau);hipRoll=.028*math.sin(phase*math.tau);hipYaw=.045*math.sin(phase*math.tau);chestYaw=-.070*math.sin(phase*math.tau)
 elif crouch:hipY=.46;lean=.55
 elif prone:hipY=.21;lean=math.pi/2
 elif kind=='jump':
  # Crouch -> push -> compact flight -> extension -> compressed landing -> recover.
  keys=[(0,-.00),(.12,-.13),(.27,-.015),(.50,-.035),(.68,-.02),(.82,-.16),(1,0)]
  for j in range(len(keys)-1):
   if keys[j][0]<=t<=keys[j+1][0]:u=smooth(keys[j][0],keys[j+1][0],t);hipY=.93+keys[j][1]*(1-u)+keys[j+1][1]*u;break
  lean=.08+.17*math.sin(math.pi*t)**2
 else:hipY+=.0025*math.cos(t*math.tau)
 hip=Vector((hipX,hipY,0))
 def bodypoint(p):
  delta=Vector(p)-Vector((0,.93,0));delta=rotate_game(delta,lean);delta=rotate_game(delta,hipYaw,(0,1,0));delta=rotate_game(delta,hipRoll,(0,0,1));return hip+delta
 root_abs=arm.data.bones['root'].matrix_local.copy();poses['root']=root_abs
 poses['hips']=frame(hip,bodypoint((0,1.065,0)),rotate_game((1,0,0),hipRoll,(0,0,1)))
 sp=bodypoint((0,1.065,0));ch=bodypoint((0,1.285,0));neck=bodypoint((0,1.445,0));headbase=bodypoint((0,1.535,0))
 poses['spine']=frame(sp,ch,(math.cos(hipYaw),0,-math.sin(hipYaw)))
 poses['chest']=frame(ch,neck,(math.cos(chestYaw),0,-math.sin(chestYaw)))
 # Neck counters the torso lean, so the head looks along +Z while crouching/prone.
 headtilt=.04 if prone else .12 if crouch else .04 if run else 0
 headbase=neck+rotate_game((0,.09,0),headtilt)
 poses['neck']=frame(neck,headbase,(1,0,0));poses['head']=frame(headbase,headbase+rotate_game((0,.265,0),headtilt),(1,0,0))
 stance_frac=.63 if not run else .40
 for side,s in [('l',-1),('r',1)]:
  hiprest,kneerest,anklerest=LEG[side];hipjoint=bodypoint(hiprest);L1=(kneerest-hiprest).length;L2=(anklerest-kneerest).length;phi=(phase+(0 if side=='l' else .5))%1
  footX=s*.108;footZ=.018;lift=0;footangle=0
  if moving and not prone:
   stride=.39 if run else .245 if not crouch else .15
   if abs(direction[0])>.5:
    stride=.19 if run else .14 if not crouch else .09;footX=s*(.205 if run else .155 if not crouch else .13)
   if phi<stance_frac:
    u=phi/stance_frac;travel=stride*(1-2*u);footangle=(-.16*(1-smooth(0,.2,u))+.40*smooth(.70,1,u))*(1.2 if run else .7 if crouch else 1)
   else:
    u=(phi-stance_frac)/(1-stance_frac);travel=stride*(-1+2*smooth(0,1,u));lift=(.255 if run else .10 if not crouch else .07)*math.sin(math.pi*u);footangle=.28*(1-u)-.20*u
   footX+=direction[0]*travel;footZ+=direction[2]*travel
   # Backward steps retain anatomical knee poles and reverse heel/toe progression.
   if direction[2]<0:footangle*=-.70
   if abs(direction[0])>.5:footangle*=.45
  elif kind=='jump':
   tuck=math.sin(math.pi*max(0,min(1,(t-.22)/.51)))**1.2 if .22<t<.73 else 0
   lift=.29*tuck;footZ=-.11*tuck;footangle=.27*tuck
  if prone:
   phi=(phase+(0 if side=='l' else .5))%1;w=math.sin(phi*math.tau) if moving else 0
   ankle=Vector((s*(.13+.028*max(w,0)),.12+max(w,0)*.045,-.76+.12*w));pole=(s*.25,.16,-.35)
   knee,end=ik(hipjoint,ankle,L1,L2,pole);normal=(knee-hipjoint).cross(end-knee).normalized();
   if normal.x<0:normal=-normal
   poses['thigh_'+side]=frame(hipjoint,knee,normal);poses['shin_'+side]=frame(knee,end,normal)
   footdir=Vector((0,-.025,-.19));poses['foot_'+side]=frame(end,end+footdir,(1,0,0))
  else:
   rotated=[rotate_game(p,footangle) for p in BOOT_VERTS[side]];contact=-min(p.y for p in rotated);ankle=Vector((footX,contact+lift,footZ));pole=hipjoint+Vector((s*.035,-.20,.9))
   knee,end=ik(hipjoint,ankle,L1,L2,pole);normal=(knee-hipjoint).cross(end-knee).normalized()
   if normal.x<0:normal=-normal
   poses['thigh_'+side]=frame(hipjoint,knee,normal);poses['shin_'+side]=frame(knee,end,normal)
   restrot=arm.data.bones['foot_'+side].matrix_local.to_quaternion();rot=Quaternion(V((1,0,0)),footangle)@restrot;M=rot.to_matrix().to_4x4();M.translation=V(end);poses['foot_'+side]=M
  posemeta['foot_'+side]={'target':list(ankle),'phase':phi,'contact':not moving or phi<stance_frac,'solved':list(end),'targetError':round((end-ankle).length,7)}
 # Rifle-ready arms: body movement is countered through IK, not straight limb oscillation.
 receiver=Vector((.085,.86 if crouch else .32 if prone else 1.40,.50 if not prone else .84))
 if moving and not prone:receiver+=Vector((hipX*.45, .008*math.cos(phase*math.tau*2),0))
 if kind=='jump':receiver.y=1.37+(hipY-.93)*.6;receiver.z=.47
 if kind=='throw':
  pass
 for side,s in [('l',-1),('r',1)]:
  shrest,elrest,wrrest=ARM[side];shoulder=bodypoint(shrest);clavicle=bodypoint((s*.100,1.44,0));
  poses['shoulder_'+side]=frame(clavicle,shoulder,(0,0,1))
  wrist=receiver+Vector((0,-.175,-.14)) if side=='r' else receiver+Vector((-.105,-.105,.105))
  hand_forward=Vector((0,0,1));hand_normal=Vector((1,0,0));pole=shoulder+Vector((s*.46,-.30,.18))
  if kind=='reload' and side=='l':
   e=math.sin(math.pi*t)**2;wrist+=Vector((.09,-.24*e,-.14*e));hand_forward=rotate_game(hand_forward,-.40*e,(0,1,0))
  if kind=='throw' and side=='r':
   # Wind up over shoulder, release at .48, follow through low in front.
   keys=[(0,(.085,1.225,.36)),(.25,(.35,1.64,-.18)),(.45,(.26,1.72,.25)),(.58,(.12,1.50,.66)),(.80,(.10,1.20,.55)),(1,(.085,1.225,.36))]
   for j in range(len(keys)-1):
    if keys[j][0]<=t<=keys[j+1][0]:wrist=mix(keys[j][1],keys[j+1][1],smooth(keys[j][0],keys[j+1][0],t));break
   hand_forward=rotate_game((0,0,1),-.7*math.sin(math.pi*t));pole=shoulder+Vector((.55,.10,-.1))
  if prone:pole=shoulder+Vector((s*.45,-.15,.15))
  L1=(elrest-shrest).length;L2=(wrrest-elrest).length;elbow,end=ik(shoulder,wrist,L1,L2,pole);normal=(elbow-shoulder).cross(end-elbow).normalized()
  # Reversal only changes roll; keep stable normal sign between adjacent keys.
  if normal.z<0:normal=-normal
  poses['upperarm_'+side]=frame(shoulder,elbow,normal);poses['forearm_'+side]=frame(elbow,end,normal)
  poses['hand_'+side]=frame(end,end+hand_forward*.125,hand_normal)
 return poses,posemeta

bpy.context.scene.render.fps=30
CLIPS=[];DURATIONS={}
def apply_pose(poses):
 for name in REST:
  bone=arm.data.bones[name];target=poses[name];parent=bone.parent
  pre=(poses[parent.name]@parent.matrix_local.inverted()@bone.matrix_local) if parent else bone.matrix_local
  basis=pre.inverted()@target;pb=arm.pose.bones[name];pb.rotation_mode='QUATERNION';pb.location=basis.to_translation();pb.rotation_quaternion=basis.to_quaternion();pb.scale=(1,1,1)
 bpy.context.view_layer.update()

def clip(name,kind,seconds,direction=(0,0,1)):
 act=bpy.data.actions.new(name);act.use_fake_user=True;arm.animation_data_create();arm.animation_data.action=act;N=round(seconds*30)
 for frame in range(N+1):
  t=frame/N;poses,meta=desired_pose(t,kind,direction);apply_pose(poses)
  for pb in arm.pose.bones:
   pb.keyframe_insert('location',frame=frame+1,group=pb.name);pb.keyframe_insert('rotation_quaternion',frame=frame+1,group=pb.name)
 for fc in act.fcurves:
  for key in fc.keyframe_points:key.interpolation='LINEAR'
 CLIPS.append(name);DURATIONS[name]=seconds
for name,kind,seconds in [('idle','idle',2),('aim','aim',2),('walk','walk',.90),('run','run',.70),('crouch_idle','crouch_idle',2),('crouch_walk','crouch_walk',1.2),('prone_idle','prone_idle',2),('prone_crawl','prone_crawl',1.6),('jump','jump',1.0),('throw','throw',.85),('reload','reload',2.0)]:clip(name,kind,seconds)
for kind,seconds in [('walk',.90),('run',.70),('crouch_walk',1.2)]:
 for suffix,direction in [('left',(-1,0,0)),('right',(1,0,0)),('backward',(0,0,-1))]:clip(kind+'_'+suffix,kind,seconds,direction)
arm.animation_data.action=bpy.data.actions['idle'];bpy.context.scene.frame_set(1);apply_pose(desired_pose(0,'idle')[0])

# Authoring diagnostics: one continuous clothing component and real mixed-joint weights.
def components(ob):
 adjacency=[[] for _ in ob.data.vertices]
 for e in ob.data.edges:a,b=e.vertices;adjacency[a].append(b);adjacency[b].append(a)
 visited=set();sizes=[]
 for start in range(len(adjacency)):
  if start in visited:continue
  stack=[start];visited.add(start);count=0
  while stack:
   i=stack.pop();count+=1
   for j in adjacency[i]:
    if j not in visited:visited.add(j);stack.append(j)
  sizes.append(count)
 return sorted(sizes,reverse=True)
def actual_bounds():
 deps=bpy.context.evaluated_depsgraph_get();vs=[]
 for ob in SKINNED:
  eo=ob.evaluated_get(deps);me=eo.to_mesh();vs.extend(G(eo.matrix_world@v.co) for v in me.vertices);eo.to_mesh_clear()
 lo=[min(v[i] for v in vs) for i in range(3)];hi=[max(v[i] for v in vs) for i in range(3)]
 return {'min':[round(v,5) for v in lo],'max':[round(v,5) for v in hi],'width':round(hi[0]-lo[0],5),'height':round(hi[1]-lo[1],5),'length':round(hi[2]-lo[2],5)}
joint_stats={}
for side in ['l','r']:
 for label,boneA,boneB in [('knee','thigh_'+side,'shin_'+side),('elbow','upperarm_'+side,'forearm_'+side)]:
  ia=body.vertex_groups[boneA].index;ib=body.vertex_groups[boneB].index;values=[]
  for v in body.data.vertices:
   w={g.group:g.weight for g in v.groups}
   if w.get(ia,0)>.02 and w.get(ib,0)>.02:values.append((w[ia],w[ib]))
  joint_stats[label+'_'+side]={'mixedVertices':len(values),'parentWeightRange':[round(min(v[0] for v in values),5),round(max(v[0] for v in values),5)] if values else [],'childWeightRange':[round(min(v[1] for v in values),5),round(max(v[1] for v in values),5)] if values else []}
assert len(components(body))==1,components(body)
assert all(s['mixedVertices']>30 for s in joint_stats.values()),joint_stats
anatomy={'heightMeters':1.80,'headChinY':1.535,'headTopY':1.80,'headHeightMeters':.265,'headToBodyRatio':round(1.80/.265,3),'headWidthMeters':.226,'shoulderWidthMeters':round(max(abs(G(v.co).x) for v in body.data.vertices if 1.42<G(v.co).y<1.44)*2,4),'biacromialBoneWidthMeters':.436,'garmentConnectedComponents':len(components(body)),'garmentComponentVertices':components(body),'garmentTriangles':sum(len(p.vertices)-2 for p in body.data.polygons),'totalSkinnedTriangles':sum(sum(len(p.vertices)-2 for p in ob.data.polygons) for ob in SKINNED),'jointWeights':joint_stats,'rootMotion':'none; jump uses no extra world/root lift','boneNames':list(REST)}
standing=actual_bounds();pose_bounds={}
for kind in ['idle','walk','run','crouch_idle','prone_idle','jump']:
 arm.animation_data.action=bpy.data.actions[kind];bpy.context.scene.frame_set(round(DURATIONS[kind]*30*.5)+1);apply_pose(desired_pose(.5,kind)[0]);pose_bounds[kind]=actual_bounds()
arm.animation_data.action=bpy.data.actions['idle'];bpy.context.scene.frame_set(1);apply_pose(desired_pose(0,'idle')[0])
contact_diagnostics={}
for name,kind,dirs in [('walk','walk',(0,0,1)),('run','run',(0,0,1)),('walk_left','walk',(-1,0,0)),('run_backward','run',(0,0,-1)),('crouch_walk','crouch_walk',(0,0,1))]:
 errors=[]
 for i in range(60):
  pp,meta=desired_pose(i/60,kind,dirs)
  errors.extend(v['targetError'] for v in meta.values() if v['contact'])
 contact_diagnostics[name]={'maxStanceIkErrorMeters':max(errors),'samples':len(errors)}
report={'footContact':contact_diagnostics,'revision':'0.14.0','standingBounds':standing,'anatomy':anatomy,'clips':CLIPS,'durations':DURATIONS,'poseBounds':pose_bounds,'boneContract':'same existing deform bone names, weapon_socket child of right (+X) hand_r','textureImages':['surface-atlas-basecolor','surface-atlas-normal','surface-atlas-orm']}
(OUT/(PREFIX+'-bounds.json')).write_text(json.dumps(report,indent=2)+'\n')
# Consolidate shared skin/materials into one draw group per material, preserving welded garment topology.
body_membership=body.vertex_groups.new(name='_continuous_garment_source');body_membership.add(list(range(len(body.data.vertices))),1,'REPLACE')
merged=join(SKINNED,'survivor_skinned_mesh');merged.parent=arm
skin_modifiers=[modifier for modifier in merged.modifiers if modifier.type=='ARMATURE']
for duplicate in skin_modifiers[1:]:merged.modifiers.remove(duplicate)
if not skin_modifiers:
 deformation=merged.modifiers.new('Anatomical skin deformation','ARMATURE');deformation.object=arm
SKINNED[:]=[merged]
# Self-contained GLB, original shared PBR atlas embedded as WebP.
bpy.ops.object.select_all(action='DESELECT')
for ob in [root,*root.children_recursive]:ob.select_set(True)
bpy.context.view_layer.objects.active=arm
bpy.ops.export_scene.gltf(filepath=str(OUT/(PREFIX+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_apply=False,export_image_format='WEBP',export_image_quality=87,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_nla_strips=False,export_skins=True,export_morph=False,export_extras=True,export_cameras=False,export_lights=False)
for image in bpy.data.images:
 if image.source=='FILE':image.filepath='//'+Path(image.filepath).name
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(PREFIX+'.blend')),compress=True)

# Review renders: front, side and actual baked motion poses in neutral daylight.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=False;scene.render.resolution_x=640;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world.use_nodes=True;bg=scene.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.34,.37,.41,1);bg.inputs['Strength'].default_value=.65
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Review ground';floor.data.materials.append(material('Review neutral ground',(.18,.20,.19),.95))
bpy.ops.object.light_add(type='AREA',location=V((3.5,5,4)));light=bpy.context.object;light.data.energy=420;light.data.size=5;light.rotation_euler=(V((0,1,0))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=2.05;scene.camera=camera
for name,kind,t,cam in [('front','idle',0,(0,1.05,5)),('side','idle',0,(5,1.05,0)),('run','run',.17,(3.6,1.5,4.5)),('crouch','crouch_idle',0,(3.8,1.5,4.5)),('jump','jump',.48,(3.8,1.5,4.5)),('prone','prone_idle',0,(3.5,1.9,4.5))]:
 if '--draft' in sys.argv and name!='front':continue
 arm.animation_data.action=bpy.data.actions[kind];scene.frame_set(round(DURATIONS[kind]*30*t)+1);apply_pose(desired_pose(t,kind)[0]);target=(0,.35,0) if name=='prone' else (0,.90,.25) if name=='side' else (0,.90,0);scene.render.resolution_x=900 if name=='prone' else 640;scene.render.resolution_y=640 if name=='prone' else 900;camera.data.ortho_scale=1.6 if name=='prone' else 2.05;camera.location=V((3.5,2.2,4.5) if name=='prone' else (5,1.05,.25) if name=='side' else cam);camera.rotation_euler=(V(target)-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/(PREFIX+'-'+name+'.png'));bpy.ops.render.render(write_still=True)
print('SURVIVOR_V014_EXPORTED',json.dumps(anatomy))
