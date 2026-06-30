import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import WebSocket from 'ws';
import { createMinsungServer } from '../server.mjs';
import {
    getSlimeUltimateSummonCount,
    isBabySlimeCellPassable,
    isSlimeUltimateReady
} from '../guangboo-runtime.mjs';

async function withServer(fn) {
    const tempDir = mkdtempSync(join(tmpdir(), 'minsung-slime-ultimate-'));
    const { server, close } = createMinsungServer({
        dbPath: join(tempDir, 'minsung.sqlite'),
        sessionTtlMs: 60_000
    });

    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
        await fn(baseUrl);
    } finally {
        await new Promise(resolve => server.close(resolve));
        close();
        rmSync(tempDir, { recursive: true, force: true });
    }
}

function openWebSocketAndWaitFor(url, predicate, timeoutMs = 2500) {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(url);
        const timer = setTimeout(() => {
            cleanup();
            socket.close();
            reject(new Error('Timed out waiting for WebSocket message'));
        }, timeoutMs);

        function cleanup() {
            clearTimeout(timer);
            socket.off('message', onMessage);
            socket.off('error', onError);
        }

        function onMessage(raw) {
            const message = JSON.parse(raw.toString('utf8'));
            if (!predicate(message)) return;
            cleanup();
            resolve({ socket, message });
        }

        function onError(error) {
            cleanup();
            reject(error);
        }

        socket.on('message', onMessage);
        socket.on('error', onError);
    });
}

function waitForWsMessage(socket, predicate, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error('Timed out waiting for WebSocket message'));
        }, timeoutMs);

        function cleanup() {
            clearTimeout(timer);
            socket.off('message', onMessage);
            socket.off('error', onError);
        }

        function onMessage(raw) {
            const message = JSON.parse(raw.toString('utf8'));
            if (!predicate(message)) return;
            cleanup();
            resolve(message);
        }

        function onError(error) {
            cleanup();
            reject(error);
        }

        socket.on('message', onMessage);
        socket.on('error', onError);
    });
}

test('slime ultimate summons exactly one baby slime per successful hit, capped at four', () => {
    const cases = [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3],
        [4, 4],
        [5, 4],
        [99, 4]
    ];

    for (const [hits, expectedSummons] of cases) {
        assert.equal(getSlimeUltimateSummonCount(hits), expectedSummons, `${hits} hits`);
    }
});

test('slime ultimate is ready from the first successful hit only', () => {
    assert.equal(isSlimeUltimateReady(0), false);
    assert.equal(isSlimeUltimateReady(1), true);
    assert.equal(isSlimeUltimateReady(2), true);
    assert.equal(isSlimeUltimateReady(3), true);
    assert.equal(isSlimeUltimateReady(4), true);
    assert.equal(isSlimeUltimateReady(5), true);
});

test('baby slime pathing rejects wall cells but keeps adjacent route cells usable', () => {
    const tileSize = 40;
    const map = {
        width: 240,
        height: 200,
        tileSize,
        cols: 6,
        rows: 5,
        walls: [{ id: 'w0', col: 3, row: 2 }],
        obstacles: [{ id: 'w0', x: 3 * tileSize + tileSize / 2, y: 2 * tileSize + tileSize / 2, w: tileSize, h: tileSize }]
    };

    assert.equal(isBabySlimeCellPassable(map, { col: 3, row: 2 }), false);
    assert.equal(isBabySlimeCellPassable(map, { col: 2, row: 2 }), true);
    assert.equal(isBabySlimeCellPassable(map, { col: 3, row: 1 }), true);
    assert.equal(isBabySlimeCellPassable(map, { col: -1, row: 2 }), false);
});

test('slime can cast ultimate after one real hit and immediately spawns one baby slime', async () => {
    await withServer(async baseUrl => {
        const wsBaseUrl = baseUrl.replace(/^http/, 'ws');
        const { socket } = await openWebSocketAndWaitFor(
            `${wsBaseUrl}/guangboo/ws`,
            message => message.type === 'hello'
        );

        try {
            socket.send(JSON.stringify({
                type: 'joinQueue',
                nickname: 'Slime Verify',
                mode: 'duel',
                character: 'slime',
                fillWithBots: true
            }));

            const start = await waitForWsMessage(socket, message => message.type === 'matchStart');
            socket.send(JSON.stringify({
                type: 'input',
                seq: 1,
                move: { x: 0, y: 0 },
                aim: { x: 1, y: 0 },
                firing: true
            }));

            const charged = await waitForWsMessage(socket, message => {
                if (message.type !== 'state') return false;
                const player = message.players.find(candidate => candidate.id === start.playerId);
                return player?.character === 'slime' && player.ultimateHits === 1 && player.ultimateReady === true;
            });
            const chargedPlayer = charged.players.find(player => player.id === start.playerId);
            assert.equal(chargedPlayer.ultimateRequired, 1);

            socket.send(JSON.stringify({
                type: 'input',
                seq: 2,
                move: { x: 0, y: 0 },
                aim: { x: 1, y: 0 },
                ultimate: true
            }));

            const summoned = await waitForWsMessage(socket, message =>
                message.type === 'state' &&
                message.summons.filter(summon => summon.ownerId === start.playerId).length === 1
            );
            assert.equal(summoned.summons.filter(summon => summon.ownerId === start.playerId).length, 1);
        } finally {
            socket.close();
        }
    });
});
