"""Derive the mobile/distant mesh from the approved continuous survivor source."""
from pathlib import Path
import sys,subprocess,json,hashlib
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/source'
if '--blender'not in sys.argv:
 subprocess.run(['/usr/bin/blender','--background','--python',str(Path(__file__).resolve()),'--','--blender'],check=True)
 raw=(OUT/'survivor-v014-lod.glb').read_bytes();patch=json.loads((OUT/'survivor-v014-manifest-patch.json').read_text());model={**patch['models']['survivor'],'assetId':'character-lod-v014'};sha=hashlib.sha256(raw).hexdigest();data={'revision':'0.14.0','assets':[{'id':'character-lod-v014','sourcePath':'assets/source/survivor-v014-lod.glb','path':'assets/art/'+sha+'.glb','mime':'model/gltf-binary','kind':'model','sha256':sha,'size':len(raw)}],'models':{'survivor_lod':model}}
 (OUT/'survivor-v014-lod-manifest-patch.json').write_text(json.dumps(data,indent=2)+'\n');sys.exit(0)
import bpy
bpy.ops.wm.open_mainfile(filepath=str(OUT/'survivor-v014.blend'));rt=bpy.data.objects['survivor'];objects=[rt]+list(rt.children_recursive);triangles=0
for obj in objects:
 if obj.type!='MESH':continue
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
 mod=obj.modifiers.new('Lower mesh density, preserve skinned anatomy','DECIMATE');mod.ratio=.36;mod.use_collapse_triangulate=True;bpy.ops.object.modifier_move_up(modifier=mod.name)
 while obj.modifiers.find(mod.name)>0:bpy.ops.object.modifier_move_up(modifier=mod.name)
 bpy.ops.object.modifier_apply(modifier=mod.name);triangles+=sum(len(p.vertices)-2 for p in obj.data.polygons)
bpy.ops.object.select_all(action='DESELECT')
for obj in objects:obj.select_set(True)
bpy.context.view_layer.objects.active=rt
bpy.ops.export_scene.gltf(filepath=str(OUT/'survivor-v014-lod.glb'),export_format='GLB',use_selection=True,export_yup=True,export_apply=False,export_image_format='WEBP',export_image_quality=87,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_nla_strips=False,export_skins=True,export_morph=False,export_extras=True,export_cameras=False,export_lights=False)
(OUT/'survivor-v014-lod-stats.json').write_text(json.dumps({'triangles':triangles,'derivedFrom':'survivor-v014.blend','ratio':.36},indent=2)+'\n');print('SURVIVOR_LOD',triangles,'triangles')
