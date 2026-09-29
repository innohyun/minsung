"""Visible wall boundaries, wood-like marble friction, and rotor/rotor impacts."""
import os
from playwright.sync_api import sync_playwright

url=os.getenv('MARBLE_URL','http://127.0.0.1:18765/marble-builder/')
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width in (390,1280):
        page=browser.new_page(viewport={'width':width,'height':844})
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(url,wait_until='networkidle')
        results=page.evaluate('''() => {
          const k=window.MarbleKinetics,dt=1/120,scale=100;
          const rod=(x,y,angle=0,omega=0)=>({type:'rotor',x,y,pivotX:x,pivotY:y,
            length:160,thickness:20,angle,omega});
          const wall={type:'wood',x:300,y:330,length:200,thickness:20,angle:0};
          const rotor=rod(300,300,0,2);
          let rotorDepth=0;
          for(let i=0;i<120;i++) { k.advance([rotor,wall],dt,scale);
            rotorDepth=Math.max(rotorDepth,k.contact(rotor,wall)?.depth||0); }
          const slanted={type:'wood',x:300,y:370,length:200,thickness:20,angle:.35};
          const angledRotor=rod(300,300,0,2);
          let angledDepth=0;
          for(let i=0;i<120;i++){k.advance([angledRotor,slanted],dt,scale);
            angledDepth=Math.max(angledDepth,k.contact(angledRotor,slanted)?.depth||0);}
          const guide={type:'zipline',x:410,y:275,length:64,thickness:20,angle:0,
            path:[{x:410,y:275},{x:650,y:275}],pathT:0,pathSpeed:180};
          const barrier={type:'wood',x:500,y:275,length:20,thickness:100,angle:0};
          k.position(guide);
          let guideDepth=0;
          for(let i=0;i<100;i++){k.advance([guide,barrier],dt,scale);
            guideDepth=Math.max(guideDepth,k.contact(guide,barrier)?.depth||0);}
          const a=rod(300,300),b=rod(420,300,-1.4,-3);
          let pairDepth=0,first=-1;
          for(let i=0;i<160;i++) { k.advance([a,b],dt,scale);
            const h=k.contact(a,b);pairDepth=Math.max(pairDepth,h?.depth||0);
            if(first<0 && Math.abs(a.omega)>.05) first=i; }
          const friction=(type,coefficient)=>{
            const r=type==='rotor'?rod(300,300):{type:'zipline',x:300,y:300,
              length:160,thickness:20,angle:0,path:[{x:300,y:300},{x:500,y:300}],pathT:0,pathSpeed:0};
            const ball={x:300,y:273,radius:18,mass:.18,vx:4,vy:.1,omega:0};
            k.collideBall(r,ball,scale,null,{friction:coefficient,rollingResistance:0,
              gravity:19.35,dt});
            return {vx:ball.vx,spin:ball.omega};
          };
          return {rotor:{angle:rotor.angle,omega:rotor.omega,depth:rotorDepth},
            angled:{angle:angledRotor.angle,depth:angledDepth},
            guide:{x:guide.x,speed:guide.pathSpeed,depth:guideDepth},
            pair:{first,depth:pairDepth,a:a.angle,omega:a.omega,b:b.angle},
            wood:{rotor:[friction('rotor',0),friction('rotor',.2)],
              guide:[friction('zipline',0),friction('zipline',.2)]}};
        }''')
        print(width,results,flush=True)
        assert results['rotor']['depth']<.06,results
        assert results['angled']['depth']<.06 and results['angled']['angle']<1.1,results
        assert results['guide']['depth']<.06 and 450<results['guide']['x']<459,results
        assert results['pair']['first']>=0 and results['pair']['depth']<.06,results
        for none,wood in results['wood'].values():
            assert wood['vx']<none['vx'] and abs(wood['spin'])>0,results
        page.locator('#freeModeButton').click()
        integrated=page.evaluate('''() => {
          const d=window.__marbleBuilderDebug,k=window.MarbleKinetics;
          const rotor=d.addRod('rotor',300,300,{length:160,thickness:20});
          const wall=d.addRod('wood',300,330,{length:200,thickness:20});
          if(!rotor||!wall) return {placed:false};
          rotor.omega=2;
          for(let i=0;i<120;i++) d.stepPhysics();
          return {placed:true,mode:d.getState().appMode,
            angle:rotor.angle,depth:k.contact(rotor,wall)?.depth||0};
        }''')
        assert integrated['placed'] and integrated['mode']=='free',integrated
        assert integrated['angle']<.13 and integrated['depth']<.06,integrated
        assert not errors,errors
        page.close()
    browser.close()
