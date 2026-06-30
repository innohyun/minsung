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
    assert.match(clientSource, /lostpointercapture', finishAndShoot/);
    assert.match(clientSource, /window\.addEventListener\('pointercancel', finishAndShoot, \{ capture: true \}\)/);
    assert.match(clientSource, /touchend', finishTouch/);
    assert.match(clientSource, /touchcancel', finishTouch/);
    assert.match(clientSource, /let firing = false/);
    assert.match(clientSource, /state\.queuedShots\.shift\(\)/);
});

test('guangboo right-stick aim updates immediately from the touch direction', () => {
    assert.match(clientSource, /const pointerAim = aimFromPointer\(pointer\)/);
    assert.match(clientSource, /const fallbackAim = isRightStick \? \(pointerAim \|\| state\.lastAim\)/);
    assert.match(clientSource, /const nx = length > 3 \? dx \/ length : fallbackAim\.x/);
    assert.match(clientSource, /const ny = length > 3 \? dy \/ length : fallbackAim\.y/);
    assert.match(clientSource, /state\.lastAim = normalizeAim\(\{ x: nx, y: ny \}\)/);
});

test('guangboo aim guide is a visible semi-transparent local guide', () => {
    assert.match(clientSource, /function drawLocalAimGuide\(\)/);
    assert.match(clientSource, /function isAttackControlActive\(\)/);
    assert.match(clientSource, /!isAttackControlActive\(\)/);
    assert.match(clientSource, /drawLocalAimGuide\(\)/);
    assert.match(clientSource, /rgba\(255, 255, 255, 0\.18\)/);
    assert.match(clientSource, /rgba\(215, 242, 82, 0\.34\)/);
});

test('guangboo renders health over monsters', () => {
    assert.match(clientSource, /const PLAYER_MAX_HEALTH = 6000/);
    assert.match(clientSource, /function drawPlayerHealthBar\(player, point, radius\)/);
    assert.match(clientSource, /drawPlayerHealthBar\(player, point, radius\)/);
    assert.match(clientSource, /const maxHealth = Number\(player\.maxHealth\) \|\| PLAYER_MAX_HEALTH/);
    assert.match(clientSource, /ctx\.fillText\(String\(health\), point\.x, y \+ height \/ 2\)/);
});

test('guangboo draws brawl-style ammo under each player health bar', () => {
    assert.match(clientSource, /function drawPlayerAmmoBar\(player, point, radius, barY, barHeight, barWidth\)/);
    assert.match(clientSource, /drawPlayerAmmoBar\(player, point, radius, y, height, width\)/);
    assert.match(clientSource, /const maxAmmo = Number\(player\.maxAmmo\) \|\| 3/);
    assert.doesNotMatch(clientSource, /drawAmmoHud\(\);/);
});

test('guangboo keeps name, health, and ammo proportional to character radius on phones', () => {
    assert.match(clientSource, /function playerHudUnit\(radius\)/);
    assert.match(clientSource, /return radius \/ 22/);
    assert.match(clientSource, /const nameY = point\.y - radius \* 3\.64/);
    assert.match(clientSource, /const width = radius \* 3\.36/);
    assert.match(clientSource, /const height = radius \* 0\.68/);
    assert.match(clientSource, /const y = point\.y - radius \* 2\.64/);
    assert.match(clientSource, /drawPlayerAmmoBar\(player, point, radius, y, height, width\)/);
});

test('guangboo suppresses mobile double-tap zoom during matches', () => {
    assert.match(clientSource, /function suppressMobileZoomGestures\(\)/);
    assert.match(clientSource, /gesturestart/);
    assert.match(clientSource, /dblclick/);
    assert.match(clientSource, /touchend/);
    assert.match(clientSource, /passive: false/);
});

test('guangboo projectiles are capped to the aim range on client and server snapshots', () => {
    assert.match(clientSource, /const PROJECTILE_RANGE = 300/);
    assert.match(clientSource, /projectileMemory: new Map\(\)/);
    assert.match(clientSource, /function rememberAndFilterProjectiles\(projectiles\)/);
    assert.match(clientSource, /function isProjectileWithinRange\(projectile\)/);
    assert.match(clientSource, /rememberAndFilterProjectiles\(message\.projectiles \|\| \[\]\)/);
    assert.match(clientSource, /performance\.now\(\) - memory\.firstSeenAt < 1400/);
    assert.match(runtimeSource, /const PROJECTILE_RANGE = 300/);
    assert.match(runtimeSource, /function spawnProjectile\(match, player, now\)/);
    assert.match(runtimeSource, /targetX = spawnX \+ dx \* PROJECTILE_RANGE/);
    assert.match(runtimeSource, /targetY = spawnY \+ dy \* PROJECTILE_RANGE/);
    assert.match(runtimeSource, /const MAX_PENDING_SHOTS = 3/);
    assert.match(runtimeSource, /function queueShotInput\(player, aim, now = Date\.now\(\)\)/);
    assert.match(runtimeSource, /player\.queuedShotAims\.push\(shotAim\)/);
    assert.match(runtimeSource, /const aim = player\.queuedShotAims\.shift\(\) \|\| player\.aim/);
    assert.match(runtimeSource, /spawnedTick: match\.tick/);
    assert.match(runtimeSource, /projectile\.spawnedTick === match\.tick/);
    assert.match(runtimeSource, /travelThisTick = Math\.min\(stepDistance, remaining\)/);
    assert.match(runtimeSource, /projectile\.traveled >= projectile\.maxDistance/);
    assert.match(runtimeSource, /maxDistance: Math\.round\(projectile\.maxDistance \?\? PROJECTILE_RANGE\)/);
});

test('guangboo busts browser caches for changed guangboo assets', () => {
    assert.match(htmlSource, /styles\.css\?v=20260630-slime-charge/);
    assert.match(htmlSource, /client\.js\?v=20260630-slime-hits-simple/);
});


test('guangboo supports charged wall-breaking homing ultimate attacks', () => {
    assert.match(htmlSource, /id="ultimateButton"/);
    assert.match(stylesSource, /\.ultimate-button/);
    assert.match(stylesSource, /\.ultimate-button\.is-ready/);
    assert.match(clientSource, /ultimateButton: document\.getElementById\('ultimateButton'\)/);
    assert.match(clientSource, /function fireUltimate\(\)/);
    assert.match(clientSource, /state\.queuedUltimate = true/);
    assert.match(clientSource, /ultimate\n\s*\};/);
    assert.match(clientSource, /projectile\.kind === 'ultimate'/);
    assert.match(runtimeSource, /const TILE_SIZE = 40/);
    assert.match(runtimeSource, /const ULTIMATE_HITS_REQUIRED = 4/);
    assert.match(runtimeSource, /const ULTIMATE_DAMAGE = 2000/);
    assert.match(runtimeSource, /const ULTIMATE_SPEED = 150/);
    assert.match(runtimeSource, /const ULTIMATE_RADIUS = 24/);
    assert.match(runtimeSource, /const ULTIMATE_PROJECTILE_HEALTH = 3000/);
    assert.match(runtimeSource, /function createMap\(\)/);
    assert.match(runtimeSource, /walls,\n\s*obstacles: walls\.map\(wall => tileToRect\(wall\)\)/);
    assert.match(runtimeSource, /function queueUltimateInput\(player, aim\)/);
    assert.match(runtimeSource, /function spawnUltimateProjectile\(match, player, now\)/);
    assert.match(runtimeSource, /kind: 'ultimate'/);
    assert.match(runtimeSource, /function steerUltimateProjectile\(match, projectile\)/);
    assert.match(runtimeSource, /destroyWallHitByProjectile\(match\.map, projectile\)/);
    assert.match(runtimeSource, /function knockBackPlayer\(match, player, projectile\)/);
    assert.match(runtimeSource, /function collideWithEnemyUltimateProjectile\(match, projectile\)/);
    assert.match(runtimeSource, /candidate\.kind === 'ultimate'/);
    assert.match(runtimeSource, /candidate\.ownerId !== projectile\.ownerId/);
    assert.match(runtimeSource, /hitUltimate\.health = \(hitUltimate\.health \?\? ULTIMATE_PROJECTILE_HEALTH\) - \(projectile\.damage \|\| 0\)/);
    assert.match(runtimeSource, /if \(hitUltimate\.health <= 0\) hitUltimate\.destroyed = true/);
    assert.match(runtimeSource, /match\.projectiles = projectiles\.filter\(projectile => !projectile\.destroyed\)/);
    assert.match(runtimeSource, /function addUltimateHitCharge\(player\)/);
    assert.match(runtimeSource, /player\.ultimateHits = Math\.min\(ULTIMATE_HITS_REQUIRED, \(player\.ultimateHits \|\| 0\) \+ 1\)/);
    assert.match(runtimeSource, /addUltimateHitCharge\(owner\)/);
    assert.match(runtimeSource, /if \(message\.ultimate && queueUltimateInput\(player, aim\)\)/);
});


