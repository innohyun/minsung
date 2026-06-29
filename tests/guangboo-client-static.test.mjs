import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const clientSource = readFileSync(new URL('../guangboo/client.js', import.meta.url), 'utf8');
const stylesSource = readFileSync(new URL('../guangboo/styles.css', import.meta.url), 'utf8');
const htmlSource = readFileSync(new URL('../guangboo/index.html', import.meta.url), 'utf8');
const runtimeSource = readFileSync(new URL('../guangboo-runtime.mjs', import.meta.url), 'utf8');

test('guangboo uses an in-page fullscreen mode that exits with the top x button', () => {
    assert.match(htmlSource, /id="fullscreenExitButton"/);
    assert.match(clientSource, /function enterGameFullscreen\(\)/);
    assert.match(clientSource, /function exitGameFullscreen\(\)/);
    assert.match(clientSource, /elements\.fullscreenExit\.addEventListener\('click', exitGameFullscreen\)/);
    assert.doesNotMatch(clientSource, /requestFullscreen\(/);
    assert.doesNotMatch(clientSource, /document\.exitFullscreen\(/);
    assert.match(clientSource, /document\.addEventListener\('fullscreenchange', resizeCanvas\)/);
    assert.match(stylesSource, /body\.is-playing\.is-game-fullscreen \.match-screen/);
});

test('guangboo lobby keeps document scrolling enabled outside matches', () => {
    assert.match(htmlSource, /maximum-scale=1\.0/);
    assert.match(htmlSource, /user-scalable=no/);
    assert.match(stylesSource, /html,\nbody \{[\s\S]*?height: auto/);
    assert.match(stylesSource, /html,\nbody \{[\s\S]*?overflow-y: auto/);
    assert.match(stylesSource, /html,\nbody \{[\s\S]*?-webkit-overflow-scrolling: touch/);
    assert.match(stylesSource, /body \{[\s\S]*?overflow-y: auto/);
    assert.match(stylesSource, /#app \{[\s\S]*?overflow-y: visible/);
    assert.match(stylesSource, /body:not\(\.is-playing\) #app \{[\s\S]*?min-height: 100vh/);
    assert.match(stylesSource, /body:not\(\.is-playing\) #app \{[\s\S]*?min-height: 100dvh/);
    assert.match(stylesSource, /body:not\(\.is-playing\) #app \{[\s\S]*?overflow-y: visible/);
    assert.match(stylesSource, /body:not\(\.is-playing\) #app \{[\s\S]*?touch-action: pan-y/);
    assert.match(stylesSource, /body\.is-playing \{[\s\S]*?touch-action: none/);
    assert.match(stylesSource, /body\.is-playing #app \{[\s\S]*?overflow: hidden/);
    assert.match(stylesSource, /\.lobby-screen \{[\s\S]*?justify-content: flex-start/);
    assert.match(stylesSource, /\.lobby-screen \{[\s\S]*?overflow-y: visible/);
    assert.doesNotMatch(clientSource, /joinForm\.addEventListener\('submit'[\s\S]*?requestGameFullscreen\(\)/);
    assert.doesNotMatch(clientSource, /playAgain\.addEventListener\('click'[\s\S]*?requestGameFullscreen\(\)/);
});

test('guangboo lobby can request bot-filled solo tests', () => {
    assert.match(htmlSource, /id="botToggle"/);
    assert.match(htmlSource, /봇으로 혼자 테스트/);
    assert.match(clientSource, /const BOT_STORAGE_KEY = 'guangboo_fill_bots'/);
    assert.match(clientSource, /fillWithBots: elements\.botToggle\.checked/);
    assert.match(stylesSource, /\.bot-toggle/);
});

test('guangboo attack input fires once after aiming is released', () => {
    assert.match(clientSource, /queuedShots/);
    assert.match(clientSource, /function queueShot\(aim\)/);
    assert.match(clientSource, /function finishAndShoot\(event\)/);
    assert.match(clientSource, /window\.addEventListener\('pointerup', finishAndShoot, \{ capture: true \}\)/);
    assert.match(clientSource, /lostpointercapture/);
    assert.match(clientSource, /window\.addEventListener\('pointercancel', finishAndShoot, \{ capture: true \}\)/);
    assert.match(clientSource, /touchend', finishTouch/);
    assert.match(clientSource, /touchcancel', finishTouch/);
    assert.match(clientSource, /let firing = false/);
    assert.match(clientSource, /state\.queuedShots\.shift\(\)/);
});

test('guangboo right-stick aim updates immediately from the touch direction', () => {
    assert.match(clientSource, /const pointerAim = aimFromPointer\(pointer\)/);
    assert.match(clientSource, /const fallbackAim = isRightStick \? \(stick\.instantAim \|\| pointerAim \|\| state\.lastAim\)/);
    assert.match(clientSource, /const nx = length > 3 \? dx \/ length : fallbackAim\.x/);
    assert.match(clientSource, /const ny = length > 3 \? dy \/ length : fallbackAim\.y/);
    assert.match(clientSource, /state\.lastAim = normalizeAim\(\{ x: nx, y: ny \}\)/);
});

test('guangboo aim guide is a visible semi-transparent local guide', () => {
    assert.match(clientSource, /function drawLocalAimGuide\(\)/);
    assert.match(clientSource, /function isAttackControlActive\(\)/);
    assert.match(clientSource, /!isAttackControlActive\(\)/);
    assert.match(clientSource, /drawLocalAimGuide\(\)/);
    assert.match(clientSource, /rgba\(5, 9, 6, 0\.62\)/);
    assert.match(clientSource, /rgba\(215, 242, 82, 0\.64\)/);
});

test('guangboo renders health over monsters', () => {
    assert.match(clientSource, /function drawPlayerHealthBar\(player, point, radius\)/);
    assert.match(clientSource, /drawPlayerHealthBar\(player, point, radius\)/);
});

test('guangboo suppresses mobile double-tap zoom during matches', () => {
    assert.match(clientSource, /function suppressMobileZoomGestures\(\)/);
    assert.match(clientSource, /gesturestart/);
    assert.match(clientSource, /dblclick/);
    assert.match(clientSource, /touchend/);
    assert.match(clientSource, /passive: false/);
});

test('guangboo projectiles are capped to the aim range on client and server snapshots', () => {
    assert.match(clientSource, /const PROJECTILE_RANGE = 230/);
    assert.match(clientSource, /projectileMemory: new Map\(\)/);
    assert.match(clientSource, /function rememberAndFilterProjectiles\(projectiles\)/);
    assert.match(clientSource, /function isProjectileWithinRange\(projectile\)/);
    assert.match(clientSource, /rememberAndFilterProjectiles\(message\.projectiles \|\| \[\]\)/);
    assert.match(clientSource, /performance\.now\(\) - memory\.firstSeenAt < 1400/);
    assert.match(runtimeSource, /const PROJECTILE_RANGE = 230/);
    assert.match(runtimeSource, /function spawnProjectile\(match, player, now\)/);
    assert.match(runtimeSource, /targetX = spawnX \+ dx \* PROJECTILE_RANGE/);
    assert.match(runtimeSource, /targetY = spawnY \+ dy \* PROJECTILE_RANGE/);
    assert.match(runtimeSource, /const FIRE_COOLDOWN_MS = 320/);
    assert.match(runtimeSource, /const MAX_PENDING_SHOTS = 3/);
    assert.match(runtimeSource, /function queueShotInput\(player, aim\)/);
    assert.match(runtimeSource, /player\.queuedShotAims\.push\(shotAim\)/);
    assert.match(runtimeSource, /const aim = player\.queuedShotAims\.shift\(\) \|\| player\.aim/);
    assert.match(runtimeSource, /spawnedTick: match\.tick/);
    assert.match(runtimeSource, /projectile\.spawnedTick === match\.tick/);
    assert.match(runtimeSource, /travelThisTick = Math\.min\(stepDistance, remaining\)/);
    assert.match(runtimeSource, /projectile\.traveled >= projectile\.maxDistance/);
    assert.match(runtimeSource, /maxDistance: Math\.round\(projectile\.maxDistance \?\? PROJECTILE_RANGE\)/);
});

test('guangboo busts mobile browser caches for changed controls', () => {
    assert.match(htmlSource, /styles\.css\?v=20260629-mobile6/);
    assert.match(htmlSource, /client\.js\?v=20260629-mobile6/);
});


test('guangboo uses Brawl-style half-screen floating touch sticks', () => {
    assert.match(clientSource, /function shouldStartFromHalf\(event\)/);
    assert.match(clientSource, /event\.pointerType !== 'touch'/);
    assert.match(clientSource, /event\.clientX >= midpoint/);
    assert.match(clientSource, /event\.clientX < midpoint/);
    assert.match(clientSource, /function moveStickBase\(clientX, clientY\)/);
    assert.match(clientSource, /stick\.pointerId === event\.pointerId/);
    assert.match(clientSource, /elements\.match\.setPointerCapture\(event\.pointerId\)/);
    assert.match(clientSource, /window\.addEventListener\('pointerup', finishAndShoot, \{ capture: true \}\)/);
    assert.match(clientSource, /if \(window\.PointerEvent \|\| !stick\.active\) return;/);
    assert.match(stylesSource, /\.stick-zone\.is-floating-stick/);
});

test('guangboo flushes release shots immediately instead of waiting for the next input tick', () => {
    assert.match(clientSource, /function sendQueuedShotNow\(\)/);
    assert.match(clientSource, /send\(currentInput\(\)\)/);
    assert.match(clientSource, /state\.queuedShots\.push\(normalized\);\n\s*sendQueuedShotNow\(\)/);
});

test('guangboo server queues firing inputs so later movement packets cannot swallow shots', () => {
    assert.match(runtimeSource, /if \(message\.firing && client\.match\?\.status === 'active'\)/);
    assert.match(runtimeSource, /queueShotInput\(player, aim\)/);
    assert.match(runtimeSource, /firing: false,/);
    assert.match(runtimeSource, /player\.queuedShotAims\.length && now - player\.lastShotAt >= FIRE_COOLDOWN_MS/);
    assert.doesNotMatch(runtimeSource, /player\.queuedShotAim\b/);
});
