/** Gameplay data. Keep balance values and permanent IDs here, not in rendering. */
(function (P) {
  'use strict';
  P.VERSION = '0.2.0';
  P.CONFIG = { width:1280, height:720, ground:548, fixedStep:1/60,
    walkSpeed:230, gravity:1600, jumpSpeed:590, guardRadius:240,
    punchCooldown:.5, kickCooldown:1, reviveSeconds:10, reviveFraction:.5,
    saveKey:'piggy-quest-save-v2', sourceDate:'2026-10-04' };
  P.HELPERS = [
    {id:'sprout',name:'새싹',role:'가벼운 두 주먹',description:'빠른 두 주먹으로 곁을 지키는 첫 동료.',color:'#498c83',hp:80,attack:9,range:88,cooldown:.85,price:0},
    {id:'shield',name:'둥근 방패',role:'가까이서 든든하게',description:'받는 피해를 절반으로 줄이는 방패 조수.',color:'#6a789c',hp:150,attack:12,range:90,cooldown:1.05,price:340},
    {id:'ember',name:'불씨',role:'멀리서 불꽃 한 발',description:'멀리 있는 적을 작은 불꽃으로 공격해요.',color:'#b57450',hp:70,attack:18,range:300,cooldown:1.5,price:560},
    {id:'scout',name:'잎새',role:'동굴에서 만난 친구',description:'비밀 동굴에서 발견하는 민첩한 조수.',color:'#7a9250',hp:95,attack:13,range:115,cooldown:.75,price:null}
  ];
  P.SKILLS = [
    {id:'jump',name:'뛰기 · 도약',icon:'↟',description:'스페이스 키로 뛰어올라요. 강화하면 더 높이!',price:100,max:3,utility:true},
    {id:'spin',name:'돌려차기',icon:'↻',description:'앞뒤의 가까운 적을 한 번에 밀어내요.',price:180,max:3,cd:3.6},
    {id:'dash',name:'돌진',icon:'➜',description:'앞으로 빠르게 돌진하며 부딪힌 적을 밀쳐요.',price:210,max:3,cd:3.3},
    {id:'fire',name:'불 펀치',icon:'♨',description:'전방으로 불꽃 주먹을 날려요. 두 손이 필요해요.',price:290,max:3,cd:3.8,hands:true},
    {id:'fly',name:'날기',icon:'⌁',description:'잠시 공중으로 떠올라요. 저금통도 함께!',price:420,max:3,cd:7},
    {id:'gun',name:'총',icon:'⌖',description:'멀리 있는 적에게 한 발. 두 손이 필요해요.',price:460,max:3,cd:1.8,hands:true}
  ];
  P.ENEMIES = {
    slime:{name:'풀방울',hp:30,attack:5,speed:67,range:58,cooldown:1.4,coins:12,w:62,h:57,asset:'slime'},
    boar:{name:'도토리 멧돼지',hp:52,attack:8,speed:100,range:64,cooldown:1.5,coins:20,w:76,h:58,asset:'boar'},
    rock:{name:'돌콩',hp:75,attack:11,speed:49,range:64,cooldown:1.8,coins:27,w:68,h:75,asset:'rock'},
    bat:{name:'숲날개',hp:26,attack:5,speed:120,range:85,cooldown:1.2,coins:15,w:65,h:50,asset:'bat'},
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
          chests:[{id:'w-c4',x:2440,coins:120,repair:1}],helper:{id:'scout',x:2590},portals:[{x:120,target:'main',label:'큰길로 돌아가기',spawn:7270}]}
      }},
    {id:'amber',name:'노을 폐허',tag:'02',subtitle:'더 강한 적이 기다리는 두 번째 원정',theme:'amber',bossName:'황혼의 거인',scale:1.45,
      rooms:{
        main:{name:'오래된 돌길',width:8500,enemies:monsters('amber-main',[750,1200,1410,2040,2450,2770,3330,3870,4080,4700,5300,5780,6200,6530,7160,7450],['boar','rock','bat','slime']),
          chests:[{id:'a-c1',x:1800,coins:110,potion:1},{id:'a-c2',x:5570,coins:160,repair:1}],portals:[{x:3090,target:'vault',label:'무너진 벽 뒤 · 샛길',spawn:180}],bossX:8060},
        vault:{name:'잠든 창고',width:2400,enemies:monsters('amber-vault',[750,1210,1560,1870],['rock','boar','bat']),
          chests:[{id:'a-c3',x:2160,coins:200,potion:2}],portals:[{x:120,target:'main',label:'돌길로 돌아가기',spawn:3180}]}
      }}
  ];
  P.mapById = id=>P.MAPS.find(m=>m.id===id);
  P.allEnemies = map=>Object.values(map.rooms).flatMap(r=>r.enemies);
  P.helperById = id=>P.HELPERS.find(h=>h.id===id);
  P.skillById = id=>P.SKILLS.find(s=>s.id===id);
})(globalThis.PIGGY = globalThis.PIGGY || {});
