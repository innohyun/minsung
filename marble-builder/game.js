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
  const topPanel = document.querySelector('.top-panel');
  const toolCards = Array.from(document.querySelectorAll('.tool-card'));
  const homeScreen = document.getElementById('homeScreen');
  const stageScreen = document.getElementById('stageScreen');
  const stageList = document.getElementById('stageList');
  const homeButton = document.getElementById('homeButton');
  const freeModeButton = document.getElementById('freeModeButton');
  const stageModeButton = document.getElementById('stageModeButton');
  const developerButton = document.getElementById('developerButton');
  const mapMakerButton = document.getElementById('mapMakerButton');
  const developerDialog = document.getElementById('developerDialog');
  const developerForm = document.getElementById('developerForm');
  const developerPassword = document.getElementById('developerPassword');
  const developerError = document.getElementById('developerError');
  const stageSetupDialog = document.getElementById('stageSetupDialog');
  const stageSetupForm = document.getElementById('stageSetupForm');
  const deleteStageDialog = document.getElementById('deleteStageDialog');
  const confirmDeleteStageButton = document.getElementById('confirmDeleteStageButton');
  const saveStageButton = document.getElementById('saveStageButton');
  const cancelEditorButton = document.getElementById('cancelEditorButton');
  const gameTitle = document.getElementById('gameTitle');
  const gameSubtitle = document.getElementById('gameSubtitle');
  const successTitle = document.getElementById('successTitle');
  const successMessage = document.getElementById('successMessage');
  const stageProgressText = document.getElementById('stageProgressText');
  const speedButtons = Array.from(document.querySelectorAll('[data-speed]'));
  const toolCountLabels = Array.from(document.querySelectorAll('[data-count-for]'));

  const PIXELS_PER_METER = 100;
  const EARTH_GRAVITY = 9.81;
  const FIXED_STEP = 1 / 120;
  const BALL_RADIUS = 18;
  const BALL_MASS = 0.18;
  const BALL_INERTIA = 0.5 * BALL_MASS * Math.pow(BALL_RADIUS / PIXELS_PER_METER, 2);
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 1;
  const DEFAULT_ROD_LENGTH = 180;
  const GOAL_SUCCESS_DELAY = 1;
  const DEVELOPER_PASSWORD = '12345@';
  const STAGES_STORAGE_KEY = 'marble-builder-stages-v1';
  const PROGRESS_STORAGE_KEY = 'marble-builder-progress-v1';
  const DEVELOPER_STORAGE_KEY = 'marble-builder-developer-v1';
  const SPEED_STORAGE_KEY = 'marble-builder-speed-v1';
  const DEFAULT_STAGES = [
    {
      id: 'stage-1', number: 1, name: '첫 번째 굴리기', limits: { wood: 1, rubber: 1, steel: 0 },
      spawn: { x: 190, y: 155 },
      rods: [{ type: 'fixed', x: 430, y: 330, length: 180, thickness: 14, angle: 0.12, fixed: true }],
      goals: [{ x: 700, y: 500, width: 126, height: 84, thickness: 11 }]
    },
    {
      id: 'stage-2', number: 2, name: '두 갈래 길', limits: { wood: 1, rubber: 1, steel: 1 },
      spawn: { x: 170, y: 145 },
      rods: [
        { type: 'fixed', x: 370, y: 285, length: 180, thickness: 14, angle: 0.28, fixed: true },
        { type: 'fixed', x: 610, y: 420, length: 180, thickness: 14, angle: -0.18, fixed: true }
      ],
      goals: [{ x: 820, y: 555, width: 126, height: 84, thickness: 11 }]
    }
  ];
  const MATERIALS = {
    wood: { label: '나무 길', color: '#a96c36', edge: '#70401f', friction: 0.38, restitution: 0.18, rollingResistance: 0.04 },
    rubber: { label: '고무 길', color: '#d9484f', edge: '#8e2630', friction: 0.82, restitution: 0.32, rollingResistance: 0.075 },
    steel: { label: '금속 길', color: '#aebcc6', edge: '#617381', friction: 0.14, restitution: 0.2, rollingResistance: 0.022 },
    fixed: { label: '고정 스틱', color: '#8b6ac5', edge: '#533585', friction: 0.42, restitution: 0.16, rollingResistance: 0.045 },
    basket: { friction: 0.48, restitution: 0.14, rollingResistance: 0.055 }
  };

  const view = { width: 0, height: 0, dockTop: 0, playTop: 0, dpr: 1 };
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
  let goalHoldTime = 0;
  let goalEnteredAt = null;
  const supportContacts = [];
  let lastTime = performance.now();
  let accumulator = 0;
  let placement = null;
  let editDrag = null;
  let cameraDrag = null;
  let pinchGesture = null;
  let hintTimer = null;
  let appMode = 'home';
  let currentStage = null;
  let editorStageId = null;
  let pendingDeleteStageId = null;
  let stages = [];
  let unlockedStage = 1;
  let developerEnabled = false;
  let gameSpeed = 1;
  const touchedRodIds = new Set();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readStoredJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function loadPersistentState() {
    stages = readStoredJson(STAGES_STORAGE_KEY, clone(DEFAULT_STAGES));
    if (!Array.isArray(stages) || stages.length === 0) stages = clone(DEFAULT_STAGES);
    unlockedStage = Math.max(1, Number(localStorage.getItem(PROGRESS_STORAGE_KEY)) || 1);
    developerEnabled = localStorage.getItem(DEVELOPER_STORAGE_KEY) === 'true';
    gameSpeed = clamp(Number(localStorage.getItem(SPEED_STORAGE_KEY)) || 1, 0.5, 1.5);
  }

  function persistStages() {
    localStorage.setItem(STAGES_STORAGE_KEY, JSON.stringify(stages));
  }

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

  function setAppMode(mode) {
    appMode = mode;
    document.body.className = `is-${mode}`;
    homeScreen.hidden = mode !== 'home';
    stageScreen.hidden = mode !== 'stage-list';
    saveStageButton.hidden = mode !== 'editor';
    cancelEditorButton.hidden = mode !== 'editor';
    clearButton.hidden = mode === 'stage';
    gameTitle.textContent = mode === 'editor' ? '스테이지 만들기' : mode === 'stage' ? `${currentStage?.number || ''}스테이지` : '공 굴리기 연구소';
    gameSubtitle.textContent = mode === 'stage' ? '모든 스틱을 통과한 뒤 바구니에 넣으세요.' : mode === 'editor' ? '고정 스틱은 플레이 화면에서 회전만 할 수 있어요.' : '지구 중력 9.81m/s² · 실제 마찰과 회전 관성';
    requestAnimationFrame(resize);
  }

  function clearWorldState() {
    rods.length = 0;
    goals.length = 0;
    ball = null;
    selected = null;
    placement = null;
    editDrag = null;
    won = false;
    goalHoldTime = 0;
    goalEnteredAt = null;
    touchedRodIds.clear();
    successPanel.hidden = true;
    updateDeleteButton();
  }

  function showHome() {
    clearWorldState();
    currentStage = null;
    editorStageId = null;
    developerButton.classList.toggle('active', developerEnabled);
    developerButton.textContent = developerEnabled ? '개발자 모드 적용됨' : '개발자 모드';
    mapMakerButton.hidden = !developerEnabled;
    stageProgressText.textContent = `${unlockedStage}스테이지까지 도전 가능`;
    speedButtons.forEach(button => button.classList.toggle('active', Number(button.dataset.speed) === gameSpeed));
    setAppMode('home');
  }

  function renderStageList() {
    stageList.replaceChildren();
    const ordered = [...stages].sort((a, b) => a.number - b.number);
    ordered.forEach(stage => {
      const locked = !developerEnabled && stage.number > unlockedStage;
      const item = document.createElement('article');
      item.className = `stage-item${locked ? ' locked' : ''}`;
      const title = document.createElement('h3');
      title.textContent = `${stage.number}스테이지`;
      const detail = document.createElement('p');
      detail.textContent = `나무 ${stage.limits.wood} · 고무 ${stage.limits.rubber} · 금속 ${stage.limits.steel} · 고정 ${stage.rods.filter(rod => rod.fixed).length}`;
      const play = document.createElement('button');
      play.className = 'stage-play';
      play.type = 'button';
      play.disabled = locked;
      play.textContent = locked ? '잠김' : '플레이';
      play.addEventListener('click', () => loadStage(stage.id));
      item.append(title, detail, play);
      if (developerEnabled) {
        const admin = document.createElement('div');
        admin.className = 'stage-admin';
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.textContent = '수정';
        edit.addEventListener('click', () => startEditor(stage));
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'delete-stage';
        remove.textContent = '삭제';
        remove.addEventListener('click', () => {
          pendingDeleteStageId = stage.id;
          deleteStageDialog.showModal();
        });
        admin.append(edit, remove);
        item.append(admin);
      }
      stageList.append(item);
    });
  }

  function showStageList() {
    clearWorldState();
    renderStageList();
    setAppMode('stage-list');
  }

  function hydrateStage(stage) {
    clearWorldState();
    spawn.x = stage.spawn?.x ?? 220;
    spawn.y = stage.spawn?.y ?? 150;
    (stage.rods || []).forEach(source => rods.push({ ...clone(source), id: nextId++, kind: 'rod', touched: false }));
    (stage.goals || []).forEach(source => goals.push({ ...clone(source), id: nextId++, kind: 'goal' }));
    updateToolAvailability();
  }

  function loadStage(stageId) {
    const stage = stages.find(item => item.id === stageId);
    if (!stage) return;
    currentStage = clone(stage);
    editorStageId = null;
    hydrateStage(currentStage);
    successTitle.textContent = '스테이지 성공!';
    successMessage.textContent = '모든 스틱을 지나 바구니에 도착했어요.';
    setAppMode('stage');
    updateToolAvailability();
    setHint('모든 스틱에 공을 닿게 한 뒤 바구니에 넣으세요.', 3600);
  }

  function startFreeMode() {
    currentStage = null;
    editorStageId = null;
    clearWorldState();
    successTitle.textContent = '골인!';
    successMessage.textContent = '공이 바구니에 도착했어요.';
    updateToolAvailability();
    setAppMode('free');
    setHint('자유 모드: 개수 제한 없이 길을 만들 수 있어요.', 3200);
  }

  function startEditor(stage = null, setup = null) {
    const source = stage || {
      id: `stage-${Date.now()}`,
      number: setup.number,
      name: `${setup.number}스테이지`,
      limits: setup.limits,
      spawn: { x: spawn.x, y: spawn.y },
      rods: [], goals: []
    };
    currentStage = clone(source);
    editorStageId = stage?.id || null;
    camera.x = 0;
    camera.y = 0;
    camera.zoom = MAX_ZOOM;
    hydrateStage(currentStage);
    setAppMode('editor');
    updateToolAvailability();
    setHint('도구를 위로 끌어 배치하고 확인을 누르세요.', 3000);
  }

  function saveEditedStage() {
    if (goals.length === 0) {
      setHint('골인 바구니를 한 개 이상 배치해 주세요.', 3200);
      return;
    }
    if (rods.length === 0) {
      setHint('스틱을 한 개 이상 배치해 주세요.', 3200);
      return;
    }
    const saved = {
      ...currentStage,
      number: Number(currentStage.number),
      spawn: { x: spawn.x, y: spawn.y },
      rods: rods.map(({ id, kind, touched, ...rod }) => ({ ...rod })),
      goals: goals.map(({ id, kind, ...goal }) => ({ ...goal }))
    };
    const duplicate = stages.find(item => item.number === saved.number && item.id !== editorStageId);
    if (duplicate) {
      setHint('같은 스테이지 번호가 이미 있습니다.', 3200);
      return;
    }
    const existingIndex = stages.findIndex(item => item.id === editorStageId);
    if (existingIndex >= 0) stages[existingIndex] = saved;
    else stages.push(saved);
    persistStages();
    showStageList();
  }

  function placedCount(type) {
    return rods.filter(rod => !rod.fixed && rod.type === type).length;
  }

  function updateToolAvailability() {
    toolCountLabels.forEach(label => {
      const type = label.dataset.countFor;
      const limit = currentStage?.limits?.[type];
      label.textContent = appMode === 'stage' && Number.isFinite(limit) ? `${placedCount(type)} / ${limit}` : '';
      const card = document.querySelector(`.tool-card[data-tool="${type}"]`);
      if (card) card.disabled = appMode === 'stage' && placedCount(type) >= limit;
    });
  }

  function updateDeleteButton() {
    deleteButton.disabled = !selected || (appMode === 'stage' && selected?.fixed);
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
    view.playTop = topPanel.getBoundingClientRect().bottom;

    if (!initialized) {
      spawn.x = Math.max(90, Math.min(view.width * 0.23, view.width - 90));
      spawn.y = view.width < 520 ? 150 : 158;
      initialized = true;
    }
  }

  function clientToCanvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (view.width / Math.max(1, rect.width)),
      y: (clientY - rect.top) * (view.height / Math.max(1, rect.height))
    };
  }

  function screenPoint(event) {
    return clientToCanvasPoint(event.clientX, event.clientY);
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
    goalHoldTime = 0;
    goalEnteredAt = null;
    touchedRodIds.clear();
    rods.forEach(rod => { rod.touched = false; });
    successPanel.hidden = true;
    setHint('공이 떨어집니다. 충돌 속도에 따라 실제처럼 살짝 튕겨요.');
  }

  function addRod(type, x, y) {
    if (appMode === 'stage') {
      const limit = currentStage?.limits?.[type] ?? 0;
      if (placedCount(type) >= limit) {
        setHint(`${MATERIALS[type].label}은 더 놓을 수 없습니다.`);
        return null;
      }
    }
    const rod = {
      id: nextId++,
      kind: 'rod',
      type,
      x,
      y,
      length: DEFAULT_ROD_LENGTH,
      thickness: type === 'rubber' ? 17 : 14,
      angle: 0,
      fixed: type === 'fixed',
      touched: false
    };
    rods.push(rod);
    selectEntity(rod);
    updateToolAvailability();
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
    if (appMode === 'stage' && selected.fixed) {
      setHint('고정 스틱은 삭제하거나 옮길 수 없습니다.');
      return;
    }
    const list = selected.kind === 'rod' ? rods : goals;
    const index = list.indexOf(selected);
    if (index >= 0) list.splice(index, 1);
    selected = null;
    editDrag = null;
    updateDeleteButton();
    updateToolAvailability();
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
    goalHoldTime = 0;
    goalEnteredAt = null;
    touchedRodIds.clear();
    successPanel.hidden = true;
    updateDeleteButton();
    updateToolAvailability();
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
    goalHoldTime = 0;
    goalEnteredAt = null;
    touchedRodIds.clear();
    rods.forEach(rod => { rod.touched = false; });
    successPanel.hidden = true;
    updateDeleteButton();
    setHint('길, 바구니, 화면 위치는 유지하고 공만 리셋했습니다.', 3200);
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
      const fixedInPlayer = appMode === 'stage' && selected.fixed;
      if (distanceSquared(point, ends.start) <= handleRadius * handleRadius) {
        editDrag = fixedInPlayer
          ? { pointerId: event.pointerId, mode: 'rotateFixed', entity: selected }
          : { pointerId: event.pointerId, mode: 'start', entity: selected, fixed: ends.end };
      } else if (distanceSquared(point, ends.end) <= handleRadius * handleRadius) {
        editDrag = fixedInPlayer
          ? { pointerId: event.pointerId, mode: 'rotateFixed', entity: selected }
          : { pointerId: event.pointerId, mode: 'end', entity: selected, fixed: ends.start };
      } else if (!fixedInPlayer && distanceSquared(point, selected) <= handleRadius * handleRadius) {
        editDrag = { pointerId: event.pointerId, mode: 'move', entity: selected, offsetX: point.x - selected.x, offsetY: point.y - selected.y };
      }
    } else if (selected?.kind === 'goal' && appMode !== 'stage') {
      const handle = { x: selected.x, y: selected.y - selected.height / 2 };
      if (distanceSquared(point, handle) <= handleRadius * handleRadius) {
        editDrag = { pointerId: event.pointerId, mode: 'moveGoal', entity: selected, offsetX: point.x - selected.x, offsetY: point.y - selected.y };
      }
    }

    if (!editDrag) {
      const entity = findEntity(point);
      selectEntity(entity);
      if (entity?.kind === 'rod' && !(appMode === 'stage' && entity.fixed)) {
        editDrag = { pointerId: event.pointerId, mode: 'move', entity, offsetX: point.x - entity.x, offsetY: point.y - entity.y };
      } else if (entity?.kind === 'goal' && appMode !== 'stage') {
        editDrag = { pointerId: event.pointerId, mode: 'moveGoal', entity, offsetX: point.x - entity.x, offsetY: point.y - entity.y };
      } else if (!entity) {
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
      } else if (editDrag.mode === 'rotateFixed') {
        entity.angle = Math.atan2(point.y - entity.y, point.x - entity.x);
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
    if (card.disabled) return;
    placement = {
      pointerId: event.pointerId,
      tool: card.dataset.tool,
      pointerType: event.pointerType,
      card,
      startX: event.clientX,
      startY: event.clientY,
      dragging: event.pointerType !== 'touch',
      x: event.clientX,
      y: event.clientY
    };
    selected = null;
    updateDeleteButton();
    if (placement.dragging) {
      card.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      setHint('게임 화면의 원하는 위치에서 손을 놓아 배치하세요.', 0);
    }
  }

  function updatePlacement(event) {
    if (!placement || placement.pointerId !== event.pointerId) return;
    if (!placement.dragging) {
      const dx = event.clientX - placement.startX;
      const dy = event.clientY - placement.startY;
      if (Math.abs(dx) < 9 && Math.abs(dy) < 9) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        placement = null;
        return;
      }
      placement.dragging = true;
      placement.card?.setPointerCapture?.(event.pointerId);
      setHint('게임 화면의 원하는 위치에서 손을 놓아 배치하세요.', 0);
    }
    placement.x = event.clientX;
    placement.y = event.clientY;
    event.preventDefault();
  }

  function finishPlacement(event) {
    if (!placement || placement.pointerId !== event.pointerId) return;
    const current = placement;
    placement = null;
    if (!current.dragging) return;
    const screen = screenPoint(event);
    const valid = screen.x >= 8 && screen.x <= view.width - 8
      && screen.y >= view.playTop + 5 && screen.y < view.dockTop - 5;
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
    const collisionInset = 3;
    return [
      { x: goal.x, y: goal.y - t / 2, width: goal.width, height: t, angle: 0, collisionInset, material: MATERIALS.basket },
      { x: goal.x - goal.width / 2 + t / 2, y: goal.y - goal.height / 2, width: t, height: goal.height, angle: 0, collisionInset, material: MATERIALS.basket },
      { x: goal.x + goal.width / 2 - t / 2, y: goal.y - goal.height / 2, width: t, height: goal.height, angle: 0, collisionInset, material: MATERIALS.basket }
    ];
  }

  function getImpactRestitution(material, normalSpeed) {
    const impactSpeed = Math.abs(normalSpeed);
    if (impactSpeed < 0.3) return 0;
    const speedFactor = clamp((impactSpeed - 0.3) / 2.7, 0, 1);
    return material.restitution * (0.4 + speedFactor * 0.6);
  }

  function resolveBallRect(rect) {
    if (!ball) return false;
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

    const collisionRadius = Math.max(1, ball.radius - (rect.collisionInset || 0));
    if (distance >= collisionRadius) return false;
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
    if (ny < -0.15 && rect.material.rollingResistance) {
      supportContacts.push({ nx, ny, resistance: rect.material.rollingResistance });
    }
    const penetration = collisionRadius - distance;
    ball.x += nx * Math.max(0, penetration + 0.02);
    ball.y += ny * Math.max(0, penetration + 0.02);

    const radiusM = ball.radius / PIXELS_PER_METER;
    const rx = -nx * radiusM;
    const ry = -ny * radiusM;
    const contactVx = ball.vx - ball.omega * ry;
    const contactVy = ball.vy + ball.omega * rx;
    const normalSpeed = contactVx * nx + contactVy * ny;
    if (normalSpeed >= 0) return true;

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
    return true;
  }

  function applyRollingResistance(dt) {
    if (!ball) return;
    for (const contact of supportContacts) {
      const tx = -contact.ny;
      const ty = contact.nx;
      const tangentSpeed = ball.vx * tx + ball.vy * ty;
      const gravityAlongTangent = EARTH_GRAVITY * ty;
      let maxSlowdown = EARTH_GRAVITY * contact.resistance * dt;
      const movingDownhill = tangentSpeed * gravityAlongTangent > 0;
      if (movingDownhill && Math.abs(gravityAlongTangent) > 0.001) {
        maxSlowdown = Math.min(maxSlowdown, Math.abs(gravityAlongTangent) * dt * 0.85);
      }
      const slowdown = clamp(tangentSpeed, -maxSlowdown, maxSlowdown);
      ball.vx -= tx * slowdown;
      ball.vy -= ty * slowdown;
      ball.omega *= Math.exp(-contact.resistance * 12 * dt);

      const nearlyLevel = Math.abs(ty) < 0.005;
      if (nearlyLevel && Math.abs(tangentSpeed) < 0.025 && Math.abs(ball.omega) < 0.2) {
        ball.vx -= tx * (ball.vx * tx + ball.vy * ty);
        ball.omega = 0;
      }
    }
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

    supportContacts.length = 0;
    rods.forEach(rod => {
      const touched = resolveBallRect({
        x: rod.x,
        y: rod.y,
        width: rod.length,
        height: rod.thickness,
        angle: rod.angle,
        material: MATERIALS[rod.type]
      });
      if (touched) {
        rod.touched = true;
        touchedRodIds.add(rod.id);
      }
    });
    goals.forEach(goal => basketRects(goal).forEach(resolveBallRect));
    applyRollingResistance(dt);

    const insideGoal = goals.some(goal => {
      const innerHalf = goal.width / 2 - goal.thickness - ball.radius * 0.45;
      const insideX = Math.abs(ball.x - goal.x) < innerHalf;
      const insideY = ball.y > goal.y - goal.height + ball.radius * 0.25
        && ball.y < goal.y - goal.thickness - ball.radius * 0.1;
      return insideX && insideY;
    });

    const allRodsTouched = rods.length > 0 && rods.every(rod => touchedRodIds.has(rod.id));
    const stageGoalReady = appMode !== 'stage' || allRodsTouched;
    if (insideGoal && stageGoalReady && goalEnteredAt === null) goalEnteredAt = performance.now();
    if ((!insideGoal || !stageGoalReady) && goalEnteredAt !== null) {
      goalEnteredAt = null;
      goalHoldTime = 0;
    }
    if (goalEnteredAt !== null) {
      goalHoldTime = (performance.now() - goalEnteredAt) / 1000;
    }

    if (goalHoldTime >= GOAL_SUCCESS_DELAY) {
      won = true;
      ball.vx = 0;
      ball.vy = 0;
      ball.omega = 0;
      successPanel.hidden = false;
      if (appMode === 'stage' && currentStage) {
        unlockedStage = Math.max(unlockedStage, currentStage.number + 1);
        localStorage.setItem(PROGRESS_STORAGE_KEY, String(unlockedStage));
      }
      setHint('골인 성공!', 1800);
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
    if (appMode === 'stage' && rod.touched) {
      ctx.fillStyle = '#2fa66f';
      ctx.beginPath();
      ctx.arc(0, -rod.thickness - 9, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '800 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', 0, -rod.thickness - 9);
    }
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
      if (!(appMode === 'stage' && selected.fixed)) drawHandle(selected.x, selected.y, '#2674d9');
    } else {
      ctx.strokeRect(selected.x - selected.width / 2 - 8, selected.y - selected.height - 8, selected.width + 16, selected.height + 16);
      if (appMode !== 'stage') drawHandle(selected.x, selected.y - selected.height / 2, '#2674d9');
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
    if (!placement?.dragging) return;
    const point = screenToWorld(clientToCanvasPoint(placement.x, placement.y));
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
    accumulator += elapsed * gameSpeed;
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
  homeButton.addEventListener('click', showHome);
  document.querySelector('.stage-home-button').addEventListener('click', showHome);
  freeModeButton.addEventListener('click', startFreeMode);
  stageModeButton.addEventListener('click', showStageList);
  saveStageButton.addEventListener('click', saveEditedStage);
  cancelEditorButton.addEventListener('click', showStageList);
  developerButton.addEventListener('click', () => {
    developerPassword.value = '';
    developerError.hidden = true;
    developerDialog.showModal();
    developerPassword.focus();
  });
  developerForm.addEventListener('submit', event => {
    event.preventDefault();
    if (developerPassword.value !== DEVELOPER_PASSWORD) {
      developerError.hidden = false;
      return;
    }
    developerEnabled = true;
    localStorage.setItem(DEVELOPER_STORAGE_KEY, 'true');
    developerPassword.blur();
    developerDialog.close();
    showHome();
  });
  mapMakerButton.addEventListener('click', () => {
    const maxNumber = stages.reduce((maximum, stage) => Math.max(maximum, Number(stage.number) || 0), 0);
    document.getElementById('stageNumberInput').value = String(maxNumber + 1);
    stageSetupDialog.showModal();
  });
  stageSetupForm.addEventListener('submit', event => {
    event.preventDefault();
    document.activeElement?.blur?.();
    const number = Math.max(1, Number(document.getElementById('stageNumberInput').value));
    const limits = {
      wood: Math.max(0, Number(document.getElementById('woodLimitInput').value)),
      rubber: Math.max(0, Number(document.getElementById('rubberLimitInput').value)),
      steel: Math.max(0, Number(document.getElementById('steelLimitInput').value))
    };
    if (stages.some(stage => Number(stage.number) === number)) {
      stageSetupDialog.close();
      showHome();
      setHint('같은 스테이지 번호가 이미 있습니다.', 3200);
      return;
    }
    stageSetupDialog.close();
    startEditor(null, { number, limits });
  });
  confirmDeleteStageButton.addEventListener('click', () => {
    if (pendingDeleteStageId) {
      stages = stages.filter(stage => stage.id !== pendingDeleteStageId);
      persistStages();
    }
    pendingDeleteStageId = null;
    deleteStageDialog.close();
    renderStageList();
  });
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  speedButtons.forEach(button => button.addEventListener('click', () => {
    gameSpeed = Number(button.dataset.speed);
    localStorage.setItem(SPEED_STORAGE_KEY, String(gameSpeed));
    speedButtons.forEach(item => item.classList.toggle('active', item === button));
  }));
  confirmButton.addEventListener('click', () => {
    successPanel.hidden = true;
    if (appMode !== 'stage' || !currentStage) return;
    const nextStage = [...stages].sort((a, b) => a.number - b.number).find(stage => stage.number > currentStage.number);
    if (nextStage) loadStage(nextStage.id);
    else showStageList();
  });
  window.addEventListener('keydown', event => {
    if ((event.key === 'Delete' || event.key === 'Backspace') && selected) deleteSelected();
    if (event.code === 'Space' && ['free', 'stage', 'editor'].includes(appMode)) {
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
      MAX_ZOOM,
      GOAL_SUCCESS_DELAY
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
      appMode,
      developerEnabled,
      gameSpeed,
      unlockedStage,
      touchedRodIds: [...touchedRodIds],
      stages: clone(stages),
      goalHoldTime,
      spawn: { ...spawn },
      camera: { ...camera }
    }),
    addRod,
    addGoal,
    spawnBall,
    clearAll,
    resetGame,
    setZoomAt,
    showHome,
    showStageList,
    startFreeMode,
    loadStage,
    startEditor,
    resolveBallRect,
    setBallPosition: (x, y) => {
      if (ball) {
        ball.x = x;
        ball.y = y;
      }
    },
    setBallVelocity: (vx, vy) => {
      if (ball) {
        ball.vx = vx;
        ball.vy = vy;
      }
    },
    getImpactRestitution: (type, speed) => getImpactRestitution(MATERIALS[type], speed)
  };

  loadPersistentState();
  resize();
  updateDeleteButton();
  showHome();
  requestAnimationFrame(frame);
})();
