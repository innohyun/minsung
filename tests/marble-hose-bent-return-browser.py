"""Bent hose retracts on its own route; swept marbles cannot pass its body."""
import os
from playwright.sync_api import sync_playwright

URL = os.getenv('MARBLE_URL', 'http://127.0.0.1:18765/marble-builder/')
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width in (1280, 390):
        page = browser.new_page(viewport={'width': width, 'height': 844}, has_touch=width < 500)
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL, wait_until='networkidle')
        result = page.evaluate('''() => {
          const d=window.MarbleDevices,arm={type:'robotArm',uid:'bent-arm',x:100,y:200,length:80,thickness:40,
            angle:0,reelSpeed:1.9,force:7,holdSeconds:1};
          const base=d.muzzle(arm),st=d.state(arm),block={type:'wood',uid:'held-wood',x:460,y:200,
            length:36,thickness:20,angle:0};
          const barrier={type:'wood',uid:'barrier',x:290,y:200,length:50,thickness:70,angle:0};
          st.phase='hold';st.grabbed=block;st.grabPoint={x:-18,y:0};
          st.head={x:442,y:200};st.links=[{...base},{x:442,y:200}];
          st.travel=500;st.lastGripDistance=302;st.hold=1/120;
          d.tick([arm,block,barrier],[],1/120,100,null,[],19.35,1200);
          const start=st.links.map(p=>({...p}));
          const initialLength=st.travel;
          let maxJump=0,turnSeen=false,previous={...st.head};
          for(let i=0;i<130;i++) {
            d.tick([arm,block,barrier],[],1/120,100,null,[],19.35,1200);
            maxJump=Math.max(maxJump,Math.hypot(st.head.x-previous.x,st.head.y-previous.y));
            previous={...st.head};
            if(st.links.some(p=>Math.abs(p.y-200)>40)) turnSeen=true;
          }
          // Separate shot through the straight mid-span, across its entire thickness.
          d.reset();const straight=d.state(arm);
          straight.phase='back';straight.travel=240;
          straight.links=[{x:140,y:200},{x:380,y:200}];
          const fast={x:270,y:245,radius:10,mass:.18,vx:0,vy:-30};
          d.resolveBall([arm],fast,{x:270,y:155});
          const bottom={x:270,y:245,radius:10,mass:.18,vx:0,vy:30};
          d.resolveBall([arm],bottom,{x:270,y:155});
          d.reset();const held=d.state(arm),marble={x:460,y:200,radius:18,mass:.18,vx:0,vy:0};
          held.phase='hold';held.grabbed=marble;held.grabPoint={x:-18,y:0};
          held.head={x:442,y:200};held.travel=317;held.lastGripDistance=317;held.hold=3;
          let maxPullStep=0,minClearance=Infinity,prev={x:marble.x,y:marble.y};
          for(let i=0;i<240;i++) {
            d.tick([arm,barrier],[marble],1/120,100,null,[],19.35,1200);
            maxPullStep=Math.max(maxPullStep,Math.hypot(marble.x-prev.x,marble.y-prev.y));
            prev={x:marble.x,y:marble.y};
            const dx=Math.max(0,Math.abs(marble.x-barrier.x)-barrier.length/2);
            const dy=Math.max(0,Math.abs(marble.y-barrier.y)-barrier.thickness/2);
            minClearance=Math.min(minClearance,Math.hypot(dx,dy));
          }
          return {start,initialLength,remaining:st.travel,phase:st.phase,turnSeen,maxJump,
            sweptTop:fast.y,sweptBottom:bottom.y,maxPullStep,minClearance,marbleX:marble.x};
        }''')
        print(width, result, flush=True)
        assert any(abs(p['y']-200)>40 for p in result['start']) and result['initialLength'] > 310, result
        assert result['turnSeen'] and result['maxJump'] < 3 and result['remaining'] < result['initialLength'] and result['phase'] == 'back', result
        assert result['sweptTop'] < 190 and result['sweptBottom'] < 190, result
        assert result['maxPullStep'] < 3 and result['minClearance'] >= 17.5 and result['marbleX'] < 270, result
        assert not errors, errors
        page.close()
    browser.close()
