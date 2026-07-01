import { randomBytes } from 'node:crypto';
import { WebSocketServer } from 'ws';

const TICK_MS = 50;
const WS_PATH = '/guangboo/ws';
const DEFAULT_MODE = 'survival';
const MODES = {
    duel: { key: 'duel', label: '1:1', size: 2 },
    survival: { key: 'survival', label: '정식 맵 전투', size: 4 }
};
const PROJECTILE_RANGE = 300;
const PROJECTILE_SPEED = 570;
const TILE_SIZE = 40;
const ULTIMATE_HITS_REQUIRED = 4;
const SLIME_ULTIMATE_MIN_HITS_REQUIRED = 1;
const SLIME_ULTIMATE_MAX_SUMMONS = 4;
const ULTIMATE_DAMAGE = 2000;
const ULTIMATE_PROJECTILE_HEALTH = 3000;
const ULTIMATE_SPEED = 150;
const ULTIMATE_RANGE = 820;
const ULTIMATE_RADIUS = 24;
const ULTIMATE_TURN_RATE = 0.08;
const KNOCKBACK_DISTANCE = 90;
const KNOCKBACK_DURATION_MS = 700;
const PLAYER_SPEED = 155;
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
const BABY_SLIME_WALL_MARGIN = 4;
const BABY_SLIME_LIFETIME_MS = 9000;
const BABY_SLIME_ATTACK_RANGE = 28;
const BOT_RETREAT_HEALTH_RATIO = 0.4;
const BOT_RETREAT_RECOVER_RATIO = 0.62;
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

const OFFICIAL_MAPS = {
    'official:crossroads': { id: 'official:crossroads', name: '초원 교차로', cols: 24, rows: 16, walls: [{ col: 10, row: 6 }, { col: 11, row: 6 }, { col: 12, row: 6 }, { col: 13, row: 6 }, { col: 10, row: 9 }, { col: 11, row: 9 }, { col: 12, row: 9 }, { col: 13, row: 9 }, { col: 6, row: 8 }, { col: 17, row: 8 }], spawnPoints: [{ col: 4, row: 4 }, { col: 19, row: 11 }, { col: 4, row: 11 }, { col: 19, row: 4 }] },
    'official:maze': { id: 'official:maze', name: '돌담 미로', cols: 24, rows: 16, walls: [{ col: 5, row: 3 }, { col: 5, row: 4 }, { col: 5, row: 5 }, { col: 5, row: 10 }, { col: 5, row: 11 }, { col: 5, row: 12 }, { col: 11, row: 5 }, { col: 12, row: 5 }, { col: 13, row: 5 }, { col: 10, row: 10 }, { col: 11, row: 10 }, { col: 12, row: 10 }, { col: 18, row: 3 }, { col: 18, row: 4 }, { col: 18, row: 11 }, { col: 18, row: 12 }], spawnPoints: [{ col: 2, row: 2 }, { col: 21, row: 13 }, { col: 2, row: 13 }, { col: 21, row: 2 }] },
    'official:ring': { id: 'official:ring', name: '강철 링', cols: 24, rows: 16, walls: [{ col: 9, row: 5 }, { col: 10, row: 5 }, { col: 13, row: 5 }, { col: 14, row: 5 }, { col: 8, row: 6 }, { col: 15, row: 6 }, { col: 8, row: 9 }, { col: 15, row: 9 }, { col: 9, row: 10 }, { col: 10, row: 10 }, { col: 13, row: 10 }, { col: 14, row: 10 }], spawnPoints: [{ col: 3, row: 7 }, { col: 20, row: 7 }, { col: 11, row: 2 }, { col: 12, row: 13 }] },
    'official:wide': { id: 'official:wide', name: '넓은 대평원', cols: 30, rows: 20, walls: [{ col: 8, row: 5 }, { col: 9, row: 5 }, { col: 20, row: 14 }, { col: 21, row: 14 }, { col: 14, row: 9 }, { col: 15, row: 9 }, { col: 14, row: 10 }, { col: 15, row: 10 }], spawnPoints: [{ col: 3, row: 3 }, { col: 26, row: 16 }, { col: 3, row: 16 }, { col: 26, row: 3 }] }
};

function createMap(definition = null) {
    const source = definition || { cols: 24, rows: 16, walls: WALL_TILES, spawnPoints: [
        { x: 312, y: 250 },
        { x: 648, y: 250 },
        { x: 312, y: 390 },
        { x: 648, y: 390 }
    ] };
    const tileSize = TILE_SIZE;
    const cols = Math.max(8, Math.floor(Number(source.cols) || 24));
    const rows = Math.max(8, Math.floor(Number(source.rows) || 16));
    const walls = (source.walls || WALL_TILES).map((wall, index) => ({ id: `w${index}`, col: wall.col, row: wall.row }));
    const spawnPoints = (source.spawnPoints || []).map(spawn => {
        if (Number.isFinite(spawn.x) && Number.isFinite(spawn.y)) return { x: spawn.x, y: spawn.y };
        return { x: (Number(spawn.col) + 0.5) * tileSize, y: (Number(spawn.row) + 0.5) * tileSize };
    }).filter(spawn => Number.isFinite(spawn.x) && Number.isFinite(spawn.y));
    return {
        id: source.id || '',
        name: source.name || '기본 맵',
        width: cols * tileSize,
        height: rows * tileSize,
        tileSize,
        cols,
        rows,
        walls,
        spawnPoints,
        obstacles: walls.map(wall => tileToRect(wall))
    };
}

