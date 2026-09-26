"""Real-UI regression for replacement blocks and basic play on desktop and phone."""
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
        page.locator('.more-card').click()
        catalog = page.locator('.catalog-item').all_text_contents()
        assert any('회전축 블록' in text for text in catalog), catalog
        assert any('곡선 짚라인' in text for text in catalog), catalog
        assert not any('밀리는 블록' in text for text in catalog), catalog
        page.locator('#closeCatalogButton').click()
        page.locator('#spawnButton').click()
        initial = page.evaluate(f'{D}.getState().ball')
        assert initial is not None, 'spawn button did not create a ball'
        page.wait_for_timeout(240)
        moved = page.evaluate(f'{D}.getState().ball')
        assert moved and moved['y'] > initial['y'], (initial, moved)
        canvas = page.locator('#gameCanvas').bounding_box()
        before = page.evaluate(f'{D}.getState().camera')
        page.mouse.move(canvas['x'] + width * .65, canvas['y'] + height * .32)
        page.mouse.down()
        page.mouse.move(canvas['x'] + width * .65 + 42, canvas['y'] + height * .32 + 28, steps=5)
        page.mouse.up()
        after = page.evaluate(f'{D}.getState().camera')
        assert after['x'] != before['x'] or after['y'] != before['y'], (before, after)
        page.evaluate(f'{D}.clearAll()')
        s = page.evaluate(f'{D}.getState().spawn')
        page.evaluate(f'{D}.addRod("rotor", {s["x"] + 230}, {s["y"] + 110}, {{length:148}})')
        page.evaluate(f'{D}.selectRod(0)')
        page.locator('#selectedSettingsButton').click()
        assert page.locator('#rotorLengthDialog').evaluate('(el) => el.open')
        page.locator('#rotorLengthInput').fill('180')
        page.locator('#rotorLengthForm button[type=submit]').click()
        assert page.evaluate(f'{D}.getState().rods[0].length') == 180
        page.evaluate(f'{D}.addRod("zipline", {s["x"] + 450}, {s["y"] + 110})')
        assert page.evaluate(f'{D}.getState().rods[1].path.length') == 2
        transfer = page.evaluate('''() => {
          const k = window.MarbleKinetics;
          const a = {type:'rotor',x:300,y:300,pivotX:300,pivotY:300,pivotOffset:0,length:180,thickness:20,angle:0,omega:-4};
          const b = {type:'zipline',x:390,y:281,path:[{x:390,y:281},{x:390,y:181}],pathT:0,pathSpeed:0,length:80,thickness:20,angle:0};
          k.advance([a,b],.001,96);
          return {omega:a.omega,speed:b.pathSpeed};
        }''')
        assert -4 < transfer['omega'] < 0 and transfer['speed'] > 0, transfer
        page.locator('.more-card').click()
        page.locator('.catalog-item').filter(has_text='회전축 블록').get_by_role('button', name='선택').click()
        assert page.locator('.tool-card').filter(has_text='회전축 블록').count() > 0
        assert not errors, errors
        print(f'PASS {width}x{height}: catalog replacement, ball fall, canvas pan, rotor length, zipline')
        page.close()
    browser.close()
