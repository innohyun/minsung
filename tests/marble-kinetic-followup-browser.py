"""Editor, constrained collision, magnet settings and linked electric regression."""
import math
import os
from playwright.sync_api import sync_playwright

URL = os.getenv('MARBLE_URL', 'http://127.0.0.1:8765/marble-builder/')
D = 'window.__marbleBuilderDebug'

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for width, height in [(1280, 800), (390, 844)]:
        page = browser.new_page(viewport={'width': width, 'height': height}, has_touch=width < 500)
        page.add_init_script('''(() => {
          window.__boostNotes = 0;
          window.__boostContexts = [];
          const original = AudioContext.prototype.createOscillator;
          AudioContext.prototype.createOscillator = function() {
            const oscillator = original.call(this);
            window.__boostContexts.push(this);
            const set = oscillator.frequency.setValueAtTime.bind(oscillator.frequency);
            oscillator.frequency.setValueAtTime = (frequency,time) => {
              if (frequency === 420) window.__boostNotes++;
              return set(frequency,time);
            };
            return oscillator;
          };
        })()''')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL, wait_until='networkidle')
        page.locator('#freeModeButton').click()
        # Dynamic solid collision occurs before overlap, and energy is reflected at a locked axis.
        physics = page.evaluate('''() => {
          const k=window.MarbleKinetics;
          const a={type:'rotor',uid:'r',x:300,y:300,pivotX:300,pivotY:300,length:160,thickness:20,angle:0,omega:6};
          const wood={type:'wood',uid:'w',x:366,y:335,length:65,thickness:16,angle:0};
          let sound=0,overlaps=0;
          for(let i=0;i<80;i++) {
            k.advance([a,wood],1/120,96,()=>sound++);
            if(k.contact(a,wood))overlaps++;
          }
          const z={type:'zipline',uid:'z',x:230,y:400,path:[{x:230,y:400},{x:500,y:400}],pathT:0,pathSpeed:580,length:80,thickness:20,angle:0};
          const wall={type:'wood',uid:'wall',x:400,y:400,length:32,thickness:35,angle:0};
          let zsound=0,zoverlaps=0;
          for(let i=0;i<90;i++){
            k.advance([z,wall],1/120,96,()=>zsound++);
            if(k.contact(z,wall))zoverlaps++;
          }
          return {sound,overlaps,omega:a.omega,zsound,zoverlaps,pathSpeed:z.pathSpeed};
        }''')
        assert physics['sound'] > 0 and physics['overlaps'] == 0, physics
        assert physics['zsound'] > 0 and physics['zoverlaps'] == 0, physics
        friction = page.evaluate('''() => {
          const k=window.MarbleKinetics;
          return ['rotor','zipline'].map(type => {
            const readings=[];
            for(const mu of [0,.20]) {
              const rod={type,x:300,y:300,pivotX:300,pivotY:300,length:160,thickness:20,
                angle:0,omega:0,path:[{x:200,y:300},{x:400,y:300}],pathT:100,pathSpeed:0};
              const ball={x:330,y:272.2,radius:18,mass:.18,vx:3,vy:.15,omega:0};
              k.collideBall(rod,ball,100,null,{friction:mu,
                rollingResistance:mu?0.04*(.20/.38):0,gravity:19.35,dt:1/120});
              readings.push({vx:ball.vx,omega:ball.omega});
            }
            return {type,without:readings[0],wood:readings[1]};
          });
        }''')
        assert all(t['wood']['vx'] < t['without']['vx'] and abs(t['wood']['omega']) > abs(t['without']['omega']) for t in friction), friction
        # No new/ordinary block can be placed in the current footprint of the other.
        rx, ry = (150, 280) if width < 500 else (300, 280)
        zx, zy = (285, 360) if width < 500 else (590, 280)
        placement = page.evaluate(f'''() => {{
          const d={D};d.clearAll();
          const rotor=d.addRod('rotor',{rx},{ry},{{length:150}});
          const refused=d.addRod('wood',{rx},{ry},{{length:50}});
          const zipped=d.addRod('zipline',{zx},{zy},{{length:130}});
          const other=d.addRod('zipline',{zx},{zy},{{length:130}});
          const field=d.addField(950,400);
          return {{rotor:!!rotor,refused:!!refused,zipped:!!zipped,other:!!other,field:!!field,rods:d.getState().rods}};
        }}''')
        assert placement['rotor'] and not placement['refused'] and placement['zipped'] and not placement['other'], placement
        # A fresh selection can reshape the initial straight path by dragging its middle handle.
        page.evaluate(f'{D}.selectRod(1)')
        before = page.evaluate(f'{D}.getState()')
        rod = before['rods'][1]
        guide = page.evaluate('(r)=>window.MarbleKinetics.curve(r,window.MarbleKinetics.curve(r).total/2)', rod)
        camera = before['camera']
        box = page.locator('#gameCanvas').bounding_box()
        def screen(x,y):
            return box['x']+(x-camera['x'])*camera['zoom'],box['y']+(y-camera['y'])*camera['zoom']
        sx,sy=screen(guide['x'],guide['y'])
        page.mouse.move(sx,sy);page.mouse.down();page.mouse.move(sx,sy+48,steps=8);page.mouse.up()
        curved=page.evaluate(f'{D}.getState().rods[1]')
        assert abs(curved['curveBend']) > 15 and len(curved['path']) == 2, curved
        # A selected axis is locked. Hold an unselected axis to move it without selecting.
        page.evaluate(f'{D}.selectRod(0)')
        before=page.evaluate(f'{D}.getState().rods[0]')
        sx,sy=screen(before['pivotX'],before['pivotY'])
        page.mouse.move(sx,sy);page.mouse.down();page.mouse.move(sx+24,sy,steps=6);page.mouse.up()
        assert page.evaluate(f'{D}.getState().rods[0].pivotOffset') == before['pivotOffset']
        page.evaluate(f'{D}.selectRod(1)')
        page.mouse.move(sx,sy);page.mouse.down();page.wait_for_timeout(340);page.mouse.move(sx+24,sy,steps=6);page.mouse.up()
        pivot=page.evaluate(f'{D}.getState().rods[0]')
        assert abs(pivot['x']-before['x'])<.01 and pivot['pivotOffset']>10, (before,pivot)
        # Drag the longer side of an offset rotor: the grabbed end must remain
        # under the pointer instead of swapping to the short side on first move.
        page.evaluate(f'{D}.selectRod(0)')
        long_end=pivot['x']-pivot['length']/2
        ex,ey=screen(long_end,pivot['y'])
        page.mouse.move(ex,ey);page.mouse.down();page.mouse.move(ex+2,ey-20,steps=6);page.mouse.up()
        turned=page.evaluate(f'{D}.getState().rods[0]')
        left=turned['x']-turned['length']/2*math.cos(turned['angle'])
        top=turned['y']-turned['length']/2*math.sin(turned['angle'])
        assert math.hypot(left-(long_end+2),top-(pivot['y']-20))<9,(pivot,turned,left,top)
        guide = page.evaluate('(r)=>window.MarbleKinetics.curve(r,r.pathT||0)',curved)
        before = page.evaluate(f'{D}.getState().rods[1]')
        page.evaluate(f'{D}.selectRod(1)')
        sx,sy=screen(guide['x'],guide['y'])
        page.mouse.move(sx,sy);page.mouse.down();page.mouse.move(sx+24,sy,steps=6);page.mouse.up()
        assert page.evaluate(f'{D}.getState().rods[1].guideOffset') == before['guideOffset']
        page.evaluate(f'{D}.selectRod(0)')
        page.mouse.move(sx,sy);page.mouse.down();page.wait_for_timeout(340);page.mouse.move(sx+24,sy,steps=6);page.mouse.up()
        shifted=page.evaluate(f'{D}.getState().rods[1]')
        assert abs(shifted['x']-before['x'])<.01 and shifted['guideOffset']>10,(before,shifted)
        if width < 500:
            # Real touch hold on the unselected rotor pivot (not a mouse gesture).
            page.evaluate(f'{D}.selectRod(1)')
            rotor=page.evaluate(f'{D}.getState().rods[0]')
            sx,sy=screen(rotor['pivotX'],rotor['pivotY'])
            cdp=page.context.new_cdp_session(page)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':sx,'y':sy,'id':1}]})
            page.wait_for_timeout(340)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':sx+18,'y':sy,'id':1}]})
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            touched=page.evaluate(f'{D}.getState().rods[0]')
            assert touched['pivotOffset'] > rotor['pivotOffset']+8,(rotor,touched)
        # The selected magnet changes alone; the dock's template and neighbor survive.
        page.evaluate(f'''() => {{const d={D};d.clearAll();d.addRod('magnet',340,300,{{triggerCount:2}});
          d.addRod('magnet',680,300,{{triggerCount:2}});d.selectRod(0)}}''')
        page.locator('#selectedSettingsButton').click()
        page.locator('#magnetCount').fill('3')
        page.locator('#magnetSettingsForm button[type=submit]').click()
        magnets=page.evaluate(f'{D}.getState()')
        assert [r['triggerCount'] for r in magnets['rods']] == [3,2] and magnets['magnetTemplate']['triggerCount']==2, magnets
        assert page.locator('#magnetRepeats').count() == 0
        # Pausing and resetting keep visible balls in place / clear them without breaking spawn.
        page.locator('#spawnButton').click()
        page.locator('#pauseButton').click()
        frozen=page.evaluate(f'{D}.getState().ball')
        page.wait_for_timeout(180)
        assert page.evaluate(f'{D}.getState().ball') == frozen
        page.locator('#pauseButton').click()
        page.locator('#resetButton').click()
        assert page.evaluate(f'{D}.getState().ball') is None
        page.locator('#spawnButton').click()
        assert page.evaluate(f'{D}.getState().ball') is not None
        # Straight linked track: enter shallow, cross the corner in either direction.
        travel=page.evaluate(f'''() => {{const d={D};d.clearAll();
          d.addRod('electric',300,340,{{uid:'a',length:180}});
          d.addRod('electric',480,340,{{uid:'b',length:180}});
          d.selectRod(0);d.combineSelectedElectric();d.spawnBall();
          d.setBallState({{x:285,y:340-11-18,vx:8,vy:.5,electricRide:null,specialContacts:[]}});
          const frames=[];
          for(let i=0;i<190;i++){{d.stepPhysics(1);if(i%12===0)frames.push(d.getState().ball)}}
          return {{link:d.getState().electricLinks,frames}};
        }}''')
        assert len(travel['link']) == 1 and any(f['electricRide'] and f['electricRide']['rodUid']=='b' for f in travel['frames']), travel
        assert page.evaluate('window.__boostNotes') > 0, 'electric acceleration must start an audible oscillator'
        page.wait_for_function('window.__boostContexts.some(ctx => ctx.state === "running")',timeout=4000)
        for turn, side in [(0.4, 'bottom'), (-0.4, 'top')]:
            joint_y = 350 if side == 'bottom' else 330
            shift = 10 if side == 'bottom' else -10
            b_x = 390 + 90*math.cos(turn) + shift*math.sin(turn)
            b_y = joint_y + 90*math.sin(turn) - shift*math.cos(turn)
            trace = page.evaluate(f'''([bx,by,angle,side]) => {{
              const d={D};d.clearAll();
              d.addRod('electric',300,340,{{uid:'a',length:180}});
              d.addRod('electric',bx,by,{{uid:'b',angle,length:180}});
              d.selectRod(0);d.combineSelectedElectric();d.spawnBall();
              const r=d.getState().ball.radius;
              d.setBallState({{x:290,y:340+(side==='top' ? -(10+r-.6) : (10+r-.6)),
                vx:7,vy:side==='top' ? .6 : -.9,electricRide:null,specialContacts:[]}});
              d.stepPhysics(1);
              const entry=d.getState().ball.electricRide;
              const samples=[];
              for(let i=0;i<160;i++) {{ d.stepPhysics(1);if(i%4===0)samples.push(d.getState().ball); }}
              return {{links:d.getState().electricLinks,entry,samples}};
            }}''',[b_x,b_y,turn,side])
            assert len(trace['links']) == 1 and trace['entry'] and trace['entry']['side'] == side, (turn,trace)
            reached=[f for f in trace['samples'] if f['electricRide'] and f['electricRide']['rodUid']=='b']
            assert reached and all(f['electricRide']['direction'] == 1 for f in reached), (turn,trace)
        # Screenshot-shaped clockwise climb: the last steep red-marked joint must
        # not detach or reverse before the ball has reached the upper road.
        chain = page.evaluate(f'''() => {{
          const d={D};d.clearAll();
          const angles=[0,-.36,-.92,-1.50,-2.10], names=['a','b','c','d','e'];
          let x=270,y=590, last=null;
          for(let i=0;i<angles.length;i++) {{
            const angle=angles[i], length=i===0 ? 170 : 155;
            if(last) {{
              const turn=Math.cos(last.angle),rise=Math.sin(last.angle);
              const joint={{x:last.x+last.length/2*turn+10*rise,
                           y:last.y+last.length/2*rise-10*turn}};
              x=joint.x+length/2*Math.cos(angle)-10*Math.sin(angle);
              y=joint.y+length/2*Math.sin(angle)+10*Math.cos(angle);
            }}
            last=d.addRod('electric',x,y,{{uid:names[i],length,angle}});
            if(!last) return {{error:'rod rejected',index:i}};
            if(i) {{d.selectRod(i-1);d.combineSelectedElectric();}}
          }}
          const links=d.getState().electricLinks;
          d.spawnBall();const r=d.getState().ball.radius;
          d.setBallState({{x:240,y:590-10-r+.5,vx:7,vy:.6,electricRide:null,specialContacts:[]}});
          const visited=[],dropped=[];
          for(let i=0;i<450;i++) {{
            d.stepPhysics(1);
            const b=d.getState().ball;
            if(b?.electricRide) {{if(!visited.includes(b.electricRide.rodUid))visited.push(b.electricRide.rodUid);}}
            else if(visited.length && !visited.includes('e')) dropped.push({{step:i,after:visited.at(-1),x:b?.x,y:b?.y}});
            if(visited.includes('e')) break;
          }}
          return {{valid:links.map(link=>d.validElectricJoint(link)),visited,dropped}};
        }}''')
        assert chain.get('valid') == [True]*4 and chain['visited'] == ['a','b','c','d','e'] and not chain['dropped'], chain
        assert not errors, errors
        print(f'PASS {width}x{height}: block collisions, placement, bend/pivots, settings, pause/reset, linked ride')
        page.close()
    browser.close()
