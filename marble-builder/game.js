(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const gameShell = document.querySelector('.game-shell');
  const spawnButton = document.getElementById('spawnButton');

  const deleteButton = document.getElementById('deleteButton');
  const resetButton = document.getElementById('resetButton');
  const toggleFixedButton = document.getElementById('toggleFixedButton');
  const undoButton = document.getElementById('undoButton');
  const redoButton = document.getElementById('redoButton');
  const saveMapButton = document.getElementById('saveMapButton');
  const followButton = document.getElementById('followButton');

  const confirmButton = document.getElementById('confirmButton');
  const successPanel = document.getElementById('successPanel');
  const hint = document.getElementById('hint');
  const toolDock = document.querySelector('.tool-dock');
  const topPanel = document.querySelector('.top-panel');
  const toolList = document.getElementById('toolList');
  const blockCatalogDialog = document.getElementById('blockCatalogDialog');
  const blockCatalogGrid = document.getElementById('blockCatalogGrid');
  const closeCatalogButton = document.getElementById('closeCatalogButton');
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

  const creationsList = document.getElementById('creationsList');
  const creationsEmpty = document.getElementById('creationsEmpty');
  const saveCreationDialog = document.getElementById('saveCreationDialog');
  const saveCreationForm = document.getElementById('saveCreationForm');
  const creationNameInput = document.getElementById('creationNameInput');
  const unsavedDialog = document.getElementById('unsavedDialog');
  const discardAndHomeButton = document.getElementById('discardAndHomeButton');
  const gravityDirectionDialog = document.getElementById('gravityDirectionDialog');
  const gravityDirectionForm = document.getElementById('gravityDirectionForm');
  const directionButtons = Array.from(document.querySelectorAll('[data-gravity-direction]'));
  const sizeEditorPanel = document.getElementById('sizeEditorPanel');
  const sizeEditorTitle = document.getElementById('sizeEditorTitle');
  const cancelSizeButton = document.getElementById('cancelSizeButton');
  const confirmSizeButton = document.getElementById('confirmSizeButton');


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

  const RECENT_TOOLS_STORAGE_KEY = 'marble-builder-recent-tools-v1';
  const CREATIONS_STORAGE_KEY = 'marble-builder-creations-v1';

  const MAX_RECENT_TOOLS = 8;
  const MAX_UNDO = 50;
  const DEFAULT_STAGES = [
    {
      id: 'stage-2', number: 2, name: '두 갈래 길',
      spawn: { x: 170, y: 145 },
      fixedBlocks: [
        { type: 'wood', x: 370, y: 285, length: 180, thickness: 14, angle: 0.28, fixed: true },
        { type: 'steel', x: 610, y: 420, length: 180, thickness: 14, angle: -0.18, fixed: true }
      ],
      supplyBlocks: [
        { supplyId: 'stage-2-rubber', type: 'rubber', angle: 0.35, editorX: 250, editorY: 470 },
        { supplyId: 'stage-2-steel', type: 'steel', angle: -0.3, editorX: 480, editorY: 520 }
      ],
      goals: [{ x: 820, y: 555, width: 126, height: 84, thickness: 11 }]
    }
  ];
  const MATERIALS = {
    wood: { label: '나무 길', color: '#a96c36', edge: '#70401f', friction: 0.38, restitution: 0.18, rollingResistance: 0.04 },
    rubber: { label: '고무 길', color: '#d9484f', edge: '#8e2630', friction: 0.82, restitution: 0.32, rollingResistance: 0.075 },
    steel: { label: '금속 길', color: '#aebcc6', edge: '#617381', friction: 0.14, restitution: 0.2, rollingResistance: 0.022 },
    slime: { label: '슬라임 길', color: '#65cf63', edge: '#278f42', friction: 0.62, restitution: 0.1, rollingResistance: 0.095, slime: true },
    electric: { label: '전기 발판', color: '#35bfe8', edge: '#174da0', friction: 0.2, restitution: 0.08, rollingResistance: 0.018, electric: true },
    basket: { friction: 0.48, restitution: 0.14, rollingResistance: 0.055 }
  };
  const BLOCK_CATALOG = [
    { type: 'wood', label: '나무 길', detail: '보통 마찰' },
    { type: 'rubber', label: '고무 길', detail: '강한 마찰' },
    { type: 'steel', label: '금속 길', detail: '약한 마찰' },
    { type: 'slime', label: '슬라임 길', detail: '낙하 높이의 2/3 반동' },
    { type: 'electric', label: '전기 발판', detail: '강한 낙하는 4/3 점프' },
    { type: 'antigravity', label: '반중력 필드', detail: '통과 가능한 방향 중력장' },
    { type: 'goal', label: '골인 바구니', detail: '공의 도착점' }
  ];

  const view = { width: 0, height: 0, dockTop: 0, playTop: 0, dpr: 1 };
  const camera = { x: 0, y: 0, zoom: MAX_ZOOM };
  const spawn = { x: 220, y: 150 };
  const rods = [];
  const goals = [];
  const fields = [];
  const particles = [];
  const specialContactsThisStep = new Set();
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

  let recentTools = ['wood:normal', 'rubber:normal', 'steel:normal', 'goal'];
  let stageSupplies = [];
  let creations = [];
  let activeCreationId = null;
  let followBall = false;
  let audioContext = null;
  let rollingAudio = null;
  let lastImpactSoundAt = 0;
  const undoStack = [];
  const redoStack = [];
  let freeModeDirty = false;
  let sizingMode = null;
  let pendingGravityDirection = 'up';
  const toolSettings = {
    wood: { length: 180, thickness: 14 },
    rubber: { length: 180, thickness: 17 },
    steel: { length: 180, thickness: 14 },
    slime: { length: 180, thickness: 18 },
    electric: { length: 180, thickness: 20 },
    antigravity: { width: 220, height: 160, direction: 'up' }
  };
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

  function normalizeStage(stage) {
    const normalized = clone(stage);
    const legacyRods = Array.isArray(normalized.rods) ? normalized.rods : [];
    normalized.fixedBlocks = (normalized.fixedBlocks || legacyRods.filter(rod => rod.fixed)).map(rod => ({
      ...rod,
      type: rod.type === 'fixed' ? 'wood' : rod.type,
      fixed: true
    }));
    normalized.supplyBlocks = (normalized.supplyBlocks || legacyRods.filter(rod => !rod.fixed).map((rod, index) => ({
      supplyId: `${normalized.id}-legacy-${index}`,
      type: rod.type === 'fixed' ? 'wood' : rod.type,
      angle: rod.angle || 0,
      editorX: rod.x,
      editorY: rod.y,
      length: rod.length,
      thickness: rod.thickness
    }))).map((block, index) => ({ ...block, supplyId: block.supplyId || `${normalized.id}-supply-${index}` }));
    if (normalized.supplyBlocks.length === 0 && normalized.limits) {
      let index = 0;
      ['wood', 'rubber', 'steel'].forEach(type => {
        for (let count = 0; count < (Number(normalized.limits[type]) || 0); count += 1) {
          normalized.supplyBlocks.push({
            supplyId: `${normalized.id}-limit-${index++}`,
            type,
            angle: 0,
            editorX: 220 + index * 42,
            editorY: 430 + (index % 2) * 70
          });
        }
      });
    }
    delete normalized.rods;
    delete normalized.limits;
    normalized.fields = Array.isArray(normalized.fields) ? normalized.fields : [];
    normalized.goals = Array.isArray(normalized.goals) ? normalized.goals.slice(0, 1) : [];
    return normalized;
  }

  function loadPersistentState() {
    stages = readStoredJson(STAGES_STORAGE_KEY, clone(DEFAULT_STAGES));
    if (!Array.isArray(stages) || stages.length === 0) stages = clone(DEFAULT_STAGES);
    stages = stages.map(normalizeStage);
    const removedBuiltInStage1 = stages.some(stage => stage.id === 'stage-1');
    stages = stages.filter(stage => stage.id !== 'stage-1');
    if (removedBuiltInStage1) localStorage.setItem(STAGES_STORAGE_KEY, JSON.stringify(stages));
    const storedRecent = readStoredJson(RECENT_TOOLS_STORAGE_KEY, recentTools);
    if (Array.isArray(storedRecent)) {
      recentTools = [...new Set(storedRecent.map(key => key === 'goal' ? 'goal' : `${String(key).split(':')[0]}:normal`))].slice(0, MAX_RECENT_TOOLS);
    }
    const firstStageNumber = stages.reduce((minimum, stage) => Math.min(minimum, Number(stage.number) || Infinity), Infinity);
    unlockedStage = Math.max(Number.isFinite(firstStageNumber) ? firstStageNumber : 1, Number(localStorage.getItem(PROGRESS_STORAGE_KEY)) || 1);
    developerEnabled = localStorage.getItem(DEVELOPER_STORAGE_KEY) === 'true';

    const storedCreations = readStoredJson(CREATIONS_STORAGE_KEY, []);
    creations = Array.isArray(storedCreations) ? storedCreations : [];

  }

  function persistStages() {
    localStorage.setItem(STAGES_STORAGE_KEY, JSON.stringify(stages));
  }

  function persistCreations() {
    localStorage.setItem(CREATIONS_STORAGE_KEY, JSON.stringify(creations));
  }

  function captureWorld() {
    return {
      rods: clone(rods),
      goals: clone(goals),
      fields: clone(fields),
      stageSupplies: clone(stageSupplies),
      spawn: { ...spawn },
      toolSettings: clone(toolSettings)
    };
  }

  function updateUndoButton() {
    undoButton.disabled = undoStack.length === 0;
    redoButton.disabled = redoStack.length === 0;
  }

  function pushUndo(snapshot = captureWorld()) {
    undoStack.push(snapshot);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0;
    if (appMode === 'free') freeModeDirty = true;
    updateUndoButton();
  }

  function restoreWorld(snapshot) {
    rods.splice(0, rods.length, ...clone(snapshot.rods));
    goals.splice(0, goals.length, ...clone(snapshot.goals));
    fields.splice(0, fields.length, ...clone(snapshot.fields || []));
    stageSupplies = clone(snapshot.stageSupplies);
    Object.assign(spawn, snapshot.spawn);
    if (snapshot.toolSettings) {
      Object.entries(snapshot.toolSettings).forEach(([type, settings]) => {
        toolSettings[type] = clone(settings);
      });
    }
    selected = null;
    ball = null;
    won = false;
    goalEnteredAt = null;
    goalHoldTime = 0;
    touchedRodIds.clear();
    rods.forEach(rod => { rod.touched = false; });
    successPanel.hidden = true;
    updateDeleteButton();
    updateToolAvailability();
  }

  function undoLastAction() {
    const snapshot = undoStack.pop();
    if (!snapshot) return;
    redoStack.push(captureWorld());
    restoreWorld(snapshot);
    if (appMode === 'free') freeModeDirty = true;
    updateUndoButton();
    setHint('이전 편집 상태로 되돌렸습니다.');
  }

  function redoLastAction() {
    const snapshot = redoStack.pop();
    if (!snapshot) return;
    undoStack.push(captureWorld());
    restoreWorld(snapshot);
    if (appMode === 'free') freeModeDirty = true;
    updateUndoButton();
    setHint('취소한 작업을 다시 실행했습니다.');
  }

  function renderCreations() {
    creationsList.replaceChildren();
    creationsEmpty.hidden = creations.length > 0;
    [...creations].sort((a, b) => b.updatedAt - a.updatedAt).forEach(creation => {
      const card = document.createElement('article');
      card.className = 'creation-card';
      const name = document.createElement('strong');
      name.textContent = creation.name;
      const detail = document.createElement('small');
      detail.textContent = `블록 ${(creation.rods?.length || 0) + (creation.fields?.length || 0)}개 · 바구니 ${creation.goals.length}개`;
      const actions = document.createElement('div');
      actions.className = 'creation-actions';
      const open = document.createElement('button');
      open.type = 'button';
      open.textContent = '열기';
      open.addEventListener('click', () => loadCreation(creation.id));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'delete-creation';
      remove.textContent = '삭제';
      remove.addEventListener('click', () => {
        if (!window.confirm(`“${creation.name}” 작품을 삭제할까요?`)) return;
        creations = creations.filter(item => item.id !== creation.id);
        persistCreations();
        renderCreations();
      });
      actions.append(open, remove);
      card.append(name, detail, actions);
      creationsList.append(card);
    });
  }

  function loadCreation(id) {
    const creation = creations.find(item => item.id === id);
    if (!creation) return;
    clearWorldState();
    activeCreationId = id;
    rods.push(...clone(creation.rods).map(rod => ({ ...rod, id: nextId++, kind: 'rod', fixed: false, touched: false })));
    goals.push(...clone(creation.goals).map(goal => ({ ...goal, id: nextId++, kind: 'goal' })));
    fields.push(...clone(creation.fields || []).map(field => ({ ...field, id: nextId++, kind: 'field' })));
    Object.assign(spawn, creation.spawn || { x: 220, y: 150 });
    Object.assign(camera, creation.camera || { x: 0, y: 0, zoom: MAX_ZOOM });
    setAppMode('free');
    freeModeDirty = false;
    setHint(`“${creation.name}” 작품을 불러왔습니다.`);
  }

  function openSaveCreation() {
    const current = creations.find(item => item.id === activeCreationId);
    creationNameInput.value = current?.name || `내 작품 ${creations.length + 1}`;
    saveCreationDialog.showModal();
    creationNameInput.focus();
    creationNameInput.select();
  }

  function saveCreation(name) {
    const now = Date.now();
    const saved = {
      id: activeCreationId || `creation-${now}`,
      name: name.trim() || `내 작품 ${creations.length + 1}`,
      rods: rods.map(({ id, kind, touched, fixed, supplyId, angleLocked, ...rod }) => ({ ...rod })),
      goals: goals.map(({ id, kind, ...goal }) => ({ ...goal })),
      fields: fields.map(({ id, kind, ...field }) => ({ ...field })),
      spawn: { ...spawn },
      camera: { ...camera },
      updatedAt: now
    };
    const index = creations.findIndex(item => item.id === saved.id);
    if (index >= 0) creations[index] = saved;
    else creations.push(saved);
    activeCreationId = saved.id;
    persistCreations();
    freeModeDirty = false;
    setHint(`“${saved.name}” 작품을 저장했습니다.`);
  }

  function ensureAudio() {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  }

  function playImpactSound(type, speed) {
    const audio = ensureAudio();
    const now = performance.now();
    if (!audio || now - lastImpactSoundAt < 70 || speed < 0.35) return;
    lastImpactSoundAt = now;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    const slime = type === 'slime';
    const electric = type === 'electric';
    osc.type = slime ? 'sine' : electric ? 'square' : type === 'steel' ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(slime ? 115 : electric ? 980 : type === 'steel' ? 720 : type === 'rubber' ? 170 : 310, audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(slime ? 72 : electric ? 220 : 120, audio.currentTime + (slime ? .16 : electric ? .13 : .055));
    gain.gain.setValueAtTime(Math.min(.16, .025 + speed * .018), audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + (slime ? .18 : .07));
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + (slime ? .19 : .08));
  }

  function updateRollingSound(type, speed) {
    const audio = ensureAudio();
    if (!audio || speed < .08) {
      if (rollingAudio) rollingAudio.gain.gain.setTargetAtTime(.0001, audioContext.currentTime, .04);
      return;
    }
    if (!rollingAudio) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sawtooth';
      gain.gain.value = .0001;
      osc.connect(gain).connect(audio.destination);
      osc.start();
      rollingAudio = { osc, gain };
    }
    rollingAudio.osc.type = type === 'slime' ? 'sine' : type === 'electric' ? 'square' : 'sawtooth';
    rollingAudio.osc.frequency.setTargetAtTime((type === 'slime' ? 48 : type === 'electric' ? 150 : 72) + Math.min(100, speed * 18), audio.currentTime, .03);
    rollingAudio.gain.gain.setTargetAtTime(Math.min(type === 'slime' ? .055 : .035, speed * .012), audio.currentTime, .04);
  }

  function spawnContactParticles(x, y, type, strength = 1) {
    const count = Math.min(24, Math.max(7, Math.round(7 + strength * 2)));
    for (let index = 0; index < count; index += 1) {
      const angle = -Math.PI + Math.random() * Math.PI;
      const speed = 35 + Math.random() * (65 + strength * 12);
      particles.push({
        x, y, type, life: 0.35 + Math.random() * 0.35, maxLife: 0.7,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        size: 2 + Math.random() * 4
      });
    }
    if (particles.length > 140) particles.splice(0, particles.length - 140);
  }

  function updateParticles(dt) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.life -= dt;
      if (particle.life <= 0) { particles.splice(index, 1); continue; }
      particle.vy += 180 * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
    }
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

  function toolKey(type, fixed = false) {
    return type === 'goal' ? 'goal' : `${type}:${fixed ? 'fixed' : 'normal'}`;
  }

  function toolDescriptor(key) {
    if (key === 'goal') return { type: 'goal', fixed: false };
    const [type, state] = String(key).split(':');
    return { type, fixed: state === 'fixed' };
  }

  function rememberTool(type, fixed = false) {
    const key = toolKey(type, fixed);
    recentTools = [key, ...recentTools.filter(item => item !== key)].slice(0, MAX_RECENT_TOOLS);
    localStorage.setItem(RECENT_TOOLS_STORAGE_KEY, JSON.stringify(recentTools));
  }

  function createToolIcon(type, angle = null) {
    const icon = document.createElement('span');
    icon.className = type === 'goal' ? 'tool-icon basket' : type === 'antigravity' ? 'tool-icon antigravity' : `tool-icon road ${type}`;
    if (angle !== null && type !== 'goal') icon.style.setProperty('--tool-angle', `${angle}rad`);
    return icon;
  }

  function createToolCard(descriptor) {
    const catalog = BLOCK_CATALOG.find(item => item.type === descriptor.type);
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'tool-card';
    card.dataset.tool = descriptor.type;
    card.dataset.fixed = descriptor.fixed ? 'true' : 'false';
    if (descriptor.supplyId) card.dataset.supplyId = descriptor.supplyId;
    if (Number.isFinite(descriptor.angle)) card.dataset.angle = String(descriptor.angle);
    const settings = descriptor.supplyId ? descriptor : toolSettings[descriptor.type] || {};
    if (settings.length) card.dataset.length = String(settings.length);
    if (settings.thickness) card.dataset.thickness = String(settings.thickness);
    if (settings.width) card.dataset.width = String(settings.width);
    if (settings.height) card.dataset.height = String(settings.height);
    if (settings.direction) card.dataset.direction = settings.direction;
    card.append(createToolIcon(descriptor.type, descriptor.angle ?? null));
    const label = document.createElement('span');
    label.textContent = catalog?.label || MATERIALS[descriptor.type]?.label || descriptor.type;
    const detail = document.createElement('small');
    detail.textContent = descriptor.supplyId
      ? `${Math.round((descriptor.angle || 0) * 180 / Math.PI)}°`
      : catalog?.detail || '';
    card.append(label, detail);
    if (descriptor.type !== 'goal' && descriptor.type !== 'antigravity' && appMode === 'editor') {
      const badge = document.createElement('b');
      badge.className = `state-badge${descriptor.fixed ? ' fixed' : ''}`;
      badge.textContent = descriptor.fixed ? '고정' : '플레이어 지급';
      card.append(badge);
    }
    card.addEventListener('pointerdown', beginPlacement);
    if (descriptor.type === 'goal' && goals.length >= 1) card.disabled = true;
    return card;
  }

  function renderToolDock() {
    toolList.replaceChildren();
    toolList.scrollLeft = 0;
    if (appMode === 'stage') {
      stageSupplies.filter(item => !item.used).forEach(item => toolList.append(createToolCard(item)));
      if (stageSupplies.length > 0 && stageSupplies.every(item => item.used)) {
        const empty = document.createElement('span');
        empty.className = 'tool-card';
        empty.textContent = '모든 블록 사용 완료';
        toolList.append(empty);
      }
      return;
    }
    recentTools
      .map(toolDescriptor)
      .filter(item => appMode === 'editor' || !item.fixed)
      .forEach(item => toolList.append(createToolCard(item)));
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'tool-card more-card';
    more.textContent = '•••';
    more.setAttribute('aria-label', '모든 블록 보기');
    more.addEventListener('click', openBlockCatalog);
    toolList.append(more);
  }

  function selectCatalogTool(type) {
    rememberTool(type, false);
    renderToolDock();
    blockCatalogDialog.close();
    setHint(`${BLOCK_CATALOG.find(item => item.type === type)?.label || type}을 최근 블록에 추가했습니다.`);
  }

  function openBlockCatalog() {
    blockCatalogGrid.replaceChildren();
    BLOCK_CATALOG.forEach(block => {
      const item = document.createElement('article');
      item.className = 'catalog-item';
      item.append(createToolIcon(block.type));
      const name = document.createElement('strong');
      name.textContent = block.label;
      const actions = document.createElement('div');
      actions.className = 'catalog-actions one-choice';
      const select = document.createElement('button');
      select.type = 'button';
      select.textContent = '선택';
      select.addEventListener('click', () => selectCatalogTool(block.type));
      actions.append(select);
      item.append(name, actions);
      if (block.type !== 'goal') {
        const settings = document.createElement('button');
        settings.type = 'button';
        settings.className = 'catalog-settings';
        settings.textContent = '설정';
        settings.addEventListener('click', () => configureTool(block.type));
        item.append(settings);
      }
      blockCatalogGrid.append(item);
    });
    blockCatalogDialog.showModal();
  }

  function configureTool(type) {
    blockCatalogDialog.close();
    if (type === 'antigravity') {
      pendingGravityDirection = toolSettings.antigravity.direction || 'up';
      directionButtons.forEach(button => button.classList.toggle('active', button.dataset.gravityDirection === pendingGravityDirection));
      gravityDirectionDialog.showModal();
      return;
    }
    beginToolSizing(type);
  }

  function beginToolSizing(type) {
    sizingMode = { type, pointerId: null, start: null, preview: null };
    sizeEditorTitle.textContent = `${BLOCK_CATALOG.find(item => item.type === type)?.label || type} 크기 설정`;
    sizeEditorPanel.hidden = false;
    topPanel.hidden = true;
    toolDock.hidden = true;
    hint.hidden = true;
    confirmSizeButton.disabled = true;
  }

  function finishToolSizing(apply) {
    if (apply && sizingMode?.preview) {
      pushUndo();
      const preview = sizingMode.preview;
      if (sizingMode.type === 'antigravity') {
        toolSettings.antigravity = { width: preview.width, height: preview.height, direction: pendingGravityDirection };
      } else {
        toolSettings[sizingMode.type] = { length: preview.width, thickness: preview.height };
      }
      rememberTool(sizingMode.type, false);
      renderToolDock();
      setHint('설정한 크기를 다음 블록 배치에 적용합니다.');
    }
    sizingMode = null;
    sizeEditorPanel.hidden = true;
    topPanel.hidden = false;
    toolDock.hidden = false;
    hint.hidden = false;
    requestAnimationFrame(resize);
  }

  function setAppMode(mode) {
    appMode = mode;
    document.body.className = `is-${mode}`;
    homeScreen.hidden = mode !== 'home';
    stageScreen.hidden = mode !== 'stage-list';
    saveStageButton.hidden = mode !== 'editor';
    cancelEditorButton.hidden = mode !== 'editor';
    toggleFixedButton.hidden = mode !== 'editor';
    undoButton.hidden = !['free', 'stage', 'editor'].includes(mode);
    redoButton.hidden = !['free', 'stage', 'editor'].includes(mode);
    saveMapButton.hidden = mode !== 'free';
    followButton.hidden = !['free', 'stage'].includes(mode);
    followButton.textContent = followBall ? '따라가기 끄기' : '공 따라가기';
    followButton.setAttribute('aria-pressed', String(followBall));
    gameTitle.textContent = mode === 'editor' ? '스테이지 만들기' : mode === 'stage' ? `${currentStage?.number || ''}스테이지` : '공 굴리기 연구소';
    gameSubtitle.textContent = mode === 'stage' ? '주어진 블록을 모두 쓰고 모든 블록을 통과하세요.' : mode === 'editor' ? '블록을 선택해 고정하거나 플레이어 지급 블록으로 만드세요.' : '지구 중력 9.81m/s² · 실제 마찰과 회전 관성';
    renderToolDock();
    updateDeleteButton();
    requestAnimationFrame(resize);
  }

  function clearWorldState() {
    rods.length = 0;
    goals.length = 0;
    fields.length = 0;
    particles.length = 0;
    ball = null;
    selected = null;
    placement = null;
    editDrag = null;
    won = false;
    goalHoldTime = 0;
    goalEnteredAt = null;
    stageSupplies = [];
    undoStack.length = 0;
    redoStack.length = 0;
    touchedRodIds.clear();
    successPanel.hidden = true;
    updateDeleteButton();
    updateUndoButton();
  }

  function showHome() {
    clearWorldState();
    currentStage = null;
    editorStageId = null;
    developerButton.classList.toggle('active', developerEnabled);
    developerButton.textContent = developerEnabled ? '개발자 모드 끄기' : '개발자 모드';
    mapMakerButton.hidden = !developerEnabled;
    stageProgressText.textContent = `${unlockedStage}스테이지까지 도전 가능`;
    renderCreations();
    setAppMode('home');
  }

  function requestHome() {
    if (appMode === 'free' && freeModeDirty) {
      unsavedDialog.showModal();
      return;
    }
    showHome();
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
      const fixedCount = stage.fixedBlocks?.length || 0;
      const supplyCount = stage.supplyBlocks?.length || 0;
      detail.textContent = `고정 ${fixedCount}개 · 플레이어 지급 ${supplyCount}개`;
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

  function hydrateStage(stage, mode) {
    clearWorldState();
    spawn.x = stage.spawn?.x ?? 220;
    spawn.y = stage.spawn?.y ?? 150;
    (stage.fixedBlocks || []).forEach(source => rods.push({ ...clone(source), fixed: true, id: nextId++, kind: 'rod', touched: false }));
    if (mode === 'editor') {
      (stage.supplyBlocks || []).forEach((source, index) => rods.push({
        type: source.type,
        x: source.editorX ?? 220 + index * 45,
        y: source.editorY ?? 430 + (index % 2) * 70,
        length: source.length || DEFAULT_ROD_LENGTH,
        thickness: source.thickness || (source.type === 'rubber' ? 17 : 14),
        angle: source.angle || 0,
        fixed: false,
        supplyId: source.supplyId,
        id: nextId++,
        kind: 'rod',
        touched: false
      }));
    } else {
      stageSupplies = (stage.supplyBlocks || []).map(source => ({ ...clone(source), used: false }));
    }
    (stage.goals || []).forEach(source => goals.push({ ...clone(source), id: nextId++, kind: 'goal' }));
    (stage.fields || []).forEach(source => fields.push({ ...clone(source), id: nextId++, kind: 'field' }));
  }

  function loadStage(stageId) {
    const stage = stages.find(item => item.id === stageId);
    if (!stage) return;
    currentStage = clone(stage);
    editorStageId = null;
    hydrateStage(currentStage, 'stage');
    successTitle.textContent = '스테이지 성공!';
    successMessage.textContent = '모든 블록을 사용하고 통과해 바구니에 도착했어요.';
    setAppMode('stage');
    setHint('주어진 블록을 모두 사용하고, 모든 블록에 공을 닿게 하세요.', 3600);
  }

  function startFreeMode() {
    currentStage = null;
    editorStageId = null;
    activeCreationId = null;
    clearWorldState();
    successTitle.textContent = '골인!';
    successMessage.textContent = '공이 바구니에 도착했어요.';
    setAppMode('free');
    freeModeDirty = false;
    setHint('자유 모드: 개수 제한 없이 길을 만들 수 있어요.', 3200);
  }

  function startEditor(stage = null, setup = null) {
    const source = normalizeStage(stage || {
      id: `stage-${Date.now()}`,
      number: setup.number,
      name: `${setup.number}스테이지`,
      spawn: { x: spawn.x, y: spawn.y },
      fixedBlocks: [], supplyBlocks: [], goals: [], fields: []
    });
    currentStage = clone(source);
    editorStageId = stage?.id || null;
    camera.x = 0;
    camera.y = 0;
    camera.zoom = MAX_ZOOM;
    hydrateStage(currentStage, 'editor');
    setAppMode('editor');
    setHint('고정 블록은 불투명, 플레이어 지급 블록은 반투명으로 표시됩니다.', 3400);
  }

  function saveEditedStage() {
    if (goals.length === 0) {
      setHint('골인 바구니를 한 개 이상 배치해 주세요.', 3200);
      return;
    }
    if (rods.length === 0) {
      setHint('블록을 한 개 이상 배치해 주세요.', 3200);
      return;
    }
    const fixedBlocks = rods.filter(rod => rod.fixed).map(({ id, kind, touched, supplyId, ...rod }) => ({ ...rod, fixed: true }));
    const supplyBlocks = rods.filter(rod => !rod.fixed).map((rod, index) => ({
      supplyId: rod.supplyId || `${currentStage.id}-supply-${Date.now()}-${index}`,
      type: rod.type,
      angle: rod.angle,
      editorX: rod.x,
      editorY: rod.y,
      length: rod.length,
      thickness: rod.thickness
    }));
    const saved = normalizeStage({
      ...currentStage,
      number: Number(currentStage.number),
      spawn: { x: spawn.x, y: spawn.y },
      fixedBlocks,
      supplyBlocks,
      goals: goals.map(({ id, kind, ...goal }) => ({ ...goal })),
      fields: fields.map(({ id, kind, ...field }) => ({ ...field }))
    });
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

  function updateToolAvailability() {
    renderToolDock();
  }

  function updateDeleteButton() {
    deleteButton.disabled = !selected || (appMode === 'stage' && (selected?.fixed || selected?.kind === 'field'));
    const canToggleFixed = appMode === 'editor' && selected?.kind === 'rod';
    toggleFixedButton.disabled = !canToggleFixed;
    toggleFixedButton.textContent = canToggleFixed && selected.fixed ? '고정 해제' : '고정';
    toggleFixedButton.setAttribute('aria-pressed', String(Boolean(canToggleFixed && selected.fixed)));
  }

  function toggleSelectedFixed() {
    if (appMode !== 'editor' || selected?.kind !== 'rod') return;
    pushUndo();
    selected.fixed = !selected.fixed;
    selected.angleLocked = false;
    selected.supplyId = null;
    updateDeleteButton();
    setHint(selected.fixed ? '선택한 블록을 고정했습니다.' : '선택한 블록의 고정을 해제했습니다.');
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.width = width;
    view.height = height;
    view.dpr = dpr;
    const bitmapWidth = Math.round(width * dpr);
    const bitmapHeight = Math.round(height * dpr);
    if (canvas.width !== bitmapWidth) canvas.width = bitmapWidth;
    if (canvas.height !== bitmapHeight) canvas.height = bitmapHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view.dockTop = toolDock.getBoundingClientRect().top - rect.top;
    view.playTop = topPanel.getBoundingClientRect().bottom - rect.top;

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
      fallPeakY: spawn.y,
      specialContacts: [],
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

  function rodBounds(rod) {
    const cos = Math.abs(Math.cos(rod.angle || 0));
    const sin = Math.abs(Math.sin(rod.angle || 0));
    const halfWidth = cos * rod.length / 2 + sin * rod.thickness / 2;
    const halfHeight = sin * rod.length / 2 + cos * rod.thickness / 2;
    return { left: rod.x - halfWidth, right: rod.x + halfWidth, top: rod.y - halfHeight, bottom: rod.y + halfHeight };
  }

  function goalBounds(goal) {
    return { left: goal.x - goal.width / 2, right: goal.x + goal.width / 2, top: goal.y - goal.height, bottom: goal.y };
  }

  function boundsOverlap(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function orientedRectCorners(rect) {
    const cos = Math.cos(rect.angle || 0);
    const sin = Math.sin(rect.angle || 0);
    const hw = rect.width / 2;
    const hh = rect.height / 2;
    return [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(([x,y]) => ({ x: rect.x + x * cos - y * sin, y: rect.y + x * sin + y * cos }));
  }

  function polygonsOverlap(a, b) {
    const axes = [];
    for (const polygon of [a, b]) {
      for (let index = 0; index < polygon.length; index += 1) {
        const p = polygon[index];
        const q = polygon[(index + 1) % polygon.length];
        const length = Math.hypot(q.x - p.x, q.y - p.y) || 1;
        axes.push({ x: -(q.y - p.y) / length, y: (q.x - p.x) / length });
      }
    }
    return axes.every(axis => {
      const project = polygon => polygon.map(point => point.x * axis.x + point.y * axis.y);
      const pa = project(a); const pb = project(b);
      return Math.max(...pa) > Math.min(...pb) && Math.max(...pb) > Math.min(...pa);
    });
  }

  function rodOverlapsGoal(rod, goal) {
    const rodPolygon = orientedRectCorners({ x: rod.x, y: rod.y, width: rod.length, height: rod.thickness, angle: rod.angle });
    return basketRects(goal).some(wall => polygonsOverlap(rodPolygon, orientedRectCorners(wall)));
  }

  function rodOverlapsAnyGoal(rod) {
    return goals.some(goal => rodOverlapsGoal(rod, goal));
  }

  function goalOverlapsAnyRod(goal) {
    return rods.some(rod => rodOverlapsGoal(rod, goal));
  }

  function addRod(type, x, y, options = {}) {
    const rod = {
      id: nextId++,
      kind: 'rod',
      type,
      x,
      y,
      length: options.length || DEFAULT_ROD_LENGTH,
      thickness: options.thickness || (type === 'rubber' ? 17 : 14),
      angle: Number.isFinite(options.angle) ? options.angle : 0,
      fixed: Boolean(options.fixed),
      supplyId: options.supplyId || null,
      angleLocked: appMode === 'stage' && !options.fixed,
      touched: false
    };
    if (rodOverlapsAnyGoal(rod)) {
      setHint('골인 바구니와 블록은 겹칠 수 없습니다.');
      return null;
    }
    pushUndo();
    rods.push(rod);
    if (appMode === 'stage' && rod.supplyId) {
      const supply = stageSupplies.find(item => item.supplyId === rod.supplyId);
      if (supply) supply.used = true;
    } else if (appMode === 'free' || appMode === 'editor') {
      rememberTool(type, rod.fixed);
    }
    selectEntity(rod);
    updateToolAvailability();
    setHint(appMode === 'stage' ? '저장된 각도로 배치했습니다. 위치만 바꿀 수 있어요.' : '주황색 끝점은 각도, 파란색 가운데 점은 위치를 바꿉니다.');
    return rod;
  }

  function addGoal(x, centerY) {
    if (goals.length >= 1) {
      setHint('골인 바구니는 하나만 설치할 수 있습니다.');
      return null;
    }
    const goal = {
      id: nextId++,
      kind: 'goal',
      x,
      y: centerY + 42,
      width: 126,
      height: 84,
      thickness: 11
    };
    if (goalOverlapsAnyRod(goal)) {
      setHint('골인 바구니와 블록은 겹칠 수 없습니다.');
      return null;
    }
    pushUndo();
    goals.push(goal);
    rememberTool('goal');
    selectEntity(goal);
    updateToolAvailability();
    setHint('바구니의 파란 점을 끌어 골인 지점을 옮길 수 있어요.');
    return goal;
  }

  function addField(x, y, options = {}) {
    const field = {
      id: nextId++,
      kind: 'field',
      type: 'antigravity',
      x,
      y,
      width: options.width || toolSettings.antigravity.width,
      height: options.height || toolSettings.antigravity.height,
      direction: options.direction || toolSettings.antigravity.direction || 'up'
    };
    pushUndo();
    fields.push(field);
    rememberTool('antigravity');
    selectEntity(field);
    updateToolAvailability();
    setHint('반중력 필드 안에서는 화살표 방향으로 중력이 흐릅니다.');
    return field;
  }

  function selectEntity(entity) {
    selected = entity;
    updateDeleteButton();
  }

  function deleteSelected() {
    if (!selected) return;
    if (appMode === 'stage' && (selected.fixed || selected.kind === 'field')) {
      setHint('고정 스틱은 삭제하거나 옮길 수 없습니다.');
      return;
    }
    pushUndo();
    const list = selected.kind === 'rod' ? rods : selected.kind === 'field' ? fields : goals;
    const index = list.indexOf(selected);
    if (index >= 0) list.splice(index, 1);
    if (appMode === 'stage' && selected.kind === 'rod' && selected.supplyId) {
      const supply = stageSupplies.find(item => item.supplyId === selected.supplyId);
      if (supply) supply.used = false;
    }
    selected = null;
    editDrag = null;
    updateDeleteButton();
    updateToolAvailability();
    setHint('선택한 블록을 삭제했습니다.');
  }

  function clearAll() {
    if (rods.length === 0 && goals.length === 0 && fields.length === 0) return;
    pushUndo();
    rods.length = 0;
    goals.length = 0;
    fields.length = 0;
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

  function pointInField(point, field) {
    return Math.abs(point.x - field.x) <= field.width / 2 && Math.abs(point.y - field.y) <= field.height / 2;
  }

  function findEntity(point) {
    for (let i = goals.length - 1; i >= 0; i -= 1) {
      if (pointInGoal(point, goals[i])) return goals[i];
    }
    for (let i = rods.length - 1; i >= 0; i -= 1) {
      if (pointInRod(point, rods[i])) return rods[i];
    }
    for (let i = fields.length - 1; i >= 0; i -= 1) {
      if (pointInField(point, fields[i])) return fields[i];
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

  function makeEditDrag(pointerId, mode, entity, extra = {}) {
    return {
      pointerId,
      mode,
      entity,
      beforeSnapshot: captureWorld(),
      original: { x: entity.x, y: entity.y, angle: entity.angle || 0 },
      ...extra
    };
  }

  function beginCanvasInteraction(event) {
    if (placement || event.button > 0) return;
    const screen = screenPoint(event);
    if (sizingMode) {
      sizingMode.pointerId = event.pointerId;
      sizingMode.start = screenToWorld(screen);
      sizingMode.preview = null;
      canvas.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }
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
      const rotatesAroundCenter = fixedInPlayer || (appMode === 'editor' && selected.fixed);
      const angleLockedInPlayer = appMode === 'stage' && selected.angleLocked;
      if (distanceSquared(point, ends.start) <= handleRadius * handleRadius) {
        editDrag = rotatesAroundCenter
          ? makeEditDrag(event.pointerId, 'rotateFixed', selected)
          : angleLockedInPlayer ? null : makeEditDrag(event.pointerId, 'start', selected, { fixed: ends.end });
      } else if (distanceSquared(point, ends.end) <= handleRadius * handleRadius) {
        editDrag = rotatesAroundCenter
          ? makeEditDrag(event.pointerId, 'rotateFixed', selected)
          : angleLockedInPlayer ? null : makeEditDrag(event.pointerId, 'end', selected, { fixed: ends.start });
      } else if (!fixedInPlayer && distanceSquared(point, selected) <= handleRadius * handleRadius) {
        editDrag = makeEditDrag(event.pointerId, 'move', selected, { offsetX: point.x - selected.x, offsetY: point.y - selected.y });
      }
    } else if (selected?.kind === 'goal' && appMode !== 'stage') {
      const handle = { x: selected.x, y: selected.y - selected.height / 2 };
      if (distanceSquared(point, handle) <= handleRadius * handleRadius) {
        editDrag = makeEditDrag(event.pointerId, 'moveGoal', selected, { offsetX: point.x - selected.x, offsetY: point.y - selected.y });
      }
    }

    if (!editDrag) {
      const entity = findEntity(point);
      selectEntity(entity);
      if (entity?.kind === 'rod' && !(appMode === 'stage' && entity.fixed)) {
        editDrag = makeEditDrag(event.pointerId, 'move', entity, { offsetX: point.x - entity.x, offsetY: point.y - entity.y });
      } else if (entity?.kind === 'goal' && appMode !== 'stage') {
        editDrag = makeEditDrag(event.pointerId, 'moveGoal', entity, { offsetX: point.x - entity.x, offsetY: point.y - entity.y });
      } else if (entity?.kind === 'field' && appMode !== 'stage') {
        editDrag = makeEditDrag(event.pointerId, 'moveField', entity, { offsetX: point.x - entity.x, offsetY: point.y - entity.y });
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
    if (sizingMode?.pointerId === event.pointerId) {
      const point = screenToWorld(screenPoint(event));
      const width = clamp(Math.abs(point.x - sizingMode.start.x), 40, 600);
      const height = clamp(Math.abs(point.y - sizingMode.start.y), 12, 420);
      sizingMode.preview = { x: (point.x + sizingMode.start.x) / 2, y: (point.y + sizingMode.start.y) / 2, width, height };
      confirmSizeButton.disabled = false;
      event.preventDefault();
      return;
    }
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
      if (editDrag.mode === 'move' || editDrag.mode === 'moveGoal' || editDrag.mode === 'moveField') {
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
    if (sizingMode?.pointerId === event.pointerId) {
      sizingMode.pointerId = null;
      event.preventDefault();
      return;
    }
    if (!activePointers.has(event.pointerId)) return;
    activePointers.delete(event.pointerId);
    if (editDrag?.pointerId === event.pointerId) {
      const blocked = editDrag.entity.kind === 'field' ? false : editDrag.entity.kind === 'goal'
        ? goalOverlapsAnyRod(editDrag.entity)
        : rodOverlapsAnyGoal(editDrag.entity);
      if (blocked) {
        Object.assign(editDrag.entity, editDrag.original);
        setHint('골인 바구니와 블록은 겹칠 수 없습니다.');
      } else {
        const entity = editDrag.entity;
        const changed = Math.abs(entity.x - editDrag.original.x) > .01
          || Math.abs(entity.y - editDrag.original.y) > .01
          || Math.abs((entity.angle || 0) - editDrag.original.angle) > .001;
        if (changed) pushUndo(editDrag.beforeSnapshot);
      }
      editDrag = null;
    }
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
      fixed: card.dataset.fixed === 'true',
      supplyId: card.dataset.supplyId || null,
      angle: Number.isFinite(Number(card.dataset.angle)) ? Number(card.dataset.angle) : 0,
      length: Number(card.dataset.length) || undefined,
      thickness: Number(card.dataset.thickness) || undefined,
      width: Number(card.dataset.width) || undefined,
      height: Number(card.dataset.height) || undefined,
      direction: card.dataset.direction || undefined,
      pointerType: event.pointerType,
      card,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      mode: event.pointerType === 'touch' ? 'pending' : 'drag',
      dragging: event.pointerType !== 'touch',
      x: event.clientX,
      y: event.clientY
    };
    selected = null;
    updateDeleteButton();
    card.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    if (placement.dragging) setHint('게임 화면의 원하는 위치에서 손을 놓아 배치하세요.', 0);
  }

  function updatePlacement(event) {
    if (!placement || placement.pointerId !== event.pointerId) return;
    const dx = event.clientX - placement.startX;
    const dy = event.clientY - placement.startY;
    if (placement.mode === 'pending' && Math.hypot(dx, dy) >= 9) {
      placement.mode = Math.abs(dx) > Math.abs(dy) ? 'scroll' : 'drag';
      placement.dragging = placement.mode === 'drag';
      if (placement.dragging) setHint('게임 화면의 원하는 위치에서 손을 놓아 배치하세요.', 0);
    }
    if (placement.mode === 'scroll') {
      toolList.scrollLeft -= event.clientX - placement.lastX;
      placement.lastX = event.clientX;
      event.preventDefault();
      return;
    }
    if (!placement.dragging) return;
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
      else if (current.tool === 'antigravity') addField(point.x, point.y, current);
      else addRod(current.tool, point.x, point.y, {
        fixed: current.fixed,
        supplyId: current.supplyId,
        angle: current.angle,
        length: current.length,
        thickness: current.thickness
      });
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

  function reboundSpeed(fallDistanceMeters, reboundRatio) {
    return Math.sqrt(2 * EARTH_GRAVITY * Math.max(0, fallDistanceMeters) * reboundRatio);
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
      supportContacts.push({ nx, ny, resistance: rect.material.rollingResistance, type: rect.blockType || 'wood' });
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
    if ((rect.material.slime || rect.material.electric) && ny < -0.25) {
      specialContactsThisStep.add(`${rect.material.slime ? 'slime' : 'electric'}:${rect.blockId}`);
    }
    if (normalSpeed >= 0) return true;
    playImpactSound(rect.blockType || 'wood', Math.abs(normalSpeed));

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
    const specialType = rect.material.slime ? 'slime' : rect.material.electric ? 'electric' : null;
    if (specialType && ny < -0.25) {
      const contactKey = `${specialType}:${rect.blockId}`;
      specialContactsThisStep.add(contactKey);
      const isFreshContact = !ball.specialContacts.includes(contactKey);
      if (isFreshContact) {
        const fallDistanceMeters = Math.max(0, (ball.y - (ball.fallPeakY ?? ball.y)) / PIXELS_PER_METER);
        if (specialType === 'slime' && fallDistanceMeters >= 0.025) {
          const targetNormalSpeed = reboundSpeed(fallDistanceMeters, 2 / 3);
          const outgoingNormalSpeed = ball.vx * nx + ball.vy * ny;
          const boost = Math.max(0, targetNormalSpeed - outgoingNormalSpeed);
          ball.vx += nx * boost;
          ball.vy += ny * boost;
          ball.fallPeakY = ball.y;
          spawnContactParticles(ball.x - nx * ball.radius, ball.y - ny * ball.radius, 'slime', Math.abs(normalSpeed));
        } else if (specialType === 'electric') {
          if (fallDistanceMeters >= 0.25 && Math.abs(normalSpeed) >= 1) {
            const targetNormalSpeed = reboundSpeed(fallDistanceMeters, 4 / 3);
            const outgoingNormalSpeed = ball.vx * nx + ball.vy * ny;
            const boost = Math.max(0, targetNormalSpeed - outgoingNormalSpeed);
            ball.vx += nx * boost;
            ball.vy += ny * boost;
            ball.fallPeakY = ball.y;
          } else {
            const tx = -ny;
            const ty = nx;
            const along = ball.vx * tx + ball.vy * ty;
            const direction = Math.abs(along) > .15 ? Math.sign(along) : 1;
            ball.vx += tx * (direction * 7 - along);
            ball.vy += ty * (direction * 7 - along) + ny * .8;
          }
          spawnContactParticles(ball.x - nx * ball.radius, ball.y - ny * ball.radius, 'electric', Math.abs(normalSpeed) + 2);
        }
      }
    }
    return true;
  }

  function applyRollingResistance(dt) {
    if (!ball) return;
    let rollingType = null;
    let rollingSpeed = 0;
    for (const contact of supportContacts) {
      const tx = -contact.ny;
      const ty = contact.nx;
      const tangentSpeed = ball.vx * tx + ball.vy * ty;
      if (Math.abs(tangentSpeed) > rollingSpeed) {
        rollingSpeed = Math.abs(tangentSpeed);
        rollingType = contact.type;
      }
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
    updateRollingSound(rollingType, rollingSpeed);
  }

  function physicsStep(dt) {
    if (!ball || won || editDrag) return;
    specialContactsThisStep.clear();
    if (ball.vy <= 0) ball.fallPeakY = Math.min(ball.fallPeakY ?? ball.y, ball.y);
    let gravityX = 0;
    let gravityY = EARTH_GRAVITY;
    for (const field of fields) {
      if (!pointInField(ball, field)) continue;
      gravityX = field.direction === 'left' ? -EARTH_GRAVITY : field.direction === 'right' ? EARTH_GRAVITY : 0;
      gravityY = field.direction === 'up' ? -EARTH_GRAVITY : 0;
    }
    ball.vx += gravityX * dt;
    ball.vy += gravityY * dt;
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
        material: MATERIALS[rod.type],
        blockType: rod.type,
        blockId: rod.id
      });
      if (touched) {
        rod.touched = true;
        touchedRodIds.add(rod.id);
      }
    });
    goals.forEach(goal => basketRects(goal).forEach(resolveBallRect));
    applyRollingResistance(dt);
    ball.specialContacts = [...specialContactsThisStep];

    const insideGoal = goals.some(goal => {
      const innerHalf = goal.width / 2 - goal.thickness - ball.radius * 0.45;
      const insideX = Math.abs(ball.x - goal.x) < innerHalf;
      const insideY = ball.y > goal.y - goal.height + ball.radius * 0.25
        && ball.y < goal.y - goal.thickness - ball.radius * 0.1;
      return insideX && insideY;
    });

    const allRodsTouched = rods.length > 0 && rods.every(rod => touchedRodIds.has(rod.id));
    const allSuppliesUsed = stageSupplies.length === 0 || stageSupplies.every(item => item.used);
    const stageGoalReady = appMode !== 'stage' || (allSuppliesUsed && allRodsTouched);
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
    ctx.beginPath();
    ctx.rect(-rod.length / 2, -rod.thickness / 2, rod.length, rod.thickness);
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
    if (rod.type === 'electric') {
      ctx.strokeStyle = '#e9fdff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = -rod.length / 2 + 8; x < rod.length / 2 - 8; x += 18) {
        ctx.moveTo(x, 3);
        ctx.lineTo(x + 5, -4);
        ctx.lineTo(x + 10, 3);
      }
      ctx.stroke();
    }
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

  function drawField(field, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(108,92,231,.18)';
    ctx.strokeStyle = '#6c5ce7';
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 7]);
    ctx.fillRect(field.x - field.width / 2, field.y - field.height / 2, field.width, field.height);
    ctx.strokeRect(field.x - field.width / 2, field.y - field.height / 2, field.width, field.height);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(79,62,190,.7)';
    ctx.font = `800 ${Math.min(34, Math.max(18, field.height / 4))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(field.direction === 'left' ? '←' : field.direction === 'right' ? '→' : '↑', field.x, field.y);
    ctx.restore();
  }

  function drawParticles() {
    const electricParticle = particles.find(particle => particle.type === 'electric');
    if (electricParticle && ball) {
      ctx.save();
      ctx.strokeStyle = `rgba(86,225,255,${clamp(electricParticle.life / electricParticle.maxLife, 0, 1)})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#5ce9ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(electricParticle.x, electricParticle.y);
      const steps = 5;
      for (let index = 1; index < steps; index += 1) {
        const ratio = index / steps;
        ctx.lineTo(electricParticle.x + (ball.x - electricParticle.x) * ratio + (Math.random() - .5) * 12, electricParticle.y + (ball.y - electricParticle.y) * ratio + (Math.random() - .5) * 12);
      }
      ctx.lineTo(ball.x, ball.y);
      ctx.stroke();
      ctx.restore();
    }
    for (const particle of particles) {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.type === 'electric' ? '#55ddff' : '#54c95b';
      ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawSelection() {
    if (!selected) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(38,116,217,.48)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    if (selected.kind === 'rod') {
      const ends = rodEndpoints(selected);
      const fixedInPlayer = appMode === 'stage' && selected.fixed;
      const angleLockedInPlayer = appMode === 'stage' && selected.angleLocked;
      if (!angleLockedInPlayer) {
        ctx.beginPath();
        ctx.moveTo(ends.start.x, ends.start.y);
        ctx.lineTo(ends.end.x, ends.end.y);
        ctx.stroke();
        drawHandle(ends.start.x, ends.start.y, '#ffaf21');
        drawHandle(ends.end.x, ends.end.y, '#ffaf21');
      }
      if (!fixedInPlayer) drawHandle(selected.x, selected.y, '#2674d9');
    } else if (selected.kind === 'goal') {
      ctx.strokeRect(selected.x - selected.width / 2 - 8, selected.y - selected.height - 8, selected.width + 16, selected.height + 16);
      if (appMode !== 'stage') drawHandle(selected.x, selected.y - selected.height / 2, '#2674d9');
    } else {
      ctx.strokeRect(selected.x - selected.width / 2 - 8, selected.y - selected.height / 2 - 8, selected.width + 16, selected.height + 16);
      if (appMode !== 'stage') drawHandle(selected.x, selected.y, '#2674d9');
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
    } else if (placement.tool === 'antigravity') {
      drawField({ x: point.x, y: point.y, width: placement.width, height: placement.height, direction: placement.direction }, .7);
    } else {
      const preview = {
        x: point.x,
        y: point.y,
        length: placement.length || DEFAULT_ROD_LENGTH,
        thickness: placement.thickness || (placement.tool === 'rubber' ? 17 : 14),
        angle: placement.angle || 0,
        type: placement.tool
      };
      drawRod(preview, appMode === 'editor' && !placement.fixed ? .42 : .65);
    }
  }

  function render() {
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.clearRect(0, 0, view.width, view.height);
    drawBackground();
    ctx.save();
    applyWorldTransform();
    drawSpawn();
    fields.forEach(field => drawField(field));
    rods.forEach(rod => drawRod(rod, appMode === 'editor' && !rod.fixed ? 0.42 : 1));
    goals.forEach(goal => drawBasket(goal));
    drawBall();
    drawParticles();
    drawSelection();
    drawPlacementGhost();
    if (sizingMode?.preview) {
      ctx.fillStyle = 'rgba(255,255,255,.58)';
      const topLeft = screenToWorld({ x: 0, y: 0 });
      const bottomRight = screenToWorld({ x: view.width, y: view.height });
      ctx.fillRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
      if (sizingMode.type === 'antigravity') drawField({ ...sizingMode.preview, direction: pendingGravityDirection }, .9);
      else drawRod({ x: sizingMode.preview.x, y: sizingMode.preview.y, length: sizingMode.preview.width, thickness: sizingMode.preview.height, angle: 0, type: sizingMode.type }, .8);
    }
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
    updateParticles(elapsed);
    if (followBall && ball && (appMode === 'free' || appMode === 'stage')) {
      const targetX = ball.x - view.width / (2 * camera.zoom);
      const targetY = ball.y - view.height / (2 * camera.zoom);
      camera.x += (targetX - camera.x) * 0.14;
      camera.y += (targetY - camera.y) * 0.14;
    }
    render();
    requestAnimationFrame(frame);
  }

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
  window.visualViewport?.addEventListener('resize', resize);
  new ResizeObserver(resize).observe(gameShell);
  spawnButton.addEventListener('click', spawnBall);
  deleteButton.addEventListener('click', deleteSelected);
  toggleFixedButton.addEventListener('click', toggleSelectedFixed);
  undoButton.addEventListener('click', undoLastAction);
  redoButton.addEventListener('click', redoLastAction);
  saveMapButton.addEventListener('click', openSaveCreation);
  followButton.addEventListener('click', () => {
    followBall = !followBall;
    followButton.textContent = followBall ? '따라가기 끄기' : '공 따라가기';
    followButton.setAttribute('aria-pressed', String(followBall));
  });
  resetButton.addEventListener('click', resetGame);
  homeButton.addEventListener('click', requestHome);
  document.querySelector('.stage-home-button').addEventListener('click', showHome);
  freeModeButton.addEventListener('click', startFreeMode);
  stageModeButton.addEventListener('click', showStageList);
  saveStageButton.addEventListener('click', saveEditedStage);
  cancelEditorButton.addEventListener('click', showStageList);
  developerButton.addEventListener('click', () => {
    if (developerEnabled) {
      developerEnabled = false;
      localStorage.setItem(DEVELOPER_STORAGE_KEY, 'false');
      showHome();
      return;
    }
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
  saveCreationForm.addEventListener('submit', event => {
    event.preventDefault();
    saveCreation(creationNameInput.value);
    creationNameInput.blur();
    saveCreationDialog.close();
  });
  discardAndHomeButton.addEventListener('click', () => {
    freeModeDirty = false;
    unsavedDialog.close();
    showHome();
  });
  directionButtons.forEach(button => button.addEventListener('click', () => {
    pendingGravityDirection = button.dataset.gravityDirection;
    directionButtons.forEach(item => item.classList.toggle('active', item === button));
  }));
  gravityDirectionForm.addEventListener('submit', event => {
    event.preventDefault();
    gravityDirectionDialog.close();
    beginToolSizing('antigravity');
  });
  cancelSizeButton.addEventListener('click', () => finishToolSizing(false));
  confirmSizeButton.addEventListener('click', () => finishToolSizing(true));
  mapMakerButton.addEventListener('click', () => {
    let nextNumber = 1;
    while (stages.some(stage => Number(stage.number) === nextNumber)) nextNumber += 1;
    document.getElementById('stageNumberInput').value = String(nextNumber);
    stageSetupDialog.showModal();
  });
  stageSetupForm.addEventListener('submit', event => {
    event.preventDefault();
    document.activeElement?.blur?.();
    const number = Math.max(1, Number(document.getElementById('stageNumberInput').value));
    if (stages.some(stage => Number(stage.number) === number)) {
      stageSetupDialog.close();
      showHome();
      setHint('같은 스테이지 번호가 이미 있습니다.', 3200);
      return;
    }
    stageSetupDialog.close();
    startEditor(null, { number });
    requestAnimationFrame(() => requestAnimationFrame(resize));
    setTimeout(resize, 300);
  });
  closeCatalogButton.addEventListener('click', () => blockCatalogDialog.close());
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

  window.addEventListener('pointerdown', ensureAudio, { passive: true, capture: true });
  gameShell.addEventListener('contextmenu', event => event.preventDefault());
  gameShell.addEventListener('dragstart', event => event.preventDefault());

  confirmButton.addEventListener('click', () => {
    successPanel.hidden = true;
    if (appMode !== 'stage' || !currentStage) return;
    const nextStage = [...stages].sort((a, b) => a.number - b.number).find(stage => stage.number > currentStage.number);
    if (nextStage) loadStage(nextStage.id);
    else showStageList();
  });
  window.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) redoLastAction(); else undoLastAction();
      return;
    }
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
      selected: selected ? { kind: selected.kind, x: selected.x, y: selected.y, angle: selected.angle ?? null, fixed: Boolean(selected.fixed) } : null,
      rods: rods.map(rod => ({ id: rod.id, type: rod.type, x: rod.x, y: rod.y, angle: rod.angle, thickness: rod.thickness, fixed: rod.fixed, angleLocked: rod.angleLocked, supplyId: rod.supplyId })),
      goals: goals.map(goal => ({ id: goal.id, x: goal.x, y: goal.y })),
      supplies: clone(stageSupplies),
      recentTools: [...recentTools],
      ball: ball ? { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, omega: ball.omega, fallPeakY: ball.fallPeakY } : null,
      won,
      appMode,
      developerEnabled,

      unlockedStage,
      touchedRodIds: [...touchedRodIds],
      stages: clone(stages),
      creations: clone(creations),
      activeCreationId,
      followBall,
      undoCount: undoStack.length,
      goalHoldTime,
      spawn: { ...spawn },
      camera: { ...camera },
      view: { ...view },
      canvasRect: (() => { const rect = canvas.getBoundingClientRect(); return { width: rect.width, height: rect.height, bottom: rect.bottom }; })()
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
    saveEditedStage,
    normalizeStage,
    renderToolDock,
    resize,
    toggleSelectedFixed,
    undoLastAction,
    loadCreation,
    saveCreation,
    physicsStep,
    reboundSpeed,
    openBlockCatalog,
    rodOverlapsAnyGoal,
    goalOverlapsAnyRod,
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
