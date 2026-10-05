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
  function chart(g){
    const esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
    const A=g.map.rooms,seenEdges=new Set(),endLabels=new Map();let edges='',routes='',marks='';
    for(const [id,room] of Object.entries(A)){
      if(room.hidden&&!g.progress.visited.includes(id))continue;
      const visited=g.progress.visited.includes(id),points=room.mapTrack.map(p=>p.join(',')).join(' ');
      routes+=`<polyline points="${points}" fill="none" stroke="${visited?'#9b8e67':'#b6ba9f'}" stroke-width="${id==='main'?9:6}" stroke-linecap="round" opacity="${visited?1:.5}"/>`;
      for(const p of room.portals){if(A[p.target].hidden&&!g.progress.visited.includes(p.target))continue;const key=[id,p.target].sort().join(':');if(seenEdges.has(key))continue;seenEdges.add(key);const a=mapPoint(room,p.x),b=mapPoint(A[p.target],p.spawn);edges+=`<path d="M${a} Q${(a[0]+b[0])/2},${(a[1]+b[1])/2-30} ${b}" fill="none" stroke="#9eaa88" stroke-width="3" stroke-dasharray="5 6"/>`;
        const label=seenEdges.size;for(const [point,end] of [[a,"A"],[b,"B"]]){const placeKey=point.map(v=>Math.round(v/12)).join(":");const row=endLabels.get(placeKey)||0;endLabels.set(placeKey,row+1);marks+=`<g data-connector="${esc(key)}" data-end="${end}"><circle cx="${point[0]}" cy="${point[1]}" r="9" fill="#f7efd4" stroke="#637e61" stroke-width="2"/><text x="${point[0]+12}" y="${point[1]-10-row*14}" font-size="12" fill="#385c49">${label}${end}</text></g>`;}
      }
      const title=room.mapTrack[8];marks+=`<text x="${title[0]}" y="${title[1]-24}" text-anchor="middle" fill="#49604e" font-size="16">${esc(room.name)}</text>`;
      if(visited){for(const chest of room.chests.filter(c=>!g.progress.opened.includes(c.id))){const p=mapPoint(room,chest.x);marks+=`<rect x="${p[0]-6}" y="${p[1]-6}" width="12" height="12" rx="2" fill="#ba9363" stroke="#f7f2df"/>`;}}
    }
    const here=mapPoint(g.room,g.player.x),boss=mapPoint(A.main,A.main.bossX),camp=mapPoint(A.main,180);
    return `<svg class="route-map" viewBox="0 0 1000 620" role="img" aria-label="${esc(g.map.name)} 연결 지도 · 현재 ${esc(g.room.name)}"><defs><pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#a5b591" stroke-opacity=".1"/></pattern></defs><rect width="1000" height="620" fill="#edf0d9" rx="18"/><rect width="1000" height="620" fill="url(#map-grid)"/>${edges}${routes}${marks}<text x="${camp[0]}" y="${camp[1]-28}" font-size="17" fill="#536c50">⌂ 캠프</text><text x="${boss[0]}" y="${boss[1]+32}" text-anchor="end" font-size="17" fill="#967458">◈ ${esc(g.map.bossName)}</text><circle cx="${here[0]}" cy="${here[1]}" r="13" fill="#426f61" stroke="#fff9df" stroke-width="4"/><text x="${here[0]}" y="${here[1]+36}" text-anchor="middle" font-size="15" fill="#38594c">현위치</text><text x="925" y="40" font-size="18" fill="#637b5c">N ↑</text></svg>`;
  }
  P.World={height,mapPoint,at,chart};
})(globalThis.PIGGY=globalThis.PIGGY||{});
