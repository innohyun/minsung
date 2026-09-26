from playwright.sync_api import sync_playwright

URL = 'http://127.0.0.1:8765/marble-builder/'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args=['--no-sandbox'])
    for width, height in [(390, 844), (1280, 800)]:
        context = browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=1, has_touch=width < 500, is_mobile=width < 500)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(URL)
        page.wait_for_timeout(800)
        assert not errors, errors
        assert page.locator('#freeModeButton').is_visible()
        page.locator('#ballWorkshopButton').click()
        assert page.locator('#ballEditor').is_visible()
        rect = page.locator('#ballEditor').bounding_box()
        page.mouse.move(rect['x'] + rect['width'] * .5, rect['y'] + rect['height'] * .5)
        page.mouse.down()
        page.mouse.move(rect['x'] + rect['width'] * .62, rect['y'] + rect['height'] * .5, steps=8)
        page.mouse.up()
        page.locator('#workshopSave').click()
        assert page.locator('#workshopPosition').inner_text().startswith('내 공 1')
        page.locator('#editBall').click()
        page.locator('#pixelEraser').click()
        page.locator('#pencilTool').click()
        page.locator('#ballPhotoInput').set_input_files('assets/marble-builder/platforms/wood.png')
        page.wait_for_function('document.getElementById("photoCropDialog").open', timeout=5000)
        assert page.locator('#photoCropDialog').evaluate('(el) => el.open')
        page.locator('#photoZoom').fill('1.5')
        page.locator('#photoZoom').dispatch_event('input')
        page.locator('#applyPhoto').click()
        page.wait_for_timeout(150)
        page.locator('#workshopSave').click()
        assert page.evaluate('JSON.parse(localStorage.getItem("marble-builder-custom-balls-v1"))[0].layers.some(l => l.kind === "photo")')
        page.locator('#workshopHome').click()
        page.locator('#freeModeButton').click()
        state = page.evaluate('window.__marbleBuilderDebug.getState()')
        circle_x = (state['spawn']['x'] - state['camera']['x']) * state['camera']['zoom']
        circle_y = (state['spawn']['y'] - state['camera']['y']) * state['camera']['zoom']
        if width < 500: page.touchscreen.tap(circle_x, circle_y)
        else: page.mouse.click(circle_x, circle_y)
        assert page.locator('#ballQueueDialog').evaluate('(el) => el.open'), '점선 원 터치로 공 설정이 열리지 않음'
        page.locator('#ballChoices button').last.click()
        page.locator('#ballChoices button').first.click()
        assert page.locator('#ballQueueList li').count() == 2
        page.locator('#ballLaunchMode').select_option('auto')
        page.locator('#ballInterval').fill('0.2')
        page.locator('#closeBallQueue').click()
        page.wait_for_timeout(400)
        state = page.evaluate('window.__marbleBuilderDebug.getState()')
        assert [item['type'] for item in state['activeBalls']] == state['ballQueue'] and state['queueIndex'] == 2, state
        assert state['activeBalls'][0]['x'] != state['activeBalls'][1]['x'] or state['activeBalls'][0]['y'] != state['activeBalls'][1]['y'], state
        assert not errors, errors
        page.locator('#resetButton').click()
        page.locator('#ballTypeButton').click()
        page.locator('#ballLaunchMode').select_option('manual')
        page.locator('#closeBallQueue').click()
        page.locator('#resetButton').click()
        page.locator('#spawnButton').click()
        page.locator('#spawnButton').click()
        state = page.evaluate('window.__marbleBuilderDebug.getState()')
        assert [item['type'] for item in state['activeBalls']] == state['ballQueue'] and state['queueIndex'] == 2, state
        page.locator('#spawnButton').click()
        assert page.evaluate('window.__marbleBuilderDebug.getState().activeBalls.length') == 2
        page.locator('#homeButton').click()
        page.locator('#stageModeButton').click()
        assert page.locator('#stageList').is_visible()
        if page.locator('.stage-play:not([disabled])').count():
            page.locator('.stage-play:not([disabled])').first.click()
            stage_state = page.evaluate('window.__marbleBuilderDebug.getState()')
            x = (stage_state['spawn']['x'] - stage_state['camera']['x']) * stage_state['camera']['zoom']
            y = (stage_state['spawn']['y'] - stage_state['camera']['y']) * stage_state['camera']['zoom']
            if width < 500: page.touchscreen.tap(x, y)
            else: page.mouse.click(x, y)
            assert page.locator('#ballQueueDialog').evaluate('(el) => el.open'), '스테이지 점선 원 터치 실패'
            page.locator('#closeBallQueue').click()
        assert not errors, errors
        print('PASS', width, height, 'workshop, sequential auto/manual multi-ball, reset, stage menu')
        context.close()
    browser.close()
