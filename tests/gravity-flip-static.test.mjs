import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../gravity-flip/index.html', import.meta.url), 'utf8');

test('gravity flip has distance-based chaser threat sound and increased supplies', () => {
    assert.match(html, /function updateThreatSound\(threat\)/);
    assert.match(html, /threatOsc=audioCtx\.createOscillator\(\)/);
    assert.match(html, /danger\*118/);
    assert.match(html, /chaserSupplies\.length>=12/);
    assert.match(html, /chaserSupplies\.length<9&&\s*chaserElapsed%12===0/);
    assert.match(html, /chaserSupplies\.length<10/);
    assert.match(html, /spawnChaserSupply\(true\);\s*spawnChaserSupply\(true\);\s*spawnChaserSupply\(true\);\s*spawnChaserSupply\(true\);\s*spawnChaserSupply\(true\);\s*spawnChaserSupply\(true\);\s*spawnChaserSupply\(true\);\s*spawnChaserSupply\(true\);/);
});

test('gravity flip implements the three-phase darkness event after chaser clear', () => {
    assert.match(html, /let darkEventMode=false/);
    assert.match(html, /function startDarkEvent\(\)/);
    assert.match(html, /function startDarkInterlude\(\)/);
    assert.match(html, /function startDarkMutatedPhase\(\)/);
    assert.match(html, /function finishDarkEvent\(\)/);
    assert.match(html, /startDarkEvent\(\)/);
    assert.match(html, /darkPassedCount===10/);
    assert.match(html, /darkPassedCount>=20/);
    assert.match(html, /drawDarknessOverlay\(\)/);
    assert.match(html, /drawNightmareMonster\(darkMonster\)/);
    assert.match(html, /shatterDarkObstacle\(o\)/);
});

test('gravity flip caps visible chasers at three', () => {
    assert.match(html, /const MAX_CHASERS=3/);
    assert.match(html, /chasers\.length>=MAX_CHASERS/);
    assert.match(html, /chaserTargetCount<MAX_CHASERS/);
});

test('gravity flip keeps an admin shortcut for testing the darkness event', () => {
    assert.match(html, /if\(target>=70\)/);
    assert.match(html, /점 암흑 이벤트로 이동했습니다/);
});
