"""Read-only map recovery UI keeps original localStorage values intact."""
import json
import os
from playwright.sync_api import sync_playwright

url=os.getenv('MARBLE_URL','http://127.0.0.1:8765/marble-builder/')
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    for mobile in (False,True):
        context=browser.new_context(viewport={'width':390 if mobile else 1280,'height':844},is_mobile=mobile,has_touch=mobile,accept_downloads=True)
        context.add_init_script("""if (!localStorage.getItem('marble-builder-stages-v1')) {
          localStorage.setItem('marble-builder-stages-v1', '[{"id":"my-stage","number":2}]');
          localStorage.setItem('marble-builder-creations-v1', '[{"id":"my-map","name":"원래 맵"}]');
        }""")
        page=context.new_page()
        page.goto(url+'recovery.html',wait_until='networkidle')
        assert '1개 항목' in page.locator('#entries').inner_text()
        before=page.evaluate('''() => Object.fromEntries(['marble-builder-stages-v1','marble-builder-creations-v1']
          .map(key=>[key,localStorage.getItem(key)]))''')
        with page.expect_download() as info:
            if mobile: page.locator('#download').tap()
            else: page.locator('#download').click()
        download=info.value
        contents=json.loads(download.path().read_text())
        assert contents['values']['marble-builder-stages-v1']==before['marble-builder-stages-v1']
        assert contents['values']['marble-builder-creations-v1']==before['marble-builder-creations-v1']
        after=page.evaluate('''() => Object.fromEntries(['marble-builder-stages-v1','marble-builder-creations-v1']
          .map(key=>[key,localStorage.getItem(key)]))''')
        assert before==after
        print('mobile' if mobile else 'desktop','recovery export preserved stages/creations',page.url,flush=True)
        context.close()
    browser.close()
