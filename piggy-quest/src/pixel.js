/** User-selected A illustrations, native-resolution sampling and stable layered world scroll. */
(function(P){
  'use strict';
  const meta=JSON.parse(P.SOURCE_FILES['assets/a-world.json']),layers=new Map(),C=P.CONFIG;
  const scene=(theme,biome)=>biome==='cave'?'cave':theme==='amber'?'amber':theme==='brook'?'brook':'forest';
  function sample(c,atlas,name,x,y,w,h){const image=P.Art.images[atlas],r=meta[atlas].tiles[name];if(!r||!image?.naturalWidth)return;c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(image,...r,x,y,w,h);c.restore();}
  function sprite(c,name,x,y,w,h){sample(c,'a-props',name,x-w/2,y-h,w,h);}
  function monster(c,name,x,y,w,h){sample(c,'cave-monsters',name,x-w/2,y-h,w,h);}
  function panorama(name){
    if(layers.has(name))return layers.get(name);const img=P.Art.images['a-scenery'],r=meta['a-scenery'].tiles[name];if(!img?.naturalWidth)return null;
    const canvas=document.createElement('canvas');canvas.width=r[2];canvas.height=r[3];const c=canvas.getContext('2d');c.drawImage(img,...r,0,0,r[2],r[3]);
    // Native size; only feather the overlapping strip, never quantize or shrink to 128px.
    c.globalCompositeOperation='destination-in';const fade=c.createLinearGradient(0,0,r[2],0);fade.addColorStop(0,'#fff0');fade.addColorStop(.10,'#fff');fade.addColorStop(.9,'#fff');fade.addColorStop(1,'#fff0');c.fillStyle=fade;c.fillRect(0,0,r[2],r[3]);layers.set(name,canvas);return canvas;
  }
  function backgroundPlan(camera,theme,biome){
    const offset=camera*.36,spacing=1090,name=scene(theme,biome),first=Math.floor((offset-1280)/spacing);
    return Array.from({length:4},(_,n)=>{const id=first+n;return {id,name,x:id*spacing-offset,width:1280,flip:Math.abs(id)%2===1};});
  }
  function background(c,camera,cy,theme,biome){
    c.fillStyle=biome==='cave'?'#829785':theme==='amber'?'#e8d3ac':'#e5e8ce';c.fillRect(0,0,1280,720);
    const plan=backgroundPlan(camera,theme,biome),image=panorama(plan[0].name);
    if(image)for(const a of plan){c.save();c.translate(a.x,-20-cy*.36);if(a.flip){c.translate(a.width,0);c.scale(-1,1);}c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(image,0,0,a.width,640);c.restore();}
  }
  function groundY(room,x){return C.ground+P.World.height(room,x);}
  function ground(c,g){
    // One continuous ground plane: no trails, branch strips or placed scenery props.
    // Actor feet and soil still use the same projected height as collision coordinates.
    const room=g.room,cam=g.camera,cy=g.cameraY||0,cave=room.biome==='cave',amber=g.map.theme==='amber';
    c.save();c.translate(-cam,-cy);
    const grad=c.createLinearGradient(0,C.ground-160,0,880);
    grad.addColorStop(0,cave?'#97a58b00':amber?'#d4c9ac00':'#cbd3ad00');
    grad.addColorStop(.45,cave?'#a3ad91':amber?'#d8caa5':'#ddd2a8');
    grad.addColorStop(1,cave?'#919c82':amber?'#c9bd98':'#c5c295');
    c.beginPath();c.moveTo(cam-40,940+cy);
    for(let x=cam-40;x<cam+1340;x+=12)c.lineTo(x,groundY(room,x)-170);
    c.lineTo(cam+1340,940+cy);c.closePath();c.fillStyle=grad;c.fill();c.restore();
  }
  function backdrop(c,g){background(c,g.camera,g.cameraY||0,g.map.theme,g.room.biome);ground(c,g);}
  function home(c,camera,theme){backdrop(c,{camera,cameraY:0,map:{theme},room:{width:16000,route:[{x:0,y:0},{x:16000,y:0}],portals:[],biome:'camp'}});}
  function landmark(){} // Decorative landmarks are intentionally removed.
  function sign(c,p,room,x){if(p.secret)return;P.World.at(c,room,p.x,()=>{sprite(c,'sign',p.x,C.ground-51,95,150);P.Art.label(c,p.label,p.x,C.ground-215,12);if(Math.abs(p.x-x)<90)P.Art.label(c,'E · 함께 이동',p.x,C.ground-235,13);});}
  function foreground(){}
  Object.assign(P.World,{backdrop,sign,foreground});P.Pixel={sprite,monster,background,backgroundPlan,home,landmark,tiles:meta['a-props'].tiles,scene};
})(globalThis.PIGGY=globalThis.PIGGY||{});
