"""Sustained rotor-pair pressure must move both bodies, unlike old rollback."""
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

root=Path(__file__).resolve().parents[1]
url=os.getenv('MARBLE_URL','http://127.0.0.1:18765/marble-builder/')
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width in (390,1280):
        page=browser.new_page(viewport={'width':width,'height':844})
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(url,wait_until='networkidle')
        page.evaluate('window.pairCurrent=window.MarbleKinetics')
        for revision,label in (('15d9d91','pairBeforeRollback'),('e3afecb','pairInterim')):
            source=subprocess.check_output(['git','show',revision+':marble-builder/kinetic.js'],cwd=root,text=True)
            page.add_script_tag(content=source)
            page.evaluate('label => window[label]=window.MarbleKinetics',label)
        trace=page.evaluate('''() => {
          const simulate=k=>{
            const a={type:'rotor',x:300,y:300,pivotX:300,pivotY:300,
              angle:0,omega:2,length:160,thickness:20};
            const b={type:'rotor',x:410,y:370,pivotX:410,pivotY:370,
              angle:.5,omega:0,length:160,thickness:20};
            let first=-1,maxDepth=0,maxStep=0,last=b.angle;
            const samples=[];
            for(let i=0;i<80;i++) {
              k.advance([a,b],1/120,100);
              if(k.resolveRotorContacts) k.resolveRotorContacts([a,b],100);
              else if(k.resolveContacts) k.resolveContacts([a,b],100);
              if(first<0 && Math.abs(b.omega)>.02)first=i;
              maxDepth=Math.max(maxDepth,k.contact(a,b)?.depth||0);
              maxStep=Math.max(maxStep,Math.abs(b.angle-last));last=b.angle;
              if(i%10===0)samples.push([i,+a.angle.toFixed(3),+b.angle.toFixed(3),
                +b.omega.toFixed(3),+(k.contact(a,b)?.depth||0).toFixed(3)]);
            }
            return {first,maxDepth,maxStep,angle:b.angle,samples};
          };
          const sustained=k=>{
            const a={type:'rotor',x:300,y:300,pivotX:300,pivotY:300,
              angle:0,omega:1.5,length:160,thickness:20};
            const b={type:'rotor',x:455,y:340,pivotX:455,pivotY:340,
              angle:.4,omega:0,length:160,thickness:20};
            const ball={x:350,y:273,radius:18,mass:.18,vx:0,vy:5,omega:0};
            let maxDepth=0;
            const samples=[];
            for(let i=0;i<100;i++) {
              k.advance([a,b],1/120,100);
              ball.vy+=19.35/120;
              ball.x+=ball.vx*100/120;ball.y+=ball.vy*100/120;
              k.collideBall(a,ball,100,null,{friction:.2,gravity:19.35,dt:1/120});
              if(k.resolveRotorContacts) k.resolveRotorContacts([a,b],100);
              else if(k.resolveContacts) k.resolveContacts([a,b],100);
              maxDepth=Math.max(maxDepth,k.contact(a,b)?.depth||0);
              if(i%20===0)samples.push([i,+b.angle.toFixed(4),+b.omega.toFixed(2)]);
            }
            return {angle:b.angle,omega:b.omega,maxDepth,samples};
          };
          const wallPair=k=>{
            const a={type:'rotor',x:300,y:300,pivotX:300,pivotY:300,
              angle:0,omega:2,length:160,thickness:20};
            const b={type:'rotor',x:410,y:370,pivotX:410,pivotY:370,
              angle:.5,omega:0,length:160,thickness:20};
            const wall={type:'wood',x:380,y:395,length:60,thickness:20,angle:0};
            let maxDepth=0;
            for(let i=0;i<100;i++){
              k.advance([a,b,wall],1/120,100);
              k.resolveRotorContacts([a,b,wall],100);
              maxDepth=Math.max(maxDepth,k.contact(a,wall)?.depth||0,
                k.contact(b,wall)?.depth||0);
            }
            return {angle:b.angle,maxDepth};
          };
          return {current:simulate(window.pairCurrent),
            previous:simulate(window.pairBeforeRollback),
            interim:simulate(window.pairInterim),
            sustained:{current:sustained(window.pairCurrent),previous:sustained(window.pairBeforeRollback)},
            wall:wallPair(window.pairCurrent)};
        }''')
        print(width,trace,flush=True)
        assert trace['current']['first']>=0 and trace['current']['maxDepth']<.3,trace
        assert .5-trace['current']['angle']>.4 and trace['current']['maxStep']<.03,trace
        assert abs(trace['current']['angle']-trace['previous']['angle'])<.03,trace
        assert trace['sustained']['current']['angle']<-.3,trace
        assert trace['sustained']['current']['maxDepth']<.1,trace
        assert trace['sustained']['previous']['angle']>.39,trace
        assert trace['wall']['maxDepth']<.1 and trace['wall']['angle']<.2,trace
        page.evaluate('window.MarbleKinetics=window.pairCurrent')
        page.locator('#freeModeButton').click()
        integrated=page.evaluate('''() => {
          const d=window.__marbleBuilderDebug;
          const a=d.addRod('rotor',300,300,{length:160,thickness:20,angle:0});
          const b=d.addRod('rotor',410,370,{length:160,thickness:20,angle:.5});
          if(!a||!b)return {placed:false};
          a.omega=2;
          for(let i=0;i<80;i++)d.stepPhysics();
          return {placed:true,mode:d.getState().appMode,angle:b.angle};
        }''')
        assert integrated['placed'] and integrated['mode']=='free',integrated
        assert .5-integrated['angle']>.4,integrated
        assert not errors,errors
        page.close()
        live=browser.new_page(viewport={'width':width,'height':844})
        live_errors=[]
        live.on('pageerror',lambda error:live_errors.append(str(error)))
        live.goto(url,wait_until='networkidle')
        live.locator('#freeModeButton').click()
        pressed=live.evaluate('''() => {
          const d=window.__marbleBuilderDebug,k=window.MarbleKinetics;
          const a=d.addRod('rotor',300,300,{length:160,thickness:20});
          const b=d.addRod('rotor',455,340,{length:160,thickness:20,angle:.4});
          if(!a||!b)return {placed:false};
          a.omega=1.5;
          d.setBallState({x:350,y:273,vx:0,vy:5});
          let maxDepth=0,ballWhileMoving=false;
          for(let i=0;i<100;i++) {
            d.stepPhysics();
            maxDepth=Math.max(maxDepth,k.contact(a,b)?.depth||0);
            if(i<70 && b.angle<.3 && !!d.getState().ball) ballWhileMoving=true;
          }
          return {placed:true,angle:b.angle,maxDepth,ballWhileMoving,
            mode:d.getState().appMode};
        }''')
        print(width,'free-mode ball pressure',pressed,flush=True)
        assert pressed['placed'] and pressed['mode']=='free' and pressed['ballWhileMoving'],pressed
        assert pressed['angle']<-.3 and pressed['maxDepth']<.1,pressed
        assert not live_errors,live_errors
        live.close()
    browser.close()
