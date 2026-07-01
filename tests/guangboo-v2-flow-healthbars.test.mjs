import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const htmlSource = readFileSync(new URL('../guangboo-v2/index.html', import.meta.url), 'utf8');
const clientSource = readFileSync(new URL('../guangboo-v2/client.js', import.meta.url), 'utf8');
const stylesSource = readFileSync(new URL('../guangboo-v2/styles.css', import.meta.url), 'utf8');
const runtimeSource = readFileSync(new URL('../guangboo-runtime.mjs', import.meta.url), 'utf8');

test('v2 map creation is split into mode, name, editor, then saved info screens', () => {
    assert.match(htmlSource, /id="mapModeScreen"/);
    assert.match(htmlSource, /id="mapNameScreen"/);
    assert.match(htmlSource, /id="mapEditorScreen"/);
    assert.match(htmlSource, /id="mapSavedInfoScreen"/);
    assert.match(htmlSource, /id="mapModeNextButton"/);
    assert.match(htmlSource, /id="mapNameNextButton"/);
    assert.match(htmlSource, /id="saveMapButton"[^>]*>저장하고 정보 보기/);
    assert.match(clientSource, /mapModeScreen: document\.getElementById\('mapModeScreen'\)/);
    assert.match(clientSource, /elements\.mapModeScreen\.hidden = name !== 'mapMode'/);
    assert.match(clientSource, /setScreen\('mapMode'\)/);
    assert.match(clientSource, /function continueToNameStep\(\)/);
    assert.match(clientSource, /function continueToEditorStep\(\)/);
    assert.match(clientSource, /setScreen\('mapSavedInfo'\)/);
    assert.doesNotMatch(htmlSource, /id="mapInfoStep"/);
    assert.match(stylesSource, /\.map-setup-screen/);
    assert.match(stylesSource, /\.map-saved-info-screen/);
});

test('v2 custom map rows keep delete beside edit', () => {
    assert.match(clientSource, /edit\.textContent = '수정'/);
    assert.match(clientSource, /del\.textContent = '삭제'/);
    assert.match(clientSource, /row\.append\(button, info, edit, del\)/);
    assert.match(clientSource, /del\.addEventListener\('click', \(\) => deleteCustomMap\(map\.id\)\)/);
});

test('v2 ultimate and baby slime health bars use the same world bar size as players', () => {
    assert.match(clientSource, /function drawWorldHealthBar\(graphics, health, maxHealth, y, radius = 22\)/);
    assert.match(clientSource, /const barW = radius \* 3\.36/);
    assert.match(clientSource, /const barH = radius \* 0\.68/);
    assert.match(clientSource, /projectile\.kind === 'ultimate' && health > 0/);
    assert.match(clientSource, /drawWorldHealthBar\(entry\.healthBar, health, maxHealth, y, 22\)/);
    assert.match(clientSource, /const hud = new PIXI\.Container\(\)/);
    assert.match(clientSource, /entry\.body\.rotation = Math\.atan2/);
    assert.match(clientSource, /entry\.hud\.rotation = 0/);
});

test('v2 ultimate survives wall breaking and client smooths projectile motion', () => {
    assert.match(runtimeSource, /const wallHit = destroyWallHitByProjectile\(match\.map, projectile\)/);
    assert.doesNotMatch(runtimeSource, /kind === 'wallBreak'[\s\S]{0,180}\n\s*return;\n\s*}\n\s*} else if \(isProjectileBlocked/);
    assert.match(clientSource, /function updateProjectileGraphic\(entry, projectile, deltaMS = 16\.67\)/);
    assert.match(clientSource, /smoothPosition\(entry, projectile, deltaMS\)/);
    assert.match(clientSource, /updateProjectileGraphic\(entry, item, ticker\.deltaMS \|\| 16\.67\)/);
});

test('v2 cache keys changed for flow and health bar update', () => {
    assert.match(htmlSource, /styles\.css\?v=20260701-v2-flow-healthbars/);
    assert.match(htmlSource, /client\.js\?v=20260701-v2-flow-healthbars/);
});
