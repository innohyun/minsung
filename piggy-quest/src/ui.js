/** Korean interface, shops, home treatment, results and an in-page source workspace. */
(function(P){
  'use strict';
  const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const fmt=n=>Math.floor(n).toLocaleString('ko-KR');
  const asset=name=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(P.SOURCE_FILES?.['assets/'+name+'.svg']||'');
  let resumeAfter=false,kind='',toastTimer=0,storageWarned=false,selectedItem='potion',lastHud=0,currentSource='HANDOFF.md';
  const UI={
    toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3200);},
    storageWarning(){if(!storageWarned){storageWarned=true;UI.toast('브라우저 저장이 제한되어 있어요. 저장 관리에서 파일로 백업하세요.');}},
    open(title,subtitle,content,options={}){
      const dialog=$('modal'),g=P.game;
      if(g.mode==='play'){g.snapshot();g.mode='pause';g.clearInput();resumeAfter=true;}
      else if(!dialog.open)resumeAfter=false;
      kind=options.kind||'';dialog.className=options.source?'source-modal':'';
      $('modal-body').innerHTML=`<div class="dialog-head"><p class="eyebrow">${esc(options.eyebrow||'PIGGY QUEST · CAMP')}</p><h2 id="modal-title">${title}</h2><p>${subtitle}</p><button class="close" data-close aria-label="닫기">×</button>${options.actions||''}</div>${content}`;
      if(!dialog.open)dialog.showModal();
      $('modal-body').querySelector('[data-close]').onclick=()=>UI.close();
    },
    close(){
      if(kind==='result'){UI.home();return;}
      const resume=resumeAfter;$('modal').close();resumeAfter=false;kind='';
      if(resume&&P.state.active){P.game.mode='play';P.game.clearInput();}
    },
    home(){resumeAfter=false;$('modal').close();kind='';P.game.mode='home';P.game.clearInput();$('hero').hidden=false;$('game-ui').hidden=true;document.body.classList.remove('playing');UI.refreshHome();},
    restoreActive(){
      if(!P.state.active)return;
      const s=P.state,reason=s.pig.hp<1?'pig-death':s.player.hp<1?'player-death':s.progress[s.selectedMap].cleared?'clear':'';
      if(reason){P.State.settle(s,reason);P.State.save(s);UI.home();UI.toast('마지막 원정의 종료 상태를 정산했어요.');return;}
      UI.depart(s.selectedMap);UI.pause();
    },
    refreshHome(){
      const s=P.state,m=P.mapById(s.selectedMap);$('bank-value').textContent=fmt(s.coins);
      $('home-vitals').innerHTML=`<span>나의 체력 <b>${Math.ceil(s.player.hp)} / ${s.player.max}</b></span><span>저금통 <b>${Math.ceil(s.pig.hp)} / ${s.pig.max}</b></span>`;
      $('map-number').textContent=m.tag;$('map-label').textContent=m.name;
      $('depart').innerHTML=(s.progress[m.id].cleared?'다시 플레이':'탐험 떠나기')+' <span>↗</span>';
      for(const [id,offers] of [['camp-skills-offer',P.SKILLS.map(t=>P.State.offer(s,'skill',t.id))],['camp-bag-offer',[P.State.offer(s,'item','potion'),P.State.offer(s,'item','repair')]],['camp-helpers-offer',P.HELPERS.map(h=>P.State.offer(s,'helper',h.id))]]){
        const count=offers.filter(o=>o.affordable).length;$(id).textContent=count?'구매 가능 '+count+'개':'보유 장비 확인';$(id).classList.toggle('can-buy',count>0);
      }
    },
    depart(mapId=P.state.selectedMap,replay=false){
      const error=P.game.start(mapId,replay);if(error){UI.toast(error);if(P.State.canDepart(P.state))UI.bag();return;}
      resumeAfter=false;$('modal').close();kind='';$('hero').hidden=true;$('game-ui').hidden=false;document.body.classList.add('playing');UI.renderSkillPad();P.Controls.apply();lastHud=-1;UI.updateHUD();
    },
    pause(){
      if(!P.state.active)return;P.game.snapshot();P.game.mode='pause';P.game.clearInput();resumeAfter=false;
      UI.open('잠깐, 숨 고르기','시간이 멈췄어요. 조수의 부활 시간도 함께 멈춥니다.',`<div class="dialog-content"><div class="result-hero"><span class="symbol">☷</span><div class="result-coins"><small>현재 저금통 안의 코인</small>${fmt(P.state.runCoins)}<span style="font-size:20px"> ◉</span></div><p class="smallnote">홈에 보관한 ${fmt(P.state.coins)}코인은 이번 원정과 별개예요.</p></div><div class="button-row"><button class="primary" id="continue">계속하기</button><button class="secondary" id="return-home">홈으로 돌아가기</button></div><p class="smallnote" style="text-align:center">지금 귀환하면 ${fmt(P.state.runCoins)}코인을 모두 가져갑니다. 처치 기록은 유지돼요.</p></div>`,{kind:'pause',eyebrow:'TAKE A LITTLE BREAK'});
      const reset=document.createElement('button');reset.className='secondary';reset.textContent='처음부터 시작';reset.id='restart-pause';reset.onclick=()=>UI.newGame();$('continue').parentElement.append(reset);
      const menu=document.createElement('div');menu.className='button-row pause-tools';
      for(const [id,text,fn] of [['pause-controls','조이스틱 편집',()=>P.Controls.edit()],['pause-test-sound','소리 테스트',()=>UI.testSound()],['pause-source','소스코드',()=>UI.sources()],['pause-save','저장 관리',()=>UI.saveTools()],['pause-help','조작법',()=>UI.help()]]){const b=document.createElement('button');b.id=id;b.className='secondary';b.textContent=text;b.onclick=fn;menu.append(b);}
      $('continue').parentElement.after(menu);
      resumeAfter=true;$('continue').onclick=()=>UI.close();$('return-home').onclick=()=>{resumeAfter=false;P.game.finish('return');};
    },
    result(r){
      resumeAfter=false;const clear=r.reason==='clear',pig=r.reason==='pig-death',dead=r.reason==='player-death';
      const title=clear?'원정 성공!':pig?'저금통이 부서졌어요':dead?'다음 모험을 준비해요':'안전하게 돌아왔어요';
      const subtitle=clear?'보스를 쓰러뜨리고 이 맵을 모두 탐험했어요.':pig?'이번 원정에서 모은 코인만 잃었어요. 홈의 코인은 안전합니다.':dead?'플레이어가 쓰러졌지만 저금통의 코인은 안전하게 가져왔어요.':'획득한 코인을 보관하고 탐험 진행을 저장했어요.';
      UI.open(title,subtitle,`<div class="dialog-content"><div class="result-hero"><span class="symbol">${clear?'✦':pig?'🐷':'⌂'}</span><h3>${clear?P.game.map.name+' 클리어':'모험은 계속됩니다.'}</h3><div class="result-coins"><small>${pig?'잃은 원정 코인':'안전하게 가져온 코인'}</small>${pig?'−':'+'}${fmt(pig?r.lost:r.kept)} ◉</div><p class="smallnote">보유 코인 ${fmt(P.state.coins)} · 처치 ${P.game.progress.dead.length} / ${P.allEnemies(P.game.map).length}</p>${dead||pig?'<p class="warn">체력은 자동으로 회복되지 않아요. 홈에서 치료하거나 수리한 뒤 출발하세요.</p>':''}${clear?'<p class="smallnote">클리어한 맵은 새 판으로 다시 플레이할 수 있어요.</p>':''}</div><div class="button-row"><button class="primary" id="result-home">홈으로</button><button class="secondary" id="result-retry">${clear?'다시 플레이':'다시 탐험'}</button></div></div>`,{kind:'result',eyebrow:clear?'ADVENTURE COMPLETE':'EXPEDITION REPORT'});
      $('result-home').onclick=()=>UI.home();$('result-retry').onclick=()=>{const id=P.game.map.id;UI.home();UI.depart(id,clear);};UI.refreshHome();
    },
    loot(chest){
      let rows='';for(const [id,label] of [['coins','코인'],['potion','치료제'],['repair','수리도구']])if(chest[id])rows+=`<div class="loot-row"><img alt="" src="${asset(id==='coins'?'coin':id)}"><span>${label} <strong>+${chest[id]}</strong></span></div>`;
      UI.open('보물상자를 열었어요','평범한 나무 상자 속 작은 선물. 아이템을 가방에 담았습니다.',`<div class="dialog-content">${rows}<div class="button-row"><button class="primary" id="loot-close">탐험 계속하기</button></div></div>`,{eyebrow:'A LITTLE DISCOVERY'});$('loot-close').onclick=()=>UI.close();
    },
    foundHelper(def){UI.open('새로운 동료, '+esc(def.name),'지금 원정에 바로 합류했어요! 이번 모험에는 동행 자리를 쓰지 않고 함께합니다. 귀환 후에는 조수 모음집에서 다시 선택할 수 있어요.',`<div class="dialog-content"><div class="result-hero"><canvas class="helper-image" id="found-art" width="250" height="140"></canvas><h3 style="margin-top:20px">${esc(def.name)}</h3><p>${esc(def.description)}</p></div><div class="button-row"><button id="found-close" class="primary">계속 탐험하기</button></div></div>`,{eyebrow:'HELLO, NEW FRIEND'});UI.drawHelper($('found-art'),def);$('found-close').onclick=()=>UI.close();},
    drawHelper(canvas,def){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.save();c.translate(canvas.width/2,canvas.height-10);P.Art.stick(c,0,0,{color:def.color,band:'#ccb879',shield:def.id==='shield',scale:Math.min(.74,(canvas.height-20)/184)});c.restore();},
    campOnly(){if(P.state.active){UI.toast('귀환한 뒤 홈에서 정비할 수 있어요.');return false;}return true;},
    helpers(){
      if(!UI.campOnly())return;const s=P.state;
      const cards=P.HELPERS.map(h=>{const owned=!!s.helpers[h.id],selected=s.party.includes(h.id);return `<article class="card"><canvas class="helper-image" data-art="${h.id}" width="250" height="140"></canvas><h3>${h.name}</h3><span class="badge ${selected?'selected':''}">${selected?'동행 중':owned?'보유':h.price===null?'탐험 중 발견':'영입 가능'}</span><p>${h.description}</p><div class="statline">체력 ${owned?Math.ceil(s.helpers[h.id].hp):h.hp} / ${h.hp} · 공격력 ${h.attack}</div>${owned?`<button class="${selected?'secondary':'primary'}" data-party="${h.id}">${selected?'동행 해제':'함께 출발하기'}</button>`:h.price===null?'<button class="secondary" disabled>바람숲의 숨겨진 길에서 만나요</button>':`<button class="primary" data-buy-type="helper" data-id="${h.id}">영입하기 · ${h.price} ◉</button>`}</article>`;}).join('');
      UI.open('조수 모음집','여러 조수를 모으고, 이번 원정에 함께할 동료를 골라주세요.',`<div class="dialog-content"><div class="slotbar">동행 ${s.party.length} / ${s.slots}명 <span class="smallnote"> · 조수는 쓰러진 뒤 10초 후 저금통에서 체력 50%로 부활해요.</span></div><div class="cards two">${cards}</div><div class="stat-footer"><span>조수를 더 많이 데리고 가고 싶나요?</span><button class="secondary" data-buy-type="slots" ${s.slots>=3?'disabled':''}>${s.slots>=3?'최대 3명 개방 완료':'동행 자리 늘리기 · '+(s.slots===1?300:600)+' ◉'}</button></div></div>`,{eyebrow:'YOUR LITTLE EXPEDITION'});
      document.querySelectorAll('[data-art]').forEach(el=>UI.drawHelper(el,P.helperById(el.dataset.art)));
      document.querySelectorAll('[data-party]').forEach(b=>b.onclick=()=>{const id=b.dataset.party;if(s.party.includes(id))s.party=s.party.filter(x=>x!==id);else if(s.party.length<s.slots)s.party.push(id);else{UI.toast('동행 자리가 가득해요. 다른 조수를 해제하거나 자리를 늘리세요.');return;}P.State.save(s);UI.helpers();});
      UI.bindPurchases(()=>UI.helpers());
    },
    bindPurchases(refresh){document.querySelectorAll('[data-buy-type]').forEach(b=>{const offer=P.State.offer(P.state,b.dataset.buyType,b.dataset.id);b.disabled=!offer.affordable;b.classList.toggle("can-buy",offer.affordable);b.dataset.purchaseStatus=offer.affordable?"구매 가능":offer.available?"코인 부족":"완료";const note=document.createElement("small");note.className="purchase-note";note.textContent=b.dataset.purchaseStatus;b.append(note);b.onclick=()=>{const err=P.State.purchase(P.state,b.dataset.buyType,b.dataset.id);if(err)UI.toast(err);else{P.State.save(P.state);UI.refreshHome();P.Audio.play('heal');refresh();}};});},
    skills(){
      if(!UI.campOnly())return;const s=P.state;
      const cards=P.SKILLS.map(t=>{const level=s.skills[t.id]||0,max=level>=t.max,equipped=s.equipped.includes(t.id),price=Math.round(t.price*(1+level*.7));return `<article class="card"><span class="skill-icon">${t.icon}</span><h3>${t.name}</h3><span class="badge ${equipped?'selected':''}">${level?'단계 '+level+' / '+t.max:'배우지 않음'}${equipped?' · 장착':''}</span><p>${t.description}</p><button class="primary" data-buy-type="skill" data-id="${t.id}" ${max?'disabled':''}>${max?'강화 완료':(level?'강화하기':'배우기')+' · '+price+' ◉'}</button>${level&&!t.utility?`<button class="secondary" data-equip="${t.id}">${equipped?'장착 해제':'기술 장착'}</button>`:''}</article>`;}).join('');
      UI.open('기술 배우기','두 주먹으로 시작한 모험에 새로운 움직임을 더해요. 특수 기술은 3개까지 장착할 수 있어요.',`<div class="dialog-content"><div class="slotbar">기본: 펀치 J · 발차기 K &nbsp; | &nbsp; ${s.skills.run?'달리기: Shift':'달리기는 구매 후 사용'}<br><span class="smallnote">장착 순서대로 1 · 2 · 3 키를 사용해요. ${s.equipped.map(id=>P.skillById(id).name).join(' / ')||'아직 장착한 기술이 없어요.'}</span></div><div class="cards">${cards}</div><div class="stat-footer"><span>펀치·발차기 공격력 · 단계 ${s.player.attackLevel}/5</span><button class="secondary" data-buy-type="attack" ${s.player.attackLevel>=5?'disabled':''}>공격력 강화 · ${120+s.player.attackLevel*80} ◉</button></div><div class="stat-footer"><span>플레이어 최대 체력 ${s.player.max} <small>※ 현재 체력은 자동 회복되지 않아요.</small></span><button class="secondary" data-buy-type="health" ${s.player.max>=200?'disabled':''}>최대 체력 +20 · ${180+(s.player.max-100)*4} ◉</button></div></div>`,{eyebrow:'SMALL MOVES, BIG POSSIBILITIES'});
      UI.bindPurchases(()=>UI.skills());document.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{const id=b.dataset.equip;if(s.equipped.includes(id))s.equipped=s.equipped.filter(x=>x!==id);else if(s.equipped.length<3)s.equipped.push(id);else{UI.toast('특수 기술은 3개까지 장착할 수 있어요.');return;}P.State.save(s);UI.skills();});
    },
    bag(){
      if(!UI.campOnly())return;const s=P.state;
      const targets=[{id:'player',name:'나의 졸라맨',hp:s.player.hp,max:s.player.max,color:'#294a40'},...P.HELPERS.filter(h=>s.helpers[h.id]).map(h=>({...h,hp:s.helpers[h.id].hp,max:h.hp})),{id:'pig',name:'돼지 저금통',hp:s.pig.hp,max:s.pig.max}];
      const cards=targets.map(h=>`<article class="card heal-target" data-heal-target="${h.id}" tabindex="0" role="button" aria-label="${h.name} 치료하기">${h.id==='pig'?`<img class="art-mini" alt="돼지 저금통" src="${asset('pig')}">`:`<canvas class="helper-image" data-heal-art="${h.id}" width="250" height="140"></canvas>`}<h3>${h.name}</h3><div class="hp-label"><span>현재 체력</span><b>${Math.ceil(h.hp)} / ${h.max}</b></div><progress value="${h.hp}" max="${h.max}" class="${h.id==='pig'?'pink':''}"></progress><p>${h.id==='pig'?'수리도구를 놓으면 체력 +80':'치료제를 놓으면 체력 +50'}</p></article>`).join('');
      const rescue=(s.player.hp<1&&!s.inventory.potion&&s.coins<30)||(s.pig.hp<1&&!s.inventory.repair&&s.coins<45);
      UI.open('가방 · 치료','물건을 캐릭터 위로 끌어다 놓으세요. 물건을 누른 뒤 치료할 대상을 눌러도 됩니다.',`<div class="dialog-content"><div class="bag-items">${[['potion','치료제','체력 +50'],['repair','수리도구','저금통 +80']].map(([id,name,detail])=>`<button class="bag-item ${selectedItem===id?'selected':''}" draggable="true" data-item="${id}"><img alt="" src="${asset(id)}"><span><strong>${name} × ${s.inventory[id]}</strong><small>${detail} · 끌어서 사용</small></span></button>`).join('')}</div><div class="cards">${cards}</div><div class="stat-footer"><span>원정을 위한 작은 준비</span><span><button class="secondary" data-buy-type="item" data-id="potion">치료제 · 30 ◉</button> <button class="secondary" data-buy-type="item" data-id="repair">수리도구 · 45 ◉</button></span></div>${rescue?'<div class="warn">체력과 치료 수단이 모두 없어 출발할 수 없네요. 이 시험판에서는 긴급 보급 1개를 받을 수 있어요. <button class="secondary" id="rescue">긴급 보급 받기</button></div>':''}<p class="smallnote">홈에서 체력이 저절로 회복되지는 않아요. 출전하려면 플레이어와 저금통 체력이 각각 1 이상 필요합니다.</p></div>`,{eyebrow:'REST, REPAIR, RETURN'});
      document.querySelectorAll('[data-heal-art]').forEach(c=>{let h=targets.find(t=>t.id===c.dataset.healArt);UI.drawHelper(c,h);});
      document.querySelectorAll('[data-item]').forEach(b=>{b.onclick=()=>{selectedItem=b.dataset.item;document.querySelectorAll('[data-item]').forEach(x=>x.classList.toggle('selected',x.dataset.item===selectedItem));};b.ondragstart=e=>{selectedItem=b.dataset.item;e.dataTransfer.setData('text/plain',selectedItem);e.dataTransfer.effectAllowed='copy';};
        b.onpointerdown=e=>{if(e.pointerType==='touch'){selectedItem=b.dataset.item;b.setPointerCapture(e.pointerId);}};
        b.onpointerup=e=>{if(e.pointerType==='touch'){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-heal-target]');if(target){e.preventDefault();UI.doHeal(target.dataset.healTarget,selectedItem);}}};});
      document.querySelectorAll('[data-heal-target]').forEach(c=>{c.ondragover=e=>{e.preventDefault();c.classList.add('drag-over');};c.ondragleave=()=>c.classList.remove('drag-over');c.ondrop=e=>{e.preventDefault();UI.doHeal(c.dataset.healTarget,e.dataTransfer.getData('text/plain'));};c.onclick=()=>UI.doHeal(c.dataset.healTarget,selectedItem);c.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();UI.doHeal(c.dataset.healTarget,selectedItem);}};});
      if(rescue)$('rescue').onclick=()=>{if(s.player.hp<1&&!s.inventory.potion&&s.coins<30)s.inventory.potion=1;if(s.pig.hp<1&&!s.inventory.repair&&s.coins<45)s.inventory.repair=1;P.State.save(s);UI.bag();UI.toast('긴급 보급을 가방에 넣었어요. 끌어서 치료하세요.');};
      UI.bindPurchases(()=>UI.bag());
    },
    doHeal(target,item){const error=P.State.heal(P.state,target,item);if(error){UI.toast(error);return;}P.State.save(P.state);P.Audio.play('heal');UI.bag();UI.refreshHome();UI.toast(target==='pig'?'저금통을 수리했어요.':'체력을 회복했어요.');},
    maps(){
      if(!UI.campOnly())return;const s=P.state;
      UI.open('다음 원정은 어디로?','맵마다 진행을 따로 기억해요. 클리어한 맵은 처음부터 다시 도전할 수 있어요.',`<div class="dialog-content"><div class="cards two">${P.MAPS.map(m=>{const p=s.progress[m.id],unlocked=s.unlocked.includes(m.id);return `<article class="card"><span class="skill-icon">${m.tag}</span><h3>${m.name}</h3><span class="badge">${!unlocked?'잠김':p.cleared?'클리어':'진행 중'}</span><p>${m.subtitle}</p><div class="statline">일반 몬스터 ${p.dead.length} / ${P.allEnemies(m).length} · 보스 1마리</div><button class="primary" data-map="${m.id}" ${unlocked?'':'disabled'}>${!unlocked?'앞선 맵을 클리어하세요':p.cleared?'처음부터 다시 플레이':'이 맵 탐험하기'}</button></article>`;}).join('')}</div></div>`,{eyebrow:'CHOOSE YOUR NEXT CHAPTER'});
      document.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>{P.state.selectedMap=b.dataset.map;P.State.save(P.state);UI.refreshHome();UI.depart(b.dataset.map,s.progress[b.dataset.map].cleared);});
    },
    worldMap(){
      if(!P.state.active){UI.maps();return;}const g=P.game;
      UI.open(g.map.name+' · 탐험 지도','선은 실제 이동 경로, 점선은 표지판에서 이동하는 샛길입니다. ● 현위치 · ■ 상자 · ◈ 보스 · ✓ 구역 몬스터 모두 처치 · 같은 번호의 A/B는 이동 입구/도착점',`<div class="dialog-content">${P.World.chart(g)}<p class="smallnote">현재: ${esc(g.room.name)} · ${Math.round(g.player.x/g.room.width*100)}% · 남은 몬스터 ${g.remaining()}마리. 표지판 앞에서 E로 이동하세요.</p><details><summary>구역별 탐험 기록</summary>${Object.entries(g.map.rooms).filter(([id,r])=>!r.hidden||g.progress.visited.includes(id)).map(([id,r])=>`<p>${esc(r.name)} · ${r.enemies.filter(e=>g.progress.dead.includes(e.id)).length}/${r.enemies.length} 처치 ${P.World.roomCleared(g,id)?'· ✓ 모두 처치':''} ${id===g.roomId?'· 현위치':''}</p>`).join('')}</details></div>`,{eyebrow:'EXPEDITION MAP'});
    },
    help(){UI.open('작은 원정 안내서','저금통을 데리고 넓은 길을 탐험하는 횡스크롤 모험입니다.',`<div class="dialog-content rules"><section><h3>함께 익힐 조작</h3><table><tr><td>A D / ← →</td><td>좌우 이동 · 휴대전화는 화면 버튼</td></tr><tr><td>공격 버튼</td><td>한 번 누르면 발차기 · 0.24초 안에 두 번 누르면 좌우 펀치<br>두 번 입력을 기다린 뒤 한 번 입력의 발차기가 나갑니다.</td></tr><tr><td>J / K</td><td>키보드: 펀치 / 발차기 · 길게 누르면 반복<br>재사용 0.5초 / 1초</td></tr><tr><td>E</td><td>저금통 들기·내려놓기 / 상자·샛길·조수와 상호작용</td></tr><tr><td>B</td><td>구입한 나무 방패 들기·내리기 · 정지하면 낮은 가드</td></tr><tr><td>Q</td><td>조수 따라오기 ↔ 저금통 지키기<br>저금통을 직접 눌러도 전환</td></tr><tr><td>Shift</td><td>달리기 · 이동하면서 누르기 · 홈에서 먼저 구매</td></tr><tr><td>스페이스 / W / ↑</td><td>무료 점프 · 구입 없이 장애물과 투사체를 뛰어넘을 수 있어요</td></tr><tr><td>1 2 3</td><td>장착한 특수 기술 사용</td></tr><tr><td>ESC / M</td><td>일시정지 / 탐험 기록 보기</td></tr></table></section><section><h3>저금통이 가장 중요해요</h3><p>몬스터가 화면 안에 보이면 다가옵니다. 저금통을 들고 있을 때는 펀치·불 펀치·총을 사용할 수 없어요. 발차기로 길을 열어보세요.</p><p>몬스터가 떨어뜨린 코인 위를 걸으면 코인이 저금통에 들어가고 통통 뛰어요. 홈으로 돌아가거나 플레이어만 쓰러지면 코인을 가져가요. 저금통이 깨지면 이번 원정 코인만 잃어요.</p><p>귀환해도 처치한 몬스터는 다시 나오지 않아요. 일반 길을 정리한 뒤 보스를 잡으면 다음 맵이 열립니다.</p><p>홈에서는 체력이 회복되지 않아요. 치료제와 수리도구를 구입해 끌어다 놓으세요. 조수는 전투 중 10초 뒤 체력 50%로 부활해요.</p><p class="smallnote">배경·방패는 A 이미지, 졸라맨은 관절 애니메이션을 사용합니다. 탐험 삽을 구입해 덮인 흙을 세 번 파면 숨은 지하 입구가 열려요. 비밀 구역의 적은 보스 조건에 포함되지 않습니다. 고급 완성형 애니메이션과 최종 일러스트로 교체할 수 있게 파일을 나눠두었습니다.</p></section></div>`,{eyebrow:'HOW TO ADVENTURE'});},
    sources(){
      const files=P.SOURCE_FILES||{},names=Object.keys(files).sort((a,b)=>{const pr=['HANDOFF.md','AGENTS.md','README.md','docs/GAME_DESIGN.md'];return (pr.includes(a)?pr.indexOf(a):-1)<0?((pr.includes(b)?-1:0)<0?1:a.localeCompare(b)):(pr.includes(b)?pr.indexOf(a)-pr.indexOf(b):-1);});
      if(!files[currentSource])currentSource=names[0];
      UI.open('소스코드 · 이어서 개발하기','실행 중인 게임의 소스와 기획서를 확인하세요. 개인 저장 데이터는 이 묶음에 포함되지 않아요.',`<div class="source-layout"><aside class="source-files" aria-label="소스 파일 목록">${names.map(n=>`<button data-source="${esc(n)}">${esc(n)}</button>`).join('')}</aside><section class="source-code"><div class="code-toolbar"><span id="code-path"></span><div><button id="copy-file">내용 복사</button><button id="download-file">파일 저장</button></div></div><pre id="source-pre" tabindex="0"></pre></section></div><div class="source-foot">전체 원본 JS · CSS · SVG · 테스트 · 빌드 도구 · 최종 기획 · 인수인계 문서. 비밀번호나 저장 파일은 포함하지 않습니다.</div>`,{kind:'source',source:true,eyebrow:'OPEN SOURCE WORKSPACE',actions:'<div class="source-actions"><button class="primary" id="source-zip">전체 소스 ZIP ↓</button><button class="secondary" id="copy-handoff">코덱스 전달문 복사</button><button class="secondary" id="open-handoff">인수인계 문서</button></div>'});
      const show=name=>{currentSource=name;$('code-path').textContent=name;$('source-pre').textContent=files[name]||'';document.querySelectorAll('[data-source]').forEach(b=>b.classList.toggle('active',b.dataset.source===name));};
      document.querySelectorAll('[data-source]').forEach(b=>b.onclick=()=>show(b.dataset.source));show(currentSource);
      $('source-zip').onclick=()=>P.Export.sourceZip();$('copy-file').onclick=async()=>UI.toast(await P.Export.copy(files[currentSource])?'내용을 복사했어요.':'복사가 제한되어 있어요. 파일 저장을 사용하세요.');
      $('download-file').onclick=()=>P.Export.download(new Blob([files[currentSource]],{type:'text/plain;charset=utf-8'}),currentSource.split('/').pop());
      $('copy-handoff').onclick=async()=>UI.toast(await P.Export.copy(files['CODEX_PROMPT.md']||files['HANDOFF.md'])?'코덱스 전달문을 복사했어요.':'파일 저장으로 전달문을 가져가세요.');$('open-handoff').onclick=()=>show('HANDOFF.md');
    },
    newGame(){
      UI.open('처음부터 시작할까요?','코인, 조수, 기술, 모든 맵의 진행을 초기화합니다. 현재 기록은 먼저 백업 파일로 내려받습니다.',`<div class="dialog-content"><p class="warn">지금까지의 모험을 새 게임으로 바꿉니다. 백업 파일은 저장 관리에서 다시 불러올 수 있어요.</p><div class="button-row"><button class="primary" id="confirm-new-game">백업하고 처음부터 시작</button><button class="secondary" id="cancel-new-game">취소 · 기록 유지</button></div></div>`,{eyebrow:'A BRAND NEW ADVENTURE'});
      $('cancel-new-game').onclick=()=>UI.close();
      $('confirm-new-game').onclick=()=>{
        try{P.Export.download(new Blob([JSON.stringify(P.state,null,2)],{type:'application/json'}),'Piggy_Quest_Before_New_Game.json');}
        catch{UI.toast('백업을 내려받지 못해 기록을 유지했어요.');return;}
        const settings={...P.state.settings};P.state=P.State.fresh();P.state.settings=settings;
        if(!P.State.save(P.state))UI.storageWarning();UI.home();UI.toast('새 원정을 처음부터 시작합니다.');
      };
    },
    saveTools(){
      UI.open('저장 관리','진행 기록은 이 브라우저에만 저장돼요. 다른 기기로 옮기거나 안전하게 보관하려면 파일로 내보내세요.',`<div class="dialog-content"><div class="button-row"><button class="primary" id="export-save">내 저장 파일 내려받기</button><button class="secondary" id="select-import">저장 파일 불러오기</button></div><p class="warn">저장 파일은 소스코드와 별개입니다. 공개 사이트나 공개 저장소에 올리지 마세요. 불러오기는 현재 진행을 교체합니다.</p><label class="checkline"><input id="reduce-motion" type="checkbox" ${P.state.settings.reducedMotion?'checked':''}> 화면 흔들림과 붉은 깜빡임 줄이기</label><p class="smallnote">브라우저 데이터를 지우면 자동 저장도 사라집니다. 다른 탭에서 동시에 플레이하면 마지막 저장이 우선하므로 한 탭에서 사용하세요.</p></div>`,{eyebrow:'KEEP YOUR ADVENTURE SAFE'});
      $('export-save').onclick=()=>{if(P.state.active)P.game.snapshot();P.Export.download(new Blob([JSON.stringify(P.state,null,2)],{type:'application/json'}),'Piggy_Quest_Save.json');};
      $('select-import').onclick=()=>{if(P.state.active){UI.toast('먼저 현재 원정을 귀환한 뒤 저장 파일을 불러오세요.');return;}$('import-save').click();};
      $('reduce-motion').onchange=e=>{P.state.settings.reducedMotion=e.target.checked;P.State.save(P.state);};
    },
    async importSave(file){
      try{if(!file)return;if(file.size>2e6)throw new Error('저장 파일 크기가 너무 큽니다.');const next=P.State.normalize(JSON.parse(await file.text()));
        UI.open('이 기록을 불러올까요?','현재 진행은 불러오기 전 자동 백업 파일로 내려받습니다.',`<div class="dialog-content"><p>보유 코인 ${fmt(next.coins)} · 플레이어 체력 ${Math.ceil(next.player.hp)} / ${next.player.max}</p><div class="button-row"><button class="primary" id="confirm-import">백업하고 불러오기</button><button class="secondary" id="cancel-import">취소</button></div></div>`,{eyebrow:'RESTORE AN ADVENTURE'});
        $('cancel-import').onclick=()=>UI.close();$('confirm-import').onclick=()=>{P.Export.download(new Blob([JSON.stringify(P.state,null,2)],{type:'application/json'}),'Piggy_Quest_Before_Import.json');P.state=next;P.State.save(next);UI.home();if(next.active)UI.restoreActive();UI.toast('저장 기록을 불러왔어요.');};
      }catch(e){UI.toast('저장 파일을 불러오지 못했어요. '+e.message);}finally{$('import-save').value='';}
    },
    renderSkillPad(){$('skills-pad').innerHTML=P.state.equipped.map((id,i)=>{const t=P.skillById(id);return t&&P.state.skills[id]?`<button data-skill="${i}" aria-label="${esc(t.name)}"><kbd>${i+1}</kbd><span>${t.icon}</span><small>${t.name}</small></button>`:'';}).join('');document.querySelectorAll('[data-skill]').forEach(b=>UI.bindAction(b,()=>P.game.skill(Number(b.dataset.skill))));P.Controls?.apply();},
    updateHUD(){
      if(P.Controls?.editing)return;
      const g=P.game;if(g.decorTime-lastHud<.08)return;lastHud=g.decorTime;$('bank-value').textContent=fmt(P.state.coins);
      if(!P.state.active||!g.player)return;const p=g.player,pig=g.pig;
      $('player-health-text').textContent=Math.ceil(p.hp)+' / '+P.state.player.max;$('player-health').max=P.state.player.max;$('player-health').value=p.hp;
      $('pig-health-text').textContent=Math.ceil(pig.hp)+' / '+P.state.pig.max;$('pig-health').max=P.state.pig.max;$('pig-health').value=pig.hp;
      $('room-label').textContent=g.map.name+' · '+g.room.name;$('kill-count').textContent=(P.requiredEnemies(g.map).length-g.remaining())+' / '+P.requiredEnemies(g.map).length+' 처치　⌘';
      $('run-coins').textContent=fmt(P.state.runCoins);$('command-label').textContent=P.state.mode==='guard'?'지키기':'따라오기';$('command').hidden=g.helpers.length===0;
      const interaction=g.interactionLabel();$('interact-btn').hidden=!interaction;$('interact-btn').querySelector('small').textContent=interaction.includes('흙')?'파기':'상호작용';$('interact-btn').title=interaction+' · E';$('interact-btn').setAttribute('aria-label',interaction+' · E');
      const attack=$('attack-btn'),busy=P.Exploration.hasHands(g);attack.classList.toggle('hands-busy',busy);
      attack.title=busy?'한 번: 발차기 · 두 번: 펀치 불가 (저금통 운반 중)':'한 번: 발차기 · 빠르게 두 번: 펀치';attack.setAttribute('aria-label',attack.title);
      $('shield-btn').hidden=!P.state.skills.woodshield;$('shield-btn').disabled=busy;$('shield-btn').classList.toggle('active',P.Combat.shieldActive(g));$('run-btn').hidden=!P.state.skills.run;$('run-btn').classList.toggle('active',p.running);
      $('distance-progress').style.width=(p.x/g.room.width*100)+'%';
      attack.classList.toggle('cooling',p.kick>0&&p.punch>0);attack.style.setProperty('--cd',Math.max(0,Math.min(p.kick,p.punch/.5)));
      document.querySelectorAll('[data-skill]').forEach(b=>{let id=P.state.equipped[Number(b.dataset.skill)],t=P.skillById(id),r=p.skills[id]||0;b.hidden=false;b.disabled=!!t?.hands&&P.Exploration.hasHands(g);b.classList.toggle("unavailable",b.disabled);b.classList.toggle('cooling',r>0);b.style.setProperty('--cd',t?r/t.cd:0);});
    },
    testSound(){P.state.settings.sound=true;P.state.settings.soundExplicit=true;P.State.save(P.state);P.Audio.unlock().then(()=>{P.Audio.play('wood');setTimeout(()=>P.Audio.play('coin'),200);});UI.refreshHome();},
    toggleSound(){P.Audio.unlock().then(()=>P.Audio.play('coin'));P.state.settings.sound=!P.state.settings.sound;P.state.settings.soundExplicit=true;P.State.save(P.state);UI.refreshHome();P.Audio.play('coin');},
    bindAction(b,fn){
      b.onpointerdown=e=>{if(b.disabled||P.Controls?.editing)return;e.preventDefault();P.Audio.unlock();fn();};
      b.onclick=e=>{if(!e||e.detail===0){if(!b.disabled&&!P.Controls?.editing){P.Audio.unlock();fn();}}};
    },
    init(){
      $('brand').onclick=()=>P.state.active?UI.pause():UI.home();$('source-btn').onclick=()=>UI.sources();$('help').onclick=()=>UI.help();$('save-tools').onclick=()=>UI.saveTools();$('new-game').onclick=()=>UI.newGame();
      $('depart').onclick=()=>UI.depart(P.state.selectedMap,P.state.progress[P.state.selectedMap].cleared);
      $('map-select').onclick=()=>UI.maps();UI.bindAction($('world-map'),()=>UI.worldMap());$('pause').onclick=()=>UI.pause();UI.bindAction($('command'),()=>P.game.command());
      document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(b.dataset.view==='camp'){if(P.state.active)UI.pause();else UI.home();}else UI[b.dataset.view]();});
      document.querySelectorAll('[data-action]').forEach(b=>UI.bindAction(b,()=>P.game[b.dataset.action]()));
      $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('stage').requestFullscreen();}catch{UI.toast('이 브라우저에서는 전체 화면 전환이 제한되어 있어요.');}};
      $('modal').addEventListener('cancel',e=>{e.preventDefault();UI.close();});
      $('import-save').onchange=e=>UI.importSave(e.target.files[0]);
      document.querySelectorAll('[data-hold]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();P.Audio.unlock();if(P.game.mode!=='play'||b.disabled||P.Controls.editing)return;b.setPointerCapture(e.pointerId);P.Controls.input('button-'+b.dataset.hold+'-'+e.pointerId,b.dataset.hold,true);if(b.dataset.hold==='j')P.game.punch();if(b.dataset.hold==='k')P.game.kick();};const release=e=>P.Controls.input('button-'+b.dataset.hold+'-'+e.pointerId,b.dataset.hold,false);b.onpointerup=release;b.onpointercancel=release;b.onlostpointercapture=release;});
      P.Controls.init();UI.refreshHome();
    }
  };
  P.UI=UI;
})(globalThis.PIGGY = globalThis.PIGGY || {});
