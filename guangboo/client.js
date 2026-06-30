(() => {
    const WORLD_FALLBACK = { width: 960, height: 640, obstacles: [] };
    const SEND_MS = 33;
    const STORAGE_KEY = 'guangboo_nickname';
    const MODE_STORAGE_KEY = 'guangboo_match_mode';
    const CHARACTER_STORAGE_KEY = 'guangboo_character';
    const BOT_STORAGE_KEY = 'guangboo_fill_bots';
    const CUSTOM_MAP_STORAGE_KEY = 'guangboo_custom_map_id';
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
    const keys = new Set();

    const elements = {
        lobby: document.getElementById('lobbyScreen'),
        match: document.getElementById('matchScreen'),
        editor: document.getElementById('mapEditorScreen'),
        mapSelect: document.getElementById('mapSelectScreen'),
        characterSelect: document.getElementById('characterSelectScreen'),
        result: document.getElementById('resultScreen'),
        joinForm: document.getElementById('joinForm'),
        nickname: document.getElementById('nicknameInput'),
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
        openMapEditor: document.getElementById('openMapEditorButton') || document.getElementById('mapSelectEditorButton'),
        closeMapEditor: document.getElementById('closeMapEditorButton'),
        mapEditorCanvas: document.getElementById('mapEditorCanvas'),
        mapName: document.getElementById('mapNameInput'),
        mapCols: document.getElementById('mapColsInput'),
        mapRows: document.getElementById('mapRowsInput'),
        newMap: document.getElementById('newMapButton'),
        saveMap: document.getElementById('saveMapButton'),
        mapEditorStatus: document.getElementById('mapEditorStatus'),
        mapTools: [...document.querySelectorAll('.map-tool')],
        modeInputs: [...document.querySelectorAll('input[name="matchMode"]')],
        characterInputs: [...document.querySelectorAll('input[name="character"]')],
        openCharacterSelect: document.getElementById('openCharacterSelectButton'),
        closeCharacterSelect: document.getElementById('closeCharacterSelectButton'),
        characterGrid: document.getElementById('characterGrid'),
        lobbyCharacterPreview: document.getElementById('lobbyCharacterPreview'),
        selectedCharacterName: document.getElementById('selectedCharacterName'),
        joinButton: document.getElementById('joinButton'),
        status: document.getElementById('statusLine'),
        queueFill: document.getElementById('queueFill'),
        queueCopy: document.getElementById('queueCopy'),
        leaderboard: document.getElementById('leaderboardList'),
        refreshBoard: document.getElementById('refreshBoardButton'),
        canvas: document.getElementById('gameCanvas'),
        health: document.getElementById('healthReadout'),
        alive: document.getElementById('aliveReadout'),
        kills: document.getElementById('killReadout'),
        connection: document.getElementById('connectionHud'),
        fullscreenExit: document.getElementById('fullscreenExitButton'),
        ultimateButton: document.getElementById('ultimateButton'),
        leftStick: document.getElementById('leftStick'),
        rightStick: document.getElementById('rightStick'),
        resultTitle: document.getElementById('resultTitle'),
        resultList: document.getElementById('resultList'),
        playAgain: document.getElementById('playAgainButton'),
        backLobby: document.getElementById('backLobbyButton')
    };

    const ctx = elements.canvas.getContext('2d');
    const state = {
        ws: null,
        playerId: null,
        matchId: null,
        connected: false,
        serverReady: false,
        joining: false,
        requestedMode: null,
        matchActive: false,
        modes: [
            { key: 'survival', label: '정식 맵 전투', size: 4 }
        ],
        map: WORLD_FALLBACK,
        players: [],
        projectiles: [],
        slimeTrails: [],
        summons: [],
        lastResults: [],
        inputSeq: 0,
        leftStick: { active: false, pointerId: null, x: 0, y: 0, centerX: 0, centerY: 0, startX: 0, startY: 0, moved: false, shotQueued: false, instantAim: null },
        rightStick: { active: false, pointerId: null, x: 0, y: 0, centerX: 0, centerY: 0, startX: 0, startY: 0, moved: false, shotQueued: false, instantAim: null },
        mouseAim: { active: false, x: 1, y: 0 },
        lastAim: { x: 1, y: 0 },
        queuedShots: [],
        queuedUltimate: false,
        projectileMemory: new Map(),
        audio: { context: null, unlocked: false, lastImpactAt: 0, lastFlyAt: 0 },
        lastTouchEndAt: 0,
        gameFullscreen: false,
        viewport: { width: 1, height: 1, scale: 1, offsetX: 0, offsetY: 0, cameraActive: false },
        customMaps: [],
        selectedMapId: DEFAULT_OFFICIAL_MAP_ID,
        editor: { cols: 24, rows: 16, tileSize: EDITOR_TILE_SIZE, walls: new Set(), spawns: new Set(), tool: 'wall' }
    };

    function setScreen(name) {
        elements.lobby.hidden = name !== 'lobby';
        elements.editor.hidden = name !== 'editor';
        elements.mapSelect.hidden = name !== 'mapSelect';
        elements.characterSelect.hidden = name !== 'characterSelect';
        elements.match.hidden = name !== 'match';
        elements.result.hidden = name !== 'result';
        document.body.classList.toggle('is-playing', name === 'match');
        if (name === 'match') {
            enterGameFullscreen();
        }
        if (name !== 'match') {
            state.queuedShots = [];
            state.queuedUltimate = false;
            state.projectileMemory.clear();
            state.slimeTrails = [];
            state.summons = [];
            state.mouseAim.active = false;
            exitGameFullscreen();
        }
    }

    function enterGameFullscreen() {
        state.gameFullscreen = true;
        document.body.classList.add('is-game-fullscreen');
        resizeCanvas();
    }

    function exitGameFullscreen() {
        state.gameFullscreen = false;
        document.body.classList.remove('is-game-fullscreen');
        resizeCanvas();
    }

    function wsUrl() {
        if (location.protocol === 'file:') return 'ws://127.0.0.1:4173/guangboo/ws';
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${location.host}/guangboo/ws`;
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
        if (context.state === 'suspended') {
            context.resume().catch(() => {});
        }
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

    function getSelectedMode() {
        return 'survival';
    }

    function getSelectedCharacter() {
        return elements.characterInputs.find(input => input.checked)?.value || 'monster';
    }

    function getCharacterInfo(key = getSelectedCharacter()) {
        return CHARACTER_CARDS.find(character => character.key === key) || CHARACTER_CARDS[0];
    }

    function selectedMapId() {
        return state.selectedMapId || DEFAULT_OFFICIAL_MAP_ID;
    }

    function isOfficialMapId(id) {
        return String(id || '').startsWith('official:');
    }

    function getSelectedMapInfo(id = selectedMapId()) {
        if (isOfficialMapId(id)) return OFFICIAL_MAPS.find(map => map.id === id) || OFFICIAL_MAPS[0];
        const custom = state.customMaps.find(map => map.id === id);
        if (custom) {
            return {
                id: custom.id,
                name: custom.name,
                summary: `${Math.round(custom.width / custom.tileSize)} x ${Math.round(custom.height / custom.tileSize)} 사용자 제작 맵`,
                description: '맵 만들기에서 저장한 사용자 제작 맵입니다. 플레이어 생성 지점이 있으면 그 위치에서 시작합니다.',
                cols: Math.round(custom.width / custom.tileSize),
                rows: Math.round(custom.height / custom.tileSize),
                walls: custom.walls || custom.map?.walls || [],
                spawns: custom.spawnPoints || custom.map?.spawnPoints || []
            };
        }
        return OFFICIAL_MAPS[0];
    }

    function syncHiddenMapSelect() {
        if (!elements.customMapSelect) return;
        const id = selectedMapId();
        if (![...elements.customMapSelect.options].some(option => option.value === id)) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = getSelectedMapInfo(id).name;
            elements.customMapSelect.appendChild(option);
        }
        elements.customMapSelect.value = id;
    }

    function drawMiniMap(canvas, mapInfo) {
        if (!canvas) return;
        const context = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const cols = Math.max(1, Number(mapInfo.cols) || 24);
        const rows = Math.max(1, Number(mapInfo.rows) || 16);
        const scale = Math.min(width / cols, height / rows);
        const offsetX = (width - cols * scale) / 2;
        const offsetY = (height - rows * scale) / 2;
        context.clearRect(0, 0, width, height);
        context.fillStyle = '#dff2c4';
        context.fillRect(offsetX, offsetY, cols * scale, rows * scale);
        context.strokeStyle = 'rgba(23, 32, 24, 0.15)';
        context.strokeRect(offsetX, offsetY, cols * scale, rows * scale);
        context.fillStyle = '#8a6b3d';
        (mapInfo.walls || []).forEach(wall => {
            context.fillRect(offsetX + wall.col * scale + 1, offsetY + wall.row * scale + 1, Math.max(1, scale - 2), Math.max(1, scale - 2));
        });
        context.fillStyle = '#35a66f';
        (mapInfo.spawns || []).forEach(spawn => {
            const col = Number.isFinite(spawn.col) ? spawn.col : Math.floor((Number(spawn.x) || 0) / 40);
            const row = Number.isFinite(spawn.row) ? spawn.row : Math.floor((Number(spawn.y) || 0) / 40);
            context.beginPath();
            context.arc(offsetX + (col + 0.5) * scale, offsetY + (row + 0.5) * scale, Math.max(3, scale * 0.28), 0, Math.PI * 2);
            context.fill();
        });
    }

    function renderLobbyCharacter() {
        const character = getCharacterInfo();
        if (elements.selectedCharacterName) elements.selectedCharacterName.textContent = character.name;
        if (elements.lobbyCharacterPreview) {
            elements.lobbyCharacterPreview.style.setProperty('--character-color', character.color);
            elements.lobbyCharacterPreview.style.setProperty('--character-accent', character.accent);
            elements.lobbyCharacterPreview.classList.toggle('is-slime', character.key === 'slime');
        }
    }

    function renderSelectedMapCard() {
        const mapInfo = getSelectedMapInfo();
        if (elements.selectedMapName) elements.selectedMapName.textContent = mapInfo.name;
        if (elements.selectedMapSummary) elements.selectedMapSummary.textContent = mapInfo.summary;
        drawMiniMap(elements.selectedMapMini, mapInfo);
        syncHiddenMapSelect();
    }

    function selectMap(id) {
        state.selectedMapId = id || DEFAULT_OFFICIAL_MAP_ID;
        localStorage.setItem(CUSTOM_MAP_STORAGE_KEY, state.selectedMapId);
        renderSelectedMapCard();
        setScreen('lobby');
    }

    function openMapSelect() {
        renderMapSelectScreen();
        setScreen('mapSelect');
    }

    function closeMapSelect() {
        setScreen('lobby');
        renderSelectedMapCard();
    }

    function openMapInfo() {
        const mapInfo = getSelectedMapInfo();
        elements.mapInfoTitle.textContent = mapInfo.name;
        elements.mapInfoDescription.textContent = mapInfo.description || mapInfo.summary;
        drawMiniMap(elements.mapInfoMini, mapInfo);
        elements.mapInfoModal.hidden = false;
    }

    function closeMapInfo() {
        elements.mapInfoModal.hidden = true;
    }

    function renderMapSelectScreen() {
        elements.officialMapGrid.innerHTML = '';
        OFFICIAL_MAPS.forEach(map => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'map-choice-card';
            button.classList.toggle('is-selected', selectedMapId() === map.id);
            button.innerHTML = `<canvas width="180" height="115" aria-hidden="true"></canvas><strong>${escapeHtml(map.name)}</strong><small>${escapeHtml(map.summary)}</small>`;
            drawMiniMap(button.querySelector('canvas'), map);
            button.addEventListener('click', () => selectMap(map.id));
            elements.officialMapGrid.appendChild(button);
        });
        elements.customMapList.innerHTML = '';
        if (state.customMaps.length) {
            const title = document.createElement('p');
            title.className = 'eyebrow';
            title.textContent = '내가 만든 맵';
            elements.customMapList.appendChild(title);
        }
        state.customMaps.forEach(map => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'custom-map-choice';
            button.textContent = map.name;
            button.addEventListener('click', () => selectMap(map.id));
            elements.customMapList.appendChild(button);
        });
    }

    function openCharacterSelect() {
        renderCharacterSelectScreen();
        setScreen('characterSelect');
    }

    function closeCharacterSelect() {
        setScreen('lobby');
        renderLobbyCharacter();
    }

    function selectCharacter(key) {
        elements.characterInputs.forEach(input => { input.checked = input.value === key; });
        localStorage.setItem(CHARACTER_STORAGE_KEY, getSelectedCharacter());
        renderLobbyCharacter();
        setScreen('lobby');
    }

    function renderCharacterSelectScreen() {
        elements.characterGrid.innerHTML = '';
        CHARACTER_CARDS.forEach(character => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'character-choice-card';
            button.classList.toggle('is-selected', getSelectedCharacter() === character.key);
            button.style.setProperty('--character-color', character.color);
            button.style.setProperty('--character-accent', character.accent);
            button.innerHTML = `<span class="character-choice-avatar"></span><strong>${escapeHtml(character.name)}</strong><small>${escapeHtml(character.summary)}</small>`;
            button.addEventListener('click', () => selectCharacter(character.key));
            elements.characterGrid.appendChild(button);
        });
    }

    function getModeInfo(key = getSelectedMode()) {
        return state.modes.find(mode => mode.key === key) || state.modes[0];
    }

    function setModeInputsDisabled(disabled) {
        const supportedKeys = new Set(state.modes.map(mode => mode.key));
        elements.modeInputs.forEach(input => {
            input.disabled = disabled || !supportedKeys.has(input.value);
        });
    }

    function normalizeSelectedMode() {
        if (state.modes.some(mode => mode.key === getSelectedMode())) return;
        const fallback = state.modes[0]?.key || 'survival';
        elements.modeInputs.forEach(input => {
            input.checked = input.value === fallback;
        });
    }

    function updateModeCopy() {
        normalizeSelectedMode();
        const mode = getModeInfo();
        elements.queueCopy.textContent = `${mode.label || '정식 맵 전투'} - 선택한 맵: ${getSelectedMapInfo().name}`;
        elements.alive.textContent = String(mode.size);
        setModeInputsDisabled(elements.joinButton.disabled);
    }

    function setMatchingUi(isMatching) {
        elements.joinButton.disabled = isMatching;
        elements.joinButton.textContent = isMatching ? '매칭 중' : '플레이';
        setModeInputsDisabled(isMatching);
        elements.characterInputs.forEach(input => { input.disabled = isMatching; });
    }

    function connect() {
        if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }
        state.ws = new WebSocket(wsUrl());
        state.serverReady = false;
        elements.status.textContent = '서버 연결 중';
        elements.connection.textContent = '연결 중';

        state.ws.addEventListener('open', () => {
            state.connected = true;
            elements.status.textContent = '매칭 준비 완료';
            elements.connection.textContent = '온라인';
        });

        state.ws.addEventListener('close', () => {
            state.connected = false;
            state.serverReady = false;
            state.matchActive = false;
            elements.status.textContent = '서버 연결 끊김';
            elements.connection.textContent = '오프라인';
            setMatchingUi(false);
        });

        state.ws.addEventListener('error', () => {
            elements.status.textContent = '서버 연결 실패';
            elements.connection.textContent = '오류';
        });

        state.ws.addEventListener('message', event => {
            handleServerMessage(JSON.parse(event.data));
        });
    }

    function joinQueue() {
        const nickname = (elements.nickname.value || 'Monster').trim();
        const mode = state.requestedMode || getSelectedMode();
        if (!state.serverReady) return;
        if (!state.modes.some(item => item.key === mode)) {
            state.joining = false;
            state.requestedMode = null;
            elements.status.textContent = '서버가 이 모드를 아직 지원하지 않습니다. 서버를 재시작하세요.';
            setMatchingUi(false);
            updateModeCopy();
            return;
        }
        localStorage.setItem(STORAGE_KEY, nickname);
        const character = getSelectedCharacter();
        localStorage.setItem(MODE_STORAGE_KEY, mode);
        localStorage.setItem(CHARACTER_STORAGE_KEY, character);
        localStorage.setItem(BOT_STORAGE_KEY, elements.botToggle.checked ? '1' : '0');
        localStorage.setItem(CUSTOM_MAP_STORAGE_KEY, selectedMapId());
        setMatchingUi(true);
        state.joining = true;
        const mapId = selectedMapId();
        send({ type: 'joinQueue', nickname, mode, character, customMapId: isOfficialMapId(mapId) ? null : mapId, officialMapId: isOfficialMapId(mapId) ? mapId : null, fillWithBots: elements.botToggle.checked });
    }

    function handleServerMessage(message) {
        if (message.type === 'hello') {
            state.playerId = message.playerId;
            if (Array.isArray(message.modes) && message.modes.length) {
                state.modes = message.modes;
            } else {
                state.modes = [{ key: 'survival', label: '정식 맵 전투', size: Number(message.requiredPlayers) || 4 }];
            }
            renderLeaderboard(message.leaderboard || []);
            state.serverReady = true;
            if (state.joining) {
                if (state.requestedMode && !state.modes.some(mode => mode.key === state.requestedMode)) {
                    state.joining = false;
                    elements.status.textContent = '서버가 정식 맵 전투를 아직 지원하지 않습니다. 서버를 재시작하세요.';
                    setMatchingUi(false);
                    updateModeCopy();
                    return;
                }
                joinQueue();
            } else {
                updateModeCopy();
            }
            return;
        }

        if (message.type === 'playerReady') {
            state.playerId = message.playerId;
            elements.status.textContent = `${message.nickname} ${message.modeLabel || getModeInfo(message.mode).label} 대기`;
            renderLeaderboard(message.leaderboard || []);
            return;
        }

        if (message.type === 'queue') {
            const percent = Math.min(100, (message.playersWaiting / message.requiredPlayers) * 100);
            elements.queueFill.style.width = `${percent}%`;
            const mode = getModeInfo(message.mode);
            const label = message.modeLabel || mode.label;
            const totalCopy = `총 ${message.requiredPlayers}명`;
            elements.queueCopy.textContent = `${label}: ${message.playersWaiting}/${message.requiredPlayers} 대기 중 (${totalCopy})`;
            return;
        }

        if (message.type === 'matchStart') {
            state.joining = false;
            state.matchActive = true;
            state.matchId = message.matchId;
            state.playerId = message.playerId;
            state.map = message.map || WORLD_FALLBACK;
            state.players = message.players || [];
            const localPlayer = state.players.find(player => player.id === state.playerId);
            if (localPlayer) {
                state.lastAim = normalizeAim({ x: localPlayer.aimX ?? localPlayer.aim?.x ?? 1, y: localPlayer.aimY ?? localPlayer.aim?.y ?? 0 });
            }
            state.projectiles = [];
            state.slimeTrails = message.slimeTrails || [];
            state.summons = message.summons || [];
            elements.connection.textContent = message.modeLabel || '매치 진행';
            setScreen('match');
            resizeCanvas();
            return;
        }

        if (message.type === 'state') {
            state.players = message.players || [];
            if (message.map) state.map = message.map;
            state.projectiles = rememberAndFilterProjectiles(message.projectiles || []);
            state.slimeTrails = message.slimeTrails || [];
            state.summons = message.summons || [];
            updateHud();
            return;
        }

        if (message.type === 'matchEnd') {
            state.matchActive = false;
            state.lastResults = message.results || [];
            showResults(message.winnerId);
            loadLeaderboard();
            return;
        }

        if (message.type === 'error') {
            elements.status.textContent = message.message || message.code || '오류';
        }
    }

    async function loadCustomMaps() {
        try {
            const response = await fetch('/api/guangboo/maps', { cache: 'no-store' });
            const data = await response.json();
            state.customMaps = data.maps || [];
            renderCustomMapOptions();
        } catch {
            state.customMaps = [];
            renderCustomMapOptions();
        }
    }

    function renderCustomMapOptions() {
        const selected = localStorage.getItem(CUSTOM_MAP_STORAGE_KEY) || selectedMapId();
        elements.customMapSelect.innerHTML = '';
        OFFICIAL_MAPS.forEach(map => {
            const option = document.createElement('option');
            option.value = map.id;
            option.textContent = map.name;
            elements.customMapSelect.appendChild(option);
        });
        state.customMaps.forEach(map => {
            const option = document.createElement('option');
            option.value = map.id;
            option.textContent = `${map.name} (${Math.round(map.width / map.tileSize)}x${Math.round(map.height / map.tileSize)})`;
            elements.customMapSelect.appendChild(option);
        });
        state.selectedMapId = [...elements.customMapSelect.options].some(option => option.value === selected) ? selected : DEFAULT_OFFICIAL_MAP_ID;
        elements.customMapSelect.value = state.selectedMapId;
        renderSelectedMapCard();
        if (!elements.mapSelect.hidden) renderMapSelectScreen();
        updateModeCopy();
    }

    function editorMapData() {
        const walls = [...state.editor.walls].map(key => {
            const [col, row] = key.split(',').map(Number);
            return { col, row };
        });
        const spawnPoints = [...state.editor.spawns].map(key => {
            const [col, row] = key.split(',').map(Number);
            return { col, row };
        });
        return {
            name: (elements.mapName.value || '내 맵').trim(),
            tileSize: state.editor.tileSize,
            cols: state.editor.cols,
            rows: state.editor.rows,
            width: state.editor.cols * state.editor.tileSize,
            height: state.editor.rows * state.editor.tileSize,
            walls,
            spawnPoints
        };
    }

    function drawMapEditor() {
        const canvas = elements.mapEditorCanvas;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        const cols = state.editor.cols;
        const rows = state.editor.rows;
        const tile = Math.max(4, Math.min(canvas.width / cols, canvas.height / rows));
        const offsetX = (canvas.width - cols * tile) / 2;
        const offsetY = (canvas.height - rows * tile) / 2;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#eef3df';
        context.fillRect(offsetX, offsetY, cols * tile, rows * tile);
        context.strokeStyle = 'rgba(33, 48, 63, 0.18)';
        context.lineWidth = 1;
        for (let col = 0; col <= cols; col += 1) {
            context.beginPath();
            context.moveTo(offsetX + col * tile, offsetY);
            context.lineTo(offsetX + col * tile, offsetY + rows * tile);
            context.stroke();
        }
        for (let row = 0; row <= rows; row += 1) {
            context.beginPath();
            context.moveTo(offsetX, offsetY + row * tile);
            context.lineTo(offsetX + cols * tile, offsetY + row * tile);
            context.stroke();
        }
        context.fillStyle = '#8a6b3d';
        state.editor.walls.forEach(key => {
            const [col, row] = key.split(',').map(Number);
            context.fillRect(offsetX + col * tile + 1, offsetY + row * tile + 1, Math.max(1, tile - 2), Math.max(1, tile - 2));
        });
        context.fillStyle = '#35a66f';
        state.editor.spawns.forEach(key => {
            const [col, row] = key.split(',').map(Number);
            context.beginPath();
            context.arc(offsetX + (col + 0.5) * tile, offsetY + (row + 0.5) * tile, Math.max(4, tile * 0.28), 0, Math.PI * 2);
            context.fill();
            context.strokeStyle = '#064e3b';
            context.lineWidth = 2;
            context.stroke();
        });
    }

    function applyEditorSize() {
        state.editor.cols = Math.max(8, Math.min(100, Math.floor(Number(elements.mapCols.value) || 24)));
        state.editor.rows = Math.max(8, Math.min(100, Math.floor(Number(elements.mapRows.value) || 16)));
        state.editor.walls.clear();
        state.editor.spawns.clear();
        elements.mapCols.value = state.editor.cols;
        elements.mapRows.value = state.editor.rows;
        elements.mapEditorStatus.textContent = `${state.editor.cols} x ${state.editor.rows} 맵을 제작 중입니다. 벽 또는 플레이어 생성 지점을 배치하세요.`;
        drawMapEditor();
    }

    function openMapEditor() {
        state.joining = false;
        setMatchingUi(false);
        setScreen('editor');
        applyEditorSize();
    }

    function closeMapEditor() {
        setScreen('lobby');
        loadCustomMaps();
    }

    function editCellFromEvent(event) {
        const canvas = elements.mapEditorCanvas;
        const rect = canvas.getBoundingClientRect();
        const cols = state.editor.cols;
        const rows = state.editor.rows;
        const tile = Math.max(4, Math.min(canvas.width / cols, canvas.height / rows));
        const offsetX = (canvas.width - cols * tile) / 2;
        const offsetY = (canvas.height - rows * tile) / 2;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (event.clientX - rect.left) * scaleX - offsetX;
        const y = (event.clientY - rect.top) * scaleY - offsetY;
        const col = Math.floor(x / tile);
        const row = Math.floor(y / tile);
        if (col < 0 || row < 0 || col >= cols || row >= rows) return;
        const key = `${col},${row}`;
        if (state.editor.tool === 'erase') {
            state.editor.walls.delete(key);
            state.editor.spawns.delete(key);
        } else if (state.editor.tool === 'spawn') {
            state.editor.walls.delete(key);
            state.editor.spawns.add(key);
        } else {
            state.editor.spawns.delete(key);
            state.editor.walls.add(key);
        }
        drawMapEditor();
    }

    async function saveCustomMap() {
        const map = editorMapData();
        if (!map.name) {
            elements.mapEditorStatus.textContent = '맵 이름을 입력하세요.';
            return;
        }
        elements.mapEditorStatus.textContent = '저장 중...';
        try {
            const response = await fetch('/api/guangboo/maps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: map.name, creator: elements.nickname.value || 'Map Maker', map })
            });
            const data = await response.json();
            if (!data.ok) throw new Error(data.error || 'save_failed');
            elements.mapEditorStatus.textContent = '저장 완료. 로비에서 선택할 수 있습니다.';
            await loadCustomMaps();
            selectMap(data.map.id);
            localStorage.setItem(CUSTOM_MAP_STORAGE_KEY, data.map.id);
        } catch {
            elements.mapEditorStatus.textContent = '저장 실패. 서버 연결을 확인하세요.';
        }
    }

    async function loadLeaderboard() {
        try {
            const response = await fetch('/api/guangboo/leaderboard', { cache: 'no-store' });
            const data = await response.json();
            renderLeaderboard(data.leaderboard || []);
        } catch {
            renderLeaderboard([]);
        }
    }

    function renderLeaderboard(rows) {
        elements.leaderboard.innerHTML = '';
        if (!rows.length) {
            const item = document.createElement('li');
            item.innerHTML = '<span>1</span><strong>기록 없음</strong><span class="stat-pill">0승</span>';
            elements.leaderboard.appendChild(item);
            return;
        }
        rows.forEach((row, index) => {
            const item = document.createElement('li');
            item.innerHTML = `
                <span>${index + 1}</span>
                <strong>${escapeHtml(row.nickname)}</strong>
                <span class="stat-pill">${row.wins}승 ${row.kills}킬</span>
            `;
            elements.leaderboard.appendChild(item);
        });
    }

    function showResults(winnerId) {
        const didWin = winnerId && winnerId === state.playerId;
        elements.resultTitle.textContent = didWin ? '승리' : '생존 종료';
        elements.resultList.innerHTML = '';
        state.lastResults.forEach(result => {
            const item = document.createElement('li');
            item.innerHTML = `
                <span>${result.placement}</span>
                <strong>${escapeHtml(result.nickname)}</strong>
                <span class="stat-pill">${result.kills}킬</span>
            `;
            elements.resultList.appendChild(item);
        });
        elements.joinButton.disabled = false;
        setMatchingUi(false);
        state.requestedMode = null;
        setScreen('result');
    }

    function updateHud() {
        const me = state.players.find(player => player.id === state.playerId);
        elements.health.textContent = me ? Math.max(0, me.health) : 0;
        elements.kills.textContent = me ? me.kills : 0;
        elements.alive.textContent = state.players.filter(player => player.alive).length;
        updateUltimateButton(me);
    }

    function updateUltimateButton(player = state.players.find(candidate => candidate.id === state.playerId)) {
        if (!elements.ultimateButton) return;
        const required = Number(player?.ultimateRequired) || 4;
        const rawHits = Math.max(0, Number(player?.ultimateHits) || 0);
        const isSlime = player?.character === 'slime';
        const hits = isSlime ? Math.min(4, rawHits) : Math.min(required, rawHits);
        const ready = isSlime ? hits >= 1 : Boolean(player?.ultimateReady);
        elements.ultimateButton.disabled = !ready || !state.matchActive || player?.alive === false;
        elements.ultimateButton.classList.toggle('is-ready', ready);
        elements.ultimateButton.querySelector('.ultimate-count').textContent = player?.character === 'slime'
            ? `${hits}마리`
            : (ready ? 'READY' : `${hits}/${required}`);
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function layoutViewportSize() {
        const canvasRect = elements.canvas.getBoundingClientRect?.();
        const matchRect = elements.match.getBoundingClientRect?.();
        const visualViewport = window.visualViewport;
        const width = Math.max(
            1,
            Math.round(canvasRect?.width || matchRect?.width || visualViewport?.width || window.innerWidth || WORLD_FALLBACK.width)
        );
        const height = Math.max(
            1,
            Math.round(canvasRect?.height || matchRect?.height || visualViewport?.height || window.innerHeight || WORLD_FALLBACK.height)
        );
        return { width, height };
    }

    function resizeCanvas() {
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const { width, height } = layoutViewportSize();
        elements.canvas.width = Math.floor(width * dpr);
        elements.canvas.height = Math.floor(height * dpr);
        elements.canvas.style.width = `${width}px`;
        elements.canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        updateViewportCamera();
    }

    function validNumber(value) {
        return Number.isFinite(Number(value));
    }

    function clamp(value, min, max) {
        if (max < min) return min;
        return Math.max(min, Math.min(max, value));
    }

    function localPlayerForCamera(mapWidth = Infinity, mapHeight = Infinity) {
        const player = state.players.find(candidate => candidate.id === state.playerId);
        if (!player || player.alive === false || !validNumber(player.x) || !validNumber(player.y)) return null;
        if (player.x < 0 || player.x > mapWidth || player.y < 0 || player.y > mapHeight) return null;
        return player;
    }

    function isLargeMap(map) {
        return map.width > WORLD_FALLBACK.width || map.height > WORLD_FALLBACK.height;
    }

    function centeredOrClampedOffset(rawOffset, screenSize, worldSize, scale) {
        const scaledWorld = worldSize * scale;
        if (scaledWorld <= screenSize) return (screenSize - scaledWorld) / 2;
        return clamp(rawOffset, screenSize - scaledWorld, 0);
    }

    function keepWorldPointVisible(offset, point, screenSize, worldSize, scale) {
        const margin = Math.min(80, Math.max(24, screenSize * 0.08));
        let nextOffset = offset;
        const screenPoint = point * scale + nextOffset;
        if (screenPoint < margin) nextOffset += margin - screenPoint;
        if (screenPoint > screenSize - margin) nextOffset -= screenPoint - (screenSize - margin);
        return centeredOrClampedOffset(nextOffset, screenSize, worldSize, scale);
    }

    function mapIntersectsViewport(offsetX, offsetY, width, height, mapWidth, mapHeight, scale) {
        return offsetX < width && offsetY < height && offsetX + mapWidth * scale > 0 && offsetY + mapHeight * scale > 0;
    }

    function updateViewportCamera() {
        const map = state.map || WORLD_FALLBACK;
        const { width, height } = layoutViewportSize();
        const mapWidth = validNumber(map.width) && Number(map.width) > 0 ? Number(map.width) : WORLD_FALLBACK.width;
        const mapHeight = validNumber(map.height) && Number(map.height) > 0 ? Number(map.height) : WORLD_FALLBACK.height;
        const fitScale = Math.min(width / mapWidth, height / mapHeight);
        const followScale = Math.min(width / WORLD_FALLBACK.width, height / WORLD_FALLBACK.height);
        const player = localPlayerForCamera(mapWidth, mapHeight);
        const cameraActive = state.matchActive && isLargeMap({ width: mapWidth, height: mapHeight }) && Boolean(player);
        const scale = cameraActive ? followScale : fitScale;
        let offsetX = cameraActive
            ? centeredOrClampedOffset(width / 2 - player.x * scale, width, mapWidth, scale)
            : (width - mapWidth * scale) / 2;
        let offsetY = cameraActive
            ? centeredOrClampedOffset(height / 2 - player.y * scale, height, mapHeight, scale)
            : (height - mapHeight * scale) / 2;

        if (cameraActive) {
            offsetX = keepWorldPointVisible(offsetX, player.x, width, mapWidth, scale);
            offsetY = keepWorldPointVisible(offsetY, player.y, height, mapHeight, scale);
            if (!mapIntersectsViewport(offsetX, offsetY, width, height, mapWidth, mapHeight, scale)) {
                offsetX = (width - mapWidth * fitScale) / 2;
                offsetY = (height - mapHeight * fitScale) / 2;
                state.viewport = { width, height, scale: fitScale, offsetX, offsetY, cameraActive: false };
                return;
            }
        }

        state.viewport = { width, height, scale, offsetX, offsetY, cameraActive };
    }

    function worldToScreen(x, y) {
        return {
            x: state.viewport.offsetX + x * state.viewport.scale,
            y: state.viewport.offsetY + y * state.viewport.scale
        };
    }

    function screenToWorld(x, y) {
        updateViewportCamera();
        return {
            x: (x - state.viewport.offsetX) / state.viewport.scale,
            y: (y - state.viewport.offsetY) / state.viewport.scale
        };
    }

    function nearestOpponentAim() {
        const me = state.players.find(player => player.id === state.playerId && player.alive !== false);
        if (!me) return null;
        const nearest = state.players
            .filter(player => player.id !== state.playerId && player.alive !== false)
            .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0];
        if (!nearest) return null;
        return normalizeAim({ x: nearest.x - me.x, y: nearest.y - me.y });
    }

    function localPlayerAim() {
        const me = state.players.find(player => player.id === state.playerId);
        if (!me) return null;
        return normalizeAim({ x: me.aimX ?? me.aim?.x ?? 1, y: me.aimY ?? me.aim?.y ?? 0 });
    }

    function draw() {
        requestAnimationFrame(draw);
        if (elements.match.hidden && elements.result.hidden) return;

        updateViewportCamera();
        const width = state.viewport.width;
        const height = state.viewport.height;
        ctx.clearRect(0, 0, width, height);
        drawArenaBackdrop(width, height);
        drawMap();
        state.slimeTrails.forEach(drawSlimeTrail);
        drawLocalAimGuide();
        state.projectiles.forEach(drawProjectile);
        state.summons.forEach(drawSummon);
        state.players.forEach(drawMonster);
    }

    function drawArenaBackdrop(width, height) {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#152417');
        gradient.addColorStop(0.48, '#243319');
        gradient.addColorStop(1, '#1c2c35');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }

    function drawMap() {
        const map = state.map || WORLD_FALLBACK;
        const topLeft = worldToScreen(0, 0);
        const bottomRight = worldToScreen(map.width, map.height);
        const w = bottomRight.x - topLeft.x;
        const h = bottomRight.y - topLeft.y;
        const tileSize = Number(map.tileSize) || 40;

        ctx.save();
        ctx.fillStyle = '#eef3df';
        ctx.strokeStyle = 'rgba(45, 74, 58, 0.36)';
        ctx.lineWidth = 2;
        if (state.viewport.cameraActive) {
            const visibleX = Math.max(0, topLeft.x);
            const visibleY = Math.max(0, topLeft.y);
            const visibleRight = Math.min(state.viewport.width, bottomRight.x);
            const visibleBottom = Math.min(state.viewport.height, bottomRight.y);
            ctx.fillRect(visibleX, visibleY, Math.max(0, visibleRight - visibleX), Math.max(0, visibleBottom - visibleY));
            ctx.strokeRect(visibleX, visibleY, Math.max(0, visibleRight - visibleX), Math.max(0, visibleBottom - visibleY));
        } else {
            roundRect(topLeft.x, topLeft.y, w, h, 8);
            ctx.fill();
            ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(33, 48, 63, 0.14)';
        ctx.lineWidth = 1;
        for (let x = tileSize; x < map.width; x += tileSize) {
            const a = worldToScreen(x, 0);
            const b = worldToScreen(x, map.height);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
        for (let y = tileSize; y < map.height; y += tileSize) {
            const a = worldToScreen(0, y);
            const b = worldToScreen(map.width, y);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }

        const walls = Array.isArray(map.walls) && map.walls.length
            ? map.walls.map(wall => ({ x: wall.col * tileSize + tileSize / 2, y: wall.row * tileSize + tileSize / 2, w: tileSize, h: tileSize }))
            : (map.obstacles || []);
        walls.forEach(rect => {
            const center = worldToScreen(rect.x, rect.y);
            const rectW = rect.w * state.viewport.scale;
            const rectH = rect.h * state.viewport.scale;
            ctx.fillStyle = '#8a6b3d';
            roundRect(center.x - rectW / 2, center.y - rectH / 2, rectW, rectH, 3);
            ctx.fill();
            ctx.strokeStyle = 'rgba(58, 40, 19, 0.42)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = 'rgba(247, 246, 239, 0.16)';
            roundRect(center.x - rectW / 2 + 4, center.y - rectH / 2 + 4, rectW - 8, rectH - 8, 2);
            ctx.fill();
        });
        ctx.restore();
    }

    function drawSlimeTrail(trail) {
        const point = worldToScreen(trail.x, trail.y);
        const radius = (Number(trail.radius) || 34) * state.viewport.scale;
        ctx.save();
        ctx.globalAlpha = trail.ownerId === state.playerId ? 0.24 : 0.34;
        ctx.fillStyle = trail.ownerId === state.playerId ? '#65d96d' : '#40b95d';
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(15, 92, 35, 0.28)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    function drawSummon(summon) {
        const point = worldToScreen(summon.x, summon.y);
        const radius = (Number(summon.radius) || 14) * state.viewport.scale;
        ctx.save();
        ctx.fillStyle = summon.ownerId === state.playerId ? '#9dff76' : '#4ade80';
        ctx.shadowColor = '#53d769';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(point.x, point.y, radius * 1.15, radius * 0.92, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#12351d';
        ctx.beginPath();
        ctx.arc(point.x + radius * 0.25, point.y - radius * 0.18, radius * 0.12, 0, Math.PI * 2);
        ctx.arc(point.x + radius * 0.25, point.y + radius * 0.18, radius * 0.12, 0, Math.PI * 2);
        ctx.fill();
        const healthRatio = Math.max(0, Math.min(1, (Number(summon.health) || 0) / (Number(summon.maxHealth) || 500)));
        ctx.fillStyle = 'rgba(8, 13, 10, 0.74)';
        roundRect(point.x - radius, point.y - radius - 8, radius * 2, 4, 2);
        ctx.fill();
        ctx.fillStyle = '#d7f252';
        roundRect(point.x - radius, point.y - radius - 8, radius * 2 * healthRatio, 4, 2);
        ctx.fill();
        ctx.restore();
    }

    function drawMonster(player) {
        const point = worldToScreen(player.x, player.y);
        const radius = 22 * state.viewport.scale;
        const facingX = player.facingX ?? player.facing?.x ?? player.aimX ?? player.aim?.x ?? 1;
        const facingY = player.facingY ?? player.facing?.y ?? player.aimY ?? player.aim?.y ?? 0;
        const facingLength = Math.hypot(facingX, facingY) || 1;
        const angle = Math.atan2(facingY / facingLength, facingX / facingLength);
        const color = player.character === 'slime' ? '#7ee65b' : (player.monster?.color || '#6ee7b7');
        const accent = player.character === 'slime' ? '#167a34' : (player.monster?.accent || '#064e3b');

        ctx.save();
        ctx.globalAlpha = player.alive ? 1 : 0.36;
        ctx.translate(point.x, point.y);
        ctx.rotate(angle);

        if (player.id === state.playerId) {
            ctx.strokeStyle = '#d7f252';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, radius + 7, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 1.05, player.character === 'slime' ? radius * 0.78 : radius * 0.92, 0, 0, Math.PI * 2);
        ctx.fill();
        if (player.character === 'slime') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.26)';
            ctx.beginPath();
            ctx.ellipse(radius * 0.02, -radius * 0.18, radius * 0.54, radius * 0.22, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.moveTo(radius * 0.08, -radius * 0.9);
        ctx.lineTo(radius * 0.44, -radius * 1.35);
        ctx.lineTo(radius * 0.56, -radius * 0.62);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(radius * 0.08, radius * 0.9);
        ctx.lineTo(radius * 0.44, radius * 1.35);
        ctx.lineTo(radius * 0.56, radius * 0.62);
        ctx.fill();

        ctx.fillStyle = '#fffdf8';
        ctx.beginPath();
        ctx.arc(radius * 0.26, -radius * 0.3, radius * 0.2, 0, Math.PI * 2);
        ctx.arc(radius * 0.26, radius * 0.3, radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#141a12';
        ctx.beginPath();
        ctx.arc(radius * 0.33, -radius * 0.3, radius * 0.08, 0, Math.PI * 2);
        ctx.arc(radius * 0.33, radius * 0.3, radius * 0.08, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = accent;
        ctx.lineWidth = Math.max(2, radius * 0.1);
        ctx.beginPath();
        ctx.moveTo(radius * 0.28, radius * 0.04);
        ctx.lineTo(radius * 0.66, radius * 0.04);
        ctx.stroke();

        ctx.restore();

        drawNameplate(player, point, radius);
    }

    function drawLocalAimGuide() {
        const me = state.players.find(player => player.id === state.playerId);
        if (!me || !me.alive || !isAttackControlActive()) return;

        const aim = currentAim(me);
        const start = worldToScreen(me.x + aim.x * 34, me.y + aim.y * 34);
        const end = worldToScreen(me.x + aim.x * PROJECTILE_RANGE, me.y + aim.y * PROJECTILE_RANGE);

        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(215, 242, 82, 0.34)';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(215, 242, 82, 0.48)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(end.x, end.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function playerHudUnit(radius) {
        return radius / 22;
    }

    function drawNameplate(player, point, radius) {
        ctx.save();
        ctx.font = `700 ${Math.round(radius * 0.545)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(8, 13, 10, 0.72)';
        const text = player.nickname || 'Monster';
        const width = Math.min(radius * 5.64, ctx.measureText(text).width + radius * 0.82);
        const height = radius * 0.91;
        const nameY = point.y - radius * 3.64;
        roundRect(point.x - width / 2, nameY - height / 2 - radius * 0.14, width, height, radius * 0.36);
        ctx.fill();
        ctx.fillStyle = '#f8fff4';
        ctx.fillText(text, point.x, nameY + radius * 0.045);
        ctx.restore();
        drawPlayerHealthBar(player, point, radius);
    }

    function drawPlayerAmmoBar(player, point, radius, barY, barHeight, barWidth) {
        const hudUnit = playerHudUnit(radius);
        const maxAmmo = Number(player.maxAmmo) || 3;
        const ammo = Math.max(0, Math.min(maxAmmo, Math.floor(Number(player.ammo) || 0)));
        const gap = 3 * hudUnit;
        const cellW = (barWidth - gap * (maxAmmo - 1)) / maxAmmo;
        const cellH = 6 * hudUnit;
        const startX = point.x - barWidth / 2;
        const y = barY + barHeight + 4 * hudUnit;
        ctx.save();
        for (let i = 0; i < maxAmmo; i += 1) {
            const x = startX + i * (cellW + gap);
            ctx.fillStyle = i < ammo ? 'rgba(215, 242, 82, 0.92)' : 'rgba(255, 255, 255, 0.18)';
            ctx.strokeStyle = 'rgba(8, 13, 10, 0.72)';
            ctx.lineWidth = Math.max(1, radius * 0.045);
            roundRect(x, y, cellW, cellH, radius * 0.09);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }

    function drawPlayerHealthBar(player, point, radius) {
        const width = radius * 3.36;
        const height = radius * 0.68;
        const inset = radius * 0.09;
        const x = point.x - width / 2;
        const y = point.y - radius * 2.64;
        const maxHealth = Number(player.maxHealth) || PLAYER_MAX_HEALTH;
        const health = Math.max(0, Math.round(Number(player.health) || 0));
        const ratio = Math.max(0, Math.min(1, health / maxHealth));
        ctx.save();
        ctx.fillStyle = 'rgba(8, 13, 10, 0.82)';
        roundRect(x, y, width, height, height / 2);
        ctx.fill();
        ctx.fillStyle = ratio <= 0.32 ? '#e05252' : '#d7f252';
        roundRect(x + inset, y + inset, Math.max(0, (width - inset * 2) * ratio), Math.max(1, height - inset * 2), height / 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = Math.max(1, radius * 0.045);
        roundRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth, height / 2);
        ctx.stroke();
        ctx.font = `${Math.round(radius * 0.455)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = Math.max(1, radius * 0.14);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.72)';
        ctx.strokeText(String(health), point.x, y + height / 2);
        ctx.fillStyle = '#fffdf8';
        ctx.fillText(String(health), point.x, y + height / 2);
        ctx.restore();
        drawPlayerAmmoBar(player, point, radius, y, height, width);
    }

    function drawAmmoHud() {
        const me = state.players.find(player => player.id === state.playerId);
        if (!me || !me.alive) return;
        const maxAmmo = Number(me.maxAmmo) || 3;
        const ammo = Math.max(0, Math.min(maxAmmo, Math.floor(Number(me.ammo) || 0)));
        const size = 18;
        const gap = 8;
        const totalWidth = maxAmmo * size + (maxAmmo - 1) * gap;
        const startX = state.viewport.width - totalWidth - Math.max(18, state.viewport.width * 0.04);
        const y = state.viewport.height - Math.max(72, state.viewport.height * 0.12);
        ctx.save();
        for (let i = 0; i < maxAmmo; i += 1) {
            const x = startX + i * (size + gap);
            ctx.fillStyle = i < ammo ? 'rgba(215, 242, 82, 0.92)' : 'rgba(255, 255, 255, 0.18)';
            ctx.strokeStyle = 'rgba(8, 13, 10, 0.72)';
            ctx.lineWidth = 3;
            roundRect(x, y, size, size * 1.9, 8);
            ctx.fill();
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255, 253, 248, 0.82)';
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AMMO', startX + totalWidth / 2, y - 8);
        ctx.restore();
    }

    function rememberAndFilterProjectiles(projectiles) {
        const activeIds = new Set(projectiles.map(projectile => projectile.id));
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
            const visible = isProjectileWithinRange(projectile) && performance.now() - memory.firstSeenAt < 1400;
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

    function drawProjectile(projectile) {
        const point = worldToScreen(projectile.x, projectile.y);
        const isUltimate = projectile.kind === 'ultimate';
        const isSlimeProjectile = projectile.kind === 'slime';
        const radius = (isUltimate ? Number(projectile.radius) || 24 : (isSlimeProjectile ? Number(projectile.radius) || 11 : 7)) * state.viewport.scale;
        ctx.save();
        ctx.fillStyle = isUltimate
            ? (projectile.ownerId === state.playerId ? '#7dd3fc' : '#c084fc')
            : (isSlimeProjectile ? '#72e75f' : (projectile.ownerId === state.playerId ? '#d7f252' : '#f29b4b'));
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = isUltimate ? 28 : 14;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
        if (isUltimate) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
            ctx.lineWidth = Math.max(2, 3 * state.viewport.scale);
            ctx.stroke();
        }
        ctx.restore();
    }

    function roundRect(x, y, width, height, radius) {
        const r = Math.min(radius, width / 2, height / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + width - r, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + r);
        ctx.lineTo(x + width, y + height - r);
        ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
        ctx.lineTo(x + r, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
    }

    function setupStick(element, key) {
        const thumb = element.querySelector('.stick-thumb');
        const stick = state[key];
        const isRightStick = key === 'rightStick';
        const baseClass = isRightStick ? 'right-stick' : 'left-stick';
        const floatingClass = isRightStick ? 'right-stick-floating' : 'left-stick-floating';

        function isPointerForThisStick(event) {
            return stick.active && stick.pointerId === event.pointerId;
        }

        function clampCenter(clientX, clientY) {
            const screen = elements.match.getBoundingClientRect();
            const size = Math.min(element.offsetWidth || 120, element.offsetHeight || 120);
            const half = size / 2;
            const minX = screen.left + half + 8;
            const maxX = screen.right - half - 8;
            const minY = screen.top + half + 8;
            const maxY = screen.bottom - half - 8;
            return {
                x: Math.max(minX, Math.min(maxX, clientX)),
                y: Math.max(minY, Math.min(maxY, clientY))
            };
        }

        function aimFromPointer(pointer) {
            if (!isRightStick) return null;
            const me = state.players.find(player => player.id === state.playerId);
            if (!me) return state.lastAim;
            const world = screenToWorld(pointer.clientX, pointer.clientY);
            return normalizeAim({ x: world.x - me.x, y: world.y - me.y });
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

        function update(pointer) {
            const rect = element.getBoundingClientRect();
            const cx = stick.centerX || rect.left + rect.width / 2;
            const cy = stick.centerY || rect.top + rect.height / 2;
            const limit = rect.width * 0.34;
            const dx = pointer.clientX - cx;
            const dy = pointer.clientY - cy;
            const length = Math.hypot(dx, dy);
            if (Math.hypot(pointer.clientX - stick.startX, pointer.clientY - stick.startY) > 12) {
                stick.moved = true;
            }
            if (isRightStick && !stick.moved) {
                stick.x = 0;
                stick.y = 0;
                thumb.style.transform = 'translate(-50%, -50%)';
                return;
            }
            const pointerAim = aimFromPointer(pointer);
            const fallbackAim = isRightStick ? (pointerAim || state.lastAim) : { x: 0, y: 0 };
            const nx = length > 3 ? dx / length : fallbackAim.x;
            const ny = length > 3 ? dy / length : fallbackAim.y;
            const clamped = length > 3 ? Math.min(limit, length) : Math.min(limit, limit * 0.42);
            stick.x = nx * (clamped / limit);
            stick.y = ny * (clamped / limit);
            thumb.style.transform = `translate(calc(-50% + ${nx * clamped}px), calc(-50% + ${ny * clamped}px))`;
            if (isRightStick) {
                state.lastAim = normalizeAim({ x: nx, y: ny });
            }
        }

        function reset() {
            stick.active = false;
            stick.pointerId = null;
            stick.x = 0;
            stick.y = 0;
            stick.centerX = 0;
            stick.centerY = 0;
            stick.startX = 0;
            stick.startY = 0;
            stick.moved = false;
            stick.shotQueued = false;
            stick.instantAim = null;
            element.classList.remove('is-floating-stick', floatingClass);
            element.style.left = '';
            element.style.top = '';
            element.style.right = '';
            element.style.bottom = '';
            thumb.style.transform = 'translate(-50%, -50%)';
        }

        function begin(event) {
            if (!state.matchActive || stick.active) return;
            unlockAudio();
            event.preventDefault();
            stick.active = true;
            stick.pointerId = event.pointerId;
            stick.startX = event.clientX;
            stick.startY = event.clientY;
            stick.moved = false;
            stick.instantAim = isRightStick ? null : aimFromPointer(event);
            moveStickBase(event.clientX, event.clientY);
            if (elements.match.setPointerCapture) {
                elements.match.setPointerCapture(event.pointerId);
            }
            update(event);
        }

        function releasePointerCapture(pointerId) {
            if (elements.match.releasePointerCapture && elements.match.hasPointerCapture?.(pointerId)) {
                elements.match.releasePointerCapture(pointerId);
            }
        }

        function shotAimForRelease() {
            if (!isRightStick) return null;
            if (!stick.moved) return nearestOpponentAim() || localPlayerAim() || state.lastAim;
            if (Math.hypot(stick.x, stick.y) > 0.08) return stick;
            return nearestOpponentAim() || localPlayerAim() || state.lastAim;
        }

        function queueReleaseShotOnce() {
            if (!isRightStick || stick.shotQueued) return;
            stick.shotQueued = true;
            queueShot(shotAimForRelease());
        }

        function finish(event, shouldShoot) {
            if (!isPointerForThisStick(event)) return;
            event.preventDefault();
            if (isRightStick && shouldShoot) {
                queueReleaseShotOnce();
            }
            releasePointerCapture(event.pointerId);
            reset();
        }

        function finishAndShoot(event) {
            finish(event, true);
        }

        function finishTouch(event) {
            if (window.PointerEvent || !stick.active) return;
            event.preventDefault();
            if (isRightStick) {
                queueReleaseShotOnce();
            }
            reset();
        }

        function shouldStartFromHalf(event) {
            if (!state.matchActive || event.pointerType !== 'touch') return false;
            if (event.target.closest?.('button, input, label, fieldset, .hud')) return false;
            const screen = elements.match.getBoundingClientRect();
            const midpoint = screen.left + screen.width / 2;
            return isRightStick ? event.clientX >= midpoint : event.clientX < midpoint;
        }

        elements.match.addEventListener('pointerdown', event => {
            if (!shouldStartFromHalf(event)) return;
            begin(event);
        });
        element.addEventListener('pointerdown', event => {
            if (event.pointerType === 'touch' || !state.matchActive || stick.active) return;
            begin(event);
        });
        elements.match.addEventListener('pointermove', event => {
            if (!isPointerForThisStick(event)) return;
            event.preventDefault();
            update(event);
        });
        window.addEventListener('pointerup', finishAndShoot, { capture: true });
        window.addEventListener('pointercancel', finishAndShoot, { capture: true });
        elements.match.addEventListener('lostpointercapture', finishAndShoot);
        elements.match.addEventListener('touchend', finishTouch, { passive: false });
        elements.match.addEventListener('touchcancel', finishTouch, { passive: false });
        element.addEventListener('contextmenu', event => event.preventDefault());
        element.addEventListener('selectstart', event => event.preventDefault());
    }

    function normalizeAim(aim) {
        const x = Number(aim?.x) || 0;
        const y = Number(aim?.y) || 0;
        const length = Math.hypot(x, y);
        if (length < 0.001) return { x: 1, y: 0 };
        return { x: x / length, y: y / length };
    }

    function currentAim(player) {
        if (state.rightStick.active && Math.hypot(state.rightStick.x, state.rightStick.y) > 0.08) {
            return normalizeAim(state.rightStick);
        }
        if (state.mouseAim.active) return normalizeAim(state.mouseAim);
        if (state.queuedShots.length) return normalizeAim(state.queuedShots[0]);
        if (state.lastAim) return normalizeAim(state.lastAim);
        return normalizeAim({ x: player?.aimX ?? player?.aim?.x ?? 1, y: player?.aimY ?? player?.aim?.y ?? 0 });
    }

    function isAttackControlActive() {
        return (state.rightStick.active && Math.hypot(state.rightStick.x, state.rightStick.y) > 0.08)
            || state.mouseAim.active
            || state.queuedShots.length > 0;
    }

    function queueShot(aim) {
        const normalized = normalizeAim(aim);
        state.lastAim = normalized;
        state.queuedShots.push(normalized);
        sendQueuedShotNow();
    }

    function fireUltimate() {
        const me = state.players.find(player => player.id === state.playerId);
        const slimeHits = Math.min(4, Math.max(0, Number(me?.ultimateHits) || 0));
        const ready = me?.character === 'slime' ? slimeHits >= 1 : Boolean(me?.ultimateReady);
        if (!state.matchActive || !ready) return false;
        unlockAudio();
        const aim = currentAim(me);
        state.lastAim = aim;
        state.queuedUltimate = true;
        const sent = send(currentInput());
        if (!sent) return false;
        me.ultimateReady = false;
        me.ultimateHits = 0;
        updateUltimateButton(me);
        return true;
    }

    function sendQueuedShotNow() {
        if (!state.matchActive || !state.queuedShots.length) return false;
        if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return false;
        return send(currentInput());
    }

    function currentInput() {
        let move = { x: state.leftStick.x, y: state.leftStick.y };
        if (!state.leftStick.active) {
            move = {
                x: (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0),
                y: (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
            };
        }

        let aim = currentAim();
        let firing = false;
        let ultimate = false;
        if (state.queuedShots.length) {
            aim = state.queuedShots.shift();
            firing = true;
        }
        if (state.queuedUltimate) {
            aim = state.lastAim || aim;
            ultimate = true;
            state.queuedUltimate = false;
        }

        return {
            type: 'input',
            seq: ++state.inputSeq,
            move,
            aim,
            firing,
            ultimate
        };
    }

    function sendInputLoop() {
        if (state.matchActive) {
            send(currentInput());
        }
        window.setTimeout(sendInputLoop, SEND_MS);
    }

    function setupPointerAim() {
        elements.canvas.addEventListener('pointerdown', event => {
            if (event.pointerType === 'touch') return;
            unlockAudio();
            updateMouseAim(event);
            state.mouseAim.active = true;
        });
        elements.canvas.addEventListener('pointermove', event => {
            if (!state.mouseAim.active) return;
            updateMouseAim(event);
        });
        window.addEventListener('pointerup', () => {
            if (state.mouseAim.active) {
                queueShot(state.mouseAim);
            }
            state.mouseAim.active = false;
        });
    }

    function suppressMobileZoomGestures() {
        document.addEventListener('gesturestart', event => event.preventDefault());
        document.addEventListener('gesturechange', event => event.preventDefault());
        document.addEventListener('gestureend', event => event.preventDefault());
        document.addEventListener('dblclick', event => {
            if (document.body.classList.contains('is-playing')) {
                event.preventDefault();
            }
        }, { passive: false });
        document.addEventListener('touchend', event => {
            if (!document.body.classList.contains('is-playing')) return;
            const now = Date.now();
            if (now - state.lastTouchEndAt < 320) {
                event.preventDefault();
            }
            state.lastTouchEndAt = now;
        }, { passive: false });
    }

    function updateMouseAim(event) {
        const me = state.players.find(player => player.id === state.playerId);
        if (!me) return;
        const world = screenToWorld(event.clientX, event.clientY);
        const dx = world.x - me.x;
        const dy = world.y - me.y;
        const length = Math.hypot(dx, dy) || 1;
        state.mouseAim.x = dx / length;
        state.mouseAim.y = dy / length;
        state.lastAim = { x: state.mouseAim.x, y: state.mouseAim.y };
    }

    elements.joinForm.addEventListener('submit', event => {
        event.preventDefault();
        state.joining = true;
        state.requestedMode = getSelectedMode();
        connect();
        if (state.ws?.readyState === WebSocket.OPEN && state.serverReady) {
            joinQueue();
        }
    });

    elements.refreshBoard.addEventListener('click', loadLeaderboard);
    elements.selectedMapCard.addEventListener('click', openMapSelect);
    elements.selectedMapCard.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openMapSelect();
        }
    });
    elements.openMapSelect.addEventListener('click', openMapSelect);
    elements.closeMapSelect.addEventListener('click', closeMapSelect);
    elements.mapInfoButton.addEventListener('click', openMapInfo);
    elements.closeMapInfo.addEventListener('click', closeMapInfo);
    elements.mapInfoModal.addEventListener('click', event => { if (event.target === elements.mapInfoModal) closeMapInfo(); });
    elements.openCharacterSelect.addEventListener('click', openCharacterSelect);
    elements.closeCharacterSelect.addEventListener('click', closeCharacterSelect);
    elements.mapSelectEditor.addEventListener('click', openMapEditor);
    elements.openMapEditor?.addEventListener('click', openMapEditor);
    elements.closeMapEditor.addEventListener('click', closeMapEditor);
    elements.newMap.addEventListener('click', applyEditorSize);
    elements.saveMap.addEventListener('click', saveCustomMap);
    elements.customMapSelect.addEventListener('change', () => {
        selectMap(elements.customMapSelect.value || DEFAULT_OFFICIAL_MAP_ID);
    });
    elements.mapTools.forEach(button => {
        button.addEventListener('click', () => {
            state.editor.tool = button.dataset.tool || 'wall';
            elements.mapTools.forEach(candidate => candidate.classList.toggle('is-selected', candidate === button));
            elements.mapEditorStatus.textContent = state.editor.tool === 'spawn' ? '플레이어 생성 지점을 배치하세요.' : state.editor.tool === 'erase' ? '지울 칸을 선택하세요.' : '벽을 배치하세요.';
        });
    });
    elements.mapEditorCanvas.addEventListener('pointerdown', event => {
        event.preventDefault();
        elements.mapEditorCanvas.setPointerCapture?.(event.pointerId);
        editCellFromEvent(event);
    });
    elements.mapEditorCanvas.addEventListener('pointermove', event => {
        if (!elements.mapEditorCanvas.hasPointerCapture?.(event.pointerId)) return;
        event.preventDefault();
        editCellFromEvent(event);
    });
    elements.fullscreenExit.addEventListener('click', exitGameFullscreen);
    elements.ultimateButton?.addEventListener('pointerdown', event => {
        event.preventDefault();
        fireUltimate();
    });
    elements.modeInputs.forEach(input => {
        input.addEventListener('change', () => {
            state.requestedMode = null;
            localStorage.setItem(MODE_STORAGE_KEY, getSelectedMode());
            updateModeCopy();
        });
    });
    elements.characterInputs.forEach(input => {
        input.addEventListener('change', () => {
            localStorage.setItem(CHARACTER_STORAGE_KEY, getSelectedCharacter());
            renderLobbyCharacter();
        });
    });
    elements.botToggle.addEventListener('change', () => {
        localStorage.setItem(BOT_STORAGE_KEY, elements.botToggle.checked ? '1' : '0');
        localStorage.setItem(CUSTOM_MAP_STORAGE_KEY, selectedMapId());
    });
    elements.playAgain.addEventListener('click', () => {
        setScreen('lobby');
        state.joining = true;
        state.requestedMode = getSelectedMode();
        connect();
        if (state.ws?.readyState === WebSocket.OPEN && state.serverReady) {
            joinQueue();
        }
    });
    elements.backLobby.addEventListener('click', () => {
        setScreen('lobby');
    });

    window.addEventListener('keydown', event => keys.add(event.code));
    window.addEventListener('keyup', event => keys.delete(event.code));
    window.addEventListener('resize', resizeCanvas);
    document.addEventListener('fullscreenchange', resizeCanvas);

    setupStick(elements.leftStick, 'leftStick');
    setupStick(elements.rightStick, 'rightStick');
    setupPointerAim();
    suppressMobileZoomGestures();

    elements.nickname.value = localStorage.getItem(STORAGE_KEY) || '';
    elements.botToggle.checked = localStorage.getItem(BOT_STORAGE_KEY) === '1';
    const savedCharacter = localStorage.getItem(CHARACTER_STORAGE_KEY);
    if (savedCharacter && elements.characterInputs.some(input => input.value === savedCharacter)) {
        elements.characterInputs.forEach(input => {
            input.checked = input.value === savedCharacter;
        });
    }
    const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
    if (savedMode && elements.modeInputs.some(input => input.value === savedMode)) {
        elements.modeInputs.forEach(input => {
            input.checked = input.value === savedMode;
        });
    }
    state.selectedMapId = localStorage.getItem(CUSTOM_MAP_STORAGE_KEY) || DEFAULT_OFFICIAL_MAP_ID;
    renderLobbyCharacter();
    renderSelectedMapCard();
    renderCharacterSelectScreen();
    updateModeCopy();
    loadLeaderboard();
    loadCustomMaps();
    resizeCanvas();
    draw();
    sendInputLoop();
})();
