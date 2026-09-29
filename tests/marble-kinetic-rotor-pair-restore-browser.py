"""Rotor-to-rotor pressure uses the pre-rollback pair response, only for rotor pairs."""
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
          return {current:simulate(window.pairCurrent),
            previous:simulate(window.pairBeforeRollback),
            interim:simulate(window.pairInterim)};
        }''')
        print(width,trace,flush=True)
        assert trace['current']['first']>=0 and trace['current']['maxDepth']<.3,trace
        assert .5-trace['current']['angle']>.4 and trace['current']['maxStep']<.03,trace
        assert trace['current']['samples']==trace['previous']['samples'],trace
        assert abs(trace['current']['angle']-trace['previous']['angle'])<1e-8,trace
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
    browser.close()
