(() => {
    const SEND_MS = 33;
    const BASE_WORLD = { width: 960, height: 640, tileSize: 40, walls: [], obstacles: [] };
    const STORAGE_KEY = 'guangboo_v2_nickname';
    const MODE_KEY = 'guangboo_v2_mode';
    const CHARACTER_KEY = 'guangboo_v2_character';
    const BOT_KEY = 'guangboo_v2_bots';
    const MAP_KEY = 'guangboo_v2_map';
    const PLAYER_MAX_HEALTH = 6000;

    const elements = {
        lobby: document.getElementById('lobbyScreen'),
        game: document.getElementById('gameScreen'),
        result: document.getElementById('resultScreen'),
        joinForm: document.getElementById('joinForm'),
        nickname: document.getElementById('nicknameInput'),
        joinButton: document.getElementById('joinButton'),
        botToggle: document.getElementById('botToggle'),
        customMapSelect: document.getElementById('customMapSelect'),
        status: document.getElementById('statusLine'),
        pixiHost: document.getElementById('pixiHost'),
        health: document.getElementById('healthReadout'),
        alive: document.getElementById('aliveReadout'),
        kills: document.getElementById('killReadout'),
        connection: document.getElementById('connectionHud'),
        leftStick: document.getElementById('leftStick'),
        rightStick: document.getElementById('rightStick'),
        ultimateButton: document.getElementById('ultimateButton'),
        ultimateReadout: document.getElementById('ultimateReadout'),
        resultTitle: document.getElementById('resultTitle'),
        resultList: document.getElementById('resultList'),
        playAgain: document.getElementById('playAgainButton'),
        backLobby: document.getElementById('backLobbyButton'),
        modeInputs: [...document.querySelectorAll('input[name="matchMode"]')],
        characterInputs: [...document.querySelectorAll('input[name="character"]')]
    };

    const keys = new Set();
    const state = {
        ws: null,
        connected: false,
        serverReady: false,
        joining: false,
        matchActive: false,
        playerId: null,
        matchId: null,
        map: BASE_WORLD,
        mapSignature: '',
        players: [],
        projectiles: [],
        slimeTrails: [],
        summons: [],
        modes: [
            { key: 'duel', label: '1:1 결투', size: 2 },
            { key: 'survival', label: '4인 생존전', size: 4 }
        ],
        inputSeq: 0,
        queuedShots: [],
        queuedUltimate: false,
        lastAim: { x: 1, y: 0 },
        mouseAim: { active: false, x: 1, y: 0 },
        leftStick: stickState(),
        rightStick: stickState(),
        render: {
            app: null,
            ready: false,
            background: null,
            world: null,
            mapLayer: null,
            trailLayer: null,
            projectileLayer: null,
            summonLayer: null,
            playerLayer: null,
            players: new Map(),
            projectiles: new Map(),
            summons: new Map(),
            trails: new Map()
        }
    };

    function stickState() {
        return { active: false, pointerId: null, x: 0, y: 0, centerX: 0, centerY: 0 };
    }

    function wsUrl() {
        if (location.protocol === 'file:') return 'ws://127.0.0.1:4173/guangboo/ws';
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${location.host}/guangboo/ws`;
    }

    function setScreen(name) {
        elements.lobby.hidden = name !== 'lobby';
        elements.game.hidden = name !== 'game';
        elements.result.hidden = name !== 'result';
        document.body.classList.toggle('is-playing', name === 'game');
        if (name !== 'game') {
            state.matchActive = false;
            resetStick('leftStick');
            resetStick('rightStick');
            state.queuedShots = [];
            state.queuedUltimate = false;
            state.mouseAim.active = false;
        }
    }

    function selectedMode() {
        return elements.modeInputs.find(input => input.checked)?.value || 'duel';
    }

    function selectedCharacter() {
        return elements.characterInputs.find(input => input.checked)?.value || 'monster';
    }

    function normalizeAim(aim) {
        const x = Number(aim?.x) || 0;
        const y = Number(aim?.y) || 0;
        const length = Math.hypot(x, y);
        if (length < 0.001) return { x: 1, y: 0 };
        return { x: x / length, y: y / length };
    }

    function clampUnit(vector) {
        const x = Number(vector?.x) || 0;
        const y = Number(vector?.y) || 0;
        const length = Math.hypot(x, y);
        if (length <= 1) return { x, y };
        return { x: x / length, y: y / length };
    }

    function send(payload) {
        if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return false;
        state.ws.send(JSON.stringify(payload));
        return true;
    }

    function connect() {
        if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) return;
        state.ws = new WebSocket(wsUrl());
        state.serverReady = false;
        elements.status.textContent = '서버 연결 중';
        elements.connection.textContent = '연결 중';

        state.ws.addEventListener('open', () => {
            state.connected = true;
            elements.status.textContent = '서버 연결 완료';
            elements.connection.textContent = '온라인';
        });
        state.ws.addEventListener('close', () => {
            state.connected = false;
            state.serverReady = false;
            state.matchActive = false;
            elements.status.textContent = '서버 연결 끊김';
            elements.connection.textContent = '오프라인';
            elements.joinButton.disabled = false;
        });
        state.ws.addEventListener('error', () => {
            elements.status.textContent = '서버 연결 실패';
            elements.connection.textContent = '오류';
        });
        state.ws.addEventListener('message', event => handleServerMessage(JSON.parse(event.data)));
    }

    function joinQueue() {
        if (!state.serverReady) return;
        const nickname = (elements.nickname.value || 'Monster').trim();
        const mode = selectedMode();
        const character = selectedCharacter();
        localStorage.setItem(STORAGE_KEY, nickname);
        localStorage.setItem(MODE_KEY, mode);
        localStorage.setItem(CHARACTER_KEY, character);
        localStorage.setItem(BOT_KEY, elements.botToggle.checked ? '1' : '0');
        localStorage.setItem(MAP_KEY, elements.customMapSelect.value || '');
        elements.joinButton.disabled = true;
        elements.joinButton.textContent = '매칭 중';
        elements.status.textContent = 'v2 매칭 요청 중';
        state.joining = true;
        send({ type: 'joinQueue', nickname, mode, character, customMapId: elements.customMapSelect.value || null, fillWithBots: elements.botToggle.checked });
    }

    function handleServerMessage(message) {
        if (message.type === 'hello') {
            state.playerId = message.playerId;
            if (Array.isArray(message.modes) && message.modes.length) state.modes = message.modes;
            state.serverReady = true;
            if (state.joining) joinQueue();
            return;
        }
        if (message.type === 'playerReady') {
            state.playerId = message.playerId;
            elements.status.textContent = `${message.nickname} ${message.modeLabel || ''} 대기 중`;
            return;
        }
        if (message.type === 'queue') {
            elements.status.textContent = `${message.modeLabel || message.mode}: ${message.playersWaiting}/${message.requiredPlayers} 대기 중`;
            return;
        }
        if (message.type === 'matchStart') {
            state.joining = false;
            state.matchActive = true;
            state.matchId = message.matchId;
            state.playerId = message.playerId;
            state.map = normalizeMap(message.map || BASE_WORLD);
            state.players = message.players || [];
            state.projectiles = [];
            state.slimeTrails = [];
            state.summons = [];
            elements.joinButton.disabled = false;
            elements.joinButton.textContent = 'v2로 매칭 시작';
            elements.connection.textContent = message.modeLabel || '매치 진행';
            setScreen('game');
            ensurePixi();
            updateHud();
            return;
        }
        if (message.type === 'state') {
            if (message.map) state.map = normalizeMap(message.map);
            state.players = message.players || [];
            state.projectiles = message.projectiles || [];
            state.slimeTrails = message.slimeTrails || [];
            state.summons = message.summons || [];
            updateHud();
            return;
        }
        if (message.type === 'matchEnd') {
            state.matchActive = false;
            renderResults(message.winnerId, message.results || []);
            return;
        }
        if (message.type === 'error') {
            elements.status.textContent = message.message || message.code || '오류';
            elements.joinButton.disabled = false;
        }
    }

    function normalizeMap(map) {
        const tileSize = Number(map.tileSize) || 40;
        const width = Math.max(tileSize, Number(map.width) || BASE_WORLD.width);
        const height = Math.max(tileSize, Number(map.height) || BASE_WORLD.height);
        const walls = Array.isArray(map.walls) ? map.walls : [];
        const obstacles = Array.isArray(map.obstacles) ? map.obstacles : walls.map(wall => ({ id: wall.id || `${wall.col},${wall.row}`, col: wall.col, row: wall.row, x: wall.col * tileSize + tileSize / 2, y: wall.row * tileSize + tileSize / 2, w: tileSize, h: tileSize }));
        return { ...map, width, height, tileSize, walls, obstacles };
    }

    async function ensurePixi() {
        if (state.render.ready) return;
        if (!window.PIXI) {
            elements.connection.textContent = 'PixiJS 로드 실패';
            return;
        }
        const app = new PIXI.Application();
        await app.init({ resizeTo: elements.pixiHost, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: Math.max(1, Math.min(2, window.devicePixelRatio || 1)), preference: 'webgl' });
        elements.pixiHost.appendChild(app.canvas);
        state.render.app = app;
        state.render.background = new PIXI.Graphics();
        state.render.world = new PIXI.Container();
        state.render.mapLayer = new PIXI.Graphics();
        state.render.trailLayer = new PIXI.Container();
        state.render.projectileLayer = new PIXI.Container();
        state.render.summonLayer = new PIXI.Container();
        state.render.playerLayer = new PIXI.Container();
        app.stage.addChild(state.render.background);
        app.stage.addChild(state.render.world);
        state.render.world.addChild(state.render.mapLayer);
        state.render.world.addChild(state.render.trailLayer);
        state.render.world.addChild(state.render.projectileLayer);
        state.render.world.addChild(state.render.summonLayer);
        state.render.world.addChild(state.render.playerLayer);
        app.ticker.add(tickRender);
        state.render.ready = true;
    }

    function tickRender(ticker) {
        const app = state.render.app;
        if (!app) return;
        const width = app.renderer.width / app.renderer.resolution;
        const height = app.renderer.height / app.renderer.resolution;
        drawBackground(width, height);
        updateCamera(width, height);
        drawStaticMapIfNeeded();
        syncCollection(state.render.trails, state.render.trailLayer, state.slimeTrails, trail => trail.id || `${trail.ownerId}:${trail.x}:${trail.y}`, createTrailGraphic, updateTrailGraphic);
        syncCollection(state.render.projectiles, state.render.projectileLayer, state.projectiles, item => item.id || `${item.ownerId}:${item.x}:${item.y}`, createProjectileGraphic, updateProjectileGraphic);
        syncCollection(state.render.summons, state.render.summonLayer, state.summons, item => item.id, createSummonGraphic, (entry, item) => updateSummonGraphic(entry, item, ticker.deltaMS || 16.67));
        syncCollection(state.render.players, state.render.playerLayer, state.players, item => item.id, createPlayerGraphic, (entry, item) => updatePlayerGraphic(entry, item, ticker.deltaMS || 16.67));
    }

    function drawBackground(width, height) {
        const g = state.render.background;
        g.clear();
        g.rect(0, 0, width, height).fill(0x0a1114);
        g.circle(width * 0.22, height * 0.2, Math.max(width, height) * 0.38).fill({ color: 0x173822, alpha: 0.34 });
        g.circle(width * 0.82, height * 0.28, Math.max(width, height) * 0.34).fill({ color: 0x17304f, alpha: 0.26 });
    }

    function updateCamera(screenW, screenH) {
        const map = state.map || BASE_WORLD;
        const local = state.players.find(player => player.id === state.playerId && player.alive !== false);
        const fitScale = Math.min(screenW / map.width, screenH / map.height);
        const followScale = Math.min(screenW / BASE_WORLD.width, screenH / BASE_WORLD.height);
        const largeMap = map.width > BASE_WORLD.width || map.height > BASE_WORLD.height;
        const scale = largeMap && local ? followScale : fitScale;
        let x = largeMap && local ? screenW / 2 - local.x * scale : (screenW - map.width * scale) / 2;
        let y = largeMap && local ? screenH / 2 - local.y * scale : (screenH - map.height * scale) / 2;
        x = centeredClamp(x, screenW, map.width, scale);
        y = centeredClamp(y, screenH, map.height, scale);
        state.render.world.scale.set(scale);
        state.render.world.position.set(x, y);
    }

    function centeredClamp(offset, screenSize, worldSize, scale) {
        const scaled = worldSize * scale;
        if (scaled <= screenSize) return (screenSize - scaled) / 2;
        return Math.max(screenSize - scaled, Math.min(0, offset));
    }

    function mapSignature(map = state.map) {
        return `${map.width}:${map.height}:${map.tileSize}:${(map.walls || []).map(w => `${w.col},${w.row}`).join('|')}`;
    }

    function drawStaticMapIfNeeded() {
        const map = state.map || BASE_WORLD;
        const signature = mapSignature(map);
        if (signature === state.mapSignature) return;
        state.mapSignature = signature;
        const g = state.render.mapLayer;
        g.clear();
        g.roundRect(0, 0, map.width, map.height, 12).fill(0xeef3df).stroke({ width: 3, color: 0x314935, alpha: 0.45 });
        for (let x = map.tileSize; x < map.width; x += map.tileSize) g.moveTo(x, 0).lineTo(x, map.height).stroke({ width: 1, color: 0x21303f, alpha: 0.14 });
        for (let y = map.tileSize; y < map.height; y += map.tileSize) g.moveTo(0, y).lineTo(map.width, y).stroke({ width: 1, color: 0x21303f, alpha: 0.14 });
        const walls = Array.isArray(map.walls) && map.walls.length ? map.walls.map(wall => ({ x: wall.col * map.tileSize + map.tileSize / 2, y: wall.row * map.tileSize + map.tileSize / 2, w: map.tileSize, h: map.tileSize })) : (map.obstacles || []);
        walls.forEach(rect => {
            g.roundRect(rect.x - rect.w / 2, rect.y - rect.h / 2, rect.w, rect.h, 4).fill(0x8a6b3d).stroke({ width: 1, color: 0x3a2813, alpha: 0.42 });
            g.roundRect(rect.x - rect.w / 2 + 5, rect.y - rect.h / 2 + 5, Math.max(1, rect.w - 10), Math.max(1, rect.h - 10), 3).fill({ color: 0xffffff, alpha: 0.12 });
        });
    }

    function syncCollection(cache, layer, items, idOf, create, update) {
        const live = new Set();
        items.forEach(item => {
            const id = idOf(item);
            if (!id) return;
            live.add(id);
            let entry = cache.get(id);
            if (!entry) {
                entry = create(item);
                cache.set(id, entry);
                layer.addChild(entry.node);
            }
            update(entry, item);
        });
        [...cache.entries()].forEach(([id, entry]) => {
            if (live.has(id)) return;
            entry.node.destroy({ children: true });
            cache.delete(id);
        });
    }

    function createTrailGraphic() { return { node: new PIXI.Graphics() }; }
    function updateTrailGraphic(entry, trail) {
        const radius = Number(trail.radius) || 34;
        entry.node.clear();
        entry.node.position.set(trail.x, trail.y);
        entry.node.circle(0, 0, radius).fill({ color: trail.ownerId === state.playerId ? 0x65d96d : 0x40b95d, alpha: trail.ownerId === state.playerId ? 0.22 : 0.34 });
        entry.node.circle(0, 0, radius).stroke({ width: 2, color: 0x0f5c23, alpha: 0.28 });
    }

    function createProjectileGraphic() { return { node: new PIXI.Graphics() }; }
    function updateProjectileGraphic(entry, projectile) {
        const radius = Number(projectile.radius) || 8;
        const color = projectile.kind === 'ultimate' ? 0xf6c84f : projectile.kind === 'slime' ? 0x70f45e : 0xfff7a5;
        entry.node.clear();
        entry.node.position.set(projectile.x, projectile.y);
        entry.node.circle(0, 0, radius + 6).fill({ color, alpha: projectile.kind === 'ultimate' ? 0.18 : 0.12 });
        entry.node.circle(0, 0, radius).fill(color);
        if (projectile.kind === 'ultimate') entry.node.circle(0, 0, radius + 2).stroke({ width: 3, color: 0xffffff, alpha: 0.45 });
    }

    function createSummonGraphic(summon) {
        const node = new PIXI.Container();
        const body = new PIXI.Graphics();
        node.addChild(body);
        return { node, body, x: summon.x, y: summon.y };
    }
    function updateSummonGraphic(entry, summon, deltaMS) {
        smoothPosition(entry, summon, deltaMS);
        const radius = Number(summon.radius) || 14;
        const ratio = Math.max(0, Math.min(1, (Number(summon.health) || 0) / (Number(summon.maxHealth) || 500)));
        entry.body.clear();
        entry.body.ellipse(0, 0, radius * 1.15, radius * 0.92).fill(summon.ownerId === state.playerId ? 0x9dff76 : 0x4ade80);
        entry.body.circle(radius * 0.25, -radius * 0.18, radius * 0.12).fill(0x12351d);
        entry.body.circle(radius * 0.25, radius * 0.18, radius * 0.12).fill(0x12351d);
        entry.body.roundRect(-radius, -radius - 8, radius * 2, 4, 2).fill({ color: 0x080d0a, alpha: 0.75 });
        entry.body.roundRect(-radius, -radius - 8, radius * 2 * ratio, 4, 2).fill(0xd7f252);
    }

    function createPlayerGraphic(player) {
        const node = new PIXI.Container();
        const body = new PIXI.Graphics();
        const name = new PIXI.Text({ text: player.nickname || 'Monster', style: { fontFamily: 'system-ui, sans-serif', fontSize: 13, fontWeight: '700', fill: 0xf8fff4, align: 'center' } });
        name.anchor.set(0.5, 0.5);
        node.addChild(body, name);
        return { node, body, name, x: player.x, y: player.y };
    }
    function updatePlayerGraphic(entry, player, deltaMS) {
        smoothPosition(entry, player, deltaMS);
        const radius = 22;
        const facingX = player.facingX ?? player.aimX ?? 1;
        const facingY = player.facingY ?? player.aimY ?? 0;
        const angle = Math.atan2(facingY, facingX);
        const color = player.character === 'slime' ? 0x7ee65b : parseHex(player.monster?.color, 0x6ee7b7);
        const accent = player.character === 'slime' ? 0x167a34 : parseHex(player.monster?.accent, 0x064e3b);
        const health = Math.max(0, Number(player.health) || 0);
        const ratio = Math.max(0, Math.min(1, health / (Number(player.maxHealth) || PLAYER_MAX_HEALTH)));
        entry.node.alpha = player.alive ? 1 : 0.38;
        entry.body.clear();
        if (player.id === state.playerId) entry.body.circle(0, 0, radius + 8).stroke({ width: 4, color: 0xd7f252, alpha: 0.9 });
        entry.body.ellipse(0, 0, radius * 1.05, player.character === 'slime' ? radius * 0.78 : radius * 0.92).fill(color);
        entry.body.moveTo(radius * 0.08, -radius * 0.9).lineTo(radius * 0.46, -radius * 1.32).lineTo(radius * 0.56, -radius * 0.62).fill(accent);
        entry.body.moveTo(radius * 0.08, radius * 0.9).lineTo(radius * 0.46, radius * 1.32).lineTo(radius * 0.56, radius * 0.62).fill(accent);
        entry.body.circle(radius * 0.28, -radius * 0.3, radius * 0.21).fill(0xfffdf8);
        entry.body.circle(radius * 0.28, radius * 0.3, radius * 0.21).fill(0xfffdf8);
        entry.body.circle(radius * 0.35, -radius * 0.3, radius * 0.08).fill(0x141a12);
        entry.body.circle(radius * 0.35, radius * 0.3, radius * 0.08).fill(0x141a12);
        entry.body.moveTo(radius * 0.25, radius * 0.04).lineTo(radius * 0.67, radius * 0.04).stroke({ width: 3, color: accent });
        entry.body.rotation = angle;
        entry.body.roundRect(-38, -58, 76, 12, 6).fill({ color: 0x080d0a, alpha: 0.78 });
        entry.body.roundRect(-36, -56, 72 * ratio, 8, 5).fill(ratio <= 0.32 ? 0xe05252 : 0xd7f252);
        entry.body.rotation = 0;
        entry.name.text = player.nickname || 'Monster';
        entry.name.position.set(0, -78);
    }

    function smoothPosition(entry, target, deltaMS) {
        const alpha = 1 - Math.pow(0.001, Math.min(80, deltaMS) / 180);
        entry.x += (target.x - entry.x) * alpha;
        entry.y += (target.y - entry.y) * alpha;
        entry.node.position.set(entry.x, entry.y);
    }

    function parseHex(value, fallback) {
        if (typeof value !== 'string') return fallback;
        const number = Number.parseInt(value.replace('#', ''), 16);
        return Number.isFinite(number) ? number : fallback;
    }

    function updateHud() {
        const me = state.players.find(player => player.id === state.playerId);
        elements.health.textContent = me ? Math.max(0, Math.round(me.health)) : '0';
        elements.kills.textContent = me ? String(me.kills || 0) : '0';
        elements.alive.textContent = String(state.players.filter(player => player.alive).length);
        const required = Number(me?.ultimateRequired) || 4;
        const hits = Math.max(0, Number(me?.ultimateHits) || 0);
        const ready = me?.character === 'slime' ? hits >= 1 : Boolean(me?.ultimateReady);
        elements.ultimateButton.disabled = !state.matchActive || !ready || me?.alive === false;
        elements.ultimateButton.classList.toggle('is-ready', ready);
        elements.ultimateReadout.textContent = me?.character === 'slime' ? `${Math.min(4, hits)}마리` : (ready ? 'READY' : `${Math.min(required, hits)}/${required}`);
    }

    function currentMove() {
        if (state.leftStick.active) return clampUnit(state.leftStick);
        return clampUnit({ x: (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0), y: (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) });
    }
    function currentAim() {
        if (state.rightStick.active && Math.hypot(state.rightStick.x, state.rightStick.y) > 0.08) return normalizeAim(state.rightStick);
        if (state.mouseAim.active) return normalizeAim(state.mouseAim);
        return state.lastAim || { x: 1, y: 0 };
    }
    function currentInput() {
        let aim = currentAim();
        let firing = false;
        let ultimate = false;
        if (state.queuedShots.length) { aim = state.queuedShots.shift(); firing = true; }
        if (state.queuedUltimate) { aim = state.lastAim || aim; ultimate = true; state.queuedUltimate = false; }
        return { type: 'input', seq: ++state.inputSeq, move: currentMove(), aim, firing, ultimate };
    }
    function sendInputLoop() {
        if (state.matchActive) send(currentInput());
        window.setTimeout(sendInputLoop, SEND_MS);
    }
    function queueShot(aim) {
        const normalized = normalizeAim(aim);
        state.lastAim = normalized;
        state.queuedShots.push(normalized);
        if (state.matchActive) send(currentInput());
    }
    function fireUltimate() {
        const me = state.players.find(player => player.id === state.playerId);
        const ready = me?.character === 'slime' ? (Number(me?.ultimateHits) || 0) >= 1 : Boolean(me?.ultimateReady);
        if (!state.matchActive || !ready) return;
        state.queuedUltimate = true;
        send(currentInput());
        if (me) { me.ultimateReady = false; me.ultimateHits = 0; updateHud(); }
    }

    function setupStick(name, element) {
        const stick = state[name];
        const thumb = element.querySelector('.stick-thumb');
        const isRight = name === 'rightStick';
        const radius = 46;
        function start(event) {
            if (!state.matchActive || stick.active || event.pointerType === 'mouse') return;
            event.preventDefault();
            stick.active = true;
            stick.pointerId = event.pointerId;
            stick.centerX = event.clientX;
            stick.centerY = event.clientY;
            element.setPointerCapture?.(event.pointerId);
            update(event);
        }
        function update(event) {
            if (!stick.active || stick.pointerId !== event.pointerId) return;
            const dx = event.clientX - stick.centerX;
            const dy = event.clientY - stick.centerY;
            const length = Math.hypot(dx, dy);
            const limited = Math.min(radius, length);
            const ux = length ? dx / length : 0;
            const uy = length ? dy / length : 0;
            stick.x = (ux * limited) / radius;
            stick.y = (uy * limited) / radius;
            thumb.style.transform = `translate(calc(-50% + ${ux * limited}px), calc(-50% + ${uy * limited}px))`;
            if (isRight && Math.hypot(stick.x, stick.y) > 0.08) state.lastAim = normalizeAim(stick);
        }
        function end(event) {
            if (!stick.active || stick.pointerId !== event.pointerId) return;
            if (isRight) queueShot(Math.hypot(stick.x, stick.y) > 0.08 ? stick : nearestOpponentAim());
            resetStick(name);
        }
        element.addEventListener('pointerdown', start);
        element.addEventListener('pointermove', update);
        element.addEventListener('pointerup', end);
        element.addEventListener('pointercancel', end);
    }
    function resetStick(name) {
        const stick = state[name];
        stick.active = false; stick.pointerId = null; stick.x = 0; stick.y = 0;
        const element = elements[name];
        element?.querySelector('.stick-thumb')?.style.setProperty('transform', 'translate(-50%, -50%)');
    }
    function nearestOpponentAim() {
        const me = state.players.find(player => player.id === state.playerId && player.alive !== false);
        if (!me) return state.lastAim;
        const nearest = state.players.filter(player => player.id !== state.playerId && player.alive !== false).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        return nearest ? normalizeAim({ x: nearest.x - me.x, y: nearest.y - me.y }) : state.lastAim;
    }
    function updateMouseAim(event) {
        const app = state.render.app;
        const me = state.players.find(player => player.id === state.playerId);
        if (!app || !me) return;
        const rect = app.canvas.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;
        const worldX = (screenX - state.render.world.position.x) / state.render.world.scale.x;
        const worldY = (screenY - state.render.world.position.y) / state.render.world.scale.y;
        const aim = normalizeAim({ x: worldX - me.x, y: worldY - me.y });
        state.mouseAim = { active: true, ...aim };
        state.lastAim = aim;
    }

    function renderResults(winnerId, results) {
        const didWin = winnerId && winnerId === state.playerId;
        elements.resultTitle.textContent = didWin ? '승리' : '생존 종료';
        elements.resultList.innerHTML = '';
        results.forEach(result => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${result.placement}</span><strong>${escapeHtml(result.nickname)}</strong><span>${result.kills}킬</span>`;
            elements.resultList.appendChild(li);
        });
        elements.joinButton.disabled = false;
        elements.joinButton.textContent = 'v2로 매칭 시작';
        setScreen('result');
    }
    async function loadCustomMaps() {
        try {
            const response = await fetch('/api/guangboo/maps', { cache: 'no-store' });
            const data = await response.json();
            const selected = localStorage.getItem(MAP_KEY) || '';
            elements.customMapSelect.innerHTML = '<option value="">기본 맵</option>';
            (data.maps || []).forEach(map => {
                const option = document.createElement('option');
                option.value = map.id;
                option.textContent = `${map.name} (${Math.round(map.width / map.tileSize)}x${Math.round(map.height / map.tileSize)})`;
                elements.customMapSelect.appendChild(option);
            });
            if ([...elements.customMapSelect.options].some(option => option.value === selected)) elements.customMapSelect.value = selected;
        } catch {
            elements.customMapSelect.innerHTML = '<option value="">기본 맵</option>';
        }
    }
    function escapeHtml(value) {
        return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    }

    elements.joinForm.addEventListener('submit', event => {
        event.preventDefault();
        state.joining = true;
        connect();
        if (state.ws?.readyState === WebSocket.OPEN && state.serverReady) joinQueue();
    });
    elements.playAgain.addEventListener('click', () => {
        setScreen('lobby');
        state.joining = true;
        connect();
        if (state.ws?.readyState === WebSocket.OPEN && state.serverReady) joinQueue();
    });
    elements.backLobby.addEventListener('click', () => setScreen('lobby'));
    elements.ultimateButton.addEventListener('pointerdown', event => { event.preventDefault(); fireUltimate(); });
    elements.pixiHost.addEventListener('pointermove', event => { if (event.pointerType !== 'mouse' || !state.matchActive) return; updateMouseAim(event); });
    elements.pixiHost.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse' || !state.matchActive) return; updateMouseAim(event); });
    window.addEventListener('pointerup', event => {
        if (event.pointerType === 'mouse' && state.mouseAim.active && state.matchActive) queueShot(state.mouseAim);
        state.mouseAim.active = false;
    });
    window.addEventListener('keydown', event => {
        keys.add(event.code);
        if (event.code === 'Space') { event.preventDefault(); fireUltimate(); }
    });
    window.addEventListener('keyup', event => keys.delete(event.code));

    elements.nickname.value = localStorage.getItem(STORAGE_KEY) || '';
    elements.botToggle.checked = localStorage.getItem(BOT_KEY) !== '0';
    const savedMode = localStorage.getItem(MODE_KEY);
    if (savedMode) elements.modeInputs.forEach(input => { input.checked = input.value === savedMode; });
    const savedCharacter = localStorage.getItem(CHARACTER_KEY);
    if (savedCharacter) elements.characterInputs.forEach(input => { input.checked = input.value === savedCharacter; });
    loadCustomMaps();
    setupStick('leftStick', elements.leftStick);
    setupStick('rightStick', elements.rightStick);
    sendInputLoop();
})();
