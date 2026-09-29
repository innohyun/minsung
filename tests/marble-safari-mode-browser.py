"""Safeguard mode entry without newer Safari browser APIs.

Run against a local or public MARBLE_URL. WebKit is optional; no existing
browser profile or user storage is touched.
"""
import os
from playwright.sync_api import sync_playwright

URL = os.getenv('MARBLE_URL', 'https://minsung.classaimate.com/marble-builder/')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

with sync_playwright() as pw:
    for name, browser_type, launch in (
        ('webkit', pw.webkit, {}),
        ('chromium', pw.chromium, {'executable_path': CHROME}),
    ):
        try:
            browser = browser_type.launch(headless=True, **launch)
        except Exception as exc:
            if name != 'webkit':
                raise
            print('WebKit unavailable:', str(exc).splitlines()[0], flush=True)
            continue
        try:
            for mobile, missing_observer, missing_replace_children, saved in (
                (True, False, False, False), (False, False, False, False),
                (True, True, False, False), (False, True, False, False),
                (True, False, True, False), (False, False, True, False),
                (True, False, True, True), (False, False, True, True),
            ):
                context = browser.new_context(viewport={'width': 390 if mobile else 1280, 'height': 844},
                                              is_mobile=mobile, has_touch=mobile)
                # Old Safari may keep a previous same-version device script. Neither old URL may be used.
                context.route('**/marble-builder/devices.js?v=9', lambda route: route.abort())
                context.route('**/marble-builder/game.js?v=74', lambda route: route.abort())
                if missing_observer:
                    context.add_init_script('window.ResizeObserver = undefined')
                if missing_replace_children:
                    context.add_init_script('Element.prototype.replaceChildren = undefined')
                if saved:
                    context.add_init_script("""if (location.pathname.includes('/marble-builder/')) {
                      if (localStorage.getItem('marble-builder-stages-v1') === null)
                        localStorage.setItem('marble-builder-stages-v1', JSON.stringify([
                          {id:'stage-1',number:1,rods:[]},
                          {id:'old-map',number:2,fixedBlocks:[{type:'wood',x:200,y:250}],supplyBlocks:[],goals:[]} ]));
                      if (localStorage.getItem('marble-builder-creations-v1') === null)
                        localStorage.setItem('marble-builder-creations-v1', JSON.stringify([
                          {id:'old-creation',name:'저장 작품',rods:[{type:'wood',x:100,y:200}],goals:[]} ]));
                    }""")
                try:
                    page = context.new_page()
                    errors = []
                    page.on('pageerror', lambda e: errors.append(str(e)))
                    for selector in ('#freeModeButton', '#stageModeButton'):
                        response = page.goto(URL, wait_until='networkidle')
                        assert response.status == 200, response.status
                        assert page.evaluate('''() => [...document.scripts].some(s => s.src.endsWith('devices.js?v=15'))
                          && [...document.scripts].some(s => s.src.endsWith('kinetic.js?v=21'))
                          && [...document.scripts].some(s => s.src.endsWith('game.js?v=84'))''')
                        assert page.evaluate('typeof window.MarbleDevices?.setSwingMagnetContact === "function"'), errors
                        assert page.evaluate('window.marbleBuilderReady === true'), errors
                        assert page.locator('#gameStartupError').is_hidden(), errors
                        original = page.evaluate('''() => ({stages:localStorage.getItem('marble-builder-stages-v1'),
                          creations:localStorage.getItem('marble-builder-creations-v1')})''')
                        if page.evaluate("window.__marbleBuilderDebug.getState().appMode") == 'free':
                            page.locator('#homeButton').click()
                        target = page.locator(selector)
                        if mobile:
                            target.tap(timeout=5000)
                        else:
                            target.click(timeout=5000)
                        if selector == '#freeModeButton':
                            assert page.evaluate('window.__marbleBuilderDebug?.getState().appMode') == 'free', errors
                            page.locator('#spawnButton').click()
                            assert page.evaluate('window.__marbleBuilderDebug.getState().activeBalls.length') > 0
                        else:
                            assert page.locator('#stageList .stage-item').count() > 0, errors
                            play = page.locator('#stageList .stage-play:not([disabled])').first
                            if mobile:
                                play.tap()
                            else:
                                play.click()
                            assert page.evaluate('window.__marbleBuilderDebug.getState().appMode') == 'stage', errors
                        if saved:
                            assert page.evaluate('''() => ({stages:localStorage.getItem('marble-builder-stages-v1'),
                              creations:localStorage.getItem('marble-builder-creations-v1')})''') == original
                        print(name, 'phone' if mobile else 'desktop', 'missing-observer' if missing_observer else 'normal',
                              'missing-replaceChildren' if missing_replace_children else 'normal-dom',
                              'saved' if saved else 'fresh', selector, 'OK', flush=True)
                    assert not errors, errors
                finally:
                    context.close()
            if name == 'chromium':
                context = browser.new_context()
                try:
                    page = context.new_page()
                    page.route('**/marble-builder/game.js?v=84', lambda route: route.abort())
                    page.goto(URL, wait_until='networkidle')
                    page.locator('#gameStartupError:visible').wait_for(timeout=5000)
                    assert '파일 불러오기' in page.locator('#gameStartupError').inner_text()
                    print('missing game script reports startup error', flush=True)
                finally:
                    context.close()
                context = browser.new_context()
                try:
                    page = context.new_page()
                    page.route('**/marble-builder/devices.js?v=15', lambda route: route.fulfill(
                        status=200, content_type='text/javascript', body='window.MarbleDevices = {};'))
                    page.goto(URL, wait_until='networkidle')
                    page.locator('#gameStartupError:visible').wait_for(timeout=5000)
                    assert '장치 파일이 준비되지 않음' in page.locator('#gameStartupError').inner_text()
                    print('old device script reports exact dependency failure', flush=True)
                finally:
                    context.close()
        finally:
            browser.close()
