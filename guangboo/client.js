(() => {
    const WORLD_FALLBACK = { width: 960, height: 640, obstacles: [] };
    const SEND_MS = 33;
    const STORAGE_KEY = 'guangboo_nickname';
    const MODE_STORAGE_KEY = 'guangboo_match_mode';
    const CHARACTER_STORAGE_KEY = 'guangboo_character';
    const BOT_STORAGE_KEY = 'guangboo_fill_bots';
    const PROJECTILE_RANGE = 300;
    const PLAYER_MAX_HEALTH = 6000;
    const keys = new Set();

    const elements = {
        lobby: document.getElementById('lobbyScreen'),
        match: document.getElementById('matchScreen'),
        result: document.getElementById('resultScreen'),
        joinForm: document.getElementById('joinForm'),
        nickname: document.getElementById('nicknameInput'),
        botToggle: document.getElementById('botToggle'),
        modeInputs: [...document.querySelectorAll('input[name="matchMode"]')],
        characterInputs: [...document.querySelectorAll('input[name="character"]')],
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
            { key: 'duel', label: '1:1 결투', size: 2 },
            { key: 'survival', label: '4인 생존전', size: 4 }
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
        viewport: { width: 1, height: 1, scale: 1, offsetX: 0, offsetY: 0 }
    };

    function setScreen(name) {
        elements.lobby.hidden = name !== 'lobby';
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
        return elements.modeInputs.find(input => input.checked)?.value || 'duel';
    }

    function getSelectedCharacter() {
        return elements.characterInputs.find(input => input.checked)?.value || 'monster';
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
        elements.queueCopy.textContent = mode.key === 'duel'
            ? `${mode.label} - 1명 vs 1명`
            : `${mode.label} - 총 ${mode.size}명`;
        elements.alive.textContent = String(mode.size);
        setModeInputsDisabled(elements.joinButton.disabled);
    }

    function setMatchingUi(isMatching) {
        elements.joinButton.disabled = isMatching;
        elements.joinButton.textContent = isMatching ? '매칭 중' : '자동 매칭';
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
        setMatchingUi(true);
        state.joining = true;
        send({ type: 'joinQueue', nickname, mode, character, fillWithBots: elements.botToggle.checked });
    }

    function handleServerMessage(message) {
        if (message.type === 'hello') {
            state.playerId = message.playerId;
            if (Array.isArray(message.modes) && message.modes.length) {
                state.modes = message.modes;
            } else {
                state.modes = [{ key: 'survival', label: '4인 생존전', size: Number(message.requiredPlayers) || 4 }];
            }
            renderLeaderboard(message.leaderboard || []);
            state.serverReady = true;
            if (state.joining) {
                if (state.requestedMode && !state.modes.some(mode => mode.key === state.requestedMode)) {
                    state.joining = false;
                    elements.status.textContent = '서버가 1:1 모드를 아직 지원하지 않습니다. 서버를 재시작하세요.';
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
            const totalCopy = mode.key === 'duel' ? '총 2명' : `총 ${message.requiredPlayers}명`;
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
        const ready = Boolean(player?.ultimateReady);
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

    function resizeCanvas() {
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const width = window.innerWidth;
        const height = window.innerHeight;
        elements.canvas.width = Math.floor(width * dpr);
        elements.canvas.height = Math.floor(height * dpr);
        elements.canvas.style.width = `${width}px`;
        elements.canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const map = state.map || WORLD_FALLBACK;
        const scale = Math.min(width / map.width, height / map.height);
        state.viewport = {
            width,
            height,
            scale,
            offsetX: (width - map.width * scale) / 2,
            offsetY: (height - map.height * scale) / 2
        };
    }

    function worldToScreen(x, y) {
        return {
            x: state.viewport.offsetX + x * state.viewport.scale,
            y: state.viewport.offsetY + y * state.viewport.scale
        };
    }

    function screenToWorld(x, y) {
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
        roundRect(topLeft.x, topLeft.y, w, h, 8);
        ctx.fill();
        ctx.stroke();

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
        const ready = Boolean(me?.ultimateReady);
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
        });
    });
    elements.botToggle.addEventListener('change', () => {
        localStorage.setItem(BOT_STORAGE_KEY, elements.botToggle.checked ? '1' : '0');
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
    updateModeCopy();
    loadLeaderboard();
    resizeCanvas();
    draw();
    sendInputLoop();
})();
