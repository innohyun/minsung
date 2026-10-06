/** Gameplay data. Keep balance values and permanent IDs here, not in rendering. */
(function (P) {
  'use strict';
  P.VERSION = '0.10.0';
  P.CONFIG = { width:1280, height:720, ground:600, roadTop:550, roadBottom:650, carryHeight:196, fixedStep:1/60,
    walkSpeed:230, runSpeed:380, gravity:1600, tetherRadius:705, guardRadius:240, bossGateOffset:330,
    punchCooldown:.5, kickCooldown:1, attackTapWindow:.24, reviveSeconds:10, reviveFraction:.5,
    saveKey:'piggy-quest-save-v2', sourceDate:'2026-10-06' };
  P.HELPERS = [
    {id:'brawler',name:'권투가',role:'근접 · 방사형 기술',description:'두 주먹에서 시작해 달리기, 밀치기, 발차기, 회피와 대쉬를 독립적으로 배워요.',color:'#498c83',hp:80,attack:9,range:88,cooldown:.85,price:0,tree:'radial'},
    {id:'archer',name:'시위',role:'궁수 · 활 강화 줄',description:'느린 포물선 화살을 강하고 빠른 장거리 화살로 강화해요.',color:'#887449',hp:75,attack:5,range:260,cooldown:3.2,price:240,tree:'linear'},
    {id:'support',name:'온기',role:'치유 · 투사체 방벽',description:'다친 동료를 치료하고 유한한 방벽으로 투사체를 막아요.',color:'#699c9b',hp:90,attack:0,range:460,cooldown:3.5,price:300,tree:'branches'},
    {id:'flame',name:'잿불',role:'불기둥 · 유도 화염 · 비행',description:'한 손 불기둥, 추적하는 화염볼과 발의 불꽃 비행을 배워요.',color:'#b57450',hp:70,attack:12,range:265,cooldown:2.2,price:420,tree:'branches'},
    {id:'sword',name:'대검',role:'내려베기 → 가로베기',description:'두 손으로 검을 들고 내려벤 뒤 가로베기. 강화하면 밀치기와 추격 대쉬를 연결해요.',color:'#69768b',hp:110,attack:13,range:125,cooldown:1.8,price:360,tree:'linear'}
  ];
  const node=(id,name,max,price,description,base=0)=>({id,name,max,price,description,base});
  const common=()=>[node('health','체력',5,90,'단계마다 최대 체력 +20%, 상한 +100%. 현재 체력은 회복하지 않아요.'),node('speed','이동속도',4,80,'단계마다 +10%, 상한 +40%.')];
  P.HELPER_NODES={
    brawler:[node('punch','펀치',5,85,'기본 두 주먹. 단계마다 공격력 +3.',1),node('run','낮은 자세 달리기',3,100,'적에게 접근할 때 골반을 낮추고 달려요.'),node('push','밀치기',3,110,'낮은 피해로 적을 멀리 밀어 공간을 확보해요.'),node('kick','발차기',3,130,'긴 근접 발차기. 단계마다 피해 증가.'),node('dodge','뒤로 점프 회피',3,150,'적의 예고와 다가오는 투사체를 보고 뒤로 뛰어요.'),node('dash','대쉬',3,160,'거리 제한이 있는 짧은 돌파. 달리기와 별도 쿨다운.'),...common()],
    archer:[node('bow','활',5,110,'단계마다 피해·속도·사거리 증가, 포물선·발사 간격 감소.',1),...common()],
    support:[node('heal','치유',5,100,'다친 플레이어/살아 있는 조수 치료. 저금통은 수리도구로 고쳐요.',1),node('barrier','투사체 방벽',3,150,'유한한 지속 시간·차단량. 적 투사체를 한 번만 처리해요.'),...common()],
    flame:[node('pillar','한 손 불기둥',5,120,'한 손에서 제한 범위로 발사. 한 공격에 한 번 타격.',1),node('fireball','유도 화염볼',3,180,'추적 → 범위 폭발 → 0.5초 간격 잔류 불 피해.'),node('flight','불꽃 비행',3,200,'발에서 분사하며 제한 시간 비행. 공중에서도 공격.'),...common()],
    sword:[node('sword','검술 연계',5,110,'내려베기 → 가로베기. Lv2부터 밀치기·추격 대쉬 강화.',1),...common()]
  };
  P.helperNode=(id,node)=>Array.isArray(P.HELPER_NODES[id])?P.HELPER_NODES[id].find(n=>n.id===node):undefined;
  P.helperLevel=(s,id,node)=>s.helpers[id]?.levels?.[node]??P.helperNode(id,node)?.base??0;
  P.helperStats=(s,id)=>{const d=P.HELPERS.find(h=>h.id===id);if(!d)return null;const lv=n=>P.helperLevel(s,id,n),bow=lv('bow')||1;
    const b=[[5,240,260,3.2,720],[8,340,350,2.6,560],[11,460,450,2.1,380],[15,610,560,1.6,240],[20,780,680,1.2,140]][bow-1];
    return {...d,max:Math.round(d.hp*(1+.2*lv('health'))),speed:Math.round(180*(1+.1*lv('speed'))),attack:id==='archer'?b[0]:d.attack+3*Math.max(0,(lv(id==='brawler'?'punch':id==='flame'?'pillar':'sword')||1)-1),
      range:id==='archer'?b[2]:d.range,cooldown:id==='archer'?b[3]:d.cooldown,arrowSpeed:b[1],gravity:b[4]};};
  P.newHelper=id=>({hp:P.HELPERS.find(h=>h.id===id).hp,revive:0,levels:Object.fromEntries(P.HELPER_NODES[id].filter(n=>n.base).map(n=>[n.id,n.base]))});
  P.SKILLS = [
    {id:'shovel',name:'탐험 삽',icon:'⚒',description:'덮인 흙 앞에서 E로 세 번 파면 선택 지하 통로가 열려요.',price:90,max:1,utility:true},
    {id:'woodshield',name:'나무 방패',icon:'◈',description:'B로 들고 내려요. 멈추면 낮은 가드. 운반 중에는 사용할 수 없어요.',price:120,max:1,utility:true}
  ];
  P.ENEMIES = {
    'cave-archer':{name:'동굴 궁수',hp:105,attack:17,speed:75,range:390,cooldown:2.4,coins:38,w:80,h:112,asset:'cave-archer'},
    'cave-charger':{name:'돌갑옷 돌진벌레',hp:155,attack:24,speed:88,range:310,cooldown:2.8,coins:48,w:112,h:84,asset:'cave-charger'},
    'cave-guard':{name:'수정 바위 파수꾼',hp:190,attack:22,speed:62,range:76,cooldown:1.7,coins:54,w:98,h:122,asset:'cave-guard'},
    slime:{name:'후드 발톱 약탈자',hp:30,attack:5,speed:67,range:58,cooldown:1.4,coins:12,w:88,h:110,asset:'slime'},
    boar:{name:'가시갑옷 짐승',hp:52,attack:8,speed:100,range:150,cooldown:2.1,coins:20,w:112,h:84,asset:'boar'},
    rock:{name:'철갑 파수병',hp:75,attack:11,speed:49,range:64,cooldown:1.8,coins:27,w:95,h:122,asset:'rock'},
    bat:{name:'독씨 날개 사냥꾼',hp:26,attack:5,speed:120,range:300,cooldown:2,coins:15,w:112,h:85,asset:'bat'},
    boss:{name:'이끼 거인',hp:650,attack:19,speed:55,range:130,cooldown:1.8,coins:180,w:156,h:196,asset:'boss'}
  };
  function monsters(prefix, positions, types) {
    return positions.map((x,i)=>({id:prefix+'-'+i,x,type:types[i%types.length]}));
  }
  P.MAPS = [
    {id:'wind',name:'바람숲',tag:'01',subtitle:'나뭇잎 사이로 시작되는 첫 모험',theme:'forest',bossName:'이끼 거인',scale:1,
      rooms:{
        main:{name:'큰길',width:10400,enemies:monsters('wind-main',[750,1350,1530,2160,2800,2950,3550,4100,4290,4880,5450,6050,6300,6920,7550,7770,8450,8840],['slime','slime','boar','bat','rock']),
          chests:[{id:'w-c1',x:1880,coins:70,potion:1},{id:'w-c2',x:5860,coins:100,repair:1}],
          portals:[{x:2460,target:'hollow',label:'속 빈 나무 · 샛길',spawn:180},{x:7180,target:'cave',label:'덩굴 뒤 · 숨겨진 길',spawn:180}],bossX:9850},
        hollow:{name:'속 빈 나무길',width:2400,enemies:monsters('wind-hollow',[650,1190,1700],['slime','bat','boar']),
          chests:[{id:'w-c3',x:2110,coins:100,potion:2}],portals:[{x:120,target:'main',label:'큰길로 돌아가기',spawn:2550}]},
        cave:{name:'비밀 동굴',width:2800,enemies:monsters('wind-cave',[680,1380,1960],['rock','bat','boar']),
          chests:[{id:'w-c4',x:2440,coins:120,repair:1}],helper:{id:'archer',x:2590},portals:[{x:120,target:'main',label:'큰길로 돌아가기',spawn:7270}]}
      }},
    {id:'amber',name:'노을 폐허',tag:'02',subtitle:'더 강한 적이 기다리는 두 번째 원정',theme:'amber',bossName:'황혼의 거인',scale:1.45,
      rooms:{
        main:{name:'오래된 돌길',width:8500,enemies:monsters('amber-main',[750,1200,1410,2040,2450,2770,3330,3870,4080,4700,5300,5780,6200,6530,7160,7450],['boar','rock','bat','slime']),
          chests:[{id:'a-c1',x:1800,coins:110,potion:1},{id:'a-c2',x:5570,coins:160,repair:1}],portals:[{x:3090,target:'vault',label:'무너진 벽 뒤 · 샛길',spawn:180}],bossX:8060},
        vault:{name:'잠든 창고',width:2400,enemies:monsters('amber-vault',[750,1210,1560,1870],['rock','boar','bat']),
          chests:[{id:'a-c3',x:2160,coins:200,potion:2}],portals:[{x:120,target:'main',label:'돌길로 돌아가기',spawn:3180}]}
      }}
  ];
  P.MAPS[1].subtitle='무너진 아치와 잠든 창고를 지나 황혼의 파수꾼에게';
  P.MAPS[1].boss={asset:'boss-amber',hp:720,w:168,h:210,attack:17,speed:49,coins:230,wave:200,cooldown:2.5};
  P.MAPS.push({id:'brook',name:'물안개 길',tag:'03',subtitle:'오래된 물레방아와 맑은 샘을 찾아가는 원정',theme:'brook',bossName:'물안개 파수꾼',scale:1.7,
    boss:{asset:'boss-brook',hp:800,w:150,h:198,attack:18,speed:64,coins:280,wave:240,cooldown:2.2},
    rooms:{
      main:{name:'물가의 큰길',width:9800,enemies:monsters('brook-main',[820,1320,1550,2210,2700,3100,3650,4030,4500,4880,5410,5880,6450,6980,7510,8080],['slime','bat','boar','rock']),
        chests:[{id:'b-c1',x:1850,coins:140,potion:1},{id:'b-c2',x:5240,coins:180,repair:1}],
        portals:[{x:2860,target:'spring',label:'샘물 옆 · 샛길',spawn:180},{x:6370,target:'mill',label:'물레방아 뒤 · 숨겨진 길',spawn:180}],bossX:9330},
      spring:{name:'맑은 샘터',width:2700,enemies:monsters('brook-spring',[700,1330,2040],['slime','rock','bat']),
        chests:[{id:'b-c3',x:2450,coins:180,potion:2}],portals:[{x:120,target:'main',label:'물가의 큰길로',spawn:2950}]},
      mill:{name:'잊힌 물레방앗간',width:2850,enemies:monsters('brook-mill',[720,1440,2150],['boar','bat','rock']),
        chests:[{id:'b-c4',x:2540,coins:210,repair:2}],portals:[{x:120,target:'main',label:'큰길로 돌아가기',spawn:6460}]}
    }});
  const scenery={
    wind:{main:[{x:370,kind:'sign',label:'바람숲 캠프'},{x:1600,kind:'pond'},{x:2460,kind:'hollow'},{x:3850,kind:'bridge'},{x:5600,kind:'pond'},{x:7180,kind:'arch'},{x:9650,kind:'tower'}],
      hollow:[{x:470,kind:'hollow'},{x:1330,kind:'pond'},{x:2160,kind:'hollow'}],cave:[{x:480,kind:'crystal'},{x:1140,kind:'arch'},{x:1840,kind:'crystal'},{x:2480,kind:'crystal'}]},
    amber:{main:[{x:370,kind:'sign',label:'노을의 돌길'},{x:1300,kind:'arch'},{x:2940,kind:'tower'},{x:4450,kind:'bridge'},{x:6020,kind:'arch'},{x:7760,kind:'tower'}],
      vault:[{x:500,kind:'tower'},{x:1210,kind:'crystal'},{x:2040,kind:'arch'}]},
    brook:{main:[{x:370,kind:'sign',label:'물안개 길'},{x:1400,kind:'pond'},{x:2570,kind:'bridge'},{x:3890,kind:'pond'},{x:5400,kind:'bridge'},{x:6500,kind:'mill'},{x:8030,kind:'pond'},{x:9120,kind:'arch'}],
      spring:[{x:530,kind:'pond'},{x:1240,kind:'crystal'},{x:2230,kind:'pond'}],mill:[{x:500,kind:'bridge'},{x:1420,kind:'mill'},{x:2440,kind:'arch'}]}
  };
  for(const map of P.MAPS)for(const [id,room] of Object.entries(map.rooms))room.landmarks=scenery[map.id][id];
  P.mapById = id=>P.MAPS.find(m=>m.id===id);
  P.allEnemies = map=>Object.values(map.rooms).flatMap(r=>r.enemies);
  P.helperById = id=>P.HELPERS.find(h=>h.id===id);
  P.skillById = id=>P.SKILLS.find(s=>s.id===id);
})(globalThis.PIGGY = globalThis.PIGGY || {});
