/** Optional underground passages, persistent excavation and expedition companions. */
(function(P){
  'use strict';
  const C=P.CONFIG,DIG_STEPS=3;
  for(const [i,map] of P.MAPS.entries()){
    const secret=['cave','vault','mill'][i],room=map.rooms[secret];room.hidden=true;room.biome='cave';
    room.helper={id:['archer','sword','support'][i],x:room.width-510};
    // Stable enemy IDs preserve existing kills/coins while changing undiscovered cave encounters.
    room.enemies.forEach((e,n)=>{e.type=['cave-archer','cave-charger','cave-guard'][n%3];});
    for(const [id,r] of Object.entries(map.rooms)){
      r.portals=r.portals.filter(p=>p.target!==secret||id==='main');
      if(id===secret)r.portals=r.portals.filter(p=>p.target==='main');
      r.objects=[];
      for(const portal of r.portals){
        const target=map.rooms[portal.target];portal.direction=target.mapTrack[8][1]>r.mapTrack[8][1]?1:-1;
        if(target.hidden){portal.secret=true;portal.digId=map.id+'-'+id+'-dig-'+portal.target;portal.label='지하 통로';}
      }
    }
  }
  P.requiredEnemies=map=>Object.values(map.rooms).filter(r=>!r.hidden).flatMap(r=>r.enemies);
  const hasHands=g=>g.pig.carrying;
  function load(g){g.objects=[];g.player.carryingObject='';g.progress.carriedObject='';g.progress.excavations ||= {};}
  function accessible(g,portal){return !portal.secret||g.progress.visited.includes(portal.target)||(g.progress.excavations?.[portal.digId]||0)>=DIG_STEPS;}
  function site(g){return g.room.portals.filter(p=>p.secret&&!accessible(g,p)&&Math.abs(p.x-g.player.x)<90).sort((a,b)=>Math.abs(a.x-g.player.x)-Math.abs(b.x-g.player.x))[0];}
  function dig(g,portal){
    if(!P.state.skills.shovel){g.toast('다시 덮인 흙의 흔적이에요. 캠프에서 삽을 구입하면 파볼 수 있어요.');return;}
    const p=g.player;if(p.dig>0)return;if(!p.grounded){g.toast('땅에 내려선 뒤 파주세요.');return;}
    p.dig=.48;p.pose='dig';p.age=0;p.firstPending=p.secondPending=p.kickPending=p.spinPending=false;
    const count=Math.min(DIG_STEPS,(g.progress.excavations[portal.digId]||0)+1);g.progress.excavations[portal.digId]=count;
    P.Audio.play('dig');for(let n=0;n<7;n++)g.particles.push({x:portal.x,y:C.ground-2,vx:(n-3)*21,vy:-70-n*8,life:.4,max:.4,color:'#b6a176'});
    g.toast(count===DIG_STEPS?'흙 아래로 내려가는 통로가 열렸어요. E로 들어가세요.':'흙 파기 '+count+' / '+DIG_STEPS);g.snapshot();
  }
  function physics(g){const p=g.player;if(p.y>=C.ground){p.y=C.ground;p.vy=0;p.grounded=true;}else p.grounded=false;}
  function snapshot(g){g.progress.carriedObject='';}
  function join(g,def){
    if(g.helpers.some(h=>h.id===def.id))return;
    g.progress.guests ||= [];if(!P.state.party.includes(def.id)&&!g.progress.guests.includes(def.id))g.progress.guests.push(def.id);
    g.helpers.push({id:def.id,x:g.player.x-75-g.helpers.length*40,y:C.ground,vx:0,dir:1,pose:'idle',age:0,cd:0,inv:0,walkDistance:0,walkBlend:0});
  }
  function draw(c,g){
    for(const portal of g.room.portals)if(portal.secret)P.World.at(c,g.room,portal.x,()=>{
      const open=accessible(g,portal),count=g.progress.excavations[portal.digId]||0;
      P.Pixel.sprite(c,open?'hole':'soil',portal.x,C.ground+15,open?145:116,open?68:36);
      if(Math.abs(portal.x-g.player.x)<90){
        const label=open?'E · 지하로 내려가기':P.state.skills.shovel?'E · 흙 파기 '+count+'/'+DIG_STEPS:'E · 흙의 흔적 살펴보기';
        P.Art.label(c,g.pig.carrying&&!open?'E · 저금통 내려놓기':label,portal.x,C.ground-47,13);
      }
    });
  }
  P.Exploration={DIG_STEPS,hasHands,load,physics,snapshot,accessible,site,dig,join,draw};
})(globalThis.PIGGY=globalThis.PIGGY||{});
