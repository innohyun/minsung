"""v0.5 button-mode controls: real keyboard/touch play plus reproducible pose/gate edge cases.
Only an isolated browser save is changed. No user database or remote resources.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(os.environ.get('PIGGY_TEST_OUTPUT', '/tmp/piggy-v05-controls'))
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('PIGGY_URL', 'http://127.0.0.1:4173/piggy-quest/index.html')
checks, errors = [], []


def check(name, value):
    assert value, name
    checks.append(name)


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True)
    context = browser.new_context(viewport={'width': 920, 'height': 480}, has_touch=True)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    check('HTTP boots with all embedded art including ceramic pig', page.goto(URL).status == 200)
    page.wait_for_selector('#loading', state='hidden')
    check('Right-facing inert pig asset loads', page.evaluate("Object.values(PIGGY.Art.images).every(i=>i.complete&&i.naturalWidth>0)&&JSON.parse(PIGGY.SOURCE_FILES['assets/manifest.json']).assets.pig.direction==='right'"))
    page.evaluate("PIGGY.state.settings.controls.mode='buttons';PIGGY.Controls.apply();PIGGY.State.save(PIGGY.state)")
    page.locator('#depart').click()
    check('Camp header and footer disappear during play', page.locator('.site-header').is_hidden() and page.locator('footer').is_hidden() and page.locator('.mobile-nav').is_hidden())
    check('Gameplay occupies the viewport without scrolling', page.evaluate('document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight&&Math.abs(document.getElementById("stage").getBoundingClientRect().height-innerHeight)<2'))
    check('No unlearned action or skill placeholder buttons', page.locator('[data-skill]').count() == 0 and page.locator('#run-btn').is_hidden() and page.locator('#jump-btn').count() == 0)
    check('Interaction is labeled E', page.locator('#interact-btn').inner_text().count('E') > 0 and '상호작용' in page.locator('#interact-btn').inner_text())

    cdp = context.new_cdp_session(page)

    def point(selector, identity):
        box = page.locator(selector).bounding_box()
        assert box, selector
        return {'x': box['x']+box['width']/2, 'y': box['y']+box['height']/2, 'id': identity}

    def tap(selector):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [point(selector, 1)]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})

    x = page.evaluate('PIGGY.game.player.x')
    page.keyboard.down('d'); page.wait_for_timeout(190); page.keyboard.up('d')
    check('Keyboard walking works with grounded feet', page.evaluate(f'PIGGY.game.player.x>{x}+15&&PIGGY.game.player.y===PIGGY.CONFIG.ground'))
    tap('#interact-btn')
    page.wait_for_timeout(120)
    check('Real touch E carries pig immediately at the hand height', page.evaluate('PIGGY.game.pig.carrying&&PIGGY.game.pig.x===PIGGY.game.player.x&&PIGGY.game.pig.y===PIGGY.game.player.y-PIGGY.CONFIG.carryHeight'))
    check('Unusable hand attack stays visible and grey while carrying', page.locator('#punch-btn').is_visible() and page.locator('#punch-btn').is_disabled() and page.locator('#kick-btn').is_visible())
    page.screenshot(path=str(OUT/'carry.png'))
    page.reload(); page.wait_for_selector('#loading', state='hidden')
    check('Paused reload restores carried pig above the head', page.evaluate("PIGGY.game.mode==='pause'&&PIGGY.game.pig.carrying&&PIGGY.game.pig.y===PIGGY.game.player.y-PIGGY.CONFIG.carryHeight"))
    page.locator('#return-home').click(); page.locator('#result-home').click()
    page.locator('[data-view="skills"]').first.click()
    page.locator('[data-buy-type="skill"][data-id="run"]').click()
    check('Shop purchases running with real starting coins', page.evaluate('PIGGY.state.skills.run===1&&PIGGY.state.coins===20'))
    page.locator('[data-close]').click(); page.locator('#depart').click()
    check('Learned run button appears in right action dock', page.locator('#action-dock #run-btn').is_visible())
    points = [point('[data-hold="d"]', 1)]
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': points})
    points.append(point('#run-btn', 2))
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': points})
    page.wait_for_timeout(350)
    check('Two-finger move and run accelerate without jumping', page.evaluate('PIGGY.game.player.running&&PIGGY.game.player.vx>340&&PIGGY.game.player.y===PIGGY.CONFIG.ground'))
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    check('Releasing touch clears both held controls', page.evaluate('PIGGY.game.keys.size===0'))
    page.keyboard.down('d'); page.keyboard.down('Shift')
    page.wait_for_function('PIGGY.game.enemies.some(e=>e.hp>0&&e.active&&Math.abs(e.x-PIGGY.game.player.x)<95)', timeout=8000)
    page.keyboard.up('d'); page.keyboard.up('Shift')
    tap('#interact-btn'); page.wait_for_timeout(120)
    check('E releases pig and restores punching button', not page.evaluate('PIGGY.game.pig.carrying') and page.locator('#punch-btn').is_visible())
    tap('#punch-btn')
    page.wait_for_function('PIGGY.Audio.energy()>.001', timeout=2000)
    check('Gesture-unlocked effects emit an actual audio signal', page.evaluate("PIGGY.Audio.status()==='running'&&PIGGY.state.settings.sound"))
    page.wait_for_timeout(370)
    tap('#kick-btn'); page.wait_for_timeout(160)
    check('Normal input combat defeats an encountered enemy', page.evaluate('PIGGY.game.progress.dead.length>0'))
    for _ in range(2):
        tap('#punch-btn'); page.wait_for_timeout(80)
    metrics = cdp.send('Page.getLayoutMetrics')
    check('Rapid repeated attack taps keep viewport scale unchanged', abs(metrics['visualViewport']['scale']-1)<.001)
    check('Selection and browser gesture fallbacks cancel default actions', page.evaluate("['selectstart','contextmenu','gesturestart','dblclick'].every(type=>!document.getElementById('game').dispatchEvent(new Event(type,{bubbles:true,cancelable:true})))&&getComputedStyle(document.getElementById('game')).touchAction==='none'"))
    page.screenshot(path=str(OUT/'combat.png'))

    # Funding is seeded only for testing the purchased roundhouse after normal play.
    page.locator('#pause').click(); page.locator('#return-home').click(); page.locator('#result-home').click()
    page.evaluate('PIGGY.state.coins=1000;PIGGY.UI.refreshHome()')
    page.locator('[data-view="skills"]').first.click()
    for ability in ['spin', 'fire', 'gun']:
        page.locator(f'[data-buy-type="skill"][data-id="{ability}"]').click()
    page.locator('[data-close]').click(); page.locator('#depart').click()
    check('Purchased actions appear on the right without empty slots', page.locator('#action-dock [data-skill]').count() == 3)
    page.keyboard.press('e'); page.wait_for_timeout(100)
    check('Carrying greys hand skills but retains roundhouse', page.locator('[data-skill="0"]').is_enabled() and page.locator('[data-skill="1"]').is_disabled() and page.locator('[data-skill="2"]').is_disabled())
    tap('[data-skill="0"]'); page.wait_for_timeout(100)
    check('Roundhouse starts with a separate knee chamber', page.evaluate("PIGGY.game.player.pose==='spin'&&PIGGY.game.player.age<.23&&PIGGY.game.player.spinPending"))
    page.wait_for_timeout(550)
    check('Roundhouse completes and clears its pending strike', page.evaluate("PIGGY.game.player.pose==='idle'&&!PIGGY.game.player.spinPending"))
    for selector in ['#world-map', '#command', '#run-btn', '#kick-btn', '[data-skill="0"]']:
        box = page.locator(selector).bounding_box()
        check('Reachable right control: '+selector, box and box['x']>460 and box['width']>=44 and box['height']>=44 and box['y']+box['height']<=480)

    # Geometry snapshots are deterministic; simulation cases above use real inputs.
    page.evaluate("""()=>{const g=PIGGY.game;g.mode='pause';g.player.x=g.room.bossX-PIGGY.CONFIG.bossGateOffset-170;g.pig.x=g.player.x;g.pig.y=g.player.y-PIGGY.CONFIG.carryHeight;g.camera=g.player.x-410;g.roomTitle=0;g.draw();}""")
    page.wait_for_timeout(100); page.screenshot(path=str(OUT/'boss-gate.png'))
    page.evaluate("""()=>{
      PIGGY.UI.home();document.getElementById('toast').classList.remove('show');
      const canvas=document.createElement('canvas');canvas.id='spin-sheet';canvas.width=1280;canvas.height=560;canvas.style='width:1280px;height:560px';document.body.append(canvas);
      const c=canvas.getContext('2d');c.fillStyle='#eef0e6';c.fillRect(0,0,1280,560);c.fillStyle='#cfc38a';c.fillRect(0,218,1280,60);c.fillRect(0,480,1280,70);
      [.02,.13,.20,.26,.38,.51,.62].forEach((age,i)=>{PIGGY.Art.stick(c,80+i*183,250,{pose:'spin',age});PIGGY.Art.label(c,(age*1000)+'ms',80+i*183,272,13);});
      for(let i=0;i<7;i++)PIGGY.Art.stick(c,80+i*183,520,{running:true,walkBlend:1,phase:i/7});
    }""")
    page.locator('#spin-sheet').screenshot(path=str(OUT/'spin-and-run.png'))
    check('No browser JavaScript errors', not errors)
    browser.close()
result = {'url': URL, 'passed': len(checks), 'failed': 0, 'checks': checks, 'method': 'Real touch/keyboard play; roundhouse shop funding and gate/pose snapshots use explicit test state.'}
(OUT/'controls-results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
print(json.dumps(result, ensure_ascii=False))
