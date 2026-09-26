"""Reproduce actual ledge rocking over every frame rather than only the final fall."""
import os
from playwright.sync_api import sync_playwright

URL = os.environ.get('MARBLE_URL', 'http://127.0.0.1:8765/marble-builder/')
D = 'window.__marbleBuilderDebug'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width, height in ((1280, 800), (390, 844)):
        page = browser.new_page(viewport={'width': width, 'height': height}, has_touch=width < 500)
        page.goto(URL, wait_until='networkidle')
        page.locator('#freeModeButton').click()
        spawn = page.evaluate(f'{D}.getState().spawn')
        x, y = spawn['x'] + 150, spawn['y'] + 240
        for shift in (0, 18, 26, 31, 36, 43):
            for initial_angle in (0, .05, .25, 1.45, 1.5707963267948966):
                if initial_angle > 1 and shift not in (0, 18, 26):
                    continue
                y_offset = 54 if initial_angle > 1 else 21
                page.evaluate(f'{D}.clearAll()')
                page.evaluate(f"{D}.addRod('wood',{x},{y},{{length:65,thickness:20,angle:0}})")
                page.evaluate(f"{D}.addRod('movable',{x+shift},{y-y_offset},{{length:88,thickness:22,angle:{initial_angle}}})")
                rows = page.evaluate(f"(() => {{let d={D},out=[];for(let i=0;i<180;i++){{d.stepPhysics(1);let r=d.getState().rods[1];out.push([i,r.x,r.y,r.angle,r.vx,r.vy,r.omega]);}}return out}})()")
                # Angular reversals with visible angular speed while perched are the rocking-chair symptom.
                perched = [r for r in rows if r[2] < y + 25 and abs(r[1] - x) < 110]
                turns = [(a[0],round(a[3],3),round(a[6],3),round(b[6],3)) for a,b in zip(perched,perched[1:]) if a[6]*b[6] < 0 and min(abs(a[6]),abs(b[6])) > .08]
                excursions = max((abs(r[3]-initial_angle) for r in perched), default=0)
                print(width, shift, initial_angle, 'turns', len(turns), 'examples', turns[:5], 'excursion', round(excursions,2), 'last', [round(v,2) for v in rows[-1][1:]])
                if initial_angle == .05 and shift in (18, 26, 31):
                    assert len([turn for turn in turns if turn[0] > 40]) <= 1, (width, shift, turns)
                if initial_angle == 1.5707963267948966 and shift == 0:
                    assert abs(rows[-1][3] - initial_angle) < .03 and abs(rows[-1][6]) < .03, rows[-5:]
                if width == 390 and (shift, initial_angle) in ((31, .05), (0, 1.5707963267948966)):
                    page.wait_for_timeout(100)
                    page.locator('#gameCanvas').screenshot(path=f'tests/marble-edge-visual-{shift}.png')
        # A balanced rim contact must release immediately when a real ball hits it.
        page.evaluate(f'{D}.clearAll()')
        page.evaluate(f"{D}.addRod('wood',{x},{y},{{length:65,thickness:20,angle:0}})")
        page.evaluate(f"{D}.addRod('movable',{x+31},{y-21},{{length:88,thickness:22,angle:0}})")
        page.evaluate(f'{D}.stepPhysics(45)')
        page.evaluate(f'{D}.spawnBall()')
        page.evaluate(f"{D}.setBallState({{x:{x-44},y:{y-36},vx:9,vy:0}})")
        page.evaluate(f'{D}.stepPhysics(8)')
        hit = page.evaluate(f'{D}.getState().rods[1]')
        assert abs(hit['x']-(x+31)) > 1 or abs(hit['angle']) > .1, hit
        page.close()
    browser.close()
