/** Fixed-step, pause-safe single-player simulation. No wall-clock combat timers. */
(function(P){
  'use strict';
  const C=P.CONFIG,A=P.Art,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  class Game {
    constructor(canvas) {
      this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
      this.mode='home';this.keys=new Set();this.time=0;this.decorTime=0;this.camera=0;this.accumulator=0;this.last=0;
      this.particles=[];this.floaters=[];this.projectiles=[];this.coinFlights=[];this.flash=0;this.shake=0;this.savedAt=0;
      this.resize();this.onResize=()=>this.resize();window.addEventListener('resize',this.onResize);
    }
    resize(){const d=Math.min(window.devicePixelRatio||1,2);this.canvas.width=1280*d;this.canvas.height=720*d;this.ctx.setTransform(d,0,0,d,0,0);}
    clearInput(){this.keys.clear();this.attackPending=null;P.Controls?.releaseAll();}
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
        revive:s.player.revive||0,shieldRaised:!!s.skills.woodshield,dig:0,punch:0,kick:0,firstHit:0,firstPending:false,secondHit:0,secondPending:false,kickPending:false,spinPending:false,
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
      this.projectiles=[];this.enemyShots=[];this.shieldHits=0;this.hazards=[];this.fieldEffects=[];this.particles=[];this.coinFlights=[];this.floaters=[];this.flash=0;this.shake=0;
      P.Companions.initRoom(this);
      this.camera=clamp(this.player.x-410,0,Math.max(0,this.room.width-1280));
      this.cameraY=P.World.height(this.room,this.player.x)*.75;this.spawnBoss();this.roomTitle=3;
    }
    enemyConfig(e){return P.ENEMIES[e.type];}
    makeEnemy(e){const conf=this.enemyConfig(e),scale=this.map.scale;return {...e,y:C.ground,hp:Math.ceil(conf.hp*scale),max:Math.ceil(conf.hp*scale),active:false,cd:.8,windup:0,stun:0,kb:0,hit:0,dir:-1,phase:e.x*.01,animationX:e.x,walkDistance:0,wingTime:0};}
    remaining(){return P.requiredEnemies(this.map).filter(e=>!this.progress.dead.includes(e.id)).length;}
    spawnBoss(){} // Kept as a compatibility hook; bosses are no longer spawned.
    toast(text){if(text==='all-cleared')text='일반 길의 몬스터를 모두 처치했어요. 비밀 구역은 선택이에요.';P.UI?.toast(text);}
    nearEnemy(range,center=this.player.x,vertical=140){return this.enemies.filter(e=>e.hp>0&&e.active&&Math.abs(e.x-center)<range&&Math.abs(e.y-this.player.y)<vertical).sort((a,b)=>Math.abs(a.x-center)-Math.abs(b.x-center))[0];}
    attackTap(){
      if(this.mode!=='play'||this.player.hp<=0||this.travel||this.player.dig>0||this.player.knock)return;
      if(this.attackPending!==null&&this.attackPending!==undefined){
        this.attackPending=null;this.punch();
      }else this.attackPending=C.attackTapWindow;
    }
    punch(){
      if(this.mode!=='play'||this.player.hp<=0||this.travel||this.player.dig>0||this.player.knock)return;
      this.attackPending=null;
      const p=this.player;P.Tutorial?.event('attack');if(P.Exploration.hasHands(this)){this.toast('저금통을 들고 있을 때는 발차기를 사용해요.');return;}if(p.punch>0)return;
      if((p.pose==='kick'&&p.age<.22)||(p.pose==='spin'&&p.age<.62))return;
      p.punch=C.punchCooldown;p.pose='punch';p.age=0;p.firstHit=.09;p.firstPending=true;p.secondHit=.29;p.secondPending=true;
      const enemy=this.nearEnemy(118);p.aimY=enemy?clamp(enemy.y-p.y-this.enemyConfig(enemy).h*.55,-132,-34):-125;
      if(enemy)p.dir=enemy.x>p.x?1:-1;
    }
    kick(){
      if(this.mode!=='play'||this.player.hp<=0||this.travel||this.player.dig>0||this.player.knock||this.player.kick>0)return;const p=this.player;if(p.pose==='spin'&&p.age<.62)return;p.kick=C.kickCooldown;p.pose='kick';p.age=0;
      P.Tutorial?.event('attack');this.attackPending=null;
      p.firstPending=false;p.secondPending=false;p.kickHit=.045;p.kickPending=true;
      const enemy=this.nearEnemy(143);p.kickAimY=enemy?clamp(enemy.y-p.y-this.enemyConfig(enemy).h*.5,-95,-28):-74;if(enemy)p.dir=enemy.x>p.x?1:-1;
    }
    toggleShield(){if(this.mode!=='play'||this.player.hp<=0||this.travel||!P.state.skills.woodshield||P.Exploration.hasHands(this))return;this.player.shieldRaised=!this.player.shieldRaised;P.Audio.play('carry');}
    interactionLabel(){
      const p=this.player;if(!p||!this.room||this.travel)return '';
      const digging=P.Exploration.site(this);if(digging&&!this.pig.carrying)return P.state.skills.shovel?'흙 파기':'흙의 흔적 조사';
      if(this.room.chests.some(c=>!this.progress.opened.includes(c.id)&&Math.abs(c.x-p.x)<100))return '상자 열기';
      if(this.room.helper&&!this.helpers.some(h=>h.id===this.room.helper.id)&&Math.abs(this.room.helper.x-p.x)<95)return '조수와 만나기';
      if(this.room.portals.some(portal=>Math.abs(portal.x-p.x)<90&&P.Exploration.accessible(this,portal))&&(this.pig.carrying||Math.abs(this.pig.x-p.x)<=150))return '샛길 이동';
      if(this.pig.carrying)return '저금통 내려놓기';if(Math.abs(this.pig.x-p.x)<100)return '저금통 들기';return '';
    }
    interact(){
      if(this.mode!=='play'||this.player.hp<=0||this.travel||this.player.dig>0||this.player.knock)return;const p=this.player,s=P.state;
      this.attackPending=null;
      const digging=P.Exploration.site(this);if(digging&&!this.pig.carrying){P.Exploration.dig(this,digging);return;}
      const chest=this.room.chests.find(c=>!this.progress.opened.includes(c.id)&&Math.abs(c.x-p.x)<100);
      if(chest){this.progress.opened.push(chest.id);s.runCoins+=chest.coins||0;s.inventory.potion=Math.min(999,s.inventory.potion+(chest.potion||0));s.inventory.repair=Math.min(999,s.inventory.repair+(chest.repair||0));this.pig.bounce=.5;this.snapshot();P.Audio.play('chest');P.UI?.loot(chest);return;}
      const found=this.room.helper;
      if(found&&!this.helpers.some(h=>h.id===found.id)&&Math.abs(found.x-p.x)<95){const def=P.helperById(found.id);s.helpers[found.id] ||= P.newHelper(def.id);P.Exploration.join(this,def);this.snapshot();P.UI?.foundHelper(def);return;}
      const portal=this.room.portals.filter(x=>Math.abs(x.x-p.x)<90&&P.Exploration.accessible(this,x)).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
      if(portal){if(!this.pig.carrying&&Math.abs(this.pig.x-p.x)>150){this.toast('저금통을 가까이 데려오거나 들고 이동하세요.');return;}
        this.travel={portal:{...portal},age:0,duration:1.15,from:this.room.name,to:this.map.rooms[portal.target].name};this.clearInput();this.snapshot();P.Audio.play('step');return;}
      if(this.pig.carrying){this.pig.carrying=false;this.pig.x=clamp(p.x+p.dir*38,35,this.room.width-35);this.pig.y=C.ground;}
      else if(Math.abs(this.pig.x-p.x)<100){P.Tutorial?.event('interact');this.pig.carrying=true;this.pig.x=p.x;this.pig.y=p.y-C.carryHeight;}
      else{this.toast('저금통·상자·샛길 가까이에서 E를 눌러주세요.');return;}
      P.Audio.play('carry');this.snapshot();
    }
    jump(){
      if(this.mode!=='play'||this.player.hp<=0||this.travel||this.player.dig>0||this.player.knock)return;const p=this.player;if(p.vy!==0||(!p.grounded&&p.y<C.ground-1))return;
      P.Tutorial?.event('jump');p.vy=-610;p.grounded=false;p.firstPending=false;p.secondPending=false;p.pose='idle';P.Audio.play('skill');
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
      if(enemy.hp<=0)return;if(enemy.type==='rock'&&enemy.guardTime>0){damage*=.35;kb*=.1;P.Audio.play('wood');}enemy.hp=Math.max(0,enemy.hp-damage);enemy.kb+=kb;enemy.hit=.16;enemy.stun=.12;
      this.floaters.push({x:enemy.x,y:enemy.y-this.enemyConfig(enemy).h-8,text:Math.round(damage).toString(),life:.65,color:'#506b4c'});
      this.shake=P.state.settings.reducedMotion?0:2.5;P.Audio.play('hit');
      if(enemy.hp===0)this.kill(enemy);
    }
    kill(e){
      if(this.progress.dead.includes(e.id))return;P.Tutorial?.event('kill');this.progress.dead.push(e.id);P.Audio.play('monster-death');P.state.stats.kills++;
      const total=P.ENEMIES[e.type].coins,count=3;for(let i=0;i<count;i++){
        this.progress.drops.push({id:e.id+'-coin-'+i,room:this.roomId,x:clamp(e.x+(i-1)*19,25,this.room.width-25),value:i===count-1?total-Math.floor(total/count)*2:Math.floor(total/count)});
      }
      for(let i=0;i<6;i++)this.particles.push({x:e.x,y:C.ground-25,vx:Math.cos(i)*60,vy:-70+Math.sin(i)*50,life:.45,max:.45,color:'#d4dfa7'});
      this.snapshot();
    }
    hurt(target,damage,sourceX,charge=false){
      if(target.kind==='player'){
        const p=this.player;if(p.hp<=0||p.inv>0||p.dash>0)return;
        const guarded=P.Combat.shieldActive(this)&&Number.isFinite(sourceX)&&(sourceX-p.x)*p.dir>0;
        if(guarded){damage*=P.Combat.blocking(this)?.2:.5;P.Combat.woodHit(this);}
        p.hp=Math.max(0,p.hp-damage);p.inv=.55;
        if(charge&&!guarded&&!p.knock){
          const dir=p.x>=sourceX?1:-1;p.knock={stage:'air',age:0};p.vx=dir*430;p.vy=-330;p.grounded=false;p.flight=p.dash=0;
          p.pose='idle';p.age=0;p.firstPending=p.secondPending=p.kickPending=p.spinPending=false;this.attackPending=null;
          if(this.pig.carrying){this.pig.carrying=false;this.pig.x=p.x;this.pig.y=C.ground;}
          P.Audio.play('hit');
        }
      }
      if(target.kind==='pig'){this.pig.hp=Math.max(0,this.pig.hp-damage);this.flash=.22;P.Audio.play('warning');}
      if(target.kind==='helper'){
        const h=target.actor,stored=P.state.helpers[h.id];if(h.inv>0||stored.hp<=0)return;stored.hp=Math.max(0,stored.hp-damage);h.inv=.3;
        P.Audio.play('companion-hurt');if(stored.hp<=0){P.Audio.play('companion-fall');stored.revive=C.reviveSeconds;this.toast(P.helperById(h.id).name+' · 10초 뒤 저금통에서 다시 만나요.');}
      }
      this.floaters.push({x:target.x,y:C.ground-118,text:'−'+Math.ceil(damage),life:.7,color:'#b76f7d'});
    }
    targets(){return [...(this.player.hp>0?[{kind:'player',x:this.player.x,y:this.player.y,actor:this.player}]:[]),{kind:'pig',x:this.pig.x,y:this.pig.y,actor:this.pig},...this.helpers.filter(h=>P.state.helpers[h.id]?.hp>0).map(h=>({kind:'helper',x:h.x,y:h.y,actor:h}))];}
    targetFor(e){
      const targets=[...(this.player.hp>0?[{kind:'player',x:this.player.x,y:this.player.y,actor:this.player}]:[]),{kind:'pig',x:this.pig.x,y:this.pig.y,actor:this.pig}];
      for(const h of this.helpers)if(P.state.helpers[h.id].hp>0)targets.push({kind:'helper',x:h.x,y:h.y,actor:h});
      return targets.filter(t=>Math.abs(t.y+(t.kind==='pig'&&this.pig.carrying?C.carryHeight-140:0)-C.ground)<155).sort((a,b)=>Math.abs(a.x-e.x)-Math.abs(b.x-e.x))[0];
    }
    knockTick(){const p=this.player;if(p.knock){if(p.knock.stage==='air'&&p.grounded){p.knock.stage='down';p.knock.age=0;}else if(p.knock.stage==='down'&&p.knock.age>=.28){p.knock.stage='getup';p.knock.age=0;}else if(p.knock.stage==='getup'&&p.knock.age>=.32)p.knock=null;}}
    training(){return !P.state.tutorial?.complete&&P.state.tutorial?.step<5&&this.map?.id==='wind';}
    tickAttacks(dt){const p=this.player,s=P.state;
      p.dig=Math.max(0,p.dig-dt);p.punch=Math.max(0,p.punch-dt);p.kick=Math.max(0,p.kick-dt);p.inv=Math.max(0,p.inv-dt);p.age+=dt;
      for(const id of Object.keys(p.skills))p.skills[id]=Math.max(0,p.skills[id]-dt);
      if(p.age>({dig:.48,punch:.46,kick:.22,spin:.62,dash:.32}[p.pose]||.48))p.pose='idle';
      if(p.firstPending){p.firstHit-=dt;if(p.firstHit<=0){p.firstPending=false;if(!P.Exploration.hasHands(this)){P.Audio.play('punch');const e=this.nearEnemy(118);if(e)this.hitEnemy(e,10+s.player.attackLevel*3,18*p.dir);}}}
      if(p.secondPending){p.secondHit-=dt;if(p.secondHit<=0){p.secondPending=false;if(!P.Exploration.hasHands(this)){P.Audio.play('punch');const e=this.nearEnemy(118);if(e)this.hitEnemy(e,10+s.player.attackLevel*3,18*p.dir);}}}
      if(p.kickPending){p.kickHit-=dt;if(p.kickHit<=0){p.kickPending=false;P.Audio.play('kick');const e=this.nearEnemy(143);if(e)this.hitEnemy(e,17+s.player.attackLevel*4,190*p.dir);}}
    }
    tick(dt){
      if(this.mode!=='play')return;if(this.travel){this.travelTick(dt);return;}
      if(this.mode!=='play'||this.travel)return;
      const p=this.player,s=P.state;this.time+=dt;
      if(p.hp<=0){if(!p.revive)this.beginRevive();p.revive=Math.max(0,p.revive-dt);if(p.revive===0){p.hp=Math.ceil(s.player.max*C.reviveFraction);p.x=this.pig.x;p.y=C.ground;p.vy=0;p.knock=null;p.inv=2;s.player.hp=p.hp;this.toast('저금통에서 부활 · 체력 50%');P.Audio.play('heal');this.snapshot();}}
      P.Tutorial?.tick(this);this.savedAt+=dt;this.roomTitle=Math.max(0,this.roomTitle-dt);
      if(this.attackPending!==null&&this.attackPending!==undefined){this.attackPending-=dt;if(this.attackPending<=0){this.attackPending=null;this.kick();}}
      this.tickAttacks(dt);
      const axis=p.hp>0?Number(this.right())-Number(this.left()):0;p.running=false;
      const target=(p.pose==='dig'||p.knock?0:axis)*C.walkSpeed;if(p.knock){p.knock.age+=dt;p.vx*=Math.max(0,1-dt*(p.knock.stage==='air'?.7:12));}else p.vx+=(target-p.vx)*Math.min(1,dt*17);
      if(axis&&!p.knock)p.dir=axis;
      if(p.hp<=0){p.vx=0;p.vy=0;p.firstPending=p.secondPending=p.kickPending=false;}
      const previousX=p.x,previousY=p.y;p.x+=p.vx*dt;p.x=clamp(p.x,40,this.room.width-60);

      if(!this.pig.carrying)p.x=clamp(p.x,Math.max(40,this.pig.x-C.tetherRadius),Math.min(this.room.width-60,this.pig.x+C.tetherRadius));
      const travelled=Math.abs(p.x-previousX);p.walkDistance+=travelled;p.stepDistance+=travelled;p.walkBlend+=((p.knock?0:clamp(travelled/dt/C.walkSpeed,0,1))-p.walkBlend)*Math.min(1,dt*12);
      p.runBlend+=(Number(p.running)-p.runBlend)*Math.min(1,dt*10);p.gaitPhase+=(p.knock?0:travelled)/(150+p.runBlend*40);
      if(!p.knock&&p.stepDistance>(p.running?82:75)&&p.y>=C.ground-1){p.stepDistance=0;P.Audio.play(p.running?'run-step':'step');}
      p.vy+=C.gravity*dt;
      p.y+=p.vy*dt;P.Exploration.physics(this,dt,previousX,previousY);this.knockTick();if(p.y<C.ground-400){p.y=C.ground-400;p.vy=0;}
      this.pig.bounce=Math.max(0,this.pig.bounce-dt);if(this.pig.carrying){this.pig.x=p.x;this.pig.y=p.y-C.carryHeight;}else this.pig.y=C.ground;
      this.camera+=(clamp(p.x-410,0,Math.max(0,this.room.width-1280))-this.camera)*Math.min(1,dt*8);
      this.cameraY=0;
      P.State.reviveTick(s,dt,id=>{const h=this.helpers.find(h=>h.id===id);if(h){h.x=this.pig.x;h.y=C.ground;h.inv=1;}this.toast(P.helperById(id).name+' 부활 · 체력 50%');});
      P.Companions.tick(this,dt);
      for(const e of this.enemies){
        if(e.hp<=0||this.training())continue;const def=this.enemyConfig(e);
        if(e.x+def.w>this.camera&&e.x-def.w<this.camera+1280)e.active=true;
        e.hit=Math.max(0,e.hit-dt);e.stun=Math.max(0,e.stun-dt);e.cd=Math.max(0,e.cd-dt);e.x+=e.kb*dt;e.kb*=Math.max(0,1-dt*8);
        e.x=clamp(e.x,25,this.room.width-25);if(!e.active)continue;if(e.stun>0)continue;if(e.type.startsWith('cave-')){P.Combat.caveTick(this,e,dt);continue;}
        P.Combat.surfaceTick(this,e,dt);
      }
      for(const e of this.enemies)if(e.hp>0&&e.active){const before=e.walkDistance||0;P.Animation.advance(e,dt);e.stepDistance=(e.stepDistance||0)+e.walkDistance-before;if(e.stepDistance>65&&P.Companions.visible(this,e)&&e.type!=='bat'){e.stepDistance=0;P.Audio.play('monster-step');}}
      P.Combat.fieldsTick(this,dt);
      P.Combat.shotsTick(this,dt);
      for(const hazard of this.hazards){
        hazard.life-=dt;hazard.age+=dt;if(hazard.age<.35)continue;hazard.radius=(hazard.age-.35)*hazard.speed;
        const victims=[{kind:'player',x:p.x,y:p.y,actor:p},{kind:'pig',x:this.pig.x,y:this.pig.y,actor:this.pig},...this.helpers.filter(h=>s.helpers[h.id].hp>0).map(h=>({kind:'helper',x:h.x,y:h.y,actor:h}))];
        for(const v of victims){const key=v.kind+(v.actor.id||'');if(!hazard.hit.has(key)&&v.y>C.ground-35&&Math.abs(Math.abs(v.x-hazard.x)-hazard.radius)<22){hazard.hit.add(key);this.hurt(v,10*this.map.scale);}}
      }
      this.hazards=this.hazards.filter(h=>h.life>0);
      for(const bullet of this.projectiles){bullet.life-=dt;bullet.x+=bullet.vx*dt;const hit=this.enemies.find(e=>e.hp>0&&e.active&&Math.abs(e.x-bullet.x)<this.enemyConfig(e).w*.6&&bullet.y>e.y-this.enemyConfig(e).h-35&&bullet.y<e.y+20);if(hit){if(hit.type==='rock'&&hit.guardTime>0){this.enemyShots.push({type:'reflected',x:hit.x-Math.sign(bullet.vx)*48,y:bullet.y,vx:-bullet.vx,vy:0,r:5,life:1.4,damage:bullet.damage*.5,theme:'forest'});P.Audio.play('wood');}else this.hitEnemy(hit,bullet.damage,Math.sign(bullet.vx)*70);bullet.life=0;}}
      this.projectiles=this.projectiles.filter(b=>b.life>0);
      this.progress.drops=this.progress.drops.filter(d=>{if(p.hp>0&&d.room===this.roomId&&Math.abs(p.x-d.x)<36&&p.y>C.ground-85){s.runCoins+=d.value;this.coinFlights.push({x:d.x,y:C.ground-16,t:0});this.pig.bounce=.35;P.Audio.play('coin');return false;}return true;});
      for(const f of this.coinFlights)f.t+=dt*2.9;this.coinFlights=this.coinFlights.filter(f=>f.t<1);
      for(const f of this.floaters){f.life-=dt;f.y-=25*dt;}this.floaters=this.floaters.filter(f=>f.life>0);
      for(const f of this.particles){f.life-=dt;if(f.type==='ring')f.r+=300*dt;else if(!f.type){f.x+=f.vx*dt;f.y+=f.vy*dt;}}
      this.particles=this.particles.filter(f=>f.life>0);this.flash=Math.max(0,this.flash-dt);this.shake*=Math.max(0,1-dt*14);
      if(this.pig.hp<=0){this.finish('pig-death');return;}
      if(p.hp<=0&&!p.revive)this.beginRevive();
      if(this.remaining()===0&&p.hp>0){this.clearMap();return;}
      this.spawnBoss();if(this.savedAt>.8){this.savedAt=0;this.snapshot();}
    }
    beginRevive(){const p=this.player;p.revive=C.reviveSeconds;this.clearInput();p.pose='idle';p.firstPending=p.secondPending=p.kickPending=false;if(this.pig.carrying){this.pig.carrying=false;this.pig.x=p.x;this.pig.y=C.ground;}this.snapshot();}
    snapshot(){
      if(!this.player||!this.map)return;
      const s=P.state;s.player.hp=this.player.hp;s.player.revive=this.player.revive||0;s.pig.hp=this.pig.hp;
      P.Exploration.snapshot(this);
      Object.assign(this.progress,{room:this.roomId,x:this.player.x,pigX:this.pig.x,carrying:this.pig.carrying});
      if(!P.State.save(s))P.UI?.storageWarning();
    }
    finish(reason){
      if(this.mode!=='play'&&this.mode!=='pause')return;
      if(reason==='player-death'){this.beginRevive();return;}
      this.snapshot();const result=P.State.settle(P.state,reason);
      if(reason==='pig-death'){this.progress.carrying=false;this.progress.carriedObject='';}
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
      for(const chest of this.room.chests)at(chest.x,()=>{const open=this.progress.opened.includes(chest.id);c.save();c.globalAlpha=open?.35:1;P.Pixel.sprite(c,'chest',chest.x,C.ground+2,69,56);c.restore();if(!open&&Math.abs(chest.x-this.player.x)<120)A.label(c,'E · 상자 열기',chest.x,C.ground-67,13);});
      const found=this.room.helper;if(found&&!this.helpers.some(h=>h.id===found.id))at(found.x,()=>{A.stick(c,found.x,C.ground,{color:P.helperById(found.id).color,time:t,scale:.8});A.label(c,'E · '+P.helperById(found.id).name+'와 만나기',found.x,C.ground-159,13);});

      for(const d of this.progress.drops)if(d.room===this.roomId&&d.x>this.camera-30&&d.x<this.camera+1310)A.image(c,'coin',d.x,C.ground-5+H(d.x)+Math.sin(t*3+d.x)*3,19,23);
      for(const e of this.enemies){if(e.hp<=0||e.x<this.camera-200||e.x>this.camera+1480)continue;at(e.x,()=>{const def=this.enemyConfig(e);
        A.ellipse(c,e.x,C.ground+4,def.w*.4,6,'rgba(54,75,50,.13)');if(!P.Animation.draw(c,e,def)){c.save();c.translate(e.x,C.ground+(e.bossLift||0));c.scale(-e.dir,1);if(e.hit>0)c.globalAlpha=.6;A.image(c,def.asset,0,0,def.w,def.h);c.restore();}
        if(e.hp<e.max)A.bar(c,e.x,C.ground+(e.bossLift||0)-def.h-(e.type==='bat'?35:12),e.hp,e.max,55,'#b88078');
        if(e.windup>0)A.label(c,e.warning||'!',e.x,C.ground-def.h-(e.type==='boss'?57:24),e.warning?12:24,'#b97955');
        if(e.type==='boss'&&e.pattern==='leap'&&e.windup>0)A.ellipse(c,e.aimX,C.ground+H(e.aimX)-H(e.x),60,12,'#c3846c55');
        });
      }
      for(const h of this.helpers)P.Companions.drawActor(c,this,h);
      const bounce=reduced?0:Math.sin(this.pig.bounce*32)*this.pig.bounce*13;
      at(this.pig.x,()=>{A.ellipse(c,this.pig.x,C.ground+4,36,6,'rgba(45,80,60,.13)');A.image(c,'pig',this.pig.x,this.pig.y-bounce,94,63);A.bar(c,this.pig.x,this.pig.y-78-bounce,this.pig.hp,P.state.pig.max,84,'#cc91a0');
      const threat=this.enemies.some(e=>e.hp>0&&e.active&&Math.abs(e.x-this.pig.x)<C.guardRadius);
      if(threat)A.label(c,'! 저금통 주의',this.pig.x,this.pig.y-94,13,'#a86a62');
      for(const id of this.helpers.map(h=>h.id)){const stored=P.state.helpers[id];if(stored.hp<=0)A.label(c,P.helperById(id).name+' 부활 '+Math.ceil(stored.revive)+'초',this.pig.x,this.pig.y-111-P.state.party.indexOf(id)*17,12);}});
      if(this.player.hp>0)at(this.player.x,()=>{A.ellipse(c,this.player.x,(this.player.grounded?this.player.y:C.ground)+4,23,5,'rgba(39,69,51,.15)');
      A.stick(c,this.player.x,this.player.y,{time:this.time,speed:this.player.vx,phase:this.player.gaitPhase,walkBlend:this.player.walkBlend,runBlend:this.player.runBlend,dir:this.player.dir,pose:this.player.pose,age:this.player.age,aimY:this.player.aimY,kickAimY:this.player.kickAimY,spinAimY:this.player.spinAimY,carrying:P.Exploration.hasHands(this),air:!this.player.grounded&&this.player.y<C.ground-4,hit:this.player.inv>.35,playerShield:P.Combat.shieldActive(this),blocking:P.Combat.blocking(this),slope:0,knock:this.player.knock});
      A.bar(c,this.player.x,this.player.y-(P.Combat.blocking(this)?174:210),this.player.hp,P.state.player.max,66,this.player.hp/P.state.player.max<.3?'#c85555':'#6d9878');});
      for(const f of this.fieldEffects){
        if(f.kind==='spikes'){c.save();c.globalAlpha=Math.min(1,f.life*2);if(f.age<.25){A.ellipse(c,f.x,C.ground+2,f.r,7,'#ab8e5b55');}else for(let i=-1;i<=1;i++){c.fillStyle=i===0?'#b5aa87':'#938d71';c.beginPath();c.moveTo(f.x+i*26-10,C.ground);c.lineTo(f.x+i*26,C.ground-25-(i===0?16:0));c.lineTo(f.x+i*26+10,C.ground);c.closePath();c.fill();}c.restore();}
        else {c.save();c.globalAlpha=Math.min(.48,f.life*.4);A.ellipse(c,f.x,f.y,f.r,30,'#9aa953');for(let i=0;i<5;i++)A.ellipse(c,f.x+Math.sin(f.age*3+i)*f.r*.6,f.y+Math.cos(f.age*2+i)*16,6,5,'#c4c97b');c.restore();}
      }
      for(const h of this.hazards){
        if(h.age<.35){c.globalAlpha=.6;A.ellipse(c,h.x,C.ground+H(h.x),85,12,'#c5a36e');A.label(c,'충격파 · 뒤로 피하세요',h.x,C.ground-218+H(h.x),13);c.globalAlpha=1;}
        else for(const sign of [-1,1]){A.line(c,[[h.x+sign*h.radius,C.ground+H(h.x+sign*h.radius)],[h.x+sign*h.radius-10,C.ground-22+H(h.x+sign*h.radius)]],this.map.theme==='brook'?'#72a7a1':'#d2a66f',6);}
      }
      for(const b of this.projectiles)at(b.x,()=>{A.ellipse(c,b.x,b.y,b.type==='fire'?12:8,b.type==='fire'?8:3,b.type==='fire'?'#e6a36b':'#e9d7a0');A.line(c,[[b.x-Math.sign(b.vx)*23,b.y],[b.x,b.y]],'#f8dfac',3);});
      for(const b of this.enemyShots)at(b.x,()=>{
        if(b.type==='arrow'){c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy,b.vx));A.line(c,[[-18,0],[13,0]],'#725d42',2.4);A.line(c,[[8,-4],[16,0],[8,4]],'#b7c3b5',2.5);A.line(c,[[-14,-4],[-9,0],[-14,4]],'#e4dbc3',2);c.restore();}
        else if(b.type==='venom'){c.save();c.translate(b.x,b.y);c.scale(b.vx<0?1:-1,1);P.Companions.sample(c,'bat-projectile',2,Math.floor((b.age||0)*12)%4,0,0,.13);c.restore();}
        else{A.ellipse(c,b.x,b.y,b.r,b.r,b.theme==='amber'?'#c68357':b.theme==='brook'?'#81b8b2':'#879c60');A.line(c,[[b.x-Math.sign(b.vx)*18,b.y],[b.x,b.y]],'#dfdaba',3);}
      });
      P.Companions.draw(c,this);
      for(const f of this.coinFlights){let q=f.t,x=f.x+(this.pig.x-f.x)*q,y=f.y+(this.pig.y-35-f.y)*q-Math.sin(q*Math.PI)*90;A.image(c,'coin',x,y+H(x),17,20);}
      for(const f of this.particles){c.save();c.translate(0,H(f.x));c.globalAlpha=Math.max(0,f.life/f.max);
        if(f.type==='ring'){c.strokeStyle='#ebd5a1';c.lineWidth=4;c.beginPath();c.ellipse(f.x,f.y,f.r,f.r*.4,0,0,Math.PI*2);c.stroke();}
        else if(f.type==='beam')A.line(c,[[f.x,f.y],[f.tx,f.ty+H(f.tx)-H(f.x)]],'#e3ac78',3);
        else A.ellipse(c,f.x,f.y,4,4,f.color);c.restore();}
      for(const f of this.floaters){c.globalAlpha=Math.min(1,f.life*3);A.label(c,f.text,f.x,f.y+H(f.x),15,f.color);}c.globalAlpha=1;c.restore();
      P.World.foreground(c,this);
      if(this.travel)this.drawTravel(c);
      if(this.player.hp<=0){c.fillStyle='#101b22aa';c.fillRect(0,0,1280,720);A.label(c,'저금통에서 다시 일어나요',640,310,26,'#fff2d8');A.label(c,Math.ceil(this.player.revive)+'초',640,365,38,'#fff2d8');}
      P.Tutorial?.draw(c,this);
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
