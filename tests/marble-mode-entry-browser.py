"""Fresh public/home mode navigation smoke on desktop and phone touch."""
import os
from playwright.sync_api import sync_playwright
URL=os.getenv('MARBLE_URL','https://minsung.classaimate.com/marble-builder/')
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=CHROME)
    for mobile,damaged in ((False,False),(True,False),(False,True),(True,True),(False,'saved'),(True,'saved'),(False,'legacy'),(True,'legacy')):
        context=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844},is_mobile=mobile,has_touch=mobile)
        if damaged=='saved':
            context.add_init_script("""if (location.pathname.includes('/marble-builder/')) {
                if (localStorage.getItem('marble-builder-stages-v1') === null) localStorage.setItem('marble-builder-stages-v1', JSON.stringify([
                  {id:'stage-1',number:1,fixedBlocks:[],supplyBlocks:[],goals:[]},
                  {id:'custom-recover',number:4,fixedBlocks:[{type:'wood',x:100,y:200,length:120,thickness:20}],supplyBlocks:[],goals:[]} ]));
                if (localStorage.getItem('marble-builder-creations-v1') === null) localStorage.setItem('marble-builder-creations-v1', JSON.stringify([
                  {id:'saved-map',name:'이전 맵',updatedAt:3,rods:[{type:'wood',x:120,y:220,length:90,thickness:20}]}]));
            }""")
        elif damaged=='legacy':
            context.add_init_script("""if (location.pathname.includes('/marble-builder/')) {
                if (localStorage.getItem('marble-builder-stages-v1') === null) localStorage.setItem('marble-builder-stages-v1', JSON.stringify([
                  {id:'stage-1',number:1,rods:[null,{type:'wood',x:100,y:200}]},
                  {id:'legacy-map',number:2,fixedBlocks:[null,{type:'wood',x:200,y:300}],supplyBlocks:[null,{type:'slime',x:300,y:400}]}]));
                if (localStorage.getItem('marble-builder-creations-v1') === null) localStorage.setItem('marble-builder-creations-v1', JSON.stringify([
                  {id:'legacy-creation',name:'예전 작품',rods:[null,{type:'wood',x:120,y:220}],goals:null,fields:null}]));
            }""")
        elif damaged:
            context.add_init_script("""if (location.pathname.includes('/marble-builder/')) {
                localStorage.setItem('marble-builder-stages-v1', JSON.stringify([null]));
                localStorage.setItem('marble-builder-creations-v1', JSON.stringify([null]));
            }""")
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        response=page.goto(URL,wait_until='networkidle')
        before=page.evaluate('''() => ({home:!document.getElementById('homeScreen').hidden,
            free:!document.getElementById('freeModeButton').hidden,
            stage:!document.getElementById('stageModeButton').hidden,
            savedStages:localStorage.getItem('marble-builder-stages-v1'),
            savedCreations:localStorage.getItem('marble-builder-creations-v1'),
            creations:[...document.querySelectorAll('.creation-card strong')].map(x=>x.textContent),
            scripts:[...document.scripts].map(x=>x.getAttribute('src')).filter(Boolean)})''')
        if damaged in ('saved','legacy'):
            assert ('이전 맵' if damaged=='saved' else '예전 작품') in before['creations'],(before,errors)
            assert 'stage-1' in before['savedStages'],before
            open_button=page.locator('.creation-card button').first
            if mobile: open_button.tap()
            else: open_button.click()
            loaded=page.evaluate('window.__marbleBuilderDebug.getState()')
            assert loaded['appMode']=='free' and len(loaded['rods'])==1,loaded['appMode']
        assert 'game.js?v=77' in before['scripts'] and 'devices.js?v=13' in before['scripts'] and 'kinetic.js?v=10' in before['scripts'],before['scripts']
        results=[]
        for selector in ('#freeModeButton','#stageModeButton'):
            page.goto(URL,wait_until='networkidle')
            if mobile:
                page.locator(selector).tap(timeout=5000)
            else:
                page.locator(selector).click(timeout=5000)
            if selector=='#freeModeButton':
                assert page.evaluate('window.__marbleBuilderDebug?.getState().appMode')=='free',errors
                page.locator('#spawnButton').click()
                assert page.evaluate('window.__marbleBuilderDebug.getState().activeBalls.length')>0,errors
            else:
                assert page.locator('#stageList .stage-item').count()>0,errors
                if damaged=='saved':
                    assert page.locator('#stageList .stage-item').count()==1
                    assert 'custom-recover' in page.evaluate("localStorage.getItem('marble-builder-stages-v1')")
                play=page.locator('#stageList .stage-play:not([disabled])').first
                if mobile:
                    play.tap()
                else:
                    play.click()
                assert page.evaluate('window.__marbleBuilderDebug.getState().appMode')=='stage',errors
            results.append(page.evaluate('''() => ({home:!document.getElementById('homeScreen').hidden,
               screen:[...document.querySelectorAll('.menu-screen')].filter(x=>!x.hidden).map(x=>x.id),
               playing:document.body.className})'''))
            if damaged=='saved':
                raw=page.evaluate('''() => ({stages:localStorage.getItem('marble-builder-stages-v1'),
                    creations:localStorage.getItem('marble-builder-creations-v1')})''')
                assert raw['stages']==before['savedStages'] and raw['creations']==before['savedCreations'],raw
        if damaged=='saved':
            page.goto(URL,wait_until='networkidle')
            page.locator('.creation-card button').first.click()
            page.locator('#saveMapButton').click()
            page.locator('#saveCreationForm button[type=submit]').click()
            backup=page.evaluate("localStorage.getItem('marble-builder-creations-v1-recovery-v1')")
            assert backup==before['savedCreations'],(backup,errors)
        print('mobile' if mobile else 'desktop','damaged' if damaged else 'fresh',
              'HTTP',response.status,'maps',before['creations'],'after',results,'errors',errors,flush=True)
        assert not errors and not results[0]['home'] and not results[1]['home'],(results,errors)
        context.close()
    browser.close()
