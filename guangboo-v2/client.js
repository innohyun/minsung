(() => {
    const SEND_MS = 33;
    const BASE_WORLD = { width: 960, height: 640, tileSize: 40, walls: [], obstacles: [] };
    const STORAGE_KEY = 'guangboo_v2_nickname';
    const MODE_KEY = 'guangboo_v2_mode';
    const CHARACTER_KEY = 'guangboo_v2_character';
    const BOT_KEY = 'guangboo_v2_bots';
    const MAP_KEY = 'guangboo_v2_map';
    const HIDDEN_OFFICIAL_MAPS_KEY = 'guangboo_v2_hidden_official_maps';
    const EDITOR_TILE_SIZE = 40;
    const PROJECTILE_RANGE = 300;
    const DEFAULT_OFFICIAL_MAP_ID = 'official:crossroads';
    const OFFICIAL_MAPS = [
        { id: 'official:crossroads', name: '초원 교차로', summary: '가운데 벽을 활용해 견제하는 기본 정식 맵', description: '가운데에 짧은 벽들이 있어 숨고 빠지면서 싸우기 좋습니다. 처음 플레이하기 쉬운 균형형 맵입니다.', cols: 24, rows: 16, walls: [{ col: 10, row: 6 }, { col: 11, row: 6 }, { col: 12, row: 6 }, { col: 13, row: 6 }, { col: 10, row: 9 }, { col: 11, row: 9 }, { col: 12, row: 9 }, { col: 13, row: 9 }, { col: 6, row: 8 }, { col: 17, row: 8 }], spawns: [{ col: 4, row: 4 }, { col: 19, row: 11 }, { col: 4, row: 11 }, { col: 19, row: 4 }] },
        { id: 'official:maze', name: '돌담 미로', summary: '벽이 많아서 숨고 돌아가는 전투 맵', description: '긴 벽과 골목이 많아 직선 공격을 피하기 좋습니다. 아기슬라임도 길을 돌아가며 추격합니다.', cols: 24, rows: 16, walls: [{ col: 5, row: 3 }, { col: 5, row: 4 }, { col: 5, row: 5 }, { col: 5, row: 10 }, { col: 5, row: 11 }, { col: 5, row: 12 }, { col: 11, row: 5 }, { col: 12, row: 5 }, { col: 13, row: 5 }, { col: 10, row: 10 }, { col: 11, row: 10 }, { col: 12, row: 10 }, { col: 18, row: 3 }, { col: 18, row: 4 }, { col: 18, row: 11 }, { col: 18, row: 12 }], spawns: [{ col: 2, row: 2 }, { col: 21, row: 13 }, { col: 2, row: 13 }, { col: 21, row: 2 }] },
        { id: 'official:ring', name: '강철 링', summary: '가운데 링을 두고 도는 근접 난전 맵', description: '중앙을 둥글게 감싼 벽 때문에 빙글 돌며 싸우는 상황이 많이 나옵니다. 빈틈을 찾아 공격하세요.', cols: 24, rows: 16, walls: [{ col: 9, row: 5 }, { col: 10, row: 5 }, { col: 13, row: 5 }, { col: 14, row: 5 }, { col: 8, row: 6 }, { col: 15, row: 6 }, { col: 8, row: 9 }, { col: 15, row: 9 }, { col: 9, row: 10 }, { col: 10, row: 10 }, { col: 13, row: 10 }, { col: 14, row: 10 }], spawns: [{ col: 3, row: 7 }, { col: 20, row: 7 }, { col: 11, row: 2 }, { col: 12, row: 13 }] },
        { id: 'official:wide', name: '넓은 대평원', summary: '시야가 넓고 투사체 피하기가 중요한 맵', description: '벽이 적고 넓어서 이동과 조준 실력이 중요합니다. 멀리서 공격을 피하며 싸우기 좋습니다.', cols: 30, rows: 20, walls: [{ col: 8, row: 5 }, { col: 9, row: 5 }, { col: 20, row: 14 }, { col: 21, row: 14 }, { col: 14, row: 9 }, { col: 15, row: 9 }, { col: 14, row: 10 }, { col: 15, row: 10 }], spawns: [{ col: 3, row: 3 }, { col: 26, row: 16 }, { col: 3, row: 16 }, { col: 26, row: 3 }] }
    ];
    const CHARACTER_CARDS = [
        { key: 'monster', name: '기본 몬스터', summary: '강한 기본 공격과 레이저 궁극기', color: '#6ee7b7', accent: '#064e3b' },
        { key: 'slime', name: '슬라임', summary: '맞힌 횟수만큼 아기슬라임 소환', color: '#7ee65b', accent: '#167a34' }
    ];
    const PLAYER_MAX_HEALTH = 6000;

    const elements = {
        lobby: document.getElementById('lobbyScreen'),
        game: document.getElementById('gameScreen'),
        result: document.getElementById('resultScreen'),
        mapSelect: document.getElementById('mapSelectScreen'),
        characterSelect: document.getElementById('characterSelectScreen'),
        mapModeSetup: document.getElementById('mapModeSetupScreen'),
        mapNameSetup: document.getElementById('mapNameSetupScreen'),
        mapSavedInfo: document.getElementById('mapSavedInfoScreen'),
        editor: document.getElementById('mapEditorScreen'),
        joinForm: document.getElementById('joinForm'),
        nickname: document.getElementById('nicknameInput'),
        joinButton: document.getElementById('joinButton'),
        botToggle: document.getElementById('botToggle'),
        customMapSelect: document.getElementById('customMapSelect'),
        selectedMapCard: document.getElementById('selectedMapCard'),
        selectedMapMini: document.getElementById('selectedMapMini'),
        selectedMapName: document.getElementById('selectedMapName'),
        selectedMapSummary: document.getElementById('selectedMapSummary'),
        mapInfoButton: document.getElementById('mapInfoButton'),
        mapInfoModal: document.getElementById('mapInfoModal'),
        mapInfoMini: document.getElementById('mapInfoMini'),
        mapInfoTitle: document.getElementById('mapInfoTitle'),
        mapInfoDescription: document.getElementById('mapInfoDescription'),
        closeMapInfo: document.getElementById('closeMapInfoButton'),
        openMapSelect: document.getElementById('openMapSelectButton'),
        closeMapSelect: document.getElementById('closeMapSelectButton'),
        officialMapGrid: document.getElementById('officialMapGrid'),
        customMapList: document.getElementById('customMapList'),
        mapSelectEditor: document.getElementById('mapSelectEditorButton'),
        openCharacterSelect: document.getElementById('openCharacterSelectButton'),
        closeCharacterSelect: document.getElementById('closeCharacterSelectButton'),
        characterGrid: document.getElementById('characterGrid'),
        lobbyCharacterPreview: document.getElementById('lobbyCharacterPreview'),
        selectedCharacterName: document.getElementById('selectedCharacterName'),
        closeMapModeSetup: document.getElementById('closeMapModeSetupButton'),
        nextMapName: document.getElementById('nextMapNameButton'),
        backMapMode: document.getElementById('backMapModeButton'),
        nextMapEditor: document.getElementById('nextMapEditorButton'),
        backMapEditor: document.getElementById('backMapEditorButton'),
        mapSavedInfoStatus: document.getElementById('mapSavedInfoStatus'),
        closeMapEditor: document.getElementById('closeMapEditorButton'),
        mapEditorCanvas: document.getElementById('mapEditorCanvas'),
        mapName: document.getElementById('mapNameInput'),
        mapMode: document.getElementById('mapModeInput'),
        mapCols: document.getElementById('mapColsInput'),
        mapRows: document.getElementById('mapRowsInput'),
        applyMapSize: document.getElementById('applyMapSizeButton'),
        mapSummary: document.getElementById('mapSummaryInput'),
        publishMap: document.getElementById('publishMapButton'),
        mapEditorCanvasWrap: document.getElementById('mapEditorCanvasWrap'),
        saveMap: document.getElementById('saveMapButton'),
        mapEditorStatus: document.getElementById('mapEditorStatus'),
        mapTools: [...document.querySelectorAll('.map-tool')],
        status: document.getElementById('statusLine'),
        pixiHost: document.getElementById('pixiHost'),
        fullscreenEnter: document.getElementById('fullscreenEnterButton'),
        fullscreenExit: document.getElementById('fullscreenExitButton'),
        health: document.getElementById('healthReadout'),
        alive: document.getElementById('aliveReadout'),
        kills: document.getElementById('killReadout'),
        connection: document.getElementById('connectionHud'),
        leftStick: document.getElementById('leftStick'),
        rightStick: document.getElementById('rightStick'),
        ultimateButton: document.getElementById('ultimateButton'),
        ultimateReadout: document.getElementById('ultimateReadout'),
        queueFill: document.getElementById('queueFill'),
        queueCopy: document.getElementById('queueCopy'),
        leaderboard: document.getElementById('leaderboardList'),
        refreshBoard: document.getElementById('refreshBoardButton'),
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
            { key: 'survival', label: '정식 맵 전투', size: 4 }
        ],
        inputSeq: 0,
        queuedShots: [],
        queuedUltimate: false,
        projectileMemory: new Map(),
        audio: { context: null, unlocked: false, lastImpactAt: 0, lastFlyAt: 0, lastHealAt: 0, lastWallBreakAt: 0 },
        lastAim: { x: 1, y: 0 },
        mouseAim: { active: false, x: 1, y: 0 },
        leftStick: stickState(),
        rightStick: stickState(),
        customMaps: [],
        effects: [],
        effectMemory: new Set(),
        selectedMapId: DEFAULT_OFFICIAL_MAP_ID,
        editor: { cols: 24, rows: 16, tileSize: EDITOR_TILE_SIZE, walls: new Set(), bushes: new Set(), spawns: new Set(), enemySpawns: new Set(), tool: 'wall', editingId: null, editPassword: null, zoom: 1, pointers: new Map(), pinchStartDistance: 0, pinchStartZoom: 1, pinching: false, pinchBlockUntil: 0, dragPointerId: null, draggedCell: '', statusToken: null },
        fullscreenWanted: false,
        render: {
            app: null,
            ready: false,
            background: null,
            world: null,
            mapLayer: null,
            aimGuide: null,
            trailLayer: null,
            projectileLayer: null,
            summonLayer: null,
            effectLayer: null,
            playerLayer: null,
            players: new Map(),
            projectiles: new Map(),
            summons: new Map(),
            trails: new Map(),
            camera: { x: 0, y: 0, scale: 1, initialized: false }
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
        elements.mapSelect.hidden = name !== 'mapSelect';
        elements.characterSelect.hidden = name !== 'characterSelect';
        elements.mapModeSetup.hidden = name !== 'mapModeSetup';
        elements.mapNameSetup.hidden = name !== 'mapNameSetup';
        elements.mapSavedInfo.hidden = name !== 'mapSavedInfo';
        elements.editor.hidden = name !== 'editor';
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
        return mapMeta(selectedMapId()).mode || 'survival';
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

    function audioContext() {
        if (!state.audio.context) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;
            state.audio.context = new AudioCtx();
        }
        return state.audio.context;
    }

    function unlockAudio() {
        const context = audioContext();
        if (!context) return;
        if (context.state === 'suspended') context.resume().catch(() => {});
        state.audio.unlocked = true;
    }

    function playTone({ frequency = 440, endFrequency = frequency, duration = 0.12, volume = 0.04, type = 'sine', delay = 0 }) {
        if (!state.audio.unlocked) return;
        const context = audioContext();
        if (!context) return;
        const start = context.currentTime + delay;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.02);
    }

    function playShotSound() {
        playTone({ frequency: 780, endFrequency: 420, duration: 0.11, volume: 0.055, type: 'square' });
        playTone({ frequency: 1180, endFrequency: 720, duration: 0.07, volume: 0.025, type: 'sine', delay: 0.015 });
    }

    function playProjectileFlySound() {
        const now = performance.now();
        if (now - state.audio.lastFlyAt < 65) return;
        state.audio.lastFlyAt = now;
        playTone({ frequency: 260, endFrequency: 620, duration: 0.32, volume: 0.018, type: 'sawtooth' });
    }

    function playProjectileImpactSound() {
        const now = performance.now();
        if (now - state.audio.lastImpactAt < 45) return;
        state.audio.lastImpactAt = now;
        playTone({ frequency: 180, endFrequency: 70, duration: 0.12, volume: 0.06, type: 'triangle' });
        playTone({ frequency: 90, endFrequency: 45, duration: 0.08, volume: 0.035, type: 'square', delay: 0.018 });
    }

    function playWallBreakSound() {
        const now = performance.now();
        if (now - state.audio.lastWallBreakAt < 90) return;
        state.audio.lastWallBreakAt = now;
        playTone({ frequency: 150, endFrequency: 42, duration: 0.18, volume: 0.075, type: 'sawtooth' });
        playTone({ frequency: 620, endFrequency: 180, duration: 0.11, volume: 0.035, type: 'square', delay: 0.02 });
    }

    function playHealSound() {
        const now = performance.now();
        if (now - state.audio.lastHealAt < 420) return;
        state.audio.lastHealAt = now;
        playTone({ frequency: 420, endFrequency: 780, duration: 0.16, volume: 0.035, type: 'sine' });
        playTone({ frequency: 640, endFrequency: 960, duration: 0.14, volume: 0.025, type: 'triangle', delay: 0.06 });
    }

    function handleEffects(effects = []) {
        effects.forEach(effect => {
            if (!effect?.id || state.effectMemory.has(effect.id)) return;
            state.effectMemory.add(effect.id);
            if (state.effectMemory.size > 120) state.effectMemory = new Set([...state.effectMemory].slice(-80));
            if (effect.kind === 'wallBreak') { playWallBreakSound(); spawnWallBreakFragments(effect); }
            if (effect.kind === 'heal') playHealSound();
        });
    }

    function spawnWallBreakFragments(effect) {
        const x = Number(effect.x) || 0;
        const y = Number(effect.y) || 0;
        for (let index = 0; index < 12; index += 1) {
            const angle = (Math.PI * 2 * index) / 12 + Math.random() * 0.35;
            const speed = 80 + Math.random() * 150;
            state.effects.push({
                id: `${effect.id}-${index}`,
                kind: 'wallFragment',
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 4 + Math.random() * 7,
                age: 0,
                life: 520 + Math.random() * 220
            });
        }
    }

    function leaveQueue() {
        if (!state.joining) return;
        send({ type: 'leaveQueue' });
        state.joining = false;
        elements.joinButton.disabled = false;
        elements.joinButton.textContent = '플레이';
        elements.status.textContent = '매칭 취소됨';
        if (elements.queueCopy) elements.queueCopy.textContent = '정식 맵 전투';
        if (elements.queueFill) elements.queueFill.style.width = '0%';
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
        const mapId = selectedMapId();
        localStorage.setItem(STORAGE_KEY, nickname);
        localStorage.setItem(MODE_KEY, mode);
        localStorage.setItem(CHARACTER_KEY, character);
        localStorage.setItem(BOT_KEY, elements.botToggle.checked ? '1' : '0');
        localStorage.setItem(MAP_KEY, mapId);
        elements.joinButton.disabled = false;
        elements.joinButton.textContent = '매칭 취소';
        elements.status.textContent = '매칭 요청 중';
        if (elements.queueCopy) elements.queueCopy.textContent = `정식 맵 전투: 선택한 맵 ${mapMeta(mapId).name}`;
        if (elements.queueFill) elements.queueFill.style.width = '35%';
        state.joining = true;
        send({ type: 'joinQueue', nickname, mode, character, customMapId: isOfficialMapId(mapId) ? null : mapId, officialMapId: isOfficialMapId(mapId) ? mapId : null, fillWithBots: elements.botToggle.checked });
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
            if (elements.queueCopy) elements.queueCopy.textContent = `${message.modeLabel || message.mode}: ${message.playersWaiting}/${message.requiredPlayers} 대기 중 (총 ${message.requiredPlayers || 4}명)`;
            if (elements.queueFill) elements.queueFill.style.width = `${Math.max(8, Math.min(100, ((message.playersWaiting || 0) / (message.requiredPlayers || 4)) * 100))}%`;
            return;
        }
        if (message.type === 'queueLeft') {
            state.joining = false;
            elements.joinButton.disabled = false;
            elements.joinButton.textContent = '플레이';
            elements.status.textContent = '매칭 취소됨';
            if (elements.queueCopy) elements.queueCopy.textContent = '정식 맵 전투';
            if (elements.queueFill) elements.queueFill.style.width = '0%';
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
            state.projectileMemory.clear();
            state.render.camera.initialized = false;
            state.mapSignature = '';
            state.slimeTrails = [];
            state.summons = [];
            elements.joinButton.disabled = false;
            elements.joinButton.textContent = '플레이';
            elements.connection.textContent = message.modeLabel || '정식 맵 전투';
            setScreen('game');
            ensurePixi();
            updateHud();
            return;
        }
        if (message.type === 'state') {
            if (message.map) state.map = normalizeMap(message.map);
            state.players = message.players || [];
            state.projectiles = rememberAndFilterProjectiles(message.projectiles || []);
            state.slimeTrails = message.slimeTrails || [];
            state.summons = message.summons || [];
            handleEffects(message.effects || []);
            updateHud();
            return;
        }
        if (message.type === 'mapsChanged') {
            applyCustomMaps(message.maps || []);
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
        const bushes = Array.isArray(map.bushes) ? map.bushes : [];
        const obstacles = Array.isArray(map.obstacles) ? map.obstacles : walls.map(wall => ({ id: wall.id || `${wall.col},${wall.row}`, col: wall.col, row: wall.row, x: wall.col * tileSize + tileSize / 2, y: wall.row * tileSize + tileSize / 2, w: tileSize, h: tileSize }));
        return { ...map, width, height, tileSize, walls, bushes, obstacles };
    }

    function bushContainsPoint(map, x, y) {
        const tileSize = Number(map?.tileSize) || 40;
        return (map?.bushes || []).some(bush =>
            x >= bush.col * tileSize && x <= (bush.col + 1) * tileSize &&
            y >= bush.row * tileSize && y <= (bush.row + 1) * tileSize
        );
    }

    function isPlayerMostlyInsideBush(map, player) {
        const radius = 22;
        const samples = [[0, 0], [-radius, 0], [radius, 0], [0, -radius], [0, radius], [-radius * 0.7, -radius * 0.7], [radius * 0.7, -radius * 0.7], [-radius * 0.7, radius * 0.7], [radius * 0.7, radius * 0.7]];
        const covered = samples.filter(([dx, dy]) => bushContainsPoint(map, player.x + dx, player.y + dy)).length;
        return covered >= Math.ceil(samples.length / 2);
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
        state.render.aimGuide = new PIXI.Graphics();
        state.render.trailLayer = new PIXI.Container();
        state.render.projectileLayer = new PIXI.Container();
        state.render.summonLayer = new PIXI.Container();
        state.render.effectLayer = new PIXI.Graphics();
        state.render.playerLayer = new PIXI.Container();
        app.stage.addChild(state.render.background);
        app.stage.addChild(state.render.world);
        state.render.world.addChild(state.render.mapLayer);
        state.render.world.addChild(state.render.trailLayer);
        state.render.world.addChild(state.render.aimGuide);
        state.render.world.addChild(state.render.projectileLayer);
        state.render.world.addChild(state.render.summonLayer);
        state.render.world.addChild(state.render.effectLayer);
        state.render.world.addChild(state.render.playerLayer);
        app.ticker.add(tickRender);
        state.render.ready = true;
    }

    function tickRender(ticker) {
        const app = state.render.app;
        if (!app) return;
        const width = app.screen.width;
        const height = app.screen.height;
        drawBackground(width, height);
        drawStaticMapIfNeeded();
        syncCollection(state.render.trails, state.render.trailLayer, state.slimeTrails, trail => trail.id || `${trail.ownerId}:${trail.x}:${trail.y}`, createTrailGraphic, updateTrailGraphic);
        syncCollection(state.render.projectiles, state.render.projectileLayer, state.projectiles, item => item.id || `${item.ownerId}:${item.x}:${item.y}`, createProjectileGraphic, (entry, item) => updateProjectileGraphic(entry, item, ticker.deltaMS || 16.67));
        syncCollection(state.render.summons, state.render.summonLayer, state.summons, item => item.id, createSummonGraphic, (entry, item) => updateSummonGraphic(entry, item, ticker.deltaMS || 16.67));
        drawEffectParticles(ticker.deltaMS || 16.67);
        syncCollection(state.render.players, state.render.playerLayer, state.players, item => item.id, createPlayerGraphic, (entry, item) => updatePlayerGraphic(entry, item, ticker.deltaMS || 16.67));
        updateCamera(width, height, ticker.deltaMS || 16.67);
        drawAimGuide();
    }

    function drawBackground(width, height) {
        const g = state.render.background;
        g.clear();
        g.rect(0, 0, width, height).fill(0x0a1114);
        g.circle(width * 0.22, height * 0.2, Math.max(width, height) * 0.38).fill({ color: 0x173822, alpha: 0.34 });
        g.circle(width * 0.82, height * 0.28, Math.max(width, height) * 0.34).fill({ color: 0x17304f, alpha: 0.26 });
    }

    function updateCamera(screenW, screenH, deltaMS = 16.67) {
        const map = state.map || BASE_WORLD;
        const local = state.players.find(player => player.id === state.playerId && player.alive !== false);
        const localEntry = local ? state.render.players.get(local.id) : null;
        const followX = localEntry?.x ?? local?.x;
        const followY = localEntry?.y ?? local?.y;
        const fitScale = Math.min(screenW / map.width, screenH / map.height);
        const followScale = Math.min(screenW / BASE_WORLD.width, screenH / BASE_WORLD.height);
        const largeMap = map.width > BASE_WORLD.width || map.height > BASE_WORLD.height;
        const scale = largeMap && local ? followScale : fitScale;
        let targetX = largeMap && local ? screenW / 2 - followX * scale : (screenW - map.width * scale) / 2;
        let targetY = largeMap && local ? screenH / 2 - followY * scale : (screenH - map.height * scale) / 2;
        targetX = centeredClamp(targetX, screenW, map.width, scale);
        targetY = centeredClamp(targetY, screenH, map.height, scale);
        const camera = state.render.camera;
        if (!camera.initialized || Math.abs(camera.scale - scale) > 0.001) {
            camera.x = targetX;
            camera.y = targetY;
            camera.scale = scale;
            camera.initialized = true;
        } else {
            const alpha = 1 - Math.pow(0.001, Math.min(80, deltaMS) / 150);
            camera.x += (targetX - camera.x) * alpha;
            camera.y += (targetY - camera.y) * alpha;
            camera.scale += (scale - camera.scale) * alpha;
        }
        state.render.world.scale.set(camera.scale);
        state.render.world.position.set(Math.round(camera.x * 10) / 10, Math.round(camera.y * 10) / 10);
    }

    function centeredClamp(offset, screenSize, worldSize, scale) {
        const scaled = worldSize * scale;
        if (scaled <= screenSize) return (screenSize - scaled) / 2;
        return Math.max(screenSize - scaled, Math.min(0, offset));
    }

    function mapSignature(map = state.map) {
        return `${map.width}:${map.height}:${map.tileSize}:${(map.walls || []).map(w => `${w.col},${w.row}`).join('|')}:${(map.bushes || []).map(b => `${b.col},${b.row}`).join('|')}`;
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
        walls.forEach(rect => drawIsometricWall(g, rect));
        (map.bushes || []).forEach(bush => drawIsometricBush(g, bush.col * map.tileSize, bush.row * map.tileSize, map.tileSize));
    }

    const RIGHT_TOP_LIGHT_SHADOW = { x: -8, y: 10 };

    function drawIsometricWall(g, rect) {
        const x = rect.x - rect.w / 2;
        const y = rect.y - rect.h / 2;
        const lift = Math.max(8, rect.h * 0.28);
        const radius = Math.max(3, rect.w * 0.12);
        g.roundRect(x + RIGHT_TOP_LIGHT_SHADOW.x, y + RIGHT_TOP_LIGHT_SHADOW.y, rect.w, rect.h, radius).fill({ color: 0x07110a, alpha: 0.2 });
        g.rect(x, y + rect.h - lift, rect.w, lift).fill(0x5b3d1f);
        g.rect(x, y - lift, rect.w * 0.18, rect.h + lift).fill(0x6e4c26);
        g.roundRect(x, y - lift, rect.w, rect.h, radius).fill(0xa98248).stroke({ width: 1.5, color: 0x3a2813, alpha: 0.48 });
        g.roundRect(x + rect.w * 0.13, y - lift + rect.h * 0.12, rect.w * 0.7, rect.h * 0.22, radius * 0.8).fill({ color: 0xf3d18c, alpha: 0.22 });
        g.roundRect(x + rect.w * 0.58, y - lift + rect.h * 0.08, rect.w * 0.3, rect.h * 0.55, radius * 0.7).fill({ color: 0xffe0a0, alpha: 0.12 });
    }

    function drawIsometricBush(g, x, y, size) {
        const shadowX = x + size * 0.42 + RIGHT_TOP_LIGHT_SHADOW.x * 0.9;
        const shadowY = y + size * 0.7 + RIGHT_TOP_LIGHT_SHADOW.y * 0.8;
        g.ellipse(shadowX, shadowY, size * 0.52, size * 0.22).fill({ color: 0x06100a, alpha: 0.22 });
        g.circle(x + size * 0.34, y + size * 0.58, size * 0.31).fill({ color: 0x0d5f28, alpha: 0.92 });
        g.circle(x + size * 0.58, y + size * 0.6, size * 0.34).fill({ color: 0x137933, alpha: 0.92 });
        g.circle(x + size * 0.78, y + size * 0.5, size * 0.25).fill({ color: 0x0f6f2e, alpha: 0.9 });
        g.circle(x + size * 0.28, y + size * 0.36, size * 0.26).fill({ color: 0x1f9a43, alpha: 0.94 });
        g.circle(x + size * 0.52, y + size * 0.32, size * 0.33).fill({ color: 0x27b34d, alpha: 0.94 });
        g.circle(x + size * 0.72, y + size * 0.34, size * 0.25).fill({ color: 0x45d46d, alpha: 0.9 });
        g.circle(x + size * 0.66, y + size * 0.22, size * 0.18).fill({ color: 0xb7ff92, alpha: 0.22 });
        g.circle(x + size * 0.84, y + size * 0.28, size * 0.12).fill({ color: 0xffffff, alpha: 0.16 });
    }

    function drawEffectParticles(deltaMS) {
        const layer = state.render.effectLayer;
        if (!layer) return;
        layer.clear();
        state.effects = state.effects.filter(effect => {
            effect.age += deltaMS;
            if (effect.age >= effect.life) return false;
            const dt = deltaMS / 1000;
            effect.x += effect.vx * dt;
            effect.y += effect.vy * dt;
            effect.vy += 420 * dt;
            const alpha = 1 - effect.age / effect.life;
            layer.rect(effect.x - effect.size / 2, effect.y - effect.size / 2, effect.size, effect.size).fill({ color: 0x9b6a38, alpha });
            layer.rect(effect.x - effect.size / 2, effect.y - effect.size / 2, effect.size, effect.size).stroke({ width: 1, color: 0x3a2813, alpha: alpha * 0.75 });
            return true;
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

    function rememberAndFilterProjectiles(projectiles) {
        const activeIds = new Set(projectiles.map(projectile => projectile.id).filter(Boolean));
        for (const id of state.projectileMemory.keys()) {
            if (!activeIds.has(id)) {
                playProjectileImpactSound();
                state.projectileMemory.delete(id);
            }
        }
        return projectiles.filter(projectile => {
            if (!projectile.id) return isProjectileWithinRange(projectile);
            let memory = state.projectileMemory.get(projectile.id);
            if (!memory) {
                memory = {
                    startX: Number.isFinite(projectile.startX) ? projectile.startX : projectile.x,
                    startY: Number.isFinite(projectile.startY) ? projectile.startY : projectile.y,
                    firstSeenAt: performance.now()
                };
                state.projectileMemory.set(projectile.id, memory);
                playShotSound();
                playProjectileFlySound();
            }
            projectile.startX = Number.isFinite(projectile.startX) ? projectile.startX : memory.startX;
            projectile.startY = Number.isFinite(projectile.startY) ? projectile.startY : memory.startY;
            projectile.maxDistance = Number.isFinite(projectile.maxDistance) ? projectile.maxDistance : PROJECTILE_RANGE;
            const visible = projectile.kind === 'ultimate'
                ? Number(projectile.health) > 0
                : isProjectileWithinRange(projectile) && performance.now() - memory.firstSeenAt < 1400;
            if (!visible) {
                playProjectileImpactSound();
                state.projectileMemory.delete(projectile.id);
            }
            return visible;
        });
    }

    function isProjectileWithinRange(projectile) {
        const maxDistance = Number(projectile.maxDistance) || PROJECTILE_RANGE;
        if (Number.isFinite(projectile.traveled) && projectile.traveled > maxDistance) return false;
        if (Number.isFinite(projectile.startX) && Number.isFinite(projectile.startY)) {
            const distance = Math.hypot(projectile.x - projectile.startX, projectile.y - projectile.startY);
            if (distance > maxDistance + 8) return false;
        }
        if (Number.isFinite(projectile.targetX) && Number.isFinite(projectile.targetY)) {
            const startDistance = Math.hypot(projectile.x - projectile.startX, projectile.y - projectile.startY);
            const targetDistance = Math.hypot(projectile.targetX - projectile.startX, projectile.targetY - projectile.startY) || maxDistance;
            return startDistance <= targetDistance + 8;
        }
        return true;
    }

    function createHudHealth() {
        const hud = new PIXI.Container();
        const healthBar = new PIXI.Graphics();
        const healthText = new PIXI.Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontSize: 10, fontWeight: '900', fill: 0xfffdf8, stroke: { color: 0x000000, width: 2 }, align: 'center' } });
        healthText.anchor.set(0.5, 0.5);
        hud.addChild(healthBar, healthText);
        return { hud, healthBar, healthText };
    }

    function drawWorldHealthBar(healthBar, healthText, health, maxHealth, y) {
        const radius = 22;
        const ratio = Math.max(0, Math.min(1, health / Math.max(1, maxHealth)));
        const barW = radius * 3.36;
        const barH = radius * 0.68;
        const inset = radius * 0.09;
        healthBar.clear();
        healthBar.roundRect(-barW / 2, y, barW, barH, barH / 2).fill({ color: 0x080d0a, alpha: 0.82 });
        healthBar.roundRect(-barW / 2 + inset, y + inset, Math.max(0, (barW - inset * 2) * ratio), Math.max(1, barH - inset * 2), barH / 2).fill(ratio <= 0.32 ? 0xe05252 : 0xd7f252);
        healthBar.roundRect(-barW / 2 + 0.5, y + 0.5, barW - 1, barH - 1, barH / 2).stroke({ width: 1, color: 0xffffff, alpha: 0.72 });
        healthText.text = String(Math.max(0, Math.round(health)));
        healthText.position.set(0, y + barH / 2);
    }

    function createProjectileGraphic(projectile) {
        const node = new PIXI.Container();
        const body = new PIXI.Graphics();
        const hud = createHudHealth();
        node.addChild(body, hud.hud);
        return { node, body, hud: hud.hud, healthBar: hud.healthBar, healthText: hud.healthText, x: projectile.x, y: projectile.y };
    }
    function updateProjectileGraphic(entry, projectile, deltaMS) {
        const radius = Number(projectile.radius) || 8;
        const color = projectile.kind === 'ultimate' ? 0xf6c84f : projectile.kind === 'slime' ? 0x70f45e : 0xfff7a5;
        smoothPosition(entry, projectile, deltaMS);
        entry.body.clear();
        entry.body.circle(0, 0, radius + 6).fill({ color, alpha: projectile.kind === 'ultimate' ? 0.18 : 0.12 });
        entry.body.circle(0, 0, radius).fill(color);
        if (projectile.kind === 'ultimate') entry.body.circle(0, 0, radius + 2).stroke({ width: 3, color: 0xffffff, alpha: 0.45 });
        const showHealth = projectile.kind === 'ultimate' && Number.isFinite(Number(projectile.health));
        entry.hud.visible = showHealth;
        if (showHealth) drawWorldHealthBar(entry.healthBar, entry.healthText, Number(projectile.health) || 0, Number(projectile.maxHealth) || 3000, -radius - 30);
    }

    function createSummonGraphic(summon) {
        const node = new PIXI.Container();
        const body = new PIXI.Graphics();
        const hud = createHudHealth();
        node.addChild(body, hud.hud);
        return { node, body, hud: hud.hud, healthBar: hud.healthBar, healthText: hud.healthText, x: summon.x, y: summon.y };
    }
    function updateSummonGraphic(entry, summon, deltaMS) {
        smoothPosition(entry, summon, deltaMS);
        const radius = Number(summon.radius) || 14;
        const health = Math.max(0, Math.round(Number(summon.health) || 0));
        const ratio = Math.max(0, Math.min(1, health / (Number(summon.maxHealth) || 500)));
        const facingX = summon.facingX ?? summon.facing?.x ?? 1;
        const facingY = summon.facingY ?? summon.facing?.y ?? 0;
        const facingLength = Math.hypot(facingX, facingY) || 1;
        entry.body.clear();
        entry.body.rotation = Math.atan2(facingY / facingLength, facingX / facingLength);
        entry.body.ellipse(0, 0, radius * 1.15, radius * 0.92).fill(summon.ownerId === state.playerId ? 0x9dff76 : 0x4ade80);
        entry.body.circle(radius * 0.25, -radius * 0.18, radius * 0.12).fill(0x12351d);
        entry.body.circle(radius * 0.25, radius * 0.18, radius * 0.12).fill(0x12351d);
        drawWorldHealthBar(entry.healthBar, entry.healthText, health, Number(summon.maxHealth) || 500, -radius - 30);
    }

    function createPlayerGraphic(player) {
        const node = new PIXI.Container();
        const shadow = new PIXI.Graphics();
        const body = new PIXI.Graphics();
        const hud = new PIXI.Container();
        const nameBg = new PIXI.Graphics();
        const name = new PIXI.Text({ text: player.nickname || 'Monster', style: { fontFamily: 'system-ui, sans-serif', fontSize: 12, fontWeight: '700', fill: 0xf8fff4, align: 'center' } });
        name.anchor.set(0.5, 0.5);
        const healthBar = new PIXI.Graphics();
        const healthText = new PIXI.Text({ text: '', style: { fontFamily: 'system-ui, sans-serif', fontSize: 10, fontWeight: '900', fill: 0xfffdf8, stroke: { color: 0x000000, width: 2 }, align: 'center' } });
        healthText.anchor.set(0.5, 0.5);
        const ammoBar = new PIXI.Graphics();
        hud.addChild(nameBg, name, healthBar, healthText, ammoBar);
        node.addChild(shadow, body, hud);
        return { node, shadow, body, hud, nameBg, name, healthBar, healthText, ammoBar, x: player.x, y: player.y, walkTime: 0, lastMoveX: player.x, lastMoveY: player.y };
    }

    function drawWalkingLegs(graphic, radius, accent, walkCycle, moving) {
        const stride = moving ? Math.sin(walkCycle) : 0;
        const lift = moving ? Math.abs(Math.cos(walkCycle)) : 0;
        const nearFootX = radius * (-0.14 + stride * 0.22);
        const farFootX = radius * (0.42 - stride * 0.16);
        const footY = radius * 0.92;
        graphic.roundRect(farFootX - radius * 0.18, footY - radius * 0.58, radius * 0.36, radius * 0.72, radius * 0.12).fill({ color: accent, alpha: 0.72 });
        graphic.roundRect(nearFootX - radius * 0.2, footY - radius * 0.64 - lift * radius * 0.08, radius * 0.4, radius * 0.82, radius * 0.12).fill({ color: accent, alpha: 0.96 });
        graphic.ellipse(farFootX + radius * 0.08, footY + radius * 0.12, radius * 0.34, radius * 0.16).fill({ color: 0x0b130d, alpha: 0.24 });
        graphic.ellipse(nearFootX - radius * 0.02, footY + radius * 0.17, radius * 0.42, radius * 0.17).fill({ color: 0x0b130d, alpha: 0.3 });
    }

    function drawSideViewCharacter(graphic, radius, color, accent, character, walkCycle, moving) {
        const lean = moving ? Math.sin(walkCycle) * radius * 0.05 : 0;
        drawWalkingLegs(graphic, radius, accent, walkCycle, moving);
        graphic.ellipse(0, radius * 0.08 + lean, radius * 0.78, radius * 0.95).fill({ color: 0x06100a, alpha: 0.18 });
        graphic.roundRect(-radius * 0.62, -radius * 0.64 + lean, radius * 1.3, radius * 1.55, radius * 0.44).fill(color);
        graphic.roundRect(radius * 0.2, -radius * 0.58 + lean, radius * 0.48, radius * 1.36, radius * 0.28).fill({ color: accent, alpha: 0.18 });
        graphic.ellipse(-radius * 0.28, -radius * 0.46 + lean, radius * 0.42, radius * 0.24).fill({ color: 0xffffff, alpha: character === 'slime' ? 0.3 : 0.22 });
        graphic.circle(radius * 0.06, -radius * 1.02 + lean, radius * 0.64).fill(color);
        graphic.circle(radius * 0.28, -radius * 1.16 + lean, radius * 0.34).fill({ color: 0xffffff, alpha: 0.16 });
        graphic.circle(radius * 0.26, -radius * 1.02 + lean, radius * 0.16).fill(0xfffdf8);
        graphic.circle(radius * 0.33, -radius * 1.01 + lean, radius * 0.07).fill(0x141a12);
        graphic.roundRect(radius * 0.4, -radius * 0.24 + lean, radius * 0.76, radius * 0.28, radius * 0.14).fill(accent);
        graphic.circle(radius * 1.16, -radius * 0.1 + lean, radius * 0.16).fill({ color: 0xffffff, alpha: 0.26 });
        if (character === 'slime') {
            graphic.ellipse(-radius * 0.1, -radius * 1.28 + lean, radius * 0.42, radius * 0.16).fill({ color: 0xb7ff92, alpha: 0.28 });
        }
    }

    function updatePlayerGraphic(entry, player, deltaMS) {
        const previousX = entry.x;
        const previousY = entry.y;
        smoothPosition(entry, player, deltaMS);
        const radius = 22;
        const movedDistance = Math.hypot(entry.x - previousX, entry.y - previousY);
        const moving = player.alive !== false && (movedDistance > 0.05 || Math.hypot(player.x - (entry.lastMoveX ?? player.x), player.y - (entry.lastMoveY ?? player.y)) > 0.2);
        entry.walkTime = moving ? (entry.walkTime || 0) + deltaMS * 0.018 : (entry.walkTime || 0) * 0.72;
        entry.lastMoveX = player.x;
        entry.lastMoveY = player.y;
        const bob = moving ? Math.sin(entry.walkTime * 2) * radius * 0.08 : 0;
        const facingX = player.facingX ?? player.facing?.x ?? player.aimX ?? player.aim?.x ?? 1;
        const facingY = player.facingY ?? player.facing?.y ?? player.aimY ?? player.aim?.y ?? 0;
        const facingLength = Math.hypot(facingX, facingY) || 1;
        const angle = Math.atan2(facingY / facingLength, facingX / facingLength);
        const color = player.character === 'slime' ? 0x7ee65b : parseHex(player.monster?.color, 0x6ee7b7);
        const accent = player.character === 'slime' ? 0x167a34 : parseHex(player.monster?.accent, 0x064e3b);
        const health = Math.max(0, Math.round(Number(player.health) || 0));
        const maxHealth = Number(player.maxHealth) || PLAYER_MAX_HEALTH;
        const ratio = Math.max(0, Math.min(1, health / maxHealth));
        entry.node.alpha = player.alive ? (player.id === state.playerId && isPlayerMostlyInsideBush(state.map, player) ? 0.48 : 1) : 0.36;
        entry.shadow.clear();
        entry.shadow.ellipse(RIGHT_TOP_LIGHT_SHADOW.x * 0.85, radius * 0.86 + RIGHT_TOP_LIGHT_SHADOW.y * 0.55, radius * (1.12 + (moving ? 0.06 : 0)), radius * 0.36).fill({ color: 0x06100a, alpha: player.alive ? 0.3 : 0.16 });
        entry.body.clear();
        entry.body.rotation = angle;
        entry.body.position.set(0, bob);
        if (player.id === state.playerId) entry.body.ellipse(0, radius * 0.02, radius + 10, radius * 1.5).stroke({ width: 3, color: 0xd7f252, alpha: 0.82 });
        drawSideViewCharacter(entry.body, radius, color, accent, player.character, entry.walkTime, moving);

        const nameText = player.nickname || 'Monster';
        const nameW = Math.min(radius * 5.64, nameText.length * 7 + radius * 0.82);
        const nameH = radius * 0.91;
        const nameY = -radius * 3.64;
        entry.name.text = nameText;
        entry.name.position.set(0, nameY);
        entry.nameBg.clear();
        entry.nameBg.roundRect(-nameW / 2, nameY - nameH / 2 - radius * 0.14, nameW, nameH, radius * 0.36).fill({ color: 0x080d0a, alpha: 0.72 });

        const barW = radius * 3.36;
        const barH = radius * 0.68;
        const inset = radius * 0.09;
        const barY = -radius * 2.64;
        entry.healthBar.clear();
        entry.healthBar.roundRect(-barW / 2, barY, barW, barH, barH / 2).fill({ color: 0x080d0a, alpha: 0.82 });
        entry.healthBar.roundRect(-barW / 2 + inset, barY + inset, Math.max(0, (barW - inset * 2) * ratio), Math.max(1, barH - inset * 2), barH / 2).fill(ratio <= 0.32 ? 0xe05252 : 0xd7f252);
        entry.healthBar.roundRect(-barW / 2 + 0.5, barY + 0.5, barW - 1, barH - 1, barH / 2).stroke({ width: 1, color: 0xffffff, alpha: 0.72 });
        entry.healthText.text = String(health);
        entry.healthText.position.set(0, barY + barH / 2);
        entry.ammoBar.clear();
        const maxAmmo = Number(player.maxAmmo) || 3;
        const ammo = Math.max(0, Math.min(maxAmmo, Math.floor(Number(player.ammo) || 0)));
        const gap = 3;
        const cellW = (barW - gap * (maxAmmo - 1)) / maxAmmo;
        const cellH = 6;
        const ammoY = barY + barH + 4;
        for (let i = 0; i < maxAmmo; i += 1) {
            const x = -barW / 2 + i * (cellW + gap);
            entry.ammoBar.roundRect(x, ammoY, cellW, cellH, 2).fill(i < ammo ? 0xd7f252 : { color: 0xffffff, alpha: 0.18 }).stroke({ width: 1, color: 0x080d0a, alpha: 0.72 });
        }
    }

    function isAttackControlActive() {
        return (state.rightStick.active && state.rightStick.moved && Math.hypot(state.rightStick.x, state.rightStick.y) > 0.08) || state.mouseAim.active;
    }

    function drawAimGuide() {
        const guide = state.render.aimGuide;
        if (!guide) return;
        guide.clear();
        const me = state.players.find(player => player.id === state.playerId);
        if (!me || !me.alive || !isAttackControlActive()) return;
        const localEntry = state.render.players.get(me.id);
        const originX = localEntry?.x ?? me.x;
        const originY = localEntry?.y ?? me.y;
        const aim = currentAim();
        const startX = originX + aim.x * 34;
        const startY = originY + aim.y * 34;
        const endX = originX + aim.x * 300;
        const endY = originY + aim.y * 300;
        guide.moveTo(startX, startY).lineTo(endX, endY).stroke({ width: 18, color: 0xffffff, alpha: 0.18, cap: 'round' });
        guide.moveTo(startX, startY).lineTo(endX, endY).stroke({ width: 10, color: 0xd7f252, alpha: 0.34, cap: 'round' });
        guide.circle(endX, endY, 10).stroke({ width: 4, color: 0xd7f252, alpha: 0.48 });
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
        if (state.leftStick.active) {
            const length = Math.hypot(state.leftStick.x, state.leftStick.y);
            return length > 0.08 ? { x: state.leftStick.x / length, y: state.leftStick.y / length } : { x: 0, y: 0 };
        }
        return clampUnit({ x: (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0), y: (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) });
    }
    function currentAim() {
        if (state.rightStick.active && Math.hypot(state.rightStick.x, state.rightStick.y) > 0.08) return normalizeAim(state.rightStick);
        if (state.mouseAim.active) return normalizeAim(state.mouseAim);
        if (state.queuedShots.length) return normalizeAim(state.queuedShots[0]);
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
        unlockAudio();
        const normalized = normalizeAim(aim);
        state.lastAim = normalized;
        state.queuedShots.push(normalized);
        if (state.matchActive) send(currentInput());
    }
    function fireUltimate() {
        unlockAudio();
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
        const floatingClass = isRight ? 'right-stick-floating' : 'left-stick-floating';

        function isPointerForThisStick(event) {
            return stick.active && stick.pointerId === event.pointerId;
        }

        function clampCenter(clientX, clientY) {
            const screen = elements.game.getBoundingClientRect();
            const size = Math.min(element.offsetWidth || 120, element.offsetHeight || 120);
            const half = size / 2;
            return {
                x: Math.max(screen.left + half + 8, Math.min(screen.right - half - 8, clientX)),
                y: Math.max(screen.top + half + 8, Math.min(screen.bottom - half - 8, clientY))
            };
        }

        function moveStickBase(clientX, clientY) {
            const center = clampCenter(clientX, clientY);
            stick.centerX = center.x;
            stick.centerY = center.y;
            element.classList.add('is-floating-stick', floatingClass);
            element.style.left = `${center.x}px`;
            element.style.top = `${center.y}px`;
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        }

        function update(event) {
            if (!isPointerForThisStick(event)) return;
            const rect = element.getBoundingClientRect();
            const cx = stick.centerX || rect.left + rect.width / 2;
            const cy = stick.centerY || rect.top + rect.height / 2;
            const limit = rect.width * 0.34;
            const dx = event.clientX - cx;
            const dy = event.clientY - cy;
            const length = Math.hypot(dx, dy);
            if (Math.hypot(event.clientX - (stick.startX || event.clientX), event.clientY - (stick.startY || event.clientY)) > 12) stick.moved = true;
            if (isRight && !stick.moved) {
                stick.x = 0;
                stick.y = 0;
                thumb.style.transform = 'translate(-50%, -50%)';
                return;
            }
            const nx = length > 3 ? dx / length : 0;
            const ny = length > 3 ? dy / length : 0;
            const clamped = length > 3 ? Math.min(limit, length) : 0;
            stick.x = nx * (clamped / limit);
            stick.y = ny * (clamped / limit);
            thumb.style.transform = `translate(calc(-50% + ${nx * clamped}px), calc(-50% + ${ny * clamped}px))`;
            if (isRight && length > 3) state.lastAim = normalizeAim({ x: nx, y: ny });
        }

        function begin(event) {
            if (!state.matchActive || stick.active) return;
            event.preventDefault();
            stick.active = true;
            stick.pointerId = event.pointerId;
            stick.startX = event.clientX;
            stick.startY = event.clientY;
            stick.moved = false;
            stick.shotQueued = false;
            moveStickBase(event.clientX, event.clientY);
            unlockAudio();
            elements.game.setPointerCapture?.(event.pointerId);
            update(event);
        }

        function releasePointerCapture(pointerId) {
            if (elements.game.releasePointerCapture && elements.game.hasPointerCapture?.(pointerId)) elements.game.releasePointerCapture(pointerId);
        }

        function shotAimForRelease() {
            if (!isRight) return null;
            if (!stick.moved) return nearestOpponentAim() || state.lastAim;
            if (Math.hypot(stick.x, stick.y) > 0.08) return stick;
            return nearestOpponentAim() || state.lastAim;
        }

        function finish(event) {
            if (!isPointerForThisStick(event)) return;
            event.preventDefault();
            if (isRight && !stick.shotQueued) {
                stick.shotQueued = true;
                queueShot(shotAimForRelease());
            }
            releasePointerCapture(event.pointerId);
            resetStick(name);
        }

        function shouldStartFromHalf(event) {
            if (!state.matchActive || event.pointerType !== 'touch') return false;
            if (event.target.closest?.('button, input, label, fieldset, .hud')) return false;
            const screen = elements.game.getBoundingClientRect();
            const midpoint = screen.left + screen.width / 2;
            return isRight ? event.clientX >= midpoint : event.clientX < midpoint;
        }

        elements.game.addEventListener('pointerdown', event => { if (shouldStartFromHalf(event)) begin(event); });
        element.addEventListener('pointerdown', event => { if (event.pointerType !== 'touch') begin(event); });
        elements.game.addEventListener('pointermove', event => { if (isPointerForThisStick(event)) { event.preventDefault(); update(event); } });
        window.addEventListener('pointerup', finish, { capture: true });
        window.addEventListener('pointercancel', finish, { capture: true });
        elements.game.addEventListener('lostpointercapture', finish);
        element.addEventListener('contextmenu', event => event.preventDefault());
        element.addEventListener('selectstart', event => event.preventDefault());
    }
    function resetStick(name) {
        const stick = state[name];
        stick.active = false; stick.pointerId = null; stick.x = 0; stick.y = 0;
        stick.centerX = 0; stick.centerY = 0; stick.startX = 0; stick.startY = 0; stick.moved = false; stick.shotQueued = false;
        const element = elements[name];
        element?.classList.remove('is-floating-stick', name === 'rightStick' ? 'right-stick-floating' : 'left-stick-floating');
        if (element) { element.style.left = ''; element.style.top = ''; element.style.right = ''; element.style.bottom = ''; }
        element?.querySelector('.stick-thumb')?.style.setProperty('transform', 'translate(-50%, -50%)');
    }

    function nearestOpponentAim() {
        const me = state.players.find(player => player.id === state.playerId && player.alive !== false);
        if (!me) return state.lastAim;
        const nearest = state.players.filter(player => player.id !== state.playerId && player.alive !== false).sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        return nearest ? normalizeAim({ x: nearest.x - me.x, y: nearest.y - me.y }) : null;
    }
    function updateMouseAim(event) {
        const app = state.render.app;
        const me = state.players.find(player => player.id === state.playerId);
        if (!app || !me) return;
        const rect = app.canvas.getBoundingClientRect();
        const scaleX = app.screen.width / Math.max(1, rect.width);
        const scaleY = app.screen.height / Math.max(1, rect.height);
        const screenX = (event.clientX - rect.left) * scaleX;
        const screenY = (event.clientY - rect.top) * scaleY;
        const worldX = (screenX - state.render.world.position.x) / state.render.world.scale.x;
        const worldY = (screenY - state.render.world.position.y) / state.render.world.scale.y;
        const aim = normalizeAim({ x: worldX - me.x, y: worldY - me.y });
        state.mouseAim = { active: true, ...aim };
        state.lastAim = aim;
    }

    function isOfficialMapId(id) {
        return String(id || '').startsWith('official:');
    }

    function selectedMapId() {
        return state.selectedMapId || localStorage.getItem(MAP_KEY) || DEFAULT_OFFICIAL_MAP_ID;
    }

    function hiddenOfficialMapIds() {
        try {
            const value = JSON.parse(localStorage.getItem(HIDDEN_OFFICIAL_MAPS_KEY) || '[]');
            return new Set(Array.isArray(value) ? value : []);
        } catch {
            return new Set();
        }
    }

    function visibleOfficialMaps() {
        const hidden = hiddenOfficialMapIds();
        return OFFICIAL_MAPS.filter(map => !hidden.has(map.id));
    }

    function mapMeta(id = selectedMapId()) {
        if (isOfficialMapId(id)) {
            return OFFICIAL_MAPS.find(map => map.id === id) || OFFICIAL_MAPS[0];
        }
        const custom = state.customMaps.find(map => map.id === id);
        if (custom) {
            const cols = Math.max(8, Math.round(custom.width / (custom.tileSize || EDITOR_TILE_SIZE)));
            const rows = Math.max(8, Math.round(custom.height / (custom.tileSize || EDITOR_TILE_SIZE)));
            const data = custom.map || custom.data || {};
            return { id: custom.id, name: custom.name, summary: custom.summary || data.summary || '정식 맵', description: custom.summary || data.summary || `${cols}x${rows} 정식 맵입니다.`, cols, rows, walls: data.walls || custom.walls || [], bushes: data.bushes || custom.bushes || [], spawns: data.spawnPoints || custom.spawnPoints || [], mode: custom.mode || data.mode || 'survival' };
        }
        return OFFICIAL_MAPS[0];
    }

    function selectMap(id) {
        state.selectedMapId = id || DEFAULT_OFFICIAL_MAP_ID;
        localStorage.setItem(MAP_KEY, state.selectedMapId);
        elements.customMapSelect.value = state.selectedMapId;
        renderSelectedMapCard();
        renderOfficialMapGrid();
        renderCustomMapList();
        setScreen('lobby');
    }

    function drawCanvasBush(ctx, x, y, size) {
        ctx.fillStyle = '#0f6f2e';
        ctx.fillRect(x, y, size, size);
        ctx.fillStyle = '#2fbf5b';
        ctx.beginPath(); ctx.arc(x + size * 0.24, y + size * 0.3, size * 0.24, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + size * 0.58, y + size * 0.42, size * 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#145c2b';
        ctx.beginPath(); ctx.arc(x + size * 0.78, y + size * 0.7, size * 0.28, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath(); ctx.arc(x + size * 0.38, y + size * 0.72, size * 0.18, 0, Math.PI * 2); ctx.fill();
    }

    function drawMiniMap(canvas, map) {
        if (!canvas || !map) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#12351f';
        ctx.fillRect(0, 0, width, height);
        const cols = Math.max(1, map.cols || 24);
        const rows = Math.max(1, map.rows || 16);
        const scale = Math.min(width / cols, height / rows);
        const offsetX = (width - cols * scale) / 2;
        const offsetY = (height - rows * scale) / 2;
        ctx.fillStyle = '#1f7a3a';
        ctx.fillRect(offsetX, offsetY, cols * scale, rows * scale);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        for (let col = 0; col <= cols; col += 1) {
            ctx.beginPath(); ctx.moveTo(offsetX + col * scale, offsetY); ctx.lineTo(offsetX + col * scale, offsetY + rows * scale); ctx.stroke();
        }
        for (let row = 0; row <= rows; row += 1) {
            ctx.beginPath(); ctx.moveTo(offsetX, offsetY + row * scale); ctx.lineTo(offsetX + cols * scale, offsetY + row * scale); ctx.stroke();
        }
        ctx.fillStyle = '#8b5e34';
        (map.walls || []).forEach(wall => ctx.fillRect(offsetX + wall.col * scale, offsetY + wall.row * scale, scale, scale));
        (map.bushes || []).forEach(bush => drawCanvasBush(ctx, offsetX + bush.col * scale, offsetY + bush.row * scale, scale));
        (map.spawns || []).forEach(spawn => {
            ctx.fillStyle = spawn.team === 'enemy' ? '#ef4444' : '#f8fb7b';
            ctx.beginPath();
            ctx.arc(offsetX + (Number(spawn.col) + 0.5) * scale, offsetY + (Number(spawn.row) + 0.5) * scale, Math.max(3, scale * 0.25), 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function renderSelectedMapCard() {
        const map = mapMeta();
        elements.selectedMapName.textContent = map.name;
        elements.selectedMapSummary.textContent = '';
        drawMiniMap(elements.selectedMapMini, map);
    }

    function renderOfficialMapGrid() {
        elements.officialMapGrid.innerHTML = '';
        visibleOfficialMaps().forEach(map => {
            const card = document.createElement('div');
            card.className = 'map-choice-card-shell';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'map-choice-card';
            button.classList.toggle('is-selected', selectedMapId() === map.id);
            button.innerHTML = `<canvas width="180" height="115" aria-hidden="true"></canvas><strong>${escapeHtml(map.name)}</strong>`;
            drawMiniMap(button.querySelector('canvas'), map);
            button.addEventListener('click', () => selectMap(map.id));
            const actions = document.createElement('div');
            actions.className = 'map-choice-actions';
            const info = document.createElement('button');
            info.type = 'button';
            info.className = 'ghost-button';
            info.textContent = 'i';
            info.addEventListener('click', () => openMapInfo(map.id));
            const edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'ghost-button';
            edit.textContent = '수정';
            edit.addEventListener('click', () => requestEditMap(map.id));
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'ghost-button';
            del.textContent = '삭제';
            del.addEventListener('click', event => { event.stopPropagation(); deleteOfficialMap(map.id); });
            actions.append(info, edit, del);
            card.append(button, actions);
            elements.officialMapGrid.appendChild(card);
        });
    }

    function renderCustomMapList() {
        elements.customMapList.innerHTML = '';
        state.customMaps.forEach(map => {
            const meta = mapMeta(map.id);
            const card = document.createElement('div');
            card.className = 'map-choice-card-shell';
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'map-choice-card custom-map-choice';
            button.classList.toggle('is-selected', selectedMapId() === map.id);
            button.innerHTML = `<canvas width="180" height="115" aria-hidden="true"></canvas><strong>${escapeHtml(meta.name)}</strong>`;
            drawMiniMap(button.querySelector('canvas'), meta);
            button.addEventListener('click', () => selectMap(map.id));
            const actions = document.createElement('div');
            actions.className = 'map-choice-actions';
            const info = document.createElement('button');
            info.type = 'button';
            info.className = 'ghost-button';
            info.textContent = 'i';
            info.addEventListener('click', event => { event.stopPropagation(); openMapInfo(map.id); });
            const edit = document.createElement('button');
            edit.type = 'button';
            edit.className = 'ghost-button';
            edit.textContent = '수정';
            edit.addEventListener('click', () => requestEditMap(map.id));
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'ghost-button';
            del.textContent = '삭제';
            del.addEventListener('click', () => deleteCustomMap(map.id));
            actions.append(info, edit, del);
            card.append(button, actions);
            elements.customMapList.appendChild(card);
        });
    }

    function openMapSelect() {
        renderOfficialMapGrid();
        renderCustomMapList();
        setScreen('mapSelect');
    }
    function closeMapSelect() { setScreen('lobby'); }

    function openMapInfo(id = selectedMapId()) {
        const map = mapMeta(id);
        elements.mapInfoTitle.textContent = map.name;
        elements.mapInfoDescription.textContent = `${map.summary || '정식 맵'} · ${map.description || ''}`;
        drawMiniMap(elements.mapInfoMini, map);
        elements.mapInfoModal.hidden = false;
    }
    function closeMapInfo() { elements.mapInfoModal.hidden = true; }

    async function enterFullscreenMode() {
        state.fullscreenWanted = true;
        document.body.classList.add('is-app-fullscreen');
        try {
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
        } catch {}
        window.scrollTo(0, 1);
    }

    async function exitFullscreenMode() {
        state.fullscreenWanted = false;
        document.body.classList.remove('is-app-fullscreen');
        try {
            if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
        } catch {}
    }

    function renderLobbyCharacter() {
        const character = selectedCharacter();
        const card = CHARACTER_CARDS.find(item => item.key === character) || CHARACTER_CARDS[0];
        elements.selectedCharacterName.textContent = card.name;
        elements.lobbyCharacterPreview.classList.toggle('is-slime', character === 'slime');
    }

    function requireMapPassword(message = '비밀번호를 입력하세요.') {
        const password = window.prompt(message);
        if (password === null) return null;
        if (String(password).trim() !== '1183') {
            window.alert('비밀번호가 틀렸습니다.');
            return null;
        }
        return String(password).trim();
    }

    function openMapModeSetup() {
        state.editor.editingId = null;
        state.editor.zoom = 1;
        elements.mapMode.value = 'survival';
        elements.mapName.value = '';
        elements.mapSummary.value = '';
        setScreen('mapModeSetup');
    }

    function openMapNameSetup() {
        setScreen('mapNameSetup');
        elements.mapName.focus();
    }

    function requestEditMap(id) {
        const password = requireMapPassword('맵을 수정하려면 비밀번호를 입력하세요.');
        if (!password) return;
        openMapEditor(id, { password });
    }

    function renderCharacterSelectScreen() {
        elements.characterGrid.innerHTML = '';
        CHARACTER_CARDS.forEach(card => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'character-choice-card';
            button.classList.toggle('is-selected', selectedCharacter() === card.key);
            button.style.setProperty('--character-color', card.color);
            button.style.setProperty('--character-accent', card.accent);
            button.innerHTML = `<span class="character-choice-avatar"></span><strong>${escapeHtml(card.name)}</strong><small>${escapeHtml(card.summary)}</small>`;
            button.addEventListener('click', () => {
                elements.characterInputs.forEach(input => { input.checked = input.value === card.key; });
                localStorage.setItem(CHARACTER_KEY, card.key);
                renderLobbyCharacter();
                setScreen('lobby');
            });
            elements.characterGrid.appendChild(button);
        });
    }
    function openCharacterSelect() { renderCharacterSelectScreen(); setScreen('characterSelect'); }
    function closeCharacterSelect() { setScreen('lobby'); }

    function openMapEditor(id = null, options = {}) {
        const source = id ? mapMeta(id) : null;
        state.editor.editingId = id && !isOfficialMapId(id) ? id : null;
        state.editor.editPassword = options.password || null;
        state.editor.zoom = 1;
        if (source) elements.mapName.value = source.name || '';
        elements.mapMode.value = source?.mode || elements.mapMode.value || 'survival';
        elements.mapCols.value = source?.cols || 24;
        elements.mapRows.value = source?.rows || 16;
        elements.mapSummary.value = source?.summary || source?.description || '';
        state.editor.cols = Math.max(8, Math.min(100, Math.floor(Number(elements.mapCols.value) || 24)));
        state.editor.rows = Math.max(8, Math.min(100, Math.floor(Number(elements.mapRows.value) || 16)));
        state.editor.walls = new Set((source?.walls || []).map(wall => `${wall.col},${wall.row}`));
        state.editor.bushes = new Set((source?.bushes || []).map(bush => `${bush.col},${bush.row}`));
        const sourceSpawns = source?.spawns || [];
        state.editor.spawns = new Set(sourceSpawns.filter(spawn => spawn.team !== 'enemy').map(spawn => `${spawn.col},${spawn.row}`));
        state.editor.enemySpawns = new Set(sourceSpawns.filter(spawn => spawn.team === 'enemy').map(spawn => `${spawn.col},${spawn.row}`));
        updateEditorToolVisibility();
        elements.mapEditorStatus.textContent = id ? '기존 맵을 수정 중입니다. 저장하면 정보 화면으로 넘어갑니다.' : '벽과 플레이어 생성 지점을 배치하세요.';
        drawEditor();
        setScreen('editor');
    }
    function closeMapEditor() { setScreen('mapSelect'); }

    function applyEditorSize() {
        state.editor.cols = Math.max(8, Math.min(100, Math.floor(Number(elements.mapCols.value) || 24)));
        state.editor.rows = Math.max(8, Math.min(100, Math.floor(Number(elements.mapRows.value) || 16)));
        state.editor.walls = new Set([...state.editor.walls].filter(key => { const [col, row] = key.split(',').map(Number); return col < state.editor.cols && row < state.editor.rows; }));
        state.editor.bushes = new Set([...state.editor.bushes].filter(key => { const [col, row] = key.split(',').map(Number); return col < state.editor.cols && row < state.editor.rows; }));
        state.editor.spawns = new Set([...state.editor.spawns].filter(key => { const [col, row] = key.split(',').map(Number); return col < state.editor.cols && row < state.editor.rows; }));
        state.editor.enemySpawns = new Set([...state.editor.enemySpawns].filter(key => { const [col, row] = key.split(',').map(Number); return col < state.editor.cols && row < state.editor.rows; }));
        elements.mapEditorStatus.textContent = `${elements.mapMode.value === 'duel' ? '1:1' : '4인 생존전'} 맵 제작: 벽과 플레이어 생성 지점을 배치하세요. 두 손가락으로 확대/축소합니다.`;
        drawEditor();
    }

    function resizeEditorCanvasDisplay() {
        const canvas = elements.mapEditorCanvas;
        const wrap = elements.mapEditorCanvasWrap;
        if (!canvas || !wrap) return;
        const maxWidth = Math.max(280, wrap.clientWidth - 20);
        const maxHeight = Math.max(280, Math.min(window.innerHeight * 0.62, 720));
        const tile = Math.max(8, Math.min(maxWidth / state.editor.cols, maxHeight / state.editor.rows) * state.editor.zoom);
        canvas.style.width = `${state.editor.cols * tile}px`;
        canvas.style.height = `${state.editor.rows * tile}px`;
    }

    function drawEditor() {
        const canvas = elements.mapEditorCanvas;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const { cols, rows } = state.editor;
        canvas.width = cols * EDITOR_TILE_SIZE;
        canvas.height = rows * EDITOR_TILE_SIZE;
        resizeEditorCanvasDisplay();
        ctx.fillStyle = '#13361f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
        for (let col = 0; col <= cols; col += 1) { ctx.beginPath(); ctx.moveTo(col * EDITOR_TILE_SIZE, 0); ctx.lineTo(col * EDITOR_TILE_SIZE, canvas.height); ctx.stroke(); }
        for (let row = 0; row <= rows; row += 1) { ctx.beginPath(); ctx.moveTo(0, row * EDITOR_TILE_SIZE); ctx.lineTo(canvas.width, row * EDITOR_TILE_SIZE); ctx.stroke(); }
        ctx.fillStyle = '#8b5e34';
        state.editor.walls.forEach(key => { const [col, row] = key.split(',').map(Number); ctx.fillRect(col * EDITOR_TILE_SIZE, row * EDITOR_TILE_SIZE, EDITOR_TILE_SIZE, EDITOR_TILE_SIZE); });
        state.editor.bushes.forEach(key => { const [col, row] = key.split(',').map(Number); drawCanvasBush(ctx, col * EDITOR_TILE_SIZE, row * EDITOR_TILE_SIZE, EDITOR_TILE_SIZE); });
        ctx.fillStyle = '#f8fb7b';
        state.editor.spawns.forEach(key => { const [col, row] = key.split(',').map(Number); ctx.beginPath(); ctx.arc((col + 0.5) * EDITOR_TILE_SIZE, (row + 0.5) * EDITOR_TILE_SIZE, 10, 0, Math.PI * 2); ctx.fill(); });
        ctx.fillStyle = '#ef4444';
        state.editor.enemySpawns.forEach(key => { const [col, row] = key.split(',').map(Number); ctx.beginPath(); ctx.arc((col + 0.5) * EDITOR_TILE_SIZE, (row + 0.5) * EDITOR_TILE_SIZE, 10, 0, Math.PI * 2); ctx.fill(); });
    }

    function showEditorStatus(message, timeoutMs = 0) {
        elements.mapEditorStatus.textContent = message;
        if (timeoutMs > 0) {
            const token = Symbol(message);
            state.editor.statusToken = token;
            window.setTimeout(() => {
                if (state.editor.statusToken === token) elements.mapEditorStatus.textContent = '';
            }, timeoutMs);
        }
    }

    function selectedEditorMode() {
        return elements.mapMode.value === 'duel' ? 'duel' : 'survival';
    }

    function updateEditorToolVisibility() {
        const duel = selectedEditorMode() === 'duel';
        elements.mapTools.forEach(button => {
            if (button.dataset.tool === 'enemySpawn') button.hidden = !duel;
        });
        if (!duel && state.editor.tool === 'enemySpawn') {
            state.editor.tool = 'spawn';
            elements.mapTools.forEach(candidate => candidate.classList.toggle('is-selected', candidate.dataset.tool === 'spawn'));
        }
    }

    function editorSpawnLimit(tool) {
        if (selectedEditorMode() === 'duel') return tool === 'spawn' || tool === 'enemySpawn' ? 1 : 0;
        return tool === 'spawn' ? 4 : 0;
    }

    function editCellFromEvent(event) {
        if (!canPlaceEditorElement() || state.editor.dragPointerId !== event.pointerId) return;
        const rect = elements.mapEditorCanvas.getBoundingClientRect();
        const scale = elements.mapEditorCanvas.width / Math.max(1, rect.width);
        const col = Math.floor((event.clientX - rect.left) * scale / EDITOR_TILE_SIZE);
        const row = Math.floor((event.clientY - rect.top) * scale / EDITOR_TILE_SIZE);
        if (col < 0 || row < 0 || col >= state.editor.cols || row >= state.editor.rows) return;
        const key = `${col},${row}`;
        if (state.editor.draggedCell === key) return;
        state.editor.draggedCell = key;
        if (state.editor.tool === 'erase') {
            state.editor.walls.delete(key);
            state.editor.spawns.delete(key);
            state.editor.enemySpawns.delete(key);
            state.editor.bushes.delete(key);
        } else if (state.editor.tool === 'spawn' || state.editor.tool === 'enemySpawn') {
            const set = state.editor.tool === 'enemySpawn' ? state.editor.enemySpawns : state.editor.spawns;
            const limit = editorSpawnLimit(state.editor.tool);
            if (!set.has(key) && limit > 0 && set.size >= limit) {
                showEditorStatus('더 설치할 수 없어', 2000);
                return;
            }
            state.editor.walls.delete(key);
            state.editor.bushes.delete(key);
            state.editor.spawns.delete(key);
            state.editor.enemySpawns.delete(key);
            set.add(key);
        } else if (state.editor.tool === 'bush') {
            state.editor.walls.delete(key);
            state.editor.spawns.delete(key);
            state.editor.enemySpawns.delete(key);
            state.editor.bushes.add(key);
        } else {
            state.editor.spawns.delete(key);
            state.editor.enemySpawns.delete(key);
            state.editor.bushes.delete(key);
            state.editor.walls.add(key);
        }
        drawEditor();
    }

    function editorMapPayload() {
        const walls = [...state.editor.walls].map(key => { const [col, row] = key.split(',').map(Number); return { col, row }; });
        const bushes = [...state.editor.bushes].map(key => { const [col, row] = key.split(',').map(Number); return { col, row }; });
        const ownSpawns = [...state.editor.spawns].map(key => { const [col, row] = key.split(',').map(Number); return { col, row, team: 'own' }; });
        const enemySpawns = [...state.editor.enemySpawns].map(key => { const [col, row] = key.split(',').map(Number); return { col, row, team: 'enemy' }; });
        const spawnPoints = selectedEditorMode() === 'duel' ? [...ownSpawns, ...enemySpawns] : ownSpawns;
        return { cols: state.editor.cols, rows: state.editor.rows, tileSize: EDITOR_TILE_SIZE, walls, bushes, spawnPoints, mode: selectedEditorMode(), summary: (elements.mapSummary.value || '').trim() };
    }

    async function saveCustomMap() {
        const name = (elements.mapName.value || '').trim();
        if (!name) { showEditorStatus('맵 이름을 먼저 정하세요.', 2000); return; }
        if (selectedEditorMode() === 'duel') {
            if (state.editor.spawns.size !== 1 || state.editor.enemySpawns.size !== 1) { showEditorStatus('1:1 모드는 내 지점과 상대 지점이 각각 1개씩 필요해', 2000); return; }
        } else if (state.editor.spawns.size < 4) { showEditorStatus('플레이어 생성 지점을 충분히 배치하세요.', 2000); return; }
        elements.mapSavedInfoStatus.textContent = '정보를 적고 저장 완료를 누르세요.';
        setScreen('mapSavedInfo');
    }

    async function publishCustomMap() {
        const name = (elements.mapName.value || '').trim();
        if (!name) { elements.mapSavedInfoStatus.textContent = '맵 이름을 먼저 정하세요.'; return; }
        const method = state.editor.editingId ? 'PUT' : 'POST';
        const url = state.editor.editingId ? `/api/guangboo/maps/${encodeURIComponent(state.editor.editingId)}` : '/api/guangboo/maps';
        elements.mapSavedInfoStatus.textContent = '정식 맵 저장 중...';
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, creator: elements.nickname.value || 'v2 플레이어', mode: selectedEditorMode(), summary: (elements.mapSummary.value || '').trim(), map: editorMapPayload(), password: state.editor.editPassword })
        });
        const data = await response.json();
        if (!data.ok) throw new Error(data.error || 'save_failed');
        elements.mapSavedInfoStatus.textContent = '정식 맵 저장 완료';
        await loadCustomMaps();
        selectMap(data.map.id);
    }

    function deleteOfficialMap(id) {
        const hidden = hiddenOfficialMapIds();
        hidden.add(id);
        localStorage.setItem(HIDDEN_OFFICIAL_MAPS_KEY, JSON.stringify([...hidden]));
        if (selectedMapId() === id) selectMap(DEFAULT_OFFICIAL_MAP_ID);
        renderOfficialMapGrid();
        renderSelectedMapCard();
    }

    async function deleteCustomMap(id) {
        const password = requireMapPassword('맵을 삭제하려면 비밀번호를 입력하세요.');
        if (!password) return;
        const response = await fetch(`/api/guangboo/maps/${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await response.json();
        if (!data.ok) {
            window.alert(data.error === 'invalid_password' ? '비밀번호가 틀렸습니다.' : '삭제 실패');
            return;
        }
        await loadCustomMaps();
        selectMap(DEFAULT_OFFICIAL_MAP_ID);
    }


    async function loadLeaderboard() {
        if (!elements.leaderboard) return;
        try {
            const response = await fetch('/api/guangboo/leaderboard', { cache: 'no-store' });
            const data = await response.json();
            renderLeaderboard(data.leaderboard || []);
        } catch {
            renderLeaderboard([]);
        }
    }

    function renderLeaderboard(rows) {
        if (!elements.leaderboard) return;
        elements.leaderboard.innerHTML = '';
        if (!rows.length) {
            const item = document.createElement('li');
            item.innerHTML = '<span>1</span><strong>기록 없음</strong><span class="stat-pill">0승</span>';
            elements.leaderboard.appendChild(item);
            return;
        }
        rows.forEach((row, index) => {
            const item = document.createElement('li');
            item.innerHTML = `<span>${index + 1}</span><strong>${escapeHtml(row.nickname)}</strong><span class="stat-pill">${row.wins}승 ${row.kills}킬</span>`;
            elements.leaderboard.appendChild(item);
        });
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
        elements.joinButton.textContent = '플레이';
        loadLeaderboard();
        setScreen('result');
    }
    function applyCustomMaps(maps) {
        state.customMaps = Array.isArray(maps) ? maps : [];
        const saved = localStorage.getItem(MAP_KEY) || DEFAULT_OFFICIAL_MAP_ID;
        state.selectedMapId = saved;
        elements.customMapSelect.innerHTML = visibleOfficialMaps().map(map => `<option value="${map.id}">${map.name}</option>`).join('');
        state.customMaps.forEach(map => {
            const option = document.createElement('option');
            option.value = map.id;
            option.textContent = `${map.name} (${Math.round(map.width / map.tileSize)}x${Math.round(map.height / map.tileSize)})`;
            elements.customMapSelect.appendChild(option);
        });
        if (![...elements.customMapSelect.options].some(option => option.value === state.selectedMapId)) state.selectedMapId = DEFAULT_OFFICIAL_MAP_ID;
        elements.customMapSelect.value = state.selectedMapId;
        renderSelectedMapCard();
        renderOfficialMapGrid();
        renderCustomMapList();
    }

    async function loadCustomMaps() {
        try {
            const response = await fetch('/api/guangboo/maps', { cache: 'no-store' });
            const data = await response.json();
            applyCustomMaps(data.maps || []);
        } catch {
            applyCustomMaps([]);
        }
    }
    function escapeHtml(value) {
        return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    }

    elements.joinForm.addEventListener('submit', event => {
        event.preventDefault();
        if (state.joining) { leaveQueue(); return; }
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
    elements.fullscreenEnter?.addEventListener('click', () => { enterFullscreenMode(); });
    elements.fullscreenExit?.addEventListener('click', () => { exitFullscreenMode(); });
    document.addEventListener('fullscreenchange', () => {
        document.body.classList.toggle('is-app-fullscreen', Boolean(document.fullscreenElement) || state.fullscreenWanted);
    });
    elements.refreshBoard?.addEventListener('click', loadLeaderboard);
    elements.selectedMapCard.addEventListener('click', openMapSelect);
    elements.selectedMapCard.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openMapSelect(); } });
    elements.openMapSelect.addEventListener('click', openMapSelect);
    elements.closeMapSelect.addEventListener('click', closeMapSelect);
    elements.mapInfoButton.addEventListener('click', event => { event.stopPropagation(); openMapInfo(); });
    elements.closeMapInfo.addEventListener('click', closeMapInfo);
    elements.mapInfoModal.addEventListener('click', event => { if (event.target === elements.mapInfoModal) closeMapInfo(); });
    elements.openCharacterSelect.addEventListener('click', openCharacterSelect);
    elements.closeCharacterSelect.addEventListener('click', closeCharacterSelect);
    elements.mapSelectEditor.addEventListener('click', openMapModeSetup);
    elements.closeMapModeSetup.addEventListener('click', openMapSelect);
    elements.nextMapName.addEventListener('click', openMapNameSetup);
    elements.backMapMode.addEventListener('click', () => setScreen('mapModeSetup'));
    elements.nextMapEditor.addEventListener('click', () => {
        if (!(elements.mapName.value || '').trim()) { elements.mapName.focus(); return; }
        openMapEditor(null);
        applyEditorSize();
        updateEditorToolVisibility();
    });
    elements.backMapEditor.addEventListener('click', () => setScreen('editor'));
    elements.closeMapEditor.addEventListener('click', closeMapEditor);
    elements.applyMapSize?.addEventListener('click', applyEditorSize);
    elements.saveMap.addEventListener('click', () => saveCustomMap().catch(error => { elements.mapEditorStatus.textContent = `저장 실패: ${error.message}`; }));
    elements.publishMap.addEventListener('click', () => publishCustomMap().catch(error => { elements.mapSavedInfoStatus.textContent = `저장 실패: ${error.message}`; }));
    elements.mapTools.forEach(button => {
        button.addEventListener('click', () => {
            state.editor.tool = button.dataset.tool || 'wall';
            elements.mapTools.forEach(candidate => candidate.classList.toggle('is-selected', candidate === button));
            elements.mapEditorStatus.textContent = state.editor.tool === 'enemySpawn' ? '상대 플레이어 지점을 배치하세요.' : state.editor.tool === 'spawn' ? '내 플레이어 지점을 배치하세요.' : state.editor.tool === 'bush' ? '부쉬를 배치하세요.' : state.editor.tool === 'erase' ? '지울 칸을 선택하세요.' : '벽을 배치하세요.';
        });
    });
    function updateEditorPinch() {
        const points = [...state.editor.pointers.values()];
        if (points.length < 2) return;
        state.editor.pinching = true;
        state.editor.pinchBlockUntil = Date.now() + 220;
        const distance = Math.hypot(points[0].clientX - points[1].clientX, points[0].clientY - points[1].clientY);
        if (!state.editor.pinchStartDistance) {
            state.editor.pinchStartDistance = distance;
            state.editor.pinchStartZoom = state.editor.zoom;
            return;
        }
        state.editor.zoom = Math.max(0.6, Math.min(3.2, state.editor.pinchStartZoom * (distance / Math.max(1, state.editor.pinchStartDistance))));
        resizeEditorCanvasDisplay();
    }
    function canPlaceEditorElement() {
        return !state.editor.pinching && state.editor.pointers.size < 2 && Date.now() >= (state.editor.pinchBlockUntil || 0);
    }
    function panEditorCanvasWrap(point, event) {
        const wrap = elements.mapEditorCanvasWrap;
        if (!wrap) return;
        const nextLeft = point.scrollLeft + point.startX - event.clientX;
        const nextTop = point.scrollTop + point.startY - event.clientY;
        wrap.scrollLeft = Math.max(0, Math.min(wrap.scrollWidth - wrap.clientWidth, nextLeft));
        wrap.scrollTop = Math.max(0, Math.min(wrap.scrollHeight - wrap.clientHeight, nextTop));
    }
    elements.mapEditorCanvas.addEventListener('pointerdown', event => {
        if (event.pointerType !== 'touch') event.preventDefault();
        if (event.pointerType !== 'touch') elements.mapEditorCanvas.setPointerCapture?.(event.pointerId);
        if (event.pointerType === 'touch') elements.mapEditorCanvas.setPointerCapture?.(event.pointerId);
        state.editor.pointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY, startX: event.clientX, startY: event.clientY, scrollLeft: elements.mapEditorCanvasWrap?.scrollLeft || 0, scrollTop: elements.mapEditorCanvasWrap?.scrollTop || 0, startedAt: Date.now(), pointerType: event.pointerType, moved: false });
        if (state.editor.pointers.size >= 2) { state.editor.dragPointerId = null; updateEditorPinch(); return; }
        state.editor.dragPointerId = event.pointerId;
        state.editor.draggedCell = '';
        if (event.pointerType !== 'touch' && canPlaceEditorElement()) editCellFromEvent(event);
    });
    elements.mapEditorCanvas.addEventListener('pointermove', event => {
        const previousPoint = state.editor.pointers.get(event.pointerId);
        if (!previousPoint) return;
        const moved = previousPoint.moved || Math.hypot(event.clientX - previousPoint.startX, event.clientY - previousPoint.startY) > 8;
        state.editor.pointers.set(event.pointerId, { ...previousPoint, clientX: event.clientX, clientY: event.clientY, moved });
        if (state.editor.pointers.size >= 2) { event.preventDefault(); state.editor.dragPointerId = null; updateEditorPinch(); return; }
        if (event.pointerType === 'touch' && moved && elements.mapEditorCanvasWrap) {
            event.preventDefault();
            panEditorCanvasWrap(previousPoint, event);
        }
    });
    const endEditorPointer = event => {
        const point = state.editor.pointers.get(event.pointerId);
        if (canPlaceEditorElement() && state.editor.dragPointerId === event.pointerId && event.pointerType === 'touch' && point && !point.moved) editCellFromEvent(event);
        state.editor.pointers.delete(event.pointerId);
        if (state.editor.dragPointerId === event.pointerId) state.editor.dragPointerId = null;
        state.editor.draggedCell = '';
        if (state.editor.pointers.size < 2) {
            state.editor.pinchStartDistance = 0;
            if (state.editor.pinching) state.editor.pinchBlockUntil = Date.now() + 220;
        }
        if (state.editor.pointers.size === 0) state.editor.pinching = false;
    };
    elements.mapEditorCanvas.addEventListener('pointerup', endEditorPointer);
    elements.mapEditorCanvas.addEventListener('pointercancel', endEditorPointer);
    elements.mapMode.addEventListener('change', () => { updateEditorToolVisibility(); drawEditor(); });
    window.addEventListener('resize', resizeEditorCanvasDisplay);
    elements.characterInputs.forEach(input => input.addEventListener('change', () => { localStorage.setItem(CHARACTER_KEY, selectedCharacter()); renderLobbyCharacter(); renderCharacterSelectScreen(); }));
    elements.ultimateButton.addEventListener('pointerdown', event => { event.preventDefault(); fireUltimate(); });
    elements.pixiHost.addEventListener('pointermove', event => { if (event.pointerType !== 'mouse' || !state.matchActive) return; updateMouseAim(event); });
    elements.pixiHost.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse' || !state.matchActive) return; unlockAudio(); updateMouseAim(event); });
    window.addEventListener('pointerup', event => {
        if (event.pointerType === 'mouse' && state.mouseAim.active && state.matchActive) queueShot(state.mouseAim);
        state.mouseAim.active = false;
    });
    window.addEventListener('keydown', event => {
        keys.add(event.code);
        if (event.code === 'Space') { event.preventDefault(); fireUltimate(); }
    });
    window.addEventListener('keyup', event => keys.delete(event.code));

    function isEditorCanvasGesture(event) {
        return elements.editor && !elements.editor.hidden && event.target === elements.mapEditorCanvas;
    }
    function blockPageZoom(event) {
        if (isEditorCanvasGesture(event)) return;
        event.preventDefault();
    }
    let lastTouchEndAt = 0;
    document.addEventListener('gesturestart', blockPageZoom, { passive: false });
    document.addEventListener('gesturechange', blockPageZoom, { passive: false });
    document.addEventListener('gestureend', blockPageZoom, { passive: false });
    document.addEventListener('touchmove', event => {
        if (event.touches && event.touches.length > 1) blockPageZoom(event);
    }, { passive: false });
    document.addEventListener('dblclick', blockPageZoom, { passive: false });
    document.addEventListener('touchend', event => {
        const now = Date.now();
        if (now - lastTouchEndAt < 340 && !isEditorCanvasGesture(event)) event.preventDefault();
        lastTouchEndAt = now;
    }, { passive: false });


    elements.nickname.value = localStorage.getItem(STORAGE_KEY) || '';
    elements.botToggle.checked = localStorage.getItem(BOT_KEY) !== '0';
    const savedMode = localStorage.getItem(MODE_KEY);
    if (savedMode) elements.modeInputs.forEach(input => { input.checked = input.value === savedMode; });
    const savedCharacter = localStorage.getItem(CHARACTER_KEY);
    if (savedCharacter) elements.characterInputs.forEach(input => { input.checked = input.value === savedCharacter; });
    renderLobbyCharacter();
    renderCharacterSelectScreen();
    renderSelectedMapCard();
    loadCustomMaps();
    loadLeaderboard();
    setupStick('leftStick', elements.leftStick);
    setupStick('rightStick', elements.rightStick);
    sendInputLoop();
})();
