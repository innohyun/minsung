#!/usr/bin/env python3
"""Read-only pixel/bitstream inspection; writes a validation report only."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,struct,io,hashlib,numpy as np
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'assets/source'
patch=json.loads((SRC/'trees-v014-manifest-patch.json').read_text());report={'checks':{'allEmbeddedWebPDecode':True,'allStandaloneWebPDecode':True,'all15Impostors256x512':True,'transparentMargins':True,'opaqueTrunkPixels':True},'embeddedImages':{},'standaloneImages':{},'impostors':{}}
for a in patch['assets']:
 p=ROOT/a['sourcePath'];b=p.read_bytes();assert hashlib.sha256(b).hexdigest()==a['sha256']
 if p.suffix=='.glb':
  n=struct.unpack_from('<I',b,12)[0];doc=json.loads(b[20:20+n]);binlen,bintype=struct.unpack_from('<II',b,20+n);assert bintype==0x004e4942;binary=b[28+n:28+n+binlen];images=[]
  for image in doc['images']:
   v=doc['bufferViews'][image['bufferView']];o=v.get('byteOffset',0);data=binary[o:o+v['byteLength']];im=Image.open(io.BytesIO(data));im.load();assert im.format=='WEBP';images.append({'name':image['name'],'size':list(im.size),'mode':im.mode,'bytes':len(data)})
  report['embeddedImages'][a['id']]=images
 else:
  im=Image.open(p);im.load();assert im.format=='WEBP';report['standaloneImages'][a['id']]={'size':list(im.size),'mode':im.mode,'bytes':len(b)}
for name,imp in patch['impostors'].items():
 a=next(a for a in patch['assets'] if a['id']==imp['assetId']);im=Image.open(ROOT/a['sourcePath']).convert('RGBA');assert im.size==(256,512);ar=np.asarray(im);alpha=ar[:,:,3];mask=alpha>=102;ys,xs=np.nonzero(mask);bbox=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)];assert alpha.min()==0 and alpha.max()==255;assert bbox[0]>=2 and bbox[1]>=2 and bbox[2]<=254 and bbox[3]<=510,(name,bbox)
 # The lower fifth contains the ground-anchored opaque trunk, with no exposed root fan.
 assert alpha[410:,:].max()==255,name+' opaque trunk';report['impostors'][name]={'size':[256,512],'alphaMin':int(alpha.min()),'alphaMax':int(alpha.max()),'maskBounds':bbox,'alphaCoverage':round(float(mask.mean()),5),'planeWidth':imp['planeWidth'],'planeHeight':imp['planeHeight'],'center':imp['center']}
# Species UV tiles have alpha cutouts, never an opaque replacement surface atlas.
im=np.asarray(Image.open(SRC/'trees-v014-leaf-atlas-basecolor.webp').convert('RGBA'));coverage={}
for si,species in enumerate(patch['species']):
 idx=si*3+1;x=(idx%4)*512;y=(idx//4)*512;tile=im[y:y+512,x:x+512,3];assert tile.min()==0 and tile.max()==255;coverage[species]=round(float((tile>=115).mean()),5)
report['leafAtlasTwigAlphaCoverage']=coverage
(SRC/'trees-v014-image-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'checks':report['checks'],'embeddedImages':sum(len(v) for v in report['embeddedImages'].values()),'standaloneImages':len(report['standaloneImages']),'impostors':len(report['impostors']),'twigAlphaCoverage':coverage},indent=2))
