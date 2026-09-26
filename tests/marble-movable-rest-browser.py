"""Long-run contact stability for photo-like flat, tipped and sloped supports."""
import os
import math
from playwright.sync_api import sync_playwright

URL = os.environ.get('MARBLE_URL', 'http://127.0.0.1:8765/marble-builder/')
D = 'window.__marbleBuilderDebug'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width, height in ((1280, 800), (390, 844)):
        page = browser.new_page(viewport={'width': width, 'height': height}, has_touch=width < 500)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL, wait_until='networkidle')
        page.locator('#freeModeButton').click()
        spawn = page.evaluate(f'{D}.getState().spawn')
        x, y = spawn['x'] + 150, spawn['y'] + 240
        for label, angle, start_y, floor_angle in (
            ('flat', 0, y - 21.5, 0),
            ('tip', .48, y - 47, 0),
            ('slope', .24, y - 37, .24),
        ):
            page.evaluate(f'{D}.clearAll()')
            page.evaluate(f"{D}.addRod('wood',{x},{y},{{length:420,thickness:20,angle:{floor_angle}}})")
            page.evaluate(f"{D}.addRod('movable',{x},{start_y},{{length:88,thickness:22,angle:{angle}}})")
            snapshots = page.evaluate(f"(() => {{let d={D}, records=[]; for(let i=0;i<480;i++) {{d.stepPhysics(1); if(i%20===0) {{let r=d.getState().rods[1];records.push([i,r.x,r.y,r.angle,r.vx,r.vy,r.omega])}}}} return records}})()")
            print(width, label, 'resting angle/velocity', snapshots[-1][3:])
            settled = snapshots[-6:]
            assert all(abs(row[-1]) < .01 and abs(row[-2]) < .01 for row in settled), (label, settled)
            assert abs(settled[-1][3] - floor_angle) < .01, (label, settled[-1])
            normal = (-math.sin(floor_angle), math.cos(floor_angle))
            gap = (x - settled[-1][1])*normal[0] + (y - settled[-1][2])*normal[1] - 21
            assert abs(gap) < .15, (label, gap)
            if label == 'tip':
                # A freely falling tilted beam must fall first, not right itself in mid-air.
                page.evaluate(f'{D}.clearAll()')
                page.evaluate(f"{D}.addRod('movable',{x},{y-170},{{length:88,thickness:22,angle:.48}})")
                free = page.evaluate(f"(() => {{let d={D};d.stepPhysics(25);return d.getState().rods[0]}})()")
                assert free['y'] > y-150 and abs(free['angle']-.48) < .01, free
            if label == 'flat':
                page.evaluate(f'{D}.spawnBall()')
                page.evaluate(f"{D}.setBallState({{x:{settled[-1][1]-70},y:{settled[-1][2]},vx:8,vy:0}})")
                page.evaluate(f'{D}.stepPhysics(10)')
                struck = page.evaluate(f'{D}.getState().rods[1]')
                assert abs(struck['vx']) > .1 or abs(struck['omega']) > .1, struck
            assert not errors, errors
        # A barely tipped beam on a photographed-style slope must not rock
        # alternately on opposite corners before the sleep threshold is met.
        page.evaluate(f'{D}.clearAll()')
        page.evaluate(f"{D}.addRod('wood',{x},{y},{{length:420,thickness:20,angle:.24}})")
        page.evaluate(f"{D}.addRod('movable',{x},{y-29},{{length:88,thickness:22,angle:.29}})")
        trace = page.evaluate(f"(() => {{let d={D}, rows=[];for(let i=0;i<120;i++){{d.stepPhysics(1);let r=d.getState().rods[1];rows.push([i,r.x,r.y,r.angle,r.omega])}}return rows}})()")
        print(width, 'sloped rocking end:', trace[-1])
        assert max(abs(row[4]) for row in trace[25:]) < .1, trace[25:40]
        assert abs(trace[-1][1] - trace[25][1]) < .15, trace[-1]
        page.evaluate(f'{D}.clearAll()')
        page.evaluate(f"{D}.addRod('wood',{x},{y},{{length:65,thickness:20,angle:0}})")
        page.evaluate(f"{D}.addRod('movable',{x+43},{y-21},{{length:88,thickness:22,angle:0}})")
        edge = page.evaluate(f"(() => {{let d={D},rows=[];for(let i=0;i<180;i++){{d.stepPhysics(1);if(i%20===0){{let r=d.getState().rods[1];rows.push([i,r.x,r.y,r.angle,r.omega])}}}}return rows}})()")
        print(width, 'edge tipping end:', edge[-1])
        assert abs(edge[-1][3]) > .2 or edge[-1][2] > y + 35, edge
        page.close()
    browser.close()
