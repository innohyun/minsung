"""Real controls + isolated world-boundary regressions for marble builder."""
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
        page.on('pageerror', lambda exc: errors.append(str(exc)))
        page.goto(URL)
        page.wait_for_load_state('networkidle')
        page.locator('#ballWorkshopButton').click()
        for n in (-100, 100):
            page.locator('#colorBoost').fill(str(n))
            rgba = page.locator('#actualColor').evaluate('(el) => getComputedStyle(el).backgroundColor')
            expected = 'rgb(0, 0, 0)' if n == -100 else 'rgb(255, 255, 255)'
            assert rgba == expected, (n, rgba)
        page.locator('#colorSaturation').fill('37')
        page.locator('#colorLightness').fill('33')
        page.locator('#colorOpacity').fill('40')
        wheel = page.locator('#colorWheel').bounding_box()
        page.mouse.click(wheel['x'] + wheel['width'] * .9, wheel['y'] + wheel['height'] * .5)
        assert [page.locator(f'#{k}').input_value() for k in ['colorSaturation', 'colorLightness', 'colorOpacity', 'colorBoost']] == ['100', '50', '100', '0']
        editor = page.locator('#ballEditor').bounding_box()
        page.mouse.click(editor['x'] + editor['width'] / 2, editor['y'] + editor['height'] / 2)
        page.locator('#workshopSave').click()
        page.locator('#workshopHome').click()
        page.locator('#freeModeButton').click()
        page.locator('#ballTypeButton').click()
        page.locator('#ballChoices button').filter(has_text='내 공').click()
        assert 'data:image' in page.locator('#ballQueueList .queue-thumbnail').first.evaluate('(el) => el.style.backgroundImage')
        for _ in range(3):
            page.locator('#ballChoices button').filter(has_text='기본 공').click()
        assert len(page.locator('#ballQueueList li').all()) == 4
        page.locator('#ballQueueList').evaluate('(el) => el.scrollTop = 0')
        first = page.locator('#ballQueueList li').first.bounding_box()
        third = page.locator('#ballQueueList li').nth(2).bounding_box()
        page.mouse.move(first['x'] + first['width'] / 2, first['y'] + first['height'] / 2)
        page.mouse.down()
        page.locator('.queue-ghost').wait_for(timeout=2000)
        assert page.locator('.queue-ghost').count() == 1
        page.mouse.move(third['x'] + third['width'] / 2, third['y'] + 4, steps=5)
        assert page.locator('#ballQueueList li.drop-before').count() == 1
        page.mouse.up()
        ordered = page.evaluate(f'{D}.getState().ballQueue')
        assert ordered[0:3] == ['normal', ordered[1], 'normal'] and ordered[1] not in ('normal', 'giant'), ordered
        assert page.locator('.queue-ghost').count() == 0
        page.locator('#ballLaunchMode').select_option('auto')
        page.locator('#ballInterval').fill('0.2')
        page.locator('#closeBallQueue').click()
        assert len(page.evaluate(f'{D}.getState().activeBalls')) == 1
        page.locator('#resetButton').click()
        page.wait_for_timeout(650)
        assert page.evaluate(f'{D}.getState().activeBalls') == []
        page.locator('#spawnButton').click()
        page.wait_for_timeout(650)
        assert len(page.evaluate(f'{D}.getState().activeBalls')) > 1
        page.locator('#resetButton').click()
        page.locator('#followButton').click()
        assert page.evaluate(f'{D}.getState().followBall')
        page.locator('#moveToSpawnButton').click()
        state = page.evaluate(f'{D}.getState()')
        assert not state['followBall']
        assert abs((state['spawn']['x'] - state['camera']['x']) * state['camera']['zoom'] - state['view']['width'] / 2) < 1
        assert abs((state['spawn']['y'] - state['camera']['y']) * state['camera']['zoom'] - state['view']['height'] / 2) < 1
        # Re-arm manually, set up a rotated distant block and make only one ball escape.
        page.locator('#ballTypeButton').click()
        page.locator('#ballLaunchMode').select_option('manual')
        page.locator('#closeBallQueue').click()
        page.evaluate(f"(() => {{const d={D}, s=d.getState().spawn; d.addRod('wood',s.x+750,s.y,{{angle:.3}});}})()")
        page.locator('#spawnButton').click()
        page.locator('#spawnButton').click()
        page.evaluate(f"(() => {{const d={D},s=d.getState().spawn;d.setActiveBallState(0,{{x:s.x+1100,y:s.y,vx:0,vy:0}});d.setActiveBallState(1,{{x:s.x+40,y:s.y,vx:0,vy:0}});d.stepPhysics(1);}})()")
        state = page.evaluate(f'{D}.getState()')
        assert len(state['activeBalls']) == 2 and state['activeBalls'][0]['x'] == state['spawn']['x'], state
        assert state['activeBalls'][1]['x'] > state['spawn']['x'] + 30, state
        # Keep the first rolling on wood while the later, overlapping ball has no
        # surface contact: its silent request must not mute the first ball.
        page.locator('#resetButton').click()
        rolling = page.evaluate(f"(() => {{ const d={D}, s=d.getState().spawn; const rod=d.addRod('wood',s.x+220,s.y+150); d.spawnBall(); d.spawnBall(); const a=d.getState().activeBalls[0]; const y=rod.y-rod.thickness/2-a.radius+.3; d.setActiveBallState(0,{{x:rod.x,y:y,vx:3,vy:0,omega:10}}); d.setActiveBallState(1,{{x:rod.x+10,y:y-27,vx:0,vy:0,omega:0}}); d.stepPhysics(1); return {{audio:d.getAudioState(),balls:d.getState().activeBalls}}; }})()")
        assert rolling['audio']['recordedRollingRevolutionsPerSecond'] > .1, rolling
        assert not errors, errors
        print(f'PASS {width}x{height}: HDR endpoints, wheel reset, thumbnail, insertion drag, auto reset, recenter, single-ball boundary')
        context.close()
    browser.close()
