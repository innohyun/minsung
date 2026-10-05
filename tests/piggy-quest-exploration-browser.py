"""v0.6 actual HTTP/Chromium: touch while moving, solid platforms, hidden-route discovery and editor.
Only isolated browser saves are modified; deterministic scenes are explicit and never claim a full manual clear.
"""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
URL=os.environ.get('PIGGY_URL','http://127.0.0.1:4173/piggy-quest/index.html')
OUT=Path(os.environ.get('PIGGY_TEST_OUTPUT','/tmp/piggy-v060-exploration'));OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(name,v):
 assert v,name
 checks.append(name)
 print('PASS',name,flush=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
 ctx=b.new_context(viewport={'width':1180,'height':820},has_touch=True)
 p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
 check('Actual HTTP responds',p.goto(URL).status==200);p.wait_for_selector('#loading',state='hidden')
 check('Generated 16-tile atlas loads and default sound has no toggle button',p.evaluate("PIGGY.VERSION==='0.6.0'&&PIGGY.Art.images['pixel-world'].naturalWidth===1254&&Object.keys(PIGGY.Pixel.tiles).length===16&&PIGGY.state.settings.sound&&!document.getElementById('sound-play')&&!document.getElementById('sound')"))
 check('Camp has actionable shortcuts and honest affordability counts',p.evaluate("document.querySelectorAll('.camp-shortcuts button').length===3&&document.getElementById('camp-skills-offer').textContent==='구매 가능 2개'"))
 p.locator('.camp-shortcuts [data-view="skills"]').click()
 check('Affordable purchases marked and insufficient coins disable purchases',p.locator('[data-id="run"]').is_enabled() and p.locator('[data-id="spin"]').is_disabled() and p.locator('[data-id="run"] .purchase-note').inner_text()=='구매 가능')
 p.locator('[data-close]').click();p.locator('#depart').click();p.wait_for_timeout(120)
 p.evaluate('PIGGY.game.enemies=[]')
 cdp=ctx.new_cdp_session(p)
 def point(selector,ident,dx=0):
  box=p.locator(selector).bounding_box();assert box,selector
  return {'x':box['x']+box['width']/2+dx,'y':box['y']+box['height']/2,'id':ident}
 joy=point('#joystick',1,30)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[joy]});p.wait_for_timeout(100)
 action=point('#interact-btn',2)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[joy,action]})
 check('Moving touch plus E acts on pointer down without stopping',p.evaluate("PIGGY.game.pig.carrying&&PIGGY.game.keys.has('d')"))
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[action]})
 check('Releasing E preserves the joystick movement pointer',p.evaluate("PIGGY.game.keys.has('d')"))
 jump=point('#jump-btn',3);cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[joy,jump]});p.wait_for_timeout(120)
 check('Jump works simultaneously with held joystick and carried pig',p.evaluate("PIGGY.game.player.y<570&&PIGGY.game.keys.has('d')&&PIGGY.game.pig.y===PIGGY.game.player.y-PIGGY.CONFIG.carryHeight"))
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[jump]});cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 p.wait_for_timeout(800)
 p.evaluate("()=>{const g=PIGGY.game;g.pig.carrying=false;g.pig.x=g.player.x+50;}");p.wait_for_timeout(100)
 joy=point('#joystick',1,30);punch=point('#punch-btn',2)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[joy]});cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[joy,punch]})
 check('Punch begins immediately while movement is held',p.evaluate("PIGGY.game.player.pose==='punch'&&PIGGY.game.keys.has('d')"))
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 # Normal free jump and a real collision landing on a default crate, using keyboard motion.
 p.evaluate("()=>{const g=PIGGY.game,o=g.objects[0];g.clearInput();g.pig.carrying=false;g.player.carryingObject='';g.player.x=o.x-66;g.player.y=600;g.player.vy=0;g.player.grounded=true;g.pig.x=o.x+30;g.player.vx=0;g.camera=Math.max(0,o.x-400);g.enemies=[];}")
 p.keyboard.down('d');p.keyboard.press('Space');p.wait_for_timeout(320);p.keyboard.up('d');p.wait_for_timeout(650)
 check('Free jump lands on the solid crate with planted feet',p.evaluate('Math.abs(PIGGY.game.player.y-540)<1&&PIGGY.game.player.grounded'))
 p.screenshot(path=str(OUT/'standing-on-crate.png'))
 # E carries and stacks two existing objects; positions and object IDs survive true origin reload.
 v=p.evaluate("""()=>{const P=PIGGY,g=P.game,[a,b]=g.objects,p=g.player;g.mode='play';g.pig.carrying=false;p.x=a.x;p.y=600;p.vy=0;g.interact();const carried=p.carryingObject===a.id;p.x=b.x-a.w/2-25;p.dir=1;g.interact();const stacked=a.x===b.x&&a.y===b.y-b.h;g.snapshot();P.UI.pause();return {carried,stacked,id:a.id,x:a.x,y:a.y};}""")
 check('E picks up and stacks a carryable object on another object',v['carried'] and v['stacked'])
 p.reload();p.wait_for_selector('#loading',state='hidden')
 check('Stack arrangement survives real HTTP storage reload',p.evaluate('id=>{const o=PIGGY.game.objects.find(o=>o.id===id);return o.x===%s&&o.y===%s;}'%(v['x'],v['y']),v['id']))
 p.locator('#continue').click()
 # Concealed path is absent from map and ground interactions.
 v=p.evaluate("""()=>{const P=PIGGY,g=P.game,portal=g.room.portals.find(p=>p.secret);g.enemies=[];g.pig.carrying=false;g.player.x=portal.x;g.player.y=600;g.pig.x=portal.x;const chart=P.World.chart(g);return {id:portal.target,name:g.map.rooms[portal.target].name,hidden:!chart.includes(g.map.rooms[portal.target].name),locked:!P.Exploration.accessible(g,portal),ends:(chart.match(/data-end=/g)||[]).length};}""")
 check('Secret room and connector stay off map until entered',v['hidden'] and v['locked'])
 check('Usable map connections have matching entry and exit markers',v['ends']>=8 and v['ends']%2==0)
 p.evaluate("""()=>{const P=PIGGY,g=P.game,q=g.room.portals.find(p=>p.secret),a=g.objects.find(o=>o.id==='wind-secret-crate'),b=g.objects.find(o=>o.id==='wind-secret-barrel');g.enemies=[];a.x=b.x=q.x-74;b.y=600;a.y=534;a.vy=b.vy=0;g.player.x=a.x;g.player.y=474;g.player.vy=0;g.player.vx=0;g.player.grounded=true;g.pig.x=q.x;g.camera=q.x-500;g.cameraY=P.World.height(g.room,q.x)*.75;g.roomTitle=0;g.clearInput();}""")
 p.keyboard.down('d');p.keyboard.press('Space');p.wait_for_timeout(280);p.keyboard.up('d');p.wait_for_timeout(640)
 check('Jumping from stacked objects reaches the concealed ledge',p.evaluate('Math.abs(PIGGY.game.player.y-430)<1&&PIGGY.game.player.grounded'))
 p.keyboard.press('e');p.wait_for_timeout(80)
 check('E starts companion walking transition before changing rooms',p.evaluate("!!PIGGY.game.travel&&PIGGY.game.roomId==='main'"))
 p.screenshot(path=str(OUT/'walking-transition.png'))
 # Pause freezes travel, combat and guest revival, using normal UI controls.
 p.locator('#pause').click();age=p.evaluate('PIGGY.game.travel.age');p.wait_for_timeout(180)
 check('Pause freezes the walking transition clock',p.evaluate(f'PIGGY.game.travel.age==={age}'))
 p.locator('#continue').click();p.wait_for_function('!PIGGY.game.travel',timeout=2500)
 check('Actual concealed entry discovers room and adds it to map',p.evaluate("PIGGY.game.roomId==='cave'&&PIGGY.game.progress.visited.includes('cave')&&PIGGY.World.chart(PIGGY.game).includes('비밀 동굴')"))
 p.evaluate("()=>{const g=PIGGY.game;g.enemies=[];g.player.x=g.room.helper.x;g.pig.x=g.player.x;g.player.y=600;g.player.vy=0;g.interact();}")
 check('Hidden companion immediately joins expedition without a paid slot',p.evaluate("PIGGY.game.helpers.some(h=>h.id==='scout')&&PIGGY.state.helpers.scout&&PIGGY.state.slots===1&&PIGGY.game.progress.guests.includes('scout')"))
 p.locator('#found-close').click()
 check('Hidden monsters may remain alive when boss becomes available',p.evaluate("()=>{const P=PIGGY,g=P.game;g.progress.dead=P.requiredEnemies(g.map).map(e=>e.id);g.loadRoom('main');return g.remaining()===0&&g.enemies.some(e=>e.type==='boss')&&g.map.rooms.cave.enemies.some(e=>!g.progress.dead.includes(e.id));}"))
 p.evaluate('PIGGY.game.enemies=[]');p.locator('#pause').click();p.locator('#pause-controls').click()
 before=p.locator('#kick-btn').bounding_box()['width']
 p.locator('#control-target').select_option('punch-btn');p.locator('#control-size').fill('76');p.locator('#control-size').dispatch_event('input')
 check('Selected punch size changes while kick and joystick remain independent',abs(p.locator('#punch-btn').bounding_box()['width']-76)<1 and p.locator('#kick-btn').bounding_box()['width']==before and p.locator('#joystick').bounding_box()['width']==112)
 p.locator('#control-target').select_option('joystick');p.locator('#control-size').fill('138');p.locator('#control-size').dispatch_event('input');p.locator('#control-save').click()
 check('Independent punch and joystick sizes persist in layout',p.evaluate("PIGGY.state.settings.controls.sizes['punch-btn']===76&&PIGGY.state.settings.controls.sizes.joystick===138&&PIGGY.state.settings.controls.size===56"))
 p.locator('#pause').click();p.locator('#pause-controls').click();p.locator('#control-target').select_option('jump-btn');p.locator('#control-size').fill('84');p.locator('#control-size').dispatch_event('input');p.locator('#control-cancel').click()
 check('Cancel discards only draft edits without altering saved individual sizes',p.evaluate("!PIGGY.state.settings.controls.sizes['jump-btn']&&PIGGY.state.settings.controls.sizes['punch-btn']===76"))
 p.reload();p.wait_for_selector('#loading',state='hidden')
 check('Guest helper and individual layout sizes survive actual reload',p.evaluate("PIGGY.game.helpers.some(h=>h.id==='scout')&&PIGGY.state.settings.controls.sizes.joystick===138&&Math.abs(document.getElementById('punch-btn').getBoundingClientRect().width-76)<1"))
 check('No browser JavaScript exceptions',not errors)
 b.close()
result={'version':'0.6.0','url':URL,'passed':len(checks),'failed':0,'checks':checks,'method':'Actual HTTP Chromium, real CDP multitouch and keyboard, storage reload. Object/secret/boss edge cases use explicit isolated scene setup; not native iPad/Safari or a full manual clear.'}
(OUT/'exploration-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
