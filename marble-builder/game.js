(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const spawnButton = document.getElementById('spawnButton');
  const clearButton = document.getElementById('clearButton');
  const deleteButton = document.getElementById('deleteButton');
  const resetButton = document.getElementById('resetButton');
  const confirmButton = document.getElementById('confirmButton');
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
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 1;
  const DEFAULT_ROD_LENGTH = 180;
  const MATERIALS = {
    wood: { label: '나무 길', color: '#a96c36', edge: '#70401f', friction: 0.38, restitution: 0.18 },
    rubber: { label: '고무 길', color: '#d9484f', edge: '#8e2630', friction: 0.82, restitution: 0.32 },
    steel: { label: '금속 길', color: '#aebcc6', edge: '#617381', friction: 0.14, restitution: 0.2 },
    basket: { friction: 0.48, restitution: 0.14 }
  };

  const view = { width: 0, height: 0, dockTop: 0, dpr: 1 };
  const camera = { x: 0, y: 0, zoom: MAX_ZOOM };
  const spawn = { x: 220, y: 150 };
  const rods = [];
  const goals = [];
  const activePointers = new Map();
  let initialized = false;
  let ball = null;
  let selected = null;
  let nextId = 1;
  let won = false;
  let lastTime = performance.now();
  let accumulator = 0;
  let placement = null;
  let editDrag = null;
  let cameraDrag = null;
  let pinchGesture = null;
  let hintTimer = null;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

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
    view.dockTop = toolDock.getBoundingClientRect().top;

    if (!initialized) {
      spawn.x = Math.max(90, Math.min(view.width * 0.23, view.width - 90));
      spawn.y = view.width < 520 ? 150 : 158;
      initialized = true;
    }
  }

  function screenPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function screenToWorld(point) {
    return {
      x: camera.x + point.x / camera.zoom,
      y: camera.y + point.y / camera.zoom
    };
  }

  function worldToScreen(point) {
    return {
      x: (point.x - camera.x) * camera.zoom,
      y: (point.y - camera.y) * camera.zoom
    };
  }

  function setZoomAt(screenAnchor, nextZoom) {
    const worldAnchor = screenToWorld(screenAnchor);
    camera.zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    camera.x = worldAnchor.x - screenAnchor.x / camera.zoom;
    camera.y = worldAnchor.y - screenAnchor.y / camera.zoom;
  }

  function resetCamera() {
    camera.x = 0;
    camera.y = 0;
    camera.zoom = MAX_ZOOM;
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
    setHint('공이 떨어집니다. 충돌 속도에 따라 실제처럼 살짝 튕겨요.');
  }

  function addRod(type, x, y) {
    const rod = {
      id: nextId++,
      kind: 'rod',
      type,
      x,
      y,
      length: DEFAULT_ROD_LENGTH,
      thickness: type === 'rubber' ? 17 : 14,
      angle: 0
    };
    rods.push(rod);
    selectEntity(rod);
    setHint('주황색 끝점은 각도, 파란색 가운데 점은 위치를 바꿉니다.');
    return rod;
  }

  function addGoal(x, centerY) {
    const goal = {
      id: nextId++,
      kind: 'goal',
      x,
      y: centerY + 42,
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

  function clearAll() {
    rods.length = 0;
    goals.length = 0;
    ball = null;
    selected = null;
    placement = null;
    editDrag = null;
    won = false;
    successPanel.hidden = true;
    updateDeleteButton();
    setHint('공, 길, 골인 바구니를 모두 삭제했습니다.', 3000);
  }

  function resetGame() {
    ball = null;
    selected = null;
    placement = null;
    editDrag = null;
    cameraDrag = null;
    pinchGesture = null;
    activePointers.clear();
    won = false;
    successPanel.hidden = true;
    resetCamera();
    updateDeleteButton();
    setHint('길과 바구니는 유지하고 공과 화면 위치를 리셋했습니다.', 3200);
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

  function pointInRod(point, rod, padding = 11 / camera.zoom) {
    const dx = point.x - rod.x;
    const dy = point.y - rod.y;
    const cos = Math.cos(rod.angle);
    const sin = Math.sin(rod.angle);
    const localX = cos * dx + sin * dy;
    const localY = -sin * dx + cos * dy;
    return Math.abs(localX) <= rod.length / 2 + padding
      && Math.abs(localY) <= rod.thickness / 2 + padding;
  }

  function pointInGoal(point, goal) {
    const padding = 12 / camera.zoom;
    return point.x >= goal.x - goal.width / 2 - padding
      && point.x <= goal.x + goal.width / 2 + padding
      && point.y >= goal.y - goal.height - padding
      && point.y <= goal.y + padding;
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

  function beginPinch() {
    const points = Array.from(activePointers.values());
    if (points.length < 2) return;
    const center = {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2
    };
    pinchGesture = {
      distance: Math.max(1, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y)),
      zoom: camera.zoom,
      worldCenter: screenToWorld(center)
    };
    editDrag = null;
    cameraDrag = null;
  }

  function updatePinch() {
    if (!pinchGesture || activePointers.size < 2) return;
    const points = Array.from(activePointers.values()).slice(0, 2);
    const center = {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2
    };
    const distance = Math.max(1, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y));
    camera.zoom = clamp(pinchGesture.zoom * distance / pinchGesture.distance, MIN_ZOOM, MAX_ZOOM);
    camera.x = pinchGesture.worldCenter.x - center.x / camera.zoom;
    camera.y = pinchGesture.worldCenter.y - center.y / camera.zoom;
  }

  function beginCanvasInteraction(event) {
    if (placement || event.button > 0) return;
    const screen = screenPoint(event);
    activePointers.set(event.pointerId, screen);
    canvas.setPointerCapture?.(event.pointerId);

    if (activePointers.size >= 2) {
      beginPinch();
      event.preventDefault();
      return;
    }

    const point = screenToWorld(screen);
    const handleRadius = (event.pointerType === 'touch' ? 24 : 17) / camera.zoom;

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
      } else {
        cameraDrag = {
          pointerId: event.pointerId,
          start: screen,
          cameraX: camera.x,
          cameraY: camera.y
        };
      }
    }
    event.preventDefault();
  }

  function updateCanvasInteraction(event) {
    if (!activePointers.has(event.pointerId)) return;
    const screen = screenPoint(event);
    activePointers.set(event.pointerId, screen);

    if (pinchGesture) {
      updatePinch();
      event.preventDefault();
      return;
    }

    if (editDrag?.pointerId === event.pointerId) {
      const point = screenToWorld(screen);
      const entity = editDrag.entity;
      if (editDrag.mode === 'move' || editDrag.mode === 'moveGoal') {
        entity.x = point.x - editDrag.offsetX;
        entity.y = point.y - editDrag.offsetY;
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
      return;
    }

    if (cameraDrag?.pointerId === event.pointerId) {
      camera.x = cameraDrag.cameraX - (screen.x - cameraDrag.start.x) / camera.zoom;
      camera.y = cameraDrag.cameraY - (screen.y - cameraDrag.start.y) / camera.zoom;
      event.preventDefault();
    }
  }

  function finishCanvasInteraction(event) {
    if (!activePointers.has(event.pointerId)) return;
    activePointers.delete(event.pointerId);
    if (editDrag?.pointerId === event.pointerId) editDrag = null;
    if (cameraDrag?.pointerId === event.pointerId) cameraDrag = null;
    if (pinchGesture && activePointers.size < 2) pinchGesture = null;
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
    const screen = screenPoint(event);
    const valid = screen.x >= 8 && screen.x <= view.width - 8
      && screen.y >= 105 && screen.y < view.dockTop - 5;
    if (valid) {
      const point = screenToWorld(screen);
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

  function getImpactRestitution(material, normalSpeed) {
    const impactSpeed = Math.abs(normalSpeed);
    if (impactSpeed < 0.3) return 0;
    const speedFactor = clamp((impactSpeed - 0.3) / 2.7, 0, 1);
    return material.restitution * (0.4 + speedFactor * 0.6);
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
    const restitution = getImpactRestitution(rect.material, normalSpeed);
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
  }

  function roundedRectPath(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.roundRect(x, y, width, height, r);
  }

  function applyWorldTransform() {
    ctx.translate(-camera.x * camera.zoom, -camera.y * camera.zoom);
    ctx.scale(camera.zoom, camera.zoom);
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, view.height);
    gradient.addColorStop(0, '#cfe9fa');
    gradient.addColorStop(0.68, '#eaf5f4');
    gradient.addColorStop(1, '#f6f2dd');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, view.width, view.height);

    const topLeft = screenToWorld({ x: 0, y: 0 });
    const bottomRight = screenToWorld({ x: view.width, y: view.height });
    const grid = PIXELS_PER_METER;
    const startX = Math.floor(topLeft.x / grid) * grid;
    const startY = Math.floor(topLeft.y / grid) * grid;

    ctx.save();
    applyWorldTransform();
    ctx.strokeStyle = 'rgba(28, 73, 101, .09)';
    ctx.lineWidth = 1 / camera.zoom;
    ctx.beginPath();
    for (let x = startX; x <= bottomRight.x + grid; x += grid) {
      ctx.moveTo(x, topLeft.y - grid);
      ctx.lineTo(x, bottomRight.y + grid);
    }
    for (let y = startY; y <= bottomRight.y + grid; y += grid) {
      ctx.moveTo(topLeft.x - grid, y);
      ctx.lineTo(bottomRight.x + grid, y);
    }
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = 'rgba(23, 50, 77, .68)';
    ctx.font = '700 11px "Avenir Next", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`화면 ${Math.round(camera.zoom * 100)}%`, view.width - 15, view.dockTop - 12);
  }

  function drawSpawn() {
    ctx.save();
    ctx.strokeStyle = '#2674d9';
    ctx.fillStyle = 'rgba(38, 116, 217, .08)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(spawn.x, spawn.y, BALL_RADIUS + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
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
      ctx.beginPath();
      ctx.moveTo(x, top + 8);
      ctx.lineTo(x, goal.y - 5);
      ctx.stroke();
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
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
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
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(117, 51, 11, .55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius - 1, -.7, .7);
    ctx.stroke();
    ctx.restore();
  }

  function drawPlacementGhost() {
    if (!placement) return;
    const point = screenToWorld({ x: placement.x, y: placement.y });
    if (placement.tool === 'goal') {
      drawBasket({ x: point.x, y: point.y + 42, width: 126, height: 84, thickness: 11 }, .48);
    } else {
      drawRod({ x: point.x, y: point.y, length: DEFAULT_ROD_LENGTH, thickness: placement.tool === 'rubber' ? 17 : 14, angle: 0, type: placement.tool }, .5);
    }
  }

  function render() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.width, view.height);
    drawBackground();
    ctx.save();
    applyWorldTransform();
    drawSpawn();
    rods.forEach(rod => drawRod(rod));
    goals.forEach(goal => drawBasket(goal));
    drawBall();
    drawSelection();
    drawPlacementGhost();
    ctx.restore();
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
    updateCanvasInteraction(event);
  }, { passive: false });
  window.addEventListener('pointerup', event => {
    finishPlacement(event);
    finishCanvasInteraction(event);
  }, { passive: false });
  window.addEventListener('pointercancel', event => {
    if (placement?.pointerId === event.pointerId) placement = null;
    finishCanvasInteraction(event);
  });
  canvas.addEventListener('pointerdown', beginCanvasInteraction, { passive: false });
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? 0.88 : 1.12;
    setZoomAt(screenPoint(event), camera.zoom * direction);
  }, { passive: false });
  window.addEventListener('resize', resize);
  spawnButton.addEventListener('click', spawnBall);
  clearButton.addEventListener('click', clearAll);
  deleteButton.addEventListener('click', deleteSelected);
  resetButton.addEventListener('click', resetGame);
  confirmButton.addEventListener('click', () => { successPanel.hidden = true; });
  window.addEventListener('keydown', event => {
    if ((event.key === 'Delete' || event.key === 'Backspace') && selected) deleteSelected();
    if (event.code === 'Space') {
      event.preventDefault();
      spawnBall();
    }
  });

  window.__marbleBuilderDebug = {
    constants: {
      PIXELS_PER_METER,
      EARTH_GRAVITY,
      FIXED_STEP,
      BALL_MASS,
      BALL_INERTIA,
      MIN_ZOOM,
      MAX_ZOOM
    },
    getState: () => ({
      rodCount: rods.length,
      goalCount: goals.length,
      selectedKind: selected?.kind || null,
      selected: selected ? { kind: selected.kind, x: selected.x, y: selected.y, angle: selected.angle ?? null } : null,
      rods: rods.map(rod => ({ id: rod.id, type: rod.type, x: rod.x, y: rod.y, angle: rod.angle, thickness: rod.thickness })),
      goals: goals.map(goal => ({ id: goal.id, x: goal.x, y: goal.y })),
      ball: ball ? { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, omega: ball.omega } : null,
      won,
      spawn: { ...spawn },
      camera: { ...camera }
    }),
    addRod,
    addGoal,
    spawnBall,
    clearAll,
    resetGame,
    setZoomAt,
    getImpactRestitution: (type, speed) => getImpactRestitution(MATERIALS[type], speed)
  };

  resize();
  updateDeleteButton();
  requestAnimationFrame(frame);
})();
