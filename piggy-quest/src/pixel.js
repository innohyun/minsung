/** Generated raster atlas; source pixels are preserved and sampled with nearest-neighbour. */
(function(P){
  'use strict';
  const meta=JSON.parse(P.SOURCE_FILES['assets/pixel-world.json']),cache={};
  const seed=n=>{const a=Math.sin(n*127.1+3.1)*43758.5453;return a-Math.floor(a);};
  function tile(name){
    if(cache[name])return cache[name];const rect=meta.tiles[name],img=P.Art.images['pixel-world'];if(!rect||!img?.naturalWidth)return null;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=name==='shield'?96:128;
    const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(img,...rect,0,0,canvas.width,canvas.height);cache[name]=canvas;return canvas;
  }
  function sprite(c,name,x,y,w,h){const image=tile(name);if(!image)return;c.save();c.imageSmoothingEnabled=false;c.drawImage(image,Math.round(x-w/2),Math.round(y-h),Math.round(w),Math.round(h));c.restore();}
  function background(c,camera,cy,theme,biome){
    const name=['cave','vault'].includes(biome)?'cave':theme==='amber'?'amber':theme==='brook'?'brook':'forest';
    c.fillStyle='#e9ebd3';c.fillRect(0,0,1280,720);
    const image=tile(name);if(image){c.save();c.imageSmoothingEnabled=false;// One distant panorama avoids repeating the sun. Nearby world props provide parallax.
      c.drawImage(image,0,-40-cy*.13,1280,640);
      // The game's original pale palette stays legible behind the foreground sprites.
      c.fillStyle=name==='amber'?'#f0dfbd3b':'#e9ebd338';c.fillRect(0,0,1280,720);c.restore();
    }
    for(const a of P.Art.anchors(camera,.48,530)){c.save();c.globalAlpha=.62;sprite(c,name==='forest'?'tree':name==='brook'?'boat':'arch',a.x,515-cy*.48,310,300);c.restore();}
  }
  function road(c,g){
    const room=g.room,cam=g.camera,cy=g.cameraY||0,amber=g.map.theme==='amber',brook=g.map.theme==='brook';
    c.save();c.translate(-cam,-cy);
    c.fillStyle=brook?'#7faaa0':amber?'#aaa07c':'#9aaa83';
    c.beginPath();c.moveTo(cam-20,900+cy);for(let x=cam-20;x<cam+1310;x+=8)c.lineTo(x,600+P.World.height(room,x)-75);c.lineTo(cam+1320,900+cy);c.fill();
    // A branch is a flat band painted into the terrain. Its signed offset follows the destination.
    for(const portal of room.portals){if(portal.secret&&!g.progress.visited.includes(portal.target))continue;
      const direction=portal.direction||-1,segments=[];
      for(let n=0;n<=28;n++){const t=n/28,x=portal.x+t*330,y=600+P.World.height(room,x)+direction*t*(2-t)*112;segments.push([x,y]);}
      c.beginPath();segments.forEach(([x,y],n)=>n?c.lineTo(x,y-(20-7*n/28)):c.moveTo(x,y-20));for(let n=28;n>=0;n--){const [x,y]=segments[n];c.lineTo(x,y+(20-7*n/28));};c.closePath();c.fillStyle=amber?'#c5af88':'#cec296';c.fill();
      const end=segments[28];sprite(c,g.map.theme==='brook'?'bridge':g.map.theme==='amber'?'arch':'tree',end[0],end[1]+7,100,108);
      for(let n=6;n<26;n+=6){const [x,y]=segments[n];c.fillStyle='#796f5144';c.fillRect(Math.round(x),Math.round(y),8,3);}
    }
    for(let x=Math.floor((cam-20)/8)*8;x<cam+1310;x+=8){const y=Math.round((600+P.World.height(room,x))/4)*4;
      c.fillStyle=amber?'#9b8e6b':'#b1b17d';c.fillRect(x,y-52,9,104);
      c.fillStyle=amber?'#cbb58d':'#d2c499';c.fillRect(x,y-44,9,88);
      const i=x/8;if(Math.abs(i)%11===0){c.fillStyle='#b1a477';c.fillRect(x,y+seed(i)*32-16,12,4);}if(Math.abs(i)%7===0){c.fillStyle='#ece1b4';c.fillRect(x,y-38,8,4);}
    }
    for(let x=Math.floor(cam/350)*350;x<cam+1500;x+=350){const i=Math.round(x/350),y=600+P.World.height(room,x);
      const kinds=['cave','vault'].includes(room.biome)?['arch','log','arch']:room.biome==='camp'?['tent','cart','well']:room.biome==='roots'?['log','tree','log']:amber?['arch','cart','well']:brook?['boat','bridge','well']:['tree','tent','cart','log','well'];
      sprite(c,kinds[Math.abs(i)%kinds.length],x+seed(i)*45,y-60-seed(i+11)*26,150+seed(i+6)*65,145+seed(i+6)*60);
    }c.restore();
  }
  function backdrop(c,g){background(c,g.camera,g.cameraY||0,g.map.theme,g.room.biome);road(c,g);}
  function home(c,camera,theme){backdrop(c,{camera,cameraY:0,map:{theme},room:{width:15000,route:[{x:0,y:0},{x:15000,y:0}],portals:[],biome:'camp'}});}
  function landmark(c,mark,room){P.World.at(c,room,mark.x,()=>{const name={sign:'sign',pond:'boat',hollow:'tree',bridge:'bridge',arch:'arch',tower:'arch',crystal:'arch',mill:'well'}[mark.kind]||'tree';sprite(c,name,mark.x,535,name==='bridge'?210:180,160);if(mark.label)P.Art.label(c,mark.label,mark.x,365,12);});}
  function sign(c,p,room,x){P.World.at(c,room,p.x,()=>{sprite(c,'sign',p.x,551,112,145);P.Art.label(c,p.label,p.x,389,11);const d=p.direction>0?'↘ 내려가는 길':'↗ 올라가는 길';P.Art.label(c,d,p.x+164,600+(p.direction||-1)*58,11);if(Math.abs(p.x-x)<90)P.Art.label(c,'E · 함께 이동',p.x,365,13);});}
  function foreground(c,g){c.save();c.translate(-g.camera,-g.cameraY);for(let x=Math.floor(g.camera/240)*240;x<g.camera+1400;x+=240){const y=665+P.World.height(g.room,x);c.fillStyle=g.map.theme==='brook'?'#668e79':'#7d9167';for(let n=0;n<7;n++)c.fillRect(x+n*8,Math.round(y-seed(x+n)*14/4)*4,4,12);}c.restore();}
  Object.assign(P.World,{backdrop,sign,foreground});P.Pixel={sprite,background,home,landmark,tiles:meta.tiles};
})(globalThis.PIGGY=globalThis.PIGGY||{});
