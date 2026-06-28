import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import WebSocket from 'ws';
import { createMinsungServer } from '../server.mjs';

async function withServer(fn) {
    const tempDir = mkdtempSync(join(tmpdir(), 'minsung-guangboo-bot-'));
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
            reject(new Error('Timed out waiting for initial WebSocket message'));
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

function waitForWsMessage(socket, predicate, timeoutMs = 3000) {
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

test('fills a guangboo duel with one bot for solo testing', async () => {
    await withServer(async baseUrl => {
        const wsBaseUrl = baseUrl.replace(/^http/, 'ws');
        const { socket } = await openWebSocketAndWaitFor(
            `${wsBaseUrl}/guangboo/ws`,
            message => message.type === 'hello'
        );

        try {
            socket.send(JSON.stringify({
                type: 'joinQueue',
                nickname: 'Solo Tester',
                mode: 'duel',
                fillWithBots: true
            }));

            const start = await waitForWsMessage(socket, message => message.type === 'matchStart');
            assert.equal(start.mode, 'duel');
            assert.equal(start.requiredPlayers, 2);
            assert.equal(start.players.length, 2);
            assert.equal(start.players.filter(player => player.bot).length, 1);

            const state = await waitForWsMessage(socket, message =>
                message.type === 'state' &&
                message.players.some(player => player.bot) &&
                message.projectiles.some(projectile => projectile.ownerId !== start.playerId)
            );
            assert.equal(state.players.length, 2);
        } finally {
            socket.close();
        }
    });
});

test('fills a guangboo survival match with bots for solo testing', async () => {
    await withServer(async baseUrl => {
        const wsBaseUrl = baseUrl.replace(/^http/, 'ws');
        const { socket } = await openWebSocketAndWaitFor(
            `${wsBaseUrl}/guangboo/ws`,
            message => message.type === 'hello'
        );

        try {
            socket.send(JSON.stringify({
                type: 'joinQueue',
                nickname: 'Solo Survival',
                mode: 'survival',
                fillWithBots: true
            }));

            const start = await waitForWsMessage(socket, message => message.type === 'matchStart');
            assert.equal(start.mode, 'survival');
            assert.equal(start.requiredPlayers, 4);
            assert.equal(start.players.length, 4);
            assert.equal(start.players.filter(player => player.bot).length, 3);
        } finally {
            socket.close();
        }
    });
});
