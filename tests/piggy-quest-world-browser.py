"""v0.5 actual joystick/editor/audio play; deterministic map and boss boundary checks.
Fresh isolated profile only. Boss state setup accelerates pattern coverage, not a manual full clear.
"""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT=Path(os.environ.get('PIGGY_TEST_OUTPUT','/tmp/piggy-v05-world'));OUT.mkdir(parents=True,exist_ok=True)
URL=os.environ.get('PIGGY_URL','http://127.0.0.1:4173/piggy-quest/index.html')
checks=[];errors=[]
def check(name,value):
    assert value,name
    checks.append(name)

with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
    context=browser.new_context(viewport={'width':1000,'height':700},has_touch=True)
    p=context.new_page();p.set_default_timeout(5000);p.on('pageerror',lambda e:errors.append(str(e)))
    check('Real HTTP game responds',p.goto(URL).status==200);p.wait_for_selector('#loading',state='hidden')
    p.locator('[data-view="skills"]').first.click();p.locator('[data-buy-type="skill"][data-id="woodshield"]').click()
    check('Shield shop charges actual starting coins without skill slot',p.evaluate('PIGGY.state.coins===0&&PIGGY.state.skills.woodshield===1&&PIGGY.state.equipped.length===0'))
    p.locator('[data-close]').click();p.locator('#depart').click()
    check('Default actual joystick visible and directional buttons optional',p.locator('#joystick').is_visible() and p.locator('#direction-buttons').is_hidden())
    check('Owned shield button is usable',p.locator('#shield-btn').is_visible() and p.locator('#shield-btn').is_enabled())
    cdp=context.new_cdp_session(p)
    box=p.locator('#joystick').bounding_box();cx=box['x']+box['width']/2;cy=box['y']+box['height']/2
    x=p.evaluate('PIGGY.game.player.x')
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':cx+35,'y':cy,'id':1}]})
    p.wait_for_timeout(300);cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
    check('Real joystick drag moves player and release clears input',p.evaluate(f'PIGGY.game.player.x>{x}+20&&PIGGY.game.keys.size===0'))
    p.keyboard.press('e');p.wait_for_timeout(100)
    check('Carrying leaves punch visible, grey and disabled',p.locator('#punch-btn').is_visible() and p.locator('#punch-btn').is_disabled() and float(p.locator('#punch-btn').evaluate('(b)=>getComputedStyle(b).opacity'))<.5)
    check('Carrying prevents wooden shield use',p.locator('#shield-btn').is_disabled() and not p.evaluate('PIGGY.Combat.shieldActive(PIGGY.game)'))
    p.keyboard.press('e');p.wait_for_timeout(200)
    p.locator('#pause').click();p.locator('#pause-test-sound').click()
    p.wait_for_function('PIGGY.Audio.energy()>.005',timeout=2000)
    check('Gesture sound test produces audible-level signal',p.evaluate("PIGGY.Audio.status()==='running'&&PIGGY.Audio.diagnostics().playCount>0&&PIGGY.state.settings.sound"))
    p.locator('#pause-controls').click()
    check('Control editing freezes simulation without modal blocking drag',p.evaluate("PIGGY.Controls.editing&&PIGGY.game.mode==='pause'&&!document.getElementById('modal').open"))
    t=p.evaluate('PIGGY.game.time');p.wait_for_timeout(180);check('Simulation stays paused during editing',p.evaluate(f'PIGGY.game.time==={t}'))
    p.locator('#control-target').select_option('punch-btn');p.locator('#control-size').fill('68');p.locator('#control-size').dispatch_event('input')
    r=p.locator('#punch-btn').bounding_box();p.mouse.move(r['x']+r['width']/2,r['y']+r['height']/2);p.mouse.down();p.mouse.move(720,550,steps=8);p.mouse.up()
    p.locator('#control-save').click()
    check('Dragging and size save actual layout',p.evaluate("PIGGY.state.settings.controls.sizes['punch-btn']===68&&Math.abs(PIGGY.state.settings.controls.positions['punch-btn'].x-.72)<.02&&PIGGY.game.mode==='play'"))
    check('Buttons render as circles at configured size',p.locator('#punch-btn').evaluate("b=>Math.abs(b.getBoundingClientRect().width-68)<1&&getComputedStyle(b).borderRadius==='50%'"))
    p.reload();p.wait_for_selector('#loading',state='hidden');p.locator('#continue').click()
    check('Saved control layout survives actual origin reload',p.evaluate("PIGGY.state.settings.controls.sizes['punch-btn']===68&&Math.abs(document.getElementById('punch-btn').getBoundingClientRect().width-68)<1"))
    p.locator('#pause').click();p.locator('#pause-controls').click();p.locator('#control-target').select_option('punch-btn');p.locator('#control-size').fill('80');p.locator('#control-size').dispatch_event('input');p.locator('#control-cancel').click()
    check('Cancel preserves previous control layout',p.evaluate("PIGGY.state.settings.controls.sizes['punch-btn']===68"))
    p.locator('#pause').click();p.locator('#pause-controls').click();p.locator('#control-reset').click();p.locator('#control-save').click()
    check('Reset restores usable default controls',p.evaluate('PIGGY.state.settings.controls.size===56&&Object.keys(PIGGY.state.settings.controls.positions).length===0'))

    # Reproducible projectile boundary after actual shop and controls interaction.
    p.evaluate("""()=>{const P=PIGGY,g=P.game;g.helpers=[];P.state.party=[];g.enemies=[];g.player.vx=0;g.player.pose='idle';g.player.dir=1;g.player.hp=100;g.player.inv=0;g.pig.carrying=false;g.player.shieldRaised=true;g.enemyShots=[{x:g.player.x+140,y:510,vx:-600,vy:0,r:9,life:2,damage:25,theme:'forest'}];}""")
    p.wait_for_function('PIGGY.game.shieldHits>0',timeout=2000)
    check('Front projectile disappears on shield without damage',p.evaluate('PIGGY.game.enemyShots.length===0&&PIGGY.game.player.hp===100'))
    check('Shield triggers wooden impact sound',p.evaluate("PIGGY.Audio.diagnostics().lastPlayed==='wood'"))
    p.screenshot(path=str(OUT/'shield-guard.png'))
    p.keyboard.press('b');p.wait_for_timeout(80)
    check('B stows shield using real keyboard',not p.evaluate('PIGGY.Combat.shieldActive(PIGGY.game)'))
    p.evaluate("""()=>{const g=PIGGY.game;g.player.inv=0;g.enemyShots=[{x:g.player.x+140,y:510,vx:-600,vy:0,r:9,life:2,damage:25,theme:'forest'}];}""")
    p.wait_for_function('PIGGY.game.player.hp<100',timeout=2000)
    check('Unblocked projectile damages actual player',p.evaluate('PIGGY.game.player.hp===75'))
    red=p.evaluate("""()=>{const P=PIGGY,g=P.game;g.player.hp=20;g.mode='pause';const original=P.Art.bar,calls=[];P.Art.bar=(...args)=>{calls.push(args);original(...args);};g.draw();P.Art.bar=original;return calls.some(a=>a[1]===g.player.x&&a[3]===20&&a[5]===66&&a[6]==='#c85555');}""")
    check('Player world health bar turns red at low health',red)
    p.screenshot(path=str(OUT/'low-health.png'))

    for mapid in ['wind','amber','brook']:
        p.evaluate("""id=>{const P=PIGGY,g=P.game;P.state=P.State.fresh();P.state.unlocked=P.MAPS.map(m=>m.id);P.UI.depart(id);g.mode='pause';g.player.x=4700;g.pig.x=4750;g.camera=4290;g.cameraY=P.World.height(g.room,g.player.x)*.75;g.roomTitle=0;g.draw();}""",mapid)
        check(mapid+': larger themed route and real loop branches',p.evaluate('PIGGY.game.room.width>=15500&&Object.keys(PIGGY.game.map.rooms).length>=5&&PIGGY.game.room.portals.length>=4'))
        p.screenshot(path=str(OUT/(mapid+'-terrain.png')))
        p.locator('#world-map').click();check(mapid+': SVG route map displays actual player location',p.locator('.route-map').is_visible() and '현위치' in p.locator('.route-map').text_content());p.screenshot(path=str(OUT/(mapid+'-map.png')));p.locator('[data-close]').click()
        v=p.evaluate("""()=>{const P=PIGGY,g=P.game;const portal=g.room.portals.find(p=>['refuge','court','reeds'].includes(p.target));g.mode='play';g.player.x=portal.x;g.pig.carrying=true;g.interact();for(let n=0;n<72;n++)g.tick(1/60);const arrived=g.roomId===portal.target;const next=g.room.portals.find(p=>p.target!=='main');g.player.x=next.x;g.interact();for(let n=0;n<72;n++)g.tick(1/60);const loop=g.roomId===next.target;return {arrived,loop,pig:g.pig.y===g.player.y-P.CONFIG.carryHeight};}""")
        check(mapid+': E enters new branch and connects to another route',all(v.values()))

    patterns={}
    for mapid in ['wind','amber','brook']:
        v=p.evaluate("""id=>{const P=PIGGY,g=P.game;P.state=P.State.fresh();P.state.settings.sound=false;P.state.unlocked=P.MAPS.map(m=>m.id);P.UI.depart(id);g.helpers=[];P.state.party=[];g.progress.dead=P.allEnemies(g.map).map(e=>e.id);g.loadRoom('main');const boss=g.enemies.find(e=>e.type==='boss');g.enemies=[boss];boss.active=true;boss.x=g.room.bossX-300;g.player.x=boss.x-350;g.player.inv=999;g.pig.carrying=true;g.pig.hp=99999;g.camera=g.player.x-410;
          const seen=new Set();let movement=0,shots=0;
          for(let i=0;i<1900;i++){const x=boss.x;g.tick(1/60);movement+=Math.abs(boss.x-x);if(boss.pattern)seen.add(boss.pattern);shots=Math.max(shots,g.enemyShots.length);}
          g.mode='pause';const before={time:g.time,x:boss.x,windup:boss.windup};g.tick(1);const frozen=g.time===before.time&&boss.x===before.x&&boss.windup===before.windup;g.roomTitle=0;g.draw();return {patterns:[...seen],movement,shots,frozen};}""",mapid)
        check(mapid+': boss has multiple attacks, projectiles, movement and pause',len(v['patterns'])>=3 and v['movement']>150 and v['shots']>=3 and v['frozen'])
        patterns[mapid]=v;p.screenshot(path=str(OUT/(mapid+'-boss.png')))
    # Separate portrait profile checks the other control layout, not seeded personal progress.
    portrait=browser.new_page(viewport={'width':390,'height':844},has_touch=True);portrait.on('pageerror',lambda e:errors.append(str(e)))
    portrait.goto(URL);portrait.wait_for_selector('#loading',state='hidden')
    portrait.evaluate("""()=>{const P=PIGGY;P.state=P.State.fresh();P.state.skills={run:1,woodshield:1,spin:1,fire:1,gun:1};P.state.equipped=['spin','fire','gun'];P.UI.depart('wind');}""")
    portrait.wait_for_timeout(120)
    check('Portrait joystick and all learned circle controls stay on screen',portrait.evaluate("""()=>[...document.querySelectorAll('#joystick,.action-dock button')].filter(b=>!b.hidden).every(b=>{const r=b.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;})"""))
    portrait.screenshot(path=str(OUT/'portrait-controls.png'))
    check('No browser JavaScript errors',not errors)
    browser.close()
result={'url':URL,'passed':len(checks),'failed':0,'checks':checks,'boss_patterns':patterns,
        'method':'Actual HTTP joystick, shop, keyboard, layout drag/reload and audio signal. Map portal/projectile/boss coverage also uses explicit isolated test state; not a full manual clear or native Safari test.'}
(OUT/'world-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
