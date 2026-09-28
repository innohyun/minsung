"""Actual launched hose follows the arc; a late mid-span plank must not flip it."""
import os
from playwright.sync_api import sync_playwright

URL=os.getenv('MARBLE_URL','http://127.0.0.1:8765/marble-builder/')
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width,height in ((1280,800),(390,844)):
        page=browser.new_page(viewport={'width':width,'height':height},has_touch=width<500)
        errors=[]
        page.on('pageerror',lambda e: errors.append(str(e)))
        page.goto(URL,wait_until='networkidle')
        page.locator('#freeModeButton').click()
        data=page.evaluate('''() => {
          const d=window.MarbleDevices;d.reset();
          const support={type:'wood',uid:'mount',x:80,y:100,length:100,thickness:20,angle:0};
          const arm={type:'robotArm',uid:'arc',x:300,y:300,length:70,thickness:42,
            angle:-.5,force:9,buttonAnchor:{woodUid:'mount',side:'top',offset:0}};
          const blocker={type:'wood',uid:'middle-only',x:460,y:300,length:50,thickness:22,angle:0};
          const b=d.button([support,arm],arm),press={x:b.x,y:b.y-16,radius:18,mass:.18,vx:0,vy:0};
          const projected=[], frames=[];
          let blockerActive=false,maxArcError=0,maxJump=0,inside=0,midInside=0,checked=0;
          const bad=[];let activatedAt=0;
          let old=null;
          for(let i=0;i<110;i++) {
            const rods=blockerActive?[support,arm,blocker]:[support,arm];
            d.tick(rods,[press],1/120,100,null,[],19.35,900);
            const st=d.state(arm);
            if(!blockerActive && st.head.x>550) {blockerActive=true;activatedAt=i;}
            if(st.phase!=='out') break;
            const p=st.links;
            if(i>30 && !blockerActive) {
              const base={x:arm.x+Math.cos(arm.angle)*arm.length/2,
                y:arm.y+Math.sin(arm.angle)*arm.length/2};
              for(const node of p.slice(2,-1)) {
                if(node.x-base.x<30) continue; // the short nozzle section stays rigid
                const time=(node.x-base.x)/(Math.cos(arm.angle)*arm.force*.55*100);
                const expected=base.y+Math.sin(arm.angle)*arm.force*.55*100*time
                  +19.35*100*time*(time+1/120)/2;
                maxArcError=Math.max(maxArcError,Math.abs(node.y-expected));
              }
            }
            if(blockerActive && i>activatedAt) {
              const rope=p.slice(2,-1),near=rope.filter(node=>Math.abs(node.x-460)<45);
              if(old?.length && near.length && i>activatedAt+2) {
                const a=near[Math.floor(near.length/2)],prior=old[Math.floor(old.length/2)];
                maxJump=Math.max(maxJump,Math.hypot(a.x-prior.x,a.y-prior.y));
              }
              old=near.map(v=>({x:v.x,y:v.y}));
              for(const node of rope) {
                if(Math.abs(node.x-460)<25+5 && Math.abs(node.y-300)<11+5) {
                  inside++;if(bad.length<8) bad.push({i,x:node.x,y:node.y});
                }
                checked++;
              }
              for(let k=3;k<p.length-1;k++) {
                const x=(p[k-1].x+p[k].x)/2,y=(p[k-1].y+p[k].y)/2;
                if(Math.abs(x-460)<25+4 && Math.abs(y-300)<11+4) midInside++;
              }
            }
            if(i%20===0) frames.push({i,tip:{x:st.head.x,y:st.head.y},links:p.length});
          }
          return {maxArcError,maxJump,inside,midInside,checked,blockerActive,activatedAt,bad,frames};
        }''')
        print(width,data)
        assert not errors,errors
        assert data['maxArcError']<3 and data['blockerActive'] and data['checked']>100,data
        assert data['inside']==data['midInside']==0 and data['maxJump']<25,data
        winding=page.evaluate('''() => {
          const d=window.MarbleDevices;d.reset();
          const mount={type:'wood',uid:'mount3',x:80,y:100,length:100,thickness:20,angle:0};
          const arm={type:'robotArm',uid:'winch-route',x:300,y:300,length:70,thickness:42,
            angle:0,force:9,buttonAnchor:{woodUid:'mount3',side:'top',offset:0}};
          const block={type:'wood',uid:'wrap',x:475,y:300,length:40,thickness:60,angle:0};
          const target={type:'wood',uid:'fixed',x:650,y:300,length:70,thickness:30,angle:0};
          const st=d.state(arm),base={x:335,y:300},contact={x:615,y:300};
          st.phase='hold';st.travel=350;st.hold=3.5;
          st.head={x:contact.x,y:contact.y};st.grabbed=target;
          st.grabPoint={x:-35,y:0};st.handNormal={x:-1,y:0};
          st.wrapFace={wrap:-1};
          st.links=Array.from({length:31},(_,i)=>{
            const x=base.x+(contact.x-base.x)*i/30;
            const y=300-55*Math.sin(Math.PI*i/30);
            return {x,y,px:x,py:y};
          });
          let min=Infinity,max=0;
          for(let i=0;i<180;i++) {
            d.tick([mount,arm,block,target],[],1/120,100,null,[],19.35,900);
            min=Math.min(min,st.travel);max=Math.max(max,st.travel);
          }
          return {travel:st.travel,straight:280,initial:max,min,unchanged:target.x===650,
            phase:st.phase,links:st.links?.length};
        }''')
        assert winding['unchanged'] and winding['phase']=='hold',winding
        assert winding['straight']+3<winding['travel']<winding['initial']-5,winding
        print('WINCH',width,winding)
        page.close()
    browser.close()
