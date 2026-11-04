#!/usr/bin/env python3
"""Package original design revisions; share atlas URLs rather than embed them repeatedly."""
from pathlib import Path
import sys,json,hashlib,struct
ROOT=Path(__file__).resolve().parents[1];MANIFEST=ROOT/'assets/art-manifest.json';ART=ROOT/'assets/art';ART.mkdir(exist_ok=True)
def optimize(data,assets):
 size,=struct.unpack_from('<I',data,12);doc=json.loads(data[20:20+size]);start=20+size;binary=data[start+8:] if start+8<len(data) else b'';external=[]
 textures=sorted((a for a in assets if a['kind']=='texture'),key=lambda a:-len(a['id']))
 for image in doc.get('images',[]):
  name=image.get('name','');match=next((a for a in textures if name==a['id'] or name.startswith(a['id']+'.')),None)
  if match and 'bufferView'in image:
   image.pop('bufferView');image.pop('mimeType',None);image['uri']='/assets/'+Path(match['path']).name;external.append(match['id'])
 refs=set()
 def visit(node,callback):
  if isinstance(node,dict):
   for k,v in list(node.items()):
    if k=='bufferView':callback(node,k,v)
    elif k!='bufferViews':visit(v,callback)
  elif isinstance(node,list):
   for v in node:visit(v,callback)
 visit(doc,lambda n,k,v:refs.add(v));remap={};views=[];out=bytearray()
 for index,view in enumerate(doc.get('bufferViews',[])):
  if index not in refs:continue
  if view.get('buffer',0)!=0:raise ValueError('Unexpected external geometry buffer')
  while len(out)%4:out.append(0)
  old=view.get('byteOffset',0);new=dict(view,byteOffset=len(out));out.extend(binary[old:old+view['byteLength']]);remap[index]=len(views);views.append(new)
 visit(doc,lambda n,k,v:n.__setitem__(k,remap[v]));doc['bufferViews']=views;doc['buffers']=[{'byteLength':len(out)}]
 while len(out)%4:out.append(0)
 encoded=json.dumps(doc,separators=(',',':'),ensure_ascii=False).encode()
 while len(encoded)%4:encoded+=b' '
 total=12+8+len(encoded)+8+len(out);glb=struct.pack('<III',0x46546c67,2,total)+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(out),0x004e4942)+out
 return glb,external
m=json.loads(MANIFEST.read_text())
for path in sys.argv[1:]:
 patch=json.loads(Path(path).read_text());replaced={a['id'] for a in patch.get('assets',[])};m['assets']=[a for a in m['assets'] if a['id']not in replaced and not(a['id']=='character' and 'survivor'in patch.get('models',{}))]
 for a in patch.get('assets',[]):
  raw=(ROOT/a.get('sourcePath',a['path'])).read_bytes();data,external=optimize(raw,m['assets']+patch.get('assets',[])) if a['kind']=='model' else (raw,[]);digest=hashlib.sha256(data).hexdigest();ext='glb'if a['kind']=='model'else Path(a['path']).suffix.lstrip('.');dest=ART/(digest+'.'+ext);dest.write_bytes(data);entry={**a,'sha256':digest,'size':len(data),'path':str(dest.relative_to(ROOT))};
  if external:entry['externalTextures']=external;entry['originalSha256']=hashlib.sha256(raw).hexdigest()
  m['assets'].append(entry);print(a['id'],len(raw),'->',len(data),'bytes;',len(external),'shared textures')
 for key in ['models','materials','impostors']:
  m.setdefault(key,{}).update(patch.get(key,{}))
 if patch.get('anatomy'):m['anatomy']=patch['anatomy']
 if patch.get('treeSpecies')or patch.get('species'):m['treeSpecies']=patch.get('treeSpecies',patch.get('species'))
 m['revision']='0.14.0'
MANIFEST.write_text(json.dumps(m,indent=2,ensure_ascii=False)+'\n')
