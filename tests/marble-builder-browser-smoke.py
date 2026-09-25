"""Browser regression for Marble Builder; run from repository root with python3."""
from pathlib import Path
import math
from playwright.sync_api import sync_playwright

url = (Path(__file__).resolve().parents[1] / 'marble-builder' / 'index.html').as_uri()
with sync_playwright() as playwright:
    chrome = Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    browser = playwright.chromium.launch(headless=True, **({'executable_path': str(chrome)} if chrome.exists() else {}))
    for width, height in [(1280, 800), (390, 844)]:
        page = browser.new_page(viewport={'width': width, 'height': height})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url)
        page.wait_for_load_state('load')
        state = page.evaluate('window.__marbleBuilderDebug.getState()')
        assert state['activeGravity'] == 19.35 and state['activeWoodFriction'] == 0.2, state
        assert page.evaluate("window.__marbleBuilderDebug.getImpactRestitution('wood', 3)") == 0.11
        legacy = page.evaluate("""() => {
            const d = window.__marbleBuilderDebug;
            return [d.normalizeStage({id: 'old', fixedBlocks: [{type:'wood', thickness:14}, {type:'slime', thickness:18}, {type:'wood', thickness:30}]}).fixedBlocks.map(r => r.thickness)];
        }""")
        assert legacy == [[20, 20, 30]], legacy
        page.evaluate("window.__marbleBuilderDebug.startFreeMode()")
        thicknesses = page.evaluate("""() => {
            const d = window.__marbleBuilderDebug;
            d.addRod('wood', 200, 350);
            d.addRod('slime', 410, 350);
            d.addRod('electric', 620, 350);
            return d.getState().rods.map(rod => rod.thickness);
        }""")
        assert thicknesses == [20, 20, 20], thicknesses
        stage = {
            'id': 'test-stage', 'number': 5, 'spawn': {'x': 200, 'y': 160},
            'fixedBlocks': [
                {'uid': 'a', 'type': 'electric', 'x': 200, 'y': 300, 'length': 180, 'thickness': 20, 'angle': 0},
                {'uid': 'b', 'type': 'electric', 'x': 380, 'y': 300, 'length': 180, 'thickness': 20, 'angle': 0},
            ],
            'supplyBlocks': [], 'goals': [{'x': 650, 'y': 400, 'width': 126, 'height': 84, 'thickness': 11}],
            'electricLinks': [{'id': 'ab', 'a': {'rodUid': 'a', 'end': 'end', 'side': 'top'},
                               'b': {'rodUid': 'b', 'end': 'start', 'side': 'top'}}]
        }
        page.evaluate('(stage) => window.__marbleBuilderDebug.startEditor(stage)', stage)
        assert page.locator('#spawnButton').is_visible(), 'editor spawn control hidden'
        page.locator('#spawnButton').click()
        initial = page.evaluate('window.__marbleBuilderDebug.getState()')
        assert initial['ball'] is not None and initial['appMode'] == 'editor'
        # A ball at a real joined corner should keep moving to the next road.
        result = page.evaluate("""() => {
            const d = window.__marbleBuilderDebug;
            d.setBallState({electricRide: {rodUid: 'a', side: 'top', direction: 1, speed: 4, distance: 178}});
            const before = d.getState().ball;
            d.stepPhysics(12);
            return {before, after: d.getState().ball, won: d.getState().won};
        }""")
        assert result['after']['electricRide']['rodUid'] == 'b', result
        assert result['after']['electricRide']['direction'] == 1, result
        assert result['after']['x'] > result['before']['x'] and not result['won'], result
        for angle in (0, -0.7853981634, -1.5707963268):
            stage['fixedBlocks'][1]['angle'] = angle
            stage['fixedBlocks'][1]['x'] = 290 + 90 * math.cos(angle) - 10 * math.sin(angle)
            stage['fixedBlocks'][1]['y'] = 290 + 90 * math.sin(angle) + 10 * math.cos(angle)
            page.evaluate('(stage) => window.__marbleBuilderDebug.startEditor(stage)', stage)
            page.evaluate('''() => {
                const d = window.__marbleBuilderDebug;
                d.setBallState({electricRide: {rodUid: 'a', side: 'top', direction: 1, speed: 4, distance: 178}});
                d.stepPhysics(6);
            }''')
            forward = page.evaluate('window.__marbleBuilderDebug.getState().ball.electricRide')
            assert forward and forward['rodUid'] == 'b' and forward['direction'] == 1 and forward['distance'] > 0, (angle, forward)
            page.evaluate('''() => {
                const d = window.__marbleBuilderDebug;
                d.setBallState({electricRide: {rodUid: 'b', side: 'top', direction: -1, speed: 4, distance: 2}});
                d.stepPhysics(6);
            }''')
            backward = page.evaluate('window.__marbleBuilderDebug.getState().ball.electricRide')
            assert backward and backward['rodUid'] == 'a' and backward['direction'] == -1, (angle, backward)
        page.evaluate('window.__marbleBuilderDebug.saveEditedStage()')
        saved = page.evaluate("window.__marbleBuilderDebug.getState().stages.find(s => s.id === 'test-stage')")
        assert saved and 'ball' not in saved, saved
        # Closely placed but unlinked roads must not flip travel direction at the seam.
        unlinked = {**stage, 'electricLinks': [], 'fixedBlocks': [
            {**stage['fixedBlocks'][0], 'angle': 0},
            {**stage['fixedBlocks'][1], 'x': 380, 'y': 300, 'angle': 0}
        ]}
        for angle in (0, -0.7853981634):
            unlinked['fixedBlocks'][1]['angle'] = angle
            unlinked['fixedBlocks'][1]['x'] = 290 + 90 * math.cos(angle) - 10 * math.sin(angle)
            unlinked['fixedBlocks'][1]['y'] = 290 + 90 * math.sin(angle) + 10 * math.cos(angle)
            page.evaluate('(stage) => window.__marbleBuilderDebug.startEditor(stage)', unlinked)
            seam = page.evaluate('''() => {
                const d = window.__marbleBuilderDebug;
                d.setBallState({electricRide: {rodUid: 'a', side: 'top', direction: 1, speed: 4, distance: 178}});
                const positions = [];
                for (let i = 0; i < 24; i++) {
                    d.stepPhysics(1);
                    positions.push({x: d.getState().ball.x, vx: d.getState().ball.vx});
                }
                return positions;
            }''')
            assert all(step['vx'] >= 0 for step in seam), (angle, seam)
        page.evaluate('(stage) => window.__marbleBuilderDebug.startEditor(stage)', unlinked)
        natural = page.evaluate('''() => {
            const d = window.__marbleBuilderDebug;
            d.setBallState({x: 155, y: 271, vx: 4, vy: 0.4, omega: 0, electricRide: null});
            const samples = [];
            for (let i = 0; i < 85; i++) {
                d.stepPhysics(1);
                if (i % 10 === 0) samples.push(d.getState().ball);
            }
            return samples;
        }''')
        assert any(s['electricRide'] for s in natural), natural
        assert all(s['vx'] >= 0 for s in natural), natural
        assert not errors, errors
        print(f'PASS {width}x{height}: default physics, equal block thickness, editor spawn/save, electric joint')
        page.close()
    browser.close()
