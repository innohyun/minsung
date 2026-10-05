/** Fixed-step, pause-safe single-player simulation. No wall-clock combat timers. */
(function(P){
  'use strict';
  const C=P.CONFIG,A=P.Art,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  class Game {
    constructor(canvas) {
      this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
      this.mode='home';this.keys=new Set();this.time=0;this.decorTime=0;this.camera=0;this.accumulator=0;this.last=0;
      this.particles=[];this.floaters=[];this.projectiles=[];this.coinFlights=[];this.flash=0;this.shake=0;this.savedAt=0;
      this.resize();window.addEventListener('resize',()=>this.resize());
    }
    resize(){const d=Math.min(window.devicePixelRatio||1,2);this.canvas.width=1280*d;this.canvas.height=720*d;this.ctx.setTransform(d,0,0,d,0,0);}
    clearInput(){this.keys.clear();P.Controls?.releaseAll();}
    left(){return this.keys.has('a')||this.keys.has('arrowleft');}
    right(){return this.keys.has('d')||this.keys.has('arrowright');}
    start(mapId,replay=false){
      const s=P.state,map=P.mapById(mapId);if(!map||!s.unlocked.includes(mapId))return '아직 열리지 않은 맵이에요.';
      const error=P.State.canDepart(s);if(error)return error;
      if(s.progress[mapId].cleared&&!replay)return '다시 플레이를 선택해 새 원정을 시작하세요.';
      if(replay){if(!s.progress[mapId].cleared)return '클리어한 맵만 초기화할 수 있어요.';s.progress[mapId]=P.State.freshProgress(map);}
      if(!s.active){s.runCoins=0;s.stats.runs++;}s.selectedMap=mapId;s.active=true;
      this.map=map;this.progress=s.progress[mapId];this.time=0;this.savedAt=0;this.pendingClear=false;this.travel=null;
      this.player={x:this.progress.x,y:C.ground,vx:0,vy:0,grounded:true,dir:1,hp:s.player.hp,inv:0,pose:'idle',age:0,
        shieldRaised:!!s.skills.woodshield,punch:0,kick:0,firstHit:0,firstPending:false,secondHit:0,secondPending:false,kickPending:false,spinPending:false,
        walkDistance:0,walkBlend:0,gaitPhase:0,runBlend:0,stepDistance:0,running:false,skills:{},flight:0,dash:0,dashHits:new Set()};
      this.pig={x:this.progress.carrying?this.player.x:this.progress.pigX,y:this.progress.carrying?C.ground-C.carryHeight:C.ground,hp:s.pig.hp,bounce:0,carrying:this.progress.carrying};
      this.helpers=[...new Set([...s.party,...(this.progress.guests||[])])].map((id,i)=>({id,x:this.player.x-65-i*55,y:C.ground,vx:0,dir:1,pose:'idle',age:0,cd:0,inv:0,walkDistance:0,walkBlend:0}));
      this.loadRoom(this.progress.room);this.mode='play';this.clearInput();this.snapshot();return '';
    }
    loadRoom(room){
      this.roomId=room;this.room=this.map.rooms[room];
      this.progress.room=room;if(!this.progress.visited.includes(room))this.progress.visited.push(room);
      P.Exploration.load(this);
      this.enemies=this.room.enemies.filter(e=>!this.progress.dead.includes(e.id)).map(e=>this.makeEnemy(e));
      this.projectiles=[];this.enemyShots=[];this.shieldHits=0;this.hazards=[];this.particles=[];this.coinFlights=[];this.floaters=[];this.flash=0;this.shake=0;
      this.camera=clamp(this.player.x-410,0,Math.max(0,this.room.width-1280));
      this.cameraY=P.World.height(this.room,this.player.x)*.75;this.spawnBoss();this.roomTitle=3;
    }
    enemyConfig(e){return e.type==='boss'?{...P.ENEMIES.boss,...this.map.boss}:P.ENEMIES[e.type];}
    makeEnemy(e){const conf=this.enemyConfig(e),scale=this.map.scale;return {...e,y:C.ground,hp:Math.ceil(conf.hp*scale),max:Math.ceil(conf.hp*scale),active:false,cd:.8,windup:0,stun:0,kb:0,hit:0,dir:-1,phase:e.x*.01};}
    remaining(){return P.requiredEnemies(this.map).filter(e=>!this.progress.dead.includes(e.id)).length;}
    spawnBoss(){if(this.room.bossX&&this.remaining()===0&&!this.progress.cleared&&!this.enemies.some(e=>e.type==='boss')){this.enemies.push(this.makeEnemy({id:this.map.id+'-boss',x:this.room.bossX,type:'boss'}));this.toast('all-cleared');}}
    toast(text){if(text==='all-cleared')text='일반 길의 몬스터를 모두 처치했어요. 비밀 구역은 선택이에요. 가장 깊은 곳의 보스를 찾아가세요!';P.UI?.toast(text);}
    nearEnemy(range,center=this.player.x,vertical=140){return this.enemies.filter(e=>e.hp>0&&e.active&&Math.abs(e.x-center)<range&&Math.abs(e.y-this.player.y)<vertical).sort((a,b)=>Math.abs(a.x-center)-Math.abs(b.x-center))[0];}
    punch(){
      if(this.mode!=='play'||this.travel)return;
      const p=this.player;if(P.Exploration.hasHands(this)){this.toast('저금통을 들고 있을 때는 발차기를 사용해요.');return;}if(p.punch>0)return;
      if((p.pose==='kick'&&p.age<.22)||(p.pose==='spin'&&p.age<.62))return;
      p.punch=C.punchCooldown;p.pose='punch';p.age=0;p.firstHit=.09;p.firstPending=true;p.secondHit=.29;p.secondPending=true;
      const enemy=this.nearEnemy(118);p.aimY=enemy?clamp(enemy.y-p.y-this.enemyConfig(enemy).h*.55,-132,-34):-125;
      if(enemy)p.dir=enemy.x>p.x?1:-1;
    }
    kick(){
      if(this.mode!=='play'||this.travel||this.player.kick>0)return;const p=this.player;if(p.pose==='spin'&&p.age<.62)return;p.kick=C.kickCooldown;p.pose='kick';p.age=0;
      p.firstPending=false;p.secondPending=false;p.kickHit=.045;p.kickPending=true;
      const enemy=this.nearEnemy(143);p.kickAimY=enemy?clamp(enemy.y-p.y-this.enemyConfig(enemy).h*.5,-95,-28):-74;if(enemy)p.dir=enemy.x>p.x?1:-1;
    }
    skill(index){
      if(this.mode!=='play'||this.travel)return;const s=P.state,id=s.equipped[index],skill=P.skillById(id),p=this.player,level=s.skills[id];
      if(!skill||!level){this.toast('홈에서 기술을 배우고 이 자리에 장착하세요.');return;}
      if(p.pose==='spin'&&p.age<.62)return;
      if((p.skills[id]||0)>0)return;if(skill.hands&&P.Exploration.hasHands(this)){this.toast('이 기술은 저금통을 내려놓아야 사용할 수 있어요.');return;}
      p.skills[id]=skill.cd/(1+(level-1)*.13);if(id!=='spin')P.Audio.play('skill');
      if(id==='spin'){p.pose='spin';p.age=0;p.firstPending=false;p.secondPending=false;p.kickPending=false;p.spinPending=true;p.spinHit=.26;p.spinLevel=level;
        const enemy=this.nearEnemy(185+level*15);p.spinAimY=enemy?clamp(-this.enemyConfig(enemy).h*.7,-94,-40):-76;if(enemy)p.dir=enemy.x>p.x?1:-1;}
      if(id==='dash'){p.dash=.28;p.pose='dash';p.age=0;p.dashHits=new Set();}
      if(id==='fly'){p.flight=1.5+level*.5;p.vy=-360;}
      if(id==='fire'||id==='gun')this.projectiles.push({x:p.x+p.dir*35,y:p.y-118,vx:p.dir*(id==='gun'?900:560),life:1.25,damage:(id==='gun'?28:36)+level*10,type:id});
    }
    toggleShield(){if(this.mode!=='play'||this.travel||!P.state.skills.woodshield||P.Exploration.hasHands(this))return;this.player.shieldRaised=!this.player.shieldRaised;P.Audio.play('carry');}
    command(){if(this.mode!=='play'||this.travel)return;P.state.mode=P.state.mode==='follow'?'guard':'follow';this.toast(P.state.mode==='guard'?'조수들이 저금통 주변을 지킵니다.':'조수들이 다시 따라옵니다.');this.snapshot();}
    interactionLabel(){
      const p=this.player;if(!p||!this.room||this.travel)return '';
      if(p.carryingObject)return '물건 내려놓기 · 쌓기';
      if(this.room.chests.some(c=>!this.progress.opened.includes(c.id)&&Math.abs(c.x-p.x)<100))return '상자 열기';
      if(this.room.helper&&!P.state.helpers[this.room.helper.id]&&Math.abs(this.room.helper.x-p.x)<95)return '조수와 만나기';
      if(this.room.portals.some(portal=>Math.abs(portal.x-p.x)<90&&P.Exploration.accessible(this,portal))&&(this.pig.carrying||Math.abs(this.pig.x-p.x)<=150))return '샛길 이동';
      if(!this.pig.carrying&&P.Exploration.near(this))return '물건 들기';
      if(this.pig.carrying)return '저금통 내려놓기';if(Math.abs(this.pig.x-p.x)<100)return '저금통 들기';return '';
    }
    interact(){
      if(this.mode!=='play'||this.travel)return;const p=this.player,s=P.state;
      if(p.carryingObject){P.Exploration.drop(this);return;}
      const chest=this.room.chests.find(c=>!this.progress.opened.includes(c.id)&&Math.abs(c.x-p.x)<100);
      if(chest){this.progress.opened.push(chest.id);s.runCoins+=chest.coins||0;s.inventory.potion=Math.min(999,s.inventory.potion+(chest.potion||0));s.inventory.repair=Math.min(999,s.inventory.repair+(chest.repair||0));this.pig.bounce=.5;this.snapshot();P.Audio.play('chest');P.UI?.loot(chest);return;}
      const found=this.room.helper;
      if(found&&!s.helpers[found.id]&&Math.abs(found.x-p.x)<95){const def=P.helperById(found.id);s.helpers[found.id]={hp:def.hp,revive:0};P.Exploration.join(this,def);this.snapshot();P.UI?.foundHelper(def);return;}
      const portal=this.room.portals.filter(x=>Math.abs(x.x-p.x)<90&&P.Exploration.accessible(this,x)).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
      if(portal){if(!this.pig.carrying&&Math.abs(this.pig.x-p.x)>150){this.toast('저금통을 가까이 데려오거나 들고 이동하세요.');return;}
        this.travel={portal:{...portal},age:0,duration:1.15,from:this.room.name,to:this.map.rooms[portal.target].name};this.clearInput();this.snapshot();P.Audio.play('step');return;}
      const object=!this.pig.carrying&&P.Exploration.near(this);if(object){P.Exploration.pickup(this,object);return;}
      if(this.pig.carrying){this.pig.carrying=false;this.pig.x=clamp(p.x+p.dir*38,35,this.room.width-35);this.pig.y=C.ground;}
      else if(Math.abs(this.pig.x-p.x)<100){this.pig.carrying=true;this.pig.x=p.x;this.pig.y=p.y-C.carryHeight;}
      else{this.toast('저금통·상자·샛길 가까이에서 E를 눌러주세요.');return;}
      P.Audio.play('carry');this.snapshot();
    }
    jump(){
      if(this.mode!=='play'||this.travel)return;const p=this.player;if(p.vy!==0||(!p.grounded&&p.y<C.ground-1))return;
      p.vy=-610;p.grounded=false;p.firstPending=false;p.secondPending=false;p.pose='idle';P.Audio.play('skill');
    }
    travelTick(dt){
      this.travel.age+=dt;if(this.travel.age<this.travel.duration)return;
      const portal=this.travel.portal,p=this.player;this.travel=null;
      p.x=portal.spawn;p.y=C.ground;p.vy=0;p.vx=0;p.grounded=true;p.pose='idle';
      this.pig.x=this.pig.carrying?p.x:p.x+42;this.pig.y=this.pig.carrying?p.y-C.carryHeight:C.ground;
      this.helpers.forEach((h,i)=>{h.x=p.x-55-i*40;h.y=C.ground;h.vx=0;});this.progress.carriedObject='';this.loadRoom(portal.target);this.snapshot();
    }
    drawTravel(c){
      const tr=this.travel,t=tr.age;c.fillStyle='#eef0dfee';c.fillRect(0,0,1280,720);
      P.Pixel.background(c,t*170,0,this.map.theme,this.room.biome);
      c.fillStyle='#d2c499';c.fillRect(0,590,1280,86);
      const roster=[{color:'#294a40',scale:1},...this.helpers.filter(h=>P.state.helpers[h.id].hp>0).map(h=>({color:P.helperById(h.id).color,scale:.86}))];
      roster.forEach((o,i)=>P.Art.stick(c,650-i*74,630,{...o,carrying:i===0,dir:1,speed:230,walkBlend:1,phase:t*1.6}));
      P.Art.image(c,'pig',650,630-C.carryHeight,94,63);
      P.Art.label(c,'동료들과 함께 걸어가는 중…',640,220,26);P.Art.label(c,tr.from+' → '+tr.to,640,262,18);
      c.fillStyle='#f6f1dc';c.fillRect(475,304,330,5);c.fillStyle='#648a70';c.fillRect(475,304,330*Math.min(1,t/tr.duration),5);
    }
    hitEnemy(enemy,damage,kb=0){
      if(enemy.hp<=0)return;enemy.hp=Math.max(0,enemy.hp-damage);enemy.kb+=kb;enemy.hit=.16;enemy.stun=.12;
      this.floaters.push({x:enemy.x,y:enemy.y-this.enemyConfig(enemy).h-8,text:Math.round(damage).toString(),life:.65,color:'#506b4c'});
      this.shake=P.state.settings.reducedMotion?0:2.5;P.Audio.play('hit');
      if(enemy.hp===0)this.kill(enemy);
    }
    kill(e){
      if(e.type==='boss'){this.pendingClear=true;P.state.runCoins+=this.enemyConfig(e).coins;return;}
      if(this.progress.dead.includes(e.id))return;this.progress.dead.push(e.id);P.state.stats.kills++;
      const total=P.ENEMIES[e.type].coins,count=3;for(let i=0;i<count;i++){
        this.progress.drops.push({id:e.id+'-coin-'+i,room:this.roomId,x:clamp(e.x+(i-1)*19,25,this.room.width-25),value:i===count-1?total-Math.floor(total/count)*2:Math.floor(total/count)});
      }
      for(let i=0;i<6;i++)this.particles.push({x:e.x,y:C.ground-25,vx:Math.cos(i)*60,vy:-70+Math.sin(i)*50,life:.45,max:.45,color:'#d4dfa7'});
      this.snapshot();
    }
    hurt(target,damage,sourceX){
      if(target.kind==='player'){if(this.player.inv>0||this.player.dash>0)return;if(P.Combat.shieldActive(this)&&Number.isFinite(sourceX)&&(sourceX-this.player.x)*this.player.dir>0){damage*=P.Combat.blocking(this)?.2:.5;P.Combat.woodHit(this);}this.player.hp=Math.max(0,this.player.hp-damage);this.player.inv=.55;}
      if(target.kind==='pig'){this.pig.hp=Math.max(0,this.pig.hp-damage);this.flash=.22;P.Audio.play('warning');}
      if(target.kind==='helper'){
        const h=target.actor,stored=P.state.helpers[h.id];if(h.inv>0||stored.hp<=0)return;stored.hp=Math.max(0,stored.hp-damage*(h.id==='shield'?.5:1));h.inv=.3;
        if(stored.hp<=0){stored.revive=C.reviveSeconds;this.toast(P.helperById(h.id).name+' · 10초 뒤 저금통에서 다시 만나요.');}
      }
      this.floaters.push({x:target.x,y:C.ground-118,text:'−'+Math.ceil(damage),life:.7,color:'#b76f7d'});
    }
    targetFor(e){
      const targets=[{kind:'player',x:this.player.x,y:this.player.y,actor:this.player},{kind:'pig',x:this.pig.x,y:this.pig.y,actor:this.pig}];
      for(const h of this.helpers)if(P.state.helpers[h.id].hp>0)targets.push({kind:'helper',x:h.x,y:h.y,actor:h});
      return targets.filter(t=>Math.abs(t.y+(t.kind==='pig'&&this.pig.carrying?C.carryHeight-140:0)-C.ground)<155).sort((a,b)=>Math.abs(a.x-e.x)-Math.abs(b.x-e.x))[0];
    }
    tick(dt){
      if(this.mode!=='play')return;if(this.travel){this.travelTick(dt);return;}
      if(this.mode!=='play'||this.travel)return;
      const p=this.player,s=P.state;this.time+=dt;this.savedAt+=dt;this.roomTitle=Math.max(0,this.roomTitle-dt);
      p.punch=Math.max(0,p.punch-dt);p.kick=Math.max(0,p.kick-dt);p.inv=Math.max(0,p.inv-dt);p.age+=dt;
      for(const id of Object.keys(p.skills))p.skills[id]=Math.max(0,p.skills[id]-dt);
      if(p.age>({punch:.46,kick:.22,spin:.62,dash:.32}[p.pose]||.48))p.pose='idle';
      if(p.firstPending){p.firstHit-=dt;if(p.firstHit<=0){p.firstPending=false;if(!P.Exploration.hasHands(this)){P.Audio.play('punch');const e=this.nearEnemy(118);if(e)this.hitEnemy(e,10+s.player.attackLevel*3,18*p.dir);}}}
      if(p.secondPending){p.secondHit-=dt;if(p.secondHit<=0){p.secondPending=false;if(!P.Exploration.hasHands(this)){P.Audio.play('punch');const e=this.nearEnemy(118);if(e)this.hitEnemy(e,10+s.player.attackLevel*3,18*p.dir);}}}
      if(p.kickPending){p.kickHit-=dt;if(p.kickHit<=0){p.kickPending=false;P.Audio.play('kick');const e=this.nearEnemy(143);if(e)this.hitEnemy(e,17+s.player.attackLevel*4,190*p.dir);}}
      if(p.spinPending){p.spinHit-=dt;if(p.spinHit<=0){p.spinPending=false;P.Audio.play('spin');for(const e of this.enemies)if(e.hp>0&&e.active&&Math.abs(e.x-p.x)<185+p.spinLevel*15&&Math.abs(e.y-p.y)<150)this.hitEnemy(e,26+p.spinLevel*11,220*(e.x>p.x?1:-1));}}
      const axis=Number(this.right())-Number(this.left());p.running=!!axis&&(p.grounded||p.y>=C.ground-1)&&!!s.skills.run&&this.keys.has('shift');
      const target=axis*(p.running?C.runSpeed+(s.skills.run-1)*35:C.walkSpeed);p.vx+=(target-p.vx)*Math.min(1,dt*17);
      if(axis)p.dir=axis;
      if(p.dash>0){p.dash=Math.max(0,p.dash-dt);p.vx=p.dir*690;for(const e of this.enemies)if(e.hp>0&&e.active&&Math.abs(e.x-p.x)<115&&!p.dashHits.has(e.id)){p.dashHits.add(e.id);this.hitEnemy(e,30+(s.skills.dash||1)*9,p.dir*250);}}
      const previousX=p.x,previousY=p.y;p.x+=p.vx*dt;p.x=clamp(p.x,40,this.room.width-60);
      if(this.room.bossX&&this.remaining()>0)p.x=Math.min(p.x,this.room.bossX-C.bossGateOffset-105);
      if(!this.pig.carrying)p.x=clamp(p.x,Math.max(40,this.pig.x-470),Math.min(this.room.width-60,this.pig.x+470));
      const travelled=Math.abs(p.x-previousX);p.walkDistance+=travelled;p.stepDistance+=travelled;p.walkBlend+=(clamp(travelled/dt/C.walkSpeed,0,1)-p.walkBlend)*Math.min(1,dt*12);
      p.runBlend+=(Number(p.running)-p.runBlend)*Math.min(1,dt*10);p.gaitPhase+=travelled/(150+p.runBlend*40);
      if(p.stepDistance>(p.running?82:75)&&p.y>=C.ground-1){p.stepDistance=0;P.Audio.play(p.running?'run-step':'step');}
      if(p.flight>0){p.flight=Math.max(0,p.flight-dt);p.vy+=(p.y>C.ground-175?-220:60)*dt;p.vy=clamp(p.vy,-150,100);}else p.vy+=C.gravity*dt;
      p.y+=p.vy*dt;P.Exploration.physics(this,dt,previousX,previousY);if(p.y<C.ground-400){p.y=C.ground-400;p.vy=0;}
      this.pig.bounce=Math.max(0,this.pig.bounce-dt);if(this.pig.carrying){this.pig.x=p.x;this.pig.y=p.y-C.carryHeight;}else this.pig.y=C.ground;
      this.camera+=(clamp(p.x-410,0,Math.max(0,this.room.width-1280))-this.camera)*Math.min(1,dt*8);
      this.cameraY+=(P.World.height(this.room,p.x)*.75-this.cameraY)*Math.min(1,dt*4);
      P.State.reviveTick(s,dt,id=>{const h=this.helpers.find(h=>h.id===id);if(h){h.x=this.pig.x;h.y=C.ground;h.inv=1;}this.toast(P.helperById(id).name+' 부활 · 체력 50%');});
      for(const h of this.helpers){
        h.age+=dt;h.cd=Math.max(0,h.cd-dt);h.inv=Math.max(0,h.inv-dt);if(h.age>.45)h.pose='idle';if(s.helpers[h.id].hp<=0)continue;
        const oldX=h.x,def=P.helperById(h.id),anchor=s.mode==='guard'?this.pig.x:p.x-65;
        const candidates=this.enemies.filter(e=>e.hp>0&&e.active&&Math.abs(e.x-anchor)<(s.mode==='guard'?C.guardRadius:365));
        const enemy=candidates.sort((a,b)=>Math.abs(a.x-h.x)-Math.abs(b.x-h.x))[0];
        const followTarget=anchor-(this.helpers.indexOf(h)*42);let tx=enemy?enemy.x:followTarget;
        let dist=tx-h.x,range=enemy?def.range-12:20;
        if(Math.abs(dist)>range){h.vx=Math.sign(dist)*180;h.x+=h.vx*dt;h.dir=Math.sign(dist);}else h.vx=0;
        if(s.mode==='guard')h.x=clamp(h.x,this.pig.x-C.guardRadius,this.pig.x+C.guardRadius);
        h.x=clamp(h.x,30,this.room.width-30);
        h.walkDistance+=Math.abs(h.x-oldX);h.walkBlend+=(clamp(Math.abs(h.x-oldX)/dt/C.walkSpeed,0,1)-h.walkBlend)*Math.min(1,dt*12);
        if(enemy&&Math.abs(enemy.x-h.x)<def.range&&h.cd<=0){h.dir=enemy.x>h.x?1:-1;h.cd=def.cooldown;h.pose='punch';h.age=0;this.hitEnemy(enemy,def.attack,h.dir*20);
          if(h.id==='ember')this.particles.push({type:'beam',x:h.x,y:C.ground-118,tx:enemy.x,ty:C.ground-40,life:.15,max:.15});}
      }
      for(const e of this.enemies){
        if(e.hp<=0)continue;const def=this.enemyConfig(e);
        if(e.x+def.w>this.camera&&e.x-def.w<this.camera+1280)e.active=true;
        e.hit=Math.max(0,e.hit-dt);e.stun=Math.max(0,e.stun-dt);e.cd=Math.max(0,e.cd-dt);e.x+=e.kb*dt;e.kb*=Math.max(0,1-dt*8);
        e.x=clamp(e.x,25,this.room.width-25);if(!e.active)continue;if(e.type==='boss'){P.Combat.bossTick(this,e,dt);continue;}if(e.stun>0)continue;
        const target=this.targetFor(e);if(!target)continue;let dist=target.x-e.x;e.dir=dist>=0?1:-1;
        if(e.windup>0){e.windup-=dt;if(e.windup<=0&&Math.abs(dist)<def.range+28){
          this.hurt(target,def.attack*this.map.scale,e.x);if(e.type==='boss')this.particles.push({type:'ring',x:e.x,y:C.ground-5,r:30,life:.45,max:.45});}
          if(e.windup<=0&&e.type==='boss'&&this.map.boss?.wave){this.hazards.push({x:e.x,life:1.8,age:0,radius:0,speed:this.map.boss.wave,hit:new Set()});}continue;}
        if(Math.abs(dist)>def.range){e.x+=Math.sign(dist)*def.speed*dt;}
        else if(e.cd<=0){e.windup=e.type==='boss'?.55:.3;e.cd=def.cooldown;}
      }
      P.Combat.shotsTick(this,dt);
      for(const hazard of this.hazards){
        hazard.life-=dt;hazard.age+=dt;if(hazard.age<.35)continue;hazard.radius=(hazard.age-.35)*hazard.speed;
        const victims=[{kind:'player',x:p.x,y:p.y,actor:p},{kind:'pig',x:this.pig.x,y:this.pig.y,actor:this.pig},...this.helpers.filter(h=>s.helpers[h.id].hp>0).map(h=>({kind:'helper',x:h.x,y:h.y,actor:h}))];
        for(const v of victims){const key=v.kind+(v.actor.id||'');if(!hazard.hit.has(key)&&v.y>C.ground-35&&Math.abs(Math.abs(v.x-hazard.x)-hazard.radius)<22){hazard.hit.add(key);this.hurt(v,10*this.map.scale);}}
      }
      this.hazards=this.hazards.filter(h=>h.life>0);
      for(const bullet of this.projectiles){bullet.life-=dt;bullet.x+=bullet.vx*dt;const hit=this.enemies.find(e=>e.hp>0&&e.active&&Math.abs(e.x-bullet.x)<this.enemyConfig(e).w*.6&&bullet.y>e.y-this.enemyConfig(e).h-35&&bullet.y<e.y+20);if(hit){this.hitEnemy(hit,bullet.damage,Math.sign(bullet.vx)*70);bullet.life=0;}}
      this.projectiles=this.projectiles.filter(b=>b.life>0);
      this.progress.drops=this.progress.drops.filter(d=>{if(d.room===this.roomId&&Math.abs(p.x-d.x)<36&&p.y>C.ground-85){s.runCoins+=d.value;this.coinFlights.push({x:d.x,y:C.ground-16,t:0});this.pig.bounce=.35;P.Audio.play('coin');return false;}return true;});
      for(const f of this.coinFlights)f.t+=dt*2.9;this.coinFlights=this.coinFlights.filter(f=>f.t<1);
      for(const f of this.floaters){f.life-=dt;f.y-=25*dt;}this.floaters=this.floaters.filter(f=>f.life>0);
      for(const f of this.particles){f.life-=dt;if(f.type==='ring')f.r+=300*dt;else if(!f.type){f.x+=f.vx*dt;f.y+=f.vy*dt;}}
      this.particles=this.particles.filter(f=>f.life>0);this.flash=Math.max(0,this.flash-dt);this.shake*=Math.max(0,1-dt*14);
      if(this.pig.hp<=0){this.finish('pig-death');return;}
      if(p.hp<=0){this.finish('player-death');return;}
      if(this.pendingClear){this.clearMap();return;}
      this.spawnBoss();if(this.savedAt>.8){this.savedAt=0;this.snapshot();}
    }
    snapshot(){
      if(!this.player||!this.map)return;
      const s=P.state;s.player.hp=this.player.hp;s.pig.hp=this.pig.hp;
      P.Exploration.snapshot(this);
      Object.assign(this.progress,{room:this.roomId,x:this.player.x,pigX:this.pig.x,carrying:this.pig.carrying});
      if(!P.State.save(s))P.UI?.storageWarning();
    }
    finish(reason){
      if(this.mode!=='play'&&this.mode!=='pause')return;
      this.snapshot();const result=P.State.settle(P.state,reason);
      if(reason==='player-death'||reason==='pig-death'){this.progress.x=180;this.progress.pigX=225;this.progress.carrying=false;this.progress.carriedObject='';}
      P.State.save(P.state);this.clearInput();this.mode='result';P.UI?.result(result);return result;
    }
    clearMap(){
      // Sweep uncollected coins on successful completion only, once.
      P.state.runCoins+=this.progress.drops.reduce((sum,d)=>sum+d.value,0);this.progress.drops=[];
      this.progress.cleared=true;P.Audio.play('clear');const next=P.MAPS[P.MAPS.indexOf(this.map)+1];if(next&&!P.state.unlocked.includes(next.id))P.state.unlocked.push(next.id);
      this.finish('clear');
    }
    draw(){
      const c=this.ctx,t=this.mode==='home'?this.decorTime:this.time,reduced=P.state.settings.reducedMotion;
      if(this.mode==='home'){
        A.scenery(c,0,reduced?0:t,P.mapById(P.state.selectedMap).theme);
        A.ellipse(c,933,C.ground+4,144,13,'rgba(65,79,47,.11)');
        A.stick(c,862,C.ground,{time:reduced?0:t,color:'#294a40',scale:1.45});
        A.image(c,'pig',1000,C.ground,132,89);
        A.stick(c,1110,C.ground,{time:reduced?0:t+.8,color:'#498c83',band:'#bad2ae',scale:.94});
        A.image(c,'coin',959,390+Math.sin(t)*6,23,26);A.image(c,'coin',1024,349+Math.sin(t+1)*5,18,21);
        return;
      }
      P.World.backdrop(c,this);const H=x=>P.World.height(this.room,x),at=(x,fn)=>P.World.at(c,this.room,x,fn);
      c.save();if(this.shake&&!reduced)c.translate(Math.sin(t*93)*this.shake,Math.cos(t*81)*this.shake*.3);c.translate(-this.camera,-this.cameraY);
      A.landmarks(c,this.room,this.camera,this.map.theme);P.Exploration.draw(c,this);
      for(const portal of this.room.portals.filter(p=>!p.secret||this.progress.visited.includes(p.target)))P.World.sign(c,portal,this.room,this.player.x);
      for(const chest of this.room.chests)at(chest.x,()=>{const open=this.progress.opened.includes(chest.id);c.save();c.globalAlpha=open?.35:1;P.Pixel.sprite(c,'crate',chest.x,C.ground+2,69,56);c.restore();if(!open&&Math.abs(chest.x-this.player.x)<120)A.label(c,'E · 상자 열기',chest.x,C.ground-67,13);});
      const found=this.room.helper;if(found&&!P.state.helpers[found.id])at(found.x,()=>{A.stick(c,found.x,C.ground,{color:P.helperById(found.id).color,time:t,scale:.8});A.label(c,'E · '+P.helperById(found.id).name+'와 만나기',found.x,C.ground-159,13);});
      if(this.room.bossX)at(this.room.bossX-C.bossGateOffset,()=>A.gate(c,this.room.bossX-C.bossGateOffset,this.remaining()>0,this.remaining(),this.map.bossName,this.map.theme));
      if(P.state.mode==='guard'){c.save();c.setLineDash([5,8]);c.strokeStyle='rgba(77,118,92,.3)';c.lineWidth=1.4;c.beginPath();c.ellipse(this.pig.x,C.ground+3+H(this.pig.x),C.guardRadius,32,0,0,Math.PI*2);c.stroke();c.restore();}
      for(const d of this.progress.drops)if(d.room===this.roomId&&d.x>this.camera-30&&d.x<this.camera+1310)A.image(c,'coin',d.x,C.ground-5+H(d.x)+Math.sin(t*3+d.x)*3,19,23);
      for(const e of this.enemies){if(e.hp<=0||e.x<this.camera-200||e.x>this.camera+1480)continue;at(e.x,()=>{const def=this.enemyConfig(e);
        A.ellipse(c,e.x,C.ground+4,def.w*.4,6,'rgba(54,75,50,.13)');c.save();c.translate(e.x,C.ground+(e.bossLift||0));c.scale(-e.dir,1);
        if(e.type==='slime'){const squish=Math.sin(t*6+e.phase)*.045;c.scale(1+squish,1-squish);}
        if(e.type==='bat')c.translate(0,-26-Math.sin(t*10+e.phase)*9);
        if(e.type==='boar')c.rotate(Math.sin(t*9+e.phase)*.025);
        if(e.type==='boss')c.translate(0,Math.sin(t*2)*1.5);
        if(e.hit>0)c.globalAlpha=.6;A.image(c,def.asset,0,0,def.w,def.h);c.restore();
        if(e.hp<e.max||e.type==='boss')A.bar(c,e.x,C.ground+(e.bossLift||0)-def.h-(e.type==='bat'?35:12),e.hp,e.max,e.type==='boss'?160:55,'#b88078');
        if(e.type==='boss')A.label(c,this.map.bossName,e.x,C.ground+(e.bossLift||0)-def.h-33,14);
        if(e.windup>0)A.label(c,e.type==='boss'?e.warning:'!',e.x,C.ground-def.h-(e.type==='boss'?57:24),e.type==='boss'?12:24,'#b97955');
        if(e.type==='boss'&&e.pattern==='leap'&&e.windup>0)A.ellipse(c,e.aimX,C.ground+H(e.aimX)-H(e.x),60,12,'#c3846c55');
        });
      }
      for(const h of this.helpers){const def=P.helperById(h.id),stored=P.state.helpers[h.id];if(stored.hp<=0)continue;at(h.x,()=>{
        A.ellipse(c,h.x,C.ground+3,22,5,'rgba(45,80,60,.12)');A.stick(c,h.x,h.y,{time:this.time,speed:h.vx,walkDistance:h.walkDistance,walkBlend:h.walkBlend,dir:h.dir,pose:h.pose,age:h.age,color:def.color,band:'#d4ddbc',scale:.86,shield:h.id==='shield',hit:h.inv>.1});A.bar(c,h.x,h.y-169,stored.hp,def.hp,55,'#7ca598');});}
      const bounce=reduced?0:Math.sin(this.pig.bounce*32)*this.pig.bounce*13;
      at(this.pig.x,()=>{A.ellipse(c,this.pig.x,C.ground+4,36,6,'rgba(45,80,60,.13)');A.image(c,'pig',this.pig.x,this.pig.y-bounce,94,63);A.bar(c,this.pig.x,this.pig.y-78-bounce,this.pig.hp,P.state.pig.max,84,'#cc91a0');
      const threat=this.enemies.some(e=>e.hp>0&&e.active&&Math.abs(e.x-this.pig.x)<C.guardRadius);
      if(threat)A.label(c,'! 저금통 주의',this.pig.x,this.pig.y-94,13,'#a86a62');
      for(const id of this.helpers.map(h=>h.id)){const stored=P.state.helpers[id];if(stored.hp<=0)A.label(c,P.helperById(id).name+' 부활 '+Math.ceil(stored.revive)+'초',this.pig.x,this.pig.y-111-P.state.party.indexOf(id)*17,12);}});
      at(this.player.x,()=>{A.ellipse(c,this.player.x,(this.player.grounded?this.player.y:C.ground)+4,23,5,'rgba(39,69,51,.15)');
      A.stick(c,this.player.x,this.player.y,{time:this.time,speed:this.player.vx,phase:this.player.gaitPhase,walkBlend:this.player.walkBlend,runBlend:this.player.runBlend,dir:this.player.dir,pose:this.player.pose,age:this.player.age,aimY:this.player.aimY,kickAimY:this.player.kickAimY,spinAimY:this.player.spinAimY,carrying:P.Exploration.hasHands(this),air:!this.player.grounded&&this.player.y<C.ground-4,hit:this.player.inv>.35,playerShield:P.Combat.shieldActive(this),blocking:P.Combat.blocking(this),slope:this.pig.carrying?0:Math.atan((H(this.player.x+10)-H(this.player.x-10))/20)});
      const object=this.objects.find(o=>o.carried);if(object)P.Pixel.sprite(c,object.kind,this.player.x,this.player.y-C.carryHeight+object.h*.12,object.w+12,object.h+12);
      A.bar(c,this.player.x,this.player.y-(P.Combat.blocking(this)?174:210),this.player.hp,P.state.player.max,66,this.player.hp/P.state.player.max<.3?'#c85555':'#6d9878');});
      for(const h of this.hazards){
        if(h.age<.35){c.globalAlpha=.6;A.ellipse(c,h.x,C.ground+H(h.x),85,12,'#c5a36e');A.label(c,'충격파 · 뒤로 피하세요',h.x,C.ground-218+H(h.x),13);c.globalAlpha=1;}
        else for(const sign of [-1,1]){A.line(c,[[h.x+sign*h.radius,C.ground+H(h.x+sign*h.radius)],[h.x+sign*h.radius-10,C.ground-22+H(h.x+sign*h.radius)]],this.map.theme==='brook'?'#72a7a1':'#d2a66f',6);}
      }
      for(const b of this.projectiles)at(b.x,()=>{A.ellipse(c,b.x,b.y,b.type==='fire'?12:8,b.type==='fire'?8:3,b.type==='fire'?'#e6a36b':'#e9d7a0');A.line(c,[[b.x-Math.sign(b.vx)*23,b.y],[b.x,b.y]],'#f8dfac',3);});
      for(const b of this.enemyShots)at(b.x,()=>{A.ellipse(c,b.x,b.y,b.r,b.r,b.theme==='amber'?'#c68357':b.theme==='brook'?'#81b8b2':'#879c60');A.line(c,[[b.x-Math.sign(b.vx)*18,b.y],[b.x,b.y]],'#dfdaba',3);});
      for(const f of this.coinFlights){let q=f.t,x=f.x+(this.pig.x-f.x)*q,y=f.y+(this.pig.y-35-f.y)*q-Math.sin(q*Math.PI)*90;A.image(c,'coin',x,y+H(x),17,20);}
      for(const f of this.particles){c.save();c.translate(0,H(f.x));c.globalAlpha=Math.max(0,f.life/f.max);
        if(f.type==='ring'){c.strokeStyle='#ebd5a1';c.lineWidth=4;c.beginPath();c.ellipse(f.x,f.y,f.r,f.r*.4,0,0,Math.PI*2);c.stroke();}
        else if(f.type==='beam')A.line(c,[[f.x,f.y],[f.tx,f.ty+H(f.tx)-H(f.x)]],'#e3ac78',3);
        else A.ellipse(c,f.x,f.y,4,4,f.color);c.restore();}
      for(const f of this.floaters){c.globalAlpha=Math.min(1,f.life*3);A.label(c,f.text,f.x,f.y+H(f.x),15,f.color);}c.globalAlpha=1;c.restore();
      P.World.foreground(c,this);
      if(this.travel)this.drawTravel(c);
      if(this.roomTitle>0&&!this.travel){c.globalAlpha=Math.min(1,this.roomTitle);A.label(c,this.map.name+' · '+this.room.name,640,208,23);c.globalAlpha=1;}
      if(this.flash>0&&!reduced){c.fillStyle='rgba(215,77,93,'+(this.flash*.3)+')';c.fillRect(0,0,1280,720);}
    }
    frame(now){
      const dt=this.last?Math.min((now-this.last)/1000,.1):0;this.last=now;this.decorTime+=dt;
      if(this.mode==='play'){this.accumulator+=dt;while(this.accumulator>=C.fixedStep){this.tick(C.fixedStep);this.accumulator-=C.fixedStep;if(this.mode!=='play'){this.accumulator=0;break;}}}else this.accumulator=0;
      this.draw();P.UI?.updateHUD();requestAnimationFrame(n=>this.frame(n));
    }
  }
  P.Game=Game;
})(globalThis.PIGGY = globalThis.PIGGY || {});
