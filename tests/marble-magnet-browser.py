"""Real UI + deterministic magnet/boundary regression for local and public Marble Builder."""
import os
from playwright.sync_api import sync_playwright

URL = os.environ.get('MARBLE_URL', 'http://127.0.0.1:8765/marble-builder/')
D = 'window.__marbleBuilderDebug'


def state(page):
    return page.evaluate(f'{D}.getState()')


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width, height in [(1280, 800), (390, 844)]:
        page = browser.new_page(viewport={'width': width, 'height': height}, has_touch=width < 500)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL, wait_until='networkidle')
        page.locator('#freeModeButton').click()
        page.locator('.tool-card[data-tool="wood"]').count()  # bootstrapped dock
        page.locator('.tool-card[aria-label="모든 블록 보기"]').count()
        page.locator('.more-card').click()
        assert page.locator('#blockCatalogDialog').evaluate('(e)=>e.open')
        card = page.locator('.catalog-item').filter(has_text='원형 자석')
        card.get_by_role('button', name='설정').click()
        page.locator('#magnetCount').fill('2')
        page.locator('#magnetOnSeconds').fill('1.2')
        page.locator('#magnetOffSeconds').fill('1.5')
        page.locator('#magnetSettingsForm button[type=submit]').click()
        assert not page.locator('#sizeEditorPanel').is_hidden()
        page.locator('#cancelSizeButton').click()
        s = state(page)
        assert s['magnetTemplate'] == {'length': 56, 'triggerCount': 2, 'onSeconds': 1.2, 'offSeconds': 1.5}, s['magnetTemplate']
        magnet_card = page.locator('.tool-card[data-tool="magnet"]')
        assert magnet_card.count() == 1 and magnet_card.get_attribute('data-trigger-count') == '2'
        # A second settings path: antigravity direction must survive size cancellation.
        page.locator('.more-card').click()
        page.locator('.catalog-item').filter(has_text='반중력 필드').get_by_role('button', name='설정').click()
        page.locator('[data-gravity-direction="left"]').click()
        page.locator('#gravityDirectionForm button[type=submit]').click()
        page.locator('#cancelSizeButton').click()
        assert state(page)['antigravityTemplate']['direction'] == 'left'
        page.locator('#ballTypeButton').click()
        assert page.locator('#magnetRepeats').count() == 1
        page.locator('#ballChoices button').filter(has_text='기본 공').click()
        page.locator('#ballChoices button').filter(has_text='기본 공').click()
        page.locator('#closeBallQueue').click()
        s = state(page)
        magnet = page.evaluate(f"(() => {{let s={D}.getState().spawn;return {D}.addRod('magnet', s.x+120,s.y+60,{{length:56, triggerCount:2, onSeconds:1.2,offSeconds:1.5}})}})()")
        assert magnet and magnet['type'] == 'magnet'
        # First marble accelerates toward the magnet then attaches without bouncing or sliding.
        page.locator('#spawnButton').click()
        result = page.evaluate(f"(() => {{const d={D},m=d.getState().rods.find(r=>r.type==='magnet');d.setActiveBallState(0,{{x:m.x-145,y:m.y-20,vx:0,vy:0}});d.stepPhysics(5);const a=d.getState().activeBalls[0];d.stepPhysics(5);const b=d.getState().activeBalls[0];d.stepPhysics(100);return {{a,b,end:d.getState()}}}})()")
        assert abs(result['b']['vx']) > abs(result['a']['vx']), result
        first = result['end']['activeBalls'][0]
        assert first['attachedMagnetUid'] == magnet['uid'], result['end']['activeBalls']
        assert abs(((first['x']-magnet['x'])**2+(first['y']-magnet['y'])**2)**.5-(28+first['radius'])) < 1
        still = page.evaluate(f'{D}.stepPhysics(100);{D}.getState().activeBalls[0]')
        assert abs(still['x']-first['x']) < .01 and abs(still['y']-first['y']) < .01 and still['vx'] == still['vy'] == 0
        page.locator('#spawnButton').click()
        phase = page.evaluate(f"(() => {{const d={D},m=d.getState().rods.find(r=>r.type==='magnet');d.setActiveBallState(1,{{x:m.x-145,y:m.y-20,vx:0,vy:0}});d.stepPhysics(100);return d.getState()}})()")
        assert phase['magnets'][0]['seen'] == 2 and phase['magnets'][0]['phase'] in ('warning','shrinking'), phase['magnets']
        off = page.evaluate(f'{D}.stepPhysics(180);{D}.getState()')
        assert off['magnets'][0]['phase'] == 'off' and off['magnets'][0]['range'] == 0, off['magnets']
        assert any(not item['attachedMagnetUid'] for item in off['activeBalls']), off['activeBalls']
        # The new removal mode preserves all blocks and requires a manual respawn.
        page.locator('#ballTypeButton').click()
        page.locator('#escapeBehavior').select_option('remove')
        page.locator('#closeBallQueue').click()
        page.evaluate(f"(() => {{const d={D},s=d.getState().spawn;d.setActiveBallState(0,{{x:s.x+1100,y:s.y,vx:0,vy:0,attachedMagnetUid:null}});d.stepPhysics(1)}})()")
        removed = state(page)
        assert removed['escapeBehavior'] == 'remove' and len(removed['activeBalls']) == 1 and removed['pendingRetrievals'] == ['normal'], removed
        assert removed['rodCount'] == 1
        page.locator('#spawnButton').click()
        assert len(state(page)['activeBalls']) == 2 and not state(page)['pendingRetrievals']
        # The alternative escape option keeps the existing immediate respawn behavior.
        page.locator('#ballTypeButton').click()
        page.locator('#escapeBehavior').select_option('respawn')
        page.locator('#magnetRepeats').check()
        page.locator('#closeBallQueue').click()
        respawned = page.evaluate(f"(() => {{const d={D},s=d.getState().spawn;d.setActiveBallState(1,{{x:s.x-110,y:s.y-30,vx:0,vy:0,attachedMagnetUid:null}});d.setActiveBallState(0,{{x:s.x+1100,y:s.y,vx:0,vy:0,attachedMagnetUid:null}});d.stepPhysics(1);return d.getState()}})()")
        assert len(respawned['activeBalls']) == 2 and abs(respawned['activeBalls'][0]['x']-respawned['spawn']['x']) < .01, respawned['activeBalls']
        assert respawned['magnetRepeats'] and respawned['escapeBehavior'] == 'respawn'
        # Timed mode measures on/off intervals from the completed transition.
        timed = page.evaluate(f"(() => {{const d={D};d.stepPhysics(150);return d.getState().magnets[0]}})()")
        assert timed['phase'] == 'warning', timed
        timed = page.evaluate(f"(() => {{const d={D};d.stepPhysics(180);return d.getState().magnets[0]}})()")
        assert timed['phase'] == 'off' and timed['range'] == 0, timed
        timed = page.evaluate(f"(() => {{const d={D};d.stepPhysics(185);return d.getState().magnets[0]}})()")
        assert timed['phase'] == 'expanding', timed
        timed = page.evaluate(f"(() => {{const d={D};d.stepPhysics(100);return d.getState().magnets[0]}})()")
        assert timed['phase'] == 'on' and timed['range'] == 1, timed
        assert not errors, errors
        page.close()
        # The block can actually be placed from the dock with mouse or touch.
        page = browser.new_page(viewport={'width': width, 'height': height}, has_touch=width < 500)
        page.add_init_script("""(() => { window.__magnetDraws = 0; const original = CanvasRenderingContext2D.prototype.drawImage; CanvasRenderingContext2D.prototype.drawImage = function(image, ...args) { if (image.src?.includes('/magnet/magnet-disc.png')) window.__magnetDraws++; return original.call(this, image, ...args); }; })()""")
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL, wait_until='networkidle')
        page.locator('#freeModeButton').click()
        card = page.locator('.tool-card[data-tool="magnet"]')
        if not card.count():
            page.locator('.more-card').click()
            page.locator('.catalog-item').filter(has_text='원형 자석').get_by_role('button', name='선택').click()
            card = page.locator('.tool-card[data-tool="magnet"]')
        box = card.bounding_box()
        x, y = box['x']+box['width']/2, box['y']+box['height']/2
        view = state(page)['view']
        target_x, target_y = width/2, (view['playTop']+view['dockTop'])/2
        if width < 500:
            cdp = page.context.new_cdp_session(page)
            def touch(action, px, py):
                points = [] if action == 'touchEnd' else [{'x': px, 'y': py, 'id': 1}]
                cdp.send('Input.dispatchTouchEvent', {'type': action, 'touchPoints': points})
            touch('touchStart', x, y)
            touch('touchMove', target_x, target_y)
            touch('touchEnd', target_x, target_y)
        else:
            page.mouse.move(x, y)
            page.mouse.down()
            page.mouse.move(target_x, target_y, steps=12)
            page.mouse.up()
        assert state(page)['rodCount'] == 1 and state(page)['rods'][0]['type'] == 'magnet', state(page)['rods']
        page.wait_for_function('window.__magnetDraws > 0')
        assert page.evaluate("async () => {const image=new Image();image.src='/assets/marble-builder/magnet/magnet-disc.png?v=1';await image.decode();return [image.naturalWidth,image.naturalHeight]}") == [512,512]
        assert not errors, errors
        page.close()
        print(f'PASS {width}x{height}: magnet settings, latch/count/timed cycle, both boundary modes, mouse/touch placement')
    browser.close()
