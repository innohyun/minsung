"""Straight, gravity-free harpoon: every hose link stays on the launched ray."""
import os
from playwright.sync_api import sync_playwright

URL=os.getenv('MARBLE_URL','http://127.0.0.1:8765/marble-builder/')
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width,height in ((1280,800),(390,844)):
        page=browser.new_page(viewport={'width':width,'height':height},has_touch=width<500)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(URL,wait_until='networkidle')
        page.locator('#freeModeButton').click()
        data=page.evaluate('''() => {
          const dev=window.MarbleDevices;
          const mount={type:'wood',uid:'mount',x:80,y:100,length:100,thickness:20,angle:0};
          const arm={type:'robotArm',uid:'straight',x:300,y:300,length:70,thickness:42,
            angle:-.5,force:9,reelSpeed:2,holdSeconds:.6,
            buttonAnchor:{woodUid:'mount',side:'top',offset:0}};
          const base=dev.muzzle(arm),target={type:'wood',uid:'fixed',x:560,y:157,length:70,thickness:24,angle:0};
          const b=dev.button([mount,arm,target],arm),press={x:b.x,y:b.y-16,radius:18,mass:.18,vx:0,vy:0};
          const samples=[],errors=[];
          dev.reset();
          for(let i=0;i<140;i++) {
            dev.tick([mount,arm,target],[press],1/120,100,null,[],50,850);
            const s=dev.state(arm);
            if(s.phase==='out'||s.phase==='hold') {
              const tip=s.links.at(-1),dx=tip.x-base.x,dy=tip.y-base.y,dist=Math.hypot(dx,dy);
              for(const p of s.links) errors.push(Math.abs((p.x-base.x)*dy-(p.y-base.y)*dx)/(dist||1));
              if(i%12===0) samples.push({phase:s.phase,travel:s.travel,x:tip.x,y:tip.y});
            }
          }
          return {samples,maxError:Math.max(0,...errors),fixed:target.x===560,
            path:dev.robotPath(arm,[mount,arm,target],0,100,850).hit};
        }''')
        assert not errors,errors
        assert data['path'] and data['fixed'] and data['maxError']<.001,data
        assert any(x['phase']=='out' for x in data['samples']) and any(x['phase']=='hold' for x in data['samples']),data
        print('PASS straight hose',width,'max offset',data['maxError'])
        page.close()
    browser.close()
