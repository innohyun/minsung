"""Regression: infinite robot flight/aim, wood-angle hose friction, timed release."""
import os
from playwright.sync_api import sync_playwright

URL = os.getenv('MARBLE_URL', 'http://127.0.0.1:18765/marble-builder/')
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width in (390, 1280):
        page = browser.new_page(viewport={'width': width, 'height': 844}, has_touch=width < 500)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL, wait_until='networkidle')
        result = page.evaluate('''() => {
          const d=window.MarbleDevices, k=window.MarbleKinetics, dt=1/120, pixels=100;
          d.reset();
          const arm={type:'robotArm',uid:'long-shot',x:100,y:300,length:80,thickness:40,angle:0};
          const emptyAim=d.robotPath(arm,[arm],19.35,pixels,20000);
          const aimTip=emptyAim.points.at(-1);
          const state=d.state(arm);state.phase='out';
          let maxLinks=0;
          for(let i=0;i<1100;i++) {
            d.tick([arm],[],dt,pixels,null,[],19.35,80);
            maxLinks=Math.max(maxLinks,(state.links||[]).length);
          }
          const launchDistance=state.travel,stillFlying=state.phase==='out';
          // A cable angled upward is a physical surface with wood's sliding
          // and rolling resistance, even when it has no nearby wall.
          d.reset();
          const tilted={...arm,uid:'tilted',angle:-.45};
          const hose=d.state(tilted),base=d.muzzle(tilted),dir={x:Math.cos(tilted.angle),y:Math.sin(tilted.angle)};
          hose.phase='out';hose.travel=200;hose.head={base,dir,x:base.x+dir.x*200,y:base.y+dir.y*200,travel:200,speed:2100};
          d.tick([tilted],[],dt,pixels,null,[],19.35,80);
          const mid=hose.links[Math.floor(hose.links.length/2)];
          const n={x:Math.sin(tilted.angle),y:-Math.cos(tilted.angle)};
          const rolling={x:mid.x+n.x*24,y:mid.y+n.y*24,radius:18,mass:.18,vx:2,vy:0,omega:0};
          const initial=rolling.vx;
          const wood={friction:.20,rollingResistance:.04*(.20/.38),gravity:19.35,dt,pixels};
          const touched=d.resolveBall([tilted],rolling,wood);
          const frictionSpeed=rolling.vx,frictionSpin=rolling.omega;
          // A held rail must receive no more pulling impulse on the tick its
          // holdSeconds expires. It must not re-grip on the return trip.
          d.reset();
          const heldArm={...arm,uid:'timed',holdSeconds:.1,reelSpeed:2};
          const rail={type:'zipline',uid:'held-rail',angle:0,length:70,thickness:20,
            path:[{x:400,y:200},{x:800,y:200}],pathT:0,pathSpeed:0,guideOffset:0};
          k.position(rail);
          const timed=d.state(heldArm),muzzle=d.muzzle(heldArm);
          timed.phase='hold';timed.grabbed=rail;timed.grabPoint={x:-30,y:0};
          timed.head={x:370,y:200};timed.travel=Math.hypot(timed.head.x-muzzle.x,timed.head.y-muzzle.y);
          timed.lastGripDistance=timed.travel;timed.hold=dt/2;
          d.tick([heldArm,rail],[],dt,pixels,null,[],19.35,900);
          const release={phase:timed.phase,grabbed:!!timed.grabbed,speed:rail.pathSpeed,hold:timed.hold};
          for(let i=0;i<12;i++) d.tick([heldArm,rail],[],dt,pixels,null,[],19.35,900);
          return {aimDistance:aimTip.x-d.muzzle(arm).x,aimPoints:emptyAim.points.length,
            launchDistance,stillFlying,maxLinks,frictionSpeed,initial,frictionSpin,
            release,after:timed.phase};
        }''')
        print(width, result, flush=True)
        assert result['aimDistance'] >= 19999 and result['aimPoints'] > 100, result
        assert result['stillFlying'] and result['launchDistance'] > 10000 and result['maxLinks'] <= 1025, result
        assert result['frictionSpeed'] < result['initial'] and abs(result['frictionSpin']) > .01, result
        assert result['release']['phase'] == 'back' and not result['release']['grabbed'], result
        assert result['release']['speed'] == 0 and result['release']['hold'] == 0, result
        assert not errors, errors
        page.close()
    browser.close()
