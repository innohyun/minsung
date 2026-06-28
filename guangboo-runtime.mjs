import { randomBytes } from 'node:crypto';
import { WebSocketServer } from 'ws';

const TICK_MS = 50;
const WS_PATH = '/guangboo/ws';
const DEFAULT_MODE = 'duel';
const MODES = {
    duel: { key: 'duel', label: '1:1 결투', size: 2 },
    survival: { key: 'survival', label: '4인 생존전', size: 4 }
};
const MAP = {
    width: 960,
    height: 640,
    obstacles: [
        { x: 470, y: 178, w: 180, h: 38 },
        { x: 490, y: 462, w: 180, h: 38 },
        { x: 220, y: 320, w: 46, h: 170 },
        { x: 740, y: 320, w: 46, h: 170 }
    ]
};
const SPAWNS = [
    { x: 312, y: 250 },
    { x: 648, y: 250 },
    { x: 312, y: 390 },
    { x: 648, y: 390 }
];
const MONSTERS = [
    { key: 'moldfang', name: 'Moldfang', color: '#6ee7b7', accent: '#064e3b' },
    { key: 'blinkmaw', name: 'Blinkmaw', color: '#f9a8d4', accent: '#831843' },
    { key: 'grubvolt', name: 'Grubvolt', color: '#fde047', accent: '#713f12' },
    { key: 'nightgloop', name: 'Nightgloop', color: '#93c5fd', accent: '#1e3a8a' }
];

