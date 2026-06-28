import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
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

test('requires setup before authentication', async () => {
    await withServer(async (baseUrl) => {
        const session = await requestJson(baseUrl, '/api/session');
        assert.equal(session.response.status, 200);
        assert.equal(session.data.setupRequired, true);
        assert.equal(session.data.authenticated, false);

        const appResponse = await fetch(`${baseUrl}/ball.html`, { redirect: 'manual' });
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

        const appResponse = await fetch(`${baseUrl}/ball.html`, {
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
        assert.match(await marioResponse.text(), /Pixel Hill Runner/);
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
