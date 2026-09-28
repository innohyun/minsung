"""Regression for full marble winch, tiled hose friction, and constrained contact."""
import os
from playwright.sync_api import sync_playwright

URL = os.getenv('MARBLE_URL', 'http://127.0.0.1:18765/marble-builder/')
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width in (1280, 390):
        page = browser.new_page(viewport={'width': width, 'height': 844}, has_touch=width < 500)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL, wait_until='networkidle')
        result = page.evaluate('''() => {
          const d=window.MarbleDevices,k=window.MarbleKinetics,dt=1/120,px=100;
          const arm={type:'robotArm',uid:'test-arm',x:300,y:300,length:70,thickness:42,angle:0,force:7,reelSpeed:1.9,holdSeconds:2};
          const mount={type:'wood',uid:'mount',x:90,y:100,length:100,thickness:20,angle:0};
          arm.buttonAnchor={woodUid:'mount',side:'top',offset:0};
          const button=d.button([mount,arm],arm);
          const press={x:button.x,y:button.y-16,radius:18,mass:.18,vx:0,vy:0};
          const natural={uid:'natural',x:900,y:300,radius:20,mass:.18,vx:0,vy:0};
          let launched=false,caught=false;
          for(let i=0;i<140;i++) {
            d.tick([mount,arm],[press,natural],dt,px,null,[],19.35,1300);
            const s=d.state(arm);
            launched=launched||s.phase==='out';caught=caught||s.grabbed===natural;
          }
          d.reset();
          const base=d.muzzle(arm),ball={uid:'test-ball',x:900,y:300,radius:20,mass:.18,vx:0,vy:0};
          const st=d.state(arm);
          st.phase='hold';st.grabbed=ball;st.grabPoint={x:-20,y:0};st.handNormal={x:-1,y:0};
          st.head={x:ball.x-20,y:ball.y};st.travel=st.head.x-base.x;
          st.hold=2;st.lastGripDistance=st.travel;
          let closest=Infinity, releasedAt=0;
          for(let i=0;i<650;i++) {
            d.tick([arm],[ball],dt,px,null,[],19.35,1300);
            closest=Math.min(closest,Math.abs(ball.x-(base.x+ball.radius)));
            if(st.grabbed!==ball) {releasedAt=i;break;}
          }
          const tiles=[];
          const tile=d.images['robot-hose'];
          // Draw with the actual loaded image, count each fixed-scale repeated segment.
          const original=CanvasRenderingContext2D.prototype.drawImage;
          CanvasRenderingContext2D.prototype.drawImage=function(img,...args){ if(img===tile)tiles.push(args);return original.call(this,img,...args); };
          st.links=Array.from({length:72},(_,i)=>({x:base.x+i*12,y:base.y}));st.travel=852;
          const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=500;
          d.draw(canvas.getContext('2d'),arm);
          CanvasRenderingContext2D.prototype.drawImage=original;
          st.grabbed=null;
          const rolling={x:base.x+100,y:base.y-22,radius:18,mass:.18,vx:5,vy:0};
          d.resolveBall([arm],rolling);
          // The sharp U-guide must stop a grabbed zipline in the turn, while
          // its straight counterpart must still accept winch force.
          function guideResult(bend) {
            d.reset();
            const z={type:'zipline',uid:'test-guide',angle:0,length:65,thickness:18,
              path:[{x:450,y:250},{x:800,y:250}],curveBend:bend,guideOffset:0,
              pathT:0,pathSpeed:0};
            z.pathT=k.curve(z).total*.75;k.position(z);
            const s=d.state(arm),grip={x:z.x-32,y:z.y};
            s.phase='hold';s.grabbed=z;s.grabPoint={x:-32,y:0};s.head={...grip};
            s.travel=Math.hypot(grip.x-base.x,grip.y-base.y);s.lastGripDistance=s.travel;
            s.hold=5;
            d.tick([arm,z],[],dt,px,null,[],19.35,1300);
            return {speed:z.pathSpeed,travel:s.travel,headDistance:Math.hypot(s.head.x-base.x,s.head.y-base.y)};
          }
          const bent=guideResult(250),flat=guideResult(0);
          d.reset();
          const curved={type:'zipline',uid:'deep-curve',angle:0,length:65,thickness:18,
            path:[{x:450,y:250},{x:800,y:250}],curveBend:250,guideOffset:0,
            pathT:0,pathSpeed:0};
          const curveLength=k.curve(curved).total;
          curved.pathT=curveLength*.95;k.position(curved);
          const curveState=d.state(arm),initialGrip={x:curved.x-32,y:curved.y};
          curveState.phase='hold';curveState.grabbed=curved;curveState.grabPoint={x:-32,y:0};
          curveState.head={...initialGrip};curveState.travel=Math.hypot(initialGrip.x-base.x,initialGrip.y-base.y);
          curveState.lastGripDistance=curveState.travel;curveState.hold=8;
          for(let i=0;i<360;i++) {
            d.tick([arm,curved],[],dt,px,null,[],19.35,1300);
            k.advance([curved],dt,px);
          }
          const stoppedAt=curved.pathT/curveLength;
          const rotor={type:'rotor',uid:'wall-rotor',x:300,y:300,pivotX:300,pivotY:300,
            length:160,thickness:20,angle:0,omega:6};
          const wall={type:'wood',uid:'wall',x:366,y:335,length:65,thickness:16,angle:0};
          let maxAngleStep=0,wallOverlaps=0,firstHit=-1,afterWall=null;
          for(let i=0;i<90;i++) {
            const prev=rotor.angle;
            k.advance([rotor,wall],dt,96,()=>{if(firstHit<0)firstHit=i});
            maxAngleStep=Math.max(maxAngleStep,Math.abs(rotor.angle-prev));
            if(k.contact(rotor,wall))wallOverlaps++;
            if(i===firstHit)afterWall=rotor.omega;
          }
          const spinner={type:'rotor',uid:'spin',x:630,y:330,pivotX:630,pivotY:330,
            length:150,thickness:20,angle:0,omega:0};
          d.reset();const spinState=d.state(arm);
          spinState.phase='hold';spinState.grabbed=spinner;spinState.grabPoint={x:-64,y:-9};
          spinState.head={x:566,y:321};spinState.travel=231;spinState.lastGripDistance=231;spinState.hold=30;
          let maxMotorOmega=0;
          for(let i=0;i<700;i++) {
            d.tick([arm,spinner],[],dt,px,null,[],19.35,1300);
            k.advance([spinner],dt,px);
            maxMotorOmega=Math.max(maxMotorOmega,Math.abs(spinner.omega));
          }
          const pushing={type:'rotor',uid:'push',x:300,y:300,pivotX:300,pivotY:300,
            length:170,thickness:20,angle:-.8,omega:3};
          const guided={type:'zipline',uid:'guided',x:400,y:265,angle:0,length:70,thickness:20,
            path:[{x:360,y:265},{x:600,y:265}],pathT:40,pathSpeed:0};
          let maxGuideStep=0,pairOverlaps=0,prevX=guided.x;
          for(let i=0;i<120;i++) {
            k.advance([pushing,guided],dt,px);
            maxGuideStep=Math.max(maxGuideStep,Math.abs(guided.x-prevX));prevX=guided.x;
            if(k.contact(pushing,guided))pairOverlaps++;
          }
          return {launched,caught,closest,releasedAt,tiles:tiles.length,firstTile:tiles[0],lastTile:tiles[tiles.length-1],rollingVx:rolling.vx,
            bent,flat,stoppedAt,firstHit,afterWall,maxAngleStep,wallOverlaps,maxMotorOmega,
            guideMove:guided.x-400,maxGuideStep,pairOverlaps};
        }''')
        print('robot', width, result, flush=True)
        assert result['launched'] and result['caught'], result
        assert result['closest'] < 2 and result['releasedAt'] > 200, result
        assert result['tiles'] > 50 and all(abs(a[6]-16)<.01 for a in (result['firstTile'],result['lastTile'])), result
        assert result['rollingVx'] < 4.4, result
        assert abs(result['bent']['speed']) < .001 and result['bent']['travel'] >= result['bent']['headDistance']-.01, result
        assert abs(result['flat']['speed']) > 0, result
        assert .65 < result['stoppedAt'] < .86, result
        assert result['firstHit'] >= 0 and result['afterWall'] <= 0 and result['wallOverlaps'] == 0 and result['maxAngleStep'] < .1, result
        assert result['maxMotorOmega'] <= 4.01, result
        assert result['guideMove'] > 30 and result['pairOverlaps'] == 0 and result['maxGuideStep'] < 3, result
        assert not errors, errors
        page.close()
    browser.close()
