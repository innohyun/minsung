"""Run against a local repo static server, e.g. python3 -m http.server 8765."""
import os
from playwright.sync_api import sync_playwright

URL = os.environ.get('MARBLE_URL', 'http://127.0.0.1:8765/marble-builder/')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'


def exercise(browser, mobile):
    context = browser.new_context(viewport={'width': 390 if mobile else 1280, 'height': 844 if mobile else 900},
                                  device_scale_factor=2 if mobile else 1, is_mobile=mobile,
                                  has_touch=mobile)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL, wait_until='networkidle')
    assert page.locator('#freeModeButton').is_visible(), errors
    page.locator('#freeModeButton').click()
    pinned = page.locator('#toolList .tool-card[data-tool="swing"]')
    assert pinned.count() == 1 and pinned.is_visible(), 'swing is hidden in the three-dot catalog'
    bounds = pinned.bounding_box()
    assert bounds and bounds['x'] >= 0 and bounds['x'] + bounds['width'] <= page.viewport_size['width'], bounds
    page.get_by_label('모든 블록 보기').click()
    swing = page.locator('.catalog-item').filter(has_text='스윙')
    assert swing.count() == 1
    swing.get_by_role('button', name='설정').click()
    assert '작대기 길이' in page.locator('#sizeEditorTitle').inner_text()
    assert page.locator('#sizeEditorPanel').is_visible()
    box = page.locator('#gameCanvas').bounding_box()
    y = box['y'] + box['height'] * .46
    x = box['x'] + box['width'] * .24
    if mobile:
        client = context.new_cdp_session(page)
        def touch(kind, tx, ty):
            client.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [] if kind == 'touchEnd' else [{'x': tx, 'y': ty, 'id': 1}]})
        touch('touchStart', x, y)
        touch('touchMove', x + 130, y)
        touch('touchEnd', x + 130, y)
    else:
        page.mouse.move(x, y)
        page.mouse.down()
        page.mouse.move(x + 220, y, steps=4)
        page.mouse.up()
    page.locator('#confirmSizeButton').click()
    tool = page.locator('.tool-card[data-tool="swing"]')
    assert tool.count() == 1
    initial = page.evaluate('window.__marbleBuilderDebug.getState().rodCount')
    bb = tool.bounding_box()
    px, py = bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2
    destx, desty = box['x'] + box['width'] * .52, box['y'] + box['height'] * .60
    if mobile:
        touch('touchStart', px, py)
        touch('touchMove', px, py - 14)
        touch('touchMove', destx, desty)
        touch('touchEnd', destx, desty)
    else:
        page.mouse.move(px, py)
        page.mouse.down()
        page.mouse.move(destx, desty, steps=8)
        page.mouse.up()
    page.wait_for_timeout(200)
    state = page.evaluate('window.__marbleBuilderDebug.getState()')
    assert state['rodCount'] == initial + 1, state
    rod = state['rods'][-1]
    assert rod['type'] == 'swing' and (120 <= rod['length'] <= 240), rod
    assert state['selectedKind'] == 'rod', state
    assert not errors, errors
    # Deselect and reselect from the actual canvas; this previously blanked the game.
    page.evaluate('window.__marbleBuilderDebug.selectRod(-1)')
    sx, sy = box['x'] + rod['x'], box['y'] + rod['y'] - 35
    if mobile:
        touch('touchStart', sx, sy)
        touch('touchEnd', sx, sy)
    else:
        page.mouse.click(sx, sy)
    selected = page.evaluate('window.__marbleBuilderDebug.getState()')
    assert selected['selectedKind'] == 'rod', selected
    assert selected['rods'][-1]['type'] == 'swing'
    # Only the rod's length is adjusted from its lower handle; pivot and thickness stay unchanged.
    initial_rod = selected['rods'][-1]
    hx, hy = box['x'] + initial_rod['x'], box['y'] + initial_rod['y'] - initial_rod['length']
    if mobile:
        touch('touchStart', hx, hy)
        touch('touchMove', hx, hy - 50)
        touch('touchEnd', hx, hy - 50)
    else:
        page.mouse.move(hx, hy)
        page.mouse.down()
        page.mouse.move(hx, hy - 50, steps=5)
        page.mouse.up()
    changed = page.evaluate('window.__marbleBuilderDebug.getState().rods.at(-1)')
    assert changed['length'] >= initial_rod['length'] + 40, (initial_rod, changed)
    assert changed['x'] == initial_rod['x'] and changed['thickness'] == initial_rod['thickness']
    assert page.evaluate('performance.getEntriesByType("resource").filter(r => r.name.includes("/swing/swing-")).length') >= 2
    assert not errors, errors
    context.close()
    print('mobile' if mobile else 'desktop', 'PASS', rod['length'], '→', changed['length'])


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=CHROME)
    try:
        exercise(browser, False)
        exercise(browser, True)
    finally:
        browser.close()
