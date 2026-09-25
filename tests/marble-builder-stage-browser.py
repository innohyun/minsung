"""Browser regression: saved fixed stage blocks, swap form, editor reset/follow."""
import os
from playwright.sync_api import sync_playwright

URL = os.environ.get('MARBLE_URL', 'http://127.0.0.1:8765/marble-builder/')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
D = 'window.__marbleBuilderDebug'

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=CHROME)
    for mobile in (False, True):
        context = browser.new_context(viewport={'width': 390 if mobile else 1280, 'height': 844 if mobile else 900},
                                      is_mobile=mobile, has_touch=mobile)
        context.add_init_script("localStorage.setItem('marble-builder-developer-v1', 'true')")
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL, wait_until='networkidle')
        page.locator('#stageModeButton').click()
        assert page.locator('#swapStagesButton').is_visible()
        assert page.locator('.stage-move-hint').count() == 0
        initial = page.evaluate(f'{D}.getState().stages[0]')
        page.evaluate(f'{D}.loadStage({initial["id"]!r})')
        state = page.evaluate(f'{D}.getState()')
        assert len(state['rods']) == len(initial['fixedBlocks']), state
        assert len(state['supplies']) == len(initial['supplyBlocks']), state
        assert all(rod['fixed'] for rod in state['rods'])
        page.evaluate(f'{D}.startEditor(null,{{number:3}})')
        assert page.locator('#resetButton').is_visible() and page.locator('#followButton').is_visible()
        page.evaluate(f'{D}.addRod("wood",520,310,{{fixed:true}})')
        page.evaluate(f'{D}.addRod("slime",820,420)')
        page.evaluate(f'{D}.addGoal(1070,600)')
        page.locator('#spawnButton').click()
        assert page.evaluate(f'{D}.getState().ball')
        page.locator('#followButton').click()
        assert page.locator('#followButton').get_attribute('aria-pressed') == 'true'
        page.locator('#resetButton').click()
        state = page.evaluate(f'{D}.getState()')
        assert state['ball'] is None and len(state['rods']) == 2, state
        page.locator('#saveStageButton').click()
        assert page.locator('#stageScreen').is_visible()
        stages = page.evaluate(f'{D}.getState().stages')
        created = next(stage for stage in stages if stage['number'] == 3)
        assert len(created['fixedBlocks']) == 1 and len(created['supplyBlocks']) == 1
        page.locator('#swapStagesButton').click()
        page.locator('#firstStageNumber').fill(str(initial['number']))
        page.locator('#secondStageNumber').fill('3')
        page.locator('#swapStagesForm button[type=submit]').click()
        assert not page.locator('#swapStagesDialog').is_visible()
        stages = page.evaluate(f'{D}.getState().stages')
        assert next(stage for stage in stages if stage['id'] == created['id'])['number'] == initial['number']
        page.evaluate(f'{D}.loadStage({created["id"]!r})')
        state = page.evaluate(f'{D}.getState()')
        assert len(state['rods']) == 1 and len(state['supplies']) == 1 and state['rods'][0]['fixed']
        assert not errors, errors
        context.close()
        print('mobile' if mobile else 'desktop', 'PASS stage fixed/swap/editor reset/follow')
    browser.close()
