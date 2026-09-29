"""A ball pressing a rotor transfers impulse to a touching guide before it leaves."""
import os
from playwright.sync_api import sync_playwright

url = os.getenv('MARBLE_URL', 'http://127.0.0.1:18765/marble-builder/')
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width in (390, 1280):
        page = browser.new_page(viewport={'width':width,'height':844})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(url, wait_until='networkidle')
        result = page.evaluate('''() => {
          const k=window.MarbleKinetics, px=100, dt=1/120;
          const rotor={type:'rotor',x:300,y:300,pivotX:300,pivotY:300,length:160,thickness:20,angle:0,omega:0};
          const guide={type:'zipline',x:370,y:340,length:64,thickness:60,angle:0,
            path:[{x:370,y:340},{x:370,y:490}],pathT:0,pathSpeed:0};
          k.position(guide);
          const touching=k.contact(rotor,guide,.05);
          const ball={x:350,y:273,radius:18,mass:.18,vx:0,vy:5,omega:0};
          const hit=k.collideBall(rotor,ball,px,null,{friction:.2,gravity:19.35,dt});
          const before={omega:rotor.omega,speed:guide.pathSpeed};
          k.resolveContacts([rotor,guide],px);
          const after={omega:rotor.omega,speed:guide.pathSpeed,ballY:ball.y};
          k.advance([rotor,guide],dt,px);
          return {touching:touching?.depth,hit,before,after,travel:guide.pathT};
        }''')
        print(width,result,flush=True)
        assert result['touching'] is not None and result['touching'] >= -.051, result
        assert result['hit'] and result['before']['omega'] > 0 and result['before']['speed'] == 0, result
        assert result['after']['speed'] > 0 and result['after']['omega'] < result['before']['omega'], result
        assert result['travel'] > 0, result
        page.locator('#freeModeButton').click()
        integrated=page.evaluate('''() => {
          const d=window.__marbleBuilderDebug;
          const rotor=d.addRod('rotor',300,300,{length:160,thickness:20,angle:0});
          const guide=d.addRod('zipline',370,340,{length:64,thickness:60,
            path:[{x:370,y:340},{x:370,y:490}]});
          if(!rotor||!guide) return {placement:false};
          const ball=d.setBallState({x:350,y:273,vx:0,vy:5});
          d.stepPhysics();
          const speed=guide.pathSpeed;
          d.stepPhysics();
          return {placement:true,ball:!!ball,stillHere:!!d.getState().ball,
            speed,travel:guide.pathT,omega:rotor.omega};
        }''')
        print(width,'free mode',integrated,flush=True)
        assert integrated['placement'] and integrated['ball'] and integrated['stillHere'], integrated
        assert integrated['speed']>0 and integrated['travel']>0 and integrated['omega']>0,integrated
        assert not errors, errors
        page.close()
    browser.close()
