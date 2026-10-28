import {createView} from './view.js';
import {Motion} from './motion.js';
import {GameAudio} from './audio.js';
import {TouchControls} from './controls.js';
import {terrainHeight,supportHeight} from '../world.js';
import {makeRoom,player,start,applyInput,step,snapshot,clamp,BOXES,FIRE_SECONDS,RELOAD_SECONDS} from '../sim.js';
const $=id=>document.getElementById(id),show=(id,yes=true)=>$(id).hidden=!yes;
let view;try{view=createView($('scene'));}catch(e){show('loading',false);show('webgl-error');throw e;}
let state=null,local=null,token='',code='',seq=0,tab='create',busy=false,polling=false,nextPoll=0,actions=[],keys=new Set(),mouseFire=false,aim=false,crouch=false,yaw=0,pitch=-.05,last=performance.now(),prediction=null,spectating=null,seenShots=new Set(),sound=true,toastTimer,failures=0,lastSnapshotAt=0;
let appMode='home';
const motion=new Motion(),sfx=new GameAudio();
let localPrevious=null,lastHud=0,lastHealth=100,damageFlash=0,localShotGate=0,predictedShots=[],lastStepPose=null,stepDistance=0,previousReload=0,oneWay=.06;
const touch=new TouchControls(queueAction,(dx,dy)=>{if(appMode==='game'&&$('pause').hidden){yaw-=dx*.0048;pitch=clamp(pitch-dy*.004,-.8,.8);}});

