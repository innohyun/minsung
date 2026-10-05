"""HTTP regressions for the v0.3 movement, restart and map revision."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('PIGGY_TEST_OUTPUT', '/tmp/piggy-v03-revision'))
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('PIGGY_URL', 'http://127.0.0.1:4173/piggy-quest/index.html')
checks, errors = [], []


def check(name, value):
    assert value, name
    checks.append(name)


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    check('Real HTTP game responds', page.goto(URL).status == 200)
    page.wait_for_selector('#loading', state='hidden')
    check('Updated game boots', page.evaluate("PIGGY.VERSION==='0.6.0'"))
    check('Text selection disabled and Safari callout rule included', page.evaluate("getComputedStyle(document.body).userSelect==='none'&&PIGGY.SOURCE_FILES['styles.css'].includes('-webkit-touch-callout:none')"))
    context.grant_permissions(['clipboard-read', 'clipboard-write'])
    page.locator('#source-btn').click()
    page.locator('[data-source="src/motion.js"]').click()
    page.locator('#copy-file').click()
    page.wait_for_function("document.getElementById('toast').textContent==='내용을 복사했어요.'")
    check('Source copy button still copies exact code', page.evaluate('navigator.clipboard.readText()') == (ROOT / 'piggy-quest/src/motion.js').read_text())
    page.locator('[data-close]').click()
    page.locator('#depart').click()
    check('Player stands in the dirt road center', page.evaluate('PIGGY.game.player.y===(PIGGY.CONFIG.roadTop+PIGGY.CONFIG.roadBottom)/2'))
    x = page.evaluate('PIGGY.game.player.x')
    page.keyboard.down('d')
    page.wait_for_timeout(350)
    page.keyboard.up('d')
    check('Walking advances the distance-driven full-body gait', page.evaluate(f'PIGGY.game.player.x>{x}+30&&PIGGY.game.player.walkDistance>30&&PIGGY.game.player.walkBlend>.5'))

    page.evaluate("""()=>{
      const P=PIGGY,g=P.game;g.mode='pause';g.enemies=[];g.helpers=[];
      g.player.hp=61;P.state.coins=777;P.state.runCoins=13;
      g.progress.dead=['wind-main-0'];P.state.settings.sound=false;g.snapshot();
      P.UI.pause();
    }""")
    page.locator('#restart-pause').click()
    check('Restart waits for explicit confirmation and freezes combat', page.evaluate("PIGGY.state.coins===777&&PIGGY.game.mode==='pause'"))
    page.locator('#cancel-new-game').click()
    check('Cancel preserves progress and resumes expedition', page.evaluate("PIGGY.state.coins===777&&PIGGY.state.runCoins===13&&PIGGY.game.player.hp===61&&PIGGY.game.progress.dead.includes('wind-main-0')&&PIGGY.game.mode==='play'"))
    page.locator('#pause').click()
    page.locator('#restart-pause').click()
    with page.expect_download() as download:
        page.locator('#confirm-new-game').click()
    backup = OUT / 'before-new-game.json'
    download.value.save_as(str(backup))
    saved = json.loads(backup.read_text())
    check('Restart downloads the complete previous progress', saved['coins'] == 777 and saved['runCoins'] == 13 and saved['player']['hp'] == 61 and saved['progress']['wind']['dead'] == ['wind-main-0'])
    check('Confirmed restart resets progression and retains settings', page.evaluate("PIGGY.state.coins===120&&PIGGY.state.runCoins===0&&PIGGY.state.unlocked.length===1&&PIGGY.state.player.hp===100&&!PIGGY.state.active&&!PIGGY.state.settings.sound&&PIGGY.game.mode==='home'"))
    page.reload()
    page.wait_for_selector('#loading', state='hidden')
    check('Fresh game persists through actual origin reload', page.evaluate('PIGGY.state.coins===120&&!PIGGY.state.active&&PIGGY.state.settings.sound&&PIGGY.state.progress.wind.dead.length===0'))

    # Simulate traversal and clearing without inventing or buying movement skills.
    for map_id in ['wind', 'amber', 'brook']:
        values = page.evaluate("""id=>{
          const P=PIGGY,g=P.game;P.state=P.State.fresh();P.state.unlocked=P.MAPS.map(m=>m.id);
          P.UI.depart(id);g.helpers=[];P.state.party=[];const map=g.map;
          const portals=[],rooms=[];
          for(const [roomId,room] of Object.entries(map.rooms)){
            g.loadRoom(roomId);
            for(const e of g.enemies)g.hitEnemy(e,99999);
            rooms.push(g.enemies.every(e=>e.hp===0));
            for(const portal of room.portals){
              g.loadRoom(roomId);g.player.x=portal.x;g.pig.x=portal.x;g.pig.carrying=true;
              g.player.y=portal.secret?P.CONFIG.ground-portal.height:P.CONFIG.ground;g.interact();for(let n=0;n<72;n++)g.tick(1/60);portals.push(g.roomId===portal.target&&Math.abs(g.player.x-portal.spawn)<1&&g.pig.carrying);
            }
          }
          g.loadRoom('main');const boss=g.enemies.find(e=>e.type==='boss');
          const gate=g.remaining()===0&&!!boss;
          const asset=boss&&g.enemyConfig(boss).asset;
          if(boss){g.hitEnemy(boss,99999);g.tick(1/60);}
          const next=P.MAPS[P.MAPS.indexOf(map)+1];
          const cleared=g.progress.cleared&&!P.state.active&&(!next||P.state.unlocked.includes(next.id));
          g.mode='pause';return {portals:portals.every(Boolean),rooms:rooms.every(Boolean),gate,cleared,asset,skills:Object.keys(P.state.skills).length};
        }""", map_id)
        check(map_id + ': connected rooms, reachable boss and settlement', values['portals'] and values['rooms'] and values['gate'] and values['cleared'] and values['skills'] == 0)
        check(map_id + ': correct unique boss art', values['asset'] == {'wind': 'boss', 'amber': 'boss-amber', 'brook': 'boss-brook'}[map_id])

    for map_id in ['amber', 'brook']:
        values = page.evaluate("""id=>{
          const P=PIGGY,g=P.game;P.state=P.State.fresh();P.state.unlocked=P.MAPS.map(m=>m.id);
          P.UI.depart(id);g.helpers=[];P.state.party=[];g.progress.dead=P.allEnemies(g.map).map(e=>e.id);g.loadRoom('main');
          const boss=g.enemies.find(e=>e.type==='boss');g.enemies=[boss];boss.x=500;boss.active=true;boss.windup=.001;boss.pattern='slam';boss.attackDir=1;boss.cd=99;
          g.player.x=375;g.pig.x=375;g.pig.carrying=false;g.tick(1/60);
          const telegraph=g.hazards.length===(id==='brook'?2:1)&&g.hazards.every(h=>h.age<.35&&h.radius===0);boss.cd=99;
          g.mode='pause';const age=g.hazards[0].age,time=g.time,hp=g.player.hp;g.tick(2);
          const frozen=g.hazards[0].age===age&&g.time===time&&g.player.hp===hp;
          g.mode='play';for(let i=0;i<110;i++)g.tick(1/60);
          const once=g.player.hp<100&&g.hazards.every(h=>h.hit.has('player')&&[...h.hit].filter(x=>x==='player').length===1);
          const after=g.player.hp;for(let i=0;i<80;i++)g.tick(1/60);
          const ended=g.hazards.length===0&&g.player.hp===after;
          g.mode='pause';return {telegraph,frozen,once,ended};
        }""", map_id)
        check(map_id + ': warning, pause and one hit per shockwave '+str(values), all(values.values()))

    # Actual Canvas output: walking phases and both punches, kick and carrying.
    page.evaluate("""()=>{
      PIGGY.UI.home();document.getElementById('toast').classList.remove('show');const canvas=document.createElement('canvas');canvas.id='pose-sheet';canvas.width=1280;canvas.height=600;
      canvas.style='width:1280px;height:600px';document.body.append(canvas);
      const c=canvas.getContext('2d');c.fillStyle='#eef0e6';c.fillRect(0,0,1280,600);
      c.fillStyle='#cfc38a';c.fillRect(0,218,1280,82);c.fillRect(0,500,1280,85);
      for(let i=0;i<8;i++){PIGGY.Art.stick(c,75+i*158,260,{walkBlend:1,phase:i/8});PIGGY.Art.label(c,'걷기 '+i,75+i*158,286,14);}
      const poses=[{pose:'idle'},{pose:'punch',age:.09},{pose:'punch',age:.29},{pose:'kick',age:.045},{pose:'kick',age:.17},{carrying:true}];
      poses.forEach((p,i)=>{PIGGY.Art.stick(c,96+i*211,546,p);PIGGY.Art.label(c,['서기','앞 주먹','반대 주먹','빠른 발차기','회수','운반'][i],96+i*211,579,14);});
    }""")
    page.locator('#pose-sheet').screenshot(path=str(OUT / 'pose-sheet.png'))
    page.goto(URL)
    page.wait_for_selector('#loading', state='hidden')
    page.evaluate("""()=>{const P=PIGGY;P.state=P.State.fresh();P.state.unlocked=P.MAPS.map(m=>m.id);P.UI.depart('brook');const g=P.game;g.player.x=6500;g.pig.x=6500;g.pig.carrying=true;g.pig.y=P.CONFIG.ground-P.CONFIG.carryHeight;g.camera=6090;g.roomTitle=0;g.mode='pause';g.draw();}""")
    page.wait_for_timeout(200)
    page.screenshot(path=str(OUT / 'brook-map.png'))
    check('No browser JavaScript exceptions: '+str(errors), not errors)
    browser.close()
result = {'url': URL, 'passed': len(checks), 'failed': 0, 'checks': checks}
(OUT / 'revision-results.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
print(json.dumps(result, ensure_ascii=False))
