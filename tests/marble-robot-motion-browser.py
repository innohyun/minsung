"""Straight motor pulls marbles and projects force through pivot/guide joints."""
import os
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    page=browser.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(os.getenv('MARBLE_URL','http://127.0.0.1:8765/marble-builder/'),wait_until='networkidle')
    measurements=page.evaluate('''() => {
      const dev=window.MarbleDevices;
      const result={};
      const wood={type:'wood',uid:'support',x:100,y:250,length:100,thickness:20,angle:0};
      const arm={type:'robotArm',uid:'arm',x:360,y:300,length:70,thickness:42,angle:0,force:7,holdSeconds:2,
        buttonAnchor:{woodUid:'support',side:'top',offset:0}};
      const b=dev.button([wood,arm],arm);
      const press={x:b.x,y:b.y-16,radius:18,mass:.18,vx:0,vy:0};
      function pull(target,kind) {
        dev.reset();let s=dev.state(arm);
        s.phase='out';dev.tick([wood,arm],[press],1/120,100,null,[],19.35,1200);
        s.phase='hold';s.hold=2;s.travel=160;s.grabbed=target;s.grabPoint={x:target.radius?0:25,y:0};
        const before={vx:target.vx||0,omega:target.omega||0,pathSpeed:target.pathSpeed||0,swingOmega:target.swingOmega||0};
        const rods=[wood,arm];if(!target.radius) rods.push(target);
        for(let i=0;i<12;i++) dev.tick(rods,[press,...(target.radius?[target]:[])],1/120,100,null,[],19.35,1200);
        return {before,vx:target.vx||0,omega:target.omega||0,pathSpeed:target.pathSpeed||0,
          swingOmega:target.swingOmega||0,held:s.grabbed===target,travel:s.travel,links:s.links?.length};
      }
      result.light=pull({x:610,y:410,radius:18,mass:.18,vx:0,vy:0},'ball');
      result.heavy=pull({x:610,y:410,radius:18,mass:.9,vx:0,vy:0},'ball');
      result.rotor=pull({type:'rotor',x:610,y:410,pivotX:610,pivotY:410,pivotOffset:0,
        length:90,thickness:20,angle:0,omega:0},'rotor');
      result.zipline=pull({type:'zipline',x:610,y:410,length:90,thickness:20,angle:0,
        path:[{x:510,y:410},{x:710,y:410}],pathT:100,pathSpeed:0,guideOffset:0},'zipline');
      result.swing=pull({type:'swing',x:610,y:410,length:90,thickness:20,angle:0,swingOmega:0},'swing');
      dev.reset();const state=dev.state(arm);state.travel=170;
      state.links=[{x:395,y:300},{x:480,y:300},{x:565,y:300}];
      const rolling={x:490,y:280,radius:18,mass:.18,vx:2,vy:1,omega:0};
      dev.resolveBall([wood,arm],rolling);
      result.hoseSurface={y:rolling.y,vx:rolling.vx,vy:rolling.vy};
      return result;
    }''')
    print(measurements)
    assert not errors,errors
    assert measurements['light']['vx'] < -1 and abs(measurements['light']['vx']-measurements['heavy']['vx']) < .01,measurements
    assert abs(measurements['rotor']['omega'])>0,measurements
    assert abs(measurements['zipline']['pathSpeed'])>0,measurements
    assert abs(measurements['swing']['swingOmega'])>0,measurements
    assert measurements['hoseSurface']['y']<280 and 0<measurements['hoseSurface']['vx']<2,measurements
    browser.close()
    print('PASS robot mass/pivot/guide/swing pulls')