const labels=['소총','권총','탄약','회복 키트'];
$('nick').value=localStorage.getItem('lc-name')||'플레이어';
function toast(text){$('toast').textContent=text;show('toast');clearTimeout(toastTimer);toastTimer=setTimeout(()=>show('toast',false),4500);}
function initAudio(){sfx.unlock();}
document.addEventListener('pointerdown',initAudio,{capture:true,passive:true});
function queueAction(action){
 if(action==='switch'){const p=state?.players.find(p=>p.id===state.you);action=p?.weapon===0?'pistol':'rifle';}
 actions.push(action);nextPoll=0;
 if(!local)motion.action(action,performance.now());
}
function activeInput(){return appMode==='game'&&$('pause').hidden&&!$('help-dialog').open&&(touch.enabled||document.pointerLockElement===$('scene'));}
function controlValues(){
 const active=activeInput();
 return{mx:active?(touch.enabled?touch.mx:+keys.has('KeyD')-keys.has('KeyA')):0,mz:active?(touch.enabled?touch.mz:+keys.has('KeyW')-keys.has('KeyS')):0,yaw,pitch,fire:active&&(touch.enabled?touch.fire:mouseFire),aim:active&&(touch.enabled?touch.aim:aim),sprint:active&&(touch.enabled?Math.hypot(touch.mx,touch.mz)>.9:keys.has('ShiftLeft')||keys.has('ShiftRight')),crouch:touch.enabled?touch.crouch:crouch};
}
function clearInput(){keys.clear();mouseFire=false;aim=false;actions=[];touch.reset();}
function nick(){const n=$('nick').value.trim().slice(0,16)||'플레이어';localStorage.setItem('lc-name',n);return n;}
async function request(path,data={},auth=true){
 const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json',...(auth&&token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(data)});
 let b;try{b=await r.json();}catch{throw Error('서버 연결을 확인해 주세요.');}
 if(!r.ok){const e=Error(b.error||'서버에 연결하지 못했어요.');e.upgrade=b.upgrade;throw e;}return b;
}
async function task(fn){if(busy)return;busy=true;document.querySelectorAll('#home button,#start').forEach(b=>b.disabled=true);try{initAudio();await fn();}catch(e){toast(e.message);}finally{busy=false;document.querySelectorAll('#home button,#start').forEach(b=>b.disabled=false);}}
function accept(b){
 if(state&&state.code===b.state.code&&(b.state.revision||0)<(state.revision||0))return;
 const old=state;token=b.token||token;state=b.state;code=state.code;seq=Math.max(seq,(state.ack??0)+1);failures=0;lastSnapshotAt=performance.now();
 if(!old||old.phase==='lobby'&&state.phase==='flight'||old.round!==state.round){motion.reset();lastHealth=100;predictedShots=[];localShotGate=0;lastStepPose=null;previousReload=0;seenShots.clear();}
 sessionStorage.setItem('lc-seat',JSON.stringify({code,token}));updateUI();
 const p=state.players.find(p=>p.id===state.you);if(!local&&p)motion.receive(p,state.time,lastSnapshotAt,controlValues(),0);
 syncEvents();
}
function updateUI(){
 if(!state)return;const lobby=state.phase==='lobby',finished=state.phase==='finished';appMode=lobby?'lobby':finished?'result':'game';
 show('home',false);show('lobby',lobby);show('world-caption',lobby);show('footer',lobby);show('hud',!lobby);show('result',finished);document.body.classList.toggle('playing',!lobby);
 $('connection').textContent=local?'혼자 · 로컬 연습':'온라인 방 연결됨';
 if(lobby){
  document.exitPointerLock?.();show('lock-prompt',false);show('pause',false);show('inventory',false);prediction=null;
  $('lobby-title').textContent=state.name;$('code-value').textContent=local?'연습 모드':state.code;$('roster-count').textContent=`사람 ${state.players.length} / 10`;
  $('roster').replaceChildren();for(let i=0;i<10;i++){
   const p=state.players[i],el=document.createElement('div');el.className='seat'+(p?'':' empty');const n=document.createElement('span');n.textContent=p?`◉ ${p.name}`:'＋ AI가 참가할 자리';el.append(n);if(p?.id===state.host){const badge=document.createElement('i');badge.textContent='방장';el.append(badge);}$('roster').append(el);
  }
  show('start',state.you===state.host);show('waiting',state.you!==state.host);show('invite',!local);$('copy-code').disabled=!!local;
 }else{
  const own=state.players.find(p=>p.id===state.you);
  if(own&&!prediction)prediction={...own};
  if(finished){document.exitPointerLock?.();clearInput();show('lock-prompt',false);show('pause',false);const winner=state.players.find(p=>p.id===state.winner);$('result-title').textContent=state.winner===state.you?'마지막 원의 주인공':'경기가 끝났어';$('winner-name').textContent=winner?`${winner.name} 님이 최후의 생존자가 됐어.`:'생존자가 없어.';$('result-stats').textContent=`내 처치 ${own?.kills||0} · 생존 시간 ${Math.floor(state.time/60)}분 ${Math.floor(state.time%60)}초`;$('return').textContent=local?'한 판 더 시작하기 →':'대기실로 돌아가기 →';show('return',local||state.you===state.host);}
  else if(!document.pointerLockElement&&$('pause').hidden&&$('help-dialog').open===false)show('lock-prompt',!touch.enabled&&!own?.dead);
 }
}
function syncEvents(){
 if(!state)return;
 const me=state.players.find(p=>p.id===state.you);
 for(const shot of state.shots){
  if(seenShots.has(shot.id))continue;seenShots.add(shot.id);
  const owned=shot.by===state.you,hadPrediction=owned&&predictedShots.length>0;
  if(hadPrediction)predictedShots.shift();
  if(!hadPrediction){view.shot(shot,{local:owned});const distance=me?Math.hypot(shot.from[0]-me.x,shot.from[2]-me.z):0;const pan=me?Math.sin(Math.atan2(shot.from[0]-me.x,shot.from[2]-me.z)-yaw):0;const by=state.players.find(p=>p.id===shot.by);sfx.play('shot',{distance,pan,weapon:by?.weapon||0});}
  if(owned&&shot.hit){show('hit-marker');sfx.play('confirm');setTimeout(()=>show('hit-marker',false),160);}
 }
 if(me){if(me.hp<lastHealth){damageFlash=Math.max(damageFlash,clamp(.24+(lastHealth-me.hp)*.008,.25,.65));sfx.play('hit');}lastHealth=me.hp;}
 if(seenShots.size>400)seenShots=new Set(state.shots.map(s=>s.id));
}
function beginPractice(){
 token='';code='LOCAL';local=makeRoom(code,'혼자 연습하기',player('you',nick()));local.host='you';local.players[0].lastSeen=Date.now();local.lastWall=Date.now();start(local,'you');state=snapshot(local,'you');seq=0;seenShots.clear();prediction=null;localPrevious={...state.players[0]};motion.reset();lastHealth=100;predictedShots=[];localShotGate=0;lastStepPose=null;yaw=0;pitch=-.05;updateUI();capture();
}
$('fullscreen').hidden=!touch.enabled||!document.documentElement.requestFullscreen;
$('fullscreen').onclick=async()=>{try{await document.documentElement.requestFullscreen();screen.orientation?.lock?.('landscape')?.catch(()=>{});}catch{toast('기기를 가로로 돌리면 더 넓게 볼 수 있어.');}};
$('practice').onclick=()=>task(beginPractice);
$('create').onclick=()=>task(async()=>{local=null;accept(await request('/api/rooms',{nick:nick(),name:$('room-name').value,password:$('create-password').value},false));});
$('join').onclick=()=>task(async()=>{const c=$('room-code').value.trim().toUpperCase();if(!/^[A-F0-9]{6}$/.test(c))throw Error('친구에게 받은 6자리 방 코드를 입력해 줘.');local=null;accept(await request(`/api/rooms/${c}/join`,{nick:nick(),password:$('join-password').value},false));});
for(const button of document.querySelectorAll('[data-tab]'))button.onclick=()=>{tab=button.dataset.tab;document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));show('create-fields',tab==='create');show('join-fields',tab==='join');};
$('start').onclick=()=>task(async()=>{accept(await request(`/api/rooms/${code}/start`));prediction=null;seenShots.clear();});
$('return').onclick=()=>task(async()=>{if(local)beginPractice();else{accept(await request(`/api/rooms/${code}/return`));prediction=null;}});
async function leave(){
 if(!state)return;const online=!local;
 if(online)try{await request(`/api/rooms/${code}/leave`);}catch{}
 resetHome();
}
function resetHome(){state=null;local=null;token='';prediction=null;motion.reset();predictedShots=[];lastStepPose=null;damageFlash=0;$('damage-overlay').style.opacity='0';seenShots.clear();spectating=null;seq=0;appMode='home';clearInput();sessionStorage.removeItem('lc-seat');document.exitPointerLock?.();document.body.classList.remove('playing');touch.setVisible(false);for(const id of ['lobby','hud','lock-prompt','result','pause','inventory'])show(id,false);show('home');show('world-caption');show('footer');$('connection').textContent='플레이 준비 완료';}
for(const id of ['leave-lobby','leave-result','leave-game'])$(id).onclick=()=>task(leave);
async function copy(text){try{await navigator.clipboard.writeText(text);toast('복사했어. 친구에게 보내줘!');}catch{toast(`방 코드: ${code}`);}}
$('copy-code').onclick=()=>copy(code);$('invite').onclick=()=>copy(`${location.origin}/?room=${code}`);
function capture(){if(appMode!=='game')return;initAudio();show('pause',false);if(touch.enabled){show('lock-prompt',false);touch.setVisible(true);return;}const result=$('scene').requestPointerLock?.();if(result?.catch)result.catch(()=>{show('lock-prompt',true);});}
$('capture').onclick=capture;$('resume').onclick=capture;$('scene').onclick=()=>{if(appMode==='game'&&!$('pause').hidden)return;if(appMode==='game')capture();};
$('game-menu').onclick=()=>{document.exitPointerLock?.();show('pause');show('lock-prompt',false);clearInput();};
document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===$('scene');if(appMode==='game'){show('lock-prompt',!touch.enabled&&!locked&&$('pause').hidden&&!state.players.find(p=>p.id===state.you)?.dead);}if(!locked)clearInput();});
function help(){clearInput();document.exitPointerLock?.();$('help-dialog').showModal();}
$('help').onclick=help;$('footer-help').onclick=e=>{e.preventDefault();help();};$('close-help').onclick=()=>$('help-dialog').close();$('sound').onclick=()=>{sound=!sound;sfx.enabled=sound;$('sound').textContent=sound?'♫':'♪';$('sound').title=sound?'소리 끄기':'소리 켜기';initAudio();};
window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput();});
function spectate(){const alive=state?.players.filter(p=>!p.dead)||[];if(!alive.length)return;const i=alive.findIndex(p=>p.id===spectating);spectating=alive[(i+1)%alive.length].id;}
$('spectate-next').onclick=spectate;
window.addEventListener('keydown',e=>{
 if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)||$('help-dialog').open)return;
 if(appMode!=='game')return;
 if(['Space','Tab','KeyM','KeyV','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
 if(e.code==='Escape'){document.exitPointerLock?.();show('pause',true);show('lock-prompt',false);clearInput();return;}
 if(!e.repeat){const action={Space:'jump',KeyF:'loot',KeyR:'reload',KeyH:'heal',Digit1:'rifle',Digit2:'pistol'}[e.code];if(action&&document.pointerLockElement)queueAction(action);
  if(e.code==='KeyC')crouch=!crouch;
  if(e.code==='Tab')show('inventory',$('inventory').hidden);
  if(e.code==='KeyM')$('minimap').classList.toggle('expanded');
  if(e.code==='KeyV')spectate();}
 keys.add(e.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('mousemove',e=>{if(document.pointerLockElement===$('scene')&&appMode==='game'){yaw-=e.movementX*.0022;pitch=clamp(pitch-e.movementY*.002,-.8,.8);}});
window.addEventListener('mousedown',e=>{if(document.pointerLockElement&&appMode==='game'){if(e.button===0)mouseFire=true;if(e.button===2)aim=true;}});window.addEventListener('mouseup',e=>{if(e.button===0)mouseFire=false;if(e.button===2)aim=false;});window.addEventListener('contextmenu',e=>{if(appMode==='game')e.preventDefault();});
function input(){return{seq:++seq,...controlValues(),actions:actions.splice(0,5)};}
async function poll(now){
 if(!state||local||polling||now<nextPoll)return;
 polling=true;const packet=input(),sent=performance.now();nextPoll=now+(packet.fire?100:Math.hypot(packet.mx,packet.mz)>.01?140:230);
 try{
  const b=await request(`/api/rooms/${code}/input`,packet);
  if(!state||state.code!==b.state.code||(b.state.revision||0)<(state.revision||0))return;
  const oldPhase=state.phase;state=b.state;lastSnapshotAt=performance.now();oneWay=Math.min(.18,(lastSnapshotAt-sent)/2000);failures=0;
  const own=state.players.find(p=>p.id===state.you);
  if(oldPhase!==state.phase){if(state.phase==='flight'){motion.reset();seenShots.clear();predictedShots=[];}updateUI();}
  if(own)motion.receive(own,state.time,lastSnapshotAt,controlValues(),oneWay);
  if(state.phase==='lobby'&&state.revision!==poll.lobbyRevision){poll.lobbyRevision=state.revision;updateUI();}
  syncEvents();
 }catch(e){failures++;if(failures===1)toast(e.message);if(e.upgrade||failures>=15){toast(e.upgrade?'업데이트됐어. 새로고침하고 새 방을 만들어 줘.':'연결이 종료됐어. 방에 다시 참가해 줘.');resetHome();}}
 finally{polling=false;}
}
// Networking is independent of rendering so a slow GPU does not delay input/heartbeats.
setInterval(()=>poll(performance.now()),35);
const mini=$('minimap').getContext('2d');
const mapTerrain=document.createElement('canvas');mapTerrain.width=mapTerrain.height=256;const mapGround=mapTerrain.getContext('2d');
for(let y=0;y<256;y+=4)for(let x=0;x<256;x+=4){const wx=x/256*260-130,wz=y/256*260-130,h=terrainHeight(wx,wz),slope=Math.abs(terrainHeight(wx+1,wz)-terrainHeight(wx-1,wz));mapGround.fillStyle=slope>2?'#697568':`hsl(94 19% ${24+h*.6}%)`;mapGround.fillRect(x,y,4,4);}

function drawMap(follow){
 const s=state,z=s.zone,ctx=mini,S=256,point=(x,z)=>[(x+130)/260*S,(z+130)/260*S];ctx.drawImage(mapTerrain,0,0);ctx.strokeStyle='#bed29812';ctx.lineWidth=1;
 for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(i*32,0);ctx.lineTo(i*32,256);ctx.moveTo(0,i*32);ctx.lineTo(256,i*32);ctx.stroke();}
 for(const b of BOXES){ctx.fillStyle=b.kind==='wall'?'#a4ab8a':'#68785a';const [x,y]=point(b.x-b.w/2,b.z-b.d/2);ctx.fillRect(x,y,b.w/260*S+1,b.d/260*S+1);}
 const circle=(x,zz,r,color)=>{const p=point(x,zz);ctx.beginPath();ctx.arc(...p,r/260*S,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();};
 circle(z.x,z.z,z.r,'#75d5ec');circle(z.nextX,z.nextZ,z.nextR,'#dceac1');
 if(follow){const p=point(follow.x,follow.z);ctx.save();ctx.translate(...p);ctx.rotate(-yaw);ctx.fillStyle='#def3a4';ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(-4,-5);ctx.lineTo(4,-5);ctx.closePath();ctx.fill();ctx.restore();}
 ctx.fillStyle='#e1ead1';ctx.font='10px sans-serif';ctx.fillText('THE OUTPOST',9,17);ctx.fillText('M · 지도',195,244);
}
function hud(){
 const own=state.players.find(p=>p.id===state.you);if(!own)return;
 const alive=state.players.filter(p=>!p.dead);$('alive').textContent=alive.length;$('kills').textContent=own.kills;$('health').textContent=Math.ceil(own.hp);$('health-bar').style.width=own.hp+'%';$('health-bar').style.background=own.hp<30?'#ef8d69':'#c6eb85';
 $('weapon-label').textContent=own.guns[own.weapon]?(own.weapon?'P12 · 권총':'AR30 · 소총'):'맨손 · 무기를 찾아봐';$('ammo').textContent=own.guns[own.weapon]?own.ammo[own.weapon]:'—';$('reserve').textContent=own.guns[own.weapon]?`/ ${own.reserve[own.weapon]}`:'';
 $('slot1').classList.toggle('selected',own.weapon===0&&own.guns[0]);$('slot2').classList.toggle('selected',own.weapon===1&&own.guns[1]);$('meds').textContent=`H · 회복 ${own.meds}`;
 const z=state.zone;$('zone-label').textContent=state.phase==='flight'?'수송기 · 낙하 준비':`자기장 ${z.stage+1} · ${z.closing?'축소 중':'대기'}`;$('zone-time').textContent=Math.ceil(state.phase==='flight'?state.phaseLeft:z.left)+'s';
 const heading=((180-yaw*180/Math.PI)%360+360)%360;$('compass').textContent=`${['N','NE','E','SE','S','SW','W','NW'][Math.round(heading/45)%8]}  ${Math.round(heading)}°`;
 const eventKey=state.events.map(e=>e.id).join(',');if(hud.events!==eventKey){hud.events=eventKey;$('kill-feed').replaceChildren(...state.events.slice(-4).map(e=>{const d=document.createElement('div');d.textContent=e.text;return d;}));}
 let hint='',note='';
 if(own.dead){note='탈락했어. 마지막 생존자를 지켜봐.';if(!alive.some(p=>p.id===spectating))spectating=alive[0]?.id;}
 else if(own.onPlane)note=touch.enabled?'점프 버튼으로 원하는 지점에서 낙하해':'SPACE를 눌러 원하는 지점에서 낙하해';
 else if(own.chute)note=touch.enabled?'낙하산 전개 · 왼쪽 스틱으로 착지 지점을 골라':'낙하산 전개 · WASD로 착지 지점을 골라';
 else{let nearest=null,best=3.2**2;for(const l of state.loot){const d=(l.x-own.x)**2+(l.z-own.z)**2;if(d<best){best=d;nearest=l;}}if(nearest)hint=`${touch.enabled?'터치':'F'} · ${labels[nearest.kind]} 줍기`;show('touch-loot',!!nearest);if(nearest)$('touch-loot').textContent=labels[nearest.kind]+' 줍기';}
 if(own.reload>0)hint=`재장전 중 · ${own.reload.toFixed(1)}s`;if(own.heal>0)hint=`회복 중 · ${own.heal.toFixed(1)}s`;
 $('action-hint').textContent=hint;$('center-note').textContent=note;show('crosshair',!own.dead&&!own.onPlane);show('spectate-next',own.dead&&state.phase!=='finished');show('safe-warning',!own.dead&&state.phase==='battle'&&Math.hypot(own.x-z.x,own.z-z.z)>z.r);
 const inventoryKey=[...own.ammo,...own.reserve,...own.guns,own.meds].join(',');if(hud.inventory!==inventoryKey){hud.inventory=inventoryKey;$('inventory-content').innerHTML=`<div class="item">1 · 소총 ${own.guns[0]?'AR30':'없음'}<small>장전 ${own.ammo[0]} / 예비 ${own.reserve[0]}</small></div><div class="item">2 · 권총 ${own.guns[1]?'P12':'없음'}<small>장전 ${own.ammo[1]} / 예비 ${own.reserve[1]}</small></div><div class="item">H · 회복 키트 ${own.meds}개<small>3초 사용 · 체력 50 회복</small></div>`;}
 const follow=own.dead?state.players.find(p=>p.id===spectating):own;drawMap(follow?.id===state.you&&prediction?prediction:follow);return{own,follow};
}
// An offline scenic room is used only as the animated title background.
const backdrop=makeRoom('TITLE','',player('title',''));start(backdrop,'title');backdrop.phase='battle';for(const [i,p]of backdrop.players.entries()){p.onPlane=false;p.x=-5+i*3;p.z=-12;p.y=terrainHeight(p.x,p.z);p.guns=[true,false];p.yaw=Math.PI*.2;}
let localAccum=0;
function frame(now){
 const dt=Math.min(.08,(now-last)/1000);last=now;
 if(local&&state?.phase!=='lobby'){
  local.players[0].lastSeen=Date.now();local.wallNow=Date.now();applyInput(local,local.players[0],input());localAccum+=dt;
  while(localAccum>=.02){localPrevious={...local.players[0]};step(local,.02);localAccum-=.02;}
  const old=state.phase;state=snapshot(local,'you');lastSnapshotAt=now;
  const p=state.players[0],prev=localPrevious||p,alpha=localAccum/.02;
  prediction={...p,x:prev.x+(p.x-prev.x)*alpha,y:prev.y+(p.y-prev.y)*alpha,z:prev.z+(p.z-prev.z)*alpha,yaw,pitch,aim:controlValues().aim,crouch:controlValues().crouch};
  if(old!==state.phase)updateUI();syncEvents();
 }
 if(state&&state.phase!=='lobby'){
  const own=state.players.find(p=>p.id===state.you);let follow=own?.dead?state.players.find(p=>p.id===spectating):own;
  const controls=controlValues();
  if(!local&&own){prediction=motion.frame(dt,controls,now);if(prediction){prediction.aim=controls.aim;prediction.crouch=controls.crouch;}}
  if(now-lastHud>66){hud();lastHud=now;}
  touch.setVisible(appMode==='game'&&!own?.dead&&$('pause').hidden&&!$('help-dialog').open);
  const pose=prediction||own;
  if(own&&pose){
   // Predict weapon feedback immediately; confirmed shots consume the predictions instead of playing twice.
   predictedShots=predictedShots.filter(s=>now-s.time<650);
   const available=own.ammo[own.weapon]-predictedShots.filter(s=>s.weapon===own.weapon).length;
   if(!local&&controls.fire&&!own.dead&&!own.onPlane&&!own.chute&&own.guns[own.weapon]&&!own.reload&&!own.heal&&available>0&&now>=localShotGate){
    view.shot(view.localTrace({...pose,id:own.id},yaw,pitch),{local:true});sfx.play('shot',{weapon:own.weapon});predictedShots.push({time:now,weapon:own.weapon});localShotGate=now+FIRE_SECONDS[own.weapon]*1000;
   }
   if(lastStepPose&&!own.onPlane&&!own.chute&&!own.dead&&Math.abs(pose.vy||0)<.2&&pose.y<=supportHeight(pose.x,pose.z,pose.y+.15)+.15){stepDistance+=Math.min(.5,Math.hypot(pose.x-lastStepPose.x,pose.z-lastStepPose.z));if(stepDistance>(controls.sprint?1.35:.88)){stepDistance=0;sfx.play('step',{run:controls.sprint});}}
   lastStepPose={x:pose.x,z:pose.z};
   const reloadProgress=own.reload>0?1-own.reload/RELOAD_SECONDS[own.weapon]:0;
   if(own.reload>0){for(const marker of [.07,.48,.86])if(previousReload<marker&&reloadProgress>=marker)sfx.play('reload');previousReload=reloadProgress;}else previousReload=0;
  }
  damageFlash*=Math.exp(-dt*3.9);$('damage-overlay').style.opacity=damageFlash.toFixed(3);
  view.sync(state,dt,prediction,(now-lastSnapshotAt)/1000);
  const target=follow?.id===state.you&&prediction?{...follow,...prediction}:follow;
  view.render(dt,state,target,own?.dead?(follow?.yaw??yaw):yaw,own?.dead?-.12:pitch,controls.aim,false);
 }else{touch.setVisible(false);view.sync(snapshot(backdrop,'title'),dt,null,0);view.render(dt,null,null,0,0,false,true);}
 requestAnimationFrame(frame);
}
show('loading',false);requestAnimationFrame(frame);
const inviteCode=new URLSearchParams(location.search).get('room');if(inviteCode){document.querySelector('[data-tab="join"]').click();$('room-code').value=inviteCode.toUpperCase();}
// Seat tokens are scoped to one tab; reload resumes that tab's room without exposing credentials in URLs.
try{const saved=JSON.parse(sessionStorage.getItem('lc-seat')||'null');if(saved?.token&&saved.code){token=saved.token;code=saved.code;request(`/api/rooms/${code}/input`,{seq:Date.now(),mx:0,mz:0,yaw:0,pitch:0}).then(b=>{seq=Date.now();accept(b);}).catch(()=>sessionStorage.removeItem('lc-seat'));}}catch{}