export const GUANGBOO_SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS guangboo_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT NOT NULL UNIQUE,
        matches INTEGER NOT NULL DEFAULT 0,
        wins INTEGER NOT NULL DEFAULT 0,
        kills INTEGER NOT NULL DEFAULT 0,
        deaths INTEGER NOT NULL DEFAULT 0,
        play_time_ms INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guangboo_matches (
        id TEXT PRIMARY KEY,
        mode TEXT NOT NULL,
        winner_player_id INTEGER,
        started_at TEXT NOT NULL,
        ended_at TEXT NOT NULL,
        duration_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guangboo_match_players (
        match_id TEXT NOT NULL,
        player_id INTEGER NOT NULL,
        nickname TEXT NOT NULL,
        placement INTEGER NOT NULL,
        kills INTEGER NOT NULL,
        deaths INTEGER NOT NULL,
        survived_ms INTEGER NOT NULL,
        PRIMARY KEY (match_id, player_id)
    );
`;

function nowIso() {
    return new Date().toISOString();
}

function normalizeNickname(value) {
    const nickname = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 18);
    return nickname || `Guest-${randomBytes(2).toString('hex')}`;
}

function clampUnitVector(vector) {
    const x = Number(vector?.x) || 0;
    const y = Number(vector?.y) || 0;
    const length = Math.hypot(x, y);
    if (length <= 1) return { x, y };
    return { x: x / length, y: y / length };
}

function rectContainsCircle(rect, x, y, radius) {
    const nearestX = Math.max(rect.x - rect.w / 2, Math.min(x, rect.x + rect.w / 2));
    const nearestY = Math.max(rect.y - rect.h / 2, Math.min(y, rect.y + rect.h / 2));
    return Math.hypot(x - nearestX, y - nearestY) < radius;
}

function resolvePlayerPosition(player) {
    const radius = 22;
    player.x = Math.max(radius, Math.min(MAP.width - radius, player.x));
    player.y = Math.max(radius, Math.min(MAP.height - radius, player.y));

    MAP.obstacles.forEach(rect => {
        if (!rectContainsCircle(rect, player.x, player.y, radius)) return;
        const dx = player.x - rect.x;
        const dy = player.y - rect.y;
        const pushX = rect.w / 2 + radius - Math.abs(dx);
        const pushY = rect.h / 2 + radius - Math.abs(dy);
        if (pushX < pushY) {
            player.x += dx < 0 ? -pushX : pushX;
        } else {
            player.y += dy < 0 ? -pushY : pushY;
        }
    });
}

function isProjectileBlocked(projectile) {
    if (projectile.x < 0 || projectile.x > MAP.width || projectile.y < 0 || projectile.y > MAP.height) {
        return true;
    }
    return MAP.obstacles.some(rect => rectContainsCircle(rect, projectile.x, projectile.y, 8));
}

function sendJson(socket, payload) {
    if (socket.readyState !== 1) return;
    socket.send(JSON.stringify(payload));
}

function getMode(key) {
    return MODES[key] || MODES[DEFAULT_MODE];
}

function publicModes() {
    return Object.values(MODES).map(mode => ({
        key: mode.key,
        label: mode.label,
        size: mode.size
    }));
}

export function createGuangbooStore(db) {
    const getPlayer = db.prepare('SELECT * FROM guangboo_players WHERE nickname = ?');
    const insertPlayer = db.prepare('INSERT INTO guangboo_players (nickname, created_at, updated_at) VALUES (?, ?, ?)');
    const touchPlayer = db.prepare('UPDATE guangboo_players SET updated_at = ? WHERE id = ?');
    const insertMatch = db.prepare(`
        INSERT INTO guangboo_matches (id, mode, winner_player_id, started_at, ended_at, duration_ms)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const insertMatchPlayer = db.prepare(`
        INSERT INTO guangboo_match_players
            (match_id, player_id, nickname, placement, kills, deaths, survived_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const updatePlayerStats = db.prepare(`
        UPDATE guangboo_players
        SET matches = matches + 1,
            wins = wins + ?,
            kills = kills + ?,
            deaths = deaths + ?,
            play_time_ms = play_time_ms + ?,
            updated_at = ?
        WHERE id = ?
    `);
    const leaderboard = db.prepare(`
        SELECT nickname, matches, wins, kills, deaths, play_time_ms
        FROM guangboo_players
        ORDER BY wins DESC, kills DESC, matches ASC, nickname ASC
        LIMIT 12
    `);

    function ensurePlayer(rawNickname) {
        const nickname = normalizeNickname(rawNickname);
        const timestamp = nowIso();
        let player = getPlayer.get(nickname);
        if (!player) {
            insertPlayer.run(nickname, timestamp, timestamp);
            player = getPlayer.get(nickname);
        } else {
            touchPlayer.run(timestamp, player.id);
        }
        return player;
    }

    function recordMatch(match, finalPlayers) {
        const endedAt = nowIso();
        const durationMs = Math.max(0, Date.now() - match.startedAtMs);
        const winner = finalPlayers.find(player => player.placement === 1) || null;

        db.exec('BEGIN');
        try {
            insertMatch.run(match.id, match.mode, winner?.playerDbId || null, match.startedAtIso, endedAt, durationMs);
            finalPlayers.forEach(player => {
                const survivedMs = Math.max(0, (player.endedAtMs || Date.now()) - match.startedAtMs);
                insertMatchPlayer.run(match.id, player.playerDbId, player.nickname, player.placement, player.kills, player.deaths, survivedMs);
                updatePlayerStats.run(
                    player.placement === 1 ? 1 : 0,
                    player.kills,
                    player.deaths,
                    survivedMs,
                    endedAt,
                    player.playerDbId
                );
            });
            db.exec('COMMIT');
        } catch (error) {
            db.exec('ROLLBACK');
            throw error;
        }
    }

    function getLeaderboard() {
        return leaderboard.all().map(row => ({
            nickname: row.nickname,
            matches: row.matches,
            wins: row.wins,
            kills: row.kills,
            deaths: row.deaths,
            playTimeMs: row.play_time_ms
        }));
    }

    return { ensurePlayer, recordMatch, getLeaderboard };
}

export function createGuangbooRealtime(server, store) {
    const wss = new WebSocketServer({ noServer: true });
    const clients = new Map();
    const queues = new Map(Object.keys(MODES).map(key => [key, []]));
    const matches = new Map();

    function queueFor(modeKey) {
        return queues.get(getMode(modeKey).key);
    }

    function broadcastQueue(modeKey) {
        const mode = getMode(modeKey);
        const queue = queueFor(mode.key);
        queue.forEach(client => sendJson(client.socket, {
            type: 'queue',
            mode: mode.key,
            modeLabel: mode.label,
            playersWaiting: queue.length,
            requiredPlayers: mode.size
        }));
    }

    function removeFromQueue(client) {
        queues.forEach((queue, modeKey) => {
            const index = queue.indexOf(client);
            if (index !== -1) {
                queue.splice(index, 1);
                broadcastQueue(modeKey);
            }
        });
    }

    function snapshotMatch(match) {
        return {
            type: 'state',
            tick: match.tick,
            players: [...match.players.values()].map(player => ({
                id: player.id,
                nickname: player.nickname,
                monster: player.monster,
                x: Math.round(player.x),
                y: Math.round(player.y),
                aimX: Number(player.aim.x.toFixed(3)),
                aimY: Number(player.aim.y.toFixed(3)),
                health: Math.max(0, Math.round(player.health)),
                alive: player.alive,
                kills: player.kills,
                disconnected: player.disconnected
            })),
            projectiles: match.projectiles.map(projectile => ({
                id: projectile.id,
                ownerId: projectile.ownerId,
                x: Math.round(projectile.x),
                y: Math.round(projectile.y)
            })),
            aliveCount: [...match.players.values()].filter(player => player.alive).length
        };
    }

    function broadcastMatch(match, payload) {
        match.players.forEach(player => sendJson(player.client.socket, payload));
    }

    function finishMatch(match) {
        if (match.status !== 'active') return;
        match.status = 'ended';
        clearInterval(match.timer);
        matches.delete(match.id);

        const now = Date.now();
        const ordered = [...match.players.values()].sort((a, b) => {
            if (a.alive !== b.alive) return a.alive ? -1 : 1;
            return (b.endedAtMs || now) - (a.endedAtMs || now);
        });
        ordered.forEach((player, index) => {
            player.placement = index + 1;
            player.endedAtMs = player.endedAtMs || now;
            player.client.match = null;
        });
        store.recordMatch(match, ordered);
        broadcastMatch(match, {
            type: 'matchEnd',
            winnerId: ordered[0]?.id || null,
            results: ordered.map(player => ({
                id: player.id,
                nickname: player.nickname,
                placement: player.placement,
                kills: player.kills,
                deaths: player.deaths
            }))
        });
    }

    function eliminatePlayer(match, player, killer) {
        if (!player.alive) return;
        player.alive = false;
        player.health = 0;
        player.deaths = 1;
        player.endedAtMs = Date.now();
        if (killer && killer !== player) {
            killer.kills += 1;
        }
        const alive = [...match.players.values()].filter(candidate => candidate.alive);
        if (alive.length <= 1) {
            finishMatch(match);
        }
    }

    function stepMatch(match) {
        match.tick += 1;
        const now = Date.now();
        const dt = TICK_MS / 1000;

        match.players.forEach(player => {
            if (!player.alive || player.disconnected) return;
            const input = player.client.input;
            const move = clampUnitVector(input.move);
            const aim = clampUnitVector(input.aim);
            if (Math.hypot(aim.x, aim.y) > 0.18) {
                player.aim = aim;
            }
            player.x += move.x * 230 * dt;
            player.y += move.y * 230 * dt;
            resolvePlayerPosition(player);

            if (input.firing && now - player.lastShotAt >= 360) {
                player.lastShotAt = now;
                const aimLength = Math.hypot(player.aim.x, player.aim.y) || 1;
                const dx = player.aim.x / aimLength;
                const dy = player.aim.y / aimLength;
                match.projectiles.push({
                    id: `${match.id}-p${match.nextProjectileId++}`,
                    ownerId: player.id,
                    x: player.x + dx * 28,
                    y: player.y + dy * 28,
                    vx: dx * 570,
                    vy: dy * 570,
                    damage: 28,
                    expiresAt: now + 980
                });
            }
        });

        const projectiles = [];
        match.projectiles.forEach(projectile => {
            projectile.x += projectile.vx * dt;
            projectile.y += projectile.vy * dt;
            if (projectile.expiresAt <= now || isProjectileBlocked(projectile)) return;

            const owner = match.players.get(projectile.ownerId);
            const hit = [...match.players.values()].find(player =>
                player.alive &&
                player.id !== projectile.ownerId &&
                Math.hypot(player.x - projectile.x, player.y - projectile.y) <= 27
            );
            if (hit) {
                hit.health -= projectile.damage;
                if (hit.health <= 0) {
                    eliminatePlayer(match, hit, owner);
                }
                return;
            }
            projectiles.push(projectile);
        });
        match.projectiles = projectiles;

        if (match.status === 'active') {
            broadcastMatch(match, snapshotMatch(match));
        }
    }

    function startMatch(players, mode) {
        const id = `gb_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
        const match = {
            id,
            mode: mode.key,
            status: 'active',
            startedAtMs: Date.now(),
            startedAtIso: nowIso(),
            tick: 0,
            players: new Map(),
            projectiles: [],
            nextProjectileId: 1,
            timer: null
        };

        players.forEach((client, index) => {
            const spawn = SPAWNS[index % SPAWNS.length];
            const monster = MONSTERS[index % MONSTERS.length];
            const player = {
                id: client.id,
                playerDbId: client.playerDbId,
                client,
                nickname: client.nickname,
                monster,
                x: spawn.x,
                y: spawn.y,
                aim: { x: index % 2 === 0 ? 1 : -1, y: 0 },
                health: 100,
                alive: true,
                disconnected: false,
                kills: 0,
                deaths: 0,
                lastShotAt: 0,
                endedAtMs: null,
                placement: 0
            };
            client.match = match;
            client.input = { move: { x: 0, y: 0 }, aim: player.aim, firing: false };
            match.players.set(player.id, player);
        });

        matches.set(match.id, match);
        const startPayload = {
            type: 'matchStart',
            matchId: match.id,
            mode: match.mode,
            modeLabel: mode.label,
            requiredPlayers: mode.size,
            map: MAP,
            players: [...match.players.values()].map(player => ({
                id: player.id,
                nickname: player.nickname,
                monster: player.monster,
                x: player.x,
                y: player.y
            }))
        };
        match.players.forEach(player => sendJson(player.client.socket, { ...startPayload, playerId: player.id }));
        match.timer = setInterval(() => stepMatch(match), TICK_MS);
    }

    function maybeStartMatches(modeKey) {
        const mode = getMode(modeKey);
        const queue = queueFor(mode.key);
        while (queue.length >= mode.size) {
            startMatch(queue.splice(0, mode.size), mode);
            broadcastQueue(mode.key);
        }
    }

    function handleMessage(client, raw) {
        let message;
        try {
            message = JSON.parse(raw.toString('utf8'));
        } catch {
            return sendJson(client.socket, { type: 'error', code: 'bad_json', message: 'Invalid message.' });
        }

        if (message.type === 'joinQueue') {
            const mode = getMode(message.mode || DEFAULT_MODE);
            const player = store.ensurePlayer(message.nickname);
            client.playerDbId = player.id;
            client.nickname = player.nickname;
            client.mode = mode.key;
            removeFromQueue(client);
            if (!client.match) queueFor(mode.key).push(client);
            sendJson(client.socket, {
                type: 'playerReady',
                playerId: client.id,
                nickname: client.nickname,
                mode: mode.key,
                modeLabel: mode.label,
                requiredPlayers: mode.size,
                leaderboard: store.getLeaderboard()
            });
            broadcastQueue(mode.key);
            maybeStartMatches(mode.key);
            return;
        }

        if (message.type === 'leaveQueue') {
            removeFromQueue(client);
            return sendJson(client.socket, { type: 'queueLeft' });
        }

        if (message.type === 'input') {
            client.input = {
                move: clampUnitVector(message.move),
                aim: clampUnitVector(message.aim),
                firing: Boolean(message.firing),
                seq: Number(message.seq) || 0
            };
            return;
        }

        if (message.type === 'ping') {
            return sendJson(client.socket, { type: 'pong', t: message.t || Date.now() });
        }

        sendJson(client.socket, { type: 'error', code: 'unknown_type', message: 'Unknown message type.' });
    }

    function removeClient(client) {
        clients.delete(client.id);
        removeFromQueue(client);
        const match = client.match;
        if (!match || match.status !== 'active') return;
        const player = match.players.get(client.id);
        if (player) {
            player.disconnected = true;
            eliminatePlayer(match, player, null);
        }
    }

    wss.on('connection', socket => {
        const client = {
            id: `gbp_${randomBytes(6).toString('hex')}`,
            socket,
            playerDbId: null,
            nickname: 'Guest',
            match: null,
            input: { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, firing: false }
        };
        clients.set(client.id, client);
        sendJson(socket, {
            type: 'hello',
            playerId: client.id,
            defaultMode: DEFAULT_MODE,
            modes: publicModes(),
            leaderboard: store.getLeaderboard()
        });
        socket.on('message', raw => handleMessage(client, raw));
        socket.on('close', () => removeClient(client));
        socket.on('error', () => removeClient(client));
    });

    server.on('upgrade', (req, socket, head) => {
        const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
        if (url.pathname !== WS_PATH) {
            socket.destroy();
            return;
        }
        wss.handleUpgrade(req, socket, head, upgradedSocket => {
            wss.emit('connection', upgradedSocket, req);
        });
    });

    return {
        close() {
            queues.forEach(queue => queue.splice(0, queue.length));
            matches.forEach(match => clearInterval(match.timer));
            wss.clients.forEach(socket => socket.close());
            wss.close();
        }
    };
}
