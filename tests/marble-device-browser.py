"""Real editor placement and physics regressions for the remote wood-mounted punch button."""
import os
from playwright.sync_api import sync_playwright

URL = os.environ.get('MARBLE_URL', 'http://127.0.0.1:8765/marble-builder/')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

for width, height in ((1280, 800), (390, 844)):
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path=CHROME)
        page = browser.new_page(viewport={'width': width, 'height': height}, has_touch=width < 500)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL, wait_until='networkidle')
        page.locator('#freeModeButton').click()
        assert page.evaluate('Boolean(window.MarbleDevices && window.__marbleBuilderDebug)'), errors
        page.locator('#toolList .more-card').click()
        assert page.locator('#blockCatalogGrid').get_by_text('버튼+펀치').count() > 0
        assert page.locator('#blockCatalogGrid').get_by_text('버튼+로봇 팔').count() > 0
        page.locator('#blockCatalogGrid .catalog-item').filter(has_text='버튼+펀치').get_by_text('설정').click()
        page.locator('#deviceForce').fill('13')
        page.locator('#deviceSettingsForm button[type=submit]').click()
        assert page.evaluate('window.__marbleBuilderDebug.getState().deviceTemplates.punch.force') == 13
        setup = page.evaluate('''() => {
          const d=window.__marbleBuilderDebug, s=d.getState();
          const sx=s.view.width*.52, sy=(s.view.playTop+s.view.dockTop)*.5;
          const x=s.camera.x+sx/s.camera.zoom,y=s.camera.y+sy/s.camera.zoom;
          const wood=d.addRod('wood',x,y,{length:150,thickness:22});
          return {x,y,screenX:sx,screenY:sy,view:s.view,zoom:s.camera.zoom,
            rect:document.querySelector('canvas').getBoundingClientRect().toJSON(),uid:wood?.uid,
            illegal:d.addRod('punch',x+200,y,{})};
        }''')
        assert setup['uid'] and setup['illegal'] is None, setup
        page.locator('#toolList .more-card').click()
        page.locator('#blockCatalogGrid .catalog-item').filter(has_text='버튼+펀치').get_by_text('선택').click()
        card = page.locator('#toolList .tool-card[data-tool=punch]')
        bounds = card.bounding_box()
        assert bounds, 'punch tool card missing'
        origin = (bounds['x'] + bounds['width']/2, bounds['y'] + bounds['height']/2)
        dest = (setup['rect']['x'] + setup['screenX'], setup['rect']['y'] + setup['screenY'] - 10*setup['zoom'])
        if width < 500:
            cdp = page.context.new_cdp_session(page)
            for event, x, y in [('touchStart', *origin), ('touchMove', origin[0], origin[1]-25),
                                ('touchMove', *dest), ('touchEnd', *dest)]:
                cdp.send('Input.dispatchTouchEvent', {'type': event,
                    'touchPoints': [] if event == 'touchEnd' else [{'x': x, 'y': y, 'id': 1}]})
        else:
            page.mouse.move(*origin)
            page.mouse.down()
            page.mouse.move(*dest, steps=14)
            page.mouse.up()
        state = page.evaluate('window.__marbleBuilderDebug.getState()')
        assert state['pendingPunch'] and state['pendingPunch']['anchor']['woodUid'] == setup['uid'], state['pendingPunch']
        assert not [r for r in state['rods'] if r['type']=='punch'], 'punch placed before body step'
        body = (setup['rect']['x'] + setup['screenX'] + 105*setup['zoom'], setup['rect']['y'] + setup['screenY'] - 92*setup['zoom'])
        if width < 500:
            page.touchscreen.tap(*body)
        else:
            page.mouse.click(*body)
        state = page.evaluate('window.__marbleBuilderDebug.getState()')
        punches = [r for r in state['rods'] if r['type']=='punch']
        assert len(punches) == 1 and not state['pendingPunch'], state['pendingPunch']
        assert punches[0]['buttonAnchor']['woodUid'] == setup['uid'] and punches[0]['force'] == 13
        check = page.evaluate('''() => {
          const d=window.__marbleBuilderDebug,p=window.MarbleDevices;
          const all=d.getState().rods, rod=d.getRodByUid(all.find(r=>r.type==='punch').uid);
          const b=p.button(all,rod), wood=d.getRodByUid(b.woodUid);
          const press={x:b.x+b.nx*16,y:b.y+b.ny*16,radius:18,mass:.18,vx:0,vy:0,omega:0};
          const target={x:rod.x+rod.length/2+62,y:rod.y,radius:18,mass:.18,vx:0,vy:0,omega:0};
          let max=0;for(let i=0;i<45;i++){p.tick([wood,rod],[press,target],1/120,100);max=Math.max(max,p.state(rod).travel);}
          const first=target.vx;
          for(let i=0;i<95;i++)p.tick([wood,rod],[press,target],1/120,100);
          const noRepeat=target.vx;
          p.reset();
          const wall={type:'wood',x:rod.x+rod.length/2+75,y:rod.y,length:22,thickness:110,angle:0};
          let wallMax=0;for(let i=0;i<60;i++){p.tick([wood,rod,wall],[press],1/120,100);wallMax=Math.max(wallMax,p.state(rod).travel);}
          return {b,woodUid:wood.uid,first,noRepeat,max,wallMax,phase:p.state(rod).phase,
            assets:Object.fromEntries(Object.entries(p.images).map(([k,v])=>[k,v.complete&&v.naturalWidth>0]))};
        }''')
        assert check['b']['woodUid'] == setup['uid'] and check['first'] > 0, check
        assert check['first'] == check['noRepeat'] and 34 <= check['max'] <= 36, check
        assert 54.5 <= check['wallMax'] <= 55.5 and check['phase'] == 'idle', check
        assert all(check['assets'].values()), check['assets']
        interaction = page.evaluate('''() => {
          const d=window.__marbleBuilderDebug,p=window.MarbleDevices;
          const all=d.getState().rods, rod=d.getRodByUid(all.find(r=>r.type==='punch').uid);
          const wood=d.getRodByUid(rod.buttonAnchor.woodUid), b=p.button([wood,rod],rod);
          const press={x:b.x+b.nx*16,y:b.y+b.ny*16,radius:18,mass:.18,vx:0,vy:0,omega:0};
          const x=rod.x+rod.length/2+64;
          const targets=[
            {type:'rotor',x,y:rod.y,length:40,thickness:16,angle:0,pivotX:x,pivotY:rod.y+20,omega:0},
            {type:'swing',x,y:rod.y+130,length:130,angle:0,swingOmega:0},
            {type:'zipline',x,y:rod.y,length:40,thickness:16,angle:0,path:[{x:x-30,y:rod.y},{x:x+30,y:rod.y}],pathSpeed:0}
          ];
          const results=[];
          for(const target of targets){
            p.reset();
            let max=0;
            for(let i=0;i<42;i++) {p.tick([wood,rod,target],[press],1/120,100);max=Math.max(max,p.state(rod).travel);}
            results.push({type:target.type,max,velocity:target.type==='swing'?target.swingOmega:target.type==='zipline'?target.pathSpeed:target.omega});
          }
          p.reset();
          const muzzle=rod.x+rod.length/2;
          const basket={x1:muzzle+64,y1:rod.y-45,x2:muzzle+64,y2:rod.y+45,thickness:12,goalId:'test'};
          let basketMax=0;
          for(let i=0;i<70;i++) {p.tick([wood,rod],[press],1/120,100,null,[basket]);basketMax=Math.max(basketMax,p.state(rod).travel);}
          p.reset();
          d.setBallState({x:b.x+b.nx*15,y:b.y+b.ny*15,vx:0,vy:0});
          d.stepPhysics(3);
          return {results,basketMax,integrated:d.getState().rods.find(v=>v.type==='punch').device.travel};
        }''')
        assert all(abs(t['velocity']) > .01 for t in interaction['results']), interaction
        assert all(0 < t['max'] < 100 for t in interaction['results']), interaction
        assert 48 <= interaction['basketMax'] <= 50, interaction
        swing_gap = page.evaluate('''() => {
          const d=window.__marbleBuilderDebug,p=window.MarbleDevices,k=window.MarbleKinetics;
          const rod=d.getState().rods.find(r=>r.type==='punch');
          const x=rod.x+rod.length/2+92;
          const swing={type:'swing',x,y:rod.y+130,length:130,angle:0,swingOmega:0};
          const box={x,y:rod.y-23.5,length:84,thickness:59,angle:0};
          for(const offset of [-48,-42,-35,-25,-10,0]) {
            const probe={...rod,y:rod.y+offset};
            let transparent=false,solid=false;
            for(let travel=38;travel<=75;travel++) {
              const head={x:probe.x+probe.length/2+travel+3,y:probe.y,length:12,thickness:probe.thickness*.88,angle:0};
              const old=k.contact(head,box)!=null,actual=p.contact(probe,swing,travel)!=null;
              if(old&&!actual) transparent=true;
              if(actual) solid=true;
            }
            if(transparent&&solid) return {transparent,solid,offset};
          }
          return {transparent:false,solid:false};
        }''')
        assert swing_gap['transparent'] and swing_gap['solid'], swing_gap
        assert interaction['integrated'] > 0, interaction
        boundaries = page.evaluate('''() => {
          const d=window.__marbleBuilderDebug,p=window.MarbleDevices,s=d.getState();
          const rod=d.getRodByUid(s.rods.find(r=>r.type==='punch').uid);
          const wood=d.getRodByUid(rod.buttonAnchor.woodUid);
          wood.angle=.23;
          const b=p.button([wood,rod],rod);
          const face={x:b.x-b.nx*7,y:b.y-b.ny*7};
          const ball=(dist)=>({x:face.x+b.nx*dist,y:face.y+b.ny*dist,
            radius:18,mass:.18,vx:0,vy:0,omega:0});
          const far=ball(18+18),touch=ball(18+14),press=ball(18+7);
          const off=p.pressure(far,b),on=p.pressure(touch,b),full=p.pressure(press,b);
          p.reset();p.tick([wood,rod],[press],1/120,100);
          p.resolveBall([wood,rod],press);
          const plateHeight=14-p.state(rod).depth*8;
          const projected=(press.x-face.x)*b.nx+(press.y-face.y)*b.ny;
          p.reset();rod.force=2;
          p.tick([wood,rod],[ball(18+7)],1/120,100);
          const slow=p.state(rod).travel;
          p.reset();rod.force=20;
          p.tick([wood,rod],[ball(18+7)],1/120,100);
          const fast=p.state(rod).travel;
          rod.force=13;p.reset();
          const shaftBall={x:rod.x+rod.length/2+20,y:rod.y,radius:18,vx:0,vy:0};
          p.state(rod).travel=60;
          p.resolveBall([wood,rod],shaftBall);
          return {off,on,full,projected,required:18+plateHeight,slow,fast,
            shaftClearance:Math.abs(shaftBall.y-rod.y),pressedLoaded:p.images['button-pressed'].naturalWidth>0};
        }''')
        assert boundaries['off'] == 0 and boundaries['on'] > 0 and boundaries['full'] > .9, boundaries
        assert boundaries['projected'] >= boundaries['required'] - .02, boundaries
        assert boundaries['fast'] > boundaries['slow'] * 5 and boundaries['shaftClearance'] >= 23, boundaries
        assert boundaries['pressedLoaded'], boundaries
        # Actual canvas draw must survive applying settings, not just the rod record.
        page.evaluate('''() => {
          window.__punchDraws=0;
          const old=CanvasRenderingContext2D.prototype.drawImage;
          CanvasRenderingContext2D.prototype.drawImage=function(img,...args){
            if(img?.src?.includes('/devices/punch-body.png')) window.__punchDraws++;
            return old.call(this,img,...args);
          };
        }''')
        if width < 500:
            page.touchscreen.tap(*body)
        else:
            page.mouse.click(*body)
        assert page.evaluate("window.__marbleBuilderDebug.getState().selectedKind") == 'rod'
        page.locator('#selectedSettingsButton').click()
        page.locator('#deviceForce').fill('4')
        page.locator('#deviceSettingsForm button[type=submit]').click()
        state = page.evaluate('window.__marbleBuilderDebug.getState()')
        assert state['rods'][1]['force'] == 4 and state['deviceTemplates']['punch']['force'] == 13
        assert state['rods'][1]['buttonAnchor']['woodUid'] == setup['uid']
        assert state['selectedKind'] == 'rod' and state['rods'][1]['uid'] == punches[0]['uid']
        installed_speed = page.evaluate('''() => {
          const d=window.__marbleBuilderDebug,p=window.MarbleDevices,s=d.getState();
          const r=d.getRodByUid(s.rods.find(item=>item.type==='punch').uid),b=p.button(s.rods,r);
          const press={x:b.x+b.nx*16,y:b.y+b.ny*16,radius:18,mass:.18,vx:0,vy:0};
          p.reset();p.tick(s.rods,[press],1/120,100);
          return p.state(r).travel;
        }''')
        assert 3 < installed_speed < 4, installed_speed
        # A cleared numeric field must not silently change the installed force.
        page.locator('#selectedSettingsButton').click()
        page.locator('#deviceForce').fill('')
        page.locator('#deviceSettingsForm button[type=submit]').click()
        blank_state = page.evaluate('window.__marbleBuilderDebug.getState()')
        assert blank_state['rods'][1]['force'] == 4 and blank_state['rods'][1]['buttonAnchor']['woodUid'] == setup['uid'], blank_state
        page.wait_for_timeout(70)
        assert page.evaluate('window.__punchDraws') > 0, 'installed punch stopped rendering after force settings'
        page.evaluate('window.__marbleBuilderDebug.undoLastAction()')
        assert page.evaluate('window.__marbleBuilderDebug.getState().rods[1].force') == 13
        stored = page.evaluate('''() => {
          const d=window.__marbleBuilderDebug;
          if (!d.saveCreation('Punch browser test')) return {error:'save failed'};
          const saved=d.getState().creations.find(x=>x.name==='Punch browser test');
          d.loadCreation(saved.id);
          const s=d.getState(),r=s.rods.find(x=>x.type==='punch');
          return {saved: saved.rods.find(x=>x.type==='punch').buttonAnchor,
            restored:r.buttonAnchor,button:window.MarbleDevices.button(s.rods,r)};
        }''')
        assert stored['saved'] == stored['restored'] and stored['button'], stored
        assert not errors, errors
        print(f'PASS {width}x{height}: assets, wood-first placement, separate button, swept punch-ball/wall, settings, undo, save/load')
        browser.close()
