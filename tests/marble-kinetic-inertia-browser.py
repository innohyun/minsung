"""Constrained momentum transfer: an end-stop cannot absorb impossible motion."""
import os
from playwright.sync_api import sync_playwright
url=os.getenv('MARBLE_URL','http://127.0.0.1:18765/marble-builder/')
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width in (390,1280):
        page=browser.new_page(viewport={'width':width,'height':844})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url,wait_until='networkidle')
        r=page.evaluate('''() => {
          const k=window.MarbleKinetics,px=100,dt=1/120;
          const run=direction=>{
            const rotor={type:'rotor',x:300,y:300,pivotX:300,pivotY:300,
              pivotOffset:0,length:180,thickness:20,angle:0,omega:-4};
            const rail={type:'zipline',x:390,y:281,angle:0,length:80,thickness:20,
              path:[{x:390,y:281},{x:390,y:281+direction*150}],pathT:0,pathSpeed:0};
            k.position(rail);
            const first=k.contact(rotor,rail);
            k.advance([rotor,rail],dt,px);
            const impact={omega:rotor.omega,speed:rail.pathSpeed,travel:rail.pathT};
            for(let i=0;i<30;i++)k.advance([rotor,rail],dt,px);
            return {first:first?.depth||0,impact,omega:rotor.omega,speed:rail.pathSpeed,
              distance:rail.pathT,angle:rotor.angle};
          };
          const first={type:'rotor',pivotX:300,pivotY:300,x:300,y:300,
            length:160,thickness:20,angle:-.45,omega:0};
          const second={type:'rotor',pivotX:400,pivotY:305,x:400,y:305,
            length:120,thickness:20,angle:-.45,omega:0};
          const x=400+Math.cos(-.45)*60+32,y=305+Math.sin(-.45)*60;
          const guide={type:'zipline',angle:0,length:64,thickness:20,
            path:[{x,y},{x:x+240,y}],pathT:0,pathSpeed:0};
          k.position(guide);
          const ball={x:350,y:206,radius:18,mass:.18,vx:0,vy:0,omega:0};
          let hits=0,secondSpin=0,whilePressing=0,maxStep=0,last=guide.x;
          for(let i=0;i<140;i++) {
            k.advance([first,second,guide],dt,px);
            ball.vy+=19.35*dt;ball.x+=ball.vx*px*dt;ball.y+=ball.vy*px*dt;
            k.collideBall(first,ball,px,()=>hits++,{friction:.2,gravity:19.35,dt});
            if(i<85){secondSpin=Math.max(secondSpin,Math.abs(second.omega));
              whilePressing=Math.max(whilePressing,guide.x-x);}
            maxStep=Math.max(maxStep,Math.abs(guide.x-last));last=guide.x;
          }
          return {free:run(-1),stopped:run(1),chain:{hits,secondSpin,whilePressing,maxStep}};
        }''')
        print(width,r,flush=True)
        assert r['free']['first']>0 and r['stopped']['first']>0, r
        assert r['free']['impact']['speed']>0 and r['free']['distance']>0, r
        # With the path pointing the wrong way, the rail is immovable. It must
        # not receive negative stored velocity that vanishes on the next tick.
        assert r['stopped']['impact']['speed']>=0 and r['stopped']['distance']==0, r
        assert r['stopped']['impact']['omega']>0, r
        assert r['chain']['hits']>40 and r['chain']['secondSpin']>1, r
        assert r['chain']['whilePressing']>5 and r['chain']['maxStep']<2, r
        assert not errors,errors
        page.close()
    browser.close()
