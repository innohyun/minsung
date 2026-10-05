/** Side-view 2.5D route projection. Stable route distance remains the save/collision coordinate. */
(function(P){
  'use strict';
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),seed=n=>{const v=Math.sin(n*127.1+3.1)*43758.5453;return v-Math.floor(v);};
  const extra={
    wind:[['refuge','버려진 피난 야영지','camp'],['lookout','바람 전망대','lookout'],['roots','뒤엉킨 뿌리 미로','roots']],
    amber:[['court','황혼의 안뜰','ruins'],['chapel','무너진 예배당','chapel'],['quarry','붉은 채석장','quarry']],
    brook:[['reeds','안개 갈대숲','reeds'],['island','물돌이 섬','island'],['channel','옛 수로','aqueduct']]
  };
  for(const [mi,map] of P.MAPS.entries()){
    map.boss={...map.boss,hp:[980,1100,1250][mi],speed:[78,86,94][mi],attack:[19,21,23][mi]};
    const main=map.rooms.main;main.width=[17600,15500,16600][mi];main.bossX=main.width-550;
    for(let i=0;i<9;i++)main.enemies.push({id:map.id+'-extension-'+i,x:9800+i*560,type:['boar','rock','bat'][i%3]});
    main.chests.push({id:map.id+'-late-cache',x:main.width-2100,coins:220,potion:2});
    const original=Object.keys(map.rooms);
    for(const id of original.filter(id=>id!=='main')){
      const room=map.rooms[id],old=room.width;room.width+=1500;
      for(let i=0;i<3;i++)room.enemies.push({id:map.id+'-'+id+'-extended-'+i,x:old+200+i*380,type:['slime','bat','rock'][i]});
    }
    for(const [i,[id,name,biome]] of extra[map.id].entries()){
      const width=4200+i*550;
      map.rooms[id]={name,width,biome,enemies:Array.from({length:5},(_,n)=>({id:map.id+'-'+id+'-'+n,x:900+n*630,type:['slime','boar','bat','rock'][n%4]})),
        chests:[{id:map.id+'-'+id+'-cache',x:width-430,coins:130+i*35,potion:1}],portals:[],landmarks:[]};
      const fork=4400+i*3300;
      main.portals.push({x:fork,target:id,label:name,spawn:180});
      map.rooms[id].portals.push({x:120,target:'main',label:main.name,spawn:fork+100});
    }
    // Loops connect the side routes, so they are traversable choices rather than decorative dead ends.
    const branch=Object.keys(map.rooms).filter(id=>id!=='main');
    for(let i=0;i<branch.length;i++){
      const from=map.rooms[branch[i]],next=branch[(i+1)%branch.length];
      const to=map.rooms[next],x=from.width-850,spawn=to.width-700;
      from.portals.push({x,target:next,label:to.name,spawn});
      to.portals.push({x:spawn,target:branch[i],label:from.name,spawn:x+100});
    }
    for(const [ri,[id,room]] of Object.entries(map.rooms).entries()){
      room.biome ||= id==='main'?['evacuated-forest','ruined-city','riverbank'][mi]:id;
      room.route=Array.from({length:Math.ceil(room.width/1800)+1},(_,n)=>({x:Math.min(n*1800,room.width),y:n===0?0:(seed(n+ri*19+mi*61)-.5)*(id==='main'?180:240)}));
      room.route.at(-1).x=room.width;
      if(!room.landmarks)room.landmarks=[];
      while(room.landmarks.length<3)room.landmarks.push({x:450+room.landmarks.length*1000,kind:mi===1?'arch':mi===2?'pond':'hollow'});
      if(id==='main')for(let n=0;n<4;n++)room.landmarks.push({x:10200+n*1500,kind:mi===1?'tower':mi===2?'mill':'hollow'});
      room.mapTrack=Array.from({length:17},(_,n)=>{
        const x=n/16*room.width;
        return id==='main'?[80+n/16*840,300+height(room,x)*.35]:[(ri<=2?100:560)+n/16*340,[90,510,160,440,570][ri-1]+Math.sin(n/16*Math.PI*2+ri)*18];
      });
    }
  }
  function height(room,x){
    if(!room?.route)return 0;
    const knots=room.route;x=clamp(x,0,room.width);
    const index=Math.max(0,knots.findIndex((p,i)=>i>0&&p.x>=x)-1),a=knots[index],b=knots[index+1]||a;
    const q=b.x===a.x?0:clamp((x-a.x)/(b.x-a.x),0,1),t=q*q*(3-2*q);
    return a.y+(b.y-a.y)*t;
  }
  function mapPoint(room,x){
    const q=clamp(x/room.width,0,1)*(room.mapTrack.length-1),i=Math.min(Math.floor(q),room.mapTrack.length-2),t=q-i;
    return room.mapTrack[i].map((v,n)=>v+(room.mapTrack[i+1][n]-v)*t);
  }
  function at(c,room,x,draw){c.save();c.translate(0,height(room,x));draw();c.restore();}
  function roadPath(c,room,camera,offset=0){
    c.beginPath();for(let x=camera-40;x<camera+1340;x+=20){const y=600+height(room,x)+offset;x===camera-40?c.moveTo(x,y):c.lineTo(x,y);}
  }
  function prop(c,x,y,kind,scale=1){
    const A=P.Art;c.save();c.translate(x,y);c.scale(scale,scale);
    A.ellipse(c,4,4,68,8,'#334c3918');
    if(kind==='tent'){
      c.fillStyle='#afa886';c.beginPath();c.moveTo(-62,0);c.lineTo(-7,-91);c.lineTo(73,0);c.fill();
      c.fillStyle='#d0c7a1';c.beginPath();c.moveTo(-62,0);c.lineTo(-7,-91);c.lineTo(14,0);c.fill();
      c.fillStyle='#4e6250';c.beginPath();c.moveTo(-12,0);c.lineTo(-4,-54);c.lineTo(19,0);c.fill();
      A.line(c,[[-78,0],[-7,-92],[85,0]],'#8c8360',2);A.line(c,[[28,-44],[47,-22],[39,-8]],'#8d9574',3);
    }else if(kind==='cart'){
      for(const x of [-35,40]){A.ellipse(c,x,-5,19,19,'#766747');A.ellipse(c,x,-5,13,13,'#b5a47a');A.line(c,[[x-13,-5],[x+13,-5]],'#766747',3);}
      c.fillStyle='#a08860';c.fillRect(-58,-46,111,34);for(let x=-58;x<53;x+=19)A.line(c,[[x,-48],[x,-14]],'#77694c',3);A.line(c,[[51,-20],[103,-5]],'#8a7355',5);
    }else if(kind==='wall'||kind==='pillar'){
      const w=kind==='pillar'?33:112,h=kind==='pillar'?140:76;c.fillStyle='#9f977d';c.fillRect(-w/2,-h,w,h);c.fillStyle='#c2b595';c.fillRect(-w/2,-h,w,10);
      for(let y=-h+22;y<0;y+=23){A.line(c,[[-w/2,y],[w/2,y]],'#817d68',2);A.line(c,[[y%2?0:-w/4,y-22],[y%2?0:-w/4,y]],'#817d68',2);}
      A.rock(c,w/2+16,0,.85);A.ellipse(c,-10,-h,29,8,'#819378');
    }else if(kind==='log'){
      A.line(c,[[-54,-14],[55,-19]],'#8e805d',27);A.line(c,[[-47,-25],[37,-29]],'#b0a077',5);A.ellipse(c,52,-18,11,14,'#d0bc89');A.ellipse(c,53,-18,6,9,'#a28d60');
    }else if(kind==='boat'){
      c.fillStyle='#9b8762';c.beginPath();c.moveTo(-80,-24);c.quadraticCurveTo(0,35,82,-26);c.lineTo(48,-13);c.lineTo(-45,-10);c.fill();A.line(c,[[-57,-25],[61,-23]],'#cab58b',5);A.line(c,[[-15,-50],[51,-3]],'#908568',4);
    }else if(kind==='reeds'){
      for(let i=0;i<11;i++){const xx=(i-5)*11,h=55+seed(i+11)*40;A.line(c,[[xx,0],[xx+9,-h]],'#779984',3);A.ellipse(c,xx+9,-h,4,12,'#a49162');}
    }else if(kind==='well'){
      A.ellipse(c,0,-12,46,23,'#a49d7c');A.ellipse(c,0,-23,45,20,'#c2b995');A.ellipse(c,0,-24,28,12,'#58796e');A.line(c,[[-39,-13],[-39,-94],[40,-94],[40,-13]],'#99835e',6);
    }else{
      for(let i=0;i<5;i++)A.rock(c,(i-2)*23,-seed(i)*12,.5+seed(i+1)*.5);
      A.ellipse(c,0,-18,35,9,'#abbaa0');
    }
    c.restore();
  }
  function backdrop(c,g){
    const A=P.Art,room=g.room,theme=g.map.theme,cam=g.camera,cy=g.cameraY||0;
    const amber=theme==='amber',brook=theme==='brook',cave=['cave','vault'].includes(room.biome);
    const sky=c.createLinearGradient(0,0,0,720);sky.addColorStop(0,cave?'#809989':amber?'#e5c9b0':brook?'#d0e4e2':'#dce5cd');sky.addColorStop(1,cave?'#b7c4a3':amber?'#cec39e':brook?'#dce5d3':'#e9ebd1');c.fillStyle=sky;c.fillRect(0,0,1280,720);
    if(!cave)A.ellipse(c,990,110-cy*.08,40,40,amber?'#ffe2b6':'#fff7d3');
    for(let layer=0;layer<3;layer++){
      const par=[.13,.32,.62][layer];c.save();c.translate(0,-cy*par);c.globalAlpha=[.28,.4,.62][layer];
      for(const a of A.anchors(cam,par,amber?270:330)){
        const x=a.x+seed(a.id+layer)*65,y=470+layer*40;
        if(cave){prop(c,x,y,'stones',1.4+layer*.3);c.fillStyle='#587665';c.beginPath();c.moveTo(x-65,-100);c.lineTo(x+90,-100);c.lineTo(x+30,95+seed(a.id)*95);c.closePath();c.fill();}
        else if(amber){prop(c,x,y,a.id%2?'pillar':'wall',1+layer*.24);c.fillStyle='#b4a181';c.fillRect(x-20,y-190-seed(a.id)*70,70,130);}
        else if(brook){A.line(c,[[x,y],[x+20,y-160]],'#799e8c',7);for(let n=0;n<3;n++)A.ellipse(c,x+(n-1)*45,y-150-n*20,65,43,['#8cac9b','#9fbdab','#bed0b2'][n]);}
        else {A.line(c,[[x,y],[x-8,y-210]],'#83997a',13);for(let n=0;n<4;n++)A.ellipse(c,x+Math.sin(n*2)*53,y-195+Math.cos(n*2)*40,70,65,['#88a375','#a6b88b','#7f9c72','#b7c297'][n]);}
      }c.restore();
    }
    c.save();c.translate(-cam,-cy);
    // River/ruin terrain is part of the world, with the same curve as the traversable route.
    c.fillStyle=brook?'#86b3aa':amber?'#b4b08c':'#a4b48c';roadPath(c,room,cam,-85);c.lineTo(cam+1340,900+cy);c.lineTo(cam-40,900+cy);c.fill();
    if(brook){roadPath(c,room,cam,-79);c.strokeStyle='#b6d6c7';c.lineWidth=5;c.stroke();}
    roadPath(c,room,cam);c.strokeStyle=amber?'#a49572':'#aeb485';c.lineWidth=112;c.stroke();
    roadPath(c,room,cam);c.strokeStyle=amber?'#ccb78f':'#d4c899';c.lineWidth=92;c.stroke();
    roadPath(c,room,cam,-31);c.strokeStyle='#e5dab344';c.lineWidth=5;c.stroke();
    for(let x=Math.floor((cam-200)/205)*205;x<cam+1550;x+=205){
      const i=Math.round(x/205),y=600+height(room,x);
      A.line(c,[[x,y+18],[x+20,y+17]],'#9e94743b',2);
      const kinds=cave?['stones','pillar','stones']:room.biome==='roots'?['log','stones','log','well']:room.biome==='camp'?['tent','cart','well','tent']:room.biome==='chapel'?['pillar','wall','pillar','well']:room.biome==='quarry'?['stones','wall','cart']:room.biome==='aqueduct'?['pillar','well','wall']:room.biome==='island'?['boat','reeds','stones']:amber?['wall','pillar','well','cart']:brook?['reeds','boat','well','reeds']:['log','tent','cart','stones','well'];
      const kind=kinds[Math.abs(i)%kinds.length];
      prop(c,x+seed(i)*45,y-64-seed(i+11)*34,kind,.6+seed(i+6)*.5);
      if(!amber&&!cave&&Math.abs(i)%3===0){A.line(c,[[x-34,y-95],[x-34,y-185]],'#788b68',5);A.line(c,[[x-34,y-185],[x+25,y-154]],'#b4b286',2);c.fillStyle='#b6b78a';c.beginPath();c.moveTo(x-29,y-181);c.lineTo(x+16,y-159);c.lineTo(x-3,y-151);c.lineTo(x-13,y-169);c.lineTo(x-24,y-157);c.closePath();c.fill();}
    }
    for(const portal of room.portals)at(c,room,portal.x,()=>{
      c.strokeStyle=amber?'#ccb78f':'#d4c899';c.lineWidth=38;c.beginPath();c.moveTo(portal.x-165,600);c.bezierCurveTo(portal.x-70,600,portal.x+80,540,portal.x+140,474);c.stroke();
    });
    c.restore();
  }
  function foreground(c,g){
    const A=P.Art;c.save();c.translate(-g.camera,-g.cameraY);c.globalAlpha=.55;
    for(let x=Math.floor(g.camera/270)*270;x<g.camera+1400;x+=270){const y=674+height(g.room,x);
      for(let n=0;n<6;n++)A.line(c,[[x+n*9,y],[x+n*12-10,y-22-seed(x+n)*20]],g.map.theme==='brook'?'#729b8b':'#81966d',4);
      if(g.map.theme==='amber')prop(c,x+100,y+6,'stones',.65);
    }c.restore();
  }
  function sign(c,portal,room,x){
    const A=P.Art;at(c,room,portal.x,()=>{
      A.line(c,[[portal.x,550],[portal.x,435]],'#8b7a57',7);
      c.fillStyle='#cfbf91';c.beginPath();c.moveTo(portal.x-67,442);c.lineTo(portal.x+59,442);c.lineTo(portal.x+80,458);c.lineTo(portal.x+59,474);c.lineTo(portal.x-67,474);c.closePath();c.fill();
      A.label(c,portal.label,portal.x,463,11,'#4b6150');
      A.label(c,'↗ 샛길',portal.x+145,493,12);if(Math.abs(portal.x-x)<90)A.label(c,'E · '+portal.label,portal.x,417,13);
    });
  }
  function chart(g){
    const esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
    const A=g.map.rooms,seenEdges=new Set();let edges='',routes='',marks='';
    for(const [id,room] of Object.entries(A)){
      const visited=g.progress.visited.includes(id),points=room.mapTrack.map(p=>p.join(',')).join(' ');
      routes+=`<polyline points="${points}" fill="none" stroke="${visited?'#9b8e67':'#b6ba9f'}" stroke-width="${id==='main'?9:6}" stroke-linecap="round" opacity="${visited?1:.5}"/>`;
      for(const p of room.portals){const key=[id,p.target].sort().join(':');if(seenEdges.has(key))continue;seenEdges.add(key);const a=mapPoint(room,p.x),b=mapPoint(A[p.target],p.spawn);edges+=`<path d="M${a} Q${(a[0]+b[0])/2},${(a[1]+b[1])/2-30} ${b}" fill="none" stroke="#9eaa88" stroke-width="3" stroke-dasharray="5 6"/>`;}
      const title=room.mapTrack[8];marks+=`<text x="${title[0]}" y="${title[1]-24}" text-anchor="middle" fill="#49604e" font-size="16">${esc(room.name)}</text>`;
      if(visited){for(const chest of room.chests.filter(c=>!g.progress.opened.includes(c.id))){const p=mapPoint(room,chest.x);marks+=`<rect x="${p[0]-6}" y="${p[1]-6}" width="12" height="12" rx="2" fill="#ba9363" stroke="#f7f2df"/>`;}}
    }
    const here=mapPoint(g.room,g.player.x),boss=mapPoint(A.main,A.main.bossX),camp=mapPoint(A.main,180);
    return `<svg class="route-map" viewBox="0 0 1000 620" role="img" aria-label="${esc(g.map.name)} 연결 지도 · 현재 ${esc(g.room.name)}"><defs><pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#a5b591" stroke-opacity=".1"/></pattern></defs><rect width="1000" height="620" fill="#edf0d9" rx="18"/><rect width="1000" height="620" fill="url(#map-grid)"/>${edges}${routes}${marks}<text x="${camp[0]}" y="${camp[1]-28}" font-size="17" fill="#536c50">⌂ 캠프</text><text x="${boss[0]}" y="${boss[1]+32}" text-anchor="end" font-size="17" fill="#967458">◈ ${esc(g.map.bossName)}</text><circle cx="${here[0]}" cy="${here[1]}" r="13" fill="#426f61" stroke="#fff9df" stroke-width="4"/><text x="${here[0]}" y="${here[1]+36}" text-anchor="middle" font-size="15" fill="#38594c">현위치</text><text x="925" y="40" font-size="18" fill="#637b5c">N ↑</text></svg>`;
  }
  P.World={height,mapPoint,at,backdrop,foreground,sign,chart};
})(globalThis.PIGGY=globalThis.PIGGY||{});
