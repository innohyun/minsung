import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { DatabaseSync } from 'node:sqlite';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GUANGBOO_SCHEMA_SQL, createGuangbooRealtime, createGuangbooStore } from './guangboo-runtime.mjs';

const ROOT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 4173;
const COOKIE_NAME = 'minsung_admin_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_JSON_BYTES = 512 * 1024;
const ALLOWED_BRIDGE_ORIGINS = new Set([
    'https://minsung.classaimate.com'
]);

const PROTECTED_ENTRY_PATHS = new Set([
    '/ball/ball.html',
    '/cargame.html',
    '/gam.html',
    '/index copy.html',
    '/index%20copy.html',
    '/mario',
    '/mario/',
    '/mario/index.html'
]);

const MIME_TYPES = new Map([
    ['.css', 'text/css; charset=utf-8'],
    ['.html', 'text/html; charset=utf-8'],
    ['.js', 'text/javascript; charset=utf-8'],
    ['.json', 'application/json; charset=utf-8'],
    ['.png', 'image/png'],
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.webp', 'image/webp'],
    ['.svg', 'image/svg+xml; charset=utf-8'],
    ['.ico', 'image/x-icon']
]);

function nowIso() {
    return new Date().toISOString();
}

function hashToken(token) {
    return createHash('sha256').update(token).digest('base64url');
}

function hashPassword(password, salt) {
    return scryptSync(password, salt, 64).toString('base64url');
}

