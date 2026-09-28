"""Real-button straight harpoon, winch timer, and constrained block contacts."""
import os
from playwright.sync_api import sync_playwright

URL=os.getenv('MARBLE_URL','http://127.0.0.1:8765/marble-builder/')
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width,height in ((1280,800),(390,844)):
        page=browser.new_page(viewport={'width':width,'height':height},has_touch=width<500)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(URL,wait_until='networkidle')
        page.locator('#freeModeButton').click()
        page.locator('#toolList .more-card').click()
        page.locator('#blockCatalogGrid .catalog-item').filter(has_text='버튼+로봇 팔').get_by_text('설정').click()
        assert page.locator('#robotReelLabel').is_visible()
        page.locator('#robotReelSpeed').fill('3.2')
        page.locator('#robotHoldSeconds').fill('0.5')
        page.locator('#deviceSettingsForm button[type=submit]').click()
        template=page.evaluate('window.__marbleBuilderDebug.getState().deviceTemplates.robotArm')
        assert template['reelSpeed']==3.2 and template['holdSeconds']==0.5,template
        persisted=page.evaluate('''() => {
          const d=window.__marbleBuilderDebug,dev=window.MarbleDevices;
          const wood=d.addRod('wood',200,310,{length:120,thickness:20});
          const anchor=dev.snap(d.getState().rods,{x:200,y:300});
          const arm=d.addRod('robotArm',380,330,{buttonAnchor:anchor,reelSpeed:3.2,holdSeconds:.5});
          d.saveCreation('직선 작살 설정 확인');
          const id=d.getState().activeCreationId;
          d.clearAll();d.loadCreation(id);
          return d.getRodByUid(arm.uid);
        }''')
        assert persisted['reelSpeed']==3.2 and persisted['holdSeconds']==0.5,persisted
        result=page.evaluate('''() => {
          const d=window.MarbleDevices,k=window.MarbleKinetics,dt=1/120;
          const support={type:'wood',uid:'trigger',x:80,y:130,length:100,thickness:20,angle:0};
          const arm={type:'robotArm',uid:'harpoon',x:300,y:300,length:70,thickness:42,angle:0,
            force:8,reelSpeed:2,holdSeconds:.45,buttonAnchor:{woodUid:'trigger',side:'top',offset:0}};
          const b=d.button([support,arm],arm);
          const press={x:b.x,y:b.y-16,radius:18,mass:.18,vx:0,vy:0};
          const run=(target) => {
            d.reset(); const rods=[support,arm,...(target.radius?[]:[target])];
            const balls=[press,...(target.radius?[target]:[])];
            const start=target.x,speeds=[],phases=[],distances=[],deviation=[];
            for(let i=0;i<230;i++) {
              d.tick(rods,balls,dt,100,null,[],19.35,650);
              const st=d.state(arm);phases.push(st.phase);
              if(st.phase==='out') speeds.push(st.head.speed);
              if(st.phase==='hold') {
                distances.push(st.travel);
                const links=st.links||[];
                for(const p of links) {
                  const a=links[0],z=links.at(-1),x=z.x-a.x,y=z.y-a.y;
                  deviation.push(Math.abs((p.x-a.x)*y-(p.y-a.y)*x)/Math.hypot(x,y));
                }
              }
            }
            return {start,end:target.x,speeds:speeds.slice(0,12),held:phases.includes('hold'),
              released:phases.includes('back'),spoolStart:distances[0],spoolEnd:distances.at(-1),
              maxDeviation:Math.max(0,...deviation),attached:target.attachedRobotUid||null};
          };
          const empty=d.robotPath(arm,[support,arm],19.35,100,650);
          const wood=run({type:'wood',uid:'wood',x:510,y:300,length:70,thickness:22,angle:Math.PI/2});
          const ball=run({x:500,y:300,radius:18,mass:.18,vx:0,vy:0});
          const stalled={};
          for(const kind of ['rotor','zipline']) {
            const target={type:kind,uid:'stalled-'+kind,x:500,y:300,length:70,thickness:22,
              angle:Math.PI/2,pivotX:500,pivotY:300,pivotOffset:0,omega:0,
              path:[{x:500,y:300},{x:500,y:400}],pathT:0,pathSpeed:0,guideOffset:0};
            const rods=[support,arm,target];d.reset();
            let held=0,lo=Infinity,hi=0,released=false;
            for(let i=0;i<165;i++) {
              d.tick(rods,[press],dt,100,null,[],19.35,650);
              k.advance(rods,dt,100);
              const s=d.state(arm);
              if(s.phase==='hold') {held++;lo=Math.min(lo,s.travel);hi=Math.max(hi,s.travel);}
              if(held && s.phase==='back') released=true;
            }
            stalled[kind]={held,lo,hi,released,angle:target.angle,pathT:target.pathT};
          }
          const rotor=(uid,y,omega)=>({type:'rotor',uid,x:300,y,pivotX:300,pivotY:y,pivotOffset:0,
            angle:0,omega,length:120,thickness:18});
          const ra=rotor('a',300,14),rb=rotor('b',330,-14);
          let overlap=0,impacts=0;
          for(let i=0;i<80;i++) {
            k.advance([ra,rb],dt,100,()=>impacts++);
            if(k.contact(ra,rb)) overlap++;
          }
          const flat=rotor('flat',300,0);
          const zip={type:'zipline',uid:'z',x:300,y:330,length:120,thickness:18,angle:0,
            path:[{x:300,y:330},{x:300,y:200}],pathT:0,pathSpeed:390,guideOffset:0};
          let zipOverlap=0,zipImpacts=0;
          for(let i=0;i<80;i++) {
            k.advance([flat,zip],dt,100,()=>zipImpacts++);
            if(k.contact(flat,zip)) zipOverlap++;
          }
          return {empty:empty.hit,wood,ball,stalled,rotor:{overlap,impacts},zip:{overlap:zipOverlap,impacts:zipImpacts}};
        }''')
        print(width,result,flush=True)
        assert not errors,errors
        assert not result['empty']
        for name in ('wood','ball'):
            r=result[name]
            assert r['held'] and r['released'] and not r['attached'],r
            assert r['maxDeviation']<.01,r
            assert r['speeds'][-1]>r['speeds'][0],r
        assert result['wood']['end']==result['wood']['start'],result
        assert result['ball']['end']<result['ball']['start']-20,result
        for kind in ('rotor','zipline'):
            s=result['stalled'][kind]
            assert s['held']>20 and s['released'] and s['hi']-s['lo']<12,s
        assert abs(result['stalled']['rotor']['angle']-3.141592653589793/2)<.01,result
        assert abs(result['stalled']['zipline']['pathT'])<.01,result
        assert result['rotor']['overlap']==0 and result['rotor']['impacts']>0,result
        assert result['zip']['overlap']==0 and result['zip']['impacts']>0,result
        page.close()
    browser.close()
