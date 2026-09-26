import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMinsungServer } from '../server.mjs';

const html = readFileSync(new URL('../marble-builder/index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../marble-builder/game.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../marble-builder/styles.css', import.meta.url), 'utf8');
const assetManifest = JSON.parse(readFileSync(new URL('../assets/marble-builder/assets.json', import.meta.url), 'utf8'));

test('marble builder uses the current cache-busted game script', () => {
    assert.match(html, /game\.js\?v=40/);
    assert.match(html, /styles\.css\?v=24/);
    assert.match(html, /rel="icon" href="data:,"/);
});

test('swing is registered with length-only setup and an isolated selection path', () => {
    const swing = assetManifest.assets.find(asset => asset.id === 'swing');
    assert.equal(swing?.name, '스윙');
    assert.equal(swing?.runtime, 'swing/swing.png');
    assert.deepEqual(swing?.parts, ['swing/swing-magnet.png', 'swing/swing-weight.png']);
    assert.match(script, /type: 'swing', label: '스윙'/);
    assert.match(script, /toolSettings\.swing = \{ length: preview\.width \}/);
    assert.match(script, /if \(selected\.type === 'swing'\)/);
    assert.match(script, /editDrag\.mode === 'swingLength'/);
    assert.match(script, /swingImages\.magnet\.complete/);
    assert.match(script, /swingImages\.weight\.complete/);
    assert.match(styles, /swing\/swing\.png\?v=2/);
});

