import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const htmlSource = readFileSync(new URL('../guangboo-v2/index.html', import.meta.url), 'utf8');
const clientSource = readFileSync(new URL('../guangboo-v2/client.js', import.meta.url), 'utf8');
const stylesSource = readFileSync(new URL('../guangboo-v2/styles.css', import.meta.url), 'utf8');
const runtimeSource = readFileSync(new URL('../guangboo-runtime.mjs', import.meta.url), 'utf8');
const serverSource = readFileSync(new URL('../server.mjs', import.meta.url), 'utf8');

test('v2 map creation uses separate mode, name, editor, and saved-info screens', () => {
    assert.match(htmlSource, /id="mapModeSetupScreen"/);
    assert.match(htmlSource, /id="mapNameSetupScreen"/);
    assert.match(htmlSource, /id="mapEditorScreen"/);
    assert.match(htmlSource, /id="mapSavedInfoScreen"/);
    assert.match(clientSource, /openMapModeSetup/);
    assert.match(clientSource, /openMapNameSetup/);
    assert.match(clientSource, /setScreen\('mapSavedInfo'\)/);
    assert.doesNotMatch(htmlSource + clientSource, /수정 복사/);
});

test('v2 custom maps render like selectable map cards with fixed official-style columns', () => {
    assert.match(clientSource, /button\.className = 'map-choice-card custom-map-choice'/);
    assert.match(clientSource, /drawMiniMap\(button\.querySelector\('canvas'\), meta\)/);
    assert.match(clientSource, /renderSelectedMapCard\(\)/);
    assert.match(clientSource, /renderOfficialMapGrid\(\)/);
    assert.match(clientSource, /renderCustomMapList\(\)/);
    assert.doesNotMatch(clientSource, /내가 정식으로 올린 맵/);
    assert.doesNotMatch(clientSource, /플레이어.*가 만든/);
    assert.match(stylesSource, /\.map-grid,\n\.custom-map-list \{\n\s*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
});

test('v2 edit and delete require the map edit password', () => {
    assert.match(clientSource, /function requireMapPassword/);
    assert.match(clientSource, /1234567890/);
    assert.match(clientSource, /requestEditMap/);
    assert.match(clientSource, /맵을 수정하려면 비밀번호를 입력하세요/);
    assert.match(clientSource, /맵을 삭제하려면 비밀번호를 입력하세요/);
    assert.match(serverSource, /function isGuangbooMapEditPassword/);
    assert.match(serverSource, /if \(!isGuangbooMapEditPassword\(body\.password\)\) return sendJson\(res, 401/);
});

test('v2 ultimate and summon healthbars are non-rotating HUD graphics and ultimates survive wall breaks', () => {
    assert.match(clientSource, /function drawWorldHealthBar/);
    assert.match(clientSource, /node\.addChild\(body, hud\.hud\)/);
    assert.match(clientSource, /entry\.body\.rotation = Math\.atan2/);
    assert.match(clientSource, /drawWorldHealthBar\(entry\.healthBar, entry\.healthText, health/);
    assert.match(clientSource, /drawWorldHealthBar\(entry\.healthBar, entry\.healthText, Number\(projectile\.health\)/);
    assert.match(runtimeSource, /destroyWallHitByProjectile\(match\.map, projectile\);[\s\S]*?projectiles\.push\(projectile\);\n\s*return;/);
});

test('v2 left stick sends fixed-speed movement regardless of stick distance', () => {
    assert.match(clientSource, /const length = Math\.hypot\(state\.leftStick\.x, state\.leftStick\.y\)/);
    assert.match(clientSource, /state\.leftStick\.x \/ length/);
    assert.match(clientSource, /state\.leftStick\.y \/ length/);
});

test('v2 blocks page zoom except editor canvas pinch and prevents placement during pinch', () => {
    assert.match(clientSource, /function isEditorCanvasGesture/);
    assert.match(clientSource, /function blockPageZoom/);
    assert.match(clientSource, /gesturechange/);
    assert.match(clientSource, /touchmove/);
    assert.match(clientSource, /dblclick/);
    assert.match(clientSource, /function canPlaceEditorElement/);
    assert.match(clientSource, /pinchBlockUntil/);
    assert.match(clientSource, /if \(state\.editor\.pointers\.size >= 2\) \{ updateEditorPinch\(\); return; \}/);
});

test('v2 right stick does not auto-lock aim while dragging', () => {
    assert.doesNotMatch(clientSource, /if \(isRight\) state\.lastAim = nearestOpponentAim/);
    assert.match(clientSource, /if \(!stick\.moved\) return nearestOpponentAim\(\) \|\| state\.lastAim/);
    assert.match(htmlSource, /20260701-v2-zoom-aim-wall/);
});
