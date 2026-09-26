"""Fresh-user magnet workflow: defaults → × → dock → natural drop, on ordinary public URL."""
import os
from playwright.sync_api import sync_playwright

URL = os.environ.get('MARBLE_URL', 'http://127.0.0.1:8765/marble-builder/')
D = 'window.__marbleBuilderDebug'

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width, height in ((1280, 800), (390, 844)):
        page = browser.new_page(viewport={'width':width, 'height':height}, has_touch=width < 500)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL, wait_until='networkidle')
        page.locator('#freeModeButton').click()
        assert page.locator('.tool-card[data-tool="magnet"]').count() == 1
        page.locator('.more-card').click()
        magnet = page.locator('.catalog-item').filter(has_text='자석')
        magnet.get_by_role('button', name='설정').click()
        # A normal first-time player accepts the defaults, then closes sizing.
        page.locator('#magnetSettingsForm button[type=submit]').click()
        page.locator('#cancelSizeButton').click()
        assert page.locator('.tool-card[data-tool="magnet"]').count() == 1, 'Settings + size × never exposed the actual magnet card'
        card = page.locator('.tool-card[data-tool="magnet"]')
        box = card.bounding_box()
        sx, sy = box['x']+box['width']/2, box['y']+box['height']/2
        view = page.evaluate(f'{D}.getState().view')
        tx, ty = width/2, (view['playTop']+view['dockTop'])/2
        if width < 500:
            cdp = page.context.new_cdp_session(page)
            cdp.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':sx,'y':sy,'id':1}]})
            cdp.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{'x':tx,'y':ty,'id':1}]})
            cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
        else:
            page.mouse.move(sx,sy); page.mouse.down(); page.mouse.move(tx,ty,steps=12); page.mouse.up()
        placed = page.evaluate(f'{D}.getState()')
        assert placed['rodCount']==1 and placed['rods'][0]['type']=='magnet', placed['rods']
        page.locator('#spawnButton').click()
        page.wait_for_timeout(150)
        assert not errors, errors
        page.screenshot(path=f'tests/magnet-visible-{width}.png')
        print(f'PASS {width}x{height}: fresh defaults + × → real round magnet placement + normal spawn')
        page.close()
    browser.close()
