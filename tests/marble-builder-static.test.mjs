import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createMinsungServer } from '../server.mjs';

const html = readFileSync(new URL('../marble-builder/index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../marble-builder/game.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../marble-builder/styles.css', import.meta.url), 'utf8');

test('marble builder exposes spawn controls, draggable roads, and a basket goal', () => {
    assert.match(html, /id="spawnButton"/);
    assert.match(html, /id="clearButton"[^>]*>전체 삭제</);
    assert.match(html, /id="deleteButton"[^>]*>선택 삭제</);
    assert.match(html, /id="resetButton"[^>]*>리셋</);
    assert.match(html, /id="confirmButton"[^>]*>확인</);
    assert.doesNotMatch(html, /다시 굴리기/);
    assert.match(html, /data-tool="wood"/);
    assert.match(html, /data-tool="rubber"/);
    assert.match(html, /data-tool="steel"/);
    assert.match(html, /data-tool="goal"/);
    assert.match(html, /골인 바구니/);
    assert.match(script, /function beginPlacement/);
    assert.match(script, /function addGoal/);
    assert.match(script, /function rodEndpoints/);
    assert.match(script, /mode: 'start'/);
    assert.match(script, /mode: 'end'/);
    assert.match(script, /mode: 'move'/);
});

test('marble builder uses earth gravity, fixed substeps, friction, and disc inertia', () => {
    assert.match(script, /const PIXELS_PER_METER = 100/);
    assert.match(script, /const EARTH_GRAVITY = 9\.81/);
    assert.match(script, /const FIXED_STEP = 1 \/ 120/);
    assert.match(script, /const BALL_INERTIA = 0\.5 \* BALL_MASS/);
    assert.match(script, /maxFriction = rect\.material\.friction \* normalImpulse/);
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

test('marble builder keeps all four top actions in one responsive row', () => {
    assert.match(styles, /\.top-actions \{[^}]*grid-template-columns: repeat\(4,/s);
    assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.top-actions \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
    assert.doesNotMatch(styles, /\.action\.danger \{ position: absolute/);
});

test('marble builder separates clear, reset, and goal confirmation behavior', () => {
    assert.match(script, /function clearAll\(\)/);
    assert.match(script, /function resetGame\(\)/);
    assert.match(script, /clearButton\.addEventListener\('click', clearAll\)/);
    assert.match(script, /resetButton\.addEventListener\('click', resetGame\)/);
    assert.match(script, /confirmButton\.addEventListener\('click',[\s\S]*successPanel\.hidden = true/);
});

test('marble builder is responsive and touch enabled', () => {
    assert.match(styles, /touch-action: none/);
    assert.match(styles, /@media \(max-width: 720px\)/);
    assert.match(script, /addEventListener\('pointerdown'/);
    assert.match(script, /pointerType === 'touch'/);
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