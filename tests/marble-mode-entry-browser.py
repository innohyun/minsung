"""Fresh public/home mode navigation smoke on desktop and phone touch."""
import os
from playwright.sync_api import sync_playwright
URL=os.getenv('MARBLE_URL','https://minsung.classaimate.com/marble-builder/')
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=CHROME)
    for mobile,damaged in ((False,False),(True,False),(False,True),(True,True)):
        context=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844},is_mobile=mobile,has_touch=mobile)
        if damaged:
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
            scripts:[...document.scripts].map(x=>x.getAttribute('src')).filter(Boolean)})''')
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
                play=page.locator('#stageList .stage-play:not([disabled])').first
                if mobile:
                    play.tap()
                else:
                    play.click()
                assert page.evaluate('window.__marbleBuilderDebug.getState().appMode')=='stage',errors
            results.append(page.evaluate('''() => ({home:!document.getElementById('homeScreen').hidden,
               screen:[...document.querySelectorAll('.menu-screen')].filter(x=>!x.hidden).map(x=>x.id),
               playing:document.body.className})'''))
        print('mobile' if mobile else 'desktop','damaged' if damaged else 'fresh',
              'HTTP',response.status,'before',before,'after',results,'errors',errors,flush=True)
        assert not errors and not results[0]['home'] and not results[1]['home'],(results,errors)
        context.close()
    browser.close()
