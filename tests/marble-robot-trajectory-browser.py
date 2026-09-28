"""Dotted flight samples and real hand share one ballistic integrator on desktop and touch."""
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
        result=page.evaluate('''() => {
          const d=window.MarbleDevices;
          const support={type:'wood',uid:'base',x:80,y:130,length:100,thickness:20,angle:0};
          const arm={type:'robotArm',uid:'head-path',x:300,y:300,length:70,thickness:42,angle:0,
            force:9,buttonAnchor:{woodUid:'base',side:'top',offset:0}};
          const button=d.button([support,arm],arm);
          const press={x:button.x,y:button.y-16,radius:18,mass:.18,vx:0,vy:0};
          const path=d.robotPath(arm,[support,arm],19.35,100,900);
          let maxError=0,samples=0,first={};
          d.reset();
          for(let i=0;i<80;i++) {
            d.tick([support,arm],[press],1/120,100,null,[],19.35,900);
            const s=d.state(arm),tip=s.links?.at(-1);
            if(i%6===0 && tip && s.phase==='out') {
              const expected=path.points[1+i/6];
              const error=Math.hypot(tip.x-expected.x,tip.y-expected.y);
              maxError=Math.max(maxError,error);samples++;
              if(i===0) first={tip:{x:tip.x,y:tip.y},expected};
            }
          }
          return {maxError,samples,first,phase:d.state(arm).phase,ballisticPoints:path.points.length};
        }''')
        assert not errors,errors
        assert result['samples']>6 and result['maxError']<.001,result
        print('PASS',width,'preview/hand error',result['maxError'],'samples',result['samples'])
        clearance=page.evaluate('''() => {
          const d=window.MarbleDevices;d.reset();
          const support={type:'wood',uid:'base2',x:80,y:130,length:100,thickness:20,angle:0};
          const arm={type:'robotArm',uid:'hose-wrap',x:300,y:300,length:70,thickness:42,angle:0,force:9,
            buttonAnchor:{woodUid:'base2',side:'top',offset:0}};
          const block={type:'wood',uid:'block',x:460,y:318,length:90,thickness:22,angle:0};
          const b=d.button([support,arm,block],arm),press={x:b.x,y:b.y-16,radius:18,mass:.18,vx:0,vy:0};
          let inside=0,seen=0;
          for(let t=0;t<100;t++) {
            d.tick([support,arm,block],[press],1/120,100,null,[],19.35,900);
            const nodes=d.state(arm).links||[];
            for(const p of nodes.slice(2,-1)) {
              seen++;
              if(Math.abs(p.x-block.x)<block.length/2+3 && Math.abs(p.y-block.y)<block.thickness/2+3) inside++;
            }
          }
          return {inside,seen};
        }''')
        assert clearance['seen']>100 and clearance['inside']==0,clearance
        page.close()
    browser.close()
