/** Layered Canvas scenery and procedural joint animation. Assets remain replaceable. */
(function(P){
  'use strict';
  const images={}, C=P.CONFIG;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);c.fill();};
  const line=(c,points,color,width)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();};
  function image(c,name,x,y,w,h,alpha=1){const img=images[name];if(!img?.complete||!img.naturalWidth)return;c.save();c.globalAlpha*=alpha;c.drawImage(img,x-w/2,y-h,w,h);c.restore();}
  async function init(){await Promise.all(['bow','arrow','quiver','fire-jet','bat-projectile','sword-sprites','fireball','fireburst-burning','forest-continuation','forest-joined','ruins-continuation','brook-continuation','cave-continuation','surface-walk','surface-action','archer-motion','charger-motion','guard-motion','shield-motion','a-scenery','a-props','cave-monsters','pig','slime','boar','rock','bat','chest','coin','potion','repair'].map(name=>new Promise(resolve=>{const img=new Image();images[name]=img;img.onload=resolve;img.onerror=resolve;const text=P.SOURCE_FILES?.['assets/'+name+'.svg'];img.src=text?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(text):'assets/'+name+'.svg';})));}
  function tree(c,x,y,s,variant,alpha=1){
    c.save();c.translate(x,y);c.scale(s,s);c.globalAlpha*=alpha;
    c.fillStyle=variant?'#718769':'#5f7d67';c.beginPath();c.moveTo(-13,0);c.lineTo(-8,-165);c.lineTo(-30,-222);c.lineTo(0,-195);c.lineTo(21,-252);c.lineTo(12,-163);c.lineTo(24,0);c.fill();
    const colors=variant?['#a5b68a','#91a878','#bdc799','#92a775']:['#8ca477','#6f8d68','#a2b482','#819d6e'];
    for(let i=0;i<6;i++){const a=i*2.3+variant;ellipse(c,Math.sin(a)*61,-209+Math.cos(a*1.2)*38,63+(i%3)*9,64+(i%2)*12,colors[i%4]);}
    c.globalAlpha*=.3;ellipse(c,0,-260,55,17,'#e5e5ba');c.restore();
  }
  function rock(c,x,y,s){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='#91a187';c.beginPath();c.moveTo(-27,0);c.lineTo(-18,-19);c.lineTo(5,-29);c.lineTo(26,-11);c.lineTo(32,0);c.fill();c.fillStyle='#bfccb0';c.beginPath();c.moveTo(-18,-19);c.lineTo(5,-29);c.lineTo(26,-11);c.lineTo(-2,-8);c.fill();c.restore();}
  function anchors(camera,speed,spacing,margin=340){
    const offset=camera*speed,first=Math.floor((offset-margin)/spacing),last=Math.ceil((offset+1280+margin)/spacing);
    return Array.from({length:last-first+1},(_,n)=>{const id=first+n;return {id,worldX:id*spacing,x:id*spacing-offset};});
  }
  const seed=id=>{const n=Math.sin(id*127.1+3.1)*43758.5453;return n-Math.floor(n);};
  function scenery(c,camera,time,theme='forest',cave=false){
    if(P.Pixel){P.Pixel.home(c,camera,theme);return;}
    const amber=theme==='amber',brook=theme==='brook';
    const g=c.createLinearGradient(0,0,0,720);
    g.addColorStop(0,cave?'#a4b5a2':amber?'#eedbbd':brook?'#d6e7df':'#dfe7ce');
    g.addColorStop(1,cave?'#718e7a':amber?'#c8b591':brook?'#e5ebd5':'#ecedd2');c.fillStyle=g;c.fillRect(0,0,1280,720);
    if(!cave){ellipse(c,930,126,36,36,amber?'#ffe0a9':'#fff7d3');c.globalAlpha=.5;
      for(const a of anchors(camera,.07,389)){const y=80+(Math.abs(a.id)%3)*44;ellipse(c,a.x,y+8,98,12,'#ffffea');ellipse(c,a.x+20,y,58,17,'#ffffea');}c.globalAlpha=1;}
    for(let layer=0;layer<3;layer++){
      const speed=[.12,.32,.62][layer],yy=[490,530,550][layer];
      c.globalAlpha=[.26,.31,.18][layer];c.fillStyle=amber?'#a88f73':brook?'#779a8a':'#829e81';
      c.beginPath();c.moveTo(0,720);for(let x=-80;x<=1380;x+=40)c.lineTo(x,yy-35+Math.sin((x+camera*speed)/410)*44);c.lineTo(1280,720);c.fill();c.globalAlpha=1;
      for(const a of anchors(camera,speed,340))tree(c,a.x+seed(a.id)*58,yy,[.64,.88,1.16][layer],Math.abs(a.id+layer)%2,[.27,.43,.68][layer]);
    }
    if(cave){c.globalAlpha=.42;c.fillStyle='#577063';for(const a of anchors(camera,.28,230)){c.beginPath();c.moveTo(a.x,0);c.lineTo(a.x+140,0);c.lineTo(a.x+85,90+seed(a.id)*90);c.closePath();c.fill();}c.globalAlpha=1;}
    const floor=c.createLinearGradient(0,C.roadTop,0,C.roadBottom);floor.addColorStop(0,amber?'#d4bf8f':'#d7cea0');floor.addColorStop(1,amber?'#b39a6a':'#c7bb87');c.fillStyle=floor;c.fillRect(0,C.roadTop,1280,C.roadBottom-C.roadTop);
    c.fillStyle='#acb481';c.fillRect(0,C.roadTop-6,1280,8);
    for(const a of anchors(camera,1,23,25))line(c,[[a.x,C.roadTop-2],[a.x-3,C.roadTop-12+(Math.abs(a.id)%3)*2]],'#95a06c',2);
    for(const a of anchors(camera,1,179,30)){const y=C.roadTop+24+(Math.abs(a.id)%5)*13;line(c,[[a.x,y],[a.x+13+(Math.abs(a.id)%4)*6,y]],'rgba(132,124,76,.13)',2);}
    c.fillStyle=brook?'#81a18c':'#8e9e70';c.fillRect(0,C.roadBottom,1280,720-C.roadBottom);
    for(const a of anchors(camera,1.12,270)){rock(c,a.x+86,720,.85);c.save();c.translate(a.x+35,716);c.rotate(-.3);for(let n=0;n<4;n++)ellipse(c,n*8,-10-n*7,9,25,brook?'#779c91':'#789b80');c.restore();}
    for(const a of anchors(camera,.14,111,30))ellipse(c,a.x,220+seed(a.id)*290+Math.sin(time+a.id)*4,1.6,1.6,'rgba(255,247,183,.5)');
  }
  function landmarks(c,room,camera,theme){
    for(const mark of room.landmarks||[]){
      if(P.Pixel){P.Pixel.landmark(c,mark,room);continue;}
      if(room.bossX&&Math.abs(mark.x-(room.bossX-C.bossGateOffset))<265)continue;
      if(mark.x<camera-350||mark.x>camera+1630)continue;
      c.save();c.translate(mark.x,P.World?P.World.height(room,mark.x):0);
      const y=C.roadTop;
      if(mark.kind==='bridge'){
        c.fillStyle='#80a9a0';c.fillRect(-190,y-36,380,38);
        c.fillStyle='#ba9f71';c.fillRect(-180,y+8,360,88);
        for(let i=-180;i<180;i+=24)line(c,[[i,y+8],[i,y+94]],'#977e56',2);
        for(const side of [-1,1]){line(c,[[side*170,y-42],[side*170,y+8]],'#7e7955',7);}
        line(c,[[-176,y-29],[0,y-16],[176,y-29]],'#999169',5);
      }else if(mark.kind==='mill'){
        c.fillStyle='#a79a72';c.fillRect(-125,y-142,145,142);c.fillStyle='#7f8a64';c.beginPath();c.moveTo(-148,y-140);c.lineTo(-56,y-211);c.lineTo(41,y-140);c.fill();
        c.fillStyle='#536d61';c.fillRect(-80,y-68,41,68);ellipse(c,48,y-69,72,72,'#a79262');ellipse(c,48,y-69,54,54,'#c5b18a');
        for(let i=0;i<8;i++){const a=i*Math.PI/4;line(c,[[48,y-69],[48+Math.cos(a)*66,y-69+Math.sin(a)*66]],'#857953',7);}ellipse(c,48,y-69,12,12,'#80744f');
      }else if(mark.kind==='pond'){
        ellipse(c,0,y-28,172,31,'#86b4a4');ellipse(c,12,y-35,123,12,'#b9d8c4');
        for(let i=0;i<7;i++){const x=-155+i*49;line(c,[[x,y-4],[x+8,y-65]],'#79966c',3);ellipse(c,x+8,y-68,3,10,'#9b895c');}
      }else if(mark.kind==='arch'||mark.kind==='tower'){
        const h=mark.kind==='tower'?255:176;c.fillStyle=theme==='amber'?'#b29d78':'#9bab91';
        c.fillRect(-84,y-h,40,h);c.fillRect(44,y-h,40,h);c.fillRect(-84,y-h,168,35);
        for(let n=0;n<5;n++)line(c,[[-84,y-h+n*37],[-44,y-h+n*37]],'#849279',2);
        ellipse(c,-62,y-h-5,31,10,'#86a372');ellipse(c,58,y-h-7,36,12,'#8ba879');
      }else if(mark.kind==='hollow'){
        c.fillStyle='#8b8d61';c.beginPath();c.roundRect(-80,y-240,160,242,[66,66,12,12]);c.fill();
        ellipse(c,0,y-57,39,53,'#465d46');line(c,[[-64,y-90],[-97,y-14],[-135,y]],'#8b8d61',14);
        tree(c,0,y-210,.55,1,.75);
      }else if(mark.kind==='crystal'){
        for(let n=0;n<4;n++){const x=-65+n*33,h=43+(n%3)*22;c.fillStyle=['#a5c9b5','#c7dfc9','#84b3a7'][n%3];c.beginPath();c.moveTo(x,y);c.lineTo(x-12,y-h*.6);c.lineTo(x+3,y-h);c.lineTo(x+18,y-h*.6);c.lineTo(x+12,y);c.fill();}
      }else{
        line(c,[[0,y-75],[0,y]],'#8a8261',8);c.fillStyle='#b7b691';c.beginPath();c.roundRect(-60,y-84,120,40,7);c.fill();label(c,mark.label||'모험의 길',0,y-59,12,'#506c50');
      }
      c.restore();
    }
  }
  function stick(c,x,y,o={}){
    const rig=P.Motion.pose(o),body=o.color||'#294a40';
    const {hip,shoulder,rearShoulder,frontShoulder,head,rearFoot,frontFoot,rearHand,frontHand,rearElbow,frontElbow,rearKnee,frontKnee}=rig;
    c.save();c.translate(x,y);c.scale((o.scale||1)*(o.dir||1),o.scale||1);
    if(o.knock){const q=o.knock.stage==='air'?Math.min(1,o.knock.age/.3):o.knock.stage==='down'?1:1-Math.min(1,o.knock.age/.32);const angle=q*Math.PI*.48;if(o.knock.stage!=='air')c.translate(0,94*(1-Math.cos(angle))-7*Math.sin(angle));c.translate(0,-94);c.rotate(-angle);c.translate(0,94);}
    const limb=(a,mid,b,width=6.5)=>line(c,[a,mid,b],body,width);
    if(rig.spinArc>0){c.save();c.globalAlpha=rig.spinArc*.35;c.strokeStyle='#c3ad76';c.lineWidth=5;c.beginPath();c.ellipse(hip[0],hip[1]+20,94,45,-.3,-1.1,1.2);c.stroke();c.restore();}
    if(o.companionId==='archer')P.Companions?.backWeapon(c,o,rig);
    c.globalAlpha=.75;limb(hip,rearKnee,rearFoot);c.globalAlpha=1;
    line(c,[hip,[(hip[0]+shoulder[0])*.5,(hip[1]+shoulder[1])*.5],shoulder],body,7);
    line(c,[shoulder,[head[0],head[1]+13]],body,5.5);
    limb(hip,frontKnee,frontFoot);
    const rearActive=rig.attackArm==='rear';
    const arm=(anchor,elbow,hand,alpha)=>{c.globalAlpha=alpha;limb(anchor,elbow,hand);if(o.pose==='punch')ellipse(c,hand[0],hand[1],4.4,4.4,body);c.globalAlpha=1;};
    if(rearActive){arm(frontShoulder,frontElbow,frontHand,.75);arm(rearShoulder,rearElbow,rearHand,1);}
    else{arm(rearShoulder,rearElbow,rearHand,o.carrying?1:.75);arm(frontShoulder,frontElbow,frontHand,1);}
    for(const [i,foot] of [rearFoot,frontFoot].entries())line(c,[[foot[0]-3,foot[1]-(i===0?rig.turn*4:0)],[foot[0]+7,foot[1]]],body,6);
    ellipse(c,head[0],head[1],13,13,'#f6f2d9');c.strokeStyle=body;c.lineWidth=4.5;c.beginPath();c.arc(head[0],head[1],13,0,Math.PI*2);c.stroke();
    line(c,[[head[0]-13,head[1]-2],[head[0]+13,head[1]-2]],o.band||'#dbbc70',3);
    line(c,[[head[0]-12,head[1]-2],[head[0]-24,head[1]+1],[head[0]-28,head[1]-2]],o.band||'#dbbc70',2.5);
    if(o.shield)P.Animation.shield(c,frontHand[0],frontHand[1]+24,34,58);
    if(o.pose==='dig'){c.save();c.translate(38,-58);c.rotate(-.6+Math.sin((o.age||0)/.4*Math.PI)*.9);P.Pixel.sprite(c,'shovel',0,45,45,106);c.restore();}
    if(o.playerShield){
      const cy=o.blocking?-83:-112;
      P.Animation.shield(c,42,cy+68,64,140);
    }
    if(o.companionId)P.Companions?.weapon(c,o,rig);
    c.restore();
  }
  function gate(c,x,locked,remaining,name,theme){
    const y=C.ground;P.Pixel.sprite(c,'sign',x,y-51,95,150);
    label(c,locked?'깊은 곳의 입구':name,x,y-215,15);
    if(locked)label(c,'남은 몬스터 '+remaining+'마리',x,y-237,12);
  }
  function bar(c,x,y,value,max,w=70,color='#789f7e'){
    c.fillStyle='rgba(254,250,230,.8)';c.beginPath();c.roundRect(x-w/2,y,w,6,3);c.fill();c.fillStyle=color;c.beginPath();c.roundRect(x-w/2,y,w*clamp(value/max,0,1),6,3);c.fill();
  }
  function label(c,text,x,y,size=14,color='#426457'){c.font=`500 ${size}px system-ui, sans-serif`;c.textAlign='center';c.fillStyle=color;c.fillText(text,x,y);}
  P.Art={init,image,images,ellipse,line,scenery,landmarks,anchors,stick,gate,bar,label,rock};
})(globalThis.PIGGY = globalThis.PIGGY || {});
