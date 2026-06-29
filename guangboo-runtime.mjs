import { randomBytes } from 'node:crypto';
import { WebSocketServer } from 'ws';

const TICK_MS = 50;
const WS_PATH = '/guangboo/ws';
const DEFAULT_MODE = 'duel';
const MODES = {
    duel: { key: 'duel', label: '1:1 결투', size: 2 },
    survival: { key: 'survival', label: '4인 생존전', size: 4 }
};
const PROJECTILE_RANGE = 300;
const PROJECTILE_SPEED = 570;
const TILE_SIZE = 40;
const ULTIMATE_HITS_REQUIRED = 4;
const ULTIMATE_DAMAGE = 2000;
const ULTIMATE_SPEED = 150;
const ULTIMATE_RANGE = 820;
const ULTIMATE_RADIUS = 24;
const ULTIMATE_TURN_RATE = 0.08;
const KNOCKBACK_DISTANCE = 90;
const PLAYER_SPEED = 190;
const PLAYER_MAX_HEALTH = 6000;
const PROJECTILE_DAMAGE = 1200;
const SLIME_PROJECTILE_DAMAGE = 600;
const SLIME_PROJECTILE_RADIUS = 11;
const SLIME_TRAIL_RADIUS = 34;
const SLIME_TRAIL_MS = 4200;
const SLIME_TRAIL_INTERVAL_MS = 230;
const SLOW_FACTOR = 0.58;
const SLOW_DURATION_MS = 1800;
const BABY_SLIME_DAMAGE = 200;
const BABY_SLIME_HEALTH = 500;
const BABY_SLIME_SPEED = 115;
const BABY_SLIME_RADIUS = 14;
const BABY_SLIME_LIFETIME_MS = 9000;
const MAX_AMMO = 3;
const AMMO_RELOAD_MS = 1400;
const REGEN_DELAY_MS = 3000;
const REGEN_TICK_MS = 1000;
const REGEN_PER_TICK = 500;
const MAX_PENDING_SHOTS = 3;
const WALL_TILES = [
    ...Array.from({ length: 5 }, (_, index) => ({ col: 10 + index, row: 4 })),
    ...Array.from({ length: 5 }, (_, index) => ({ col: 10 + index, row: 11 })),
    ...Array.from({ length: 4 }, (_, index) => ({ col: 5, row: 6 + index })),
    ...Array.from({ length: 4 }, (_, index) => ({ col: 18, row: 6 + index })),
    { col: 8, row: 7 },
    { col: 15, row: 8 }
];

function createMap() {
    const walls = WALL_TILES.map((wall, index) => ({ id: `w${index}`, ...wall }));
    return {
        width: 960,
        height: 640,
        tileSize: TILE_SIZE,
        cols: 24,
        rows: 16,
        walls,
        obstacles: walls.map(wall => tileToRect(wall))
    };
}

const MAP = createMap();
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
const CHARACTER_DEFS = {
    monster: { key: 'monster', label: '기본 몬스터' },
    slime: { key: 'slime', label: '슬라임', monster: { key: 'slime', name: 'Slime', color: '#7ee65b', accent: '#167a34' } }
};

function normalizeCharacter(value) {
    return value === 'slime' ? 'slime' : 'monster';
}

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

function tileToRect(tile) {
    return {
        id: tile.id,
        col: tile.col,
        row: tile.row,
        x: tile.col * TILE_SIZE + TILE_SIZE / 2,
        y: tile.row * TILE_SIZE + TILE_SIZE / 2,
        w: TILE_SIZE,
        h: TILE_SIZE
    };
}

function rectContainsCircle(rect, x, y, radius) {
    const nearestX = Math.max(rect.x - rect.w / 2, Math.min(x, rect.x + rect.w / 2));
    const nearestY = Math.max(rect.y - rect.h / 2, Math.min(y, rect.y + rect.h / 2));
    return Math.hypot(x - nearestX, y - nearestY) < radius;
}

