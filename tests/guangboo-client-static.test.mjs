import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const clientSource = readFileSync(new URL('../guangboo/client.js', import.meta.url), 'utf8');
const stylesSource = readFileSync(new URL('../guangboo/styles.css', import.meta.url), 'utf8');
const htmlSource = readFileSync(new URL('../guangboo/index.html', import.meta.url), 'utf8');

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
    assert.doesNotMatch(htmlSource, /user-scalable=no|maximum-scale/);
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
    assert.match(clientSource, /pendingShotAim/);
    assert.match(clientSource, /function queueShot\(aim\)/);
    assert.match(clientSource, /element\.addEventListener\('pointerup', event => finish\(event, true\)\)/);
    assert.match(clientSource, /let firing = false/);
    assert.match(clientSource, /state\.pendingShotAim = null/);
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
