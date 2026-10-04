"""Verify navigation and real origin storage in the imported game.

PIGGY_URL selects a live/local game URL; PIGGY_DASHBOARD_URL optionally checks
the dashboard link. Each run uses a fresh isolated browser profile.
"""
import json
import os
import zipfile
from pathlib import Path
from tempfile import TemporaryDirectory
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
url = os.environ.get('PIGGY_URL', 'http://127.0.0.1:4173/piggy-quest/index.html')
dashboard = os.environ.get('PIGGY_DASHBOARD_URL')
errors = []
checks = []


def check(name, value):
    assert value, name
    checks.append(name)


with sync_playwright() as pw, TemporaryDirectory() as temp:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=True)
    context = browser.new_context(accept_downloads=True, viewport={'width': 1280, 'height': 800})
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    response = page.goto(url)
    if response:
        check('HTTP response is 200', response.status == 200)
    page.wait_for_selector('#loading', state='hidden')
    check('All game art loads', page.evaluate('Object.values(PIGGY.Art.images).every(i=>i.complete&&i.naturalWidth>0)'))
    page.locator('#depart').click()
    x = page.evaluate('PIGGY.game.player.x')
    page.keyboard.down('d')
    page.wait_for_timeout(300)
    page.keyboard.up('d')
    check('Keyboard movement works at real origin', page.evaluate('PIGGY.game.player.x') > x + 20)
    page.evaluate("""() => {
        const p=PIGGY,g=p.game;
        g.progress.dead=['wind-main-0'];p.state.runCoins=37;
        g.player.hp=61;g.snapshot();g.mode='pause';
    }""")
    page.reload()
    page.wait_for_selector('#loading', state='hidden')
    check('Actual localStorage survives reload', page.evaluate("PIGGY.state.runCoins===37&&PIGGY.game.player.hp===61&&!PIGGY.game.enemies.some(e=>e.id==='wind-main-0')&&PIGGY.game.mode==='pause'"))
    page.locator('[data-close]').click()
    page.locator('#source-btn').click()
    page.locator('[data-source="src/game.js"]').click()
    check('Source viewer matches imported module', page.locator('#source-pre').inner_text() == (ROOT / 'piggy-quest/src/game.js').read_text())
    with page.expect_download() as download:
        page.locator('#source-zip').click()
    archive = Path(temp) / 'source.zip'
    download.value.save_as(str(archive))
    with zipfile.ZipFile(archive) as z:
        check('Downloaded ZIP has valid CRC', z.testzip() is None)
        check('Downloaded source matches repository', z.read('src/game.js') == (ROOT / 'piggy-quest/src/game.js').read_bytes())
    page.locator('[data-close]').click()
    if dashboard:
        response = page.goto(dashboard)
        check('Dashboard responds', response.status == 200)
        page.locator('#guestEntryButton').click()
        page.locator('.app-card[href="piggy-quest/index.html"]').click()
        page.wait_for_selector('#loading', state='hidden')
        check('Guest dashboard link opens game', '/piggy-quest/' in page.url)
    check('No JavaScript exceptions', not errors)
    browser.close()
print(json.dumps({'url': url, 'passed': len(checks), 'failed': 0, 'checks': checks}))
