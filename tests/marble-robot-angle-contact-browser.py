"""Off-axis hose return and ball-driven rotor-to-guide contact on phone/desktop."""
import os
from playwright.sync_api import sync_playwright

URL = os.getenv('MARBLE_URL', 'http://127.0.0.1:18765/marble-builder/')
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width in (390, 1280):
        page = browser.new_page(viewport={'width':width,'height':844},has_touch=width<500)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(URL,wait_until='networkidle')
        result=page.evaluate('''() => {
          const d=window.MarbleDevices,k=window.MarbleKinetics,dt=1/120,px=100;
          d.reset();
          const arm={type:'robotArm',uid:'angle-arm',x:100,y:300,length:80,thickness:40,angle:0,reelSpeed:1.9};
          const base=d.muzzle(arm),rotor={type:'rotor',uid:'angle-rotor',pivotX:300,pivotY:420,
            x:300,y:420,length:120,thickness:18,angle:0,omega:0};
          const st=d.state(arm);st.phase='hold';st.grabbed=rotor;st.grabPoint={x:-45,y:-8};
          st.head={x:255,y:412};st.travel=72;st.lastGripDistance=160;st.hold=dt/2;
          const held={...st.head};
          d.tick([arm,rotor],[],dt,px,null,[],19.35,1200);
          const first={...st.head},firstLinks=st.links.map(p=>({...p})),direction={...st.returnDir};
          let maxStep=Math.hypot(first.x-held.x,first.y-held.y),angleError=0,last={...first};
          for(let i=0;i<60;i++) {
            d.tick([arm,rotor],[],dt,px,null,[],19.35,1200);
            maxStep=Math.max(maxStep,Math.hypot(last.x-st.head.x,last.y-st.head.y));last={...st.head};
            angleError=Math.max(angleError,Math.abs((st.head.y-base.y)*direction.x-(st.head.x-base.x)*direction.y));
          }
          const guide={type:'zipline',uid:'guide',angle:0,length:64,thickness:20,
            path:[{x:410,y:275},{x:650,y:275}],pathT:0,pathSpeed:0,guideOffset:0};
          const driver={type:'rotor',uid:'driver',pivotX:300,pivotY:300,x:300,y:300,
            length:160,thickness:20,angle:-.45,omega:0};
          const ball={x:350,y:206,radius:18,mass:.18,vx:0,vy:0,omega:0};
          k.position(guide);
          let maxGuideStep=0,prevGuide=guide.x,hitCount=0,ballHits=0;
          const samples=[];
          for(let i=0;i<420;i++) {
            k.advance([driver,guide],dt,px,()=>hitCount++);
            ball.vy+=19.35*dt;ball.x+=ball.vx*px*dt;ball.y+=ball.vy*px*dt;
            if(k.collideBall(driver,ball,px,()=>ballHits++,{friction:.2,gravity:19.35,dt})){}
            const step=Math.abs(guide.x-prevGuide);maxGuideStep=Math.max(maxGuideStep,step);
            prevGuide=guide.x;
            if(i%30===0) samples.push({i,x:guide.x,omega:driver.omega,speed:guide.pathSpeed});
          }
          const wallRotor={type:'rotor',uid:'wall-rotor',pivotX:300,pivotY:300,
            x:300,y:300,length:160,thickness:20,angle:0,omega:6};
          const wall={type:'wood',uid:'wall',x:366,y:335,length:65,thickness:16,angle:0};
          let maxWallStep=0,wallOverlap=0,wallHits=0;
          for(let i=0;i<90;i++) {
            const previous=wallRotor.angle;
            k.advance([wallRotor,wall],dt,px,()=>wallHits++);
            maxWallStep=Math.max(maxWallStep,Math.abs(wallRotor.angle-previous));
            if(k.contact(wallRotor,wall)) wallOverlap++;
          }
          // Exercise the ordinary wood-mounted button, not just an injected
          // hold state: launch, grip a turning rotor, release, reel.
          d.reset();
          const mount={type:'wood',uid:'mount',x:90,y:100,length:100,thickness:20,angle:0};
          arm.buttonAnchor={woodUid:'mount',side:'top',offset:0};
          arm.holdSeconds=.25;
          const button=d.button([mount,arm],arm);
          const press={x:button.x,y:button.y-16,radius:18,mass:.18,vx:0,vy:0};
          const liveRotor={type:'rotor',uid:'live-rotor',pivotX:630,pivotY:320,
            x:630,y:320,length:150,thickness:32,angle:0,omega:0};
          let launched=false,caught=false,released=false,releaseStep=0,previousTip=null;
          for(let i=0;i<400;i++) {
            d.tick([mount,arm,liveRotor],[press],dt,px,null,[],19.35,1200);
            const state=d.state(arm);
            launched=launched||state.phase==='out';
            caught=caught||state.grabbed===liveRotor;
            if(caught && state.head && previousTip && !released && state.phase==='back') {
              released=true;
              releaseStep=Math.hypot(state.head.x-previousTip.x,state.head.y-previousTip.y);
            }
            if(state.head) previousTip={...state.head};
            k.advance([liveRotor],dt,px);
            if(released) break;
          }
          return {base,held,first,firstLinks,direction,maxStep,angleError,
            guideMove:guide.x-410,maxGuideStep,hitCount,ballHits,samples,
            maxWallStep,wallOverlap,wallHits,launched,caught,released,releaseStep};
        }''')
        print(width,result,flush=True)
        assert result['maxStep'] < 3 and result['angleError'] < .02 and abs(result['direction']['y']) > .6, result
        assert result['hitCount'] > 0 and result['ballHits'] > 0, result
        assert result['guideMove'] > 50 and result['maxGuideStep'] < 2, result
        assert result['wallHits'] > 0 and result['wallOverlap'] == 0 and result['maxWallStep'] < .1, result
        assert result['launched'] and result['caught'] and result['released'] and result['releaseStep'] < 3, result
        assert not errors,errors
        page.close()
    browser.close()
