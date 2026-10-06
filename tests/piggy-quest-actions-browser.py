"""v0.8 HTTP: genuine tap gestures, joystick default suppression, room checks and soil photos.
Scenes and saves are isolated. Photos position the camera at each site; no in-game marker is added.
"""
import base64,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
URL=os.environ.get('PIGGY_URL','http://127.0.0.1:4173/piggy-quest/index.html')
OUT=Path(os.environ.get('PIGGY_TEST_OUTPUT','/tmp/piggy-v080-actions'));OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(name,value):
 assert value,name
 checks.append(name);print('PASS',name,flush=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
 ctx=b.new_context(viewport={'width':1280,'height':720},has_touch=True)
 p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
 check('HTTP boots',p.goto(URL).status==200);p.wait_for_selector('#loading',state='hidden');p.locator('#depart').click()
 check('Exactly one editable circular attack control replaces punch and kick',p.locator('#attack-btn').is_visible() and p.locator('#punch-btn,#kick-btn').count()==0 and p.locator('#attack-btn').evaluate("b=>getComputedStyle(b).borderRadius==='50%'"))
 # Count real strike sounds without bypassing the original audio engine.
 p.evaluate("()=>{const P=PIGGY,play=P.Audio.play;window.__strikes=[];P.Audio.play=(name,...args)=>{if(['kick','punch'].includes(name))window.__strikes.push(name);return play(name,...args);};P.game.enemies=[];}")
 cdp=ctx.new_cdp_session(p)
 def point(selector,ident=1,dx=0):
  r=p.locator(selector).bounding_box();assert r,selector
  return {'x':r['x']+r['width']/2+dx,'y':r['y']+r['height']/2,'id':ident}
 attack=point('#attack-btn',2)
 def tap(held=None):
  cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':([held] if held else [])+[attack]})
  cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[attack] if held else []})
 def reset():
  p.evaluate("()=>{const g=PIGGY.game;g.clearInput();g.enemies=[];g.player.punch=g.player.kick=0;g.player.pose='idle';g.player.firstPending=g.player.secondPending=g.player.kickPending=false;window.__strikes=[];}")
 reset();tap();p.wait_for_timeout(100)
 check('Single tap waits for the second-tap window without an early strike',p.evaluate("PIGGY.game.attackPending>0&&window.__strikes.length===0"))
 p.wait_for_timeout(270)
 check('One tap produces one kick and no punch',p.evaluate("JSON.stringify(window.__strikes)==='[\"kick\"]'&&PIGGY.game.attackPending===null"))
 reset();tap();p.wait_for_timeout(65);tap();p.wait_for_timeout(390)
 check('Quick double tap produces alternating punches without a preceding kick',p.evaluate("JSON.stringify(window.__strikes)==='[\"punch\",\"punch\"]'&&PIGGY.game.attackPending===null"))
 reset();tap();p.locator('#pause').click();p.wait_for_timeout(300);p.locator('#continue').click();p.wait_for_timeout(300)
 check('Pausing cancels pending tap and resuming never fires a stale kick',p.evaluate('window.__strikes.length===0&&PIGGY.game.attackPending===null'))
 reset();tap();p.keyboard.press('m');p.wait_for_timeout(300);p.locator('[data-close]').click();p.wait_for_timeout(300)
 check('Map dialog cancels pending tap and restores play safely',p.evaluate("window.__strikes.length===0&&PIGGY.game.mode==='play'"))
 reset();tap();p.evaluate("window.dispatchEvent(new Event('blur'))");p.wait_for_timeout(280);p.locator('#continue').click();p.wait_for_timeout(280)
 check('Lost focus cancels pending tap with no delayed action',p.evaluate('window.__strikes.length===0&&PIGGY.game.keys.size===0'))
 reset();p.keyboard.press('e');p.wait_for_timeout(100)
 check('Carrying retains the attack button and greys only its punch label',p.evaluate("PIGGY.game.pig.carrying") and p.locator('#attack-btn').is_enabled() and p.locator('#attack-btn .double-punch').evaluate("b=>getComputedStyle(b).opacity==='0.35'"))
 tap();p.wait_for_timeout(350)
 check('Carried pig still permits a single-tap kick',p.evaluate("JSON.stringify(window.__strikes)==='[\"kick\"]'"))
 reset();tap();p.wait_for_timeout(65);tap();p.wait_for_timeout(390)
 check('Double-tap hand punches remain blocked while carrying',p.evaluate('window.__strikes.length===0&&PIGGY.game.player.punch===0'))
 p.keyboard.press('e');p.wait_for_timeout(100);reset()
 joy=point('#joystick',1,35);x=p.evaluate('PIGGY.game.player.x')
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[joy]});p.wait_for_timeout(800)
 check('Long joystick touch keeps walking with no selected text',p.evaluate(f'PIGGY.game.player.x>{x}+100&&getSelection().toString()===""&&PIGGY.game.keys.has("d")'))
 tap(joy);p.wait_for_timeout(65);tap(joy);p.wait_for_timeout(390)
 check('Double-tap attacks work while the movement finger stays down',p.evaluate("PIGGY.game.keys.has('d')&&JSON.stringify(window.__strikes)==='[\"punch\",\"punch\"]'"))
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 check('Multitouch release clears movement without stuck inputs',p.evaluate('PIGGY.game.keys.size===0'))
 check('Control touch defaults and selection/callout events are cancelled',p.evaluate("()=>{const joy=document.getElementById('joystick');return ['touchstart','touchmove','touchend','contextmenu','selectstart'].every(type=>!joy.dispatchEvent(new Event(type,{bubbles:true,cancelable:true})))&&getComputedStyle(joy).userSelect==='none'&&getComputedStyle(joy).touchAction==='none';}"))
 metrics=cdp.send('Page.getLayoutMetrics');check('Double taps preserve viewport scale',abs(metrics['visualViewport']['scale']-1)<.001)
 # Instrument draws to detect unwanted prop sprites in a real rendered fork/boss/home/cave.
 v=p.evaluate("""()=>{const P=PIGGY,g=P.game,old=P.Pixel.sprite,oldStroke=g.ctx.stroke,oldLabel=P.Art.label,draws=[];let labels=[];P.Pixel.sprite=(c,name,...args)=>{draws.push(name);return old(c,name,...args);};g.ctx.stroke=()=>{throw new Error('Unexpected road/branch stroke');};P.Art.label=(c,text,...args)=>{labels.push(text);return oldLabel(c,text,...args);};g.clearInput();g.enemies=[];g.pig.carrying=false;g.player.x=2460;g.pig.x=2460;g.camera=2050;P.World.backdrop(g.ctx,g);g.ctx.stroke=oldStroke;g.draw();g.player.x=g.room.bossX;g.camera=g.player.x-700;g.draw();g.mode='home';g.draw();g.mode='play';const q=g.room.portals.find(p=>p.secret);g.player.x=q.x;g.camera=q.x-640;g.draw();const soil=labels.filter(t=>String(t).includes('파기')).length;g.ctx.stroke=oldStroke;P.Pixel.sprite=old;P.Art.label=oldLabel;return {onlyFunctional:draws.every(n=>['sign','chest','soil','hole','shield','shovel'].includes(n)),signs:draws.includes('sign'),soil:draws.includes('soil')};}""")
 check('Fork, boss and camp draws use no placed scenery props or path strokes',v['onlyFunctional'])
 check('Functional signs, chests and diggable soil remain rendered',v['signs'] and v['soil'])
 # Clear checks are derived from persistent enemy IDs, not transient room arrays.
 v=p.evaluate("""()=>{const P=PIGGY,g=P.game,[rid,room]=Object.entries(g.map.rooms).find(([id,r])=>id!=='main'&&!r.hidden);window.__checkedRoom=rid;g.progress.dead=[];g.progress.visited=['main',rid];const marker='data-cleared-room="'+rid+'"';const initial=!P.World.chart(g).includes('data-cleared-room');g.progress.dead=room.enemies.slice(0,-1).map(e=>e.id);const partial=!P.World.chart(g).includes(marker);g.progress.dead.push(room.enemies.at(-1).id);const clear=P.World.chart(g).includes(marker);g.progress.dead.push(...g.map.rooms.main.enemies.map(e=>e.id));const bossPending=!P.World.chart(g).includes('data-cleared-room="main"');g.progress.cleared=true;const bossClear=P.World.chart(g).includes('data-cleared-room="main"');g.progress.cleared=false;const [id,r]=Object.entries(g.map.rooms).find(([,r])=>r.hidden);g.progress.dead.push(...r.enemies.map(e=>e.id));const secretHidden=!P.World.chart(g).includes(r.name);g.progress.visited.push(id);const discovered=P.World.chart(g).includes('data-cleared-room="'+id+'"');g.snapshot();return {initial,partial,clear,bossPending,bossClear,secretHidden,discovered};}""")
 check('Map checks distinguish untouched, partially cleared and completely cleared rooms',v['initial'] and v['partial'] and v['clear'])
 check('Main room check also requires its boss to be defeated',v['bossPending'] and v['bossClear'])
 check('Cleared hidden rooms stay absent until discovered',v['secretHidden'] and v['discovered'])
 p.keyboard.press('m');p.screenshot(path=str(OUT/'map-cleared.png'));p.locator('[data-close]').click()
 checked_room=p.evaluate('window.__checkedRoom');p.reload();p.wait_for_selector('#loading',state='hidden')
 check('Cleared map checks survive real-origin reload',p.evaluate("id=>PIGGY.World.chart(PIGGY.game).includes('data-cleared-room=\"'+id+'\"')",checked_room));p.locator('#continue').click()
 # External photos only: no new product markers or hidden map clues.
 photos=[]
 for map_id in ['wind','amber','brook']:
  data=p.evaluate("""id=>{const P=PIGGY;P.UI.home();P.state=P.State.fresh();P.state.unlocked=['wind','amber','brook'];P.UI.depart(id);const g=P.game,q=g.room.portals.find(p=>p.secret);g.player.x=q.x-150;g.player.vx=0;g.pig.x=g.player.x-55;g.camera=q.x-640;g.cameraY=P.World.height(g.room,q.x)*.75;g.roomTitle=0;g.mode='pause';g.draw();g.decorTime+=1;P.UI.updateHUD();document.getElementById('toast').classList.remove('show');return {map:g.map.name,room:g.room.name,x:q.x,width:g.room.width,percent:Math.round(q.x/g.room.width*100),target:g.map.rooms[q.target].name,hidden:!P.World.chart(g).includes(g.map.rooms[q.target].name)};}""",map_id)
  path=OUT/(map_id+'-dig-site.png');p.screenshot(path=str(path));data['file']=str(path);photos.append(data)
  check(map_id+' actual site photo preserves hidden map discovery',data['hidden'])
 # A separate photo contact sheet: captions do not appear in the game's UI or map.
 sheet=ctx.new_page();cards=[]
 for data in photos:
  src='data:image/png;base64,'+base64.b64encode(Path(data['file']).read_bytes()).decode()
  cards.append(f'<section><h2>{data["map"]} · 큰길 {data["percent"]}%</h2><p>사진 가운데, 졸라맨 오른쪽의 짙은 흙 · 삽 구매 후 저금통을 내려놓고 E 세 번</p><img src="{src}"></section>')
 sheet.set_viewport_size({'width':1000,'height':2050});sheet.set_content('<meta charset="utf-8"><style>body{margin:0;padding:16px;background:#eef0e6;color:#304e43;font-family:system-ui}section{margin-bottom:18px}h2{margin:0;font-size:22px}p{margin:8px 0;font-size:15px}img{width:968px;display:block;border-radius:12px}</style>'+''.join(cards));sheet.screenshot(path=str(OUT/'dig-sites-guide.png'),full_page=True)
 check('No browser JavaScript exceptions',not errors)
 b.close()
result={'version':'0.10.0','url':URL,'passed':len(checks),'failed':0,'checks':checks,'photos':photos,'method':'Actual HTTP Chromium and real CDP touch; isolated scenes/save state for clear checks and location photographs. Native Safari magnifier is not available in this VM.'}
(OUT/'actions-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
