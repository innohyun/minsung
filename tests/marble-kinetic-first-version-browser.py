"""The two constrained blocks use their first shipped physics, not later contact patches."""
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
first = subprocess.check_output(
    ['git', 'show', '65d86cb:marble-builder/kinetic.js'], cwd=root, text=True)
url = os.getenv('MARBLE_URL', 'http://127.0.0.1:18765/marble-builder/')
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width in (390, 1280):
        page = browser.new_page(viewport={'width': width, 'height': 844})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url, wait_until='networkidle')
        page.evaluate('window.restoredKinetics=window.MarbleKinetics')
        page.add_script_tag(content=first)
        comparisons = page.evaluate('''() => {
          const make=(index)=>{
            const rotor={type:'rotor',x:300,y:300,pivotX:300,pivotY:300,
              pivotOffset:0,length:160,thickness:20,angle:[0,.2,-.3][index],omega:0};
            const guide={type:'zipline',x:370,y:340,length:64,thickness:60,angle:0,
              path:[{x:370,y:340},{x:370,y:490}],curveBend:24,guideOffset:0,
              pathT:0,pathSpeed:0};
            const ball={x:[350,345,337][index],y:[273,271,280][index],
              radius:18,mass:.18,vx:0,vy:5,omega:0};
            return {rotor,guide,ball};
          };
          const run=(k,index)=>{
            const {rotor,guide,ball}=make(index);
            k.position(rotor);k.position(guide);
            for(let i=0;i<15;i++) {
              k.advance([rotor,guide],1/120,100);
              k.collideBall(rotor,ball,100);
              ball.y+=ball.vy/120*100;
            }
            return [rotor.angle,rotor.omega,guide.pathT,guide.pathSpeed,
              guide.x,guide.y,ball.x,ball.y,ball.vx,ball.vy];
          };
          return [0,1,2].map(i=>({first:run(window.MarbleKinetics,i),
            restored:run(window.restoredKinetics,i)}));
        }''')
        for case in comparisons:
            for expected, actual in zip(case['first'], case['restored']):
                assert abs(expected-actual) < 1e-8, (width, case)
        page.evaluate('window.MarbleKinetics=window.restoredKinetics')
        page.locator('#freeModeButton').click()
        state = page.evaluate('''() => {
          const d=window.__marbleBuilderDebug;
          const rotor=d.addRod('rotor',300,300,{length:160,thickness:20});
          const guide=d.addRod('zipline',370,340,{length:64,thickness:60,
            path:[{x:370,y:340},{x:370,y:490}],curveBend:24});
          if(!rotor||!guide) return {placed:false};
          d.setBallState({x:350,y:273,vx:0,vy:5});
          d.stepPhysics();
          return {placed:true,mode:d.getState().appMode,ball:!!d.getState().ball};
        }''')
        assert state == {'placed': True, 'mode': 'free', 'ball': True}, state
        assert not errors, errors
        print(width, 'three original-physics comparisons and free-mode startup OK', flush=True)
        page.close()
    browser.close()
