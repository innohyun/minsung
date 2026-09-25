"""Swing physics/placement regression against a local static server or MARBLE_URL."""
import math
import os
from playwright.sync_api import sync_playwright

URL = os.environ.get('MARBLE_URL', 'http://127.0.0.1:8765/marble-builder/')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
D = 'window.__marbleBuilderDebug'


def run(browser, mobile):
    context = browser.new_context(viewport={'width': 390 if mobile else 1280, 'height': 844 if mobile else 900},
                                  is_mobile=mobile, has_touch=mobile, device_scale_factor=2 if mobile else 1)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='networkidle')
    page.locator('#freeModeButton').click()
    x, y, length = (190, 515, 130) if mobile else (520, 490, 180)
    angle = .4
    swing = page.evaluate(f'{D}.addRod("swing", {x}, {y}, {{length:{length},angle:{angle},fixed:true}})?.uid')
    assert swing
    assert page.evaluate(f'{D}.addRod("wood", {x + 85}, {y})') is None, 'block inside swept disk was placed'
    assert page.evaluate(f'{D}.addRod("swing", {x + 60}, {y}, {{length:75}})') is None
    state = page.evaluate(f'{D}.getState()')
    assert state['rodCount'] == 1 and state['rods'][0]['fixed']
    if not mobile:
        assert page.evaluate(f'{D}.addRod("wood", {x + 340}, {y}, {{length:40}})') is not None
        page.evaluate(f'{D}.selectRod(0)')
        hx = x + length * math.sin(angle)
        hy = y - length * math.cos(angle)
        page.mouse.move(hx, hy)
        page.mouse.down()
        page.mouse.move(hx + 100 * math.sin(angle), hy - 100 * math.cos(angle), steps=4)
        page.mouse.up()
        assert page.evaluate(f'{D}.getState().rods[0].length') == length, 'length change crossed another block'
    # Dropping a ball far away must not unlock a fixed swing.
    page.evaluate(f'{D}.setBallState({{x:{x + 600},y:-250,vx:0,vy:0}})')
    page.evaluate(f'{D}.stepPhysics(25)')
    locked = page.evaluate(f'{D}.getState().rods[0]')
    assert locked['angle'] == angle and locked['swingStarted'] is False, locked
    # A ball contacting the upper magnet starts the pendulum.
    arm = length + 64
    bx = x + arm * math.sin(angle)
    by = y - arm * math.cos(angle) - 35
    page.evaluate(f'{D}.setBallState({{x:{bx},y:{by},vx:0,vy:3}})')
    page.evaluate(f'{D}.stepPhysics(12)')
    attached = page.evaluate(f'{D}.getState()')
    assert attached['ball']['attachedSwingUid'] == swing, attached
    assert attached['rods'][0]['swingStarted'] and abs(attached['rods'][0]['angle'] - angle) > .001, attached
    # Tap the lower round pivot (not the upper magnet) to release with tip velocity.
    if mobile:
        cdp = context.new_cdp_session(page)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y, 'id': 1}]})
        released = page.evaluate(f'{D}.getState().ball')
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    else:
        page.mouse.move(x, y)
        page.mouse.down()
        released = page.evaluate(f'{D}.getState().ball')
        page.mouse.up()
    assert released['attachedSwingUid'] is None and math.hypot(released['vx'], released['vy']) > .25, released
    page.evaluate(f'{D}.stepPhysics(12)')
    assert page.evaluate(f'{D}.getState().ball.attachedSwingUid') is None, 'released ball snapped back to magnet'
    assert not errors, errors
    if not mobile:
        # Fixed swings must be serialized as world blocks, not player supply cards.
        page.evaluate(f'{D}.startEditor(null,{{number:91}})')
        page.evaluate(f'{D}.addRod("swing",520,490,{{length:180,angle:.35,fixed:true}})')
        page.evaluate(f'{D}.addGoal(1000,570)')
        page.evaluate(f'{D}.saveEditedStage()')
        stages = page.evaluate(f'{D}.getState().stages')
        created = next(stage for stage in stages if stage['number'] == 91)
        assert created['fixedBlocks'][0]['type'] == 'swing'
        page.evaluate(f'{D}.loadStage("{created["id"]}")')
        stage = page.evaluate(f'{D}.getState()')
        assert len(stage['rods']) == 1 and stage['rods'][0]['fixed'] and not stage['supplies'], stage
        assert stage['rods'][0]['angle'] == .35
    assert not errors, errors
    context.close()
    print('mobile' if mobile else 'desktop', 'PASS pivot/lock/latch/release/swept-disk/stage')


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=CHROME)
    try:
        run(browser, False)
        run(browser, True)
    finally:
        browser.close()
