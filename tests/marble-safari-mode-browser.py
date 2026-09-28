"""Safeguard Safari mode entry when ResizeObserver is unavailable.

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
            for mobile, missing_observer, saved in (
                (True, False, False), (False, False, False),
                (True, True, False), (False, True, False),
                (True, True, True), (False, True, True),
            ):
                context = browser.new_context(viewport={'width': 390 if mobile else 1280, 'height': 844},
                                              is_mobile=mobile, has_touch=mobile)
                if missing_observer:
                    context.add_init_script('window.ResizeObserver = undefined')
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
                        original = page.evaluate('''() => ({stages:localStorage.getItem('marble-builder-stages-v1'),
                          creations:localStorage.getItem('marble-builder-creations-v1')})''')
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
                              'saved' if saved else 'fresh', selector, 'OK', flush=True)
                    assert not errors, errors
                finally:
                    context.close()
        finally:
            browser.close()