function getOfficialMap(id) {
    return OFFICIAL_MAPS[id] ? createMap(OFFICIAL_MAPS[id]) : null;
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

export function getSlimeUltimateSummonCount(slimeHits) {
    return Math.min(
        SLIME_ULTIMATE_MAX_SUMMONS,
        Math.max(0, Math.floor(Number(slimeHits) || 0))
    );
}

export function isSlimeUltimateReady(slimeHits) {
    return getSlimeUltimateSummonCount(slimeHits) >= SLIME_ULTIMATE_MIN_HITS_REQUIRED;
}

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

    CREATE TABLE IF NOT EXISTS guangboo_custom_maps (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        creator TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        tile_size INTEGER NOT NULL,
        data_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'survival',
        summary TEXT NOT NULL DEFAULT ''
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

function tileToRect(tile, tileSize = TILE_SIZE) {
    return {
        id: tile.id,
        col: tile.col,
        row: tile.row,
        x: tile.col * tileSize + tileSize / 2,
        y: tile.row * tileSize + tileSize / 2,
        w: tileSize,
        h: tileSize
    };
}

function normalizeCustomMapData(value) {
    const input = value && typeof value === 'object' ? value : {};
    const tileSize = Math.max(24, Math.min(64, Math.floor(Number(input.tileSize) || TILE_SIZE)));
    const cols = Math.max(8, Math.min(100, Math.floor(Number(input.cols) || Math.ceil((Number(input.width) || 960) / tileSize))));
    const rows = Math.max(8, Math.min(100, Math.floor(Number(input.rows) || Math.ceil((Number(input.height) || 640) / tileSize))));
    const occupied = new Set();
    const walls = [];
    const spawnOccupied = new Set();
    const spawnPoints = [];
    const bushOccupied = new Set();
    const bushes = [];
    for (const wall of Array.isArray(input.walls) ? input.walls : []) {
        const col = Math.floor(Number(wall?.col));
        const row = Math.floor(Number(wall?.row));
        if (!Number.isFinite(col) || !Number.isFinite(row) || col < 0 || row < 0 || col >= cols || row >= rows) continue;
        const key = `${col},${row}`;
        if (occupied.has(key)) continue;
        occupied.add(key);
        walls.push({ id: `w${walls.length}`, col, row });
    }
    for (const bush of Array.isArray(input.bushes) ? input.bushes : []) {
        const col = Math.floor(Number(bush?.col));
        const row = Math.floor(Number(bush?.row));
        if (!Number.isFinite(col) || !Number.isFinite(row) || col < 0 || row < 0 || col >= cols || row >= rows) continue;
        const key = `${col},${row}`;
        if (occupied.has(key) || bushOccupied.has(key)) continue;
        bushOccupied.add(key);
        bushes.push({ id: `b${bushes.length}`, col, row });
    }
    for (const spawn of Array.isArray(input.spawnPoints) ? input.spawnPoints : []) {
        const col = Math.floor(Number(spawn?.col));
        const row = Math.floor(Number(spawn?.row));
        if (!Number.isFinite(col) || !Number.isFinite(row) || col < 0 || row < 0 || col >= cols || row >= rows) continue;
        const key = `${col},${row}`;
        if (spawnOccupied.has(key)) continue;
        spawnOccupied.add(key);
        spawnPoints.push({ col, row, x: (col + 0.5) * tileSize, y: (row + 0.5) * tileSize, team: spawn?.team === 'enemy' ? 'enemy' : 'own' });
    }
    const map = {
        id: String(input.id || ''),
        name: String(input.name || '사용자 맵').trim().slice(0, 30) || '사용자 맵',
        width: cols * tileSize,
        height: rows * tileSize,
        tileSize,
        cols,
        rows,
        walls,
        bushes,
        spawnPoints
    };
    map.obstacles = walls.map(wall => tileToRect(wall, tileSize));
    return map;
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

function isSummonBlocked(map, x, y, radius = BABY_SLIME_RADIUS) {
    if (x < radius || x > map.width - radius || y < radius || y > map.height - radius) {
        return true;
    }
    return map.obstacles.some(rect => rectContainsCircle(rect, x, y, radius));
}

export function isBabySlimeCellPassable(map, cell, radius = BABY_SLIME_RADIUS) {
    const tileSize = map.tileSize || TILE_SIZE;
    const cols = map.cols || Math.ceil(map.width / tileSize);
    const rows = map.rows || Math.ceil(map.height / tileSize);
    if (!cell || cell.col < 0 || cell.col >= cols || cell.row < 0 || cell.row >= rows) return false;
    if ((map.walls || []).some(wall => wall.col === cell.col && wall.row === cell.row)) return false;
    const x = cell.col * tileSize + tileSize / 2;
    const y = cell.row * tileSize + tileSize / 2;
    return !isSummonBlocked(map, x, y, radius + BABY_SLIME_WALL_MARGIN);
}

function destroyWallHitByProjectile(map, projectile) {
    const radius = projectile.radius || ULTIMATE_RADIUS;
    const hit = map.obstacles.find(rect => rectContainsCircle(rect, projectile.x, projectile.y, radius));
    if (!hit) return false;
    map.walls = map.walls.filter(wall => wall.id !== hit.id);
    map.obstacles = map.obstacles.filter(rect => rect.id !== hit.id);
    return hit;
}

function destroyWallsTouchedByUltimate(map, projectile, previousX, previousY) {
    const radius = projectile.radius || ULTIMATE_RADIUS;
    const samples = 8;
    const hits = [];
    for (let index = 0; index <= samples; index += 1) {
        const ratio = index / samples;
        const x = previousX + (projectile.x - previousX) * ratio;
        const y = previousY + (projectile.y - previousY) * ratio;
        let hit = map.obstacles.find(rect => rectContainsCircle(rect, x, y, radius));
        while (hit) {
            hits.push(hit);
            map.walls = map.walls.filter(wall => wall.id !== hit.id);
            map.obstacles = map.obstacles.filter(rect => rect.id !== hit.id);
            hit = map.obstacles.find(rect => rectContainsCircle(rect, x, y, radius));
        }
    }
    return hits;
}

function distanceFromPointToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq <= 0.0001) return Math.hypot(px - bx, py - by);
    const ratio = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq));
    return Math.hypot(px - (ax + dx * ratio), py - (ay + dy * ratio));
}

