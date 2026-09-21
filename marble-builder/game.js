(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const spawnButton = document.getElementById('spawnButton');
  const deleteButton = document.getElementById('deleteButton');
  const resetButton = document.getElementById('resetButton');
  const againButton = document.getElementById('againButton');
  const successPanel = document.getElementById('successPanel');
  const hint = document.getElementById('hint');
  const toolDock = document.querySelector('.tool-dock');
  const toolCards = Array.from(document.querySelectorAll('.tool-card'));

  const PIXELS_PER_METER = 100;
  const EARTH_GRAVITY = 9.81;
  const FIXED_STEP = 1 / 120;
  const BALL_RADIUS = 18;
  const BALL_MASS = 0.18;
  const BALL_INERTIA = 0.5 * BALL_MASS * Math.pow(BALL_RADIUS / PIXELS_PER_METER, 2);
  const MATERIALS = {
    wood: { label: '나무 길', color: '#a96c36', edge: '#70401f', friction: 0.38, restitution: 0.08 },
    rubber: { label: '고무 길', color: '#d9484f', edge: '#8e2630', friction: 0.82, restitution: 0.28 },
    steel: { label: '금속 길', color: '#aebcc6', edge: '#617381', friction: 0.14, restitution: 0.12 },
    basket: { friction: 0.48, restitution: 0.06 },
    ground: { friction: 0.55, restitution: 0.04 }
  };

  const view = { width: 0, height: 0, floorY: 0, dpr: 1 };
  const spawn = { x: 220, y: 145 };
  const rods = [];
  const goals = [];
  let ball = null;
  let selected = null;
  let nextId = 1;
  let won = false;
  let lastTime = performance.now();
  let accumulator = 0;
  let placement = null;
  let editDrag = null;
  let hintTimer = null;

  function setHint(message, duration = 2600) {
    hint.textContent = message;
    hint.style.opacity = '1';
    clearTimeout(hintTimer);
    if (duration > 0) {
      hintTimer = setTimeout(() => { hint.style.opacity = '0'; }, duration);
    }
  }

  function updateDeleteButton() {
    deleteButton.disabled = !selected;
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.width = window.innerWidth;
    view.height = window.innerHeight;
    view.dpr = dpr;
    canvas.width = Math.round(view.width * dpr);
    canvas.height = Math.round(view.height * dpr);
    canvas.style.width = `${view.width}px`;
    canvas.style.height = `${view.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const dockTop = toolDock.getBoundingClientRect().top;
    view.floorY = Math.max(310, dockTop - 18);
    spawn.x = Math.max(90, Math.min(view.width * 0.23, view.width - 90));
    spawn.y = view.width < 520 ? 142 : 150;

    rods.forEach(rod => {
      rod.x = clamp(rod.x, 30, view.width - 30);
      rod.y = clamp(rod.y, 120, view.floorY - 24);
    });
    goals.forEach(goal => {
      goal.x = clamp(goal.x, goal.width / 2 + 8, view.width - goal.width / 2 - 8);
      goal.y = clamp(goal.y, 210, view.floorY - 5);
    });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function spawnBall() {
    ball = {
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      angle: 0,
      omega: 0,
      radius: BALL_RADIUS,
      mass: BALL_MASS
    };
    won = false;
    successPanel.hidden = true;
    setHint('공이 떨어집니다. 길의 기울기와 마찰을 확인해 보세요.');
  }

  function addRod(type, x, y) {
    const rod = {
      id: nextId++,
      kind: 'rod',
      type,
      x: clamp(x, 35, view.width - 35),
      y: clamp(y, 125, view.floorY - 24),
      length: Math.min(190, Math.max(128, view.width * 0.22)),
      thickness: type === 'rubber' ? 17 : 14,
      angle: 0
    };
    rods.push(rod);
    selectEntity(rod);
    setHint('주황색 끝점을 끌면 각도, 파란색 가운데 점을 끌면 위치가 바뀝니다.');
    return rod;
  }

  function addGoal(x, centerY) {
    const goal = {
      id: nextId++,
      kind: 'goal',
      x: clamp(x, 65, view.width - 65),
      y: clamp(centerY + 42, 215, view.floorY - 5),
      width: 126,
      height: 84,
      thickness: 11
    };
    goals.push(goal);
    selectEntity(goal);
    setHint('바구니의 파란 점을 끌어 골인 지점을 옮길 수 있어요.');
    return goal;
  }

  function selectEntity(entity) {
    selected = entity;
    updateDeleteButton();
  }

  function deleteSelected() {
    if (!selected) return;
    const list = selected.kind === 'rod' ? rods : goals;
    const index = list.indexOf(selected);
    if (index >= 0) list.splice(index, 1);
    selected = null;
    editDrag = null;
    updateDeleteButton();
    setHint('선택한 블록을 삭제했습니다.');
  }

  function resetAll() {
    rods.length = 0;
    goals.length = 0;
    ball = null;
    selected = null;
    placement = null;
    editDrag = null;
    won = false;
    successPanel.hidden = true;
    updateDeleteButton();
    setHint('초기화했습니다. 아래 블록을 끌어서 새 길을 만들어 보세요.', 3200);
  }

  function rodEndpoints(rod) {
    const halfX = Math.cos(rod.angle) * rod.length / 2;
    const halfY = Math.sin(rod.angle) * rod.length / 2;
    return {
      start: { x: rod.x - halfX, y: rod.y - halfY },
      end: { x: rod.x + halfX, y: rod.y + halfY }
    };
  }

  function distanceSquared(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function pointInRod(point, rod, padding = 11) {
    const dx = point.x - rod.x;
    const dy = point.y - rod.y;
    const cos = Math.cos(rod.angle);
    const sin = Math.sin(rod.angle);
    const localX = cos * dx + sin * dy;
    const localY = -sin * dx + cos * dy;
    return Math.abs(localX) <= rod.length / 2 + padding && Math.abs(localY) <= rod.thickness / 2 + padding;
  }

  function pointInGoal(point, goal) {
    return point.x >= goal.x - goal.width / 2 - 12
      && point.x <= goal.x + goal.width / 2 + 12
      && point.y >= goal.y - goal.height - 12
      && point.y <= goal.y + 12;
  }

  function findEntity(point) {
    for (let i = goals.length - 1; i >= 0; i -= 1) {
      if (pointInGoal(point, goals[i])) return goals[i];
    }
    for (let i = rods.length - 1; i >= 0; i -= 1) {
      if (pointInRod(point, rods[i])) return rods[i];
    }
    return null;
  }

  function beginCanvasEdit(event) {
    if (placement || event.button > 0) return;
    const point = pointerPosition(event);
    const handleRadius = event.pointerType === 'touch' ? 24 : 17;

    if (selected?.kind === 'rod') {
      const ends = rodEndpoints(selected);
      if (distanceSquared(point, ends.start) <= handleRadius * handleRadius) {
        editDrag = { pointerId: event.pointerId, mode: 'start', entity: selected, fixed: ends.end };
      } else if (distanceSquared(point, ends.end) <= handleRadius * handleRadius) {
        editDrag = { pointerId: event.pointerId, mode: 'end', entity: selected, fixed: ends.start };
      } else if (distanceSquared(point, selected) <= handleRadius * handleRadius) {
        editDrag = { pointerId: event.pointerId, mode: 'move', entity: selected, offsetX: point.x - selected.x, offsetY: point.y - selected.y };
      }
    } else if (selected?.kind === 'goal') {
      const handle = { x: selected.x, y: selected.y - selected.height / 2 };
      if (distanceSquared(point, handle) <= handleRadius * handleRadius) {
        editDrag = { pointerId: event.pointerId, mode: 'moveGoal', entity: selected, offsetX: point.x - selected.x, offsetY: point.y - selected.y };
      }
    }

    if (!editDrag) {
      const entity = findEntity(point);
      selectEntity(entity);
      if (entity?.kind === 'rod') {
        editDrag = { pointerId: event.pointerId, mode: 'move', entity, offsetX: point.x - entity.x, offsetY: point.y - entity.y };
      } else if (entity?.kind === 'goal') {
        editDrag = { pointerId: event.pointerId, mode: 'moveGoal', entity, offsetX: point.x - entity.x, offsetY: point.y - entity.y };
      }
    }

    if (editDrag) {
      canvas.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    }
  }

  function updateEdit(event) {
    if (!editDrag || editDrag.pointerId !== event.pointerId) return;
    const point = pointerPosition(event);
    const entity = editDrag.entity;

    if (editDrag.mode === 'move') {
      entity.x = clamp(point.x - editDrag.offsetX, 20, view.width - 20);
      entity.y = clamp(point.y - editDrag.offsetY, 115, view.floorY - 16);
    } else if (editDrag.mode === 'moveGoal') {
      entity.x = clamp(point.x - editDrag.offsetX, entity.width / 2 + 4, view.width - entity.width / 2 - 4);
      entity.y = clamp(point.y - editDrag.offsetY, entity.height + 112, view.floorY - 5);
    } else {
      let dx = point.x - editDrag.fixed.x;
      let dy = point.y - editDrag.fixed.y;
      const distance = Math.hypot(dx, dy) || 1;
      dx = dx / distance * entity.length;
      dy = dy / distance * entity.length;
      const moving = { x: editDrag.fixed.x + dx, y: editDrag.fixed.y + dy };
      entity.x = (moving.x + editDrag.fixed.x) / 2;
      entity.y = (moving.y + editDrag.fixed.y) / 2;
      entity.angle = editDrag.mode === 'end'
        ? Math.atan2(dy, dx)
        : Math.atan2(-dy, -dx);
    }
    event.preventDefault();
  }

  function finishEdit(event) {
    if (!editDrag || editDrag.pointerId !== event.pointerId) return;
    editDrag = null;
    event.preventDefault();
  }

  function beginPlacement(event) {
    const card = event.currentTarget;
    placement = {
      pointerId: event.pointerId,
      tool: card.dataset.tool,
      x: event.clientX,
      y: event.clientY
    };
    selected = null;
    updateDeleteButton();
    card.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    setHint('게임 화면의 원하는 위치에서 손을 놓아 배치하세요.', 0);
  }

  function updatePlacement(event) {
    if (!placement || placement.pointerId !== event.pointerId) return;
    placement.x = event.clientX;
    placement.y = event.clientY;
    event.preventDefault();
  }

  function finishPlacement(event) {
    if (!placement || placement.pointerId !== event.pointerId) return;
    const current = placement;
    placement = null;
    const point = pointerPosition(event);
    const valid = point.x >= 8 && point.x <= view.width - 8 && point.y >= 105 && point.y < view.floorY - 5;
    if (valid) {
      if (current.tool === 'goal') addGoal(point.x, point.y);
      else addRod(current.tool, point.x, point.y);
    } else {
      setHint('블록은 하단 창보다 위쪽의 게임 화면에 놓아 주세요.');
    }
    event.preventDefault();
  }

  function basketRects(goal) {
    const t = goal.thickness;
    return [
      { x: goal.x, y: goal.y - t / 2, width: goal.width, height: t, angle: 0, material: MATERIALS.basket },
      { x: goal.x - goal.width / 2 + t / 2, y: goal.y - goal.height / 2, width: t, height: goal.height, angle: 0, material: MATERIALS.basket },
      { x: goal.x + goal.width / 2 - t / 2, y: goal.y - goal.height / 2, width: t, height: goal.height, angle: 0, material: MATERIALS.basket }
    ];
  }

  function resolveBallRect(rect) {
    if (!ball) return;
    const cos = Math.cos(rect.angle || 0);
    const sin = Math.sin(rect.angle || 0);
    const dx = ball.x - rect.x;
    const dy = ball.y - rect.y;
    const localX = cos * dx + sin * dy;
    const localY = -sin * dx + cos * dy;
    const halfW = rect.width / 2;
    const halfH = rect.height / 2;
    const nearX = clamp(localX, -halfW, halfW);
    const nearY = clamp(localY, -halfH, halfH);
    let nxLocal = localX - nearX;
    let nyLocal = localY - nearY;
    let distance = Math.hypot(nxLocal, nyLocal);

    if (distance >= ball.radius) return;
    if (distance < 0.0001) {
      const gapX = halfW - Math.abs(localX);
      const gapY = halfH - Math.abs(localY);
      if (gapX < gapY) {
        nxLocal = localX >= 0 ? 1 : -1;
        nyLocal = 0;
        distance = -gapX;
      } else {
        nxLocal = 0;
        nyLocal = localY >= 0 ? 1 : -1;
        distance = -gapY;
      }
    } else {
      nxLocal /= distance;
      nyLocal /= distance;
    }

    const nx = cos * nxLocal - sin * nyLocal;
    const ny = sin * nxLocal + cos * nyLocal;
    const penetration = ball.radius - distance;
    ball.x += nx * Math.max(0, penetration + 0.02);
    ball.y += ny * Math.max(0, penetration + 0.02);

    const radiusM = ball.radius / PIXELS_PER_METER;
    const rx = -nx * radiusM;
    const ry = -ny * radiusM;
    const contactVx = ball.vx - ball.omega * ry;
    const contactVy = ball.vy + ball.omega * rx;
    const normalSpeed = contactVx * nx + contactVy * ny;
    if (normalSpeed >= 0) return;

    const inverseMass = 1 / ball.mass;
    const inverseInertia = 1 / BALL_INERTIA;
    const crossN = rx * ny - ry * nx;
    const restitution = rect.material.restitution;
    const normalImpulse = -(1 + restitution) * normalSpeed
      / (inverseMass + crossN * crossN * inverseInertia);
    const normalIx = nx * normalImpulse;
    const normalIy = ny * normalImpulse;
    ball.vx += normalIx * inverseMass;
    ball.vy += normalIy * inverseMass;
    ball.omega += (rx * normalIy - ry * normalIx) * inverseInertia;

    const tx = -ny;
    const ty = nx;
    const tangentVx = ball.vx - ball.omega * ry;
    const tangentVy = ball.vy + ball.omega * rx;
    const tangentSpeed = tangentVx * tx + tangentVy * ty;
    const crossT = rx * ty - ry * tx;
    let tangentImpulse = -tangentSpeed
      / (inverseMass + crossT * crossT * inverseInertia);
    const maxFriction = rect.material.friction * normalImpulse;
    tangentImpulse = clamp(tangentImpulse, -maxFriction, maxFriction);
    const tangentIx = tx * tangentImpulse;
    const tangentIy = ty * tangentImpulse;
    ball.vx += tangentIx * inverseMass;
    ball.vy += tangentIy * inverseMass;
    ball.omega += (rx * tangentIy - ry * tangentIx) * inverseInertia;
  }

  function physicsStep(dt) {
    if (!ball || won || editDrag) return;
    ball.vy += EARTH_GRAVITY * dt;
    const drag = Math.exp(-0.025 * dt);
    ball.vx *= drag;
    ball.vy *= drag;
    ball.omega *= Math.exp(-0.08 * dt);
    ball.x += ball.vx * PIXELS_PER_METER * dt;
    ball.y += ball.vy * PIXELS_PER_METER * dt;
    ball.angle += ball.omega * dt;

    rods.forEach(rod => resolveBallRect({
      x: rod.x,
      y: rod.y,
      width: rod.length,
      height: rod.thickness,
      angle: rod.angle,
      material: MATERIALS[rod.type]
    }));
    goals.forEach(goal => basketRects(goal).forEach(resolveBallRect));

    resolveBallRect({ x: view.width / 2, y: view.floorY + 45, width: view.width + 160, height: 90, angle: 0, material: MATERIALS.ground });
    resolveBallRect({ x: -35, y: view.floorY / 2, width: 70, height: view.floorY + 200, angle: 0, material: MATERIALS.ground });
    resolveBallRect({ x: view.width + 35, y: view.floorY / 2, width: 70, height: view.floorY + 200, angle: 0, material: MATERIALS.ground });

    for (const goal of goals) {
      const innerHalf = goal.width / 2 - goal.thickness - ball.radius * 0.45;
      const insideX = Math.abs(ball.x - goal.x) < innerHalf;
      const insideY = ball.y > goal.y - goal.height + ball.radius * 0.25
        && ball.y < goal.y - goal.thickness - ball.radius * 0.1;
      if (insideX && insideY) {
        won = true;
        ball.vx = 0;
        ball.vy = 0;
        ball.omega = 0;
        successPanel.hidden = false;
        setHint('골인 성공!', 1800);
        break;
      }
    }

    if (ball.y > view.height + 300) {
      ball = null;
      setHint('공이 화면 밖으로 나갔어요. 공 생성 버튼으로 다시 시작하세요.');
    }
  }

  function roundedRectPath(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.roundRect(x, y, width, height, r);
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, view.floorY);
    gradient.addColorStop(0, '#cfe9fa');
    gradient.addColorStop(0.64, '#eaf5f4');
    gradient.addColorStop(1, '#f6f2dd');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, view.width, view.height);

    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath();
    ctx.arc(view.width * 0.82, 145, 48, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(91, 151, 139, .16)';
    ctx.beginPath();
    ctx.moveTo(0, view.floorY);
    ctx.lineTo(0, view.floorY - 110);
    ctx.quadraticCurveTo(view.width * .2, view.floorY - 210, view.width * .42, view.floorY - 80);
    ctx.quadraticCurveTo(view.width * .67, view.floorY - 240, view.width, view.floorY - 95);
    ctx.lineTo(view.width, view.floorY);
    ctx.closePath();
    ctx.fill();

    const grid = PIXELS_PER_METER;
    ctx.strokeStyle = 'rgba(28, 73, 101, .07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= view.width; x += grid) {
      ctx.moveTo(x, 108); ctx.lineTo(x, view.floorY);
    }
    for (let y = 108; y <= view.floorY; y += grid) {
      ctx.moveTo(0, y); ctx.lineTo(view.width, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#7aa05f';
    ctx.fillRect(0, view.floorY, view.width, 7);
    ctx.fillStyle = '#9a7853';
    ctx.fillRect(0, view.floorY + 7, view.width, view.height - view.floorY);
  }

  function drawSpawn() {
    ctx.save();
    ctx.strokeStyle = '#2674d9';
    ctx.fillStyle = 'rgba(38, 116, 217, .08)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(spawn.x, spawn.y, BALL_RADIUS + 5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(spawn.x, spawn.y - 46);
    ctx.lineTo(spawn.x, spawn.y - 29);
    ctx.lineTo(spawn.x - 6, spawn.y - 36);
    ctx.moveTo(spawn.x, spawn.y - 29);
    ctx.lineTo(spawn.x + 6, spawn.y - 36);
    ctx.stroke();
    ctx.font = '700 12px "Avenir Next", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#285c91';
    ctx.fillText('공 생성 위치', spawn.x, spawn.y + 42);
    ctx.restore();
  }

  function drawRod(rod, alpha = 1) {
    const material = MATERIALS[rod.type];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(rod.x, rod.y);
    ctx.rotate(rod.angle);
    ctx.shadowColor = 'rgba(23, 50, 77, .18)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 5;
    roundedRectPath(ctx, -rod.length / 2, -rod.thickness / 2, rod.length, rod.thickness, rod.thickness / 2);
    ctx.fillStyle = material.color;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = material.edge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.32)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-rod.length / 2 + 9, -rod.thickness / 4);
    ctx.lineTo(rod.length / 2 - 9, -rod.thickness / 4);
    ctx.stroke();
    ctx.restore();
  }

  function drawBasket(goal, alpha = 1) {
    const left = goal.x - goal.width / 2;
    const top = goal.y - goal.height;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#9a5e20';
    ctx.lineWidth = goal.thickness + 4;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, goal.y);
    ctx.lineTo(left + goal.width, goal.y);
    ctx.lineTo(left + goal.width, top);
    ctx.stroke();
    ctx.strokeStyle = '#df9d3f';
    ctx.lineWidth = goal.thickness;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(125, 70, 18, .45)';
    ctx.lineWidth = 2;
    for (let x = left + 24; x < left + goal.width; x += 24) {
      ctx.beginPath(); ctx.moveTo(x, top + 8); ctx.lineTo(x, goal.y - 5); ctx.stroke();
    }
    ctx.font = '800 11px "Avenir Next", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#88501d';
    ctx.fillText('GOAL', goal.x, goal.y + 23);
    ctx.restore();
  }

  function drawSelection() {
    if (!selected) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(38,116,217,.48)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    if (selected.kind === 'rod') {
      const ends = rodEndpoints(selected);
      ctx.beginPath();
      ctx.moveTo(ends.start.x, ends.start.y);
      ctx.lineTo(ends.end.x, ends.end.y);
      ctx.stroke();
      drawHandle(ends.start.x, ends.start.y, '#ffaf21');
      drawHandle(ends.end.x, ends.end.y, '#ffaf21');
      drawHandle(selected.x, selected.y, '#2674d9');
    } else {
      ctx.strokeRect(selected.x - selected.width / 2 - 8, selected.y - selected.height - 8, selected.width + 16, selected.height + 16);
      drawHandle(selected.x, selected.y - selected.height / 2, '#2674d9');
    }
    ctx.restore();
  }

  function drawHandle(x, y, color) {
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  function drawBall() {
    if (!ball) return;
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.angle);
    ctx.shadowColor = 'rgba(68, 38, 8, .25)';
    ctx.shadowBlur = 9;
    ctx.shadowOffsetY = 5;
    const gradient = ctx.createRadialGradient(-6, -7, 2, 0, 0, ball.radius);
    gradient.addColorStop(0, '#fff7bd');
    gradient.addColorStop(.24, '#ffd158');
    gradient.addColorStop(.7, '#ed8b24');
    gradient.addColorStop(1, '#b54b13');
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.arc(0, 0, ball.radius, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(117, 51, 11, .55)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, ball.radius - 1, -.7, .7); ctx.stroke();
    ctx.restore();
  }

  function drawPlacementGhost() {
    if (!placement) return;
    const point = { x: placement.x, y: placement.y };
    if (placement.tool === 'goal') {
      drawBasket({ x: point.x, y: point.y + 42, width: 126, height: 84, thickness: 11 }, .48);
    } else {
      drawRod({ x: point.x, y: point.y, length: Math.min(190, Math.max(128, view.width * .22)), thickness: placement.tool === 'rubber' ? 17 : 14, angle: 0, type: placement.tool }, .5);
    }
  }

  function render() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.width, view.height);
    drawBackground();
    drawSpawn();
    rods.forEach(rod => drawRod(rod));
    goals.forEach(goal => drawBasket(goal));
    drawBall();
    drawSelection();
    drawPlacementGhost();
  }

  function frame(time) {
    const elapsed = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    accumulator += elapsed;
    while (accumulator >= FIXED_STEP) {
      physicsStep(FIXED_STEP);
      accumulator -= FIXED_STEP;
    }
    render();
    requestAnimationFrame(frame);
  }

  toolCards.forEach(card => card.addEventListener('pointerdown', beginPlacement));
  window.addEventListener('pointermove', event => {
    updatePlacement(event);
    updateEdit(event);
  }, { passive: false });
  window.addEventListener('pointerup', event => {
    finishPlacement(event);
    finishEdit(event);
  }, { passive: false });
  window.addEventListener('pointercancel', event => {
    if (placement?.pointerId === event.pointerId) placement = null;
    if (editDrag?.pointerId === event.pointerId) editDrag = null;
  });
  canvas.addEventListener('pointerdown', beginCanvasEdit, { passive: false });
  window.addEventListener('resize', resize);
  spawnButton.addEventListener('click', spawnBall);
  deleteButton.addEventListener('click', deleteSelected);
  resetButton.addEventListener('click', resetAll);
  againButton.addEventListener('click', spawnBall);
  window.addEventListener('keydown', event => {
    if ((event.key === 'Delete' || event.key === 'Backspace') && selected) deleteSelected();
    if (event.code === 'Space') {
      event.preventDefault();
      spawnBall();
    }
  });

  window.__marbleBuilderDebug = {
    constants: { PIXELS_PER_METER, EARTH_GRAVITY, FIXED_STEP, BALL_MASS, BALL_INERTIA },
    getState: () => ({
      rodCount: rods.length,
      goalCount: goals.length,
      selectedKind: selected?.kind || null,
      selected: selected ? { kind: selected.kind, x: selected.x, y: selected.y, angle: selected.angle ?? null } : null,
      rods: rods.map(rod => ({ id: rod.id, type: rod.type, x: rod.x, y: rod.y, angle: rod.angle })),
      ball: ball ? { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, omega: ball.omega } : null,
      won,
      spawn: { ...spawn },
      floorY: view.floorY
    }),
    addRod,
    addGoal,
    spawnBall,
    resetAll
  };

  resize();
  updateDeleteButton();
  requestAnimationFrame(frame);
})();
