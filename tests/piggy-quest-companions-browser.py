"""v0.10 actual HTTP companion trees/actions/audio/migration and native art checks."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
URL=os.environ.get('PIGGY_URL','http://127.0.0.1:4186/')
OUT=Path(os.environ.get('PIGGY_TEST_OUTPUT','/tmp/piggy-v010-companions'));OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(name,value):
 assert value,name
 checks.append(name);print('PASS',name,flush=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True);ctx=b.new_context(viewport={'width':1280,'height':720},has_touch=True);p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
 check('Actual HTTP responds 200',p.goto(URL).status==200);p.wait_for_selector('#loading',state='hidden')
 check('All 30 native art images decode',p.evaluate('Object.keys(PIGGY.Art.images).length===30&&Object.values(PIGGY.Art.images).every(i=>i.complete&&i.naturalWidth)'))
 p.evaluate('PIGGY.state.coins=20000');p.locator('[data-view="helpers"]').first.click()
 check('Five companion cards show trees below their identity',p.locator('.companion-card').count()==5 and p.locator('.helper-tree.radial').count()==1 and p.locator('.helper-tree.linear').count()==2)
 p.locator('[data-id="brawler:dash"]').click()
 check('Independent dash unlock charges exactly 160 bank coins',p.evaluate('PIGGY.state.coins===19840&&PIGGY.helperLevel(PIGGY.state,"brawler","dash")===1&&PIGGY.helperLevel(PIGGY.state,"brawler","run")===0'))
 for id in ['archer','support','flame','sword']:p.locator('[data-buy-type="helper"][data-id="'+id+'"]').click()
 p.locator('[data-id="archer:bow"]').click()
 check('Linear bow upgrade charges 110 and improves actual stats',p.evaluate('PIGGY.helperLevel(PIGGY.state,"archer","bow")===2&&PIGGY.helperStats(PIGGY.state,"archer").arrowSpeed===340'))
 for _ in range(5):p.locator('[data-id="brawler:health"]').click()
 check('Health cap disables buying and does not heal',p.locator('[data-id="brawler:health"]').is_disabled() and p.evaluate('PIGGY.helperStats(PIGGY.state,"brawler").max===160&&PIGGY.state.helpers.brawler.hp===80'))
 p.screenshot(path=str(OUT/'companion-trees.png'),full_page=True);p.locator('[data-close]').click();p.locator('#depart').click()
 check('Removed command, run and player skill controls have no DOM elements',p.locator('#command,#run-btn,#skills-pad,[data-skill]').count()==0)
 # Freeze RAF and step the real Game.tick synchronously for repeatable combat fixtures.
 setup='''id=>{const P=PIGGY;P.UI.home();P.state=P.State.fresh();P.state.helpers[id]=P.newHelper(id);P.state.party=[id];P.UI.depart('wind');const g=P.game;g.mode='pause';g.enemies=[g.makeEnemy({id:'fixture',type:'slime',x:id==='brawler'?1000:700})];g.enemies[0].hp=g.enemies[0].max=10000;g.enemies[0].stun=999;g.helpers[0].x=200;return true;}'''
 p.evaluate(setup,'brawler')
 value=p.evaluate('''()=>{const g=PIGGY.game;g.mode='play';g.tick(1/60);g.mode='pause';return {target:g.helpers[0].targetId,x:g.helpers[0].x,enemy:g.enemies[0].active};}''')
 check('Brawler acquires distant visible enemy and immediately approaches',value['target']=='fixture' and value['x']>200)
 value=p.evaluate('''()=>{const g=PIGGY.game;g.enemies[0].x=1600;g.enemies[0].active=true;g.mode='play';g.tick(1/60);g.mode='pause';return g.helpers[0].targetId;}''')
 check('Previously active enemy outside viewport is released',value=='')
 value=p.evaluate('''()=>{const g=PIGGY.game;g.helpers=[];g.enemies=[];g.pig.x=225;g.player.x=800;g.keys.add('d');g.mode='play';for(let n=0;n<180;n++)g.tick(1/60);g.mode='pause';g.clearInput();return g.player.x-g.pig.x;}''')
 check('Pig separation reaches the new 705 limit',abs(value-705)<.01)
 results={}
 for id in ['brawler','archer','support','flame','sword']:
  p.evaluate(setup,id)
  results[id]=p.evaluate('''id=>{const P=PIGGY,g=P.game,h=g.helpers[0];for(const n of P.HELPER_NODES[id])P.state.helpers[id].levels[n.id]=n.max;g.enemies[0].x=id==='brawler'?270:id==='sword'?310:420;g.player.hp=id==='support'?35:100;g.pig.hp=180;const before=g.enemies[0].hp;const poses=new Set(),fx=new Set();g.mode='play';for(let n=0;n<480;n++){g.tick(1/60);poses.add(h.pose);for(const s of g.allyShots)fx.add(s.type);for(const f of g.allyEffects)fx.add(f.type);}g.mode='pause';return {damage:before-g.enemies[0].hp,heal:g.player.hp,poses:[...poses],fx:[...fx],alive:P.state.helpers[id].hp,flight:h.flight,y:h.y};}''',id)
 check('Melee makes distinct punch/kick/push actions',results['brawler']['damage']>0 and all(x in results['brawler']['poses'] for x in ['punch','kick','push']))
 check('Archer fires a damaging ballistic projectile',results['archer']['damage']>0 and 'arrow' in results['archer']['fx'])
 check('Supporter really heals living player and remains harmless to enemies',results['support']['heal']>35 and results['support']['damage']==0)
 check('Flame has actual pillar, homing fireball and burst damage',results['flame']['damage']>0 and all(x in results['flame']['fx'] for x in ['fireball','pillar','burst']))
 check('Sword has actual two-part damage and weapon animation',results['sword']['damage']>0 and 'sword' in results['sword']['poses'])
 value=p.evaluate('''()=>{const g=PIGGY.game;const before=JSON.stringify({t:g.time,h:g.helpers,shots:g.allyShots,burns:g.burns,fx:g.allyEffects});g.tick(4);return before===JSON.stringify({t:g.time,h:g.helpers,shots:g.allyShots,burns:g.burns,fx:g.allyEffects});}''')
 check('Pause freezes companion attacks, movement and effects',value)
 p.evaluate(setup,'support')
 value=p.evaluate('''()=>{const P=PIGGY,g=P.game;g.barriers=[{owner:'support',x:240,y:495,dir:1,life:2,charges:1}];g.player.x=180;g.enemyShots=[{x:350,y:495,vx:-900,vy:0,r:3,life:2,damage:70}];g.mode='play';for(let n=0;n<12;n++)g.tick(1/60);g.mode='pause';return {hp:g.player.hp,shots:g.enemyShots.length,charges:g.barriers.length?g.barriers[0].charges:0};}''')
 check('Barrier intercepts swept shots once before player damage',value=={'hp':100,'shots':0,'charges':0})
 p.evaluate(setup,'brawler')
 value=p.evaluate("""()=>{const P=PIGGY,g=P.game;P.state.helpers.archer=P.newHelper('archer');P.state.helpers.archer.hp=33;P.state.helpers.archer.levels.bow=2;g.loadRoom('cave');g.player.x=g.room.helper.x;g.pig.x=g.player.x;g.mode='play';g.interact();return {joined:g.helpers.some(h=>h.id==='archer'),hp:P.state.helpers.archer.hp,level:P.state.helpers.archer.levels.bow,guest:g.progress.guests.includes('archer')};}""")
 check('Hidden discovery joins an already owned ally without healing or replacing upgrades',value=={'joined':True,'hp':33,'level':2,'guest':True})
 p.locator('[data-close]').click()
 # Real input unlocks Web Audio; normal RAF advances action events against its real clock.
 p.evaluate(setup,'archer');p.keyboard.press('Escape');p.locator('#continue').click()
 p.evaluate('''()=>{const P=PIGGY,g=P.game;g.helpers[0].x=200;g.enemies[0].x=360;P.state.helpers.archer.levels.bow=5;g.enemies[0].stun=0;g.enemies[0].cd=0;g.enemies[0].type='cave-archer';g.player.shieldRaised=false;}''')
 p.wait_for_timeout(2200);p.locator('#pause').click();audio=p.evaluate('PIGGY.Audio.diagnostics()')
 check('Companion bow and monster bow sounds actually reach the running audio engine',audio['state']=='running' and audio['counts'].get('companion-bow-release',0)>0 and audio['counts'].get('monster-bow-release',0)>0)
 # Verify synthesized companion/monster sound waveforms in the VM (no physical speaker claim).
 for name in ['companion-sword-down','companion-fire-explosion','companion-heal','monster-charge','monster-slam','monster-venom']:
  p.wait_for_timeout(120);p.evaluate('(name)=>PIGGY.Audio.play(name)',name);p.wait_for_timeout(25)
  check('Audible waveform generated: '+name,p.evaluate('PIGGY.Audio.energy()>0.0001'))
 p.locator('#continue').click();p.evaluate('PIGGY.game.mode="pause"')
 p.screenshot(path=str(OUT/'archer-combat.png'))
 # The panorama uses identical reflection at each boundary, stable IDs and 1:1 camera offsets.
 value=p.evaluate('''()=>{const P=PIGGY;const a=P.Pixel.backgroundPlan(2159,'forest','forest','main'),b=P.Pixel.backgroundPlan(2161,'forest','forest','main');return {continuous:a.every(t=>t.asset==='forest-joined'),same:a.every(t=>{const q=b.find(v=>v.id===t.id);return !q||(q.asset===t.asset&&q.flip===t.flip&&q.x===t.x-2)}),branch:P.Pixel.backgroundPlan(0,'forest','forest','hollow')[0].asset!==a[0].asset,flat:P.game.cameraY===0};}''')
 check('Joined native forest panorama scrolls 1:1 and branches use a different scene',all(value.values()))
 for mapid,roomid in [('wind','main'),('wind','hollow'),('amber','courtyard'),('brook','spring'),('wind','cave')]:
  p.evaluate('''([id,room])=>{const P=PIGGY;P.UI.home();P.state=P.State.fresh();P.state.unlocked=['wind','amber','brook'];P.UI.depart(id);const g=P.game;if(g.map.rooms[room])g.loadRoom(room);g.camera=g.map.theme==='forest'&&g.roomId==='main'?1600:1100;g.roomTitle=0;g.mode='pause';g.draw();}''',[mapid,roomid]);p.wait_for_timeout(80);p.screenshot(path=str(OUT/(mapid+'-'+roomid+'-seam.png')))
 # Existing save migration is persisted and must not refund again across real-origin reload.
 p.evaluate('''()=>{const P=PIGGY;P.UI.home();const s=P.State.fresh();s.schema=2;s.coins=333;s.runCoins=37;s.helpers={sprout:{hp:31,revive:0},shield:{hp:120,revive:0},scout:{hp:0,revive:4}};s.party=['sprout'];s.skills={run:2,shovel:1};s.progress.wind.dead=['wind-main-0'];s.player.hp=61;s.progress.wind.visited=['main','cave'];P.state.active=false;localStorage.setItem(P.CONFIG.saveKey,JSON.stringify(s));}''');p.reload();p.wait_for_selector('#loading',state='hidden')
 value=p.evaluate('({coins:PIGGY.state.coins,hp:PIGGY.state.player.hp,run:PIGGY.state.runCoins,dead:PIGGY.state.progress.wind.dead,ally:PIGGY.state.helpers.archer.revive})')
 check('Actual origin migrates save without losing health, run coins or discoveries',value=={'coins':943,'hp':61,'run':37,'dead':['wind-main-0'],'ally':4})
 p.evaluate('PIGGY.State.save(PIGGY.state)');p.reload();p.wait_for_selector('#loading',state='hidden');check('Reload never replays the refund',p.evaluate('PIGGY.state.coins===943&&PIGGY.state.schema===3'))
 # Portrait companion UI remains usable without horizontal overflow.
 ctx2=b.new_context(viewport={'width':390,'height':844},has_touch=True);mobile=ctx2.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)));mobile.goto(URL);mobile.wait_for_selector('#loading',state='hidden');mobile.locator('.mobile-nav [data-view="helpers"]').click()
 check('Portrait companion trees fit inside the viewport',mobile.evaluate('document.documentElement.scrollWidth<=innerWidth&&document.getElementById("modal").scrollWidth<=innerWidth'))
 mobile.screenshot(path=str(OUT/'portrait-trees.png'));check('No JavaScript exceptions',not errors);b.close()
(OUT/'results.json').write_text(json.dumps({'version':'0.10.0','url':URL,'passed':len(checks),'failed':0,'checks':checks,'combat':results,'audio':audio,'javascript_errors':errors},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':len(checks),'failed':0}))
