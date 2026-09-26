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
    page.wait_for_timeout(80)
    painted = page.evaluate(f'''() => {{
      const canvas = document.getElementById('gameCanvas'), context = canvas.getContext('2d');
      const state = {D}.getState(), camera = state.camera, pivot = state.rods[0];
      const ratio = canvas.width / canvas.getBoundingClientRect().width;
      const pixel = (angle, radius) => {{
        const x = pivot.x + radius * Math.sin(angle);
        const y = pivot.y - radius * Math.cos(angle);
        const px = Math.round((x - camera.x) * camera.zoom * ratio);
        const py = Math.round((y - camera.y) * camera.zoom * ratio);
        if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) return null;
        return [...context.getImageData(px, py, 1, 1).data];
      }};
      const radius = pivot.length + 64;
      return {{ red: pixel(pivot.releaseAngle, radius),
        dashed: Array.from({{length:90}}, (_,i) => pixel(-.6 + i * .005, radius)) }};
    }}''')
    assert painted['red'] and painted['red'][0] > painted['red'][1] * 1.35, painted['red']
    assert sum(bool(px and px[0] < 190 and px[2] > px[0]) for px in painted['dashed']) >= 3, 'orbit dots invisible'
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
    # Put the blocker in place before touching the pivot: a real RAF may cross
    # the target between the touchend and the subsequent Python assertion.
    block_x = x + (length + 64) * math.sin(target_angle)
    block_y = y - (length + 64) * math.cos(target_angle)
    assert page.evaluate(f'{D}.addRod("wood",{block_x},{block_y},{{length:50}})') is not None
    page.evaluate(f'{D}.setSwingState({swing!r},{{angle:{target_angle + .55},omega:-2,started:true}})')
    # Pivot touch ARMS release; the blocker must prevent crossing the marker.
    if mobile:
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y, 'id': 2}]})
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    else:
        page.mouse.click(x, y)
    armed = page.evaluate(f'{D}.getState()')
    assert armed['ball']['attachedSwingUid'] == swing and armed['rods'][0]['releaseRequested'], armed
    # A block directly on the release route stops the swinging ball before the marker.
    page.evaluate(f'{D}.stepPhysics(90)')
    blocked = page.evaluate(f'{D}.getState()')
    assert blocked['ball']['attachedSwingUid'] == swing and blocked['rods'][0]['releaseRequested'], blocked
    assert blocked['lastSwingRelease'] is None
    page.evaluate(f'{D}.selectRod(1)')
    page.locator('#deleteButton').click()
    page.evaluate(f'{D}.setSwingState({swing!r},{{angle:{target_angle + .45},omega:-3,started:true}})')
    page.evaluate(f'{D}.stepPhysics(90)')
    release_state = page.evaluate(f'{D}.getState()')
    released = release_state['ball']
    assert released['attachedSwingUid'] is None and math.hypot(released['vx'], released['vy']) > .2, released
    exact = release_state['lastSwingRelease']
    assert exact and abs((exact['angle'] - actual + math.pi) % (2 * math.pi) - math.pi) < 5e-7, exact
    assert abs(exact['x'] - target[0]) < .01 and abs(exact['y'] - target[1]) < .01, exact
    assert abs(exact['vy'] - exact['vx'] * math.tan(target_angle)) < .0001, exact
    page.evaluate(f'{D}.stepPhysics(12)')
    assert page.evaluate(f'{D}.getState().ball.attachedSwingUid') is None
    # Giant ball uses its actual radius/mass in collisions and magnetic attachment.
    page.locator('#ballTypeButton').click()
    page.locator('#ballChoices button').nth(1).click()
    page.locator('#closeBallQueue').click()
    assert page.locator('#ballTypeButton').inner_text().startswith('공 설정')
    page.locator('#spawnButton').click()
    giant = page.evaluate(f'{D}.getState().ball')
    assert giant['radius'] > 18 and giant['mass'] > .18 and giant['type'] == 'giant', giant
    page.evaluate(f'{D}.setSwingState({swing!r},{{angle:0,omega:0,started:false}})')
    page.evaluate(f'{D}.setBallState({{x:{x + 40},y:{y - length - 115},vx:0,vy:0}})')
    giant_trace = page.evaluate(f'''() => {{
      const d = {D}; let attached = false, released = false;
      for (let i=0;i<120;i++) {{ d.stepPhysics(1); const s=d.getState();
        if (s.ball.attachedSwingUid === {swing!r}) attached=true;
        if (attached && s.lastSwingRelease) {{ released=true; break; }}
      }}
      return {{attached,released,ball:d.getState().ball}};
    }}''')
    assert giant_trace['attached'] and giant_trace['released'], giant_trace
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
    # Reproduce the two pictured gaps: a 2 px visible shaft clearance cannot
    # be an invisible wall, while actual contact is a wall. The U's hole is empty.
    page.evaluate(f'{D}.startFreeMode()')
    angle = 1.15
    pivot_x, pivot_y, span = (250, 510, 110) if mobile else (500, 500, 180)
    pictured = page.evaluate(f'{D}.addRod("swing",{pivot_x},{pivot_y},{{length:{span},angle:{angle},fixed:true}})?.uid')
    mid_x = pivot_x + span / 2 * math.sin(angle)
    mid_y = pivot_y - span / 2 * math.cos(angle)
    plank_x = mid_x + 14 * math.cos(angle)
    plank_y = mid_y + 14 * math.sin(angle)
    wood_angle = angle - math.pi / 2
    plank = page.evaluate(f'{D}.addRod("wood",{plank_x},{plank_y},{{length:72,thickness:14,angle:{wood_angle}}})?.uid')
    assert plank
    assert page.evaluate(f'{D}.swingBlockedAt({D}.getRodByUid({pictured!r}),{angle})') is False, 'shaft gap became a wall'
    page.evaluate(f'''() => {{ const w={D}.getRodByUid({plank!r});
      w.x -= 3 * Math.cos({angle}); w.y -= 3 * Math.sin({angle}); }}''')
    assert page.evaluate(f'{D}.swingBlockedAt({D}.getRodByUid({pictured!r}),{angle})') is True, 'visible shaft contact was missed'
    mouth_hole = page.evaluate(f'{D}.magnetContact({D}.getRodByUid({pictured!r}), '
                               f'{{x:{pivot_x + (span + 34) * math.sin(angle)}, '
                               f'y:{pivot_y - (span + 34) * math.cos(angle)}}}, 3)')
    assert mouth_hole is None, 'transparent U opening became a solid disk'
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
