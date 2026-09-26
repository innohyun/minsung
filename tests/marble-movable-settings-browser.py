"""Placed-block settings and rigid-body integration, tested in desktop and touch layouts."""
import os
from playwright.sync_api import sync_playwright

URL = os.environ.get('MARBLE_URL', 'http://127.0.0.1:8765/marble-builder/')
D = 'window.__marbleBuilderDebug'

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width, height in ((1280, 800), (390, 844)):
        page = browser.new_page(viewport={'width': width, 'height': height}, has_touch=width < 500)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL, wait_until='networkidle')
        page.locator('#freeModeButton').click()
        assert page.locator('#selectedSettingsButton').is_hidden()
        assert not page.locator('#blockCatalogDialog').evaluate('(e)=>e.open')
        page.locator('.more-card').click()
        assert page.locator('.catalog-item').filter(has_text='밀리는 블록').count() == 1
        page.locator('#closeCatalogButton').click()
        s = page.evaluate(f'{D}.getState().spawn')
        page.evaluate(f"{D}.addRod('magnet',{s['x']+130},{s['y']+100},{{triggerCount:2}})")
        page.evaluate(f'{D}.selectRod(0)')
        assert page.locator('#selectedSettingsButton').is_visible()
        page.locator('#selectedSettingsButton').click()
        assert page.locator('#magnetSettingsDialog').evaluate('(e)=>e.open')
        page.locator('#magnetCount').fill('3')
        page.locator('#magnetSettingsForm button[type=submit]').click()
        assert page.evaluate(f'{D}.getState().rods[0].triggerCount') == 3
        assert page.locator('#sizeEditorPanel').is_hidden()
        page.evaluate(f'{D}.clearAll()')
        page.evaluate(f"{D}.addRod('breakable',{s['x']+130},{s['y']+100})")
        page.evaluate(f'{D}.selectRod(0)')
        page.locator('#selectedSettingsButton').click()
        page.locator('#breakableHealth').fill('3')
        page.locator('#breakableSettingsForm button[type=submit]').click()
        assert page.evaluate(f'{D}.getState().rods[0].maxHp') == 50
        page.evaluate(f'{D}.clearAll()')
        page.locator('.more-card').click()
        page.locator('.catalog-item').filter(has_text='반중력 필드').get_by_role('button', name='설정').click()
        page.locator('[data-gravity-direction="left"]').click()
        page.locator('#gravityDirectionDialog [data-close-dialog]').click()
        assert page.evaluate(f'{D}.getState().antigravityTemplate.direction') == 'left'
        page.evaluate(f"{D}.addField({s['x']+130},{s['y']+100},{{width:100,height:100,direction:'up'}})")
        page.evaluate(f'{D}.selectField(0)')
        page.locator('#selectedSettingsButton').click()
        page.locator('[data-gravity-direction="right"]').click()
        page.locator('#gravityDirectionDialog [data-close-dialog]').click()
        assert page.evaluate(f'{D}.getState().fields[0].direction') == 'right'
        assert page.locator('#sizeEditorPanel').is_hidden()
        page.evaluate(f'{D}.clearAll()')
        floor_x, floor_y = s['x']+170, s['y']+260
        page.evaluate(f"{D}.addRod('wood',{floor_x},{floor_y},{{length:460,thickness:20}})")
        page.evaluate(f"{D}.addRod('movable',{floor_x},{floor_y-120},{{length:88,thickness:22}})")
        before = page.evaluate(f'{D}.getState().rods[1]')
        result = page.evaluate(f'(() => {{let d={D};d.stepPhysics(180);return d.getState().rods[1]}})()')
        print('FLOOR', width, before, result)
        assert result['y'] > before['y']+50, (before,result)
        assert result['y'] < floor_y, result
        assert abs(result['vy']) < 1.5, result
        page.evaluate(f'{D}.resetGame()')
        assert abs(page.evaluate(f'{D}.getState().rods[1].y')-before['y']) < .01
        page.evaluate(f'{D}.clearAll()')
        page.evaluate(f"{D}.addRod('wood',{floor_x},{floor_y},{{length:460,thickness:20}})")
        page.evaluate(f"{D}.addRod('movable',{floor_x-65},{floor_y-55},{{length:90,thickness:15,angle:1.57079632679}})")
        page.evaluate(f"{D}.addRod('movable',{floor_x-25},{floor_y-55},{{length:90,thickness:15,angle:1.57079632679}})")
        page.evaluate(f'{D}.spawnBall()')
        page.evaluate(f"{D}.setBallState({{x:{floor_x-145},y:{floor_y-55},vx:9,vy:0}})")
        domino = page.evaluate(f'(() => {{let d={D};d.stepPhysics(80);return d.getState().rods.slice(1)}})()')
        print('DOMINO', width, domino)
        assert any(abs(rod['angle']-1.57079632679) > .1 for rod in domino), domino
        page.evaluate(f'{D}.clearAll()')
        page.locator('#ballTypeButton').click()
        page.locator('#ballChoices button').filter(has_text='기본 공').click()
        page.locator('#ballChoices button').filter(has_text='기본 공').click()
        page.locator('#ballCollisions').check()
        page.locator('#closeBallQueue').click()
        page.evaluate(f'{D}.spawnBall()')
        page.evaluate(f'{D}.spawnBall()')
        page.evaluate(f"{D}.setActiveBallState(0,{{x:{floor_x-50},y:{floor_y-90},vx:8,vy:0}})")
        page.evaluate(f"{D}.setActiveBallState(1,{{x:{floor_x-23},y:{floor_y-90},vx:0,vy:0}})")
        impact_before = page.evaluate(f'{D}.getAudioState().impactSoundCount')
        page.evaluate(f'{D}.stepPhysics(1)')
        marbles = page.evaluate(f'{D}.getState().activeBalls')
        impact_after = page.evaluate(f'{D}.getAudioState().impactSoundCount')
        print('MARBLES', width, marbles, impact_before, impact_after)
        assert marbles[0]['vx'] < 2 and marbles[1]['vx'] > 6, marbles
        assert impact_after > impact_before, (impact_before, impact_after)
        assert not errors, errors
        print(f'PASS {width}x{height}: settings + gravity + domino')
        page.close()
    browser.close()
