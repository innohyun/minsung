import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { createMinsungServer } from '../server.mjs';

async function withServer(fn) {
    const tempDir = mkdtempSync(join(tmpdir(), 'minsung-server-'));
    const { server, close } = createMinsungServer({
        dbPath: join(tempDir, 'minsung.sqlite'),
        sessionTtlMs: 60_000
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
        await fn(baseUrl);
    } finally {
        await new Promise((resolve) => server.close(resolve));
        close();
        rmSync(tempDir, { recursive: true, force: true });
    }
}

async function requestJson(baseUrl, path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(options.headers || {})
        },
        redirect: options.redirect || 'follow'
    });
    const data = await response.json();
    return { response, data };
}

function cookieFrom(response) {
    const setCookie = response.headers.get('set-cookie');
    assert.ok(setCookie, 'expected Set-Cookie header');
    return setCookie.split(';')[0];
}

function openWebSocket(url) {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(url);
        socket.once('open', () => resolve(socket));
        socket.once('error', reject);
    });
}

function openWebSocketAndWaitFor(url, predicate, timeoutMs = 2000) {
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
        socket.once('error', onError);
    });
}

function waitForWsMessage(socket, predicate, timeoutMs = 2000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();
            reject(new Error('Timed out waiting for WebSocket message'));
        }, timeoutMs);

        function cleanup() {
            clearTimeout(timer);
            socket.off('message', onMessage);
            socket.off('close', onClose);
            socket.off('error', onError);
        }

        function onMessage(raw) {
            const message = JSON.parse(raw.toString('utf8'));
            if (!predicate(message)) return;
            cleanup();
            resolve(message);
        }

        function onClose() {
            cleanup();
            reject(new Error('WebSocket closed before expected message'));
        }

        function onError(error) {
            cleanup();
            reject(error);
        }

        socket.on('message', onMessage);
        socket.once('close', onClose);
        socket.once('error', onError);
    });
}

test('requires setup before authentication', async () => {
    await withServer(async (baseUrl) => {
        const session = await requestJson(baseUrl, '/api/session');
        assert.equal(session.response.status, 200);
        assert.equal(session.data.setupRequired, true);
        assert.equal(session.data.authenticated, false);

        const appResponse = await fetch(`${baseUrl}/ball/ball.html`, { redirect: 'manual' });
        assert.equal(appResponse.status, 302);
        assert.equal(appResponse.headers.get('location'), '/');

        const marioResponse = await fetch(`${baseUrl}/mario`, { redirect: 'manual' });
        assert.equal(marioResponse.status, 302);
        assert.equal(marioResponse.headers.get('location'), '/');
    });
});

test('sets up admin password and allows protected entries with a session cookie', async () => {
    await withServer(async (baseUrl) => {
        const setup = await requestJson(baseUrl, '/api/setup', {
            method: 'POST',
            body: JSON.stringify({ password: 'local-pass' })
        });
        assert.equal(setup.response.status, 200);
        assert.equal(setup.data.authenticated, true);
        const cookie = cookieFrom(setup.response);

        const session = await requestJson(baseUrl, '/api/session', {
            headers: { Cookie: cookie }
        });
        assert.equal(session.data.setupRequired, false);
        assert.equal(session.data.authenticated, true);

        const appResponse = await fetch(`${baseUrl}/ball/ball.html`, {
            headers: { Cookie: cookie },
            redirect: 'manual'
        });
        assert.equal(appResponse.status, 200);
        assert.match(appResponse.headers.get('content-type'), /text\/html/);
        await appResponse.arrayBuffer();

        const marioResponse = await fetch(`${baseUrl}/mario`, {
            headers: { Cookie: cookie },
            redirect: 'manual'
        });
        assert.equal(marioResponse.status, 200);
        const marioHtml = await marioResponse.text();
        assert.match(marioHtml, /Pixel Hill Runner/);
        assert.match(marioHtml, /id="stageCount"/);
    });
});

