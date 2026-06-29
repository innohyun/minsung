(() => {
    const WORLD_FALLBACK = { width: 960, height: 640, obstacles: [] };
    const SEND_MS = 33;
    const STORAGE_KEY = 'guangboo_nickname';
    const MODE_STORAGE_KEY = 'guangboo_match_mode';
    const BOT_STORAGE_KEY = 'guangboo_fill_bots';
    const PROJECTILE_RANGE = 230;
    const keys = new Set();

    const elements = {
        lobby: document.getElementById('lobbyScreen'),
        match: document.getElementById('matchScreen'),
        result: document.getElementById('resultScreen'),
        joinForm: document.getElementById('joinForm'),
        nickname: document.getElementById('nicknameInput'),
        botToggle: document.getElementById('botToggle'),
        modeInputs: [...document.querySelectorAll('input[name="matchMode"]')],
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
        lastResults: [],
        inputSeq: 0,
        leftStick: { active: false, x: 0, y: 0 },
        rightStick: { active: false, x: 0, y: 0 },
        mouseAim: { active: false, x: 1, y: 0 },
        lastAim: { x: 1, y: 0 },
        queuedShots: [],
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

    function getSelectedMode() {
        return elements.modeInputs.find(input => input.checked)?.value || 'duel';
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
        localStorage.setItem(MODE_STORAGE_KEY, mode);
        localStorage.setItem(BOT_STORAGE_KEY, elements.botToggle.checked ? '1' : '0');
        setMatchingUi(true);
        state.joining = true;
        send({ type: 'joinQueue', nickname, mode, fillWithBots: elements.botToggle.checked });
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
            state.projectiles = [];
            elements.connection.textContent = message.modeLabel || '매치 진행';
            setScreen('match');
            resizeCanvas();
            return;
        }

        if (message.type === 'state') {
            state.players = message.players || [];
            state.projectiles = (message.projectiles || []).filter(isProjectileWithinRange);
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

    function draw() {
        requestAnimationFrame(draw);
        if (elements.match.hidden && elements.result.hidden) return;

        const width = state.viewport.width;
        const height = state.viewport.height;
        ctx.clearRect(0, 0, width, height);
        drawArenaBackdrop(width, height);
        drawMap();
        drawLocalAimGuide();
        state.projectiles.forEach(drawProjectile);
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

        ctx.save();
        ctx.fillStyle = '#345339';
        ctx.strokeStyle = 'rgba(215, 242, 82, 0.32)';
        ctx.lineWidth = 2;
        roundRect(topLeft.x, topLeft.y, w, h, 8);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 1;
        for (let x = 80; x < map.width; x += 80) {
            const a = worldToScreen(x, 0);
            const b = worldToScreen(x, map.height);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
        for (let y = 80; y < map.height; y += 80) {
            const a = worldToScreen(0, y);
            const b = worldToScreen(map.width, y);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }

        (map.obstacles || []).forEach(rect => {
            const center = worldToScreen(rect.x, rect.y);
            const rectW = rect.w * state.viewport.scale;
            const rectH = rect.h * state.viewport.scale;
            ctx.fillStyle = '#8a6b3d';
            roundRect(center.x - rectW / 2, center.y - rectH / 2, rectW, rectH, 8);
            ctx.fill();
            ctx.fillStyle = 'rgba(247, 246, 239, 0.12)';
            roundRect(center.x - rectW / 2 + 5, center.y - rectH / 2 + 5, rectW - 10, rectH - 10, 5);
            ctx.fill();
        });
        ctx.restore();
    }

    function drawMonster(player) {
        const point = worldToScreen(player.x, player.y);
        const radius = 22 * state.viewport.scale;
        const aimX = player.aimX ?? player.aim?.x ?? 1;
        const aimY = player.aimY ?? player.aim?.y ?? 0;
        const angle = Math.atan2(aimY, aimX);
        const color = player.monster?.color || '#6ee7b7';
        const accent = player.monster?.accent || '#064e3b';

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
        ctx.ellipse(0, 0, radius * 1.05, radius * 0.92, 0, 0, Math.PI * 2);
        ctx.fill();

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
        ctx.strokeStyle = 'rgba(5, 9, 6, 0.62)';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(215, 242, 82, 0.64)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(215, 242, 82, 0.82)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(end.x, end.y, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    function drawNameplate(player, point, radius) {
        ctx.save();
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(8, 13, 10, 0.72)';
        const text = player.nickname || 'Monster';
        const width = Math.min(120, ctx.measureText(text).width + 18);
        roundRect(point.x - width / 2, point.y - radius - 24, width, 20, 8);
        ctx.fill();
        ctx.fillStyle = '#f8fff4';
        ctx.fillText(text, point.x, point.y - radius - 10);
        ctx.restore();
        drawPlayerHealthBar(player, point, radius);
    }

    function drawPlayerHealthBar(player, point, radius) {
        const width = 58 * state.viewport.scale;
        const height = Math.max(5, 7 * state.viewport.scale);
        const x = point.x - width / 2;
        const y = point.y - radius - 37 * state.viewport.scale;
        const ratio = Math.max(0, Math.min(1, (Number(player.health) || 0) / 100));
        ctx.save();
        ctx.fillStyle = 'rgba(8, 13, 10, 0.78)';
        roundRect(x, y, width, height, height / 2);
        ctx.fill();
        ctx.fillStyle = ratio <= 0.32 ? '#e05252' : '#d7f252';
        roundRect(x + 2, y + 2, Math.max(0, (width - 4) * ratio), Math.max(1, height - 4), height / 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 1;
        roundRect(x + 0.5, y + 0.5, width - 1, height - 1, height / 2);
        ctx.stroke();
        ctx.restore();
    }

    function isProjectileWithinRange(projectile) {
        const maxDistance = Number(projectile.maxDistance) || PROJECTILE_RANGE;
        if (Number.isFinite(projectile.traveled) && projectile.traveled > maxDistance) return false;
        if (Number.isFinite(projectile.startX) && Number.isFinite(projectile.startY)) {
            const distance = Math.hypot(projectile.x - projectile.startX, projectile.y - projectile.startY);
            return distance <= maxDistance + 8;
        }
        return true;
    }

    function drawProjectile(projectile) {
        const point = worldToScreen(projectile.x, projectile.y);
        const radius = 7 * state.viewport.scale;
        ctx.save();
        ctx.fillStyle = projectile.ownerId === state.playerId ? '#d7f252' : '#f29b4b';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
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

        function update(pointer) {
            const rect = element.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const limit = rect.width * 0.34;
            const dx = pointer.clientX - cx;
            const dy = pointer.clientY - cy;
            const length = Math.hypot(dx, dy);
            const clamped = Math.min(limit, length);
            const nx = length > 0 ? dx / length : 0;
            const ny = length > 0 ? dy / length : 0;
            stick.x = nx * (clamped / limit);
            stick.y = ny * (clamped / limit);
            thumb.style.transform = `translate(calc(-50% + ${nx * clamped}px), calc(-50% + ${ny * clamped}px))`;
            if (key === 'rightStick' && Math.hypot(stick.x, stick.y) > 0.12) {
                state.lastAim = normalizeAim(stick);
            }
        }

        function reset() {
            stick.active = false;
            stick.x = 0;
            stick.y = 0;
            thumb.style.transform = 'translate(-50%, -50%)';
        }

        function finish(event, shouldShoot) {
            event.preventDefault();
            if (!stick.active) return;
            if (key === 'rightStick' && shouldShoot) {
                const aim = Math.hypot(stick.x, stick.y) > 0.08 ? stick : state.lastAim;
                queueShot(aim);
            }
            reset();
        }

        element.addEventListener('pointerdown', event => {
            event.preventDefault();
            stick.active = true;
            element.setPointerCapture(event.pointerId);
            update(event);
        });
        element.addEventListener('pointermove', event => {
            if (!stick.active) return;
            event.preventDefault();
            update(event);
        });
        element.addEventListener('pointerup', event => finish(event, true));
        element.addEventListener('lostpointercapture', event => finish(event, true));
        element.addEventListener('pointercancel', event => finish(event, false));
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
    }

    function currentInput() {
        let move = { ...state.leftStick };
        if (!state.leftStick.active) {
            move = {
                x: (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0),
                y: (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
            };
        }

        let aim = currentAim();
        let firing = false;
        if (state.queuedShots.length) {
            aim = state.queuedShots.shift();
            firing = true;
        }

        return {
            type: 'input',
            seq: ++state.inputSeq,
            move,
            aim,
            firing
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
    elements.modeInputs.forEach(input => {
        input.addEventListener('change', () => {
            state.requestedMode = null;
            localStorage.setItem(MODE_STORAGE_KEY, getSelectedMode());
            updateModeCopy();
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
