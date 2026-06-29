(function () {
    "use strict";

    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const coinCountEl = document.getElementById("coinCount");
    const stageCountEl = document.getElementById("stageCount");
    const timeCountEl = document.getElementById("timeCount");
    const bestCountEl = document.getElementById("bestCount");
    const overlay = document.getElementById("statusOverlay");
    const statusKicker = document.getElementById("statusKicker");
    const statusTitle = document.getElementById("statusTitle");
    const statusText = document.getElementById("statusText");
    const startButton = document.getElementById("startButton");
    const restartButton = document.getElementById("restartButton");
    const fullscreenButton = document.getElementById("fullscreenButton");
    const exitFullscreenButton = document.getElementById("exitFullscreenButton");
    const gameShell = document.querySelector(".game-shell");

    const WIDTH = 960;
    const HEIGHT = 540;
    const FLOOR_Y = 452;
    const GRAVITY = 1850;
    const MOVE_SPEED = 285;
    const JUMP_SPEED = 690;
    const MAX_FALL = 980;
    const BEST_KEY = "pixelHillRunnerBestScore";
    const PLAYER_MAX_HEALTH = 3;
    const ATTACK_RANGE = 280;
    const PROJECTILE_SPEED = 660;
    const PROJECTILE_SIZE = 12;
    const ATTACK_COOLDOWN = 0.18;

    const STAGES = [
        {
            width: 4300,
            start: { x: 90, y: 350 },
            goal: { x: 4080, y: 314, w: 42, h: 138 },
            solids: [
                { x: 0, y: FLOOR_Y, w: 700, h: 120, kind: "ground" },
                { x: 820, y: FLOOR_Y, w: 620, h: 120, kind: "ground" },
                { x: 1560, y: FLOOR_Y, w: 740, h: 120, kind: "ground" },
                { x: 2420, y: FLOOR_Y, w: 560, h: 120, kind: "ground" },
                { x: 3080, y: FLOOR_Y, w: 1220, h: 120, kind: "ground" },
                { x: 470, y: 338, w: 180, h: 32, kind: "platform" },
                { x: 980, y: 360, w: 170, h: 32, kind: "platform" },
                { x: 1220, y: 295, w: 170, h: 32, kind: "platform" },
                { x: 1740, y: 348, w: 220, h: 32, kind: "platform" },
                { x: 2130, y: 286, w: 180, h: 32, kind: "platform" },
                { x: 2640, y: 348, w: 210, h: 32, kind: "platform" },
                { x: 3200, y: 330, w: 180, h: 32, kind: "platform" },
                { x: 3560, y: 278, w: 180, h: 32, kind: "platform" },
                { x: 3860, y: 360, w: 150, h: 32, kind: "platform" }
            ],
            coins: [
                { x: 210, y: 390 }, { x: 285, y: 390 }, { x: 360, y: 390 },
                { x: 520, y: 292 }, { x: 590, y: 292 },
                { x: 1018, y: 315 }, { x: 1088, y: 315 },
                { x: 1260, y: 250 }, { x: 1330, y: 250 },
                { x: 1660, y: 390 }, { x: 1785, y: 304 }, { x: 1870, y: 304 },
                { x: 2180, y: 240 }, { x: 2260, y: 240 },
                { x: 2560, y: 390 }, { x: 2690, y: 304 }, { x: 2770, y: 304 },
                { x: 3190, y: 282 }, { x: 3270, y: 282 },
                { x: 3580, y: 232 }, { x: 3660, y: 232 },
                { x: 3940, y: 316 }, { x: 4020, y: 316 }
            ],
            enemies: [
                { x: 930, y: FLOOR_Y - 30, w: 34, h: 30, minX: 850, maxX: 1320, speed: 70 },
                { x: 1840, y: FLOOR_Y - 30, w: 34, h: 30, minX: 1600, maxX: 2220, speed: 90 },
                { x: 2500, y: FLOOR_Y - 30, w: 34, h: 30, minX: 2440, maxX: 2940, speed: 80 },
                { x: 3350, y: FLOOR_Y - 30, w: 34, h: 30, minX: 3100, maxX: 3770, speed: 95 }
            ]
        },
        {
            width: 5000,
            start: { x: 90, y: 350 },
            goal: { x: 4760, y: 314, w: 42, h: 138 },
            solids: [
                { x: 0, y: FLOOR_Y, w: 650, h: 120, kind: "ground" },
                { x: 790, y: FLOOR_Y, w: 460, h: 120, kind: "ground" },
                { x: 1400, y: FLOOR_Y, w: 480, h: 120, kind: "ground" },
                { x: 2030, y: FLOOR_Y, w: 410, h: 120, kind: "ground" },
                { x: 2590, y: FLOOR_Y, w: 630, h: 120, kind: "ground" },
                { x: 3390, y: FLOOR_Y, w: 490, h: 120, kind: "ground" },
                { x: 4040, y: FLOOR_Y, w: 960, h: 120, kind: "ground" },
                { x: 390, y: 340, w: 160, h: 32, kind: "platform" },
                { x: 655, y: 292, w: 150, h: 32, kind: "platform" },
                { x: 955, y: 352, w: 160, h: 32, kind: "platform" },
                { x: 1160, y: 286, w: 150, h: 32, kind: "platform" },
                { x: 1510, y: 336, w: 180, h: 32, kind: "platform" },
                { x: 1770, y: 282, w: 150, h: 32, kind: "platform" },
                { x: 2180, y: 360, w: 160, h: 32, kind: "platform" },
                { x: 2370, y: 302, w: 145, h: 32, kind: "platform" },
                { x: 2780, y: 340, w: 190, h: 32, kind: "platform" },
                { x: 3070, y: 284, w: 160, h: 32, kind: "platform" },
                { x: 3500, y: 332, w: 180, h: 32, kind: "platform" },
                { x: 3750, y: 270, w: 145, h: 32, kind: "platform" },
                { x: 4230, y: 354, w: 175, h: 32, kind: "platform" },
                { x: 4530, y: 292, w: 160, h: 32, kind: "platform" }
            ],
            coins: [
                { x: 220, y: 390 }, { x: 300, y: 390 }, { x: 470, y: 294 },
                { x: 700, y: 246 }, { x: 770, y: 246 },
                { x: 870, y: 390 }, { x: 1010, y: 306 }, { x: 1085, y: 306 },
                { x: 1195, y: 240 }, { x: 1265, y: 240 },
                { x: 1485, y: 390 }, { x: 1550, y: 290 }, { x: 1635, y: 290 },
                { x: 1805, y: 236 }, { x: 1875, y: 236 },
                { x: 2135, y: 390 }, { x: 2225, y: 314 }, { x: 2410, y: 256 },
                { x: 2670, y: 390 }, { x: 2825, y: 294 }, { x: 2905, y: 294 },
                { x: 3105, y: 238 }, { x: 3180, y: 238 },
                { x: 3485, y: 390 }, { x: 3545, y: 286 }, { x: 3630, y: 286 },
                { x: 3785, y: 224 }, { x: 3855, y: 224 },
                { x: 4175, y: 390 }, { x: 4300, y: 308 }, { x: 4380, y: 308 },
                { x: 4565, y: 246 }, { x: 4640, y: 246 }
            ],
            enemies: [
                { x: 840, y: FLOOR_Y - 30, w: 34, h: 30, minX: 800, maxX: 1210, speed: 105 },
                { x: 1480, y: FLOOR_Y - 30, w: 34, h: 30, minX: 1420, maxX: 1840, speed: -95 },
                { x: 2110, y: FLOOR_Y - 30, w: 34, h: 30, minX: 2050, maxX: 2390, speed: 115 },
                { x: 2700, y: FLOOR_Y - 30, w: 34, h: 30, minX: 2600, maxX: 3180, speed: 100 },
                { x: 3460, y: FLOOR_Y - 30, w: 34, h: 30, minX: 3410, maxX: 3830, speed: -110 },
                { x: 4170, y: FLOOR_Y - 30, w: 34, h: 30, minX: 4050, maxX: 4710, speed: 120 }
            ]
        }
    ];

    const input = {
        left: false,
        right: false,
        jump: false,
        attack: false
    };
    const pointerControls = new Map();
    const bgImage = new Image();
    bgImage.src = "./assets/pixel-platformer-bg.png";

    let bestScore = readBestScore();
    let state = createInitialState();
    let lastTime = 0;
    let accumulator = 0;
    let running = false;
    let previousJump = false;
    let previousAttack = false;

    function createInitialState(stageIndex = 0, carry = {}) {
        const level = STAGES[stageIndex];
        return {
            mode: "ready",
            stageIndex,
            level,
            elapsed: carry.elapsed || 0,
            cameraX: 0,
            coins: level.coins.map((coin) => ({ ...coin, collected: false })),
            enemies: level.enemies.map((enemy) => ({ ...enemy, dir: enemy.speed >= 0 ? 1 : -1, active: true })),
            player: {
                x: level.start.x,
                y: level.start.y,
                w: 28,
                h: 44,
                vx: 0,
                vy: 0,
                grounded: false,
                facing: 1,
                health: carry.health || PLAYER_MAX_HEALTH,
                maxHealth: PLAYER_MAX_HEALTH,
                attackCooldown: 0,
                respawns: carry.respawns || 0,
                invulnerable: 0
            },
            projectiles: [],
            collectedCoins: carry.collectedCoins || 0,
            score: 0
        };
    }

    function readBestScore() {
        try {
            const value = Number(localStorage.getItem(BEST_KEY) || "0");
            return Number.isFinite(value) ? value : 0;
        } catch (_) {
            return 0;
        }
    }

    function writeBestScore(value) {
        bestScore = Math.max(bestScore, value);
        try {
            localStorage.setItem(BEST_KEY, String(bestScore));
        } catch (_) { }
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function intersects(a, b) {
        return a.x < b.x + b.w
            && a.x + a.w > b.x
            && a.y < b.y + b.h
            && a.y + a.h > b.y;
    }

    function startGame() {
        startStage(0);
    }

    function restartGame() {
        startGame();
    }

    function continueGame() {
        if (state.mode === "stageClear") {
            startStage(state.stageIndex + 1, {
                elapsed: state.elapsed,
                collectedCoins: state.collectedCoins,
                respawns: state.player.respawns
            });
            return;
        }

        startGame();
    }

    function startStage(stageIndex, carry) {
        const wasRunning = running;
        state = createInitialState(stageIndex, carry);
        state.mode = "playing";
        running = true;
        previousJump = false;
        previousAttack = false;
        hideOverlay();
        updateHud();
        if (!wasRunning) {
            lastTime = 0;
            accumulator = 0;
            window.requestAnimationFrame(frame);
        }
    }

    function showOverlay(kicker, title, text, actionLabel) {
        statusKicker.textContent = kicker;
        statusTitle.textContent = title;
        statusText.textContent = text;
        startButton.textContent = actionLabel;
        overlay.classList.remove("is-hidden");
    }

    function hideOverlay() {
        overlay.classList.add("is-hidden");
    }

    function finishGame() {
        if (state.mode === "finished") return;
        state.mode = "finished";
        running = false;
        state.score = calculateScore();
        writeBestScore(state.score);
        updateHud();
        showOverlay(
            "CLEAR",
            "도착 성공",
            `2스테이지까지 완료했습니다. 최종 점수는 ${state.score}점입니다.`,
            "다시 시작"
        );
    }

    function clearStage() {
        if (state.mode === "stageClear") return;
        state.mode = "stageClear";
        running = false;
        updateHud();
        showOverlay(
            "STAGE CLEAR",
            `${state.stageIndex + 1}스테이지 클리어`,
            `${state.stageIndex + 2}스테이지가 열렸습니다. 코인과 시간 기록은 이어집니다.`,
            `${state.stageIndex + 2}스테이지 시작`
        );
    }

    function failAndRespawn() {
        const player = state.player;
        const level = state.level;
        player.respawns += 1;
        player.x = level.start.x;
        player.y = level.start.y;
        player.vx = 0;
        player.vy = 0;
        player.grounded = false;
        player.invulnerable = 1.4;
        player.attackCooldown = 0;
        state.projectiles = [];
        state.cameraX = 0;
    }

    function calculateScore() {
        const timeBonus = Math.max(0, STAGES.length * 1200 - Math.floor(state.elapsed * 8));
        const coinBonus = state.collectedCoins * 100;
        const respawnPenalty = state.player.respawns * 120;
        return Math.max(0, timeBonus + coinBonus - respawnPenalty);
    }

    function frame(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const delta = Math.min(0.05, (timestamp - lastTime) / 1000);
        lastTime = timestamp;
        accumulator += delta;

        while (accumulator >= 1 / 60) {
            update(1 / 60);
            accumulator -= 1 / 60;
        }

        draw();
        if (running) {
            window.requestAnimationFrame(frame);
        } else {
            lastTime = 0;
            accumulator = 0;
        }
    }

    function update(dt) {
        if (state.mode !== "playing") return;
        state.elapsed += dt;
        updatePlayer(dt);
        updateEnemies(dt);
        updateProjectiles(dt);
        collectCoins();
        checkEnemyCollisions();
        checkGoal();
        updateCamera();
        updateHud();
    }

    function updatePlayer(dt) {
        const player = state.player;
        let move = 0;
        if (input.left) move -= 1;
        if (input.right) move += 1;
        player.vx = move * MOVE_SPEED;
        if (move !== 0) player.facing = move;

        const jumpPressed = input.jump && !previousJump;
        previousJump = input.jump;
        if (jumpPressed && player.grounded) {
            player.vy = -JUMP_SPEED;
            player.grounded = false;
        }

        const attackPressed = input.attack && !previousAttack;
        previousAttack = input.attack;
        if (player.attackCooldown > 0) {
            player.attackCooldown = Math.max(0, player.attackCooldown - dt);
        }
        if (attackPressed && player.attackCooldown <= 0) {
            fireProjectile();
            player.attackCooldown = ATTACK_COOLDOWN;
        }

        player.vy = clamp(player.vy + GRAVITY * dt, -JUMP_SPEED, MAX_FALL);
        player.x += player.vx * dt;
        resolveHorizontal(player);
        player.y += player.vy * dt;
        resolveVertical(player);
        player.x = clamp(player.x, 0, state.level.width - player.w);

        if (player.invulnerable > 0) {
            player.invulnerable = Math.max(0, player.invulnerable - dt);
        }

        if (player.y > HEIGHT + 180) {
            failAndRespawn();
        }
    }

    function resolveHorizontal(player) {
        for (const solid of state.level.solids) {
            if (!intersects(player, solid)) continue;
            if (player.vx > 0) {
                player.x = solid.x - player.w;
            } else if (player.vx < 0) {
                player.x = solid.x + solid.w;
            }
            player.vx = 0;
        }
    }

    function resolveVertical(player) {
        player.grounded = false;
        for (const solid of state.level.solids) {
            if (!intersects(player, solid)) continue;
            if (player.vy > 0) {
                player.y = solid.y - player.h;
                player.vy = 0;
                player.grounded = true;
            } else if (player.vy < 0) {
                player.y = solid.y + solid.h;
                player.vy = 0;
            }
        }
    }

    function updateEnemies(dt) {
        for (const enemy of state.enemies) {
            if (!enemy.active) continue;
            enemy.x += enemy.speed * enemy.dir * dt;
            if (enemy.x <= enemy.minX) {
                enemy.x = enemy.minX;
                enemy.dir = 1;
            } else if (enemy.x + enemy.w >= enemy.maxX) {
                enemy.x = enemy.maxX - enemy.w;
                enemy.dir = -1;
            }
        }
    }

    function getAimTarget() {
        const player = state.player;
        const originX = player.x + player.w / 2 + player.facing * 18;
        const originY = player.y + player.h * 0.46;
        const targetX = clamp(originX + player.facing * ATTACK_RANGE, 0, state.level.width);
        return { originX, originY, targetX, targetY: originY, direction: player.facing >= 0 ? 1 : -1 };
    }

    function fireProjectile() {
        if (state.mode !== "playing") return;
        const aim = getAimTarget();
        state.projectiles.push({
            x: aim.originX - PROJECTILE_SIZE / 2,
            y: aim.originY - PROJECTILE_SIZE / 2,
            w: PROJECTILE_SIZE,
            h: PROJECTILE_SIZE,
            vx: PROJECTILE_SPEED * aim.direction,
            targetX: aim.targetX,
            active: true
        });
    }

    function updateProjectiles(dt) {
        for (const projectile of state.projectiles) {
            if (!projectile.active) continue;
            projectile.x += projectile.vx * dt;
            const reachedAim = projectile.vx >= 0
                ? projectile.x + projectile.w / 2 >= projectile.targetX
                : projectile.x + projectile.w / 2 <= projectile.targetX;
            if (reachedAim) {
                projectile.active = false;
                continue;
            }
            for (const enemy of state.enemies) {
                if (!enemy.active || !intersects(projectile, enemy)) continue;
                enemy.active = false;
                projectile.active = false;
                break;
            }
        }
        state.projectiles = state.projectiles.filter((projectile) => projectile.active);
    }

    function collectCoins() {
        const player = state.player;
        for (const coin of state.coins) {
            if (coin.collected) continue;
            const coinBox = { x: coin.x - 13, y: coin.y - 13, w: 26, h: 26 };
            if (intersects(player, coinBox)) {
                coin.collected = true;
                state.collectedCoins += 1;
            }
        }
    }

    function checkEnemyCollisions() {
        const player = state.player;
        if (player.invulnerable > 0) return;
        for (const enemy of state.enemies) {
            if (!enemy.active || !intersects(player, enemy)) continue;
            const playerBottom = player.y + player.h;
            const stompLine = enemy.y + enemy.h * 0.42;
            if (player.vy > 120 && playerBottom <= stompLine + 18) {
                enemy.active = false;
                player.vy = -JUMP_SPEED * 0.62;
                player.grounded = false;
            } else {
                damagePlayer();
            }
            break;
        }
    }

    function damagePlayer() {
        const player = state.player;
        player.health = Math.max(0, player.health - 1);
        failAndRespawn();
        if (player.health <= 0) {
            player.health = player.maxHealth;
        }
    }

    function checkGoal() {
        const player = state.player;
        if (!intersects(player, state.level.goal)) return;
        if (state.stageIndex < STAGES.length - 1) {
            clearStage();
        } else {
            finishGame();
        }
    }

    function updateCamera() {
        const player = state.player;
        const target = player.x + player.w / 2 - WIDTH * 0.42;
        state.cameraX += (target - state.cameraX) * 0.12;
        state.cameraX = clamp(state.cameraX, 0, state.level.width - WIDTH);
    }

    function updateHud() {
        coinCountEl.textContent = String(state.collectedCoins);
        stageCountEl.textContent = `${state.stageIndex + 1}/${STAGES.length}`;
        timeCountEl.textContent = state.elapsed.toFixed(1);
        bestCountEl.textContent = String(bestScore);
    }

    function draw() {
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        drawBackground();
        ctx.save();
        ctx.translate(-Math.floor(state.cameraX), 0);
        drawSolids();
        drawCoins();
        drawGoal();
        drawEnemies();
        drawProjectiles();
        if (input.attack && state.mode === "playing") drawAimReticle();
        drawPlayer();
        ctx.restore();
    }

    function drawBackground() {
        if (bgImage.complete && bgImage.naturalWidth > 0) {
            const scaledHeight = HEIGHT;
            const scaledWidth = Math.ceil(bgImage.naturalWidth * (scaledHeight / bgImage.naturalHeight));
            const parallax = Math.floor(state.cameraX * 0.18) % scaledWidth;
            for (let x = -parallax - scaledWidth; x < WIDTH + scaledWidth; x += scaledWidth) {
                ctx.drawImage(bgImage, x, 0, scaledWidth, scaledHeight);
            }
            drawStageTint();
            return;
        }

        const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        sky.addColorStop(0, "#72d7ff");
        sky.addColorStop(0.6, "#b8f1df");
        sky.addColorStop(1, "#69c76d");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = "rgba(255,255,255,0.72)";
        drawCloud(130, 96, 1.1);
        drawCloud(600, 150, 0.9);
        drawCloud(790, 92, 0.8);
        drawStageTint();
    }

    function drawStageTint() {
        if (state.stageIndex !== 1) return;
        ctx.fillStyle = "rgba(255, 135, 76, 0.16)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = "rgba(69, 54, 122, 0.1)";
        ctx.fillRect(0, FLOOR_Y - 72, WIDTH, HEIGHT - FLOOR_Y + 72);
    }

    function drawCloud(x, y, scale) {
        ctx.fillRect(x, y + 14 * scale, 80 * scale, 20 * scale);
        ctx.fillRect(x + 16 * scale, y, 22 * scale, 30 * scale);
        ctx.fillRect(x + 42 * scale, y + 4 * scale, 30 * scale, 26 * scale);
    }

    function drawSolids() {
        for (const solid of state.level.solids) {
            if (!isVisible(solid.x, solid.w)) continue;
            if (solid.kind === "ground") {
                ctx.fillStyle = "#4fbb5f";
                ctx.fillRect(solid.x, solid.y, solid.w, 14);
                ctx.fillStyle = "#2c7b45";
                for (let x = solid.x; x < solid.x + solid.w; x += 18) {
                    ctx.fillRect(x, solid.y + 2, 10, 5);
                }
                ctx.fillStyle = "#7a4b35";
                ctx.fillRect(solid.x, solid.y + 14, solid.w, solid.h - 14);
                ctx.fillStyle = "#5b3428";
                for (let x = solid.x + 8; x < solid.x + solid.w; x += 38) {
                    for (let y = solid.y + 24; y < solid.y + solid.h; y += 30) {
                        ctx.fillRect(x, y, 22, 4);
                    }
                }
            } else {
                ctx.fillStyle = "#55c46c";
                ctx.fillRect(solid.x, solid.y, solid.w, 10);
                ctx.fillStyle = "#8b5c3d";
                ctx.fillRect(solid.x, solid.y + 10, solid.w, solid.h - 10);
                ctx.fillStyle = "#6d432f";
                ctx.fillRect(solid.x, solid.y + solid.h - 6, solid.w, 6);
            }
        }
    }

    function drawCoins() {
        for (const coin of state.coins) {
            if (coin.collected || !isVisible(coin.x - 20, 40)) continue;
            const bob = Math.sin((state.elapsed * 5) + coin.x * 0.02) * 3;
            ctx.fillStyle = "#f9d95b";
            ctx.fillRect(coin.x - 9, coin.y - 12 + bob, 18, 24);
            ctx.fillStyle = "#fff2a0";
            ctx.fillRect(coin.x - 4, coin.y - 8 + bob, 5, 16);
            ctx.fillStyle = "#d89c24";
            ctx.fillRect(coin.x + 6, coin.y - 8 + bob, 3, 18);
        }
    }

    function drawGoal() {
        const goal = state.level.goal;
        if (!isVisible(goal.x - 16, goal.w + 40)) return;
        ctx.fillStyle = "#17384b";
        ctx.fillRect(goal.x, goal.y, 8, goal.h);
        ctx.fillStyle = "#f05a4f";
        ctx.fillRect(goal.x + 8, goal.y + 10, 50, 30);
        ctx.fillStyle = "#ffd76a";
        ctx.fillRect(goal.x + 8, goal.y + 40, 38, 24);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(goal.x + 20, goal.y + 16, 12, 12);
        ctx.fillStyle = "#17384b";
        ctx.fillRect(goal.x - 10, goal.y + goal.h, 30, 8);
    }

    function drawEnemies() {
        for (const enemy of state.enemies) {
            if (!enemy.active || !isVisible(enemy.x, enemy.w)) continue;
            ctx.fillStyle = "#304a5b";
            ctx.fillRect(enemy.x, enemy.y + 8, enemy.w, enemy.h - 8);
            ctx.fillStyle = "#46677b";
            ctx.fillRect(enemy.x + 4, enemy.y, enemy.w - 8, 12);
            ctx.fillStyle = "#ffcf6b";
            ctx.fillRect(enemy.x + (enemy.dir > 0 ? 22 : 8), enemy.y + 10, 5, 5);
            ctx.fillStyle = "#1b2c36";
            ctx.fillRect(enemy.x + 5, enemy.y + enemy.h - 4, 8, 4);
            ctx.fillRect(enemy.x + enemy.w - 13, enemy.y + enemy.h - 4, 8, 4);
        }
    }

    function drawProjectiles() {
        for (const projectile of state.projectiles) {
            if (!isVisible(projectile.x, projectile.w)) continue;
            ctx.fillStyle = "#ffed8a";
            ctx.fillRect(Math.floor(projectile.x), Math.floor(projectile.y), projectile.w, projectile.h);
            ctx.fillStyle = "#f47a24";
            ctx.fillRect(Math.floor(projectile.x + 3), Math.floor(projectile.y + 3), projectile.w - 6, projectile.h - 6);
        }
    }

    function drawAimReticle() {
        const aim = getAimTarget();
        ctx.save();
        ctx.strokeStyle = "rgba(255, 237, 138, 0.9)";
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 10]);
        ctx.beginPath();
        ctx.moveTo(aim.originX, aim.originY);
        ctx.lineTo(aim.targetX, aim.targetY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = "#f47a24";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(aim.targetX - 13, aim.targetY);
        ctx.lineTo(aim.targetX + 13, aim.targetY);
        ctx.moveTo(aim.targetX, aim.targetY - 13);
        ctx.lineTo(aim.targetX, aim.targetY + 13);
        ctx.stroke();
        ctx.restore();
    }

    function drawPlayerHealthBar(player, x, y) {
        const barW = 42;
        const barH = 7;
        const barX = Math.floor(x + player.w / 2 - barW / 2);
        const barY = Math.floor(y - 14);
        const fillW = Math.max(0, Math.round((player.health / player.maxHealth) * (barW - 4)));
        ctx.fillStyle = "rgba(18, 48, 71, 0.78)";
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = player.health <= 1 ? "#f05a4f" : "#45d36b";
        ctx.fillRect(barX + 2, barY + 2, fillW, barH - 4);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);
    }

    function drawPlayer() {
        const player = state.player;
        const x = Math.floor(player.x);
        const y = Math.floor(player.y);
        drawPlayerHealthBar(player, x, y);
        if (player.invulnerable > 0 && Math.floor(state.elapsed * 12) % 2 === 0) return;
        ctx.fillStyle = "#1f5c8f";
        ctx.fillRect(x + 5, y + 16, player.w - 10, 22);
        ctx.fillStyle = "#ffcd73";
        ctx.fillRect(x + 7, y + 5, player.w - 14, 14);
        ctx.fillStyle = "#d94e45";
        ctx.fillRect(x + 4, y, player.w - 8, 8);
        ctx.fillStyle = "#15354e";
        ctx.fillRect(x + (player.facing >= 0 ? 17 : 8), y + 9, 4, 4);
        ctx.fillStyle = "#123047";
        ctx.fillRect(x + 4, y + 38, 8, 6);
        ctx.fillRect(x + player.w - 12, y + 38, 8, 6);
    }

    function isVisible(x, w) {
        return x + w >= state.cameraX - 80 && x <= state.cameraX + WIDTH + 80;
    }

    function setControl(control, active) {
        if (!Object.prototype.hasOwnProperty.call(input, control)) return;
        input[control] = active;
        document.querySelectorAll(`[data-control="${control}"]`).forEach((button) => {
            button.classList.toggle("is-active", active);
        });
    }

    function bindPointerControls() {
        document.querySelectorAll("[data-control]").forEach((button) => {
            const control = button.getAttribute("data-control");
            button.addEventListener("pointerdown", (event) => {
                event.preventDefault();
                pointerControls.set(event.pointerId, control);
                button.setPointerCapture?.(event.pointerId);
                setControl(control, true);
            });
            button.addEventListener("pointerup", (event) => {
                event.preventDefault();
                const activeControl = pointerControls.get(event.pointerId);
                pointerControls.delete(event.pointerId);
                if (activeControl) setControl(activeControl, hasActivePointer(activeControl));
            });
            button.addEventListener("pointercancel", (event) => {
                const activeControl = pointerControls.get(event.pointerId);
                pointerControls.delete(event.pointerId);
                if (activeControl) setControl(activeControl, hasActivePointer(activeControl));
            });
            button.addEventListener("contextmenu", (event) => event.preventDefault());
        });
    }

    function hasActivePointer(control) {
        for (const activeControl of pointerControls.values()) {
            if (activeControl === control) return true;
        }
        return false;
    }

    function bindKeyboard() {
        window.addEventListener("keydown", (event) => {
            if (event.repeat && event.code !== "Space") return;
            if (event.code === "ArrowLeft" || event.code === "KeyA") setControl("left", true);
            if (event.code === "ArrowRight" || event.code === "KeyD") setControl("right", true);
            if (event.code === "ArrowUp" || event.code === "Space" || event.code === "KeyW") {
                event.preventDefault();
                setControl("jump", true);
            }
            if (event.code === "KeyJ" || event.code === "Enter") {
                event.preventDefault();
                setControl("attack", true);
            }
        });
        window.addEventListener("keyup", (event) => {
            if (event.code === "ArrowLeft" || event.code === "KeyA") setControl("left", false);
            if (event.code === "ArrowRight" || event.code === "KeyD") setControl("right", false);
            if (event.code === "ArrowUp" || event.code === "Space" || event.code === "KeyW") setControl("jump", false);
            if (event.code === "KeyJ" || event.code === "Enter") setControl("attack", false);
        });
    }

    function updateFullscreenUi() {
        document.body.classList.toggle("is-fullscreen", Boolean(document.fullscreenElement));
    }

    async function enterFullscreen() {
        if (!gameShell?.requestFullscreen || document.fullscreenElement) return;
        try {
            await gameShell.requestFullscreen();
        } catch (_) { }
        updateFullscreenUi();
    }

    async function exitFullscreen() {
        if (!document.fullscreenElement || !document.exitFullscreen) return;
        try {
            await document.exitFullscreen();
        } catch (_) { }
        updateFullscreenUi();
    }

    startButton.addEventListener("click", continueGame);
    restartButton.addEventListener("click", restartGame);
    fullscreenButton.addEventListener("click", enterFullscreen);
    exitFullscreenButton.addEventListener("click", exitFullscreen);
    document.addEventListener("fullscreenchange", updateFullscreenUi);
    bindPointerControls();
    bindKeyboard();
    updateHud();
    draw();
}());
