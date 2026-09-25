"""Real browser regression for inner electric corners, signed angles, and straight-mode play."""
import math
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

url = os.environ.get('MARBLE_BUILDER_URL', (Path(__file__).resolve().parents[1] / 'marble-builder' / 'index.html').as_uri())

with sync_playwright() as playwright:
    chrome = Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    browser = playwright.chromium.launch(headless=True, **({'executable_path': str(chrome)} if chrome.exists() else {}))
    for width, height in [(1280, 800), (390, 844)]:
        page = browser.new_page(viewport={'width': width, 'height': height})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url)
        page.wait_for_load_state('networkidle')
        assert page.locator('#curveElectricButton').count() == 0
        assert page.locator('#convertElectricButton').count() == 1
        for turn, expected in [(0, 'top'), (.4, 'bottom'), (-.4, 'top'), (.785398, 'bottom'),
                               (.9, None), (-.9, None)]:
            page.evaluate('window.__marbleBuilderDebug.startFreeMode()')
            # Place matching *inner* corners within connection reach.
            side = 'bottom' if turn > 0 else 'top'
            joint_y = 350 if side == 'bottom' else 330
            b_x = 350 + 90 * math.cos(turn) + (10 if side == 'bottom' else -10) * math.sin(turn)
            b_y = joint_y + 90 * math.sin(turn) - (10 if side == 'bottom' else -10) * math.cos(turn)
            result = page.evaluate('''([x, y, angle]) => {
                const d = window.__marbleBuilderDebug;
                d.addRod('electric', 260, 340, {uid:'a'});
                d.addRod('electric', x, y, {uid:'b', angle});
                d.selectRod(0);
                const candidate = d.findElectricConnectionCandidate();
                if (candidate) d.combineSelectedElectric();
                return {candidate: candidate && {side:candidate.side, otherSide:candidate.otherSide},
                    links:d.getState().electricLinks, ballAllowed:d.spawnBall()};
            }''', [b_x, b_y, turn])
            assert result['ballAllowed'] is True, result
            if expected is None:
                assert result['candidate'] is None and not result['links'], (turn, result)
            else:
                assert result['candidate'] == {'side': expected, 'otherSide': expected}, (turn, result)
                assert len(result['links']) == 1, (turn, result)
                assert page.evaluate('window.__marbleBuilderDebug.validElectricJoint(window.__marbleBuilderDebug.selectElectricLink(0))')
            if turn == .4:
                if os.environ.get('MARBLE_JOINT_SCREENSHOT'):
                    page.screenshot(path=str(Path(__file__).parent / f'joint-preview-{width}.png'))
                rotation = page.evaluate('''() => {
                    const d = window.__marbleBuilderDebug;
                    const link = d.selectElectricLink(0);
                    const b = d.getState().rods[1];

                    const original = b.angle;
                    const joint = {x:350, y:350};
                    const request = angle => ({x:joint.x + 180 * Math.cos(angle),
                        y:joint.y + 180 * Math.sin(angle)});
                    d.rotateElectricOuterEnd(d.getRodByUid('b'), 'end', request(-.1), 'start', link.b, link);
                    const reversed = d.getState().rods[1].angle;
                    d.rotateElectricOuterEnd(d.getRodByUid('b'), 'end', request(.9), 'start', link.b, link);
                    return {original, reversed, tooSharp:d.getState().rods[1].angle,
                        valid:d.validElectricJoint(link)};
                }''')
                assert abs(rotation['reversed'] - rotation['original']) < .001, rotation
                assert abs(rotation['tooSharp'] - rotation['original']) < .001, rotation
                assert rotation['valid'], rotation
        legacy = page.evaluate('''() => {
            const d = window.__marbleBuilderDebug;
            const rods = [{uid:'a', type:'electric', x:260, y:340, angle:0, length:180},
                {uid:'b', type:'electric', x:350+90*Math.cos(.4)+10*Math.sin(.4),
                    y:350+90*Math.sin(.4)-10*Math.cos(.4), angle:.4, length:180}];
            const link = {id:'old', curved:true, a:{rodUid:'a', end:'end', side:'top'},
                b:{rodUid:'b', end:'start', side:'top'}};
            d.startEditor({id:'legacy', number:9, fixedBlocks:rods, electricLinks:[link],
                spawn:{x:200,y:100}, goals:[], supplyBlocks:[]});
            const outside = d.getState();
            const blocked = d.spawnBall();
            const message = document.getElementById('hint').textContent;
            link.a.side = 'bottom'; link.b.side = 'bottom';
            d.startEditor({id:'legacy', number:9, fixedBlocks:rods, electricLinks:[link],
                spawn:{x:200,y:100}, goals:[], supplyBlocks:[]});
            return {outsideLinks:outside.electricLinks.length, rods:outside.rods.length,
                blocked, message, insideLinks:d.getState().electricLinks.length, canDrop:d.spawnBall()};
        }''')
        assert legacy['outsideLinks'] == 1 and legacy['rods'] == 2 and legacy['blocked'] is False, legacy
        assert '꼭짓점' in legacy['message'] and legacy['insideLinks'] == 1 and legacy['canDrop'], legacy
        converted = page.evaluate('''() => {
            const d = window.__marbleBuilderDebug;
            d.startEditor({id:'convert',number:1,fixedBlocks:[
                {uid:'a',type:'electric',x:260,y:340,angle:0,length:180},
                {uid:'b',type:'electric',x:440,y:340,angle:0,length:180}],
                electricLinks:[{id:'join',a:{rodUid:'a',end:'end',side:'top'},
                    b:{rodUid:'b',end:'start',side:'top'}}],spawn:{x:200,y:100},goals:[],supplyBlocks:[]});
            d.selectRod(0);
            const before = d.getState().rods.map(r=>({x:r.x,y:r.y,angle:r.angle,length:r.length}));
            d.convertSelectedElectricCorner();
            const mismatched = d.getState();
            const blocked = d.spawnBall();
            const message = document.getElementById('hint').textContent;
            d.selectRod(1);
            d.convertSelectedElectricCorner();
            const after = d.getState();
            return {before,after:after.rods.map(r=>({x:r.x,y:r.y,angle:r.angle,length:r.length})),
                sides:mismatched.electricLinks[0],blocked,message,valid:d.validElectricJoint(after.electricLinks[0]),
                drop:d.spawnBall()};
        }''')
        assert converted['before'] == converted['after'], converted
        assert converted['sides']['a']['side'] == 'bottom' and converted['sides']['b']['side'] == 'top', converted
        assert converted['blocked'] is False and '위·아래' in converted['message'], converted
        assert converted['valid'] and converted['drop'], converted
        assert not errors, errors
        print(f'PASS {width}x{height}: 135..180° inner corners, reverse/outer turns rejected, drop allowed')
        page.close()
    browser.close()
