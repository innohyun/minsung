"""Normal button launch into a plank and a marble: retract, don't knot or pay out."""
import os
from playwright.sync_api import sync_playwright

URL = os.getenv('MARBLE_URL', 'http://127.0.0.1:8765/marble-builder/')
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width, height in [(1280, 800), (390, 844)]:
        page = browser.new_page(viewport={'width':width,'height':height},has_touch=width<500)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(URL,wait_until='networkidle')
        print('BUNDLE',page.evaluate('''async () => ({url:location.href,scripts:[...document.scripts].map(x=>x.src).filter(x=>x.includes('devices')),fresh:(await (await fetch('devices.js?v=8',{cache:'no-store'})).text()).includes('motor-v9'),sw:!!navigator.serviceWorker?.controller})'''),flush=True)
        results=page.evaluate('''() => {
          const d=window.MarbleDevices,dt=1/120,g=19.35,px=100,results={};
          for(const kind of ['wood','ball']) {
            d.reset();
            const mount={type:'wood',uid:'mount',x:90,y:100,length:100,thickness:20,angle:0};
            const arm={type:'robotArm',uid:'arm',x:300,y:300,length:70,thickness:42,angle:0,force:7,holdSeconds:2,
              buttonAnchor:{woodUid:'mount',side:'top',offset:0}};
            const dots=d.robotPath(arm,[],g,px,1100).points;
            const dot=dots[8];
            const wood={type:'wood',uid:'target',x:dot.x,y:dot.y+15,length:90,thickness:22,angle:0};
            const ball={uid:'ball',x:dot.x,y:dot.y,radius:19,mass:.18,vx:0,vy:0,angle:0};
            const target=kind==='wood'?wood:ball;
            const rods=[mount,arm,...(kind==='wood'?[wood]:[])];
            const push=d.button(rods,arm),press={x:push.x,y:push.y-16,radius:18,mass:.18,vx:0,vy:0};
            const balls=[press,...(kind==='ball'?[ball]:[])];
            const timeline=[];let grabbed=false,firstTravel=0,lastTravel=0,minBallX=ball.x,ballSpeed=0,maxKink=0;
            for(let i=0;i<195;i++) {
              d.tick(rods,balls,dt,px,null,[],g,1100);
              const s=d.state(arm);
              if(s.grabbed===target) {
                if(!grabbed) firstTravel=s.travel;
                grabbed=true;lastTravel=s.travel;
                if(kind==='ball') {
                  ball.vy+=g*dt;ball.x+=ball.vx*px*dt;ball.y+=ball.vy*px*dt;
                  minBallX=Math.min(minBallX,ball.x);
                  ballSpeed=Math.max(ballSpeed,Math.hypot(ball.vx,ball.vy));
                }
                if(i%8===0) {
                  const links=s.links||[],dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
                  const longest=Math.max(...links.slice(1).map((n,j)=>dist(links[j],n)));
                  const collapsed=links.slice(2).filter((n,j)=>dist(n,links[j+1])<2).length;
                  maxKink=Math.max(maxKink,longest);
                  timeline.push({i,travel:s.travel,ballX:ball.x,ballY:ball.y,links:links.length,longest,collapsed,tip:{x:links.at(-1).x,y:links.at(-1).y}});
                }
              }
            }
            results[kind]={grabbed,build:d.state(arm).__winchBuild,wound:d.state(arm).wound,firstTravel,lastTravel,minBallX,startBallX:dot.x,ballSpeed,maxKink,timeline};
          }
          return results;
        }''')
        print(width,{k:{field:value for field,value in v.items() if field!='timeline'} | {'selected':[row for row in v['timeline'] if row['i'] in (48,64,80,96,112,128,144,160,176,192)]} for k,v in results.items()},flush=True)
        assert not errors,errors
        assert results['wood']['grabbed'] and results['ball']['grabbed'],results
        assert results['wood']['lastTravel']<=results['wood']['firstTravel']+.1,results['wood']
        assert results['ball']['minBallX']<results['ball']['startBallX']-15,results
        assert results['ball']['maxKink']<40 and results['ball']['ballSpeed']<7,results['ball']
        page.close()
    browser.close()
