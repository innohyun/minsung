(function () {
    "use strict";

    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    const coinCountEl = document.getElementById("coinCount");
    const timeCountEl = document.getElementById("timeCount");
    const bestCountEl = document.getElementById("bestCount");
    const overlay = document.getElementById("statusOverlay");
    const statusKicker = document.getElementById("statusKicker");
    const statusTitle = document.getElementById("statusTitle");
    const statusText = document.getElementById("statusText");
    const startButton = document.getElementById("startButton");
    const restartButton = document.getElementById("restartButton");

    const WIDTH = 960;
    const HEIGHT = 540;
    const FLOOR_Y = 452;
    const GRAVITY = 1850;
    const MOVE_SPEED = 285;
    const JUMP_SPEED = 690;
    const MAX_FALL = 980;
    const BEST_KEY = "pixelHillRunnerBestScore";

    const level = {
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
    };

    const input = {
        left: false,
        right: false,
        jump: false
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

    function createInitialState() {
        return {
            mode: "ready",
            elapsed: 0,
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
                respawns: 0,
                invulnerable: 0
            },
            collectedCoins: 0,
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
        const wasRunning = running;
        state = createInitialState();
        state.mode = "playing";
        running = true;
        previousJump = false;
        hideOverlay();
        updateHud();
        if (!wasRunning) {
            lastTime = 0;
            accumulator = 0;
            window.requestAnimationFrame(frame);
        }
    }

    function restartGame() {
        startGame();
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
            `점수 ${state.score}점으로 깃발에 도착했습니다.`,
            "다시 시작"
        );
    }

    function failAndRespawn() {
        const player = state.player;
        player.respawns += 1;
        player.x = level.start.x;
        player.y = level.start.y;
        player.vx = 0;
        player.vy = 0;
        player.grounded = false;
        player.invulnerable = 1.4;
        state.cameraX = 0;
    }

    function calculateScore() {
        const timeBonus = Math.max(0, 1200 - Math.floor(state.elapsed * 8));
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

        player.vy = clamp(player.vy + GRAVITY * dt, -JUMP_SPEED, MAX_FALL);
        player.x += player.vx * dt;
        resolveHorizontal(player);
        player.y += player.vy * dt;
        resolveVertical(player);
        player.x = clamp(player.x, 0, level.width - player.w);

        if (player.invulnerable > 0) {
            player.invulnerable = Math.max(0, player.invulnerable - dt);
        }

        if (player.y > HEIGHT + 180) {
            failAndRespawn();
        }
    }

    function resolveHorizontal(player) {
        for (const solid of level.solids) {
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
        for (const solid of level.solids) {
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
                failAndRespawn();
            }
            break;
        }
    }

    function checkGoal() {
        const player = state.player;
        if (intersects(player, level.goal)) {
            finishGame();
        }
    }

    function updateCamera() {
        const player = state.player;
        const target = player.x + player.w / 2 - WIDTH * 0.42;
        state.cameraX += (target - state.cameraX) * 0.12;
        state.cameraX = clamp(state.cameraX, 0, level.width - WIDTH);
    }

    function updateHud() {
        coinCountEl.textContent = String(state.collectedCoins);
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
    }

    function drawCloud(x, y, scale) {
        ctx.fillRect(x, y + 14 * scale, 80 * scale, 20 * scale);
        ctx.fillRect(x + 16 * scale, y, 22 * scale, 30 * scale);
        ctx.fillRect(x + 42 * scale, y + 4 * scale, 30 * scale, 26 * scale);
    }

    function drawSolids() {
        for (const solid of level.solids) {
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
        const goal = level.goal;
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

    function drawPlayer() {
        const player = state.player;
        if (player.invulnerable > 0 && Math.floor(state.elapsed * 12) % 2 === 0) return;
        const x = Math.floor(player.x);
        const y = Math.floor(player.y);
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
        });
        window.addEventListener("keyup", (event) => {
            if (event.code === "ArrowLeft" || event.code === "KeyA") setControl("left", false);
            if (event.code === "ArrowRight" || event.code === "KeyD") setControl("right", false);
            if (event.code === "ArrowUp" || event.code === "Space" || event.code === "KeyW") setControl("jump", false);
        });
    }

    startButton.addEventListener("click", startGame);
    restartButton.addEventListener("click", restartGame);
    bindPointerControls();
    bindKeyboard();
    updateHud();
    draw();
}());
