"""Sustained ball -> rotor -> rail on a slightly overlapping support surface."""
import os
from playwright.sync_api import sync_playwright

url = os.getenv('MARBLE_URL', 'http://127.0.0.1:18765/marble-builder/')
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width in (390, 1280):
        page = browser.new_page(viewport={'width': width, 'height': 844})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(url, wait_until='networkidle')
        result = page.evaluate('''() => {
          const k=window.MarbleKinetics,dt=1/120,px=100;
          const rotor={type:'rotor',uid:'r',pivotX:300,pivotY:300,x:300,y:300,
            length:160,thickness:20,angle:-.45,omega:0};
          const guide={type:'zipline',uid:'g',angle:0,length:64,thickness:20,
            path:[{x:410,y:275},{x:650,y:275}],pathT:0,pathSpeed:0,guideOffset:0};
          k.position(guide);
          // A visibly flush rail on a plank can have a one-pixel editor overlap.
          const plank={type:'wood',uid:'support',x:520,y:294,length:240,thickness:20,angle:0};
          const start=k.contact(guide,plank);
          const ball={x:350,y:206,radius:18,mass:.18,vx:0,vy:0,omega:0};
          let hits=0,first=-1,whilePressing=0,maxStep=0,previous=guide.x;
          const timeline=[];
          for(let i=0;i<130;i++) {
            k.advance([rotor,guide,plank],dt,px);
            ball.vy+=19.35*dt;ball.x+=ball.vx*px*dt;ball.y+=ball.vy*px*dt;
            k.collideBall(rotor,ball,px,()=>{hits++;if(first<0)first=i},
              {friction:.2,gravity:19.35,dt});
            if(i<90 && first>=0) whilePressing=Math.max(whilePressing,guide.x-410);
            maxStep=Math.max(maxStep,Math.abs(guide.x-previous));previous=guide.x;
            if(i%20===0) timeline.push({i,x:+guide.x.toFixed(2),v:+guide.pathSpeed.toFixed(2),
              angle:+rotor.angle.toFixed(2),hits});
          }
          // A genuinely new wall impact must still stop the moving carriage.
          const stopping={type:'zipline',uid:'stopping',angle:0,length:64,thickness:20,
            path:[{x:410,y:275},{x:650,y:275}],pathT:0,pathSpeed:180,guideOffset:0};
          const endWall={type:'wood',uid:'wall',x:500,y:275,length:20,thickness:100,angle:0};
          k.position(stopping);
          let maxWallStep=0,last=stopping.x;
          for(let i=0;i<90;i++) {
            k.advance([stopping,plank,endWall],dt,px);
            maxWallStep=Math.max(maxWallStep,Math.abs(stopping.x-last));last=stopping.x;
          }
          return {initialOverlap:start?.depth||0,first,hits,whilePressing,maxStep,
            moved:guide.x-410,timeline,stopX:stopping.x,maxWallStep};
        }''')
        print(width, result, flush=True)
        assert result['initialOverlap'] > 0 and result['first'] >= 0 and result['hits'] > 20, result
        assert result['whilePressing'] > 5 and result['maxStep'] < 2, result
        assert 440 < result['stopX'] < 458.1 and result['maxWallStep'] < 2, result
        page.locator('#freeModeButton').click()
        integrated = page.evaluate('''() => {
          const d=window.__marbleBuilderDebug;
          const rotor=d.addRod('rotor',300,300,{length:160,thickness:20,angle:-.45});
          const guide=d.addRod('zipline',410,275,{length:64,thickness:20,
            path:[{x:410,y:275},{x:650,y:275}]});
          const plank=d.addRod('wood',520,296,{length:240,thickness:20});
          if(!rotor||!guide||!plank) return {placement:false};
          // Simulate an old saved map's one-pixel flush support contact;
          // preserve the ordinary free-mode physicsStep and spawned ball.
          plank.y=294;
          const marble=d.setBallState({x:350,y:206,vx:0,vy:0});
          let first=-1,hits=0,travelWhile=0,maxStep=0,last=guide.x;
          for(let i=0;i<110;i++) {
            const previous=rotor.omega;
            d.stepPhysics();
            if(first<0 && Math.abs(rotor.omega)>Math.abs(previous)+.03) first=i;
            if(first>=0 && i<90) travelWhile=Math.max(travelWhile,guide.x-410);
            maxStep=Math.max(maxStep,Math.abs(guide.x-last));last=guide.x;
            if(d.getState().ball) hits++;
          }
          return {placement:true,spawned:!!marble,first,hits,travelWhile,maxStep};
        }''')
        print(width, 'free mode', integrated, flush=True)
        assert integrated['placement'] and integrated['spawned'] and integrated['first'] >= 0, integrated
        assert integrated['travelWhile'] > 5 and integrated['maxStep'] < 2, integrated
        assert not errors, errors
        page.close()
    browser.close()
