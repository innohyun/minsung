/** Layered Canvas scenery and procedural joint animation. Assets remain replaceable. */
(function(P){
  'use strict';
  const images={}, C=P.CONFIG;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,Math.PI*2);c.fill();};
  const line=(c,points,color,width)=>{c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();};
  function image(c,name,x,y,w,h,alpha=1){const img=images[name];if(!img?.complete||!img.naturalWidth)return;c.save();c.globalAlpha*=alpha;c.drawImage(img,x-w/2,y-h,w,h);c.restore();}
  async function init(){await Promise.all(['pig','slime','boar','rock','bat','boss','chest','coin','potion','repair'].map(name=>new Promise(resolve=>{const img=new Image();images[name]=img;img.onload=resolve;img.onerror=resolve;const text=P.SOURCE_FILES?.['assets/'+name+'.svg'];img.src=text?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(text):'assets/'+name+'.svg';})));}
  function tree(c,x,y,s,variant,alpha=1){
    c.save();c.translate(x,y);c.scale(s,s);c.globalAlpha*=alpha;
    c.fillStyle=variant?'#718769':'#5f7d67';c.beginPath();c.moveTo(-13,0);c.lineTo(-8,-165);c.lineTo(-30,-222);c.lineTo(0,-195);c.lineTo(21,-252);c.lineTo(12,-163);c.lineTo(24,0);c.fill();
    const colors=variant?['#a5b68a','#91a878','#bdc799','#92a775']:['#8ca477','#6f8d68','#a2b482','#819d6e'];
    for(let i=0;i<6;i++){const a=i*2.3+variant;ellipse(c,Math.sin(a)*61,-209+Math.cos(a*1.2)*38,63+(i%3)*9,64+(i%2)*12,colors[i%4]);}
    c.globalAlpha*=.3;ellipse(c,0,-260,55,17,'#e5e5ba');c.restore();
  }
  function rock(c,x,y,s){c.save();c.translate(x,y);c.scale(s,s);c.fillStyle='#91a187';c.beginPath();c.moveTo(-27,0);c.lineTo(-18,-19);c.lineTo(5,-29);c.lineTo(26,-11);c.lineTo(32,0);c.fill();c.fillStyle='#bfccb0';c.beginPath();c.moveTo(-18,-19);c.lineTo(5,-29);c.lineTo(26,-11);c.lineTo(-2,-8);c.fill();c.restore();}
  function scenery(c,camera,time,theme='forest',cave=false){
    const amber=theme==='amber';
    const g=c.createLinearGradient(0,0,0,720);g.addColorStop(0,cave?'#a4b5a2':amber?'#ece3ca':'#dfe7ce');g.addColorStop(1,cave?'#718e7a':amber?'#c2bb99':'#ecedd2');c.fillStyle=g;c.fillRect(0,0,1280,720);
    if(!cave){ellipse(c,910-camera*.025,126,36,36,'#fff7d3');c.globalAlpha=.5;
      for(let i=0;i<5;i++){const x=((i*389-camera*.07+time*2)%1740+1740)%1740-140;ellipse(c,x,88+(i%3)*44,98,12,'#ffffea');ellipse(c,x+20,80+(i%3)*44,58,17,'#ffffea');}c.globalAlpha=1;}
    for(let layer=0;layer<3;layer++){
      const speed=[.12,.32,.62][layer],offset=-((camera*speed)%340),yy=[490,530,550][layer];
      c.globalAlpha=[.26,.31,.18][layer];c.fillStyle=amber?'#ab9474':'#829e81';
      c.beginPath();c.moveTo(0,720);for(let x=-80;x<=1380;x+=40)c.lineTo(x,yy-35+Math.sin((x+camera*speed)/410)*44);c.lineTo(1280,720);c.fill();c.globalAlpha=1;
      for(let i=-1;i<6;i++)tree(c,offset+i*340+(i%2)*48,yy,[.64,.88,1.16][layer],(i+layer)%2,[.27,.43,.68][layer]);
    }
    if(cave){c.globalAlpha=.42;c.fillStyle='#577063';for(let i=0;i<8;i++){let x=i*230-((camera*.28)%230);c.beginPath();c.moveTo(x,0);c.lineTo(x+140,0);c.lineTo(x+85,90+(i%3)*40);c.closePath();c.fill();}c.globalAlpha=1;}
    let floor=c.createLinearGradient(0,548,0,650);floor.addColorStop(0,amber?'#d4bf8f':'#d7cea0');floor.addColorStop(1,amber?'#b39a6a':'#c7bb87');c.fillStyle=floor;c.fillRect(0,550,1280,100);
    c.fillStyle='#acb481';c.fillRect(0,544,1280,8);
    for(let i=-1;i<70;i++){const x=i*23-((camera)%23);line(c,[[x,548],[x-3,538+(i%3)*2]],'#95a06c',2);}
    for(let i=0;i<23;i++){const x=((i*179-camera)%1400+1400)%1400;line(c,[[x,574+(i%5)*13],[x+13+(i%4)*6,574+(i%5)*13]],'rgba(132,124,76,.13)',2);}
    c.fillStyle='#8e9e70';c.fillRect(0,650,1280,70);
    for(let i=-1;i<8;i++){const x=i*210-((camera*1.18)%210);c.fillStyle=i%2?'#879566':'#96a879';c.beginPath();c.moveTo(x,650);c.lineTo(x+100,650);c.lineTo(x+124,720);c.lineTo(x+40,720);c.fill();}
    for(let i=-1;i<5;i++){const x=i*414-((camera*1.16)%414);rock(c,x+86,720,.85);c.save();c.translate(x+35,716);c.rotate(-.3);for(let n=0;n<4;n++)ellipse(c,n*8,-10-n*7,9,25,'#789b80');c.restore();}
    for(let i=0;i<17;i++){const x=((i*111-camera*.14+Math.sin(time*.5+i)*6)%1280+1280)%1280;ellipse(c,x,220+(i*47)%290+Math.sin(time+i)*4,1.6,1.6,'rgba(255,247,183,.5)');}
  }
  function stick(c,x,y,o={}){
    const t=o.time||0,speed=o.speed||0,dir=o.dir||1,scale=o.scale||1,body=o.color||'#294a40';
    const gait=t*(Math.abs(speed)>20?11:2.6),moving=clamp(Math.abs(speed)/190,0,1),bob=Math.sin(gait*2)*2.3*moving;
    let lean=clamp(Math.abs(speed)/230,0,1)*8,hip=[-lean*.25,-43+bob],shoulder=[lean,-82+bob],head=[lean+1,-108+bob];
    c.save();c.translate(x,y);c.scale(scale*dir,scale);
    let rearFoot=[Math.sin(gait+Math.PI)*21*moving, -Math.max(0,Math.cos(gait+Math.PI))*13*moving];
    let frontFoot=[Math.sin(gait)*21*moving, -Math.max(0,Math.cos(gait))*13*moving];
    if(moving<.05){rearFoot=[-15,0];frontFoot=[15,0];}
    if(o.air){rearFoot=[-14,-15];frontFoot=[26,-25];hip[1]-=2;}
    let rearHand=[-23-Math.sin(gait)*14*moving,-54+bob],frontHand=[23+Math.sin(gait)*14*moving,-54+bob];
    let rearElbow=[-32,-77+bob],frontElbow=[32,-77+bob];
    if(o.pose==='punch'){
      const p=(o.age||0)<.18?Math.sin(clamp((o.age||0)/.18,0,1)*Math.PI):Math.sin(clamp(((o.age||0)-.18)/.23,0,1)*Math.PI);
      shoulder[0]+=p*8;head[0]+=p*5;frontHand=[28+p*66,-82-p*2];frontElbow=[38+p*10,-81];rearHand=[10,-90];rearElbow=[-13,-62];
    }
    if(o.pose==='kick'||o.pose==='spin'){
      const p=Math.sin(clamp((o.age||0)/.43,0,1)*Math.PI);
      frontFoot=[16+p*78,-p*61];rearFoot=[-14,0];shoulder[0]-=p*15;head[0]-=p*14;frontHand=[25,-79];rearHand=[-38,-70];
    }
    if(o.pose==='dash'){shoulder[0]+=20;head[0]+=28;frontHand=[62,-78];rearHand=[-24,-58];}
    if(o.carrying){frontHand=[23,-145+bob];rearHand=[-19,-145+bob];frontElbow=[34,-110+bob];rearElbow=[-34,-110+bob];}
    if(o.hit){shoulder[0]-=8;head[0]-=12;}
    const limb=(a,mid,b,col,w=8)=>line(c,[a,mid,b],col,w);
    c.globalAlpha=.72;limb(shoulder,rearElbow,rearHand,body);limb(hip,[(hip[0]+rearFoot[0])/2-9,(hip[1]+rearFoot[1])/2],rearFoot,body);c.globalAlpha=1;
    line(c,[hip,[lean*.3,-64+bob],shoulder],body,9);
    limb(hip,[(hip[0]+frontFoot[0])/2+11,(hip[1]+frontFoot[1])/2-3],frontFoot,body);
    line(c,[[frontFoot[0]-4,frontFoot[1]],[frontFoot[0]+6,frontFoot[1]]],body,8);
    line(c,[[rearFoot[0]-4,rearFoot[1]],[rearFoot[0]+6,rearFoot[1]]],body,8);
    limb(shoulder,frontElbow,frontHand,body);
    ellipse(c,head[0],head[1],18,20,'#f6f2d9');c.strokeStyle=body;c.lineWidth=6;c.beginPath();c.ellipse(head[0],head[1],18,20,0,0,Math.PI*2);c.stroke();
    line(c,[[head[0]-20,head[1]-4],[head[0]+20,head[1]-4]],o.band||'#dbbc70',4);
    line(c,[[head[0]-17,head[1]-4],[head[0]-29,head[1]+Math.sin(t*5)*3],[head[0]-35,head[1]-3]],o.band||'#dbbc70',3);
    if(o.shield){c.fillStyle='#c8d1be';c.strokeStyle=body;c.lineWidth=3;c.beginPath();c.ellipse(28,-64,19,26,-.15,0,Math.PI*2);c.fill();c.stroke();line(c,[[28,-80],[28,-48]],'#91a89b',3);}
    c.restore();
  }
  function bar(c,x,y,value,max,w=70,color='#789f7e'){
    c.fillStyle='rgba(254,250,230,.8)';c.beginPath();c.roundRect(x-w/2,y,w,6,3);c.fill();c.fillStyle=color;c.beginPath();c.roundRect(x-w/2,y,w*clamp(value/max,0,1),6,3);c.fill();
  }
  function label(c,text,x,y,size=14,color='#426457'){c.font=`500 ${size}px system-ui, sans-serif`;c.textAlign='center';c.fillStyle=color;c.fillText(text,x,y);}
  P.Art={init,image,images,ellipse,line,scenery,stick,bar,label,rock};
})(globalThis.PIGGY = globalThis.PIGGY || {});
