"""Six breakable sprites, impact strength, wood-only audio and independent swings."""
import os
from playwright.sync_api import sync_playwright

URL = os.environ.get('MARBLE_URL', 'http://127.0.0.1:8765/marble-builder/')
D = 'window.__marbleBuilderDebug'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, executable_path=CHROME)
    for mobile in (False, True):
        context = browser.new_context(viewport={'width': 390 if mobile else 1280, 'height': 844 if mobile else 900},
                                      is_mobile=mobile, has_touch=mobile)
        context.add_init_script('''(() => {
          const raf = window.requestAnimationFrame.bind(window);
          window.requestAnimationFrame = fn => raf(t => { if (!window.__pausePhysicsRAF) fn(t); });
          const original = CanvasRenderingContext2D.prototype.drawImage;
          window.__damageDraws = [];
          CanvasRenderingContext2D.prototype.drawImage = function(image, ...rest) {
            if (image?.src?.includes('/breakable/six/stage-')) window.__damageDraws.push(image.src);
            return original.call(this, image, ...rest);
          };
        })();''')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL, wait_until='networkidle')
        page.locator('#freeModeButton').click()
        page.evaluate(f'{D}.openBlockCatalog()')
        assert page.locator('#blockCatalogGrid .tool-icon.breakable').count() == 1
        page.locator('#closeCatalogButton').click()
        uid = page.evaluate(f'{D}.addRod("breakable",240,500,{{length:180}})?.uid')
        assert uid
        assert page.evaluate(f'{D}.getState().rods[0].thickness') == 20
        for index, hp in enumerate((100, 99, 80, 60, 40, 20)):
            page.evaluate(f'{D}.getRodByUid({uid!r}).hp = {hp}')
            assert page.evaluate(f'{D}.getState().rods[0].damageStage') == index
            page.wait_for_function('''index => window.__damageDraws.some(url =>
                url.includes(`/breakable/six/stage-${index}.png`))''', arg=index)
        assert page.evaluate('''async () => Promise.all(Array.from({length:6}, (_,i) =>
          fetch(`/assets/marble-builder/breakable/six/stage-${i}.png?v=1`).then(r => r.ok)))''') == [True] * 6
        page.locator('#resetButton').click()
        assert page.evaluate(f'{D}.getState().rods[0].hp') == 100
        page.evaluate(f'{D}.setBallState({{x:240,y:470,vx:0,vy:1.7,mass:1.5,omega:0}})')
        page.evaluate(f'{D}.stepPhysics(12)')
        assert page.evaluate(f'{D}.getState().rods[0].hp') == 0
        page.locator('#resetButton').click()
        assert page.evaluate(f'{D}.getState().rods[0].hp') == 100
        # A second swing's authored angle remains independent and motionless.
        first = page.evaluate(f'{D}.addRod("swing",240,240,{{length:65,angle:.3,fixed:true}})?.uid')
        second = page.evaluate(f'{D}.addRod("swing",650,240,{{length:65,angle:-.4,fixed:true}})?.uid')
        assert first and second
        page.evaluate(f'{D}.getRodByUid({first!r}).startAngle = .7; {D}.getRodByUid({first!r}).angle = .7')
        page.evaluate(f'{D}.setBallState({{x:900,y:-300,vx:0,vy:0}})')
        page.evaluate(f'{D}.stepPhysics(50)')
        swings = page.evaluate(f'{D}.getState().rods.filter(r=>r.type==="swing")')
        assert swings[0]['angle'] == .7 and swings[1]['angle'] == -.4 and not any(s['swingStarted'] for s in swings), swings
        # User gesture loads the original short "탁" samples, not the rejected video impacts.
        page.locator('#spawnButton').click()
        page.wait_for_function(f'{D}.getAudioState().woodImpactCount === 3')
        page.evaluate('window.__pausePhysicsRAF = true')
        page.wait_for_timeout(80)
        assert all(.24 < value < .27 for value in page.evaluate(f'{D}.getAudioState().woodImpactDurations'))
        resources = page.evaluate('performance.getEntriesByType("resource").map(entry=>entry.name)')
        assert all(any(f'/audio/wood-hit-{i}.wav' in url for url in resources) for i in (1, 2, 3)), resources
        assert not any('/audio/wood-hit-video-' in url for url in resources), resources
        page.evaluate(f'{D}.updateRollingSound("floor",3,6)')
        assert not page.evaluate(f'{D}.getAudioState().recordedRollingActive')
        page.evaluate(f'{D}.updateRollingSound("wood",.2,.2)')
        page.wait_for_timeout(150)
        very_slow = page.evaluate(f'{D}.getAudioState()')
        assert 0 < very_slow['recordedRollingGain'] < .002, very_slow
        page.evaluate(f'{D}.updateRollingSound("wood",1,6)')
        page.wait_for_timeout(160)
        quiet = page.evaluate(f'{D}.getAudioState()')
        assert quiet['recordedRollingActive'] and quiet['recordedRollingPlaybackRate'] == 1, quiet
        assert 0 < quiet['recordedRollingGain'] < .009, quiet
        page.evaluate(f'{D}.updateRollingSound("wood",8,60)')
        page.wait_for_timeout(160)
        fast = page.evaluate(f'{D}.getAudioState()')
        assert fast['recordedRollingSourceStarts'] == 1 and fast['recordedRollingPlaybackRate'] == 1, fast
        assert 0 < fast['recordedRollingGain'] < .01, fast
        page.evaluate(f'{D}.updateRollingSound("floor",8,60)')
        assert page.evaluate(f'{D}.getAudioState().recordedRollingPlaybackRate') == 0
        page.wait_for_timeout(350)
        assert page.evaluate(f'{D}.getAudioState().recordedRollingGain') < very_slow['recordedRollingGain']
        page.evaluate(f'{D}.playImpactSound("wood", 2.8)')
        assert page.evaluate(f'{D}.getAudioState().impactSoundCount') > 0
        assert not errors, errors
        print(('mobile' if mobile else 'desktop') + ' PASS six sprites/HP/giant/reset/swings/quiet wood rolling/original wood impacts')
        context.close()
    browser.close()
