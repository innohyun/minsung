/** User-selected A illustrations, native-resolution sampling and stable layered world scroll. */
(function(P){
  'use strict';
  const meta=JSON.parse(P.SOURCE_FILES['assets/a-world.json']),layers=new Map(),C=P.CONFIG;
  const seed=n=>{const a=Math.sin(n*127.1+3.1)*43758.5453;return a-Math.floor(a);},clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
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
    // Mid-distance silhouettes share a second camera transform, anchored to stable world IDs.
    if(biome!=='cave')for(const a of P.Art.anchors(camera,.68,900)){c.save();c.globalAlpha=.25;sprite(c,theme==='amber'?'arch':'tree',a.x,530-cy*.68,260,250);c.restore();}
  }
  function groundY(room,x){return C.ground+P.World.height(room,x);}
  function trail(c,points,width,color){c.beginPath();points.forEach(([x,y],n)=>n?c.lineTo(x,y):c.moveTo(x,y));c.lineCap='round';c.lineJoin='round';c.lineWidth=width;c.strokeStyle=color;c.stroke();}
  function branchPoints(room,p,left,right){
    const points=[],start=Math.max(p.x,left),end=Math.max(start,right),direction=p.direction||-1;
    // Leave the junction tangentially, then keep curving into the next ground plane.
    // An endless horizontal strip in the trees made the old fork look like a raised beam.
    for(let x=start;x<=end+12;x+=12){const d=Math.max(0,x-p.x),bend=d<380?d*d/1520:d*.5-95;points.push([x,groundY(room,x)+direction*bend]);}return points;
  }
  function zone(room,x,theme){
    if(room.biome==='cave')return 'cave';if(room.biome==='camp')return 'camp';if(theme==='amber')return 'ruins';if(theme==='brook')return 'river';
    return ['forest','camp','forest','roots','ruins'][Math.min(4,Math.floor(x/3400))]||'forest';
  }
  function road(c,g){
    const room=g.room,cam=g.camera,cy=g.cameraY||0,cave=room.biome==='cave',amber=g.map.theme==='amber';c.save();c.translate(-cam,-cy);
    const top=C.ground-135,grad=c.createLinearGradient(0,top,0,820);grad.addColorStop(0,cave?'#8a9a8600':'#aebd9100');grad.addColorStop(.4,cave?'#97a58ba8':amber?'#b9b08db3':'#acba90b3');grad.addColorStop(1,cave?'#86947e':amber?'#b0aa84':'#9fae84');
    c.beginPath();c.moveTo(cam-30,930+cy);for(let x=cam-30;x<cam+1330;x+=12)c.lineTo(x,groundY(room,x)-155);c.lineTo(cam+1340,930+cy);c.closePath();c.fillStyle=grad;c.fill();
    const color=cave?'#b4b598':amber?'#dccba6':'#e3d3a8',width=C.roadBottom-C.roadTop;
    // Branches join at the full trail width and continue beyond the viewport; no capped tip or endpoint prop.
    const branches=cave?[]:room.portals.filter(p=>!p.secret).map(p=>branchPoints(room,p,cam-40,cam+1340));
    for(const points of branches){
      for(const [extra,alpha] of [[140,.06],[105,.10],[70,.17],[38,.27]]){c.globalAlpha=alpha;trail(c,points,width+extra,amber?'#b7b18a':'#b0bc92');}c.globalAlpha=1;
      trail(c,points,width+16,'#c4c39988');trail(c,points,width,color);
      points.forEach(([x,y],n)=>{if(n%4)return;c.globalAlpha=.20;c.fillStyle='#ae9970';c.beginPath();c.ellipse(x,y+(seed(x)-.5)*72,4,1.3,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
        sprite(c,'grass',x,y-width/2-2,28,16);sprite(c,'grass',x+7,y+width/2+12,28,16);});
    }
    const points=[];for(let x=cam-40;x<cam+1340;x+=12)points.push([x,groundY(room,x)]);trail(c,points,width+14,cave?'#a6ac8e66':'#c2c49866');trail(c,points,width,color);
    // Soil marks and rough margins are fixed in world coordinates, with small fine strokes.
    for(let x=Math.floor((cam-80)/37)*37;x<cam+1400;x+=37){const i=x/37,y=groundY(room,x);c.globalAlpha=.18;c.fillStyle='#ae9970';c.beginPath();c.ellipse(x,y+(seed(i)-.5)*75,3+seed(i+11)*5,1.3,0,0,Math.PI*2);c.fill();c.globalAlpha=1;
      if(!cave&&Math.abs(i)%3===0){sprite(c,'grass',x,y-39-seed(i+4)*5,30+seed(i+2)*18,17);if(Math.abs(i)%2===0)sprite(c,'grass',x+13,y+64,33,20);}
    }
    for(let x=Math.floor((cam-150)/420)*420;!cave&&x<cam+1500;x+=420){const i=x/420,y=groundY(room,x),z=zone(room,x,g.map.theme),choices=z==='camp'?['tent','cart','well','bush']:z==='roots'?['log','tree','bush']:z==='ruins'?['arch','well','cart','log']:z==='river'?['boat','bush','bridge','tree']:['tree','bush','tent','cart','log'];
      const name=choices[Math.abs(i)%choices.length],w=name==='tree'?215:name==='tent'?235:165,h=name==='tree'?265:name==='tent'?148:name==='cart'?105:100;
      const px=x+seed(i)*55,py=y-59-seed(i+11)*23;
      if(branches.some(points=>points.some(([bx,by])=>Math.abs(bx-px)<w*.45&&Math.abs(by-py)<width*.5+28)))continue;
      sprite(c,name,px,py,w,h);
    }c.restore();
  }
  function backdrop(c,g){background(c,g.camera,g.cameraY||0,g.map.theme,g.room.biome);road(c,g);}
  function home(c,camera,theme){backdrop(c,{camera,cameraY:0,map:{theme},room:{width:16000,route:[{x:0,y:0},{x:16000,y:0}],portals:[],biome:'camp'}});}
  function landmark(c,mark,room){
    if(room.biome==='cave')return;
    // The old secret gate must not advertise the buried entrance before discovery.
    if(room.portals.some(p=>p.secret&&Math.abs(mark.x-p.x)<180))return;
    const mapping={sign:'sign',camp:'tent',pond:'boat',hollow:'tree',bridge:'bridge',arch:'arch',tower:'arch',mill:'well'},name=mapping[mark.kind]||'bush';
    if(room.portals.some(p=>!p.secret&&mark.x>p.x+80&&mark.x<p.x+900))return;
    P.World.at(c,room,mark.x,()=>{sprite(c,name,mark.x,C.ground-64,name==='bridge'?200:175,name==='tree'?250:name==='bush'?84:145);if(mark.label)P.Art.label(c,mark.label,mark.x,C.ground-220,12);});
  }
  function sign(c,p,room,x){if(p.secret)return;P.World.at(c,room,p.x,()=>{sprite(c,'sign',p.x,C.ground-51,95,150);P.Art.label(c,p.label,p.x,C.ground-215,12);if(Math.abs(p.x-x)<90)P.Art.label(c,'E · 함께 이동',p.x,C.ground-235,13);});}
  function foreground(c,g){if(g.room.biome==='cave')return;c.save();c.translate(-g.camera,-g.cameraY);for(let x=Math.floor(g.camera/390)*390;x<g.camera+1450;x+=390)sprite(c,'grass',x,C.ground+P.World.height(g.room,x)+115,80,40);c.restore();}
  Object.assign(P.World,{backdrop,sign,foreground});P.Pixel={sprite,monster,background,backgroundPlan,branchPoints,home,landmark,zone,tiles:meta['a-props'].tiles,scene};
})(globalThis.PIGGY=globalThis.PIGGY||{});