function safePasswordCompare(password, salt, expectedHash) {
    const actual = Buffer.from(hashPassword(password, salt), 'base64url');
    const expected = Buffer.from(expectedHash, 'base64url');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function parseCookie(header) {
    const cookies = new Map();
    if (!header) return cookies;
    for (const part of header.split(';')) {
        const index = part.indexOf('=');
        if (index === -1) continue;
        const name = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();
        if (name) cookies.set(name, decodeURIComponent(value));
    }
    return cookies;
}

function isAllowedBridgeOrigin(origin) {
    return Boolean(origin && ALLOWED_BRIDGE_ORIGINS.has(origin));
}

function applyCorsHeaders(req, res) {
    const origin = req.headers.origin;
    if (!isAllowedBridgeOrigin(origin)) return;
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Vary', 'Origin');
    if (req.headers['access-control-request-private-network'] === 'true') {
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
}

function setSessionCookie(res, token, maxAgeSeconds) {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`);
}

function clearSessionCookie(res) {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function sendJson(res, statusCode, payload) {
    const body = JSON.stringify(payload);
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store'
    });
    res.end(body);
}

function redirect(res, location) {
    res.writeHead(302, {
        Location: location,
        'Cache-Control': 'no-store'
    });
    res.end();
}

async function readJsonBody(req) {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
        size += chunk.length;
        if (size > MAX_JSON_BYTES) {
            const error = new Error('request_too_large');
            error.statusCode = 413;
            throw error;
        }
        chunks.push(chunk);
    }
    if (!chunks.length) return {};
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        const error = new Error('invalid_json');
        error.statusCode = 400;
        throw error;
    }
}

function writeMethodNotAllowed(res) {
    sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
}

function isTrustedWriteRequest(req) {
    const origin = req.headers.origin;
    if (!origin) return true;
    const protocol = req.socket.encrypted ? 'https' : 'http';
    return origin === `${protocol}://${req.headers.host}` || isAllowedBridgeOrigin(origin);
}

function createDatabase(dbPath) {
    mkdirSync(dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);
    db.exec(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            password_salt TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY,
            created_at INTEGER NOT NULL,
            last_seen_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL
        );
    `);
    db.exec(GUANGBOO_SCHEMA_SQL);
    for (const statement of [
        "ALTER TABLE guangboo_custom_maps ADD COLUMN mode TEXT NOT NULL DEFAULT 'survival'",
        "ALTER TABLE guangboo_custom_maps ADD COLUMN summary TEXT NOT NULL DEFAULT ''"
    ]) {
        try { db.exec(statement); } catch {}
    }
    return db;
}

function createAuthStore(db, sessionTtlMs) {
    const getAdmin = db.prepare('SELECT * FROM admins WHERE id = 1');
    const insertAdmin = db.prepare('INSERT INTO admins (id, password_salt, password_hash, created_at, updated_at) VALUES (1, ?, ?, ?, ?)');
    const insertSession = db.prepare('INSERT INTO sessions (token_hash, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?)');
    const getSession = db.prepare('SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?');
    const touchSession = db.prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?');
    const deleteSession = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
    const deleteExpired = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');

    function hasAdmin() {
        return Boolean(getAdmin.get());
    }

    function createAdmin(password) {
        if (hasAdmin()) return false;
        const salt = randomBytes(16).toString('base64url');
        const passwordHash = hashPassword(password, salt);
        const timestamp = nowIso();
        insertAdmin.run(salt, passwordHash, timestamp, timestamp);
        return true;
    }

    function verifyPassword(password) {
        const admin = getAdmin.get();
        if (!admin) return false;
        return safePasswordCompare(password, admin.password_salt, admin.password_hash);
    }

    function createSession() {
        const token = randomBytes(32).toString('base64url');
        const timestamp = Date.now();
        insertSession.run(hashToken(token), timestamp, timestamp, timestamp + sessionTtlMs);
        return token;
    }

    function getValidSession(token) {
        if (!token) return null;
        const timestamp = Date.now();
        deleteExpired.run(timestamp);
        const tokenHash = hashToken(token);
        const session = getSession.get(tokenHash, timestamp);
        if (!session) return null;
        touchSession.run(timestamp, tokenHash);
        return session;
    }

    function destroySession(token) {
        if (!token) return;
        deleteSession.run(hashToken(token));
    }

    return {
        hasAdmin,
        createAdmin,
        verifyPassword,
        createSession,
        getValidSession,
        destroySession
    };
}

function getSessionToken(req) {
    return parseCookie(req.headers.cookie).get(COOKIE_NAME) || '';
}

function getAuthToken(req) {
    const authorization = req.headers.authorization || '';
    if (authorization.toLowerCase().startsWith('bearer ')) {
        return authorization.slice(7).trim();
    }
    return getSessionToken(req);
}

function isAuthenticated(req, store) {
    return Boolean(store.getValidSession(getAuthToken(req)));
}

function normalizeRequestPath(url) {
    const rawPath = url.pathname === '/' ? '/index.html' : url.pathname;
    if (rawPath === '/mario' || rawPath === '/mario/') return '/mario/index.html';
    if (rawPath === '/guangboo' || rawPath === '/guangboo/') return '/guangboo/index.html';
    return rawPath;
}

function resolveStaticPath(rootDir, requestPath) {
    const decodedPath = decodeURIComponent(requestPath);
    const relativePath = decodedPath.replace(/^\/+/, '');
    const resolvedPath = resolve(rootDir, relativePath);
    if (resolvedPath !== rootDir && !resolvedPath.startsWith(`${rootDir}${sep}`)) {
        return null;
    }
    return resolvedPath;
}

function serveStaticFile(req, res, rootDir, requestPath) {
    const filePath = resolveStaticPath(rootDir, requestPath);
    if (!filePath || !existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
    }

    const stat = statSync(filePath);
    if (!stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
    }

    const contentType = MIME_TYPES.get(extname(filePath).toLowerCase()) || 'application/octet-stream';
    const headers = {
        'Content-Type': contentType,
        'Content-Length': stat.size
    };
    if (requestPath.startsWith('/guangboo/')) {
        headers['Cache-Control'] = 'no-store';
    }
    res.writeHead(200, headers);
    if (req.method === 'HEAD') {
        res.end();
        return;
    }
    createReadStream(filePath).pipe(res);
}

function isProtectedEntry(url) {
    return PROTECTED_ENTRY_PATHS.has(url.pathname) || PROTECTED_ENTRY_PATHS.has(decodeURIComponent(url.pathname));
}

function createTransportServer(handler, tls) {
    if (!tls) return createHttpServer(handler);
    return createHttpsServer({
        cert: readFileSync(tls.certPath),
        key: readFileSync(tls.keyPath)
    }, handler);
}

export function createMinsungServer(options = {}) {
    const rootDir = options.rootDir || ROOT_DIR;
    const dbPath = options.dbPath || process.env.MINSUNG_DB_PATH || join(rootDir, '.local', 'minsung.sqlite');
    const sessionTtlMs = options.sessionTtlMs || SESSION_TTL_MS;
    const db = createDatabase(dbPath);
    const store = createAuthStore(db, sessionTtlMs);
    const guangbooStore = createGuangbooStore(db);

    const server = createTransportServer(async (req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
        applyCorsHeaders(req, res);

        try {
            if (req.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
                if (!isAllowedBridgeOrigin(req.headers.origin)) {
                    return sendJson(res, 403, { ok: false, error: 'untrusted_origin' });
                }
                res.writeHead(204, { 'Cache-Control': 'no-store' });
                res.end();
                return;
            }

            if (url.pathname === '/api/session') {
                if (req.method !== 'GET') return writeMethodNotAllowed(res);
                return sendJson(res, 200, {
                    ok: true,
                    authenticated: isAuthenticated(req, store),
                    setupRequired: !store.hasAdmin()
                });
            }

            if (url.pathname === '/api/setup') {
                if (req.method !== 'POST') return writeMethodNotAllowed(res);
                if (!isTrustedWriteRequest(req)) return sendJson(res, 403, { ok: false, error: 'untrusted_origin' });
                if (store.hasAdmin()) return sendJson(res, 409, { ok: false, error: 'already_configured' });
                const body = await readJsonBody(req);
                const password = String(body.password || '');
                if (password.length < 4) return sendJson(res, 400, { ok: false, error: 'password_too_short' });
                store.createAdmin(password);
                const token = store.createSession();
                setSessionCookie(res, token, Math.floor(sessionTtlMs / 1000));
                return sendJson(res, 200, { ok: true, authenticated: true, setupRequired: false, sessionToken: token });
            }

            if (url.pathname === '/api/login') {
                if (req.method !== 'POST') return writeMethodNotAllowed(res);
                if (!isTrustedWriteRequest(req)) return sendJson(res, 403, { ok: false, error: 'untrusted_origin' });
                if (!store.hasAdmin()) return sendJson(res, 409, { ok: false, error: 'setup_required' });
                const body = await readJsonBody(req);
                const password = String(body.password || '');
                if (!store.verifyPassword(password)) return sendJson(res, 401, { ok: false, error: 'invalid_password' });
                const token = store.createSession();
                setSessionCookie(res, token, Math.floor(sessionTtlMs / 1000));
                return sendJson(res, 200, { ok: true, authenticated: true, setupRequired: false, sessionToken: token });
            }

            if (url.pathname === '/api/logout') {
                if (req.method !== 'POST') return writeMethodNotAllowed(res);
                if (!isTrustedWriteRequest(req)) return sendJson(res, 403, { ok: false, error: 'untrusted_origin' });
                store.destroySession(getAuthToken(req));
                clearSessionCookie(res);
                return sendJson(res, 200, { ok: true, authenticated: false, setupRequired: !store.hasAdmin() });
            }

            if (url.pathname === '/api/guangboo/leaderboard') {
                if (req.method !== 'GET') return writeMethodNotAllowed(res);
                return sendJson(res, 200, { ok: true, leaderboard: guangbooStore.getLeaderboard() });
            }

            if (url.pathname === '/api/guangboo/maps') {
                if (req.method === 'GET') {
                    return sendJson(res, 200, { ok: true, maps: guangbooStore.listCustomMaps() });
                }
                if (req.method === 'POST') {
                    if (!isTrustedWriteRequest(req)) return sendJson(res, 403, { ok: false, error: 'untrusted_origin' });
                    const body = await readJsonBody(req);
                    const map = guangbooStore.saveCustomMap({ name: body.name, creator: body.creator, map: body.map, mode: body.mode, summary: body.summary });
                    return sendJson(res, 200, { ok: true, map });
                }
                return writeMethodNotAllowed(res);
            }

            if (url.pathname.startsWith('/api/guangboo/maps/')) {
                const mapId = decodeURIComponent(url.pathname.slice('/api/guangboo/maps/'.length));
                if (!mapId) return sendJson(res, 400, { ok: false, error: 'missing_map_id' });
                if (req.method === 'PUT') {
                    if (!isTrustedWriteRequest(req)) return sendJson(res, 403, { ok: false, error: 'untrusted_origin' });
                    const body = await readJsonBody(req);
                    const map = guangbooStore.updateCustomMap(mapId, { name: body.name, creator: body.creator, map: body.map, mode: body.mode, summary: body.summary });
                    if (!map) return sendJson(res, 404, { ok: false, error: 'map_not_found' });
                    return sendJson(res, 200, { ok: true, map });
                }
                if (req.method === 'DELETE') {
                    if (!isTrustedWriteRequest(req)) return sendJson(res, 403, { ok: false, error: 'untrusted_origin' });
                    const body = await readJsonBody(req);
                    if (!store.verifyPassword(String(body.password || ''))) return sendJson(res, 401, { ok: false, error: 'invalid_password' });
                    return sendJson(res, 200, { ok: guangbooStore.deleteCustomMap(mapId) });
                }
                return writeMethodNotAllowed(res);
            }

            if (url.pathname.startsWith('/api/')) {
                return sendJson(res, 404, { ok: false, error: 'not_found' });
            }

            if (req.method !== 'GET' && req.method !== 'HEAD') {
                res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('Method not allowed');
                return;
            }

            if (isProtectedEntry(url) && !isAuthenticated(req, store)) {
                return redirect(res, '/');
            }

            return serveStaticFile(req, res, rootDir, normalizeRequestPath(url));
        } catch (error) {
            const statusCode = error.statusCode || 500;
            const message = statusCode === 500 ? 'internal_error' : error.message;
            return sendJson(res, statusCode, { ok: false, error: message });
        }
    }, options.tls);
    const guangbooRealtime = createGuangbooRealtime(server, guangbooStore);

    return {
        server,
        close() {
            guangbooRealtime.close();
            db.close();
        }
    };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const port = Number(process.env.PORT || DEFAULT_PORT);
    const host = process.env.HOST || DEFAULT_HOST;
    const tls = process.env.MINSUNG_TLS_CERT && process.env.MINSUNG_TLS_KEY
        ? {
            certPath: process.env.MINSUNG_TLS_CERT,
            keyPath: process.env.MINSUNG_TLS_KEY
        }
        : null;
    const protocol = tls ? 'https' : 'http';
    const { server, close } = createMinsungServer({ tls });

    server.listen(port, host, () => {
        const portSuffix = (protocol === 'https' && port === 443) || (protocol === 'http' && port === 80)
            ? ''
            : `:${port}`;
        console.log(`Minsung local dashboard running at ${protocol}://${host}${portSuffix}`);
    });

    function shutdown() {
        server.close(() => {
            close();
            process.exit(0);
        });
    }

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