function resolvePlayerPosition(player, map = MAP) {
    const radius = 22;
    player.x = Math.max(radius, Math.min(map.width - radius, player.x));
    player.y = Math.max(radius, Math.min(map.height - radius, player.y));

    map.obstacles.forEach(rect => {
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

function isProjectileBlocked(projectile, map = MAP) {
    if (projectile.x < 0 || projectile.x > map.width || projectile.y < 0 || projectile.y > map.height) {
        return true;
    }
    return map.obstacles.some(rect => rectContainsCircle(rect, projectile.x, projectile.y, projectile.radius || 8));
}

function destroyWallHitByProjectile(map, projectile) {
    const hit = map.obstacles.find(rect => rectContainsCircle(rect, projectile.x, projectile.y, projectile.radius || ULTIMATE_RADIUS));
    if (!hit) return false;
    map.walls = map.walls.filter(wall => wall.id !== hit.id);
    map.obstacles = map.obstacles.filter(rect => rect.id !== hit.id);
    return true;
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
    let nextBotNumber = 1;
    let shuttingDown = false;

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
                character: player.character,
                bot: Boolean(player.client.bot),
                x: Math.round(player.x),
                y: Math.round(player.y),
                aimX: Number(player.aim.x.toFixed(3)),
                aimY: Number(player.aim.y.toFixed(3)),
                facingX: Number((player.facing?.x ?? player.aim.x).toFixed(3)),
                facingY: Number((player.facing?.y ?? player.aim.y).toFixed(3)),
                health: Math.max(0, Math.round(player.health)),
                maxHealth: PLAYER_MAX_HEALTH,
                ammo: Math.max(0, Math.min(MAX_AMMO, Math.floor(player.ammo))),
                maxAmmo: MAX_AMMO,
                ultimateHits: Math.min(ULTIMATE_HITS_REQUIRED, player.ultimateHits || 0),
                ultimateRequired: ULTIMATE_HITS_REQUIRED,
                ultimateReady: Boolean(player.ultimateReady),
                slowedUntil: player.slowedUntil || 0,
                alive: player.alive,
                kills: player.kills,
                disconnected: player.disconnected
            })),
            projectiles: match.projectiles.map(projectile => ({
                id: projectile.id,
                ownerId: projectile.ownerId,
                x: Math.round(projectile.x),
                y: Math.round(projectile.y),
                startX: Math.round(projectile.startX ?? projectile.x),
                startY: Math.round(projectile.startY ?? projectile.y),
                targetX: Math.round(projectile.targetX ?? projectile.x),
                targetY: Math.round(projectile.targetY ?? projectile.y),
                traveled: Math.round(projectile.traveled ?? 0),
                maxDistance: Math.round(projectile.maxDistance ?? PROJECTILE_RANGE),
                kind: projectile.kind || 'normal',
                radius: Math.round(projectile.radius || 8)
            })),
            slimeTrails: match.slimeTrails.map(trail => ({
                id: trail.id, ownerId: trail.ownerId, x: Math.round(trail.x), y: Math.round(trail.y), radius: trail.radius
            })),
            summons: match.summons.map(summon => ({
                id: summon.id, ownerId: summon.ownerId, kind: summon.kind, x: Math.round(summon.x), y: Math.round(summon.y),
                health: Math.max(0, Math.round(summon.health)), maxHealth: summon.maxHealth, radius: summon.radius
            })),
            map: match.map,
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

    function reloadAmmo(player, now) {
        if (player.ammo >= MAX_AMMO) {
            player.lastAmmoReloadAt = now;
            return;
        }
        const elapsed = now - player.lastAmmoReloadAt;
        if (elapsed < AMMO_RELOAD_MS) return;
        const reloadCount = Math.floor(elapsed / AMMO_RELOAD_MS);
        player.ammo = Math.min(MAX_AMMO, player.ammo + reloadCount);
        player.lastAmmoReloadAt += reloadCount * AMMO_RELOAD_MS;
        if (player.ammo >= MAX_AMMO) player.lastAmmoReloadAt = now;
    }

    function resetRegenTimer(player, now) {
        player.lastCombatAt = now;
        player.lastRegenAt = now + REGEN_DELAY_MS;
    }

    function applyPassiveRegen(player, now) {
        if (player.health >= PLAYER_MAX_HEALTH) {
            player.lastRegenAt = now;
            return;
        }
        const readyAt = player.lastCombatAt + REGEN_DELAY_MS;
        if (now < readyAt) return;
        if (!Number.isFinite(player.lastRegenAt) || player.lastRegenAt < readyAt) {
            player.lastRegenAt = readyAt;
        }
        const elapsed = now - player.lastRegenAt;
        if (elapsed < REGEN_TICK_MS) return;
        const regenTicks = Math.floor(elapsed / REGEN_TICK_MS);
        player.health = Math.min(PLAYER_MAX_HEALTH, player.health + regenTicks * REGEN_PER_TICK);
        player.lastRegenAt += regenTicks * REGEN_TICK_MS;
        if (player.health >= PLAYER_MAX_HEALTH) player.lastRegenAt = now;
    }

    function isSlime(player) {
        return player?.character === 'slime';
    }

    function applySlow(player, now, duration = SLOW_DURATION_MS) {
        player.slowedUntil = Math.max(player.slowedUntil || 0, now + duration);
    }

    function isOnEnemySlimeTrail(match, player, now) {
        return match.slimeTrails.some(trail =>
            trail.ownerId !== player.id &&
            trail.expiresAt > now &&
            Math.hypot(player.x - trail.x, player.y - trail.y) <= trail.radius + 20
        );
    }

    function dropSlimeTrail(match, player, now) {
        if (!isSlime(player) || now - (player.lastSlimeTrailAt || 0) < SLIME_TRAIL_INTERVAL_MS) return;
        player.lastSlimeTrailAt = now;
        match.slimeTrails.push({
            id: `${match.id}-st${match.nextSlimeTrailId++}`,
            ownerId: player.id,
            x: player.x,
            y: player.y,
            radius: SLIME_TRAIL_RADIUS,
            expiresAt: now + SLIME_TRAIL_MS
        });
    }

    function spawnBabySlimes(match, player, count, now) {
        const total = Math.max(1, Math.min(ULTIMATE_HITS_REQUIRED, count));
        for (let index = 0; index < total; index += 1) {
            const angle = (Math.PI * 2 * index) / total;
            match.summons.push({
                id: `${match.id}-bs${match.nextSummonId++}`,
                kind: 'babySlime',
                ownerId: player.id,
                x: player.x + Math.cos(angle) * 28,
                y: player.y + Math.sin(angle) * 28,
                health: BABY_SLIME_HEALTH,
                maxHealth: BABY_SLIME_HEALTH,
                radius: BABY_SLIME_RADIUS,
                expiresAt: now + BABY_SLIME_LIFETIME_MS
            });
        }
    }

    function stepSummons(match, now, dt) {
        const survivors = [];
        match.summons.forEach(summon => {
            if (summon.health <= 0 || summon.expiresAt <= now) return;
            const target = [...match.players.values()]
                .filter(player => player.alive && player.id !== summon.ownerId)
                .sort((a, b) => Math.hypot(a.x - summon.x, a.y - summon.y) - Math.hypot(b.x - summon.x, b.y - summon.y))[0];
            if (target) {
                const dx = target.x - summon.x;
                const dy = target.y - summon.y;
                const length = Math.hypot(dx, dy) || 1;
                summon.x += (dx / length) * BABY_SLIME_SPEED * dt;
                summon.y += (dy / length) * BABY_SLIME_SPEED * dt;
                if (Math.hypot(target.x - summon.x, target.y - summon.y) <= 22 + summon.radius) {
                    const owner = match.players.get(summon.ownerId);
                    target.health -= BABY_SLIME_DAMAGE;
                    applySlow(target, now);
                    resetRegenTimer(target, now);
                    if (target.health <= 0) eliminatePlayer(match, target, owner);
                    return;
                }
            }
            survivors.push(summon);
        });
        match.summons = survivors;
    }

    function queueShotInput(player, aim, now = Date.now()) {
        reloadAmmo(player, now);
        if (player.ammo <= player.queuedShotAims.length) return;
        const shotAim = clampUnitVector(aim);
        if (Math.hypot(shotAim.x, shotAim.y) <= 0.01) return;
        player.queuedShotAims.push(shotAim);
        if (player.queuedShotAims.length > Math.min(MAX_PENDING_SHOTS, player.ammo)) {
            player.queuedShotAims.splice(0, player.queuedShotAims.length - Math.min(MAX_PENDING_SHOTS, player.ammo));
        }
    }

    function spawnProjectile(match, player, now) {
        const aim = player.queuedShotAims.shift() || player.aim;
        const aimLength = Math.hypot(aim.x, aim.y) || 1;
        const dx = aim.x / aimLength;
        const dy = aim.y / aimLength;
        const spawnX = Math.max(8, Math.min(match.map.width - 8, player.x + dx * 30));
        const spawnY = Math.max(8, Math.min(match.map.height - 8, player.y + dy * 30));
        const targetX = spawnX + dx * PROJECTILE_RANGE;
        const targetY = spawnY + dy * PROJECTILE_RANGE;
        player.aim = { x: dx, y: dy };
        player.facing = { x: dx, y: dy };
        player.ammo = Math.max(0, player.ammo - 1);
        player.lastAmmoReloadAt = now;
        player.lastShotAt = now;
        resetRegenTimer(player, now);
        const slimeShot = isSlime(player);
        match.projectiles.push({
            id: `${match.id}-p${match.nextProjectileId++}`,
            kind: slimeShot ? 'slime' : 'normal',
            ownerId: player.id,
            x: spawnX,
            y: spawnY,
            startX: spawnX,
            startY: spawnY,
            targetX,
            targetY,
            vx: dx * PROJECTILE_SPEED,
            vy: dy * PROJECTILE_SPEED,
            damage: slimeShot ? SLIME_PROJECTILE_DAMAGE : PROJECTILE_DAMAGE,
            radius: slimeShot ? SLIME_PROJECTILE_RADIUS : 8,
            traveled: 0,
            maxDistance: PROJECTILE_RANGE,
            spawnedTick: match.tick
        });
    }

    function queueUltimateInput(player, aim) {
        if (!player.ultimateReady) return false;
        player.queuedUltimateAim = clampUnitVector(aim);
        return true;
    }

    function spawnUltimateProjectile(match, player, now) {
        if (!player.ultimateReady) return;
        if (isSlime(player)) {
            const spawnCount = Math.max(1, Math.min(ULTIMATE_HITS_REQUIRED, player.ultimateHits || 0));
            spawnBabySlimes(match, player, spawnCount, now);
            player.ultimateHits = 0;
            player.ultimateReady = false;
            player.queuedUltimateAim = null;
            resetRegenTimer(player, now);
            return;
        }
        const aim = player.queuedUltimateAim || player.aim;
        const aimLength = Math.hypot(aim.x, aim.y) || 1;
        const dx = aim.x / aimLength;
        const dy = aim.y / aimLength;
        const spawnX = Math.max(ULTIMATE_RADIUS, Math.min(match.map.width - ULTIMATE_RADIUS, player.x + dx * 34));
        const spawnY = Math.max(ULTIMATE_RADIUS, Math.min(match.map.height - ULTIMATE_RADIUS, player.y + dy * 34));
        player.ultimateHits = 0;
        player.ultimateReady = false;
        player.queuedUltimateAim = null;
        player.aim = { x: dx, y: dy };
        player.facing = { x: dx, y: dy };
        resetRegenTimer(player, now);
        match.projectiles.push({
            id: `${match.id}-u${match.nextProjectileId++}`,
            kind: 'ultimate',
            ownerId: player.id,
            x: spawnX,
            y: spawnY,
            startX: spawnX,
            startY: spawnY,
            targetX: spawnX + dx * ULTIMATE_RANGE,
            targetY: spawnY + dy * ULTIMATE_RANGE,
            vx: dx * ULTIMATE_SPEED,
            vy: dy * ULTIMATE_SPEED,
            damage: ULTIMATE_DAMAGE,
            radius: ULTIMATE_RADIUS,
            traveled: 0,
            maxDistance: ULTIMATE_RANGE,
            spawnedTick: match.tick
        });
    }

    function steerUltimateProjectile(match, projectile) {
        if (projectile.kind !== 'ultimate') return;
        const target = [...match.players.values()]
            .filter(player => player.alive && player.id !== projectile.ownerId)
            .sort((a, b) => Math.hypot(a.x - projectile.x, a.y - projectile.y) - Math.hypot(b.x - projectile.x, b.y - projectile.y))[0];
        if (!target) return;
        const tx = target.x - projectile.x;
        const ty = target.y - projectile.y;
        const tLen = Math.hypot(tx, ty) || 1;
        const vLen = Math.hypot(projectile.vx, projectile.vy) || ULTIMATE_SPEED;
        const current = { x: projectile.vx / vLen, y: projectile.vy / vLen };
        const next = clampUnitVector({
            x: current.x * (1 - ULTIMATE_TURN_RATE) + (tx / tLen) * ULTIMATE_TURN_RATE,
            y: current.y * (1 - ULTIMATE_TURN_RATE) + (ty / tLen) * ULTIMATE_TURN_RATE
        });
        projectile.vx = next.x * ULTIMATE_SPEED;
        projectile.vy = next.y * ULTIMATE_SPEED;
    }

    function knockBackPlayer(match, player, projectile) {
        const vLen = Math.hypot(projectile.vx, projectile.vy) || 1;
        player.x += (projectile.vx / vLen) * KNOCKBACK_DISTANCE;
        player.y += (projectile.vy / vLen) * KNOCKBACK_DISTANCE;
        resolvePlayerPosition(player, match.map);
    }

    function stepMatch(match) {
        match.tick += 1;
        const now = Date.now();
        const dt = TICK_MS / 1000;
        updateBotInputs(match, now);
        match.slimeTrails = match.slimeTrails.filter(trail => trail.expiresAt > now);
        stepSummons(match, now, dt);

        match.players.forEach(player => {
            if (!player.alive || player.disconnected) return;
            const input = player.client.input;
            const move = clampUnitVector(input.move);
            const aim = clampUnitVector(input.aim);
            if (Math.hypot(aim.x, aim.y) > 0.18) {
                player.aim = aim;
            }
            if (Math.hypot(move.x, move.y) > 0.18) {
                player.facing = move;
            }
            reloadAmmo(player, now);
            const slowed = (player.slowedUntil || 0) > now || isOnEnemySlimeTrail(match, player, now);
            const speed = PLAYER_SPEED * (slowed ? SLOW_FACTOR : 1);
            player.x += move.x * speed * dt;
            player.y += move.y * speed * dt;
            if (slowed) applySlow(player, now, 250);
            if (Math.hypot(move.x, move.y) > 0.18) dropSlimeTrail(match, player, now);
            resolvePlayerPosition(player, match.map);

            if (player.queuedUltimateAim && player.ultimateReady) {
                spawnUltimateProjectile(match, player, now);
            }
            if (player.queuedShotAims.length && player.ammo > 0) {
                spawnProjectile(match, player, now);
            }
            applyPassiveRegen(player, now);
        });

        const projectiles = [];
        match.projectiles.forEach(projectile => {
            if (projectile.spawnedTick === match.tick) {
                projectiles.push(projectile);
                return;
            }
            steerUltimateProjectile(match, projectile);
            const stepDistance = Math.hypot(projectile.vx * dt, projectile.vy * dt);
            const remaining = Math.max(0, projectile.maxDistance - projectile.traveled);
            const travelThisTick = Math.min(stepDistance, remaining);
            const velocityLength = Math.hypot(projectile.vx, projectile.vy) || 1;
            projectile.x += (projectile.vx / velocityLength) * travelThisTick;
            projectile.y += (projectile.vy / velocityLength) * travelThisTick;
            projectile.traveled += travelThisTick;
            if (projectile.traveled >= projectile.maxDistance) return;
            if (projectile.kind === 'ultimate') {
                destroyWallHitByProjectile(match.map, projectile);
            } else if (isProjectileBlocked(projectile, match.map)) {
                return;
            }

            const owner = match.players.get(projectile.ownerId);
            const summonHit = match.summons.find(summon =>
                summon.ownerId !== projectile.ownerId &&
                Math.hypot(summon.x - projectile.x, summon.y - projectile.y) <= summon.radius + (projectile.radius || 8)
            );
            if (summonHit) {
                summonHit.health -= projectile.damage;
                if (summonHit.health <= 0) {
                    match.summons = match.summons.filter(summon => summon.id !== summonHit.id);
                }
                return;
            }

            const hit = [...match.players.values()].find(player =>
                player.alive &&
                player.id !== projectile.ownerId &&
                Math.hypot(player.x - projectile.x, player.y - projectile.y) <= 22 + (projectile.radius || 8)
            );
            if (hit) {
                hit.health -= projectile.damage;
                resetRegenTimer(hit, now);
                if ((projectile.kind === 'normal' || projectile.kind === 'slime') && owner) {
                    owner.ultimateHits = Math.min(ULTIMATE_HITS_REQUIRED, (owner.ultimateHits || 0) + 1);
                    owner.ultimateReady = owner.ultimateHits >= ULTIMATE_HITS_REQUIRED;
                }
                if (projectile.kind === 'slime' && owner) {
                    if (hit.ammo > 0) {
                        hit.ammo = Math.max(0, hit.ammo - 1);
                        owner.ammo = Math.min(MAX_AMMO, owner.ammo + 1);
                    }
                    applySlow(hit, now);
                }
                if (projectile.kind === 'ultimate') {
                    knockBackPlayer(match, hit, projectile);
                }
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
            slimeTrails: [],
            summons: [],
            map: createMap(),
            nextProjectileId: 1,
            nextSlimeTrailId: 1,
            nextSummonId: 1,
            timer: null
        };

        players.forEach((client, index) => {
            const spawn = SPAWNS[index % SPAWNS.length];
            const character = normalizeCharacter(client.character);
            const monster = character === 'slime' ? CHARACTER_DEFS.slime.monster : MONSTERS[index % MONSTERS.length];
            const player = {
                id: client.id,
                playerDbId: client.playerDbId,
                client,
                nickname: client.nickname,
                monster,
                character,
                x: spawn.x,
                y: spawn.y,
                aim: { x: index % 2 === 0 ? 1 : -1, y: 0 },
                facing: { x: index % 2 === 0 ? 1 : -1, y: 0 },
                health: PLAYER_MAX_HEALTH,
                ammo: MAX_AMMO,
                maxAmmo: MAX_AMMO,
                lastAmmoReloadAt: Date.now(),
                maxHealth: PLAYER_MAX_HEALTH,
                alive: true,
                disconnected: false,
                kills: 0,
                deaths: 0,
                lastShotAt: 0,
                lastCombatAt: 0,
                lastRegenAt: Date.now(),
                slowedUntil: 0,
                lastSlimeTrailAt: 0,
                queuedShotAims: [],
                queuedUltimateAim: null,
                ultimateHits: 0,
                ultimateReady: false,
                endedAtMs: null,
                placement: 0
            };
            client.match = match;
            client.input = { move: { x: 0, y: 0 }, aim: player.aim, firing: false, ultimate: false };
            match.players.set(player.id, player);
        });

        matches.set(match.id, match);
        const startPayload = {
            type: 'matchStart',
            matchId: match.id,
            mode: match.mode,
            modeLabel: mode.label,
            requiredPlayers: mode.size,
            map: match.map,
            players: [...match.players.values()].map(player => ({
                id: player.id,
                nickname: player.nickname,
                monster: player.monster,
                character: player.character,
                bot: Boolean(player.client.bot),
                x: player.x,
                y: player.y,
                aimX: player.aim.x,
                aimY: player.aim.y,
                facingX: player.facing.x,
                facingY: player.facing.y,
                health: player.health,
                maxHealth: PLAYER_MAX_HEALTH,
                ammo: player.ammo,
                maxAmmo: MAX_AMMO,
                ultimateHits: player.ultimateHits,
                ultimateRequired: ULTIMATE_HITS_REQUIRED,
                ultimateReady: player.ultimateReady,
                slowedUntil: player.slowedUntil
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

    function createBotClient(mode, botIndex) {
        const nickname = `Bot ${botIndex}`;
        const player = store.ensurePlayer(nickname);
        return {
            id: `gbb_${randomBytes(6).toString('hex')}`,
            socket: { readyState: 0, send() {}, close() {} },
            playerDbId: player.id,
            nickname: player.nickname,
            mode: mode.key,
            character: 'monster',
            bot: true,
            match: null,
            nextFireAt: Date.now() + 500,
            input: { move: { x: 0, y: 0 }, aim: { x: -1, y: 0 }, firing: false, ultimate: false }
        };
    }

    function fillQueueWithBots(mode) {
        const queue = queueFor(mode.key);
        while (queue.length < mode.size) {
            queue.push(createBotClient(mode, nextBotNumber++));
        }
    }

    function updateBotInputs(match, now) {
        const players = [...match.players.values()];
        players.forEach(player => {
            const client = player.client;
            if (!client.bot || !player.alive) return;
            const target = players
                .filter(candidate => candidate.id !== player.id && candidate.alive)
                .sort((a, b) =>
                    Math.hypot(a.x - player.x, a.y - player.y) -
                    Math.hypot(b.x - player.x, b.y - player.y)
                )[0];

            if (!target) {
                client.input = { move: { x: 0, y: 0 }, aim: player.aim, firing: false, ultimate: false };
                return;
            }

            const dx = target.x - player.x;
            const dy = target.y - player.y;
            const distance = Math.hypot(dx, dy) || 1;
            const aim = { x: dx / distance, y: dy / distance };
            let move = { x: 0, y: 0 };
            if (distance > 260) {
                move = aim;
            } else if (distance < 150) {
                move = { x: -aim.x, y: -aim.y };
            }

            const firing = distance < 560 && now >= client.nextFireAt;
            if (firing) client.nextFireAt = now + 650 + Math.floor(Math.random() * 350);
            client.input = { move, aim, firing };
            if (firing) queueShotInput(player, aim, now);
        });
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
            client.character = normalizeCharacter(message.character);
            removeFromQueue(client);
            if (!client.match) queueFor(mode.key).push(client);
            if (message.fillWithBots) {
                fillQueueWithBots(mode);
            }
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
            const aim = clampUnitVector(message.aim);
            client.input = {
                move: clampUnitVector(message.move),
                aim,
                firing: false,
                ultimate: false,
                seq: Number(message.seq) || 0
            };
            if ((message.firing || message.ultimate) && client.match?.status === 'active') {
                const player = client.match.players.get(client.id);
                if (player?.alive && !player.disconnected) {
                    if (message.firing) queueShotInput(player, aim, Date.now());
                    if (message.ultimate) queueUltimateInput(player, aim);
                }
            }
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
        if (shuttingDown) return;
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
            input: { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, firing: false, ultimate: false }
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
            shuttingDown = true;
            queues.forEach(queue => queue.splice(0, queue.length));
            matches.forEach(match => {
                clearInterval(match.timer);
                match.status = 'ended';
                match.players.forEach(player => {
                    player.client.match = null;
                });
            });
            matches.clear();
            wss.clients.forEach(socket => socket.close());
            wss.close();
        }
    };
}