test('guangboo supports selectable slime character with trails, ammo steal, and baby slimes', () => {
    assert.match(htmlSource, /class="character-picker"/);
    assert.match(htmlSource, /name="character" value="slime"/);
    assert.match(stylesSource, /\.character-option/);
    assert.match(clientSource, /const CHARACTER_STORAGE_KEY = 'guangboo_character'/);
    assert.match(clientSource, /characterInputs: \[\.\.\.document\.querySelectorAll\('input\[name="character"\]'\)\]/);
    assert.match(clientSource, /function getSelectedCharacter\(\)/);
    assert.match(clientSource, /send\(\{ type: 'joinQueue', nickname, mode, character, fillWithBots: elements\.botToggle\.checked \}\)/);
    assert.match(clientSource, /state\.slimeTrails = message\.slimeTrails \|\| \[\]/);
    assert.match(clientSource, /state\.summons = message\.summons \|\| \[\]/);
    assert.match(clientSource, /function drawSlimeTrail\(trail\)/);
    assert.match(clientSource, /function drawSummon\(summon\)/);
    assert.match(clientSource, /player\.character === 'slime'/);
    assert.match(clientSource, /const isSlime = player\?\.character === 'slime'/);
    assert.match(clientSource, /const hits = isSlime \? Math\.min\(4, rawHits\) : Math\.min\(required, rawHits\)/);
    assert.match(clientSource, /const ready = isSlime \? hits >= 1 : Boolean\(player\?\.ultimateReady\)/);
    assert.match(clientSource, /const slimeHits = Math\.min\(4, Math\.max\(0, Number\(me\?\.ultimateHits\) \|\| 0\)\)/);
    assert.match(clientSource, /const ready = me\?\.character === 'slime' \? slimeHits >= 1 : Boolean\(me\?\.ultimateReady\)/);
    assert.doesNotMatch(clientSource, /const slimeReady =/);
    assert.match(clientSource, /const sent = send\(currentInput\(\)\)/);
    assert.match(clientSource, /me\.ultimateReady = false;\n\s*me\.ultimateHits = 0/);
    assert.match(clientSource, /projectile\.kind === 'slime'/);
    assert.match(runtimeSource, /const SLIME_PROJECTILE_DAMAGE = 600/);
    assert.match(runtimeSource, /const BABY_SLIME_DAMAGE = 200/);
    assert.match(runtimeSource, /const BABY_SLIME_HEALTH = 500/);
    assert.match(runtimeSource, /function normalizeCharacter\(value\)/);
    assert.match(runtimeSource, /client\.character = normalizeCharacter\(message\.character\)/);
    assert.match(runtimeSource, /character: player\.character/);
    assert.match(runtimeSource, /slimeTrails: match\.slimeTrails\.map/);
    assert.match(runtimeSource, /summons: match\.summons\.map/);
    assert.match(runtimeSource, /function dropSlimeTrail\(match, player, now\)/);
    assert.match(runtimeSource, /function isOnEnemySlimeTrail\(match, player, now\)/);
    assert.match(runtimeSource, /function spawnBabySlimes\(match, player, count, now\)/);
    assert.match(runtimeSource, /function babySlimeSpawnPoint\(match, player, angle, index\)/);
    assert.match(runtimeSource, /if \(!isSummonBlocked\(match\.map, x, y, BABY_SLIME_RADIUS\)\) return \{ x, y \}/);
    assert.match(runtimeSource, /function isSummonBlocked\(map, x, y, radius = BABY_SLIME_RADIUS\)/);
    assert.match(runtimeSource, /function summonGridPath\(match, summon, target\)/);
    assert.match(runtimeSource, /const wallKeys = new Set\(\(map\.walls \|\| \[\]\)\.map/);
    assert.match(runtimeSource, /const directions = \[\n\s*\{ col: 1, row: 0 \}/);
    assert.match(runtimeSource, /function moveSummonTowardTarget\(match, summon, target, dt\)/);
    assert.match(runtimeSource, /if \(isSummonBlocked\(match\.map, nextX, nextY, summon\.radius\)\) return/);
    assert.match(runtimeSource, /moveSummonTowardTarget\(match, summon, target, dt\)/);
    assert.match(runtimeSource, /function stepSummons\(match, now, dt\)/);
    assert.match(runtimeSource, /function ultimateRequiredFor\(player\)/);
    assert.match(runtimeSource, /const SLIME_ULTIMATE_MIN_HITS_REQUIRED = 1/);
    assert.match(runtimeSource, /const SLIME_ULTIMATE_MAX_SUMMONS = 4/);
    assert.match(runtimeSource, /export function getSlimeUltimateSummonCount\(slimeHits\)/);
    assert.match(runtimeSource, /return isSlime\(player\) \? SLIME_ULTIMATE_MIN_HITS_REQUIRED : ULTIMATE_HITS_REQUIRED/);
    assert.match(runtimeSource, /function slimeHitsForUltimate\(player\)/);
    assert.match(runtimeSource, /return getSlimeUltimateSummonCount\(player\?\.slimeHits \?\? player\?\.slimeSummonCharge \?\? player\?\.ultimateHits \?\? 0\)/);
    assert.match(runtimeSource, /player\?\.slimeHits \?\? player\?\.slimeSummonCharge \?\? player\?\.ultimateHits \?\? 0/);
    assert.match(runtimeSource, /function hasSlimeUltimateCharge\(player\)/);
    assert.match(runtimeSource, /function consumeSlimeSummonCharge\(player\)/);
    assert.match(runtimeSource, /player\.slimeHits = getSlimeUltimateSummonCount\(\(player\.slimeHits \|\| 0\) \+ 1\)/);
    assert.match(runtimeSource, /player\.slimeSummonCharge = player\.slimeHits/);
    assert.match(runtimeSource, /player\.ultimateHits = player\.slimeHits/);
    assert.match(runtimeSource, /export function isSlimeUltimateReady\(slimeHits\)/);
    assert.match(runtimeSource, /player\.ultimateReady = isSlimeUltimateReady\(player\.slimeHits\)/);
    assert.match(runtimeSource, /function hasUsableUltimate\(player\)/);
    assert.match(runtimeSource, /return isSlime\(player\) \? hasSlimeUltimateCharge\(player\) : hits >= ULTIMATE_HITS_REQUIRED/);
    assert.match(runtimeSource, /ultimateHits: isSlime\(player\) \? slimeHitsForUltimate\(player\) : Math.min\(ULTIMATE_HITS_REQUIRED/);
    assert.doesNotMatch(runtimeSource, /owner\.ultimateHits = isSlime\(owner\)/);
    assert.match(runtimeSource, /if \(isSlime\(player\)\) \{\n\s*if \(!hasSlimeUltimateCharge\(player\)\) return false;/);
    assert.match(runtimeSource, /function castSlimeUltimate\(match, player, now\)/);
    assert.match(runtimeSource, /kind: slimeShot \? 'slime' : 'normal'/);
    assert.match(runtimeSource, /damage: slimeShot \? SLIME_PROJECTILE_DAMAGE : PROJECTILE_DAMAGE/);
    assert.match(runtimeSource, /hit\.ammo = Math\.max\(0, hit\.ammo - 1\)/);
    assert.match(runtimeSource, /owner\.ammo = Math\.min\(MAX_AMMO, owner\.ammo \+ 1\)/);
    assert.match(runtimeSource, /const spawnCount = slimeHitsForUltimate\(player\)/);
    assert.match(runtimeSource, /if \(spawnCount < SLIME_ULTIMATE_MIN_HITS_REQUIRED\) return/);
    assert.match(runtimeSource, /spawnBabySlimes\(match, player, spawnCount, now\)/);
    assert.match(runtimeSource, /if \(isSlime\(player\)\) \{\n\s*castSlimeUltimate\(match, player, now\);\n\s*return;\n\s*\}/);
    assert.match(runtimeSource, /if \(message\.ultimate && queueUltimateInput\(player, aim\)\) \{\n\s*spawnUltimateProjectile\(client\.match, player, Date\.now\(\)\);\n\s*\}/);
    assert.match(htmlSource, /client\.js\?v=20260630-slime-hits-simple/);
});

test('guangboo plays Web Audio projectile sounds on spawn, flight, and impact', () => {
    assert.match(clientSource, /audio: \{ context: null, unlocked: false, lastImpactAt: 0, lastFlyAt: 0 \}/);
    assert.match(clientSource, /function audioContext\(\)/);
    assert.match(clientSource, /window\.AudioContext \|\| window\.webkitAudioContext/);
    assert.match(clientSource, /function unlockAudio\(\)/);
    assert.match(clientSource, /context\.resume\(\)\.catch\(\(\) => \{\}\)/);
    assert.match(clientSource, /function playShotSound\(\)/);
    assert.match(clientSource, /function playProjectileFlySound\(\)/);
    assert.match(clientSource, /function playProjectileImpactSound\(\)/);
    assert.match(clientSource, /playShotSound\(\);\n\s*playProjectileFlySound\(\);/);
    assert.match(clientSource, /if \(!activeIds\.has\(id\)\) \{\n\s*playProjectileImpactSound\(\);/);
    assert.match(clientSource, /if \(!visible\) \{\n\s*playProjectileImpactSound\(\);/);
    assert.match(clientSource, /unlockAudio\(\);\n\s*event\.preventDefault\(\);/);
});

test('guangboo uses 6000 hp, 1200 damage, slower movement, ammo reload, and passive regen', () => {
    assert.match(runtimeSource, /const PLAYER_SPEED = 190/);
    assert.match(runtimeSource, /const PLAYER_MAX_HEALTH = 6000/);
    assert.match(runtimeSource, /const PROJECTILE_DAMAGE = 1200/);
    assert.match(runtimeSource, /const MAX_AMMO = 3/);
    assert.match(runtimeSource, /const AMMO_RELOAD_MS = 1400/);
    assert.match(runtimeSource, /const REGEN_DELAY_MS = 3000/);
    assert.match(runtimeSource, /const REGEN_TICK_MS = 1000/);
    assert.match(runtimeSource, /const REGEN_PER_TICK = 500/);
    assert.match(runtimeSource, /function resetRegenTimer\(player, now\)/);
    assert.match(runtimeSource, /function applyPassiveRegen\(player, now\)/);
    assert.match(runtimeSource, /const regenTicks = Math\.floor\(elapsed \/ REGEN_TICK_MS\)/);
    assert.match(runtimeSource, /player\.health = Math\.min\(PLAYER_MAX_HEALTH, player\.health \+ regenTicks \* REGEN_PER_TICK\)/);
    assert.doesNotMatch(runtimeSource, /REGEN_PER_SECOND \* dt/);
    assert.match(runtimeSource, /health: PLAYER_MAX_HEALTH/);
    assert.match(runtimeSource, /ammo: MAX_AMMO/);
    assert.match(runtimeSource, /player\.ammo = Math\.max\(0, player\.ammo - 1\)/);
});

test('guangboo renders monster head from server facing instead of live aim while aiming', () => {
    assert.match(clientSource, /const facingX = player\.facingX \?\? player\.facing\?\.x \?\? player\.aimX/);
    assert.match(clientSource, /const facingY = player\.facingY \?\? player\.facing\?\.y \?\? player\.aimY/);
    assert.match(clientSource, /const angle = Math\.atan2\(facingY \/ facingLength, facingX \/ facingLength\)/);
    assert.match(runtimeSource, /facingX: Number\(\(player\.facing\?\.x \?\? player\.aim\.x\)\.toFixed\(3\)\)/);
    assert.match(runtimeSource, /facingY: Number\(\(player\.facing\?\.y \?\? player\.aim\.y\)\.toFixed\(3\)\)/);
    assert.match(runtimeSource, /facing: \{ x: index % 2 === 0 \? 1 : -1, y: 0 \}/);
    assert.match(runtimeSource, /player\.facing = move/);
    assert.match(runtimeSource, /player\.facing = \{ x: dx, y: dy \}/);
});

test('guangboo uses Brawl-style half-screen floating touch sticks', () => {
    assert.match(clientSource, /function shouldStartFromHalf\(event\)/);
    assert.match(clientSource, /event\.pointerType !== 'touch'/);
    assert.match(clientSource, /event\.clientX >= midpoint/);
    assert.match(clientSource, /event\.clientX < midpoint/);
    assert.match(clientSource, /function moveStickBase\(clientX, clientY\)/);
    assert.match(clientSource, /stick\.pointerId === event\.pointerId/);
    assert.match(clientSource, /elements\.match\.setPointerCapture\(event\.pointerId\)/);
    assert.match(clientSource, /element\.addEventListener\('pointerdown', event => \{/);
    assert.match(clientSource, /event\.pointerType === 'touch' \|\| !state\.matchActive \|\| stick\.active/);
    assert.match(clientSource, /window\.addEventListener\('pointerup', finishAndShoot, \{ capture: true \}\)/);
    assert.match(clientSource, /if \(window\.PointerEvent \|\| !stick\.active\) return;/);
    assert.match(stylesSource, /\.stick-zone\.is-floating-stick/);
});

test('guangboo flushes release shots immediately instead of waiting for the next input tick', () => {
    assert.match(clientSource, /function sendQueuedShotNow\(\)/);
    assert.match(clientSource, /send\(currentInput\(\)\)/);
    assert.match(clientSource, /state\.queuedShots\.push\(normalized\);\n\s*sendQueuedShotNow\(\)/);
    assert.match(clientSource, /shotQueued: false/);
    assert.match(clientSource, /function queueReleaseShotOnce\(\)/);
    assert.match(clientSource, /if \(!isRightStick \|\| stick\.shotQueued\) return;/);
    assert.match(clientSource, /stick\.shotQueued = true;\n\s*queueShot\(shotAimForRelease\(\)\)/);
    assert.match(clientSource, /elements\.match\.addEventListener\('lostpointercapture', finishAndShoot\)/);
    assert.doesNotMatch(clientSource, /finishWithoutShot/);
});

test('guangboo auto-aims at the nearest opponent for tap-only attacks', () => {
    assert.match(clientSource, /function nearestOpponentAim\(\)/);
    assert.match(clientSource, /player\.id !== state\.playerId && player\.alive !== false/);
    assert.match(clientSource, /sort\(\(a, b\) => Math\.hypot\(a\.x - me\.x, a\.y - me\.y\) - Math\.hypot\(b\.x - me\.x, b\.y - me\.y\)\)/);
    assert.match(clientSource, /function shotAimForRelease\(\)/);
    assert.match(clientSource, /function localPlayerAim\(\)/);
    assert.match(clientSource, /stick\.instantAim = isRightStick \? null : aimFromPointer\(event\)/);
    assert.match(clientSource, /if \(isRightStick && !stick\.moved\) \{/);
    assert.match(clientSource, /thumb\.style\.transform = 'translate\(-50%, -50%\)';\n\s*return;/);
    assert.match(clientSource, /if \(!stick\.moved\) return nearestOpponentAim\(\) \|\| localPlayerAim\(\) \|\| state\.lastAim/);
    assert.doesNotMatch(clientSource, /stick\.instantAim \|\| pointerAim/);
    assert.match(clientSource, /stick\.moved = false/);
    assert.match(clientSource, /Math\.hypot\(pointer\.clientX - stick\.startX, pointer\.clientY - stick\.startY\) > 12/);
});

test('guangboo server queues firing inputs so later movement packets cannot swallow shots', () => {
    assert.match(runtimeSource, /if \(\(message\.firing \|\| message\.ultimate\) && client\.match\?\.status === 'active'\)/);
    assert.match(runtimeSource, /queueShotInput\(player, aim, Date\.now\(\)\)/);
    assert.match(runtimeSource, /firing: false,/);
    assert.match(runtimeSource, /player\.queuedShotAims\.length && player\.ammo > 0/);
    assert.doesNotMatch(runtimeSource, /player\.queuedShotAim\b/);
});
