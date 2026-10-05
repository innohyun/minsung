"""v0.9 actual HTTP verification: native sprite cycles, flat camera plane and unique attacks."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
URL=os.environ.get('PIGGY_URL','http://127.0.0.1:4173/piggy-quest/index.html')
OUT=Path(os.environ.get('PIGGY_TEST_OUTPUT','/tmp/piggy-v090-animation'));OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
def check(name,value):
 assert value,name
 checks.append(name);print('PASS',name,flush=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True);ctx=b.new_context(viewport={'width':1280,'height':720},has_touch=True);p=ctx.new_page();p.on('pageerror',lambda e:errors.append(str(e)))
 check('Real HTTP game responds 200',p.goto(URL).status==200);p.wait_for_selector('#loading',state='hidden')
 check('All 21 artwork resources decode',p.evaluate('Object.keys(PIGGY.Art.images).length===21&&Object.values(PIGGY.Art.images).every(i=>i.naturalWidth>0)'))
 p.locator('#depart').click();p.evaluate("PIGGY.game.mode='pause'")
 result=p.evaluate("""()=>{const P=PIGGY,g=P.game;return {version:P.VERSION,flat:P.MAPS.every(m=>Object.values(m.rooms).every(r=>r.route.every(v=>v.y===0)&&r.mapTrack.every(v=>v[1]===r.mapTrack[0][1]))),map:!P.World.chart(g).includes(' Q'),scroll:P.Pixel.backgroundPlan(100,'forest','camp').filter(a=>P.Pixel.backgroundPlan(170,'forest','camp').some(b=>b.id===a.id)).every(a=>{const b=P.Pixel.backgroundPlan(170,'forest','camp').find(b=>b.id===a.id);return Math.abs(a.x-b.x-70)<.001;}),seams:P.Pixel.backgroundPlan(500,'forest','camp').every((a,i,arr)=>i===0||Math.abs(a.x-(arr[i-1].x+arr[i-1].width))<.001)};}""")
 check('Game is v0.9.0',result['version']=='0.9.0');check('Every region and map track is horizontal and flat',result['flat']);check('Map connectors are straight segments',result['map']);check('Background moves exactly one camera pixel per world pixel',result['scroll']);check('Background sections abut with no translucent overlap',result['seams'])
 # Render genuine atlas frames at runtime, then compare screenshots of all four surface creatures.
 p.evaluate("""()=>{const P=PIGGY,g=P.game;g.player.x=650;g.player.vx=0;g.pig.x=650;g.camera=250;g.cameraY=0;g.roomTitle=0;g.helpers=[];g.enemies=['slime','boar','rock','bat'].map((type,i)=>g.makeEnemy({type,id:'review-'+i,x:750+i*210}));g.enemies.forEach(e=>e.active=true);g.draw();}""")
 p.screenshot(path=str(OUT/'surface-walk-0.png'));before=p.locator('#game').screenshot() if p.locator('#game').count() else p.locator('canvas').first.screenshot()
 frames=p.evaluate("""()=>{const P=PIGGY,g=P.game;return g.enemies.map(e=>{const n=P.Animation.frame(e).index;e.x+=16;P.Animation.advance(e,.16);const f=P.Animation.frame(e);return {old:n,next:f.index,count:P.Animation.meta[f.atlas].rows[f.row].frames.length};});}""")
 p.evaluate('PIGGY.game.draw()');after=p.locator('canvas').first.screenshot();p.screenshot(path=str(OUT/'surface-walk-1.png'))
 check('Three surface ground creatures have eight walk frames each',all(f['count']==8 for f in frames[:3]));check('Wing hunter has six wing poses',frames[3]['count']==6);check('All surface animation frames actually progress',all(f['old']!=f['next'] for f in frames));check('Rendered canvas pixels change with the animation',before!=after)
 p.evaluate("PIGGY.game.enemies.forEach(e=>e.animAttack={age:.55,duration:1});PIGGY.game.draw()");p.screenshot(path=str(OUT/'surface-attacks.png'))
 # Simulation fixtures retain the actual Game/Combat/Animation implementations.
 p.evaluate("""()=>{const P=PIGGY,g=P.game;window.scene=(type,dist=200)=>{g.clearInput();g.travel=null;g.mode='play';g.player.x=1600;g.player.y=600;g.player.vx=g.player.vy=0;g.player.grounded=true;g.player.dir=-1;g.player.inv=0;g.player.knock=null;g.player.pose='idle';g.player.dig=0;g.player.hp=100;g.pig.x=1600;g.pig.y=600;g.pig.hp=180;g.pig.carrying=false;g.helpers=[];g.fieldEffects=[];g.hazards=[];g.enemyShots=[];g.projectiles=[];g.camera=1190;g.cameraY=0;g.savedAt=0;g.enemies=[g.makeEnemy({id:'fixture-'+type,type,x:1600-dist})];const e=g.enemies[0];e.active=true;e.cd=0;P.state.skills.woodshield=0;return e;};window.steps=n=>{for(let i=0;i<n;i++)g.tick(1/60);};}""")
 result=p.evaluate("""()=>{const P=PIGGY,g=P.game,e=scene('cave-archer',250);steps(1);const start=e.animAttack&&P.Animation.frame(e).index===0;steps(39);const drawn=P.Animation.frame(e).index===2&&g.enemyShots.length===0;steps(4);const released=P.Animation.frame(e).index===3&&g.enemyShots.some(s=>s.type==='arrow');steps(14);const reloading=P.Animation.frame(e).index===4;g.mode='pause';const time=e.animAttack.age;g.tick(.5);const paused=e.animAttack.age===time;g.draw();return {start,drawn,released,reloading,paused};}""")
 for name,key in [('Archer retrieves an arrow before aiming','start'),('Full draw precedes projectile creation','drawn'),('Arrow appears when the sprite releases its bow','released'),('Archer reaches the quiver again to reload','reloading'),('Pause freezes combat sprite recovery','paused')]:check(name,result[key])
 p.screenshot(path=str(OUT/'archer-reload.png'))
 result=p.evaluate("""()=>{const P=PIGGY,g=P.game,e=scene('cave-guard',55);steps(1);steps(19);const raised=P.Animation.frame(e).index===2;steps(11);const impact=P.Animation.frame(e).index===3&&g.player.hp<100;steps(10);const low=P.Animation.frame(e).index===4;steps(10);const back=P.Animation.frame(e).index===5;g.mode='pause';return {raised,impact,low,back};}""")
 check('Crystal guard raises arms, strikes, crouches and recovers',all(result.values()))
 result=p.evaluate("""()=>{const P=PIGGY,g=P.game,e=scene('cave-charger',200);steps(1);steps(26);const rears=P.Animation.frame(e).index===1;steps(36);const airborne=g.player.knock?.stage==='air'&&g.player.y<600&&g.player.vx>0;g.mode='pause';g.draw();return {rears,airborne};}""")
 check('Charger rears up before its galloping attack',result['rears']);check('Charge hit sends the player backward and airborne',result['airborne']);p.screenshot(path=str(OUT/'charge-fall.png'))
 result=p.evaluate("""()=>{const g=PIGGY.game;g.mode='play';g.enemies=[];let down=false,getup=false;for(let i=0;i<80;i++){g.tick(1/60);if(g.player.knock?.stage==='down'){down=true;g.draw();}if(g.player.knock?.stage==='getup')getup=true;}g.mode='pause';return {down,getup,recovered:!g.player.knock&&g.player.grounded&&g.player.y===600};}""")
 check('Knocked player lands, lies down, gets up and regains control',all(result.values()))
 result=p.evaluate("""()=>{const P=PIGGY,g=P.game,e=scene('cave-charger',30);P.state.skills.woodshield=1;g.player.shieldRaised=true;g.player.dir=-1;g.hurt({kind:'player',x:1600,y:600,actor:g.player},24,1570,true);const guarded=!g.player.knock&&g.shieldHits>0&&g.player.hp>90;P.state.skills.woodshield=0;g.player.inv=0;g.pig.carrying=true;g.hurt({kind:'player',x:1600,y:600,actor:g.player},24,1570,true);const dropped=!g.pig.carrying&&g.pig.y===600&&g.pig.hp===180;g.mode='pause';return {guarded,dropped};}""")
 check('Frontal wooden guard prevents the charge knockdown',result['guarded']);check('Knockdown sets carried ceramic safely on the ground without deleting it',result['dropped'])
 result=p.evaluate("""()=>{const P=PIGGY,g=P.game,e=scene('boar',120);steps(33);const trap=g.fieldEffects.some(f=>f.kind==='spikes');const nocharge=!e.charging&&e.x===1480;g.mode='pause';g.draw();return {trap,nocharge};}""")
 check('Surface quadruped creates spikes without copying cave charge',result['trap'] and result['nocharge']);p.screenshot(path=str(OUT/'spike-trap.png'))
 result=p.evaluate("""()=>{const P=PIGGY,g=P.game,e=scene('rock',60);steps(24);const guard=e.guardTime>0,old=e.hp;g.hitEnemy(e,20);const reduced=old-e.hp===7;e.stun=0;g.projectiles=[{x:e.x-8,y:510,vx:560,life:1,damage:36,type:'fire'}];steps(1);const reflected=g.projectiles.length===0&&g.enemyShots.some(b=>b.type==='reflected'&&b.vx<0);g.mode='pause';return {guard,reduced,reflected};}""")
 check('Iron sentinel guard reduces melee damage and reflects a real projectile',all(result.values()))
 result=p.evaluate("""()=>{const P=PIGGY,g=P.game,e=scene('bat',80);steps(34);const cloud=g.fieldEffects.some(f=>f.kind==='poison');const noarrow=g.enemyShots.length===0;g.mode='pause';g.draw();return {cloud,noarrow};}""")
 check('Wing hunter drops poison instead of cave arrows',result['cloud'] and result['noarrow']);p.screenshot(path=str(OUT/'poison-cloud.png'))
 p.evaluate("""()=>{const P=PIGGY,g=P.game;scene('slime',300);g.enemies=[];P.state.skills.woodshield=1;g.player.shieldRaised=true;g.player.dir=1;g.mode='pause';g.draw();}""");p.screenshot(path=str(OUT/'shield-right.png'))
 p.evaluate("PIGGY.game.player.dir=-1;PIGGY.game.draw()");p.screenshot(path=str(OUT/'shield-left.png'))
 result=p.evaluate("""()=>{const P=PIGGY,g=P.game;const s=P.Combat.shieldBox(g);return s.x<g.player.x&&P.Animation.meta['shield-motion'].rows[0].frames.length===2;}""")
 check('Left/right shield artwork and the forward collision side agree',result)
 p.evaluate("PIGGY.UI.worldMap()");p.screenshot(path=str(OUT/'flat-map.png'));p.locator('[data-close]').click()
 check('No browser JavaScript exceptions',not errors)
 b.close()
(OUT/'animation-results.json').write_text(json.dumps({'version':'0.9.0','url':URL,'passed':len(checks),'failed':0,'checks':checks,'errors':errors,'method':'Real HTTP Chromium, native image decoding, actual Game fixed-step fixtures plus screenshots; no native Safari claim.'},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'passed':len(checks),'failed':0,'errors':errors}))