test('mario exposes fullscreen exit, attack aiming, capped projectiles, and player health bar wiring', () => {
    const html = readFileSync(new URL('../mario/index.html', import.meta.url), 'utf8');
    const script = readFileSync(new URL('../mario/game.js', import.meta.url), 'utf8');

    assert.match(html, /id="exitFullscreenButton"/);
    assert.match(html, /data-control="attack"/);
    assert.match(html, /id="fullscreenButton"/);
    assert.match(script, /function exitFullscreen\(\)/);
    assert.match(script, /if \(input\.attack && state\.mode === "playing"\) drawAimReticle\(\)/);
    assert.match(script, /const ATTACK_RANGE = 280/);
    assert.match(script, /projectile\.targetX/);
    assert.match(script, /function drawPlayerHealthBar/);
});

test('serves guangboo publicly and returns local leaderboard data', async () => {
    await withServer(async (baseUrl) => {
        const appResponse = await fetch(`${baseUrl}/guangboo/index.html`, { redirect: 'manual' });
        assert.equal(appResponse.status, 200);
        assert.match(appResponse.headers.get('content-type'), /text\/html/);
        assert.match(await appResponse.text(), /Guangboo/);

        const shortRoute = await fetch(`${baseUrl}/guangboo`, { redirect: 'manual' });
        assert.equal(shortRoute.status, 200);

        const leaderboard = await requestJson(baseUrl, '/api/guangboo/leaderboard');
        assert.equal(leaderboard.response.status, 200);
        assert.deepEqual(leaderboard.data.leaderboard, []);
    });
});

test('starts a guangboo survival match through automatic WebSocket matchmaking', async () => {
    await withServer(async (baseUrl) => {
        const wsBaseUrl = baseUrl.replace(/^http/, 'ws');
        const sockets = await Promise.all(
            Array.from({ length: 4 }, () => openWebSocket(`${wsBaseUrl}/guangboo/ws`))
        );

        try {
            sockets.forEach((socket, index) => {
                socket.send(JSON.stringify({
                    type: 'joinQueue',
                    nickname: `Monster ${index + 1}`,
                    mode: 'survival'
                }));
            });

            const starts = await Promise.all(
                sockets.map(socket => waitForWsMessage(socket, message => message.type === 'matchStart'))
            );
            assert.equal(new Set(starts.map(message => message.matchId)).size, 1);
            assert.equal(starts[0].players.length, 4);
            assert.equal(starts[0].requiredPlayers, 4);

            const state = await waitForWsMessage(sockets[0], message => message.type === 'state');
            assert.equal(state.players.length, 4);
            assert.equal(state.aliveCount, 4);
            assert.equal(Array.isArray(state.projectiles), true);

            sockets.slice(1).forEach(socket => socket.close());
            const result = await waitForWsMessage(sockets[0], message => message.type === 'matchEnd');
            assert.equal(result.winnerId, starts[0].playerId);
            assert.equal(result.results[0].nickname, 'Monster 1');

            const leaderboard = await requestJson(baseUrl, '/api/guangboo/leaderboard');
            assert.equal(leaderboard.data.leaderboard[0].nickname, 'Monster 1');
            assert.equal(leaderboard.data.leaderboard[0].wins, 1);
        } finally {
            sockets.forEach(socket => socket.close());
        }
    });
});

test('starts a guangboo official-map match with selected map data', async () => {
    await withServer(async baseUrl => {
        const wsBaseUrl = baseUrl.replace(/^http/, 'ws');
        const sockets = [];
        const hellos = [];
        const starts = [];
        try {
            for (let index = 0; index < 4; index += 1) {
                const { socket, message } = await openWebSocketAndWaitFor(
                    `${wsBaseUrl}/guangboo/ws`,
                    msg => msg.type === 'hello'
                );
                sockets.push(socket);
                hellos.push(message);
                socket.on('message', data => {
                    const parsed = JSON.parse(data.toString('utf8'));
                    if (parsed.type === 'matchStart') starts.push(parsed);
                });
            }
            assert.deepEqual(
                hellos[0].modes.find(mode => mode.key === 'survival'),
                { key: 'survival', label: '정식 맵 전투', size: 4 }
            );
            assert.deepEqual(
                hellos[0].modes.find(mode => mode.key === 'duel'),
                { key: 'duel', label: '1:1', size: 2 }
            );
            sockets.forEach((socket, index) => {
                socket.send(JSON.stringify({
                    type: 'joinQueue',
                    nickname: `MapPlayer${index}`,
                    mode: 'survival',
                    officialMapId: 'official:ring'
                }));
            });
            const firstStart = await waitForWsMessage(sockets[0], message => message.type === 'matchStart');
            starts.push(firstStart);
            assert.equal(starts[0].mode, 'survival');
            assert.equal(starts[0].map.id, 'official:ring');
            assert.equal(starts[0].map.name, '강철 링');
            assert.ok(starts[0].map.spawnPoints.length >= 4);
        } finally {
            sockets.forEach(socket => socket.close());
        }
    });
});

