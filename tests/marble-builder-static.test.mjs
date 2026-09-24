import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMinsungServer } from '../server.mjs';

const html = readFileSync(new URL('../marble-builder/index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../marble-builder/game.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../marble-builder/styles.css', import.meta.url), 'utf8');
const assetManifest = JSON.parse(readFileSync(new URL('../assets/marble-builder/assets.json', import.meta.url), 'utf8'));

test('marble builder uses the current cache-busted game script', () => {
    assert.match(html, /game\.js\?v=16/);
    assert.match(html, /styles\.css\?v=14/);
    assert.match(html, /rel="icon" href="data:,"/);
});

test('marble builder exposes spawn controls, draggable roads, and a basket goal', () => {
    assert.match(html, /id="spawnButton"/);
    assert.doesNotMatch(html, /id="clearButton"|전체 삭제/);
    assert.match(html, /id="deleteButton"[^>]*>선택 삭제</);
    assert.match(html, /id="resetButton"[^>]*>리셋</);
    assert.match(html, /id="confirmButton"[^>]*>확인</);
    assert.doesNotMatch(html, /다시 굴리기/);
    assert.match(script, /const BLOCK_CATALOG = \[/);
    assert.match(script, /type: 'wood'/);
    const catalog = script.match(/const BLOCK_CATALOG = \[([\s\S]*?)\n  \];/)?.[1] || '';
    assert.doesNotMatch(catalog, /type: 'rubber'|type: 'steel'/);
    assert.match(script, /type: 'goal'/);
    assert.match(script, /label: '골인 바구니'/);
    assert.match(script, /function beginPlacement/);
    assert.match(script, /function addGoal/);
    assert.match(script, /function rodEndpoints/);
    assert.match(script, /'start'/);
    assert.match(script, /'end'/);
    assert.match(script, /'move'/);
});

test('marble builder uses earth gravity, fixed substeps, friction, and disc inertia', () => {
    assert.match(script, /const PIXELS_PER_METER = 100/);
    assert.match(script, /const EARTH_GRAVITY = 9\.81/);
    assert.match(script, /const FIXED_STEP = 1 \/ 120/);
    assert.match(script, /const BALL_INERTIA = 0\.5 \* BALL_MASS/);
    assert.match(script, /maxFriction = rect\.material\.friction \* normalImpulse/);
    assert.match(script, /rollingResistance:/);
    assert.match(script, /function applyRollingResistance/);
    assert.match(script, /EARTH_GRAVITY \* contact\.resistance \* dt/);
    assert.match(script, /const gravityAlongTangent = EARTH_GRAVITY \* ty/);
    assert.match(script, /const movingDownhill = tangentSpeed \* gravityAlongTangent > 0/);
    assert.match(script, /Math\.abs\(gravityAlongTangent\) \* dt \* 0\.85/);
    assert.match(script, /const nearlyLevel = Math\.abs\(ty\) < 0\.005/);
    assert.match(script, /function getImpactRestitution/);
    assert.match(script, /impactSpeed < 0\.3/);
    assert.match(script, /ball\.omega/);
});

test('marble builder uses an unbounded world with camera pan and four-times zoom-out', () => {
    assert.match(script, /const MIN_ZOOM = 0\.25/);
    assert.match(script, /const MAX_ZOOM = 1/);
    assert.match(script, /function screenToWorld/);
    assert.match(script, /function setZoomAt/);
    assert.match(script, /function beginPinch/);
    assert.match(script, /activePointers\.size >= 2/);
    assert.match(script, /cameraDrag = \{/);
    assert.match(script, /addEventListener\('wheel'/);
    assert.doesNotMatch(script, /resolveBallRect\(\{ x: view\.width \/ 2/);
    assert.doesNotMatch(script, /ball\.y > view\.height/);
});

test('marble builder keeps its gameplay actions responsive', () => {
    assert.match(styles, /\.top-actions \{[^}]*display: flex[^}]*overflow-x: auto/s);
    assert.doesNotMatch(styles, /\.action\.danger \{ position: absolute/);
});

test('marble builder removes clear-all while preserving reset and goal confirmation behavior', () => {
    assert.match(script, /function clearAll\(\)/);
    assert.match(script, /function resetGame\(\)/);
    assert.doesNotMatch(script, /clearButton\.addEventListener/);
    assert.match(script, /resetButton\.addEventListener\('click', resetGame\)/);
    assert.match(script, /confirmButton\.addEventListener\('click',[\s\S]*successPanel\.hidden = true/);
    const resetBody = script.match(/function resetGame\(\) \{([\s\S]*?)\n  \}/)?.[1] || '';
    assert.doesNotMatch(resetBody, /resetCamera\(\)/);
});

test('marble builder waits one second after basket entry before success', () => {
    assert.match(script, /const GOAL_SUCCESS_DELAY = 1/);
    assert.match(script, /goalEnteredAt = performance\.now\(\)/);
    assert.match(script, /\(performance\.now\(\) - goalEnteredAt\) \/ 1000/);
    assert.match(script, /goalHoldTime >= GOAL_SUCCESS_DELAY/);
});

test('marble builder is responsive and touch enabled', () => {
    assert.match(styles, /touch-action: none/);
    assert.match(styles, /@media \(max-width: 720px\)/);
    assert.match(script, /addEventListener\('pointerdown'/);
    assert.match(script, /pointerType === 'touch'/);
    assert.match(html, /viewport-fit=cover/);
    assert.match(styles, /\.app-dialog input[^}]*font-size: 16px/);
    assert.match(styles, /height: 100dvh/);
    assert.match(styles, /#gameCanvas \{ position: absolute; inset: 0;[^}]*width: 100%; height: 100%/);
    assert.match(script, /const rect = canvas\.getBoundingClientRect\(\)/);
    assert.doesNotMatch(script, /canvas\.style\.height/);
    assert.match(script, /new ResizeObserver\(resize\)\.observe\(gameShell\)/);
    assert.doesNotMatch(styles, /body\.is-editor \.top-panel/);
    assert.doesNotMatch(styles, /body\.is-editor \.tool-dock/);
    assert.match(styles, /body\.is-editor #spawnButton, body\.is-editor #resetButton \{ display: none; \}/);
    assert.match(script, /mode: event\.pointerType === 'touch' \? 'pending' : 'drag'/);
    assert.match(script, /toolList\.scrollLeft -= event\.clientX - placement\.lastX/);
    assert.match(script, /screen\.y >= view\.playTop \+ 5/);
    assert.match(script, /view\.width \/ Math\.max\(1, rect\.width\)/);
    assert.match(script, /camera\.zoom = MAX_ZOOM/);
});

test('marble builder keeps free mode and adds home and stage progression at fixed speed', () => {
    assert.match(html, /id="homeScreen"/);
    assert.match(html, /id="homeButton"/);
    assert.match(html, /id="freeModeButton"[^>]*[\s\S]*자유 모드/);
    assert.match(html, /id="stageModeButton"/);
    assert.doesNotMatch(html, /data-speed=/);
    assert.match(script, /function startFreeMode/);
    assert.match(script, /function loadStage/);
    assert.match(script, /const allRodsTouched = rods\.length > 0/);
    assert.match(script, /const allSuppliesUsed = stageSupplies\.length === 0/);
    assert.match(script, /allSuppliesUsed && allRodsTouched/);
    assert.match(script, /unlockedStage = Math\.max\(unlockedStage, currentStage\.number \+ 1\)/);
    assert.match(script, /accumulator \+= elapsed;/);
    assert.doesNotMatch(script, /gameSpeed|SPEED_STORAGE_KEY/);
});

test('developer mode gates stage creation, editing, and confirmed deletion', () => {
    assert.match(html, /id="developerButton"/);
    assert.match(html, /id="mapMakerButton"[^>]*hidden/);
    assert.doesNotMatch(html, /data-tool="fixed"/);
    assert.doesNotMatch(script, /fixed: \{ label: '고정 스틱'/);
    assert.match(html, /id="blockCatalogDialog"/);
    assert.match(html, /id="toggleFixedButton"[^>]*>고정</);
    assert.match(script, /function toggleSelectedFixed/);
    assert.match(script, /selected\.fixed = !selected\.fixed/);
    assert.doesNotMatch(script, /className = 'fixed-choice'/);
    assert.match(html, /정말 삭제하시겠습니까/);
    assert.match(script, /const DEVELOPER_PASSWORD = '12345@'/);
    assert.match(script, /developerPassword\.value !== DEVELOPER_PASSWORD/);
    assert.match(script, /function saveEditedStage/);
    assert.match(script, /edit\.textContent = '수정'/);
    assert.match(script, /remove\.textContent = '삭제'/);
    assert.match(script, /'rotateFixed'/);
    assert.match(script, /appMode === 'editor' && selected\.fixed/);
    assert.match(script, /appMode === 'stage' && selected\.fixed/);
    assert.match(script, /fixedBlocks/);
    assert.match(script, /supplyBlocks/);
    assert.match(script, /angleLocked: appMode === 'stage'/);
    assert.match(script, /appMode === 'editor' && !rod\.fixed \? 0\.42 : 1/);
});

test('default stage one is removed without deleting user-created stage one', () => {
    assert.doesNotMatch(script, /id: 'stage-1', number: 1/);
    assert.match(script, /stages\.filter\(stage => stage\.id !== 'stage-1'\)/);
    assert.match(script, /const firstStageNumber = stages\.reduce/);
    assert.match(script, /unlockedStage = Math\.max\(Number\.isFinite\(firstStageNumber\)/);
});

test('block inventory scrolls, keeps eight recent tools, and stage setup only asks for a number', () => {
    assert.match(html, /id="toolList" class="tool-list"/);
    assert.match(styles, /\.tool-list[^}]*overflow-x: auto[^}]*touch-action: none/s);
    assert.match(script, /const MAX_RECENT_TOOLS = 8/);
    assert.match(script, /className = 'tool-card more-card'/);
    assert.match(script, /recentTools = \[key, \.\.\.recentTools/);
    assert.match(html, /id="stageNumberInput"/);
    assert.doesNotMatch(html, /id="woodLimitInput"|id="rubberLimitInput"|id="steelLimitInput"/);
});

test('marble builder supports creations, follow camera, mandatory sound, special materials, and history', () => {
    assert.match(html, /id="creationsList"/);
    assert.match(html, /id="saveMapButton"/);
    assert.match(html, /id="followButton"/);
    assert.doesNotMatch(html, /id="soundButton"/);
    assert.match(html, /id="undoButton"/);
    assert.match(html, /id="redoButton"/);
    assert.match(html, /class="dock-side"[\s\S]*id="undoButton"[\s\S]*id="redoButton"/);
    assert.match(script, /const CREATIONS_STORAGE_KEY = 'marble-builder-creations-v1'/);
    assert.match(script, /function saveCreation/);
    assert.match(script, /function undoLastAction/);
    assert.match(script, /toolSettings: clone\(toolSettings\)/);
    assert.match(script, /if \(snapshot\.toolSettings\)/);
    assert.match(script, /if \(apply && sizingMode\?\.preview\) \{\s*pushUndo\(\)/);
    assert.match(script, /followBall && ball/);
    assert.match(script, /type: 'slime'/);
    assert.match(script, /reboundSpeed\(fallDistanceMeters, 2 \/ 3\)/);
    assert.match(script, /const ELECTRIC_ATTACH_ANGLE = Math\.PI \/ 6/);
    assert.match(script, /const ELECTRIC_SPEED_MULTIPLIER = 4 \/ 3/);
    assert.match(script, /angleFromSurface <= ELECTRIC_ATTACH_ANGLE/);
    assert.match(script, /incomingVx - 2 \* dot \* nx/);
    assert.match(script, /function updateElectricRide/);
    assert.match(script, /ride\.speed = Math\.min\(ELECTRIC_MAX_SPEED/);
    assert.match(script, /rect\.source\.electricPulse = 0\.45/);
    assert.match(script, /rod\.electricPulse > 0/);
    assert.match(script, /ball\.fallPeakY = ball\.y/);
    assert.match(script, /type: 'electric'/);
    assert.match(script, /type: 'antigravity'/);
    assert.match(script, /function playImpactSound/);
    assert.match(script, /function updateRollingSound/);
    assert.match(script, /function makeSoftNoiseBuffer/);
    assert.match(script, /knockFilter\.type = 'lowpass'/);
    assert.match(script, /body\.type = 'sine'/);
    assert.match(script, /tone\.type = 'sine'/);
    assert.doesNotMatch(script, /rollingAudio\.osc\.type|osc\.type = slime \? 'sine'/);
    assert.match(styles, /\.tool-icon\.road[^}]*border-radius: 0/);
    assert.match(script, /function drawPlatformAsset/);
    assert.match(script, /platformImages\[rod\.type\]/);
    assert.match(script, /audioCompressor = audioContext\.createDynamicsCompressor/);
    assert.match(script, /audio\.currentTime - rollingAudio\.lastContactAt > \.12/);
});

test('basket overlap is rejected for new and moved blocks', () => {
    assert.match(script, /function rodOverlapsAnyGoal/);
    assert.match(script, /function goalOverlapsAnyRod/);
    assert.match(script, /골인 바구니와 블록은 겹칠 수 없습니다/);
    assert.match(script, /restoreWorld\(editDrag\.beforeSnapshot\)/);
});

test('basket has no decorative inner lines and uses exact wall collision geometry', () => {
    assert.doesNotMatch(styles, /tool-icon\.basket::before/);
    assert.doesNotMatch(script, /for \(let x = left \+ 24/);
    assert.doesNotMatch(script, /const collisionInset = 3/);
    assert.match(script, /function basketRects/);
    assert.match(script, /const t = goal\.thickness \+ 4/);
    assert.match(script, /ball\.radius - \(rect\.collisionInset \|\| 0\)/);
    assert.match(script, /basketRects\(goal\)\.forEach\(rect =>/);
});

test('marble builder registers and uses the named flat material assets', () => {
    assert.deepEqual(assetManifest.assets.map(asset => asset.name), ['나무', '슬라임', '전기']);
    for (const asset of assetManifest.assets) {
        assert.equal(asset.alpha, true);
        assert.match(asset.runtime, /^platforms\/(wood|slime|electric)\.png$/);
    }
    assert.match(html, /assets\/marble-builder\/platforms\/wood\.png/);
    assert.match(html, /assets\/marble-builder\/platforms\/slime\.png/);
    assert.match(html, /assets\/marble-builder\/platforms\/electric\.png/);
    assert.match(styles, /url\('\/assets\/marble-builder\/platforms\/wood\.png'\)/);
    assert.match(script, /const PLATFORM_ASSET_URLS = \{/);
});

test('electric platforms support corner joints, group editing, and persistent attached tracks', () => {
    assert.match(html, /id="combineElectricButton"[^>]*>결합</);
    assert.match(html, /id="detachElectricButton"[^>]*>해제</);
    assert.match(html, /id="convertElectricButton"[^>]*>변환</);
    assert.match(script, /const ELECTRIC_MIN_JOINT_ANGLE = Math\.PI \/ 2/);
    assert.match(script, /function combineSelectedElectric/);
    assert.match(script, /function detachSelectedElectricLink/);
    assert.match(script, /function convertSelectedElectricLink/);
    assert.match(script, /function moveElectricJoint/);
    assert.match(script, /function connectedRodUids/);
    assert.match(script, /electricLinks: clone\(electricLinks\)/);
    assert.match(script, /ball\.electricRide = \{/);
    assert.match(script, /ride\.direction = nextEndpoint\.end === 'start' \? 1 : -1/);
    assert.match(script, /drawElectricJoints\(\)/);
});

test('serves the marble builder short route publicly', async () => {
    const { server, close } = createMinsungServer({ dbPath: ':memory:' });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    try {
        const response = await fetch(`http://127.0.0.1:${port}/marble-builder/`, { redirect: 'manual' });
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /text\/html/);
        assert.match(await response.text(), /공 굴리기 연구소/);
    } finally {
        await new Promise(resolve => server.close(resolve));
        close();
    }
});