test('swing pendulum uses a draggable blue release marker and allows obstacles in its orbit', () => {
    assert.match(script, /function swingRadius\(rod\)/);
    assert.match(script, /function swingReleasePoint\(rod\)/);
    assert.match(script, /function crossedSwingRelease\(before, after, target\)/);
    assert.match(script, /function exactSwingReleaseAngle\(before, after, target\)/);
    assert.match(script, /function swingMagnetShape\(\)/);
    assert.match(script, /function magnetContact\(rod, point, radius\)/);
    assert.match(script, /function shaftTouchesRect\(rod, rect\)/);
    assert.match(script, /function swingBlockedAt\(rod, angle\)/);
    assert.match(script, /function swingBlockedBetween\(rod, from, to\)/);
    assert.match(script, /function attractSwingBall\(rod, dt\)/);
    assert.match(script, /function resolveSwingContact\(rod\)/);
    assert.match(script, /function releaseSwingBall\(rod\)/);
    assert.match(script, /editDrag\.mode === 'swingRelease'/);
    assert.match(script, /attachedPivot\.releaseRequested = true/);
    assert.match(script, /circleTouchesRect\(mouth, ball\.radius, rect\)/);
    assert.match(script, /ctx\.strokeStyle = '#e94736'/);
    assert.match(script, /ctx\.setLineDash\(\[3, 7\]\)/);
    assert.match(script, /drawImage\(swingImages\.magnet, -42, -rod\.length - 53/);
    assert.match(script, /drawImage\(swingImages\.weight, -14, -16/);
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

test('marble builder uses video-matched gravity, fixed substeps, friction, and disc inertia', () => {
    assert.match(script, /const PIXELS_PER_METER = 100/);
    assert.match(script, /const EARTH_GRAVITY = 19\.35/);
    assert.match(script, /const FIXED_STEP = 1 \/ 120/);
    assert.match(script, /const BALL_INERTIA = 0\.5 \* BALL_MASS/);
    assert.match(script, /function ballInertia\(\)/);
    assert.match(html, /id="ballTypeButton"/);
    assert.match(script, /GIANT_BALL_MASS/);
    assert.match(script, /maxFriction = rect\.material\.friction \* normalImpulse/);
    assert.match(script, /rollingResistance:/);
    assert.match(script, /function applyRollingResistance/);
    assert.match(script, /const gravity = activeGravity\(\)/);
    assert.match(script, /gravity \* contact\.resistance \* dt/);
    assert.match(script, /const gravityAlongTangent = gravity \* ty/);
    assert.match(script, /const movingDownhill = tangentSpeed \* gravityAlongTangent > 0/);
    assert.match(script, /Math\.abs\(gravityAlongTangent\) \* dt \* 0\.85/);
    assert.match(script, /const nearlyLevel = Math\.abs\(ty\) < 0\.005/);
    assert.match(script, /function getImpactRestitution/);
    assert.match(script, /impactSpeed < 0\.3/);
    assert.match(script, /ball\.omega/);
});

test('wood impact is the original short click; quiet rolling plays on wood only at unchanged pitch', () => {
    assert.match(script, /wood-passage-soft\.wav\?v=3/);
    assert.match(script, /wood-passage-swish\.wav\?v=3/);
    assert.match(script, /wood-hit-\$\{index\}\.wav\?v=1/);
    assert.doesNotMatch(script, /wood-hit-video-/);
    assert.match(script, /source\.buffer = woodImpactBuffers\[Math\.floor\(Math\.random\(\) \* woodImpactBuffers\.length\)\]/);
    assert.match(script, /source\.stop\(start \+ \.26\)/);
    assert.match(script, /\(type === 'wood' \|\| type === 'breakable'\) && playRecordedWoodImpact/);
    assert.match(script, /type !== 'wood' && type !== 'breakable'/);
    assert.match(script, /recordedRollingSourceStarts \+= 2/);
    assert.match(script, /function rollingGainForRevolutions/);
    assert.doesNotMatch(script, /Math\.cos\(ball\.angle/);
    assert.match(script, /swishSource\.loopEnd = woodSwishBuffer\.duration/);
    assert.match(script, /swishGain\.gain\.setTargetAtTime\(swishMix, audio\.currentTime/);
    assert.match(script, /setTargetAtTime\(rollingGainForRevolutions\(revolutionsPerSecond, speed\)/);
    assert.match(script, /recordedRollingAudio\.gain\.gain\.setTargetAtTime\(\.0001, audio\.currentTime, \.12\)/);
    assert.match(script, /source\.loopEnd = rollingReferenceBuffer\.duration/);
    assert.equal(assetManifest.audio.length, 3);
});

test('marble builder sounds only distinct impacts and suppresses resting contact chatter', () => {
    assert.match(script, /const IMPACT_SOUND_MIN_SPEED = 0\.65/);
    assert.match(script, /const IMPACT_SOUND_REARM_STEPS = 12/);
    assert.match(script, /soundedImpactContacts\.has\(contactKey\)/);
    assert.match(script, /playImpactSoundForContact\(impactContactKey/);
    assert.match(script, /finishImpactSoundContacts\(\)/);
    assert.doesNotMatch(script, /if \(normalSpeed < 0\) \{\s*playImpactSound\(rect\.blockType/);
    assert.match(script, /wood: \{[^\n]*friction: 0\.20, restitution: 0\.23/);
    assert.match(script, /const WOOD_IMPACT_SOUND_MIN_SPEED = 0\.18/);
    assert.match(script, /soundedImpactContacts\.has\(contactKey\)/);
    assert.match(script, /Math\.min\(\.44, \.085 \+ speed \* \.035\) \* clamp/);
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
    assert.doesNotMatch(styles, /body\.is-editor #spawnButton[^}]*display: none/);
    assert.match(styles, /body\.is-editor #resetButton \{ display: none; \}/);
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

test('developer physics lab adjusts gravity and wood friction without changing normal-mode defaults', () => {
    assert.match(html, /id="physicsLabButton"[^>]*hidden/);
    assert.match(html, /id="physicsLabPanel"[^>]*hidden/);
    assert.match(html, /id="gravityRange"/);
    assert.match(html, /id="woodFrictionRange"/);
    assert.match(html, /id="physicsLabRespawnButton"/);
    assert.match(html, /class="developer-controls"[\s\S]*id="physicsLabButton"[\s\S]*id="developerButton"/);
    assert.match(script, /function startPhysicsLab/);
    assert.match(script, /if \(!developerEnabled\) return/);
    assert.match(script, /physicsLabButton\.hidden = !developerEnabled/);
    assert.match(script, /return appMode === 'physics-lab' \? physicsLabSettings\.gravity : EARTH_GRAVITY/);
    assert.match(script, /appMode === 'physics-lab' && type === 'wood'/);
    assert.match(script, /material: materialForType\(rod\.type\)/);
    assert.match(script, /physicsLabWoodMaterial\.rollingResistance = MATERIALS\.wood\.rollingResistance \* frictionRatio/);
    assert.match(script, /gravityRange\.addEventListener\('input'/);
    assert.match(script, /woodFrictionRange\.addEventListener\('input'/);
    assert.match(styles, /\.physics-lab-panel/);
    assert.match(styles, /body\.is-physics-lab \.hint/);
});

test('default stage one is removed without deleting user-created stage one', () => {
    assert.doesNotMatch(script, /id: 'stage-1', number: 1/);
    assert.match(script, /stages\.filter\(stage => stage\.id !== 'stage-1'\)/);
    assert.match(script, /persistStageOrder\(orderedStages\)/);
    assert.match(script, /number: index \+ 1/);
    assert.match(script, /persistStageOrder\(stages\.filter\(stage => stage\.id !== pendingDeleteStageId\)/);
    assert.match(script, /function swapStageNumbers\(firstNumber, secondNumber/);
    assert.match(html, /id="swapStagesButton"/);
    assert.match(html, /id="firstStageNumber"/);
    assert.match(html, /id="secondStageNumber"/);
    assert.doesNotMatch(script, /꾹 눌러 이동|reorderStage/);
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
    assert.doesNotMatch(script, /rollingAudio\.tone|toneGain\.gain/);
    assert.doesNotMatch(script, /rollingAudio\.osc\.type|osc\.type = slime \? 'sine'/);
    assert.match(styles, /\.tool-icon\.road[^}]*border-radius: 0/);
    assert.match(script, /function drawPlatformAsset/);
    assert.match(script, /platformImages\[rod\.type\]/);
    assert.match(script, /audioCompressor = audioContext\.createDynamicsCompressor/);
    assert.match(script, /audio\.currentTime - rollingAudio\.lastContactAt > \.16/);
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
    assert.match(script, /function basketSegments/);
    assert.match(script, /const thickness = goal\.thickness \+ 4/);
    assert.match(script, /function resolveBallBasketSegment/);
    assert.match(script, /const collisionDistance = ball\.radius \+ segment\.thickness \/ 2/);
    assert.match(script, /goals\.forEach\(goal => basketSegments\(goal\)\.forEach\(resolveBallBasketSegment\)\)/);
    assert.match(script, /ctx\.lineCap = 'round'/);
    assert.match(script, /function pointInsideBasket/);
});

test('marble builder registers and uses the named flat material assets', () => {
    assert.deepEqual(assetManifest.assets.filter(asset => asset.id !== 'swing').map(asset => asset.name), ['나무', '슬라임', '전기']);
    for (const asset of assetManifest.assets.filter(asset => asset.id !== 'swing')) {
        assert.equal(asset.alpha, true);
        assert.match(asset.runtime, /^platforms\/(wood|slime|electric)\.png$/);
    }
    assert.match(html, /assets\/marble-builder\/platforms\/wood\.png/);
    assert.match(html, /assets\/marble-builder\/platforms\/slime\.png/);
    assert.match(html, /assets\/marble-builder\/platforms\/electric\.png/);
    assert.match(styles, /url\('\/assets\/marble-builder\/platforms\/wood\.png\?v=2'\)/);
    assert.match(script, /const PLATFORM_ASSET_URLS = \{/);
    assert.match(script, /const PLATFORM_SOURCE_INSETS = \{/);
    assert.match(script, /const MATERIAL_REPEAT_LAYOUT = \{/);
    assert.match(script, /function drawRepeatedMaterial/);
    assert.match(script, /mirrorAlternateRows: true/);
    assert.match(script, /layout\.mirrorAlternateRows && row % 2 === 1/);
    assert.match(script, /ctx\.scale\(-1, 1\)/);
    assert.match(script, /for \(let x = left; x < right; x \+= layout\.tileWidth\)/);
    assert.doesNotMatch(script, /function drawIrregularMaterialPattern/);
    assert.doesNotMatch(script, /drawLargeMaterialAtlas/);
    assert.doesNotMatch(html, /-atlas\.png/);
    assert.match(script, /ctx\.fillRect\(-rod\.length \/ 2, -rod\.thickness \/ 2, rod\.length, rod\.thickness\)/);
});

test('block sizing preserves wood and slime texture proportions and locks electric thickness', () => {
    assert.match(script, /const ELECTRIC_PLATFORM_THICKNESS = 20/);
    assert.match(script, /wood: \{ length: 180, thickness: ELECTRIC_PLATFORM_THICKNESS \}/);
    assert.match(script, /slime: \{ length: 180, thickness: ELECTRIC_PLATFORM_THICKNESS \}/);
    assert.match(script, /normalizedType === 'wood' && value === 14/);
    assert.match(script, /normalizedType === 'slime' && value === 18/);
    assert.match(script, /sizingMode\.type === 'electric'[\s\S]*ELECTRIC_PLATFORM_THICKNESS/);
    assert.match(script, /toolSettings\.electric = \{ length: preview\.width, thickness: ELECTRIC_PLATFORM_THICKNESS \}/);
    assert.match(script, /function normalizedRodThickness/);
    assert.match(script, /normalizedType === 'electric'/);
});

test('rotated special platforms use their local top face and loud limited audio', () => {
    assert.match(script, /nyLocal < -0\.25/);
    assert.doesNotMatch(script, /specialType && ny < -0\.25/);
    assert.match(script, /specialType === 'slime' \|\| \(specialType === 'electric' && nyLocal < -0\.25\)/);
    assert.match(script, /const fallHeightRebound = ny < -0\.5 && incomingVy > 0/);
    assert.match(script, /incomingNormalSpeed \* Math\.sqrt\(2 \/ 3\)/);
    assert.match(script, /audioLimiter = audioContext\.createDynamicsCompressor/);
    assert.match(script, /audioMaster\.gain\.value = 1\.6/);
    assert.match(script, /const volume = Math\.min\(\.44, \.085 \+ speed \* \.035\) \* clamp/);
    assert.match(script, /const maximumVolume = slime \? \.12 : electric \? \.17 : \.15/);
});

test('electric platforms support corner joints, group editing, and persistent attached tracks', () => {
    assert.match(html, /id="combineElectricButton"[^>]*>결합</);
    assert.match(html, /id="detachElectricButton"[^>]*>해제</);
    assert.match(html, /id="convertElectricButton"[^>]*>변환</);
    assert.doesNotMatch(html, /id="curveElectricButton"/);
    assert.match(script, /const ELECTRIC_MIN_JOINT_ANGLE = Math\.PI \* 3 \/ 4/);
    assert.match(script, /const ELECTRIC_MAX_SPEED = 18/);
    assert.match(script, /function electricJointSides/);
    assert.match(script, /function validAdjacentElectricJoints/);
    assert.doesNotMatch(script, /drawElectricSeams\(|drawCurvedElectric\(|electricCurveSample\(/);
    assert.match(script, /function combineSelectedElectric/);
    assert.match(script, /function detachSelectedElectricLink/);
    assert.match(script, /function convertSelectedElectricCorner/);
    assert.match(script, /convertElectricButton\.addEventListener\('click', convertSelectedElectricCorner\)/);
    assert.match(script, /electricLinks\.find\(link => !validElectricJoint\(link\)\)/);
    assert.doesNotMatch(script, /function convertSelectedElectricLink/);
    assert.match(script, /function moveElectricJoint/);
    assert.match(script, /function connectedRodUids/);
    assert.match(script, /electricLinks: clone\(electricLinks\)/);
    assert.match(script, /ball\.electricRide = \{/);
    assert.match(script, /ride\.direction = nextEndpoint\.end === 'start' \? 1 : -1/);
    assert.match(script, /function adjacentElectricExit\(rod, end, side\)/);
    assert.match(script, /return matches\.length === 1 \? matches\[0\] : null/);
    assert.match(script, /ball\.electricRide = null;\s*\/\/ Do not collide again in this same step at the track tip/);
    assert.match(script, /if \(ball\.electricRide\) break/);
    assert.match(script, /if \(ball\.electricRide\) \{\s*ball\.specialContacts = \[\.\.\.specialContactsThisStep\];\s*finishImpactSoundContacts\(\);\s*return;/);
    assert.match(script, /drawElectricJoints\(\)/);
});

test('editor drops a preview ball without saving it or awarding a stage win', () => {
    assert.match(script, /spawnButton\.addEventListener\('click', spawnBall\)/);
    assert.match(script, /if \(appMode === 'editor'\) return;\s*const insideGoal/);
    const saved = script.match(/function saveEditedStage\(\) \{([\s\S]*?)\n  \}/)?.[1] || '';
    assert.doesNotMatch(saved, /\bball\b/);
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