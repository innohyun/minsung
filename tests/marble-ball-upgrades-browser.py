"""Browser regressions for marble workshop and pairwise ball impulses."""
import math
import os
from playwright.sync_api import sync_playwright

URL = os.environ.get('MARBLE_URL', 'http://127.0.0.1:8765/marble-builder/')
D = 'window.__marbleBuilderDebug'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args=['--no-sandbox'])
    for width, height in [(390, 844), (1280, 800)]:
        context = browser.new_context(viewport={'width': width, 'height': height}, has_touch=width < 500)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL)
        page.locator('#ballWorkshopButton').click()
        assert page.locator('.color-controls').evaluate('(e) => getComputedStyle(e).display') == 'flex'
        wheel = page.locator('#colorWheel').bounding_box()
        assert wheel
        page.mouse.move(wheel['x'] + wheel['width'] * .9, wheel['y'] + wheel['height'] * .5)
        page.mouse.down()
        page.mouse.move(wheel['x'] + wheel['width'] * .5, wheel['y'] + wheel['height'] * .1, steps=6)
        page.mouse.up()
        page.locator('#colorSaturation').fill('60')
        page.locator('#colorLightness').fill('27')
        page.locator('#colorOpacity').fill('80')
        page.locator('#colorBoost').fill('20')
        chosen = page.locator('#pickedColor').evaluate('(e) => e.style.background')
        assert 'hsla' in chosen or 'rgba' in chosen, chosen
        assert page.locator('#actualColor').evaluate('(e) => e.style.background') == chosen
        for control, value in [('colorSaturation','60%'),('colorLightness','27%'),('colorOpacity','80%'),('colorBoost','20%')]:
            assert page.locator(f'#{control}Value').inner_text() == value
        # Hue selector has a white rim distinct from the central preview.
        assert page.evaluate("(() => { const d=document.getElementById('colorWheel').getContext('2d').getImageData(110,2,1,1).data; return d[0]>220 && d[1]>220 && d[2]>220 })()")
        canvas = page.locator('#ballEditor').bounding_box()
        page.mouse.click(canvas['x'] + canvas['width']*.5, canvas['y'] + canvas['height']*.5)
        painted = page.evaluate("Array.from(document.getElementById('ballEditor').getContext('2d').getImageData(256,256,1,1).data)")
        assert painted[:3] != [255, 255, 255], painted
        assert not page.locator('#workshopUndo').is_disabled()
        assert len(page.evaluate("JSON.parse(localStorage.getItem('marble-builder-custom-balls-v1') || '[]')")) == 0
        page.locator('#workshopUndo').click()
        assert page.evaluate("Array.from(document.getElementById('ballEditor').getContext('2d').getImageData(256,256,1,1).data)")[:3] == [255, 255, 255]
        assert page.locator('#workshopUndo').is_disabled() and not page.locator('#workshopRedo').is_disabled()
        page.locator('#workshopRedo').click()
        restored = page.evaluate("Array.from(document.getElementById('ballEditor').getContext('2d').getImageData(256,256,1,1).data)")
        assert restored[:3] != [255, 255, 255], (painted, restored)
        assert not page.locator('#workshopUndo').is_disabled()
        page.locator('#workshopSave').click()
        page.locator('#workshopHome').click()
        page.locator('#freeModeButton').click()
        page.locator('#ballTypeButton').click()
        page.locator('#ballChoices button').filter(has_text='기본 공').click()
        page.locator('#ballChoices button').filter(has_text='거대 공').click()
        before = page.evaluate(f'{D}.getState().ballQueue')
        assert before == ['normal', 'giant'], before
        handle = page.locator('.queue-handle').first.bounding_box()
        row = page.locator('#ballQueueList li').last.bounding_box()
        page.mouse.move(handle['x'] + handle['width']/2, handle['y'] + handle['height']/2)
        page.mouse.down()
        page.wait_for_timeout(360)
        page.mouse.move(row['x'] + row['width']/2, row['y'] + row['height']/2, steps=6)
        page.mouse.up()
        assert page.evaluate(f'{D}.getState().ballQueue') == ['giant', 'normal']
        if width < 500:
            handle = page.locator('.queue-handle').first.bounding_box()
            row = page.locator('#ballQueueList li').last.bounding_box()
            x = handle['x'] + handle['width']/2
            start = handle['y'] + handle['height']/2
            end = row['y'] + row['height']/2
            cdp = context.new_cdp_session(page)
            cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':x,'y':start,'id':1}]})
            page.wait_for_timeout(360)
            cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':x,'y':end,'id':1}]})
            cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
            assert page.evaluate(f'{D}.getState().ballQueue') == ['normal', 'giant']
            # Keep the same giant-first momentum fixture as the desktop path.
            page.locator('.queue-handle').first.focus()
            page.keyboard.press('ArrowDown')
            assert page.evaluate(f'{D}.getState().ballQueue') == ['giant', 'normal']
        page.locator('#ballCollisions').check()
        assert page.evaluate(f'{D}.getState().ballCollisions')
        page.locator('#closeBallQueue').click()
        page.locator('#spawnButton').click()
        page.locator('#spawnButton').click()
        assert len(page.evaluate(f'{D}.getState().activeBalls')) == 2
        # Giant (1.5 kg) at rest, normal (0.18 kg) travelling toward it.
        page.evaluate(f'{D}.setActiveBallState(0, {{x:550,y:220,vx:0,vy:0,omega:0}})')
        page.evaluate(f'{D}.setActiveBallState(1, {{x:501,y:220,vx:2,vy:0,omega:0}})')
        page.evaluate(f'{D}.stepPhysics(2)')
        balls = page.evaluate(f'{D}.getState().activeBalls')
        momentum = sum(b['mass']*b['vx'] for b in balls)
        assert abs(momentum - .36) < .01, (momentum, balls)
        assert balls[0]['vx'] > 0 and balls[1]['vx'] < 0, balls
        assert math.hypot(balls[0]['x']-balls[1]['x'], balls[0]['y']-balls[1]['y']) >= 49.9, balls
        page.locator('#ballTypeButton').click()
        page.locator('#ballCollisions').uncheck()
        page.locator('#closeBallQueue').click()
        page.evaluate(f'{D}.setActiveBallState(0, {{x:550,y:220,vx:0,vy:0}})')
        page.evaluate(f'{D}.setActiveBallState(1, {{x:501,y:220,vx:2,vy:0}})')
        page.evaluate(f'{D}.stepPhysics(2)')
        balls = page.evaluate(f'{D}.getState().activeBalls')
        assert balls[0]['vx'] == 0 and balls[1]['vx'] > 1.9, balls
        # Real UI spawning into a wooden landing zone: second falling ball must
        # transfer momentum to the first one rather than merely separate debug states.
        page.locator('#resetButton').click()
        page.locator('#ballTypeButton').click()
        page.locator('#ballCollisions').check()
        page.locator('#closeBallQueue').click()
        page.evaluate(f"(() => {{ const d={D}, p=d.getState().spawn; d.addRod('wood', p.x, p.y + 160); }})()")
        page.locator('#spawnButton').click()
        page.evaluate(f'{D}.stepPhysics(250)')
        grounded = page.evaluate(f'{D}.getState().activeBalls[0]')
        page.locator('#spawnButton').click()
        natural = page.evaluate(f"(() => {{ const d={D}; let peak = 0; for (let i=0;i<220;i++) {{ d.stepPhysics(1); const a=d.getState().activeBalls; peak=Math.max(peak, -a[0].vy); }} return {{peak, balls:d.getState().activeBalls}}; }})()")
        assert natural['peak'] > .08, (grounded, natural)
        page.locator('#resetButton').click()
        page.locator('#ballTypeButton').click()
        page.locator('#ballCollisions').uncheck()
        page.locator('#closeBallQueue').click()
        page.locator('#spawnButton').click()
        page.evaluate(f'{D}.stepPhysics(250)')
        page.locator('#spawnButton').click()
        off_peak = page.evaluate(f"(() => {{ const d={D}; let peak=0; for(let i=0;i<220;i++) {{ d.stepPhysics(1); peak=Math.max(peak,-d.getState().activeBalls[0].vy); }} return peak; }})()")
        assert natural['peak'] > off_peak + .05, (natural, off_peak)
        assert not errors, errors
        print(f'PASS {width}x{height}: color, undo/redo, hold-reorder, collision momentum/on/off')
        context.close()
    browser.close()
