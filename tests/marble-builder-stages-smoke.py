"""Browser regressions for stage starting inventory, renumbering, and hold-to-reorder."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

url = os.environ.get('MARBLE_BUILDER_URL', (Path(__file__).resolve().parents[1] / 'marble-builder' / 'index.html').as_uri())
base = [dict(id=f'custom-{i}', number=i, name=f'{i}스테이지',
             spawn={'x': 170, 'y': 145},
             fixedBlocks=[dict(uid=f'{i}-{j}', type='wood', x=180+j*170, y=300, angle=0, length=180)
                          for j in range(4)] if i == 1 else [],
             supplyBlocks=[], goals=[{'x':800,'y':550,'width':126,'height':84,'thickness':11}])
        for i in range(1, 5)]

with sync_playwright() as playwright:
    chrome = Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    browser = playwright.chromium.launch(headless=True, **({'executable_path': str(chrome)} if chrome.exists() else {}))
    for width, height in [(1280, 800), (390, 844)]:
        page = browser.new_page(viewport={'width': width, 'height': height})
        page.add_init_script('''(() => {
            if (!localStorage.getItem('marble-builder-stages-v1')) {
                localStorage.setItem('marble-builder-stages-v1', JSON.stringify(STAGE_DATA));
                localStorage.setItem('marble-builder-progress-v1','1');
                localStorage.setItem('marble-builder-developer-v1','true');
            }
        })();'''.replace('STAGE_DATA', json.dumps(base)))
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url)
        page.wait_for_load_state('networkidle')
        state = page.evaluate('''() => {
            const d = window.__marbleBuilderDebug;
            d.loadStage('custom-1');
            const play = d.getState();
            const cards = document.querySelectorAll('#toolList .tool-card[data-supply-id]').length;
            d.addRod('wood', 260, 360, {fixed:true, supplyId:play.supplies[0].supplyId});
            const placed = d.getState();
            d.startEditor(d.getState().stages.find(s => s.id === 'custom-1'));
            const author = d.getState();
            d.showStageList();
            return {initialFixed:play.rods.filter(r=>r.fixed).length, initialRods:play.rodCount,
                supplies:play.supplies.length, cards, afterPlace:placed.rods.filter(r=>r.fixed).length,
                remaining:placed.supplies.filter(s=>!s.used).length,
                authorFixed:author.rods.filter(r=>r.fixed).length};
        }''')
        assert state == {'initialFixed':0, 'initialRods':0, 'supplies':4, 'cards':4,
                         'afterPlace':1, 'remaining':3, 'authorFixed':4}, state
        # Hold the first card then drop after the second (between old stages 2 and 3).
        first = page.locator('[data-stage-id="custom-1"]')
        second = page.locator('[data-stage-id="custom-2"]')
        first.scroll_into_view_if_needed()
        start = first.bounding_box()
        target = second.bounding_box()
        destination = {'x': target['x']+target['width']*.8, 'y': target['y']+target['height']*.5}
        if width < 500:
            session = page.context.new_cdp_session(page)
            session.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':[
                {'x':start['x']+25,'y':start['y']+50,'id':1}]})
            page.wait_for_timeout(520)
            assert 'reordering' in first.get_attribute('class'), 'touch hold did not arm'
            session.send('Input.dispatchTouchEvent', {'type':'touchMove', 'touchPoints':[
                {'x':destination['x'],'y':destination['y'],'id':1}]})
            session.send('Input.dispatchTouchEvent', {'type':'touchEnd', 'touchPoints':[]})
        else:
            page.mouse.move(start['x']+25, start['y']+50)
            page.mouse.down()
            page.wait_for_timeout(520)
            assert 'reordering' in first.get_attribute('class'), 'long press did not arm'
            page.mouse.move(destination['x'], destination['y'], steps=8)
            page.mouse.up()
        order = page.evaluate('''() => window.__marbleBuilderDebug.getState().stages
            .sort((a,b)=>a.number-b.number).map(s=>[s.id,s.number])''')
        assert order == [['custom-2',1],['custom-1',2],['custom-3',3],['custom-4',4]], order
        # Removing the new stage 1 makes the former stage 2 the new stage 1, not an orphaned 2.
        page.locator('[data-stage-id="custom-2"] .delete-stage').click()
        page.locator('#confirmDeleteStageButton').click()
        after = page.evaluate('''() => ({stages:window.__marbleBuilderDebug.getState().stages
            .sort((a,b)=>a.number-b.number).map(s=>[s.id,s.number]),
            stored:JSON.parse(localStorage.getItem('marble-builder-stages-v1')).length})''')
        assert after == {'stages':[['custom-1',1],['custom-3',2],['custom-4',3]], 'stored':3}, after
        page.reload()
        page.wait_for_load_state('networkidle')
        persisted = page.evaluate('''() => window.__marbleBuilderDebug.getState().stages
            .sort((a,b)=>a.number-b.number).map(s=>[s.id,s.number])''')
        assert persisted == after['stages'], persisted
        assert not errors, errors
        print(f'PASS {width}x{height}: 0 initial fixed, 4 usable inventory, hold reorder, delete renumber, reload')
        page.close()
    browser.close()
