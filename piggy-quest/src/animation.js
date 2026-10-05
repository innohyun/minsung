/** Native atlas sampling. Walking follows distance, attacks follow fixed-step combat time. */
(function(P){
  'use strict';
  const meta=JSON.parse(P.SOURCE_FILES['assets/animation-atlas.json']),surface=['slime','boar','rock','bat'];
  const cave={'cave-archer':'archer-motion','cave-charger':'charger-motion','cave-guard':'guard-motion'};
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  function frame(e){
    const row=surface.indexOf(e.type),atlas=row>=0?(e.animAttack?'surface-action':'surface-walk'):cave[e.type];
    if(!atlas)return null;
    const index=row>=0?row:(e.animAttack?1:0),frames=meta[atlas].rows[index].frames;
    let n=0;
    if(e.animAttack){
      const age=e.animAttack.age+1e-9;
      if(row>=0)n=2+Math.min(3,Math.floor(age/e.animAttack.duration*4));
      else if(e.type==='cave-archer')n=age<.2?0:age<.4?1:age<.7?2:age<.9?3:age<1.08?4:5;
      else if(e.type==='cave-charger')n=age<.35?0:age<.7?1:2+Math.floor((age-.7)*12)%4;
      else n=age<.15?0:age<.3?1:age<.5?2:age<.6?3:age<.78?4:5;
    }else n=e.type==='bat'?Math.floor((e.wingTime||0)*9)%frames.length:Math.floor((e.walkDistance||0)/Math.max(6,(P.ENEMIES[e.type].w*.9)/frames.length))%frames.length;
    return {atlas,row:index,index:clamp(n,0,frames.length-1),unit:meta[atlas].rows[row>=0?row:0].unit};
  }
  function sample(c,atlas,row,index,x,y,scale){
    const image=P.Art.images[atlas],f=meta[atlas].rows[row].frames[index];if(!image?.naturalWidth)return;
    c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(image,...f.rect,x-f.pivot[0]*scale,y-f.pivot[1]*scale,f.rect[2]*scale,f.rect[3]*scale);
  }
  function draw(c,e,def){
    const f=frame(e);if(!f)return false;
    c.save();c.translate(e.x,P.CONFIG.ground-(e.type==='bat'?64:0));c.scale(e.dir===-1?1:-1,1);if(e.hit>0)c.globalAlpha=.6;
    sample(c,f.atlas,f.row,f.index,0,0,def.h/f.unit);c.restore();return true;
  }
  function shield(c,x,y,w,h){
    // Right cell is the outward-facing right shield. Art.stick mirrors its whole rig once for left.
    const f=meta['shield-motion'].rows[0].frames[1];c.save();sample(c,'shield-motion',0,1,x,y,Math.min(w/f.rect[2],h/f.rect[3]));c.restore();
  }
  function advance(e,dt){
    e.walkDistance=(e.walkDistance||0)+Math.abs(e.x-(e.animationX??e.x));e.animationX=e.x;
    if(e.active&&e.stun<=0)e.wingTime=(e.wingTime||0)+dt;
    if(e.animAttack&&e.stun<=0){e.animAttack.age+=dt;if(e.animAttack.age>=e.animAttack.duration)e.animAttack=null;}
  }
  P.Animation={frame,draw,shield,advance,meta};
})(globalThis.PIGGY=globalThis.PIGGY||{});
