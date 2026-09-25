"""Browser physics and GUI regression for swing marker, obstacles, and both ball sizes."""
import math
import os
from playwright.sync_api import sync_playwright

URL = os.environ.get('MARBLE_URL', 'http://127.0.0.1:8765/marble-builder/')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
D = 'window.__marbleBuilderDebug'


def run(browser, mobile):
    context = browser.new_context(viewport={'width': 390 if mobile else 1280, 'height': 844 if mobile else 900},
                                  is_mobile=mobile, has_touch=mobile)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='networkidle')
    page.locator('#freeModeButton').click()
    x, y, length = (260, 530, 100) if mobile else (520, 490, 180)
    swing = page.evaluate(f'{D}.addRod("swing", {x}, {y}, {{length:{length},angle:0,fixed:true}})?.uid')
    assert swing
    marker = page.evaluate(f'{D}.swingReleasePoint({D}.getRodByUid({swing!r}))')
    assert math.isclose(math.hypot(marker['x'] - x, marker['y'] - y), length + 64, abs_tol=.01)
    assert page.evaluate(f'{D}.addRod("wood",{x + 80},{y + 65},{{length:40}})') is not None, 'orbit still forbids blocks'
    page.evaluate(f'{D}.selectRod(1)')
    page.locator('#deleteButton').click()
    # Drag the BLUE release marker in the actual Canvas with mouse or touch.
    target_angle = -1.25
    target = (x + (length + 64) * math.sin(target_angle), y - (length + 64) * math.cos(target_angle))
    if mobile:
        cdp = context.new_cdp_session(page)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': marker['x'], 'y': marker['y'], 'id': 1}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': target[0], 'y': target[1], 'id': 1}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    else:
        page.mouse.move(marker['x'], marker['y'])
        page.mouse.down()
        page.mouse.move(*target, steps=8)
        page.mouse.up()
    actual = page.evaluate(f'{D}.getRodByUid({swing!r}).releaseAngle')
    assert abs(actual - target_angle) < .08, actual
    # Merely spawning a ball leaves a fixed swing at its authored angle.
    page.evaluate(f'{D}.setBallState({{x:{x + 450},y:-240,vx:0,vy:0}})')
    page.evaluate(f'{D}.stepPhysics(20)')
    state = page.evaluate(f'{D}.getState().rods[0]')
    assert state['angle'] == 0 and state['swingStarted'] is False, state
    # Attraction starts at a distance, accelerates smoothly and latches only near the mouth.
    page.evaluate(f'{D}.setBallState({{x:{x + 40},y:{y - length - 100},vx:0,vy:0}})')
    page.evaluate(f'{D}.stepPhysics(2)')
    first = page.evaluate(f'{D}.getState().ball')
    assert first['attachedSwingUid'] is None and first['vx'] < 0, first
    page.evaluate(f'{D}.stepPhysics(65)')
    state = page.evaluate(f'{D}.getState()')
    assert state['ball']['attachedSwingUid'] == swing, state
    # Pivot touch ARMS release; crossing the marker actually lets go.
    if mobile:
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y, 'id': 2}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    else:
        page.mouse.click(x, y)
    armed = page.evaluate(f'{D}.getState()')
    assert armed['ball']['attachedSwingUid'] == swing and armed['rods'][0]['releaseRequested']
    # A block directly on the release route stops the swinging ball before the marker.
    block_x = x + (length + 64) * math.sin(target_angle)
    block_y = y - (length + 64) * math.cos(target_angle)
    assert page.evaluate(f'{D}.addRod("wood",{block_x},{block_y},{{length:50}})') is not None
    page.evaluate(f'{D}.setSwingState({swing!r},{{angle:{target_angle + .55},omega:-2,started:true}})')
    page.evaluate(f'{D}.stepPhysics(90)')
    blocked = page.evaluate(f'{D}.getState()')
    assert blocked['ball']['attachedSwingUid'] == swing and blocked['rods'][0]['releaseRequested'], blocked
    page.evaluate(f'{D}.selectRod(1)')
    page.locator('#deleteButton').click()
    page.evaluate(f'{D}.setSwingState({swing!r},{{angle:{target_angle + .45},omega:-3,started:true}})')
    page.evaluate(f'{D}.stepPhysics(90)')
    released = page.evaluate(f'{D}.getState().ball')
    assert released['attachedSwingUid'] is None and math.hypot(released['vx'], released['vy']) > .2, released
    page.evaluate(f'{D}.stepPhysics(12)')
    assert page.evaluate(f'{D}.getState().ball.attachedSwingUid') is None
    # Giant ball uses its actual radius/mass in collisions and magnetic attachment.
    page.locator('#ballTypeButton').click()
    assert page.locator('#ballTypeButton').inner_text() == '공: 거대'
    page.locator('#spawnButton').click()
    giant = page.evaluate(f'{D}.getState().ball')
    assert giant['radius'] > 18 and giant['mass'] > .18 and giant['type'] == 'giant', giant
    page.evaluate(f'{D}.setSwingState({swing!r},{{angle:0,omega:0,started:false}})')
    page.evaluate(f'{D}.setBallState({{x:{x + 40},y:{y - length - 115},vx:0,vy:0}})')
    page.evaluate(f'{D}.stepPhysics(120)')
    giant = page.evaluate(f'{D}.getState().ball')
    assert giant['attachedSwingUid'] == swing, giant
    # The authored release angle and giant-ball choice survive stage save/reload.
    page.evaluate(f'{D}.startEditor(null,{{number:91}})')
    page.evaluate(f'{D}.addRod("swing",{x},{y},{{length:{length},angle:.35,releaseAngle:-.95,fixed:true}})')
    page.evaluate(f'{D}.addGoal({x + 430},{y + 60})')
    page.locator('#ballTypeButton').click()
    page.evaluate(f'{D}.saveEditedStage()')
    stages = page.evaluate(f'{D}.getState().stages')
    created = next(stage for stage in stages if stage['number'] == 91)
    assert created['ballType'] == 'giant' and abs(created['fixedBlocks'][0]['releaseAngle'] + .95) < .001, created
    page.evaluate(f'{D}.loadStage({created["id"]!r})')
    stage = page.evaluate(f'{D}.getState()')
    assert stage['rods'][0]['fixed'] and abs(stage['rods'][0]['releaseAngle'] + .95) < .001
    assert stage['selectedBallType'] == 'giant'
    page.locator('#spawnButton').click()
    assert page.evaluate(f'{D}.getState().ball.radius') == 32
    assert not errors, errors
    context.close()
    print('mobile' if mobile else 'desktop', 'PASS orbit/drag/pull/obstacle/marker/giant')


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=CHROME)
    try:
        run(browser, False)
        run(browser, True)
    finally:
        browser.close()