function bushContainsPoint(map, x, y) {
    const tileSize = map.tileSize || TILE_SIZE;
    return (map.bushes || []).some(bush =>
        x >= bush.col * tileSize && x <= (bush.col + 1) * tileSize &&
        y >= bush.row * tileSize && y <= (bush.row + 1) * tileSize
    );
}

function revealPlayer(player, now = Date.now(), duration = 1000) {
    player.revealedUntil = Math.max(player.revealedUntil || 0, now + duration);
}

function isPlayerHiddenFrom(match, player, viewerId, now = Date.now()) {
    if (!player.alive || player.id === viewerId) return false;
    if ((player.revealedUntil || 0) > now) return false;
    return bushContainsPoint(match.map, player.x, player.y);
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
    const insertCustomMap = db.prepare(`
        INSERT INTO guangboo_custom_maps (id, name, creator, width, height, tile_size, data_json, created_at, updated_at, mode, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateCustomMapStmt = db.prepare(`
        UPDATE guangboo_custom_maps
        SET name = ?, creator = ?, width = ?, height = ?, tile_size = ?, data_json = ?, updated_at = ?, mode = ?, summary = ?
        WHERE id = ?
    `);
    const deleteCustomMapStmt = db.prepare('DELETE FROM guangboo_custom_maps WHERE id = ?');
    const clearCustomMapsStmt = db.prepare('DELETE FROM guangboo_custom_maps');
    const listCustomMapsStmt = db.prepare(`
        SELECT id, name, creator, width, height, tile_size AS tileSize, data_json AS dataJson, created_at AS createdAt, updated_at AS updatedAt, mode, summary
        FROM guangboo_custom_maps
        ORDER BY updated_at DESC
        LIMIT 50
    `);
    const getCustomMapStmt = db.prepare('SELECT * FROM guangboo_custom_maps WHERE id = ?');
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

    function publicMapRow(row) {
        if (!row) return null;
        let mapData = null;
        const rawData = row.dataJson || row.data_json;
        if (rawData) {
            try {
                const parsed = JSON.parse(rawData);
                mapData = {
                    cols: parsed.cols,
                    rows: parsed.rows,
                    tileSize: parsed.tileSize,
                    mode: parsed.mode || row.mode || 'survival',
                    summary: parsed.summary || row.summary || '',
                    walls: Array.isArray(parsed.walls) ? parsed.walls.map(({ col, row }) => ({ col, row })) : [],
                    bushes: Array.isArray(parsed.bushes) ? parsed.bushes.map(({ col, row }) => ({ col, row })) : [],
                    spawnPoints: Array.isArray(parsed.spawnPoints) ? parsed.spawnPoints.map(({ col, row, x, y, team }) => ({ col, row, x, y, team: team === 'enemy' ? 'enemy' : 'own' })) : []
                };
            } catch {
                mapData = null;
            }
        }
        return {
            id: row.id,
            name: row.name,
            creator: row.creator,
            width: row.width,
            height: row.height,
            tileSize: row.tileSize || row.tile_size,
            mode: row.mode || mapData?.mode || 'survival',
            summary: row.summary || mapData?.summary || '',
            map: mapData,
            walls: mapData?.walls || [],
            bushes: mapData?.bushes || [],
            spawnPoints: mapData?.spawnPoints || [],
            createdAt: row.createdAt || row.created_at,
            updatedAt: row.updatedAt || row.updated_at
        };
    }

    function normalizeMapMeta({ mode, summary } = {}) {
        const normalizedMode = MODES[mode] ? mode : DEFAULT_MODE;
        const normalizedSummary = String(summary || '').trim().slice(0, 180);
        return { mode: normalizedMode, summary: normalizedSummary };
    }

    function saveCustomMap({ name, creator, map, mode, summary, id = null }) {
        const meta = normalizeMapMeta({ mode: mode || map?.mode, summary: summary || map?.summary });
        const normalized = normalizeCustomMapData({ ...map, name, mode: meta.mode, summary: meta.summary });
        const mapId = id ? String(id) : `gbm_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
        normalized.id = mapId;
        normalized.name = String(name || normalized.name).trim().slice(0, 30) || normalized.name;
        normalized.mode = meta.mode;
        normalized.summary = meta.summary;
        const timestamp = nowIso();
        const normalizedCreator = normalizeNickname(creator || 'Map Maker');
        const payload = JSON.stringify(normalized);
        if (id) {
            const result = updateCustomMapStmt.run(normalized.name, normalizedCreator, normalized.width, normalized.height, normalized.tileSize, payload, timestamp, meta.mode, meta.summary, mapId);
            if (result.changes === 0) return null;
            return publicMapRow({ id: mapId, name: normalized.name, creator: normalizedCreator, width: normalized.width, height: normalized.height, tileSize: normalized.tileSize, dataJson: payload, updatedAt: timestamp, mode: meta.mode, summary: meta.summary });
        }
        insertCustomMap.run(
            mapId,
            normalized.name,
            normalizedCreator,
            normalized.width,
            normalized.height,
            normalized.tileSize,
            payload,
            timestamp,
            timestamp,
            meta.mode,
            meta.summary
        );
        return publicMapRow({ id: mapId, name: normalized.name, creator: normalizedCreator, width: normalized.width, height: normalized.height, tileSize: normalized.tileSize, dataJson: payload, createdAt: timestamp, updatedAt: timestamp, mode: meta.mode, summary: meta.summary });
    }

    function listCustomMaps() {
        return listCustomMapsStmt.all().map(publicMapRow);
    }

    function getCustomMap(id) {
        const row = getCustomMapStmt.get(String(id || ''));
        if (!row) return null;
        try {
            return normalizeCustomMapData({ ...JSON.parse(row.data_json), id: row.id, name: row.name, mode: row.mode || DEFAULT_MODE, summary: row.summary || '' });
        } catch {
            return null;
        }
    }

    function updateCustomMap(id, payload) {
        return saveCustomMap({ ...payload, id });
    }

    function deleteCustomMap(id) {
        return deleteCustomMapStmt.run(String(id || '')).changes > 0;
    }

    function clearCustomMaps() {
        clearCustomMapsStmt.run();
    }

    return { ensurePlayer, recordMatch, getLeaderboard, listCustomMaps, saveCustomMap, updateCustomMap, deleteCustomMap, clearCustomMaps, getCustomMap };
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

    function snapshotMatch(match, viewerId = null, effects = null) {
        const now = Date.now();
        return {
            type: 'state',
            tick: match.tick,
            players: [...match.players.values()].filter(player => !isPlayerHiddenFrom(match, player, viewerId, now)).map(player => {
                syncUltimateReady(player);
                return {
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
                    ultimateHits: isSlime(player) ? slimeHitsForUltimate(player) : Math.min(ULTIMATE_HITS_REQUIRED, player.ultimateHits || 0),
                    ultimateRequired: ultimateRequiredFor(player),
                    ultimateReady: Boolean(player.ultimateReady),
                    slowedUntil: player.slowedUntil || 0,
                    alive: player.alive,
                    kills: player.kills,
                    disconnected: player.disconnected,
                    revealedUntil: player.revealedUntil || 0
                };
            }),
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
                health: projectile.health,
                maxHealth: projectile.kind === 'ultimate' ? ULTIMATE_PROJECTILE_HEALTH : undefined,
                kind: projectile.kind || 'normal',
                radius: Math.round(projectile.radius || 8)
            })),
            slimeTrails: match.slimeTrails.map(trail => ({
                id: trail.id, ownerId: trail.ownerId, x: Math.round(trail.x), y: Math.round(trail.y), radius: trail.radius
            })),
            summons: match.summons.map(summon => ({
                id: summon.id, ownerId: summon.ownerId, kind: summon.kind, x: Math.round(summon.x), y: Math.round(summon.y),
                health: Math.max(0, Math.round(summon.health)), maxHealth: summon.maxHealth, radius: summon.radius,
                facingX: Number((summon.facing?.x ?? 1).toFixed(3)), facingY: Number((summon.facing?.y ?? 0).toFixed(3))
            })),
            effects: effects ?? match.effects.splice(0, match.effects.length),
            map: match.map,
            aliveCount: [...match.players.values()].filter(player => player.alive).length
        };
    }

    function broadcastMatch(match, payload) {
        match.players.forEach(player => {
            const nextPayload = typeof payload === 'function' ? payload(player.id) : payload;
            sendJson(player.client.socket, nextPayload);
        });
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
        const before = player.health;
        player.health = Math.min(PLAYER_MAX_HEALTH, player.health + regenTicks * REGEN_PER_TICK);
        if (player.health > before && player.client?.match?.effects) {
            player.client.match.effects.push({ id: `${player.client.match.id}-heal-${player.id}-${now}`, kind: 'heal', ownerId: player.id, x: Math.round(player.x), y: Math.round(player.y) });
        }
        player.lastRegenAt += regenTicks * REGEN_TICK_MS;
        if (player.health >= PLAYER_MAX_HEALTH) player.lastRegenAt = now;
    }

    function isSlime(player) {
        return player?.character === 'slime';
    }

    function ultimateRequiredFor(player) {
        return isSlime(player) ? SLIME_ULTIMATE_MIN_HITS_REQUIRED : ULTIMATE_HITS_REQUIRED;
    }

    function slimeHitsForUltimate(player) {
        return getSlimeUltimateSummonCount(player?.slimeHits ?? player?.slimeSummonCharge ?? player?.ultimateHits ?? 0);
    }

    function hasSlimeUltimateCharge(player) {
        return isSlimeUltimateReady(slimeHitsForUltimate(player));
    }

    function hasUsableUltimate(player) {
        const hits = player?.ultimateHits || 0;
        return isSlime(player) ? hasSlimeUltimateCharge(player) : hits >= ULTIMATE_HITS_REQUIRED;
    }

    function syncUltimateReady(player) {
        player.ultimateReady = hasUsableUltimate(player);
    }

    function addUltimateHitCharge(player) {
        if (isSlime(player)) {
            player.slimeHits = getSlimeUltimateSummonCount((player.slimeHits || 0) + 1);
            player.slimeSummonCharge = player.slimeHits;
            player.ultimateHits = player.slimeHits;
            player.ultimateReady = isSlimeUltimateReady(player.slimeHits);
            return;
        }
        player.ultimateHits = Math.min(ULTIMATE_HITS_REQUIRED, (player.ultimateHits || 0) + 1);
        syncUltimateReady(player);
    }

    function consumeSlimeSummonCharge(player) {
        const spawnCount = slimeHitsForUltimate(player);
        player.slimeHits = 0;
        player.slimeSummonCharge = 0;
        player.ultimateHits = 0;
        player.ultimateReady = false;
        return spawnCount;
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

    function babySlimeSpawnPoint(match, player, angle, index) {
        const distances = [34, 52, 70, 88];
        const angleOffsets = [0, Math.PI / 5, -Math.PI / 5, Math.PI / 2, -Math.PI / 2, Math.PI];
        for (const distance of distances) {
            for (const offset of angleOffsets) {
                const spawnAngle = angle + offset + index * 0.17;
                const x = Math.max(BABY_SLIME_RADIUS, Math.min(match.map.width - BABY_SLIME_RADIUS, player.x + Math.cos(spawnAngle) * distance));
                const y = Math.max(BABY_SLIME_RADIUS, Math.min(match.map.height - BABY_SLIME_RADIUS, player.y + Math.sin(spawnAngle) * distance));
                if (!isSummonBlocked(match.map, x, y, BABY_SLIME_RADIUS + BABY_SLIME_WALL_MARGIN)) return { x, y };
            }
        }
        return { x: player.x, y: player.y };
    }

    function spawnBabySlimes(match, player, count, now) {
        const total = getSlimeUltimateSummonCount(count);
        if (total < SLIME_ULTIMATE_MIN_HITS_REQUIRED) return;
        for (let index = 0; index < total; index += 1) {
            const angle = (Math.PI * 2 * index) / total;
            const spawn = babySlimeSpawnPoint(match, player, angle, index);
            match.summons.push({
                id: `${match.id}-bs${match.nextSummonId++}`,
                kind: 'babySlime',
                ownerId: player.id,
                x: spawn.x,
                y: spawn.y,
                health: BABY_SLIME_HEALTH,
                maxHealth: BABY_SLIME_HEALTH,
                radius: BABY_SLIME_RADIUS,
                facing: { x: Math.cos(angle), y: Math.sin(angle) },
                expiresAt: now + BABY_SLIME_LIFETIME_MS
            });
        }
    }

    function summonGridPath(match, summon, target) {
        const map = match.map;
        const tileSize = map.tileSize || TILE_SIZE;
        const cols = map.cols || Math.ceil(map.width / tileSize);
        const rows = map.rows || Math.ceil(map.height / tileSize);
        const toCell = point => ({
            col: Math.max(0, Math.min(cols - 1, Math.floor(point.x / tileSize))),
            row: Math.max(0, Math.min(rows - 1, Math.floor(point.y / tileSize)))
        });
        const start = toCell(summon);
        const goal = toCell(target);
        const keyOf = cell => `${cell.col},${cell.row}`;
        const passable = cell => isBabySlimeCellPassable(map, cell, summon.radius || BABY_SLIME_RADIUS);
        if (!passable(start) || !passable(goal)) return null;

        const open = [{ ...start, g: 0, f: Math.abs(goal.col - start.col) + Math.abs(goal.row - start.row) }];
        const cameFrom = new Map();
        const bestCost = new Map([[keyOf(start), 0]]);
        const directions = [
            { col: 1, row: 0 }, { col: -1, row: 0 }, { col: 0, row: 1 }, { col: 0, row: -1 }
        ];

        while (open.length) {
            open.sort((a, b) => a.f - b.f);
            const current = open.shift();
            const currentKey = keyOf(current);
            if (current.col === goal.col && current.row === goal.row) {
                const path = [current];
                let cursor = currentKey;
                while (cameFrom.has(cursor)) {
                    const previous = cameFrom.get(cursor);
                    path.unshift(previous.cell);
                    cursor = previous.key;
                }
                return path;
            }
            directions.forEach(direction => {
                const next = { col: current.col + direction.col, row: current.row + direction.row };
                if (!passable(next)) return;
                const nextKey = keyOf(next);
                const nextCost = (bestCost.get(currentKey) || 0) + 1;
                if (nextCost >= (bestCost.get(nextKey) ?? Infinity)) return;
                bestCost.set(nextKey, nextCost);
                cameFrom.set(nextKey, { key: currentKey, cell: current });
                const heuristic = Math.abs(goal.col - next.col) + Math.abs(goal.row - next.row);
                open.push({ ...next, g: nextCost, f: nextCost + heuristic });
            });
        }
        return null;
    }

    function moveSummonTowardTarget(match, summon, target, dt) {
        const path = summonGridPath(match, summon, target);
        const tileSize = match.map.tileSize || TILE_SIZE;
        const nextCell = path?.[1] || path?.[0];
        const waypoint = nextCell
            ? { x: nextCell.col * tileSize + tileSize / 2, y: nextCell.row * tileSize + tileSize / 2 }
            : target;
        const dx = waypoint.x - summon.x;
        const dy = waypoint.y - summon.y;
        const length = Math.hypot(dx, dy) || 1;
        const distance = Math.min(BABY_SLIME_SPEED * dt, length);
        const stepX = (dx / length) * distance;
        const stepY = (dy / length) * distance;
        const radius = summon.radius || BABY_SLIME_RADIUS;
        const candidates = [
            { x: summon.x + stepX, y: summon.y + stepY },
            { x: summon.x + stepX, y: summon.y },
            { x: summon.x, y: summon.y + stepY },
            { x: summon.x - stepY * 0.72, y: summon.y + stepX * 0.72 },
            { x: summon.x + stepY * 0.72, y: summon.y - stepX * 0.72 }
        ].sort((a, b) => Math.hypot(a.x - waypoint.x, a.y - waypoint.y) - Math.hypot(b.x - waypoint.x, b.y - waypoint.y));
        const next = candidates.find(candidate => !isSummonBlocked(match.map, candidate.x, candidate.y, radius));
        if (!next) return;
        const moveLength = Math.hypot(next.x - summon.x, next.y - summon.y);
        if (moveLength > 0.01) summon.facing = { x: (next.x - summon.x) / moveLength, y: (next.y - summon.y) / moveLength };
        summon.x = next.x;
        summon.y = next.y;
    }

    function stepSummons(match, now, dt) {
        const survivors = [];
        match.summons.forEach(summon => {
            if (summon.health <= 0 || summon.expiresAt <= now) return;
            const target = [...match.players.values()]
                .filter(player => player.alive && player.id !== summon.ownerId)
                .sort((a, b) => Math.hypot(a.x - summon.x, a.y - summon.y) - Math.hypot(b.x - summon.x, b.y - summon.y))[0];
            const enemyUltimate = match.projectiles
                .filter(projectile => projectile.kind === 'ultimate' && projectile.ownerId !== summon.ownerId && !projectile.destroyed)
                .sort((a, b) => Math.hypot(a.x - summon.x, a.y - summon.y) - Math.hypot(b.x - summon.x, b.y - summon.y))[0];
            const targetEntity = enemyUltimate && (!target || Math.hypot(enemyUltimate.x - summon.x, enemyUltimate.y - summon.y) < Math.hypot(target.x - summon.x, target.y - summon.y))
                ? enemyUltimate
                : target;
            if (targetEntity) {
                moveSummonTowardTarget(match, summon, targetEntity, dt);
                const hitRange = targetEntity.kind === 'ultimate'
                    ? (targetEntity.radius || ULTIMATE_RADIUS) + summon.radius + BABY_SLIME_ATTACK_RANGE
                    : 22 + summon.radius;
                if (Math.hypot(targetEntity.x - summon.x, targetEntity.y - summon.y) <= hitRange) {
                    const owner = match.players.get(summon.ownerId);
                    if (owner) revealPlayer(owner, now);
                    if (targetEntity.kind === 'ultimate') {
                        targetEntity.health = (targetEntity.health ?? ULTIMATE_PROJECTILE_HEALTH) - BABY_SLIME_DAMAGE;
                        if (targetEntity.health <= 0) targetEntity.destroyed = true;
                    } else {
                        targetEntity.health -= BABY_SLIME_DAMAGE;
                        revealPlayer(targetEntity, now);
                        applySlow(targetEntity, now);
                        resetRegenTimer(targetEntity, now);
                        if (targetEntity.health <= 0) eliminatePlayer(match, targetEntity, owner);
                    }
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
        revealPlayer(player, now);
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
        if (isSlime(player)) {
            if (!hasSlimeUltimateCharge(player)) return false;
            player.queuedUltimateAim = clampUnitVector(aim);
            player.ultimateReady = true;
            return true;
        }
        syncUltimateReady(player);
        if (!player.ultimateReady) return false;
        player.queuedUltimateAim = clampUnitVector(aim);
        return true;
    }

    function castSlimeUltimate(match, player, now) {
        const spawnCount = slimeHitsForUltimate(player);
        if (spawnCount < SLIME_ULTIMATE_MIN_HITS_REQUIRED) return false;
        spawnBabySlimes(match, player, spawnCount, now);
        consumeSlimeSummonCharge(player);
        player.queuedUltimateAim = null;
        revealPlayer(player, now);
        resetRegenTimer(player, now);
        return true;
    }

    function spawnUltimateProjectile(match, player, now) {
        if (isSlime(player)) {
            castSlimeUltimate(match, player, now);
            return;
        }
        syncUltimateReady(player);
        if (!player.ultimateReady) return;
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
        revealPlayer(player, now);
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
            health: ULTIMATE_PROJECTILE_HEALTH,
            maxHealth: ULTIMATE_PROJECTILE_HEALTH,
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

    function startUltimateKnockback(player, projectile, now) {
        const vLen = Math.hypot(projectile.vx, projectile.vy) || 1;
        player.knockback = {
            x: projectile.vx / vLen,
            y: projectile.vy / vLen,
            until: now + KNOCKBACK_DURATION_MS,
            durationMs: KNOCKBACK_DURATION_MS,
            initialSpeed: (KNOCKBACK_DISTANCE * 2) / (KNOCKBACK_DURATION_MS / 1000)
        };
    }

    function stepPlayerKnockback(match, player, now, dt) {
        const knockback = player.knockback;
        if (!knockback || knockback.until <= now) {
            player.knockback = null;
            return false;
        }
        const remainingRatio = Math.max(0, Math.min(1, (knockback.until - now) / knockback.durationMs));
        const speed = knockback.initialSpeed * remainingRatio;
        player.x += knockback.x * speed * dt;
        player.y += knockback.y * speed * dt;
        resolvePlayerPosition(player, match.map);
        return true;
    }

    function projectileTouchesPlayer(projectile, player, previousX, previousY) {
        const hitRadius = 22 + (projectile.radius || 8);
        if (projectile.kind !== 'ultimate') {
            return Math.hypot(player.x - projectile.x, player.y - projectile.y) <= hitRadius;
        }
        return distanceFromPointToSegment(player.x, player.y, previousX, previousY, projectile.x, projectile.y) <= hitRadius;
    }

    function collideWithEnemyUltimateProjectile(match, projectile) {
        if (projectile.kind === 'ultimate') return false;
        const hitUltimate = match.projectiles.find(candidate =>
            candidate.kind === 'ultimate' &&
            !candidate.destroyed &&
            candidate.ownerId !== projectile.ownerId &&
            Math.hypot(candidate.x - projectile.x, candidate.y - projectile.y) <= (candidate.radius || ULTIMATE_RADIUS) + (projectile.radius || 8)
        );
        if (!hitUltimate) return false;
        hitUltimate.health = (hitUltimate.health ?? ULTIMATE_PROJECTILE_HEALTH) - (projectile.damage || 0);
        if (hitUltimate.health <= 0) hitUltimate.destroyed = true;
        return true;
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
            const aim = clampUnitVector(input.aim);
            if (Math.hypot(aim.x, aim.y) > 0.18) {
                player.aim = aim;
            }
            reloadAmmo(player, now);
            const knockbackActive = stepPlayerKnockback(match, player, now, dt);
            const move = knockbackActive ? { x: 0, y: 0 } : clampUnitVector(input.move);
            if (Math.hypot(move.x, move.y) > 0.18) {
                player.facing = move;
            }
            const slowed = (player.slowedUntil || 0) > now || isOnEnemySlimeTrail(match, player, now);
            const speed = PLAYER_SPEED * (slowed ? SLOW_FACTOR : 1);
            if (!knockbackActive) {
                player.x += move.x * speed * dt;
                player.y += move.y * speed * dt;
            }
            if (slowed) applySlow(player, now, 250);
            if (!knockbackActive && Math.hypot(move.x, move.y) > 0.18) dropSlimeTrail(match, player, now);
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
            if (projectile.destroyed) return;
            if (projectile.spawnedTick === match.tick) {
                projectiles.push(projectile);
                return;
            }
            steerUltimateProjectile(match, projectile);
            const isUltimateProjectile = projectile.kind === 'ultimate';
            const stepDistance = Math.hypot(projectile.vx * dt, projectile.vy * dt);
            const remaining = Math.max(0, projectile.maxDistance - projectile.traveled);
            const travelThisTick = isUltimateProjectile ? stepDistance : Math.min(stepDistance, remaining);
            const velocityLength = Math.hypot(projectile.vx, projectile.vy) || 1;
            const previousX = projectile.x;
            const previousY = projectile.y;
            projectile.x += (projectile.vx / velocityLength) * travelThisTick;
            projectile.y += (projectile.vy / velocityLength) * travelThisTick;
            projectile.traveled += travelThisTick;
            if (!isUltimateProjectile && projectile.traveled >= projectile.maxDistance) return;
            if (isUltimateProjectile) {
                const wallHits = destroyWallsTouchedByUltimate(match.map, projectile, previousX, previousY);
                wallHits.forEach((wallHit, wallBreaks) => {
                    match.effects.push({ id: `${match.id}-wall-${projectile.id}-${match.tick}-${wallBreaks}`, kind: 'wallBreak', x: Math.round(wallHit.x), y: Math.round(wallHit.y) });
                });
            } else if (isProjectileBlocked(projectile, match.map)) {
                return;
            }

            if (collideWithEnemyUltimateProjectile(match, projectile)) return;

            const owner = match.players.get(projectile.ownerId);
            const projectileHitTargets = projectile.hitTargetIds || new Set();
            projectile.hitTargetIds = projectileHitTargets;
            const summonHit = match.summons.find(summon =>
                summon.ownerId !== projectile.ownerId &&
                !projectileHitTargets.has(`summon:${summon.id}`) &&
                Math.hypot(summon.x - projectile.x, summon.y - projectile.y) <= summon.radius + (projectile.radius || 8)
            );
            if (summonHit) {
                projectileHitTargets.add(`summon:${summonHit.id}`);
                summonHit.health -= projectile.damage;
                if (summonHit.health <= 0) {
                    match.summons = match.summons.filter(summon => summon.id !== summonHit.id);
                }
                if (projectile.kind !== 'ultimate') return;
            }

            const hit = [...match.players.values()].find(player =>
                player.alive &&
                player.id !== projectile.ownerId &&
                !projectileHitTargets.has(`player:${player.id}`) &&
                projectileTouchesPlayer(projectile, player, previousX, previousY)
            );
            if (hit) {
                projectileHitTargets.add(`player:${hit.id}`);
                hit.health -= projectile.damage;
                revealPlayer(hit, now);
                resetRegenTimer(hit, now);
                if ((projectile.kind === 'normal' || projectile.kind === 'slime') && owner) {
                    addUltimateHitCharge(owner);
                }
                if (projectile.kind === 'slime' && owner) {
                    if (hit.ammo > 0) {
                        hit.ammo = Math.max(0, hit.ammo - 1);
                        owner.ammo = Math.min(MAX_AMMO, owner.ammo + 1);
                    }
                    applySlow(hit, now);
                }
                if (projectile.kind === 'ultimate') {
                    startUltimateKnockback(hit, projectile, now);
                }
                if (hit.health <= 0) {
                    eliminatePlayer(match, hit, owner);
                }
                if (projectile.kind === 'ultimate') return;
                return;
            }
            projectiles.push(projectile);
        });
        match.projectiles = projectiles.filter(projectile => !projectile.destroyed);

        if (match.status === 'active') {
            const effects = match.effects.splice(0, match.effects.length);
            broadcastMatch(match, viewerId => snapshotMatch(match, viewerId, effects));
        }
    }

    function spawnPointForMap(map, index) {
        if (Array.isArray(map.spawnPoints) && map.spawnPoints.length) {
            const spawn = map.spawnPoints[index % map.spawnPoints.length];
            return { x: Math.max(22, Math.min(map.width - 22, spawn.x)), y: Math.max(22, Math.min(map.height - 22, spawn.y)) };
        }
        if (map.width === 960 && map.height === 640 && map.cols === 24 && map.rows === 16) {
            return SPAWNS[index % SPAWNS.length];
        }
        const margin = 72;
        const candidates = [
            { x: margin, y: map.height / 2 },
            { x: map.width - margin, y: map.height / 2 },
            { x: map.width / 2, y: margin },
            { x: map.width / 2, y: map.height - margin },
            { x: map.width / 2, y: map.height / 2 }
        ];
        const base = candidates[index % candidates.length] || SPAWNS[index % SPAWNS.length];
        return {
            x: Math.max(22, Math.min(map.width - 22, base.x)),
            y: Math.max(22, Math.min(map.height - 22, base.y))
        };
    }

    function startMatch(players, mode, customMap = null, officialMapId = null) {
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
            effects: [],
            map: customMap ? normalizeCustomMapData(customMap) : (getOfficialMap(officialMapId) || createMap()),
            nextProjectileId: 1,
            nextSlimeTrailId: 1,
            nextSummonId: 1,
            timer: null
        };

        players.forEach((client, index) => {
            const spawn = spawnPointForMap(match.map, index);
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
                knockback: null,
                revealedUntil: 0,
                lastSlimeTrailAt: 0,
                queuedShotAims: [],
                queuedUltimateAim: null,
                ultimateHits: 0,
                slimeHits: 0,
                slimeSummonCharge: 0,
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
                ultimateRequired: ultimateRequiredFor(player),
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
            const group = queue.splice(0, mode.size);
            const customMap = store.getCustomMap(group.find(client => client.customMapId)?.customMapId);
            const officialMapId = group.find(client => client.officialMapId)?.officialMapId;
            startMatch(group, mode, customMap, officialMapId);
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
            nextUltimateAt: Date.now() + 1200,
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
            const healthRatio = player.health / PLAYER_MAX_HEALTH;
            player.botRetreating = healthRatio <= BOT_RETREAT_HEALTH_RATIO || (player.botRetreating && healthRatio < BOT_RETREAT_RECOVER_RATIO);
            let move = { x: 0, y: 0 };
            if (player.botRetreating) {
                move = { x: -aim.x, y: -aim.y };
            } else if (distance > 260) {
                move = aim;
            } else if (distance < 150) {
                move = { x: -aim.x, y: -aim.y };
            }

            const firing = !player.botRetreating && distance < 560 && now >= client.nextFireAt;
            if (firing) client.nextFireAt = now + 650 + Math.floor(Math.random() * 350);
            const ultimate = !player.botRetreating && distance < 620 && hasUsableUltimate(player) && now >= (client.nextUltimateAt || 0);
            if (ultimate) client.nextUltimateAt = now + 1200 + Math.floor(Math.random() * 500);
            client.input = { move, aim, firing, ultimate };
            if (firing) queueShotInput(player, aim, now);
            if (ultimate && queueUltimateInput(player, aim)) spawnUltimateProjectile(match, player, now);
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
            client.customMapId = typeof message.customMapId === 'string' && message.customMapId ? message.customMapId : null;
            client.officialMapId = typeof message.officialMapId === 'string' && OFFICIAL_MAPS[message.officialMapId] ? message.officialMapId : null;
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
                    if (message.ultimate && queueUltimateInput(player, aim)) {
                        spawnUltimateProjectile(client.match, player, Date.now());
                    }
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
