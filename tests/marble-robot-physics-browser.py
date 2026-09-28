"""Robot hose acceptance: visible settings, unbounded feeds, gravity, contact, and marble support."""
import os
from playwright.sync_api import sync_playwright

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
URL = os.getenv('MARBLE_URL', 'http://127.0.0.1:8765/marble-builder/')
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=CHROME)
    for width, height in ((1280, 800), (390, 844)):
        page = browser.new_page(viewport={'width':width,'height':height}, has_touch=width<500)
        errors=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL,wait_until='networkidle')
        page.locator('#freeModeButton').click()
        page.locator('#toolList .more-card').click()
        page.locator('#blockCatalogGrid .catalog-item').filter(has_text='버튼+로봇 팔').get_by_text('설정').click()
        assert page.locator('#robotHoldLabel').is_visible()
        page.locator('#robotHoldSeconds').fill('1.2')
        page.locator('#deviceSettingsForm button[type=submit]').click()
        result = page.evaluate('''() => {
          const d=window.__marbleBuilderDebug,dev=window.MarbleDevices;
          const wood=d.addRod('wood',180,310,{length:110,thickness:20});
          const anchor=dev.snap(d.getState().rods,{x:180,y:300});
          const robot=d.addRod('robotArm',380,320,{buttonAnchor:anchor,force:9,holdSeconds:1.2});
          const path=dev.robotPath(robot,[wood,robot],d.getState().activeGravity,100,900);
          const noTarget=d.spawnBall(),noBalls=d.getState().activeBalls.length;
          const targetPoint=path.points[Math.min(8,path.points.length-1)];
          const target=d.addRod('wood',targetPoint.x,targetPoint.y,{length:80,thickness:32});
          const yesTarget=d.spawnBall();
          const button=dev.button([wood,robot,target],robot);
          d.setBallState({x:button.x+button.nx*16,y:button.y+button.ny*16,vx:0,vy:0});
          let max=0, grabbed=false, minLinks=Infinity, maxLinks=0, hold=0, tipY=0;
          let tautError=Infinity,handAlignment=0;
          const samples=[];
          for(let i=0;i<340;i++) {
            d.stepPhysics();const s=dev.state(robot);
            if(i%20===0) samples.push({i,phase:s.phase,x:s.links?.at(-1).x,y:s.links?.at(-1).y,length:s.travel});
            max=Math.max(max,s.travel);maxLinks=Math.max(maxLinks,s.links?.length||0);
            if(s.links) minLinks=Math.min(minLinks,s.links.length);
            if(s.grabbed===target) {
              grabbed=true;hold+=1/120;
              if(i>65 && s.links?.length>2) {
                const tip=s.links.at(-1),before=s.links.at(-2);
                const base={x:robot.x+robot.length/2,y:robot.y};
                tautError=Math.min(tautError,Math.abs(s.travel-Math.hypot(tip.x-base.x,tip.y-base.y)));
                const n=s.handNormal,along=(before.x-tip.x)*n.x+(before.y-tip.y)*n.y;
                handAlignment=Math.max(handAlignment,along/(Math.hypot(before.x-tip.x,before.y-tip.y)||1));
              }
            }
            if(s.links?.length) tipY=s.links.at(-1).y;
          }
          const chosen=d.getState().rods.find(r=>r.uid===robot.uid);
          return {noTarget,noBalls,yesTarget,max,minLinks,maxLinks,grabbed,hold,tipY,tautError,handAlignment,samples,target:{x:target.x,y:target.y},
            pathHit:dev.robotPath(robot,[wood,robot,target],19.35,100,900).hit,
            configured:robot.holdSeconds,phase:dev.state(robot).phase};
        }''')
        print('TRACE',width,result)
        # A launch is no longer blocked merely because the hose passes the old map boundary.
        assert result['noTarget'] is True and result['noBalls']==1,result
        assert result['yesTarget'] is True and result['pathHit'],result
        assert result['configured']==1.2 and result['maxLinks']>12,result
        assert result['grabbed'] and result['tautError']<.1 and result['handAlignment']>.99,result
        assert not errors,errors
        page.close()
    browser.close()
