/** Optional secrets and persisted, carryable solid platforms. All motion uses simulation time. */
(function(P){
  'use strict';
  const C=P.CONFIG,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const kinds={crate:{name:'나무 상자',w:72,h:60},barrel:{name:'나무 통',w:60,h:66},log:{name:'작은 통나무',w:110,h:34}};
  for(const [i,map] of P.MAPS.entries()){
    const secret=['cave','vault','mill'][i],room=map.rooms[secret];room.hidden=true;
    room.helper={id:['scout','glow','dew'][i],x:room.width-510};
    for(const [id,r] of Object.entries(map.rooms)){
      // Secret entrances are never exposed by ordinary loop signs or map connections.
      r.portals=r.portals.filter(p=>p.target!==secret||id==='main');
      if(id===secret)r.portals=r.portals.filter(p=>p.target==='main');
      r.objects=[];
      for(let x=650,n=0;x<r.width-700;x+=1700,n++)r.objects.push({id:map.id+'-'+id+'-object-'+n,kind:['crate','barrel','log'][n%3],x,y:C.ground});
      for(const portal of r.portals){
        const target=map.rooms[portal.target];portal.direction=target.mapTrack[8][1]>r.mapTrack[8][1]?1:-1;
        if(target.hidden){portal.secret=true;portal.height=170;portal.label=target.name;
          // A low step, a crate and a barrel form a movable route to the concealed ledge.
          r.objects.push({id:map.id+'-secret-crate',kind:'crate',x:portal.x-105,y:C.ground},
            {id:map.id+'-secret-barrel',kind:'barrel',x:portal.x-215,y:C.ground},
            {id:map.id+'-secret-log',kind:'log',x:portal.x-320,y:C.ground});
        }
      }
    }
  }
  P.requiredEnemies=map=>Object.values(map.rooms).filter(r=>!r.hidden).flatMap(r=>r.enemies);
  const hasHands=g=>g.pig.carrying||!!g.player.carryingObject;
  function load(g){
    g.progress.objects ||= {};
    g.objects=g.room.objects.map(o=>({...o,...kinds[o.kind],...(g.progress.objects[o.id]||{}),vy:0,carried:false}));
    const id=g.progress.carriedObject,object=g.objects.find(o=>o.id===id);
    g.player.carryingObject=!g.pig.carrying&&object?object.id:'';
    if(g.player.carryingObject)object.carried=true;
  }
  function near(g){return g.objects.filter(o=>!o.carried&&Math.abs(o.x-g.player.x)<95&&Math.abs(o.y-g.player.y)<110).sort((a,b)=>Math.abs(a.x-g.player.x)-Math.abs(b.x-g.player.x))[0];}
  function pickup(g,o){if(g.pig.carrying)return false;o.carried=true;o.vy=0;g.player.carryingObject=o.id;P.Audio.play('carry');g.snapshot();return true;}
  function drop(g){
    const p=g.player,o=g.objects.find(o=>o.id===p.carryingObject);if(!o)return false;
    const desired=clamp(p.x+p.dir*(o.w/2+25),40,g.room.width-40);
    const under=g.objects.filter(q=>!q.carried&&q!==o&&Math.abs(q.x-desired)<Math.min(q.w,o.w)*.5).sort((a,b)=>(a.y-a.h)-(b.y-b.h))[0];
    if(under&&under.y-under.h-o.h<350){g.toast('더 높이 쌓으면 불안정해요. 다른 자리에 놓아주세요.');return false;}
    o.x=under?under.x:desired;o.y=under?under.y-under.h:C.ground;o.carried=false;o.vy=0;p.carryingObject='';
    P.Audio.play('wood');g.snapshot();return true;
  }
  function physics(g,dt,previousX,previousY){
    const p=g.player;
    for(const o of g.objects){
      if(o.carried){o.x=p.x;o.y=p.y-C.carryHeight+o.h*.12;continue;}
      const floor=g.objects.filter(q=>q!==o&&!q.carried&&Math.abs(q.x-o.x)<(q.w+o.w)*.38&&q.y-q.h>=o.y-2).reduce((y,q)=>Math.min(y,q.y-q.h),C.ground);
      o.vy+=C.gravity*dt;o.y=Math.min(floor,o.y+o.vy*dt);if(o.y>=floor)o.vy=0;
      const top=o.y-o.h,half=o.w*.44+11;
      if(previousY>top+6&&p.y>top+6&&p.y-160<o.y&&Math.abs(p.x-o.x)<half){
        if(previousX<=o.x-half)p.x=o.x-half;
        else if(previousX>=o.x+half)p.x=o.x+half;
      }
    }
    let floor=C.ground;
    for(const o of g.objects)if(!o.carried&&Math.abs(p.x-o.x)<o.w*.44+9&&previousY<=o.y-o.h+3&&p.y>=o.y-o.h&&p.vy>=0)floor=Math.min(floor,o.y-o.h);
    // Only the concealed entrance itself has a high platform; the route stays on the terrain.
    for(const portal of g.room.portals)if(portal.secret){const top=C.ground-portal.height;
      if(Math.abs(p.x-portal.x)<60&&previousY<=top+3&&p.y>=top&&p.vy>=0)floor=Math.min(floor,top);}
    if(p.y>=floor){p.y=floor;p.vy=0;p.grounded=true;}else p.grounded=false;
  }
  function snapshot(g){for(const o of g.objects||[])g.progress.objects[o.id]={x:o.x,y:o.y};g.progress.carriedObject=g.player.carryingObject||'';}
  function accessible(g,portal){return !portal.secret||g.progress.visited.includes(portal.target)||g.player.y<=C.ground-portal.height+8;}
  function join(g,def){
    if(g.helpers.some(h=>h.id===def.id))return;
    g.progress.guests ||= [];if(!P.state.party.includes(def.id)&&!g.progress.guests.includes(def.id))g.progress.guests.push(def.id);
    g.helpers.push({id:def.id,x:g.player.x-75-g.helpers.length*40,y:C.ground,vx:0,dir:1,pose:'idle',age:0,cd:0,inv:0,walkDistance:0,walkBlend:0});
  }
  function draw(c,g){
    for(const o of g.objects){if(o.carried||o.x<g.camera-150||o.x>g.camera+1430)continue;
      P.World.at(c,g.room,o.x,()=>{P.Pixel.sprite(c,o.kind,o.x,o.y+4,o.w+12,o.h+12);
        if(!hasHands(g)&&Math.abs(o.x-g.player.x)<95)P.Art.label(c,'E · '+o.name,o.x,o.y-o.h-14,12);});
    }
    for(const portal of g.room.portals)if(portal.secret&&!g.progress.visited.includes(portal.target))P.World.at(c,g.room,portal.x,()=>{
      P.Pixel.sprite(c,'arch',portal.x,C.ground+12,145,180);
      if(g.map.theme!=='amber')P.Pixel.sprite(c,'tree',portal.x+75,C.ground+4,150,280);
      // A stone ledge is an environmental clue, never a sign or map label before entry.
      c.fillStyle='#8d987b';c.fillRect(portal.x-60,C.ground-portal.height,120,12);
      if(accessible(g,portal)&&Math.abs(portal.x-g.player.x)<90)P.Art.label(c,'E · 덩굴 뒤로 들어가기',portal.x,C.ground-portal.height-25,13);
    });
  }
  P.Exploration={kinds,hasHands,load,near,pickup,drop,physics,snapshot,accessible,join,draw};
})(globalThis.PIGGY=globalThis.PIGGY||{});
