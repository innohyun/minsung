"""Free-mode timeline and reload recovery, without altering saved creations or stage editor."""
import os
from playwright.sync_api import sync_playwright

url=os.getenv('MARBLE_URL','http://127.0.0.1:18765/marble-builder/')
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width in (390,1280):
        context=browser.new_context(viewport={'width':width,'height':844})
        page=context.new_page()
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(url,wait_until='networkidle')
        initial_stages=page.evaluate("localStorage.getItem('marble-builder-stages-v1')")
        initial_creations=page.evaluate("localStorage.getItem('marble-builder-creations-v1')")
        page.locator('#freeModeButton').click()
        page.evaluate('''() => {
          const d=window.__marbleBuilderDebug;
          d.addRod('wood',455,290,{length:130,thickness:20});
          d.addGoal(720,390);
          d.setZoomAt({x:170,y:140},.75);
        }''')
        page.wait_for_function("""() => {const d=JSON.parse(localStorage.getItem('marble-builder-free-draft-v1')||'null');return d?.world?.rods?.length===1 && d.world.goals.length===1 && d.camera.zoom===.75}""")
        saved=page.evaluate('''() => ({state:window.__marbleBuilderDebug.getState(),
          draft:JSON.parse(localStorage.getItem('marble-builder-free-draft-v1'))})''')
        assert len(saved['draft']['world']['rods'])==1,saved
        assert page.locator('#draftStatus').inner_text()=='자동 저장됨'
        assert page.evaluate("localStorage.getItem('marble-builder-stages-v1')")==initial_stages
        assert page.evaluate("localStorage.getItem('marble-builder-creations-v1')")==initial_creations
        page.reload(wait_until='networkidle')
        restored=page.evaluate('window.__marbleBuilderDebug.getState()')
        assert restored['appMode']=='free' and len(restored['rods'])==1 and len(restored['goals'])==1,restored
        assert abs(restored['camera']['zoom']-.75)<.001,restored['camera']
        page.locator('#spawnButton').click()
        page.wait_for_function("+document.querySelector('#sceneScrubber').max>=10",timeout=20000)
        timeline=page.evaluate('''() => ({max:+document.querySelector('#sceneScrubber').max,
          current:+document.querySelector('#sceneScrubber').value})''')
        assert timeline['max']>=2 and timeline['current']==timeline['max'],timeline
        slider=page.locator('#sceneScrubber').bounding_box()
        timeline_box=page.locator('#sceneTimeline').bounding_box()
        dock_box=page.locator('.tool-dock').bounding_box()
        assert timeline_box['y']+timeline_box['height'] < dock_box['y'],(timeline_box,dock_box)
        page.mouse.move(slider['x']+slider['width']-5,slider['y']+slider['height']/2)
        page.mouse.down()
        page.wait_for_timeout(270)
        page.mouse.move(slider['x']+2,slider['y']+slider['height']/2,steps=5)
        page.mouse.up()
        assert page.locator('#sceneScrubber').input_value()=='0'
        scrubbed=page.evaluate('''() => ({pause:document.querySelector('#pauseButton').textContent,
          scene:window.__marbleBuilderDebug.getSceneTimelineState()})''')
        assert scrubbed['pause']=='계속' and scrubbed['scene']['previewBall'],scrubbed
        assert scrubbed['scene']['previewBall'] and scrubbed['scene']['liveBall'],scrubbed
        assert scrubbed['scene']['frames']>=10 and page.locator('#sceneScrubber').input_value()=='0',scrubbed
        page.locator('#pauseButton').click()
        page.locator('#homeButton').click()
        assert page.locator('#resumeDraftButton').is_visible()
        page.locator('#resumeDraftButton').click()
        assert page.evaluate('window.__marbleBuilderDebug.getState().appMode')=='free'
        page.evaluate('''() => {
          window._originalSetItem=Storage.prototype.setItem;
          Storage.prototype.setItem=function(key,value){
            if(key==='marble-builder-free-draft-v1') throw new DOMException('Storage full','QuotaExceededError');
            return window._originalSetItem.call(this,key,value);
          };
          window.__marbleBuilderDebug.addRod('wood',500,340,{length:70,thickness:20});
        }''')
        page.locator('#homeButton').click()
        assert page.evaluate("window.__marbleBuilderDebug.getState().appMode")=='free'
        assert page.evaluate("window.__marbleBuilderDebug.getState().rodCount")==2
        page.evaluate('() => { Storage.prototype.setItem=window._originalSetItem; }')
        page.locator('#homeButton').click()
        page.locator('#stageModeButton').click()
        page.evaluate("window.__marbleBuilderDebug.startEditor(null,{number:7})")
        assert page.locator('#sceneTimeline').is_hidden()
        assert page.evaluate("localStorage.getItem('marble-builder-stages-v1')")==initial_stages
        assert page.evaluate("localStorage.getItem('marble-builder-creations-v1')")==initial_creations
        assert not errors,errors
        print(width,'free draft, reload, seek, resume; stage untouched',flush=True)
        context.close()
    browser.close()