test('allows custom domain bridge requests with bearer session tokens', async () => {
    await withServer(async (baseUrl) => {
        const preflight = await fetch(`${baseUrl}/api/session`, {
            method: 'OPTIONS',
            headers: {
                Origin: 'https://minsung.classaimate.com',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'authorization',
                'Access-Control-Request-Private-Network': 'true'
            }
        });
        assert.equal(preflight.status, 204);
        assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://minsung.classaimate.com');
        assert.equal(preflight.headers.get('access-control-allow-private-network'), 'true');

        const setup = await requestJson(baseUrl, '/api/setup', {
            method: 'POST',
            headers: { Origin: 'https://minsung.classaimate.com' },
            body: JSON.stringify({ password: 'local-pass' })
        });
        assert.equal(setup.response.status, 200);
        assert.equal(setup.response.headers.get('access-control-allow-origin'), 'https://minsung.classaimate.com');
        assert.ok(setup.data.sessionToken);

        const session = await requestJson(baseUrl, '/api/session', {
            headers: {
                Origin: 'https://minsung.classaimate.com',
                Authorization: `Bearer ${setup.data.sessionToken}`
            }
        });
        assert.equal(session.response.status, 200);
        assert.equal(session.data.authenticated, true);

        const logout = await requestJson(baseUrl, '/api/logout', {
            method: 'POST',
            headers: {
                Origin: 'https://minsung.classaimate.com',
                Authorization: `Bearer ${setup.data.sessionToken}`
            }
        });
        assert.equal(logout.response.status, 200);

        const afterLogout = await requestJson(baseUrl, '/api/session', {
            headers: {
                Origin: 'https://minsung.classaimate.com',
                Authorization: `Bearer ${setup.data.sessionToken}`
            }
        });
        assert.equal(afterLogout.data.authenticated, false);
    });
});

test('rejects bad password and accepts correct login after setup', async () => {
    await withServer(async (baseUrl) => {
        await requestJson(baseUrl, '/api/setup', {
            method: 'POST',
            body: JSON.stringify({ password: 'local-pass' })
        });

        const badLogin = await requestJson(baseUrl, '/api/login', {
            method: 'POST',
            body: JSON.stringify({ password: 'wrong-pass' })
        });
        assert.equal(badLogin.response.status, 401);
        assert.equal(badLogin.data.error, 'invalid_password');

        const goodLogin = await requestJson(baseUrl, '/api/login', {
            method: 'POST',
            body: JSON.stringify({ password: 'local-pass' })
        });
        assert.equal(goodLogin.response.status, 200);
        assert.equal(goodLogin.data.authenticated, true);
    });
});

test('logout destroys the session cookie', async () => {
    await withServer(async (baseUrl) => {
        const setup = await requestJson(baseUrl, '/api/setup', {
            method: 'POST',
            body: JSON.stringify({ password: 'local-pass' })
        });
        const cookie = cookieFrom(setup.response);

        const logout = await requestJson(baseUrl, '/api/logout', {
            method: 'POST',
            headers: { Cookie: cookie }
        });
        assert.equal(logout.response.status, 200);

        const session = await requestJson(baseUrl, '/api/session', {
            headers: { Cookie: cookie }
        });
        assert.equal(session.data.authenticated, false);
    });
});
