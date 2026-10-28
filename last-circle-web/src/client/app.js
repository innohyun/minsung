import {createView} from './view.js';
import {makeRoom,player,start,returnLobby,applyInput,step,snapshot,move,clamp,BOXES,rng} from '../sim.js';
const $=id=>document.getElementById(id),show=(id,yes=true)=>$(id).hidden=!yes;
let view;try{view=createView($('scene'));}catch(e){show('loading',false);show('webgl-error');throw e;}
let state=null,local=null,token='',code='',seq=0,tab='create',busy=false,polling=false,nextPoll=0,actions=[],keys=new Set(),mouseFire=false,aim=false,crouch=false,yaw=0,pitch=-.05,last=performance.now(),prediction=null,spectating=null,seenShots=new Set(),audio=null,sound=true,toastTimer,failures=0,lastSnapshotAt=0;
let appMode='home';
const labels=['소총','권총','탄약','회복 키트'];
$('nick').value=localStorage.getItem('lc-name')||'플레이어';
function toast(text){$('toast').textContent=text;show('toast');clearTimeout(toastTimer);toastTimer=setTimeout(()=>show('toast',false),4500);}
function initAudio(){if(!audio){try{audio=new AudioContext();}catch{}}if(audio?.state==='suspended')audio.resume();}
function effect(kind='shot',distance=0){
 if(!audio||!sound)return;const gain=audio.createGain();gain.connect(audio.destination);const t=audio.currentTime;gain.gain.setValueAtTime((kind==='shot'?.10:.05)/(1+distance*.08),t);gain.gain.exponentialRampToValueAtTime(.0001,t+.12);
 const o=audio.createOscillator();o.type=kind==='shot'?'sawtooth':'sine';o.frequency.setValueAtTime(kind==='shot'?155:540,t);o.frequency.exponentialRampToValueAtTime(kind==='shot'?45:360,t+.1);o.connect(gain);o.start(t);o.stop(t+.13);
}
function clearInput(){keys.clear();mouseFire=false;aim=false;actions=[];}
function nick(){const n=$('nick').value.trim().slice(0,16)||'플레이어';localStorage.setItem('lc-name',n);return n;}
async function request(path,data={},auth=true){
 const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json',...(auth&&token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(data)});
 let b;try{b=await r.json();}catch{throw Error('서버 연결을 확인해 주세요.');}
 if(!r.ok)throw Error(b.error||'서버에 연결하지 못했어요.');return b;
}
async function task(fn){if(busy)return;busy=true;document.querySelectorAll('#home button,#start').forEach(b=>b.disabled=true);try{initAudio();await fn();}catch(e){toast(e.message);}finally{busy=false;document.querySelectorAll('#home button,#start').forEach(b=>b.disabled=false);}}
function accept(b){if(state&&state.code===b.state.code&&(b.state.revision||0)<(state.revision||0))return;token=b.token||token;state=b.state;code=state.code;seq=Math.max(seq,(state.players.find(p=>p.id===state.you)?.lastSeq??0)+1);failures=0;lastSnapshotAt=performance.now();
 sessionStorage.setItem('lc-seat',JSON.stringify({code,token}));updateUI();syncShots();}
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
  if(own&&!prediction)prediction={x:own.x,y:own.y,z:own.z};
  if(finished){document.exitPointerLock?.();clearInput();show('lock-prompt',false);show('pause',false);const winner=state.players.find(p=>p.id===state.winner);$('result-title').textContent=state.winner===state.you?'마지막 원의 주인공':'경기가 끝났어';$('winner-name').textContent=winner?`${winner.name} 님이 최후의 생존자가 됐어.`:'생존자가 없어.';$('result-stats').textContent=`내 처치 ${own?.kills||0} · 생존 시간 ${Math.floor(state.time/60)}분 ${Math.floor(state.time%60)}초`;$('return').textContent=local?'한 판 더 시작하기 →':'대기실로 돌아가기 →';show('return',local||state.you===state.host);}
  else if(!document.pointerLockElement&&$('pause').hidden&&$('help-dialog').open===false)show('lock-prompt',!own?.dead);
 }
}
function syncShots(){
 for(const s of state.shots){if(seenShots.has(s.id))continue;seenShots.add(s.id);view.shot(s);const me=state.players.find(p=>p.id===state.you);const d=me?Math.hypot(s.from[0]-me.x,s.from[2]-me.z):0;effect('shot',d);if(s.by===state.you&&s.hit){show('hit-marker');setTimeout(()=>show('hit-marker',false),130);}}
 if(seenShots.size>400)seenShots=new Set(state.shots.map(s=>s.id));
}
function beginPractice(){
 token='';code='LOCAL';local=makeRoom(code,'혼자 연습하기',player('you',nick()));local.host='you';local.players[0].lastSeen=Date.now();local.lastWall=Date.now();start(local,'you');state=snapshot(local,'you');seq=0;seenShots.clear();prediction=null;yaw=0;pitch=-.05;updateUI();capture();
}
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
function resetHome(){state=null;local=null;token='';prediction=null;seenShots.clear();spectating=null;seq=0;appMode='home';clearInput();sessionStorage.removeItem('lc-seat');document.exitPointerLock?.();document.body.classList.remove('playing');for(const id of ['lobby','hud','lock-prompt','result','pause','inventory'])show(id,false);show('home');show('world-caption');show('footer');$('connection').textContent='플레이 준비 완료';}
for(const id of ['leave-lobby','leave-result','leave-game'])$(id).onclick=()=>task(leave);
async function copy(text){try{await navigator.clipboard.writeText(text);toast('복사했어. 친구에게 보내줘!');}catch{toast(`방 코드: ${code}`);}}
$('copy-code').onclick=()=>copy(code);$('invite').onclick=()=>copy(`${location.origin}/?room=${code}`);
function capture(){if(appMode!=='game')return;initAudio();show('pause',false);const result=$('scene').requestPointerLock?.();if(result?.catch)result.catch(()=>{show('lock-prompt',true);});}
$('capture').onclick=capture;$('resume').onclick=capture;$('scene').onclick=()=>{if(appMode==='game'&&!$('pause').hidden)return;if(appMode==='game')capture();};
$('game-menu').onclick=()=>{document.exitPointerLock?.();show('pause');show('lock-prompt',false);clearInput();};
document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===$('scene');if(appMode==='game'){show('lock-prompt',!locked&&$('pause').hidden&&!state.players.find(p=>p.id===state.you)?.dead);}if(!locked)clearInput();});
function help(){clearInput();document.exitPointerLock?.();$('help-dialog').showModal();}
$('help').onclick=help;$('footer-help').onclick=e=>{e.preventDefault();help();};$('close-help').onclick=()=>$('help-dialog').close();$('sound').onclick=()=>{sound=!sound;$('sound').textContent=sound?'♫':'♪';$('sound').title=sound?'소리 끄기':'소리 켜기';initAudio();};
window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput();});
function spectate(){const alive=state?.players.filter(p=>!p.dead)||[];if(!alive.length)return;const i=alive.findIndex(p=>p.id===spectating);spectating=alive[(i+1)%alive.length].id;}
$('spectate-next').onclick=spectate;
window.addEventListener('keydown',e=>{
 if(['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)||$('help-dialog').open)return;
 if(appMode!=='game')return;
 if(['Space','Tab','KeyM','KeyV','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
 if(e.code==='Escape'){document.exitPointerLock?.();show('pause',true);show('lock-prompt',false);clearInput();return;}
 if(!e.repeat){const action={Space:'jump',KeyF:'loot',KeyR:'reload',KeyH:'heal',Digit1:'rifle',Digit2:'pistol'}[e.code];if(action&&document.pointerLockElement)actions.push(action);
  if(e.code==='KeyC')crouch=!crouch;
  if(e.code==='Tab')show('inventory',$('inventory').hidden);
  if(e.code==='KeyM')$('minimap').classList.toggle('expanded');
  if(e.code==='KeyV')spectate();}
 keys.add(e.code);
});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('mousemove',e=>{if(document.pointerLockElement===$('scene')&&appMode==='game'){yaw-=e.movementX*.0022;pitch=clamp(pitch-e.movementY*.002,-.8,.8);}});
window.addEventListener('mousedown',e=>{if(document.pointerLockElement&&appMode==='game'){if(e.button===0)mouseFire=true;if(e.button===2)aim=true;}});window.addEventListener('mouseup',e=>{if(e.button===0)mouseFire=false;if(e.button===2)aim=false;});window.addEventListener('contextmenu',e=>{if(appMode==='game')e.preventDefault();});
function input(){const locked=document.pointerLockElement===$('scene');return{seq:++seq,mx:locked?(+keys.has('KeyD')-keys.has('KeyA')):0,mz:locked?(+keys.has('KeyW')-keys.has('KeyS')):0,yaw,pitch,fire:locked&&mouseFire,aim:locked&&aim,sprint:locked&&(keys.has('ShiftLeft')||keys.has('ShiftRight')),crouch,actions:actions.splice(0,5)};}
async function poll(now){
 if(!state||local||polling||now<nextPoll)return;polling=true;nextPoll=now+180;
 try{
  const b=await request(`/api/rooms/${code}/input`,input());if(!state||state.code!==b.state.code||(b.state.revision||0)<(state.revision||0))return;const oldPhase=state.phase;state=b.state;lastSnapshotAt=performance.now();failures=0;$('connection').textContent='온라인 연결됨';
  const own=state.players.find(p=>p.id===state.you);if(own&&prediction){const error=Math.hypot(own.x-prediction.x,own.z-prediction.z);if(error>5||own.onPlane){prediction={x:own.x,y:own.y,z:own.z};}else{prediction.x+=(own.x-prediction.x)*.45;prediction.z+=(own.z-prediction.z)*.45;prediction.y=own.y;}}
  if(oldPhase!==state.phase){if(state.phase==='flight'){prediction=null;seenShots.clear();}updateUI();}else if(state.phase==='lobby')updateUI();
  syncShots();
 }catch(e){failures++;if(failures===1)toast(e.message);if(failures>=15){toast('연결이 종료됐어. 방에 다시 참가해 줘.');resetHome();}}
 finally{polling=false;}
}
const mini=$('minimap').getContext('2d');
function drawMap(follow){
 const s=state,z=s.zone,ctx=mini,S=256,point=(x,z)=>[(x+130)/260*S,(z+130)/260*S];ctx.fillStyle='#263c2a';ctx.fillRect(0,0,S,S);ctx.strokeStyle='#bed29812';ctx.lineWidth=1;
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
 $('kill-feed').replaceChildren(...state.events.slice(-4).map(e=>{const d=document.createElement('div');d.textContent=e.text;return d;}));
 let hint='',note='';
 if(own.dead){note='탈락했어. 마지막 생존자를 지켜봐.';if(!alive.some(p=>p.id===spectating))spectating=alive[0]?.id;}
 else if(own.onPlane)note='SPACE를 눌러 원하는 지점에서 낙하해';
 else if(own.chute)note='낙하산 전개 · WASD로 착지 지점을 골라';
 else{let nearest=null,best=3.2**2;for(const l of state.loot){const d=(l.x-own.x)**2+(l.z-own.z)**2;if(d<best){best=d;nearest=l;}}if(nearest)hint=`F · ${labels[nearest.kind]} 줍기`;}
 if(own.reload>0)hint=`재장전 중 · ${own.reload.toFixed(1)}s`;if(own.heal>0)hint=`회복 중 · ${own.heal.toFixed(1)}s`;
 $('action-hint').textContent=hint;$('center-note').textContent=note;show('crosshair',!own.dead&&!own.onPlane);show('spectate-next',own.dead&&state.phase!=='finished');show('safe-warning',!own.dead&&state.phase==='battle'&&Math.hypot(own.x-z.x,own.z-z.z)>z.r);
 $('inventory-content').innerHTML=`<div class="item">1 · 소총 ${own.guns[0]?'AR30':'없음'}<small>장전 ${own.ammo[0]} / 예비 ${own.reserve[0]}</small></div><div class="item">2 · 권총 ${own.guns[1]?'P12':'없음'}<small>장전 ${own.ammo[1]} / 예비 ${own.reserve[1]}</small></div><div class="item">H · 회복 키트 ${own.meds}개<small>3초 사용 · 체력 50 회복</small></div>`;
 const follow=own.dead?state.players.find(p=>p.id===spectating):own;drawMap(follow);return{own,follow};
}
// An offline scenic room is used only as the animated title background.
const backdrop=makeRoom('TITLE','',player('title',''));start(backdrop,'title');backdrop.phase='battle';for(const [i,p]of backdrop.players.entries()){p.onPlane=false;p.x=-5+i*3;p.z=-12;p.y=0;p.guns=[true,false];p.yaw=Math.PI*.2;}
let localAccum=0;
function frame(now){
 const dt=Math.min(.05,(now-last)/1000);last=now;
 if(local&&state?.phase!=='lobby'){
  local.players[0].lastSeen=Date.now();local.wallNow=Date.now();applyInput(local,local.players[0],input());localAccum+=dt;
  while(localAccum>=.025){step(local,.025);localAccum-=.025;}
  const old=state.phase;state=snapshot(local,'you');const p=state.players[0];prediction={x:p.x,y:p.y,z:p.z};if(old!==state.phase)updateUI();syncShots();
 }
 poll(now);
 if(state&&state.phase!=='lobby'){
  const {own,follow}=hud()||{};
  if(own&&!local&&prediction&&!own.dead&&!own.onPlane){const i={mx:+keys.has('KeyD')-keys.has('KeyA'),mz:+keys.has('KeyW')-keys.has('KeyS')};if(document.pointerLockElement){const speed=own.heal?1.2:own.chute?5:crouch?2:aim?3:keys.has('ShiftLeft')?7.5:4.7;const n=Math.max(1,Math.hypot(i.mx,i.mz));const temp={...prediction};move(temp,(-Math.cos(yaw)*i.mx+Math.sin(yaw)*i.mz)*speed*dt/n,(Math.sin(yaw)*i.mx+Math.cos(yaw)*i.mz)*speed*dt/n);prediction=temp;}}
  view.sync(state,dt,prediction);const target=follow?.id===state.you?{...follow,...prediction}:follow;
  view.render(dt,state,target,own?.dead?(follow?.yaw??yaw):yaw,own?.dead?-.12:pitch,aim,false);
 }else{view.sync(snapshot(backdrop,'title'),dt,null);view.render(dt,null,null,0,0,false,true);}
 requestAnimationFrame(frame);
}
show('loading',false);requestAnimationFrame(frame);
const inviteCode=new URLSearchParams(location.search).get('room');if(inviteCode){document.querySelector('[data-tab="join"]').click();$('room-code').value=inviteCode.toUpperCase();}
// Seat tokens are scoped to one tab; reload resumes that tab's room without exposing credentials in URLs.
try{const saved=JSON.parse(sessionStorage.getItem('lc-seat')||'null');if(saved?.token&&saved.code){token=saved.token;code=saved.code;request(`/api/rooms/${code}/input`,{seq:Date.now(),mx:0,mz:0,yaw:0,pitch:0}).then(b=>{seq=Date.now();accept(b);}).catch(()=>sessionStorage.removeItem('lc-seat'));}}catch{}
