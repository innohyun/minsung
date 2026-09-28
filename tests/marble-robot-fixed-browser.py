"""Desktop and touch regression: remote robot button, hose, and one-shot fixed ball."""
import os
from playwright.sync_api import sync_playwright

URL = os.getenv('MARBLE_URL', 'http://127.0.0.1:8765/marble-builder/')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME)
    for width, height in [(1280, 800), (390, 844)]:
        page = browser.new_page(viewport={'width': width, 'height': height}, has_touch=width < 500)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        responses = []
        page.on('response', lambda response: responses.append((response.status, response.url)) if '/robot-arm/' in response.url else None)
        page.goto(URL, wait_until='networkidle')
        page.locator('#freeModeButton').click()
        page.locator('#toolList .more-card').click()
        assert page.locator('#blockCatalogGrid').get_by_text('버튼+로봇 팔').count() == 1
        assert page.locator('#blockCatalogGrid').get_by_text('고정 구슬').count() == 1
        page.locator('#blockCatalogGrid .catalog-item').filter(has_text='버튼+로봇 팔').get_by_text('설정').click()
        page.locator('#deviceForce').fill('9')
        page.locator('#deviceSettingsForm button[type=submit]').click()
        setup = page.evaluate('''() => {
          const d=window.__marbleBuilderDebug;
          const wood=d.addRod('wood',200,310,{length:120,thickness:20});
          const snap=window.MarbleDevices.snap(d.getState().rods,{x:200,y:300});
          const rod=d.addRod('robotArm',380,330,{buttonAnchor:snap,force:9});
          d.addRod('wood',596,466,{length:80,thickness:32});
          return {wood:wood?.uid,anchor:snap,robot:rod?.uid,
            illegal:d.addRod('fixedBall',380,330),images:Object.fromEntries(Object.entries(window.MarbleDevices.images).map(([k,v])=>[k,v.complete&&v.naturalWidth>0]))};
        }''')
        assert setup['wood'] and setup['robot'] and setup['anchor']['woodUid'] == setup['wood'], setup
        assert setup['illegal'] is None, 'fixed ball must not overlap device'
        assert all(setup['images'].values()), setup['images']
        run = page.evaluate('''(uid) => {
          const d=window.__marbleBuilderDebug,dev=window.MarbleDevices;
          const r=d.getRodByUid(uid), b=dev.button(d.getState().rods,r);
          d.setBallState({x:b.x+b.nx*16,y:b.y+b.ny*16,vx:0,vy:0});
          let max=0;
          for(let i=0;i<80;i++) {d.stepPhysics();max=Math.max(max,dev.state(r).travel);}
          const state=dev.state(r);
          return {max,depth:state.depth,links:state.links?.length,
            base:state.links?.[0],first:{x:r.x+r.length/2,y:r.y},phase:state.phase};
        }''', setup['robot'])
        assert run['max'] > 105 and run['links'] > 12 and run['depth'] > 0, run
        if width == 1280:
            page.screenshot(path='tests/robot-arm-preview.png')
        assert abs(run['base']['x'] - run['first']['x']) < .001, run
        grip = page.evaluate('''uid => {
          const d=window.__marbleBuilderDebug, dev=window.MarbleDevices;
          const rod=d.getRodByUid(uid), wood=d.getRodByUid(rod.buttonAnchor.woodUid);
          const b=dev.button([wood,rod],rod);
          const press={x:b.x+b.nx*16,y:b.y+b.ny*16,radius:18,mass:.18,vx:0,vy:0,omega:0};
          const marble={x:rod.x+rod.length/2+45,y:rod.y,radius:18,mass:.18,vx:0,vy:0,omega:0};
          dev.reset();rod.holdSeconds=.25;
          let attached=false, released=false;
          for(let i=0;i<130;i++) {
            dev.tick([wood,rod],[press,marble],1/120,100,null,[],19.35,900);
            attached ||= dev.state(rod).grabbed===marble;
            released ||= attached && dev.state(rod).phase==='back';
          }
          return {attached,released,x:marble.x,phase:dev.state(rod).phase};
        }''', setup['robot'])
        assert grip['attached'] and grip['released'], grip
        bead = page.evaluate('''() => {
          const d=window.__marbleBuilderDebug;
          d.resetGame();d.clearAll();
          const bead=d.addRod('fixedBall',440,320);
          const refused=d.addRod('wood',440,320,{length:90});
          const nearby=d.addRod('wood',440,400,{length:90});
          d.stepPhysics(40);
          const before=d.getState();
          const regular=d.setBallState({x:440-37,y:320,vx:2,vy:0});
          d.stepPhysics(3);
          const touched=d.getState();
          d.stepPhysics(20);
          const after=d.getState();
          d.resetGame();
          const reset=d.getState();
          return {uid:bead?.uid,refused:!!refused,nearby:!!nearby,
            before:before.activeBalls.length,activated:touched.activatedFixedBalls,
            sourceBalls:after.activeBalls.filter(b=>b.fixedSourceUid===bead.uid),
            resetActivated:reset.activatedFixedBalls.length,resetBalls:reset.activeBalls.length};
        }''')
        assert bead['uid'] and not bead['refused'] and bead['nearby'], bead
        assert bead['before'] == 0 and bead['activated'] == [bead['uid']], bead
        assert len(bead['sourceBalls']) == 1 and bead['sourceBalls'][0]['vy'] > 0, bead
        assert bead['resetActivated'] == bead['resetBalls'] == 0, bead
        saved = page.evaluate('''() => {
          const d=window.__marbleBuilderDebug;
          const bead=d.getState().rods.find(r=>r.type==='fixedBall');
          d.saveCreation('로봇과 구슬 확인');
          const id=d.getState().activeCreationId;
          d.clearAll();d.loadCreation(id);
          return {types:d.getState().rods.map(r=>r.type),activated:d.getState().activatedFixedBalls};
        }''')
        assert 'fixedBall' in saved['types'] and not saved['activated'], saved
        assert not errors, errors
        assert all(code == 200 for code, _ in responses), responses
        page.close()
        print(f'PASS {width}x{height}: robot button/hose, fixed bead, collision, reset, save/load, assets')
    browser.close()
