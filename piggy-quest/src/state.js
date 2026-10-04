/** Serializable state and pure rules. No timers, DOM, accounts, or secrets. */
(function (P) {
  'use strict';
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
  const number=(v,d,a=0,b=1e7)=>Number.isFinite(Number(v))?clamp(Number(v),a,b):d;
  const integer=(v,d,a=0,b=1e7)=>Math.floor(number(v,d,a,b));
  const unique=(v,allowed)=>Array.isArray(v)?[...new Set(v.filter(x=>allowed.includes(x)))]:[];
  function freshProgress(map) {
    return {dead:[],opened:[],drops:[],room:'main',x:180,pigX:225,carrying:false,cleared:false,visited:['main']};
  }
  function fresh() {
    return {schema:2,version:P.VERSION,coins:120,runCoins:0,active:false,selectedMap:'wind',unlocked:['wind'],
      player:{hp:100,max:100,attackLevel:0},pig:{hp:180,max:180},
      helpers:{sprout:{hp:80,revive:0}},party:['sprout'],slots:1,mode:'follow',
      inventory:{potion:3,repair:2},skills:{},equipped:[],settings:{sound:false,reducedMotion:false},
      progress:Object.fromEntries(P.MAPS.map(m=>[m.id,freshProgress(m)])),stats:{kills:0,runs:0},updatedAt:''};
  }
  function normalize(raw) {
    if (!raw || raw.schema!==2 || typeof raw!=='object') throw new Error('지원하지 않는 저장 파일입니다.');
    const s=fresh(); s.coins=integer(raw.coins,120);s.runCoins=integer(raw.runCoins,0);s.active=raw.active===true;
    s.selectedMap=P.mapById(raw.selectedMap)?raw.selectedMap:'wind';
    s.unlocked=unique(raw.unlocked,P.MAPS.map(m=>m.id));if(!s.unlocked.includes('wind'))s.unlocked.unshift('wind');
    if(!s.unlocked.includes(s.selectedMap))s.selectedMap='wind';
    s.player.max=integer(raw.player?.max,100,100,200);s.player.hp=number(raw.player?.hp,100,0,s.player.max);
    s.player.attackLevel=integer(raw.player?.attackLevel,0,0,5);
    s.pig.max=integer(raw.pig?.max,180,180,380);s.pig.hp=number(raw.pig?.hp,180,0,s.pig.max);
    for(const h of P.HELPERS) if(raw.helpers && Object.hasOwn(raw.helpers,h.id)) {
      s.helpers[h.id]={hp:number(raw.helpers[h.id]?.hp,h.hp,0,h.hp),revive:number(raw.helpers[h.id]?.revive,0,0,10)};
      if(s.helpers[h.id].hp===0&&s.helpers[h.id].revive===0)s.helpers[h.id].revive=10;
    }
    s.slots=integer(raw.slots,1,1,3);s.party=unique(raw.party,Object.keys(s.helpers)).slice(0,s.slots);
    s.mode=raw.mode==='guard'?'guard':'follow';
    s.inventory.potion=integer(raw.inventory?.potion,3,0,999);s.inventory.repair=integer(raw.inventory?.repair,2,0,999);
    for(const skill of P.SKILLS) {const l=integer(raw.skills?.[skill.id],0,0,skill.max);if(l)s.skills[skill.id]=l;}
    s.equipped=unique(raw.equipped,P.SKILLS.filter(x=>!x.utility&&s.skills[x.id]).map(x=>x.id)).slice(0,3);
    s.settings.sound=raw.settings?.sound===true;s.settings.reducedMotion=raw.settings?.reducedMotion===true;
    for(const map of P.MAPS) {
      const r=raw.progress?.[map.id]||{},p=s.progress[map.id];
      p.dead=unique(r.dead,P.allEnemies(map).map(e=>e.id));
      p.opened=unique(r.opened,Object.values(map.rooms).flatMap(room=>room.chests.map(c=>c.id)));
      p.room=map.rooms[r.room]?r.room:'main';p.x=number(r.x,180,60,map.rooms[p.room].width-60);
      p.pigX=number(r.pigX,p.x+40,30,map.rooms[p.room].width-30);p.carrying=r.carrying===true;p.cleared=r.cleared===true;
      p.visited=unique(r.visited,Object.keys(map.rooms));if(!p.visited.includes('main'))p.visited.unshift('main');
      if(Array.isArray(r.drops))p.drops=r.drops.slice(0,300).filter(d=>map.rooms[d?.room]).map((d,i)=>({id:String(d.id||i).slice(0,100),room:d.room,x:number(d.x,180,0,map.rooms[d.room].width),value:integer(d.value,1,1,1000)}));
    }
    for(let i=0;i<P.MAPS.length-1;i++)if(s.progress[P.MAPS[i].id].cleared&&!s.unlocked.includes(P.MAPS[i+1].id))s.unlocked.push(P.MAPS[i+1].id);
    s.stats.kills=integer(raw.stats?.kills,0);s.stats.runs=integer(raw.stats?.runs,0);
    return s;
  }
  function load() {
    try {const data=localStorage.getItem(P.CONFIG.saveKey);return data?{state:normalize(JSON.parse(data)),warning:''}:{state:fresh(),warning:''};}
    catch(error) {return {state:fresh(),warning:'저장을 읽지 못해 임시 새 원정을 열었어요. 기존 저장은 백업 후 확인하세요.'};}
  }
  function save(s) {
    s.updatedAt=new Date().toISOString();
    try {localStorage.setItem(P.CONFIG.saveKey,JSON.stringify(s));return true;}catch{return false;}
  }
  function settle(s,reason) {
    const earned=s.runCoins,kept=reason==='pig-death'?0:earned;
    s.coins+=kept;s.runCoins=0;s.active=false;
    return {reason,earned,kept,lost:earned-kept};
  }
  function canDepart(s) {
    if(s.player.hp<1)return '플레이어를 치료해 체력을 1 이상 채워주세요.';
    if(s.pig.hp<1)return '수리도구로 저금통을 고쳐주세요.';
    return '';
  }
  function heal(s,target,item) {
    if(!['potion','repair'].includes(item))return '잘못된 물건입니다.';
    if(!s.inventory[item])return '가방에 남은 물건이 없어요.';
    let object,max;
    if(target==='pig'){if(item!=='repair')return '저금통에는 수리도구를 사용해요.';object=s.pig;max=s.pig.max;}
    else {if(item!=='potion')return '캐릭터에는 치료제를 사용해요.';
      if(target==='player'){object=s.player;max=s.player.max;}else{object=s.helpers[target];max=P.helperById(target)?.hp;}}
    if(!object||!max)return '치료할 대상을 찾지 못했어요.';
    if(object.hp>=max)return '이미 체력이 가득해요.';
    object.hp=Math.min(max,object.hp+(item==='repair'?80:50));if('revive' in object)object.revive=0;
    s.inventory[item]--;return '';
  }
  function purchase(s,type,id) {
    let cost=0;
    if(type==='item') {if(!['potion','repair'].includes(id))return '알 수 없는 물건이에요.';if(s.inventory[id]>=999)return '가방이 가득해요.';cost=id==='potion'?30:45;}
    else if(type==='helper') {const h=P.helperById(id);if(!h||h.price===null||s.helpers[id])return '구입할 수 없는 조수예요.';cost=h.price;}
    else if(type==='skill') {const t=P.skillById(id),level=s.skills[id]||0;if(!t||level>=t.max)return '최대 단계입니다.';cost=Math.round(t.price*(1+level*.7));}
    else if(type==='slots'){if(s.slots>=3)return '동행 자리가 모두 열렸어요.';cost=s.slots===1?300:600;}
    else if(type==='attack'){if(s.player.attackLevel>=5)return '최대 단계입니다.';cost=120+s.player.attackLevel*80;}
    else if(type==='health'){if(s.player.max>=200)return '최대 단계입니다.';cost=180+(s.player.max-100)*4;}
    else return '알 수 없는 구입 항목이에요.';
    if(s.coins<cost)return '코인이 부족해요.';
    s.coins-=cost;
    if(type==='item')s.inventory[id]++;
    if(type==='helper')s.helpers[id]={hp:P.helperById(id).hp,revive:0};
    if(type==='skill'){s.skills[id]=(s.skills[id]||0)+1;if(!P.skillById(id).utility&&!s.equipped.includes(id)&&s.equipped.length<3)s.equipped.push(id);}
    if(type==='slots')s.slots++;
    if(type==='attack')s.player.attackLevel++;
    if(type==='health')s.player.max+=20; // A larger maximum is not a free heal.
    return '';
  }
  function reviveTick(s,dt,onRevive) {
    for(const id of s.party){const h=s.helpers[id];if(h&&h.hp<=0){h.revive=Math.max(0,(h.revive||10)-dt);
      if(h.revive<=0){h.hp=Math.ceil(P.helperById(id).hp*.5);onRevive?.(id);}}}
  }
  P.State={fresh,freshProgress,normalize,load,save,settle,canDepart,heal,purchase,reviveTick};
})(globalThis.PIGGY = globalThis.PIGGY || {});
