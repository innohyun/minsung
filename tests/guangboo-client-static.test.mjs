import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const clientSource = readFileSync(new URL('../guangboo/client.js', import.meta.url), 'utf8');
const stylesSource = readFileSync(new URL('../guangboo/styles.css', import.meta.url), 'utf8');

test('guangboo client requests fullscreen when matchmaking starts', () => {
    assert.match(clientSource, /function requestGameFullscreen\(\)/);
    assert.match(clientSource, /requestFullscreen\(\{ navigationUI: 'hide' \}\)/);
    assert.match(clientSource, /document\.addEventListener\('fullscreenchange', resizeCanvas\)/);
    assert.match(stylesSource, /html:fullscreen/);
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
    assert.match(clientSource, /drawLocalAimGuide\(\)/);
    assert.match(clientSource, /rgba\(5, 9, 6, 0\.62\)/);
    assert.match(clientSource, /rgba\(215, 242, 82, 0\.64\)/);
});
