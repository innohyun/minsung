(() => {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const gameShell = document.querySelector('.game-shell');
  const spawnButton = document.getElementById('spawnButton');
  const ballTypeButton = document.getElementById('ballTypeButton');

  const deleteButton = document.getElementById('deleteButton');
  const resetButton = document.getElementById('resetButton');
  const toggleFixedButton = document.getElementById('toggleFixedButton');
  const combineElectricButton = document.getElementById('combineElectricButton');
  const detachElectricButton = document.getElementById('detachElectricButton');
  const convertElectricButton = document.getElementById('convertElectricButton');

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
  const swapStagesButton = document.getElementById('swapStagesButton');
  const swapStagesDialog = document.getElementById('swapStagesDialog');
  const swapStagesForm = document.getElementById('swapStagesForm');
  const firstStageNumber = document.getElementById('firstStageNumber');
  const secondStageNumber = document.getElementById('secondStageNumber');
  const swapStagesError = document.getElementById('swapStagesError');
  const homeButton = document.getElementById('homeButton');
  const freeModeButton = document.getElementById('freeModeButton');
  const stageModeButton = document.getElementById('stageModeButton');
  const developerButton = document.getElementById('developerButton');
  const mapMakerButton = document.getElementById('mapMakerButton');
  const physicsLabButton = document.getElementById('physicsLabButton');
  const physicsLabPanel = document.getElementById('physicsLabPanel');
  const gravityRange = document.getElementById('gravityRange');
  const gravityInput = document.getElementById('gravityInput');
  const gravityReadout = document.getElementById('gravityReadout');
  const woodFrictionRange = document.getElementById('woodFrictionRange');
  const woodFrictionInput = document.getElementById('woodFrictionInput');
  const woodFrictionReadout = document.getElementById('woodFrictionReadout');
  const woodBounceRange = document.getElementById('woodBounceRange');
  const woodBounceInput = document.getElementById('woodBounceInput');
  const woodBounceReadout = document.getElementById('woodBounceReadout');
  const physicsLabRespawnButton = document.getElementById('physicsLabRespawnButton');
  const physicsLabResetButton = document.getElementById('physicsLabResetButton');
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
  const sizeEditorHelp = sizeEditorPanel.querySelector('span');
  const cancelSizeButton = document.getElementById('cancelSizeButton');
  const confirmSizeButton = document.getElementById('confirmSizeButton');


  const PIXELS_PER_METER = 100;
  const EARTH_GRAVITY = 19.35;
  const FIXED_STEP = 1 / 120;
  const BALL_RADIUS = 18;
  const BALL_MASS = 0.18;
  const GIANT_BALL_RADIUS = 32;
  const GIANT_BALL_MASS = 1.5;
  const SWING_MOUTH = 64;
  const DEFAULT_SWING_RELEASE_ANGLE = -1.82;
  const SWING_MAGNET_MASS = 0.65;
  const SWING_ROD_MASS = 0.12;
  const BALL_INERTIA = 0.5 * BALL_MASS * Math.pow(BALL_RADIUS / PIXELS_PER_METER, 2);
  function ballInertia() { return ball ? 0.5 * ball.mass * Math.pow(ball.radius / PIXELS_PER_METER, 2) : BALL_INERTIA; }
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 1;
  const DEFAULT_ROD_LENGTH = 180;
  const ELECTRIC_PLATFORM_THICKNESS = 20;
  const BREAKABLE_THICKNESS = 20;
  const BREAKABLE_HP = 100;
  const GOAL_SUCCESS_DELAY = 1;
  const ELECTRIC_ATTACH_ANGLE = Math.PI / 6;
  const ELECTRIC_SPEED_MULTIPLIER = 4 / 3;
  const ELECTRIC_ACCELERATION = 210;
  const ELECTRIC_MAX_SPEED = 18;
  const ELECTRIC_CONNECT_DISTANCE = 34;
  const ELECTRIC_MIN_JOINT_ANGLE = Math.PI * 3 / 4;
  const IMPACT_SOUND_MIN_SPEED = 0.65;
  const WOOD_IMPACT_SOUND_MIN_SPEED = 0.18;
  const IMPACT_SOUND_REARM_STEPS = 12;
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
        { type: 'wood', x: 370, y: 285, length: 180, thickness: ELECTRIC_PLATFORM_THICKNESS, angle: 0.28, fixed: true },
        { type: 'electric', x: 610, y: 420, length: 180, thickness: 20, angle: -0.18, fixed: true }
      ],
      supplyBlocks: [
        { supplyId: 'stage-2-slime', type: 'slime', angle: 0.35, editorX: 250, editorY: 470 },
        { supplyId: 'stage-2-electric', type: 'electric', angle: -0.3, editorX: 480, editorY: 520 }
      ],
      goals: [{ x: 820, y: 555, width: 126, height: 84, thickness: 11 }]
    }
  ];
  const MATERIALS = {
    wood: { label: '나무 길', color: '#a96c36', edge: '#70401f', friction: 0.20, restitution: 0.23, rollingResistance: 0.04 * (0.20 / 0.38) },
    breakable: { label: '깨지는 블록', color: '#bd7840', edge: '#70401f', friction: 0.20, restitution: 0.23, rollingResistance: 0.04 * (0.20 / 0.38) },

    slime: { label: '슬라임 길', color: '#65cf63', edge: '#278f42', friction: 0.62, restitution: 0.1, rollingResistance: 0.095, slime: true },
    electric: { label: '전기 발판', color: '#35bfe8', edge: '#174da0', friction: 0.2, restitution: 0.08, rollingResistance: 0.018, electric: true },
    basket: { friction: 0.48, restitution: 0.14, rollingResistance: 0.055 }
  };
  const PHYSICS_LAB_DEFAULTS = { gravity: EARTH_GRAVITY, woodFriction: MATERIALS.wood.friction, woodBounce: MATERIALS.wood.restitution };
  const physicsLabSettings = { ...PHYSICS_LAB_DEFAULTS };
  const physicsLabWoodMaterial = { ...MATERIALS.wood };
  const BLOCK_CATALOG = [
    { type: 'wood', label: '나무 길', detail: '보통 마찰' },
    { type: 'breakable', label: '깨지는 블록', detail: '충격에 따라 금이 가고 부서짐' },

    { type: 'slime', label: '슬라임 길', detail: '낙하 높이의 2/3 반동' },
    { type: 'electric', label: '전기 발판', detail: '강한 낙하는 4/3 점프' },
    { type: 'swing', label: '스윙', detail: '작대기 길이만 조절' },
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
  const electricLinks = [];
  const specialContactsThisStep = new Set();
  const soundedImpactContacts = new Set();
  const impactContactLastSeenStep = new Map();
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

  let recentTools = ['wood:normal', 'slime:normal', 'electric:normal', 'goal'];
  let stageSupplies = [];
  let creations = [];
  let activeCreationId = null;
  let followBall = false;
  let selectedBallType = 'normal';
  function updateBallTypeButton() {
    ballTypeButton.textContent = selectedBallType === 'giant' ? '공: 거대' : '공: 기본';
    ballTypeButton.setAttribute('aria-pressed', String(selectedBallType === 'giant'));
  }
  let audioContext = null;
  let audioMaster = null;
  let audioCompressor = null;
  let audioLimiter = null;
  let rollingAudio = null;
  let rollingNoiseBuffer = null;
  let recordedRollingAudio = null;
  let recordedRollingSourceStarts = 0;
  let recordedRollingRevolutionsPerSecond = 0;
  let recordedRollingPlaybackRate = 0;
  let rollingReferenceBuffer = null;
  let woodSwishBuffer = null;
  let woodImpactBuffers = [];
  let materialAudioPromise = null;
  let lastImpactSoundAt = 0;
  let impactSoundCount = 0;
  let physicsStepCount = 0;
  const undoStack = [];
  const redoStack = [];
  let freeModeDirty = false;
  let sizingMode = null;
  let pendingGravityDirection = 'up';
  let selectedElectricLinkId = null;
  const toolSettings = {
    wood: { length: 180, thickness: ELECTRIC_PLATFORM_THICKNESS },
    breakable: { length: 180, thickness: BREAKABLE_THICKNESS },

    slime: { length: 180, thickness: ELECTRIC_PLATFORM_THICKNESS },
    electric: { length: 180, thickness: ELECTRIC_PLATFORM_THICKNESS },
    swing: { length: 180 },
    antigravity: { width: 220, height: 160, direction: 'up' }
  };
  const PLATFORM_ASSET_URLS = {
    wood: '/assets/marble-builder/platforms/wood.png?v=2',
    slime: '/assets/marble-builder/platforms/slime.png?v=2',
    electric: '/assets/marble-builder/platforms/electric.png'
  };
  const MATERIAL_AUDIO_URLS = {
    rolling: '/assets/marble-builder/audio/wood-passage-soft.wav?v=1',
    swish: '/assets/marble-builder/audio/wood-passage-swish.wav?v=1',
    woodImpacts: [1, 2, 3].map(index => `/assets/marble-builder/audio/wood-hit-${index}.wav?v=1`)
  };

  const platformImages = Object.fromEntries(Object.entries(PLATFORM_ASSET_URLS).map(([type, url]) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    return [type, image];
  }));
  const breakableImages = Array.from({ length: 6 }, (_, index) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = `/assets/marble-builder/breakable/six/stage-${index}.png?v=1`;
    return image;
  });
  const swingImages = Object.fromEntries(Object.entries({
    magnet: '/assets/marble-builder/swing/swing-magnet.png?v=2',
    weight: '/assets/marble-builder/swing/swing-weight.png?v=2'
  }).map(([part, url]) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
    return [part, image];
  }));

  const touchedRodIds = new Set();

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeRodType(type) {
    return type === 'rubber' || type === 'steel' || type === 'fixed' ? 'wood' : type;
  }

  function normalizedRodThickness(type, thickness) {
    const normalizedType = normalizeRodType(type);
    if (normalizedType === 'electric') return ELECTRIC_PLATFORM_THICKNESS;
    if (normalizedType === 'breakable') return BREAKABLE_THICKNESS;
    const value = Number(thickness);
    // Old default blocks were thinner. Keep deliberately resized blocks unchanged.
    if ((normalizedType === 'wood' && value === 14) || (normalizedType === 'slime' && value === 18)) {
      return ELECTRIC_PLATFORM_THICKNESS;
    }
    return value > 0 ? value : toolSettings[normalizedType]?.thickness || ELECTRIC_PLATFORM_THICKNESS;
  }

  function breakableStage(hp) {
    if (hp >= BREAKABLE_HP) return 0;
    return Math.min(5, 1 + Math.floor((BREAKABLE_HP - Math.max(1, hp)) / 20));
  }

  function normalizeRodRecord(rod) {
    const type = normalizeRodType(rod.type);
    return { ...rod, type, thickness: normalizedRodThickness(type, rod.thickness),
      ...(type === 'breakable' ? { hp: BREAKABLE_HP } : {}),
      ...(type === 'swing' ? { startAngle: Number.isFinite(rod.startAngle) ? rod.startAngle : (rod.angle || 0),
        releaseAngle: Number.isFinite(rod.releaseAngle) ? rod.releaseAngle : DEFAULT_SWING_RELEASE_ANGLE,
        swingStarted: false, swingOmega: 0, releaseRequested: false } : {}) };
  }

  function makeRodUid() {
    return `rod-${Date.now().toString(36)}-${nextId.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
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
      ...normalizeRodRecord(rod),
      uid: rod.uid || makeRodUid(),
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
    }))).map((block, index) => ({
      ...normalizeRodRecord(block),
      uid: block.uid || makeRodUid(),
      supplyId: block.supplyId || `${normalized.id}-supply-${index}`
    }));
    if (normalized.supplyBlocks.length === 0 && normalized.limits) {
      let index = 0;
      ['wood'].forEach(type => {
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
    normalized.electricLinks = Array.isArray(normalized.electricLinks) ? normalized.electricLinks : [];
    normalized.goals = Array.isArray(normalized.goals) ? normalized.goals.slice(0, 1) : [];
    return normalized;
  }

  function loadPersistentState() {
    stages = readStoredJson(STAGES_STORAGE_KEY, null);
    if (!Array.isArray(stages)) stages = clone(DEFAULT_STAGES);
    stages = stages.map(normalizeStage);
    unlockedStage = Number(localStorage.getItem(PROGRESS_STORAGE_KEY)) || 1;
    const removedBuiltInStage1 = stages.some(stage => stage.id === 'stage-1');
    stages = stages.filter(stage => stage.id !== 'stage-1');
    const orderedStages = [...stages].sort((a, b) => a.number - b.number);
    if (removedBuiltInStage1 || orderedStages.some((stage, index) => stage.number !== index + 1)) {
      persistStageOrder(orderedStages);
    }
    const storedRecent = readStoredJson(RECENT_TOOLS_STORAGE_KEY, recentTools);
    if (Array.isArray(storedRecent)) {
      const allowed = new Set(['wood', 'breakable', 'slime', 'electric', 'swing', 'antigravity']);
      recentTools = [...new Set(storedRecent.map(key => {
        if (key === 'goal') return 'goal';
        const type = normalizeRodType(String(key).split(':')[0]);
        return allowed.has(type) ? `${type}:normal` : null;
      }).filter(Boolean))].slice(0, MAX_RECENT_TOOLS);
    }
    unlockedStage = Math.max(1, unlockedStage);
    developerEnabled = localStorage.getItem(DEVELOPER_STORAGE_KEY) === 'true';

    const storedCreations = readStoredJson(CREATIONS_STORAGE_KEY, []);
    creations = Array.isArray(storedCreations) ? storedCreations.map(creation => ({
      ...creation,
      rods: Array.isArray(creation.rods) ? creation.rods.map(normalizeRodRecord) : []
    })) : [];

  }

  function persistStages() {
    localStorage.setItem(STAGES_STORAGE_KEY, JSON.stringify(stages));
  }

  function persistStageOrder(ordered) {
    const unlockedIds = new Set(stages.filter(stage => Number(stage.number) <= unlockedStage).map(stage => stage.id));
    stages = ordered.map((stage, index) => ({
      ...stage,
      number: index + 1,
      name: !stage.name || stage.name === `${stage.number}스테이지` ? `${index + 1}스테이지` : stage.name
    }));
    unlockedStage = Math.max(1, ...stages.filter(stage => unlockedIds.has(stage.id)).map(stage => stage.number));
    localStorage.setItem(PROGRESS_STORAGE_KEY, String(unlockedStage));
    persistStages();
  }

  function swapStageNumbers(firstNumber, secondNumber) {
    if (!developerEnabled || firstNumber === secondNumber) return false;
    const ordered = [...stages].sort((a, b) => a.number - b.number);
    const first = ordered.findIndex(stage => stage.number === firstNumber);
    const second = ordered.findIndex(stage => stage.number === secondNumber);
    if (first < 0 || second < 0) return false;
    [ordered[first], ordered[second]] = [ordered[second], ordered[first]];
    persistStageOrder(ordered);
    renderStageList();
    return true;
  }

  function persistCreations() {
    localStorage.setItem(CREATIONS_STORAGE_KEY, JSON.stringify(creations));
  }

  function captureWorld() {
    return {
      rods: clone(rods),
      ballType: selectedBallType,
      goals: clone(goals),
      fields: clone(fields),
      electricLinks: clone(electricLinks),
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
    rods.splice(0, rods.length, ...clone(snapshot.rods).map(normalizeRodRecord));
    selectedBallType = snapshot.ballType === 'giant' ? 'giant' : 'normal';
    updateBallTypeButton();
    goals.splice(0, goals.length, ...clone(snapshot.goals));
    fields.splice(0, fields.length, ...clone(snapshot.fields || []));
    electricLinks.splice(0, electricLinks.length, ...clone(snapshot.electricLinks || []));
    stageSupplies = clone(snapshot.stageSupplies);
    Object.assign(spawn, snapshot.spawn);
    if (snapshot.toolSettings) {
      Object.entries(snapshot.toolSettings).forEach(([type, settings]) => {
        toolSettings[type] = clone(settings);
      });
      for (const type of ['wood', 'breakable', 'slime', 'electric']) {
        toolSettings[type].thickness = normalizedRodThickness(type, toolSettings[type].thickness);
      }
    }
    selected = null;
    selectedElectricLinkId = null;
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
    selectedBallType = creation.ballType === 'giant' ? 'giant' : 'normal';
    activeCreationId = id;
    rods.push(...clone(creation.rods).map(rod => ({
      ...normalizeRodRecord(rod),
      uid: rod.uid || makeRodUid(),
      id: nextId++,
      kind: 'rod',
      fixed: false,
      touched: false
    })));
    goals.push(...clone(creation.goals).map(goal => ({ ...goal, id: nextId++, kind: 'goal' })));
    fields.push(...clone(creation.fields || []).map(field => ({ ...field, id: nextId++, kind: 'field' })));
    const validUids = new Set(rods.map(rod => rod.uid));
    electricLinks.push(...clone(creation.electricLinks || []).filter(link => validUids.has(link?.a?.rodUid) && validUids.has(link?.b?.rodUid)));
    Object.assign(spawn, creation.spawn || { x: 220, y: 150 });
    Object.assign(camera, creation.camera || { x: 0, y: 0, zoom: MAX_ZOOM });
    setAppMode('free');
    freeModeDirty = false;
    setHint(swingConflictsInWorld() ? '이전 저장 맵의 블록이 스윙 점선 범위와 겹쳐요. 옮긴 뒤 저장해 주세요.'
      : `“${creation.name}” 작품을 불러왔습니다.`);
  }

  function openSaveCreation() {
    const current = creations.find(item => item.id === activeCreationId);
    creationNameInput.value = current?.name || `내 작품 ${creations.length + 1}`;
    saveCreationDialog.showModal();
    creationNameInput.focus();
    creationNameInput.select();
  }

  function saveCreation(name) {
    if (swingConflictsInWorld()) {
      setHint('스윙 점선 범위와 겹친 블록을 옮긴 후 저장해 주세요.', 4200);
      return false;
    }
    const now = Date.now();
    const saved = {
      id: activeCreationId || `creation-${now}`,
      name: name.trim() || `내 작품 ${creations.length + 1}`,
      rods: rods.map(({ id, kind, touched, fixed, supplyId, angleLocked, swingOmega, swingStarted, releaseRequested, ...rod }) => ({
        ...rod, angle: rod.type === 'swing' ? (rod.startAngle ?? rod.angle) : rod.angle
      })),
      goals: goals.map(({ id, kind, ...goal }) => ({ ...goal })),
      fields: fields.map(({ id, kind, ...field }) => ({ ...field })),
      electricLinks: clone(electricLinks),
      ballType: selectedBallType,
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
    return true;
  }

  function ensureAudio() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioCompressor = audioContext.createDynamicsCompressor();
      audioCompressor.threshold.value = -12;
      audioCompressor.knee.value = 12;
      audioCompressor.ratio.value = 4;
      audioCompressor.attack.value = .004;
      audioCompressor.release.value = .18;
      audioLimiter = audioContext.createDynamicsCompressor();
      audioLimiter.threshold.value = -3;
      audioLimiter.knee.value = 0;
      audioLimiter.ratio.value = 20;
      audioLimiter.attack.value = .001;
      audioLimiter.release.value = .08;
      audioMaster = audioContext.createGain();
      audioMaster.gain.value = 1.6;
      audioMaster.connect(audioCompressor).connect(audioLimiter).connect(audioContext.destination);
      loadMaterialAudio(audioContext);
    }
    if (audioContext.state === 'suspended' || audioContext.state === 'interrupted') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  function makeSoftNoiseBuffer(audio, duration, smoothing = 0.88) {
    const frameCount = Math.ceil(audio.sampleRate * duration);
    const buffer = audio.createBuffer(1, frameCount, audio.sampleRate);
    const channel = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < frameCount; index += 1) {
      const raw = Math.random() * 2 - 1;
      previous = previous * smoothing + raw * (1 - smoothing);
      channel[index] = previous;
    }
    return buffer;
  }

  function loadMaterialAudio(audio) {
    if (materialAudioPromise) return materialAudioPromise;
    const decode = async url => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Audio load failed: ${response.status}`);
      return audio.decodeAudioData(await response.arrayBuffer());
    };
    materialAudioPromise = Promise.all([
      decode(MATERIAL_AUDIO_URLS.rolling),
      decode(MATERIAL_AUDIO_URLS.swish),
      ...MATERIAL_AUDIO_URLS.woodImpacts.map(decode)
    ]).then(([rolling, swish, ...impacts]) => {
      rollingReferenceBuffer = rolling;
      woodSwishBuffer = swish;
      woodImpactBuffers = impacts;
      return true;
    }).catch(() => false);
    return materialAudioPromise;
  }

  function playRecordedWoodImpact(audio, start, speed, volume) {
    if (!woodImpactBuffers.length) return false;
    const source = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    source.buffer = woodImpactBuffers[Math.floor(Math.random() * woodImpactBuffers.length)];
    source.playbackRate.value = clamp(.94 + Math.random() * .1 + Math.min(.06, speed * .006), .92, 1.1);
    filter.type = 'lowpass';
    filter.frequency.value = 4200;
    filter.Q.value = .35;
    gain.gain.setValueAtTime(Math.min(.52, volume * 1.08), start);
    gain.gain.exponentialRampToValueAtTime(.0001, start + .24);
    source.connect(filter).connect(gain).connect(audioMaster);
    source.start(start);
    source.stop(start + .26);
    return true;
  }

  function resetImpactSoundContacts() {
    soundedImpactContacts.clear();
    impactContactLastSeenStep.clear();
  }

  function playImpactSoundForContact(contactKey, type, speed) {
    impactContactLastSeenStep.set(contactKey, physicsStepCount);
    if (speed < (type === 'wood' || type === 'breakable' ? WOOD_IMPACT_SOUND_MIN_SPEED : IMPACT_SOUND_MIN_SPEED)
      || soundedImpactContacts.has(contactKey)) return;
    soundedImpactContacts.add(contactKey);
    playImpactSound(type, speed);
  }

  function finishImpactSoundContacts() {
    for (const [contactKey, lastSeen] of impactContactLastSeenStep) {
      if (physicsStepCount - lastSeen > IMPACT_SOUND_REARM_STEPS) {
        soundedImpactContacts.delete(contactKey);
        impactContactLastSeenStep.delete(contactKey);
      }
    }
  }

  function playImpactSound(type, speed) {
    const audio = ensureAudio();
    const now = performance.now();
    if (!audio || now - lastImpactSoundAt < 40 || speed < 0.12) return;
    lastImpactSoundAt = now;
    impactSoundCount += 1;
    const slime = type === 'slime';
    const start = audio.currentTime;
    // Small impacts fade toward silence without raising the existing peak volume.
    const volume = Math.min(.44, .085 + speed * .035) * clamp((speed - .1) / 1.4, .05, 1);

    if ((type === 'wood' || type === 'breakable') && playRecordedWoodImpact(audio, start, speed, volume)) return;

    if (slime) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(115, start);
      osc.frequency.exponentialRampToValueAtTime(72, start + .16);
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(.0001, start + .18);
      osc.connect(gain).connect(audioMaster);
      osc.start(start);
      osc.stop(start + .19);
      return;
    }

    const master = audio.createGain();
    master.gain.setValueAtTime(.0001, start);
    master.gain.linearRampToValueAtTime(volume, start + .008);
    master.gain.exponentialRampToValueAtTime(.0001, start + .2);
    master.connect(audioMaster);

    const body = audio.createOscillator();
    const bodyGain = audio.createGain();
    body.type = 'sine';
    body.frequency.setValueAtTime(type === 'wood' ? 210 : 138, start);
    body.frequency.exponentialRampToValueAtTime(type === 'wood' ? 112 : 76, start + .18);
    bodyGain.gain.setValueAtTime(.82, start);
    bodyGain.gain.exponentialRampToValueAtTime(.0001, start + .2);
    body.connect(bodyGain).connect(master);
    body.start(start);
    body.stop(start + .21);

    const hollow = audio.createOscillator();
    const hollowGain = audio.createGain();
    hollow.type = 'sine';
    hollow.frequency.setValueAtTime(type === 'wood' ? 126 : 82, start);
    hollow.frequency.exponentialRampToValueAtTime(type === 'wood' ? 84 : 58, start + .16);
    hollowGain.gain.setValueAtTime(.42, start);
    hollowGain.gain.exponentialRampToValueAtTime(.0001, start + .18);
    hollow.connect(hollowGain).connect(master);
    hollow.start(start);
    hollow.stop(start + .19);

    const knock = audio.createBufferSource();
    const knockFilter = audio.createBiquadFilter();
    const knockGain = audio.createGain();
    knock.buffer = makeSoftNoiseBuffer(audio, .11, .9);
    knockFilter.type = 'lowpass';
    knockFilter.frequency.value = type === 'wood' ? 720 : 420;
    knockFilter.Q.value = .55;
    knockGain.gain.setValueAtTime(type === 'wood' ? .42 : .7, start);
    knockGain.gain.exponentialRampToValueAtTime(.0001, start + .095);
    knock.connect(knockFilter).connect(knockGain).connect(master);
    knock.start(start);
    knock.stop(start + .11);
  }

  function rollingPlaybackRateForOmega(omega, bufferDuration) {
    const revolutionsPerSecond = Math.abs(Number(omega) || 0) / (Math.PI * 2);
    return revolutionsPerSecond * Math.max(0, Number(bufferDuration) || 0);
  }

  function rollingGainForRevolutions(revolutionsPerSecond, travelSpeed, materialVolume = 1) {
    // Travel speed changes the quiet loop's gain, never its playback rate or repetition.
    // Smoothstep stays nearly silent at a crawl and levels off before it gets loud.
    const fraction = clamp(Math.max(0, travelSpeed) / 3.2, 0, 1);
    const ramp = fraction * fraction * (3 - 2 * fraction);
    return (.0015 + .06 * ramp) * materialVolume;
  }

  function updateRollingSound(type, speed, angularSpeed = ball?.omega || 0) {
    const audio = audioContext;
    const revolutionsPerSecond = Math.abs(Number(angularSpeed) || 0) / (Math.PI * 2);
    recordedRollingRevolutionsPerSecond = revolutionsPerSecond;
    if (!audio || (type !== 'wood' && type !== 'breakable') || speed < .08 || revolutionsPerSecond < .025) {
      recordedRollingPlaybackRate = 0;
      if (rollingAudio && audio) {
        rollingAudio.gain.gain.setTargetAtTime(.0001, audio.currentTime, .12);
      }
      if (recordedRollingAudio && audio) {
        recordedRollingAudio.gain.gain.setTargetAtTime(.0001, audio.currentTime, .12);
      }
      return;
    }
    const useRecordedRolling = Boolean(rollingReferenceBuffer && woodSwishBuffer);
    if (useRecordedRolling) {
      if (rollingAudio) rollingAudio.gain.gain.setTargetAtTime(.0001, audio.currentTime, .06);
      if (!recordedRollingAudio) {
        const source = audio.createBufferSource();
        const filter = audio.createBiquadFilter();
        const gain = audio.createGain();
        const softGain = audio.createGain();
        const swishSource = audio.createBufferSource();
        const swishFilter = audio.createBiquadFilter();
        const swishGain = audio.createGain();
        source.buffer = rollingReferenceBuffer;
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = rollingReferenceBuffer.duration;
        swishSource.buffer = woodSwishBuffer;
        swishSource.loop = true;
        swishSource.loopStart = 0;
        swishSource.loopEnd = woodSwishBuffer.duration;
        filter.type = 'lowpass';
        filter.frequency.value = 3600;
        filter.Q.value = .4;
        swishFilter.type = 'lowpass';
        swishFilter.frequency.value = 4200;
        softGain.gain.value = 1;
        swishGain.gain.value = 0;
        gain.gain.value = .0001;
        source.connect(filter).connect(softGain).connect(gain).connect(audioMaster);
        swishSource.connect(swishFilter).connect(swishGain).connect(gain);
        source.start();
        swishSource.start();
        recordedRollingSourceStarts += 2;
        recordedRollingAudio = { source, filter, softGain, swishSource, swishGain, gain, lastContactAt: audio.currentTime };
      }
      recordedRollingAudio.lastContactAt = audio.currentTime;
      recordedRollingPlaybackRate = 1;
      recordedRollingAudio.filter.frequency.setTargetAtTime(1800, audio.currentTime, .08);
      // Crossfade texture as the ball moves: faint grain -> smooth passing "swoosh".
      // Neither loop is restarted, accelerated or modulated by wheel rotation.
      const passage = clamp(Math.max(0, speed) / 3.2, 0, 1);
      const swishMix = passage * passage * (3 - 2 * passage);
      recordedRollingAudio.softGain.gain.setTargetAtTime(1 - swishMix, audio.currentTime, .16);
      recordedRollingAudio.swishGain.gain.setTargetAtTime(swishMix, audio.currentTime, .16);
      recordedRollingAudio.gain.gain.setTargetAtTime(rollingGainForRevolutions(revolutionsPerSecond, speed), audio.currentTime, .18);
      return;
    }
    if (recordedRollingAudio) recordedRollingAudio.gain.gain.setTargetAtTime(.0001, audio.currentTime, .06);
    if (!rollingAudio) {
      rollingNoiseBuffer ||= makeSoftNoiseBuffer(audio, 1.8, .94);
      const noise = audio.createBufferSource();
      const filter = audio.createBiquadFilter();
      const gain = audio.createGain();
      noise.buffer = rollingNoiseBuffer;
      noise.loop = true;
      filter.type = 'lowpass';
      filter.frequency.value = 360;
      filter.Q.value = .5;
      gain.gain.value = .0001;
      noise.connect(filter).connect(gain);
      gain.connect(audioMaster);
      noise.start();
      rollingAudio = { noise, filter, gain, lastContactAt: audio.currentTime };
    }
    rollingAudio.lastContactAt = audio.currentTime;
    const slime = type === 'slime';
    const electric = type === 'electric';
    const filterPitch = (slime ? 220 : electric ? 640 : 320) + Math.min(720, speed * (electric ? 42 : 30));
    rollingAudio.filter.frequency.setTargetAtTime(filterPitch, audio.currentTime, .065);
    rollingAudio.gain.gain.setTargetAtTime(Math.min(.022, rollingGainForRevolutions(revolutionsPerSecond, speed)), audio.currentTime, .045);
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
    rods.forEach(rod => {
      rod.electricPulse = Math.max(0, (rod.electricPulse || 0) - dt);
    });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function activeGravity() {
    return appMode === 'physics-lab' ? physicsLabSettings.gravity : EARTH_GRAVITY;
  }

  function materialForType(type) {
    if (appMode === 'physics-lab' && type === 'wood') {
      physicsLabWoodMaterial.friction = physicsLabSettings.woodFriction;
      physicsLabWoodMaterial.restitution = physicsLabSettings.woodBounce;
      const frictionRatio = physicsLabSettings.woodFriction / PHYSICS_LAB_DEFAULTS.woodFriction;
      physicsLabWoodMaterial.rollingResistance = MATERIALS.wood.rollingResistance * frictionRatio;
      return physicsLabWoodMaterial;
    }
    return MATERIALS[type];
  }

  function syncPhysicsLabControls() {
    const gravityValue = physicsLabSettings.gravity.toFixed(2);
    const frictionValue = physicsLabSettings.woodFriction.toFixed(2);
    gravityRange.value = String(physicsLabSettings.gravity);
    gravityInput.value = gravityValue;
    gravityReadout.value = `${gravityValue}m/s²`;
    woodFrictionRange.value = String(physicsLabSettings.woodFriction);
    woodFrictionInput.value = frictionValue;
    woodFrictionReadout.value = frictionValue;
    const bounceValue = physicsLabSettings.woodBounce.toFixed(2);
    woodBounceRange.value = String(physicsLabSettings.woodBounce);
    woodBounceInput.value = bounceValue;
    woodBounceReadout.value = bounceValue;
    physicsLabWoodMaterial.friction = physicsLabSettings.woodFriction;
    physicsLabWoodMaterial.restitution = physicsLabSettings.woodBounce;
    if (appMode === 'physics-lab') {
      gameSubtitle.textContent = `중력 ${gravityValue}m/s² · 나무 마찰 ${frictionValue} · 나무 튕김 ${bounceValue}`;
    }
  }

  function updatePhysicsLabSetting(key, rawValue) {
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric)) return;
    if (key === 'gravity') physicsLabSettings.gravity = clamp(numeric, 5, 30);
    if (key === 'woodFriction') physicsLabSettings.woodFriction = clamp(numeric, 0, 1);
    if (key === 'woodBounce') physicsLabSettings.woodBounce = clamp(numeric, 0, .9);
    syncPhysicsLabControls();
  }

  function resetPhysicsLabSettings() {
    Object.assign(physicsLabSettings, PHYSICS_LAB_DEFAULTS);
    syncPhysicsLabControls();
    setHint('물리 계산값을 현재 게임 기본값으로 되돌렸습니다.');
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
    if (Number.isFinite(descriptor.releaseAngle)) card.dataset.releaseAngle = String(descriptor.releaseAngle);
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
      if (stageSupplies.every(item => item.used)) {
        const empty = document.createElement('span');
        empty.className = 'tool-card';
        empty.textContent = stageSupplies.length ? '모든 블록 사용 완료' : '고정 블록으로 출발하세요';
        toolList.append(empty);
      }
      return;
    }
    // Keep the new swing discoverable even for players with older saved recent-tool lists.
    toolList.append(createToolCard({ type: 'swing', fixed: false }));
    recentTools
      .map(toolDescriptor)
      .filter(item => (appMode === 'editor' || !item.fixed) && item.type !== 'swing')
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
    placement = null;
    editDrag = null;
    cameraDrag = null;
    pinchGesture = null;
    activePointers.clear();
    const settings = toolSettings[type];
    const width = type === 'antigravity' ? settings.width : settings.length;
    const height = type === 'antigravity' ? settings.height : settings.thickness;
    const center = screenToWorld({ x: view.width / 2, y: (view.playTop + view.dockTop) / 2 });
    sizingMode = { type, pointerId: null, start: null, preview: { x: center.x, y: center.y, width, height } };
    sizeEditorTitle.textContent = type === 'swing' ? '스윙 작대기 길이 설정' : `${BLOCK_CATALOG.find(item => item.type === type)?.label || type} 크기 설정`;
    sizeEditorHelp.textContent = type === 'swing'
      ? '가로로 드래그해 작대기 길이만 정하세요. 자석과 무게추 크기는 그대로입니다.'
      : type === 'breakable'
      ? '가로로 드래그해 길이만 정하세요. 깨지는 블록의 두께는 고정됩니다.'
      : type === 'electric'
      ? '가로로 드래그해 길이를 정하세요. 전기 장판 두께는 고정됩니다.'
      : '화면에서 대각선으로 드래그해 직사각형을 만드세요.';
    sizeEditorPanel.hidden = false;
    topPanel.hidden = true;
    toolDock.hidden = true;
    hint.hidden = true;
    confirmSizeButton.disabled = false;
  }

  function finishToolSizing(apply) {
    let appliedLabel = null;
    if (apply && sizingMode?.preview) {
      pushUndo();
      const preview = sizingMode.preview;
      if (sizingMode.type === 'antigravity') {
        toolSettings.antigravity = { width: preview.width, height: preview.height, direction: pendingGravityDirection };
      } else if (sizingMode.type === 'swing') {
        toolSettings.swing = { length: preview.width };
      } else if (sizingMode.type === 'electric') {
        toolSettings.electric = { length: preview.width, thickness: ELECTRIC_PLATFORM_THICKNESS };
      } else if (sizingMode.type === 'breakable') {
        toolSettings.breakable = { length: preview.width, thickness: BREAKABLE_THICKNESS };
      } else {
        toolSettings[sizingMode.type] = { length: preview.width, thickness: preview.height };
      }
      rememberTool(sizingMode.type, false);
      appliedLabel = BLOCK_CATALOG.find(item => item.type === sizingMode.type)?.label || sizingMode.type;
    }
    sizingMode = null;
    placement = null;
    activePointers.clear();
    sizeEditorPanel.hidden = true;
    topPanel.hidden = false;
    toolDock.hidden = false;
    hint.hidden = false;
    renderToolDock();
    resize();
    requestAnimationFrame(resize);
    if (appliedLabel) setHint(`${appliedLabel} 크기를 저장했습니다. 이제 블록 창에서 끌어 설치하세요.`);
  }

  function setAppMode(mode) {
    appMode = mode;
    document.body.className = `is-${mode}`;
    homeScreen.hidden = mode !== 'home';
    stageScreen.hidden = mode !== 'stage-list';
    swapStagesButton.hidden = mode !== 'stage-list' || !developerEnabled;
    physicsLabPanel.hidden = mode !== 'physics-lab';
    saveStageButton.hidden = mode !== 'editor';
    cancelEditorButton.hidden = mode !== 'editor';
    toggleFixedButton.hidden = mode !== 'editor';
    undoButton.hidden = !['free', 'stage', 'editor', 'physics-lab'].includes(mode);
    redoButton.hidden = !['free', 'stage', 'editor', 'physics-lab'].includes(mode);
    saveMapButton.hidden = mode !== 'free';
    followButton.hidden = !['free', 'stage', 'editor', 'physics-lab'].includes(mode);
    ballTypeButton.hidden = mode === 'stage';
    updateBallTypeButton();
    followButton.textContent = followBall ? '따라가기 끄기' : '공 따라가기';
    followButton.setAttribute('aria-pressed', String(followBall));
    gameTitle.textContent = mode === 'editor' ? '스테이지 만들기' : mode === 'stage' ? `${currentStage?.number || ''}스테이지` : mode === 'physics-lab' ? '물리 계산' : '공 굴리기 연구소';
    gameSubtitle.textContent = mode === 'stage' ? '주어진 블록을 모두 쓰고 모든 블록을 통과하세요.' : mode === 'editor' ? '블록을 선택해 고정하거나 플레이어 지급 블록으로 만드세요. 공 생성으로 시험할 수 있어요.' : mode === 'physics-lab' ? '' : '중력 19.35m/s² · 나무 마찰 0.20 · 회전 관성';
    if (mode === 'physics-lab') syncPhysicsLabControls();
    renderToolDock();
    updateDeleteButton();
    requestAnimationFrame(resize);
  }

  function clearWorldState() {
    rods.length = 0;
    goals.length = 0;
    fields.length = 0;
    electricLinks.length = 0;
    particles.length = 0;
    ball = null;
    selected = null;
    selectedElectricLinkId = null;
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
    physicsLabButton.hidden = !developerEnabled;
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
    swapStagesButton.hidden = !developerEnabled;
    const ordered = [...stages].sort((a, b) => a.number - b.number);
    ordered.forEach(stage => {
      const locked = !developerEnabled && stage.number > unlockedStage;
      const item = document.createElement('article');
      item.className = `stage-item${locked ? ' locked' : ''}`;
      item.dataset.stageId = stage.id;
      const title = document.createElement('h3');
      title.textContent = `${stage.number}스테이지`;
      const detail = document.createElement('p');
      detail.textContent = `시작 시 고정 ${stage.fixedBlocks?.length || 0}개 · 배치할 블록 ${stage.supplyBlocks?.length || 0}개`;
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
    selectedBallType = stage.ballType === 'giant' ? 'giant' : 'normal';
    (stage.fixedBlocks || []).forEach(source => rods.push({
      ...normalizeRodRecord(clone(source)),
      uid: source.uid || makeRodUid(),
      fixed: true,
      id: nextId++,
      kind: 'rod',
      touched: false
    }));
    if (mode === 'editor') {
      (stage.supplyBlocks || []).forEach((source, index) => rods.push({
        type: normalizeRodType(source.type),
        uid: source.uid || makeRodUid(),
        x: source.editorX ?? 220 + index * 45,
        y: source.editorY ?? 430 + (index % 2) * 70,
        length: source.length || DEFAULT_ROD_LENGTH,
        thickness: normalizedRodThickness(source.type, source.thickness),
        angle: source.angle || 0,
        ...(source.type === 'swing' ? { startAngle: Number.isFinite(source.startAngle) ? source.startAngle : (source.angle || 0),
          releaseAngle: Number.isFinite(source.releaseAngle) ? source.releaseAngle : DEFAULT_SWING_RELEASE_ANGLE,
          swingOmega: 0, swingStarted: false, releaseRequested: false } : {}),
        fixed: false,
        supplyId: source.supplyId,
        id: nextId++,
        kind: 'rod',
        touched: false
      }));
    } else {
      stageSupplies = (stage.supplyBlocks || []).map(source => ({ ...normalizeRodRecord(clone(source)), used: false }));
    }
    (stage.goals || []).forEach(source => goals.push({ ...clone(source), id: nextId++, kind: 'goal' }));
    (stage.fields || []).forEach(source => fields.push({ ...clone(source), id: nextId++, kind: 'field' }));
    const validUids = new Set(rods.map(rod => rod.uid));
    electricLinks.push(...clone(stage.electricLinks || []).filter(link => validUids.has(link?.a?.rodUid) && validUids.has(link?.b?.rodUid)));
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
    setHint(swingConflictsInWorld() ? '이전 스테이지 맵의 블록이 스윙 점선 범위와 겹칩니다. 맵 만들기에서 위치를 수정해 주세요.'
      : '주어진 블록을 모두 사용하고, 모든 블록에 공을 닿게 하세요.', 3600);
  }

  function startFreeMode() {
    currentStage = null;
    editorStageId = null;
    activeCreationId = null;
    clearWorldState();
    selectedBallType = 'normal';
    successTitle.textContent = '골인!';
    successMessage.textContent = '공이 바구니에 도착했어요.';
    setAppMode('free');
    freeModeDirty = false;
    setHint('자유 모드: 개수 제한 없이 길을 만들 수 있어요.', 3200);
  }

  function startPhysicsLab() {
    if (!developerEnabled) return;
    currentStage = null;
    editorStageId = null;
    activeCreationId = null;
    clearWorldState();
    successTitle.textContent = '골인!';
    successMessage.textContent = '공이 바구니에 도착했어요.';
    setAppMode('physics-lab');
    freeModeDirty = false;
    setHint('중력·나무 마찰·나무 튕김을 바꾸고 공 다시 놓기로 비교하세요.', 3800);
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
    setHint(swingConflictsInWorld() ? '저장된 맵이 스윙 점선 범위와 겹칩니다. 겹친 블록을 옮겨 주세요.'
      : '고정 블록은 불투명, 플레이어 지급 블록은 반투명으로 표시됩니다.', 3400);
  }

  function saveEditedStage() {
    if (swingConflictsInWorld()) {
      setHint('스윙 점선 범위와 겹친 블록을 옮긴 후 저장해 주세요.', 4200);
      return;
    }
    if (goals.length === 0) {
      setHint('골인 바구니를 한 개 이상 배치해 주세요.', 3200);
      return;
    }
    if (rods.length === 0) {
      setHint('블록을 한 개 이상 배치해 주세요.', 3200);
      return;
    }
    const fixedBlocks = rods.filter(rod => rod.fixed).map(({ id, kind, touched, supplyId, swingOmega, swingStarted, releaseRequested, ...rod }) => ({
      ...rod, angle: rod.type === 'swing' ? (rod.startAngle ?? rod.angle) : rod.angle, fixed: true
    }));
    const supplyBlocks = rods.filter(rod => !rod.fixed).map((rod, index) => ({
      supplyId: rod.supplyId || `${currentStage.id}-supply-${Date.now()}-${index}`,
      type: rod.type,
      angle: rod.type === 'swing' ? (rod.startAngle ?? rod.angle) : rod.angle,
      editorX: rod.x,
      editorY: rod.y,
      length: rod.length,
      thickness: rod.thickness,
      releaseAngle: rod.releaseAngle,
      uid: rod.uid
    }));
    const saved = normalizeStage({
      ...currentStage,
      number: Number(currentStage.number),
      ballType: selectedBallType,
      spawn: { x: spawn.x, y: spawn.y },
      fixedBlocks,
      supplyBlocks,
      goals: goals.map(({ id, kind, ...goal }) => ({ ...goal })),
      fields: fields.map(({ id, kind, ...field }) => ({ ...field })),
      electricLinks: clone(electricLinks)
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
    const canEditElectric = appMode !== 'stage' && selected?.kind === 'rod' && selected.type === 'electric';
    combineElectricButton.hidden = !canEditElectric || !findElectricConnectionCandidate(selected);
    detachElectricButton.hidden = !selectedElectricLinkId;
    convertElectricButton.hidden = !selectedElectricLinkId;

  }

  function toggleSelectedFixed() {
    if (appMode !== 'editor' || selected?.kind !== 'rod') return;
    pushUndo();
    selected.fixed = !selected.fixed;
    if (selected.type === 'swing') {
      selected.startAngle = selected.angle;
      selected.swingOmega = 0;
      selected.swingStarted = false;
      selected.swingBlocked = false;
    }
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
    const controlsBottom = appMode === 'physics-lab' ? physicsLabPanel.getBoundingClientRect().bottom : topPanel.getBoundingClientRect().bottom;
    view.playTop = controlsBottom - rect.top;

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
    const invalid = electricLinks.find(link => !validElectricJoint(link));
    if (invalid) {
      const a = rodByUid(invalid.a.rodUid); const b = rodByUid(invalid.b.rodUid);
      const sides = a && b && electricJointSides(a, invalid.a.end, b, invalid.b.end);
      setHint(invalid.a.side !== invalid.b.side
        ? '결합 꼭짓점의 위·아래 설정이 달라 공을 투하할 수 없어요. 변환으로 맞춰 주세요.'
        : !sides ? '전기 발판 결합 각도는 안쪽 135~180°여야 공을 투하할 수 있어요.'
          : '전기 발판 꼭짓점이 바깥쪽이거나 떨어져 있어요. 결합을 고쳐 주세요.', 4700);
      return false;
    }
    resetSwingState();
    ball = {
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      angle: 0,
      omega: 0,
      fallPeakY: spawn.y,
      specialContacts: [],
      radius: selectedBallType === 'giant' ? GIANT_BALL_RADIUS : BALL_RADIUS,
      mass: selectedBallType === 'giant' ? GIANT_BALL_MASS : BALL_MASS,
      type: selectedBallType
    };
    won = false;
    goalHoldTime = 0;
    goalEnteredAt = null;
    touchedRodIds.clear();
    resetImpactSoundContacts();
    rods.forEach(rod => { rod.touched = false; });
    successPanel.hidden = true;
    setHint('공이 떨어집니다. 충돌 속도에 따라 실제처럼 살짝 튕겨요.');
    return true;
  }

  function rodBounds(rod) {
    const cos = Math.abs(Math.cos(rod.angle || 0));
    const sin = Math.abs(Math.sin(rod.angle || 0));
    const halfWidth = cos * rod.length / 2 + sin * rod.thickness / 2;
    const halfHeight = sin * rod.length / 2 + cos * rod.thickness / 2;
    return { left: rod.x - halfWidth, right: rod.x + halfWidth, top: rod.y - halfHeight, bottom: rod.y + halfHeight };
  }

  // Only the magnet's orbit is drawn; other objects are allowed inside it.
  function swingRadius(rod) { return rod.length + SWING_MOUTH; }

  function circleTouchesRect(circle, radius, rect) {
    const dx = circle.x - rect.x; const dy = circle.y - rect.y;
    const cos = Math.cos(rect.angle || 0); const sin = Math.sin(rect.angle || 0);
    const localX = cos * dx + sin * dy; const localY = -sin * dx + cos * dy;
    const outsideX = Math.max(0, Math.abs(localX) - rect.width / 2);
    const outsideY = Math.max(0, Math.abs(localY) - rect.height / 2);
    return outsideX * outsideX + outsideY * outsideY < radius * radius;
  }

  function swingPlacementConflict() { return false; }
  function swingConflictsInWorld() { return false; }

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
    if (rod.type === 'swing') return false;
    const rodPolygon = orientedRectCorners({ x: rod.x, y: rod.y, width: rod.length, height: rod.thickness, angle: rod.angle });
    return basketSegments(goal).some(wall => polygonsOverlap(rodPolygon, orientedRectCorners(basketSegmentBounds(wall))));
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
      uid: options.uid || makeRodUid(),
      kind: 'rod',
      type,
      x,
      y,
      length: options.length || DEFAULT_ROD_LENGTH,
      thickness: normalizedRodThickness(type, options.thickness),
      ...(type === 'breakable' ? { hp: BREAKABLE_HP } : {}),
      angle: Number.isFinite(options.angle) ? options.angle : 0,
      ...(type === 'swing' ? { startAngle: Number.isFinite(options.angle) ? options.angle : 0,
        releaseAngle: Number.isFinite(options.releaseAngle) ? options.releaseAngle : DEFAULT_SWING_RELEASE_ANGLE,
        swingOmega: 0, swingStarted: false, releaseRequested: false } : {}),
      fixed: Boolean(options.fixed),
      supplyId: options.supplyId || null,
      angleLocked: appMode === 'stage' && !options.fixed,
      touched: false
    };
    if (rodOverlapsAnyGoal(rod)) {
      setHint('골인 바구니와 블록은 겹칠 수 없습니다.');
      return null;
    }
    if (swingPlacementConflict(rod)) {
      setHint('점선으로 표시된 스윙 회전 범위에는 다른 블록을 놓을 수 없어요.', 3500);
      return null;
    }
    pushUndo();
    rods.push(rod);
    if (appMode === 'stage' && rod.supplyId) {
      const supply = stageSupplies.find(item => item.supplyId === rod.supplyId);
      if (supply) supply.used = true;
    } else if (appMode === 'free' || appMode === 'editor' || appMode === 'physics-lab') {
      rememberTool(type, rod.fixed);
    }
    selectEntity(rod);
    updateToolAvailability();
    setHint(type === 'swing' ? '점선은 자석 궤도입니다. 빨간 곡선을 끌어 정확한 방출 위치를 정하세요.'
      : appMode === 'stage' ? '저장된 각도로 배치했습니다. 위치만 바꿀 수 있어요.' : '주황색 끝점은 각도, 파란색 가운데 점은 위치를 바꿉니다.');
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
    if (goalOverlapsAnyRod(goal) || swingPlacementConflict(goal)) {
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
    if (swingPlacementConflict(field)) {
      setHint('스윙 점선 범위에는 반중력 블록을 놓을 수 없어요.');
      return null;
    }
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
    const previous = electricLinks.find(link => link.id === selectedElectricLinkId);
    const connected = entity?.kind === 'rod'
      ? electricLinks.filter(link => link.a.rodUid === entity.uid || link.b.rodUid === entity.uid) : [];
    selectedElectricLinkId = entity?.kind === 'rod' && previous
      && (previous.a.rodUid === entity.uid || previous.b.rodUid === entity.uid)
      ? previous.id : connected.length === 1 ? connected[0].id : null;
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
    if (selected.kind === 'rod') {
      if (selected.type === 'swing') releaseSwingBall(selected);
      electricLinks.splice(0, electricLinks.length, ...electricLinks.filter(link => link.a.rodUid !== selected.uid && link.b.rodUid !== selected.uid));
    }
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
    electricLinks.length = 0;
    ball = null;
    selected = null;
    selectedElectricLinkId = null;
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
    resetSwingState();
    rods.forEach(rod => { if (rod.type === 'breakable') { rod.hp = BREAKABLE_HP; rod.lastDamageSeenStep = -100; } });
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
    if (rod.type === 'swing') return { start: { x: rod.x, y: rod.y }, end: swingPoint(rod, -rod.length) };
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

  function rodByUid(uid) {
    return rods.find(rod => rod.uid === uid) || null;
  }

  function rodCorner(rod, end, side = 'top') {
    const localX = end === 'start' ? -rod.length / 2 : rod.length / 2;
    const localY = side === 'top' ? -rod.thickness / 2 : rod.thickness / 2;
    const cos = Math.cos(rod.angle || 0);
    const sin = Math.sin(rod.angle || 0);
    return { x: rod.x + localX * cos - localY * sin, y: rod.y + localX * sin + localY * cos };
  }

  function endpointLink(rodUid, end, ignoredLinkId = null) {
    return electricLinks.find(link => link.id !== ignoredLinkId && ((link.a.rodUid === rodUid && link.a.end === end) || (link.b.rodUid === rodUid && link.b.end === end))) || null;
  }

  function connectedRodUids(startUid, ignoredLinkId = null) {
    const found = new Set([startUid]);
    const queue = [startUid];
    while (queue.length) {
      const uid = queue.shift();
      for (const link of electricLinks) {
        if (link.id === ignoredLinkId) continue;
        const other = link.a.rodUid === uid ? link.b.rodUid : link.b.rodUid === uid ? link.a.rodUid : null;
        if (other && !found.has(other)) { found.add(other); queue.push(other); }
      }
    }
    return found;
  }

  function translateElectricComponent(startUid, dx, dy, ignoredLinkId = null) {
    const uids = connectedRodUids(startUid, ignoredLinkId);
    rods.forEach(rod => {
      if (uids.has(rod.uid)) { rod.x += dx; rod.y += dy; }
    });
  }

  function electricJointPoint(link) {
    const aRod = rodByUid(link.a.rodUid);
    const bRod = rodByUid(link.b.rodUid);
    if (!aRod || !bRod) return null;
    const a = rodCorner(aRod, link.a.end, link.a.side);
    const b = rodCorner(bRod, link.b.end, link.b.side);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function electricJointAngle(link) {
    const joint = electricJointPoint(link);
    const aRod = rodByUid(link.a.rodUid);
    const bRod = rodByUid(link.b.rodUid);
    if (!joint || !aRod || !bRod) return 0;
    const ax = aRod.x - joint.x; const ay = aRod.y - joint.y;
    const bx = bRod.x - joint.x; const by = bRod.y - joint.y;
    const denominator = Math.hypot(ax, ay) * Math.hypot(bx, by) || 1;
    return Math.acos(clamp((ax * bx + ay * by) / denominator, -1, 1));
  }

  // Signed travel turn keeps the 135–180° inside angle on the actual concave side.
  // An unsigned acos alone accepts a flipped (>180°) outside corner.
  function electricJointSides(aRod, aEnd, bRod, bEnd) {
    const aForward = aEnd === 'end' ? 1 : -1;
    const bForward = bEnd === 'start' ? 1 : -1;
    const ax = Math.cos(aRod.angle) * aForward;
    const ay = Math.sin(aRod.angle) * aForward;
    const bx = Math.cos(bRod.angle) * bForward;
    const by = Math.sin(bRod.angle) * bForward;
    const turn = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
    if (Math.abs(turn) > Math.PI - ELECTRIC_MIN_JOINT_ANGLE + .0001) return null;
    const innerSide = (forward, clockwise) => (forward > 0) === clockwise ? 'bottom' : 'top';
    if (Math.abs(turn) < .0001) return { turn, pairs: [
      { a: 'top', b: aForward === bForward ? 'top' : 'bottom' },
      { a: 'bottom', b: aForward === bForward ? 'bottom' : 'top' }
    ] };
    return { turn, pairs: [{ a: innerSide(aForward, turn > 0), b: innerSide(bForward, turn > 0) }] };
  }

  function validElectricJoint(link) {
    const a = rodByUid(link.a.rodUid); const b = rodByUid(link.b.rodUid);
    const sides = a && b && electricJointSides(a, link.a.end, b, link.b.end);
    return Boolean(sides?.pairs.some(pair => pair.a === link.a.side && pair.b === link.b.side)
      && distanceSquared(rodCorner(a, link.a.end, link.a.side), rodCorner(b, link.b.end, link.b.side)) < 9);
  }

  function validAdjacentElectricJoints(...uids) {
    return electricLinks.every(link => !uids.includes(link.a.rodUid) && !uids.includes(link.b.rodUid)
      || validElectricJoint(link));
  }


  function findElectricConnectionCandidate(rod = selected) {
    if (!rod || rod.type !== 'electric' || appMode === 'stage') return null;
    const maximum = ELECTRIC_CONNECT_DISTANCE / camera.zoom;
    let best = null;
    for (const end of ['start', 'end']) {
      if (endpointLink(rod.uid, end)) continue;
      for (const other of rods) {
        if (other === rod || other.type !== 'electric') continue;
        if (connectedRodUids(rod.uid).has(other.uid)) continue;
        for (const otherEnd of ['start', 'end']) {
          if (endpointLink(other.uid, otherEnd)) continue;
          const sides = electricJointSides(rod, end, other, otherEnd);
          if (!sides) continue;
          for (const pair of sides.pairs) {
            const point = rodCorner(rod, end, pair.a);
            const target = rodCorner(other, otherEnd, pair.b);
            const distance = Math.hypot(point.x - target.x, point.y - target.y);
            if (distance > maximum || (best && distance >= best.distance)) continue;
            best = { rod, end, side: pair.a, other, otherEnd, otherSide: pair.b, point, target, distance };
          }
        }
      }
    }
    return best;
  }

  function combineSelectedElectric() {
    const candidate = findElectricConnectionCandidate(selected);
    if (!candidate) return;
    pushUndo();
    translateElectricComponent(candidate.rod.uid, candidate.target.x - candidate.point.x, candidate.target.y - candidate.point.y);
    const link = {
      id: `electric-link-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      a: { rodUid: candidate.rod.uid, end: candidate.end, side: candidate.side },
      b: { rodUid: candidate.other.uid, end: candidate.otherEnd, side: candidate.otherSide }
    };
    electricLinks.push(link);
    selectedElectricLinkId = link.id;
    updateDeleteButton();
    setHint('노란 꼭짓점으로 전기 발판을 결합했습니다.');
  }

  function detachSelectedElectricLink() {
    const index = electricLinks.findIndex(link => link.id === selectedElectricLinkId);
    if (index < 0) return;
    pushUndo();
    electricLinks.splice(index, 1);
    selectedElectricLinkId = null;
    updateDeleteButton();
    setHint('전기 발판 결합을 해제했습니다.');
  }

  function convertSelectedElectricCorner() {
    if (appMode === 'stage') return;
    const link = electricLinks.find(item => item.id === selectedElectricLinkId);
    const endpoint = link && endpointForRod(link, selected?.uid);
    if (!endpoint) return;
    pushUndo();
    endpoint.side = endpoint.side === 'top' ? 'bottom' : 'top';
    const a = rodByUid(link.a.rodUid); const b = rodByUid(link.b.rodUid);
    const sides = electricJointSides(a, link.a.end, b, link.b.end);
    if (sides?.pairs.some(pair => pair.a === link.a.side && pair.b === link.b.side)) {
      const first = rodCorner(a, link.a.end, link.a.side);
      const second = rodCorner(b, link.b.end, link.b.side);
      translateElectricComponent(b.uid, first.x - second.x, first.y - second.y, link.id);
    }
    if (ball) ball = null;
    setHint(validElectricJoint(link) ? '선택한 블록의 결합 꼭짓점을 전환했습니다.'
      : '꼭짓점의 위·아래 또는 안쪽 각도가 맞지 않습니다. 맞춘 뒤 공을 투하하세요.', 4200);
    updateDeleteButton();
  }

  function findElectricLinkAt(point, radius) {
    return electricLinks.find(link => {
      const joint = electricJointPoint(link);
      return joint && distanceSquared(point, joint) <= radius * radius;
    }) || null;
  }

  function endpointForRod(link, rodUid) {
    return link.a.rodUid === rodUid ? link.a : link.b.rodUid === rodUid ? link.b : null;
  }

  function oppositeCornerAnchor(rod, movingEndpoint, movingSide, ignoredLinkId) {
    const end = movingEndpoint === 'start' ? 'end' : 'start';
    const otherLink = endpointLink(rod.uid, end, ignoredLinkId);
    const endpoint = otherLink ? endpointForRod(otherLink, rod.uid) : null;
    const side = endpoint?.side || movingSide;
    return { end, side, point: otherLink ? electricJointPoint(otherLink) : rodCorner(rod, end, side) };
  }

  function cornerLocal(rod, end, side) {
    return { x: end === 'start' ? -rod.length / 2 : rod.length / 2, y: side === 'top' ? -rod.thickness / 2 : rod.thickness / 2 };
  }

  function cornerPairRadius(rod, firstEnd, firstSide, secondEnd, secondSide) {
    const first = cornerLocal(rod, firstEnd, firstSide);
    const second = cornerLocal(rod, secondEnd, secondSide);
    return Math.hypot(first.x - second.x, first.y - second.y);
  }

  function circleJointCandidates(a, radiusA, b, radiusB) {
    const dx = b.x - a.x; const dy = b.y - a.y;
    const distance = Math.hypot(dx, dy);
    if (distance < .001 || distance > radiusA + radiusB || distance < Math.abs(radiusA - radiusB)) return [];
    const along = (radiusA * radiusA - radiusB * radiusB + distance * distance) / (2 * distance);
    const height = Math.sqrt(Math.max(0, radiusA * radiusA - along * along));
    const center = { x: a.x + dx * along / distance, y: a.y + dy * along / distance };
    const offset = { x: -dy * height / distance, y: dx * height / distance };
    return [{ x: center.x + offset.x, y: center.y + offset.y }, { x: center.x - offset.x, y: center.y - offset.y }];
  }

  function placeRodByCorners(rod, fixedEnd, fixedSide, fixedPoint, movingEnd, movingSide, movingPoint) {
    const fixedLocal = cornerLocal(rod, fixedEnd, fixedSide);
    const movingLocal = cornerLocal(rod, movingEnd, movingSide);
    const localAngle = Math.atan2(movingLocal.y - fixedLocal.y, movingLocal.x - fixedLocal.x);
    rod.angle = Math.atan2(movingPoint.y - fixedPoint.y, movingPoint.x - fixedPoint.x) - localAngle;
    const cos = Math.cos(rod.angle); const sin = Math.sin(rod.angle);
    rod.x = movingPoint.x - movingLocal.x * cos + movingLocal.y * sin;
    rod.y = movingPoint.y - movingLocal.x * sin - movingLocal.y * cos;
  }

  function moveElectricJoint(link, requestedPoint) {
    const aRod = rodByUid(link.a.rodUid);
    const bRod = rodByUid(link.b.rodUid);
    const current = electricJointPoint(link);
    if (!aRod || !bRod || !current) return;
    const aAnchor = oppositeCornerAnchor(aRod, link.a.end, link.a.side, link.id);
    const bAnchor = oppositeCornerAnchor(bRod, link.b.end, link.b.side, link.id);
    const radiusA = cornerPairRadius(aRod, aAnchor.end, aAnchor.side, link.a.end, link.a.side);
    const radiusB = cornerPairRadius(bRod, bAnchor.end, bAnchor.side, link.b.end, link.b.side);
    const candidates = circleJointCandidates(aAnchor.point, radiusA, bAnchor.point, radiusB);
    if (!candidates.length) {
      translateElectricComponent(aRod.uid, requestedPoint.x - current.x, requestedPoint.y - current.y);
      return;
    }
    const target = candidates.sort((first, second) => distanceSquared(first, requestedPoint) - distanceSquared(second, requestedPoint))[0];
    const previous = [{ rod: aRod, x: aRod.x, y: aRod.y, angle: aRod.angle }, { rod: bRod, x: bRod.x, y: bRod.y, angle: bRod.angle }];
    placeRodByCorners(aRod, aAnchor.end, aAnchor.side, aAnchor.point, link.a.end, link.a.side, target);
    placeRodByCorners(bRod, bAnchor.end, bAnchor.side, bAnchor.point, link.b.end, link.b.side, target);
    if (!validAdjacentElectricJoints(aRod.uid, bRod.uid)) {
      previous.forEach(item => Object.assign(item.rod, { x: item.x, y: item.y, angle: item.angle }));
    }
  }

  function rotateElectricOuterEnd(rod, movingEnd, point, linkedEnd, linkedEndpoint, link) {
    const fixedPoint = electricJointPoint(link);
    if (!fixedPoint) return;
    const movingSide = linkedEndpoint.side;
    const radius = cornerPairRadius(rod, linkedEnd, linkedEndpoint.side, movingEnd, movingSide);
    const dx = point.x - fixedPoint.x; const dy = point.y - fixedPoint.y;
    const distance = Math.hypot(dx, dy) || 1;
    const target = { x: fixedPoint.x + dx / distance * radius, y: fixedPoint.y + dy / distance * radius };
    const previous = { x: rod.x, y: rod.y, angle: rod.angle };
    placeRodByCorners(rod, linkedEnd, linkedEndpoint.side, fixedPoint, movingEnd, movingSide, target);
    if (!validAdjacentElectricJoints(rod.uid)) Object.assign(rod, previous);
  }

  function pointInRod(point, rod, padding = 11 / camera.zoom) {
    if (rod.type === 'swing') {
      const dx = point.x - rod.x; const dy = point.y - rod.y;
      const localX = Math.cos(rod.angle) * dx + Math.sin(rod.angle) * dy;
      const localY = -Math.sin(rod.angle) * dx + Math.cos(rod.angle) * dy;
      return localY >= -rod.length - SWING_MOUTH - padding && localY <= 16 + padding
        && Math.abs(localX) <= (localY < -rod.length ? 40 : 14) + padding;
    }
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
      if (rods[i].type === 'breakable' && rods[i].hp <= 0) continue;
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
    const drag = {
      pointerId,
      mode,
      entity,
      beforeSnapshot: captureWorld(),
      original: { x: entity.x, y: entity.y, angle: entity.angle || 0 },
      ...extra
    };
    if (mode === 'move' && entity.kind === 'rod' && entity.type === 'electric') {
      const connected = connectedRodUids(entity.uid);
      if (connected.size > 1) {
        drag.groupOriginal = rods.filter(rod => connected.has(rod.uid)).map(rod => ({ rod, x: rod.x, y: rod.y }));
      }
    }
    return drag;
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

    const releaseMarker = appMode !== 'stage' && rods.find(rod => rod.type === 'swing'
      && onSwingReleaseArc(rod, point, handleRadius));
    if (releaseMarker) {
      selectEntity(releaseMarker);
      editDrag = makeEditDrag(event.pointerId, 'swingRelease', releaseMarker);
      event.preventDefault();
      return;
    }
    const attachedPivot = ball?.attachedSwingUid && rods.find(rod => rod.uid === ball.attachedSwingUid
      && distanceSquared(point, rod) <= handleRadius * handleRadius);
    if (attachedPivot) {
      attachedPivot.releaseRequested = true;
      setHint('빨간 곡선에 자석이 도착하면 공을 놓습니다. 장애물에 막히면 붙어 있어요.', 3200);
      event.preventDefault();
      return;
    }

    if (appMode !== 'stage') {
      const joint = findElectricLinkAt(point, handleRadius);
      if (joint) {
        selected = rodByUid(joint.a.rodUid);
        selectedElectricLinkId = joint.id;
        editDrag = makeEditDrag(event.pointerId, 'joint', selected, { linkId: joint.id });
        updateDeleteButton();
        event.preventDefault();
        return;
      }
    }

    if (selected?.kind === 'rod') {
      const ends = rodEndpoints(selected);
      if (selected.type === 'swing') {
        if (appMode !== 'stage' && distanceSquared(point, ends.end) <= handleRadius * handleRadius) {
          editDrag = makeEditDrag(event.pointerId, 'swingLength', selected);
        } else if (appMode !== 'stage' && distanceSquared(point, swingPoint(selected, -(selected.length + 38))) <= (handleRadius + 20) ** 2) {
          editDrag = makeEditDrag(event.pointerId, 'swingAngle', selected);
        } else if (appMode !== 'stage' && distanceSquared(point, ends.start) <= handleRadius * handleRadius) {
          editDrag = makeEditDrag(event.pointerId, 'move', selected, { offsetX: point.x - selected.x, offsetY: point.y - selected.y });
        }
        if (editDrag) { event.preventDefault(); return; }
      } else {
      const fixedInPlayer = appMode === 'stage' && selected.fixed;
      const rotatesAroundCenter = fixedInPlayer || (appMode === 'editor' && selected.fixed);
      const angleLockedInPlayer = appMode === 'stage' && selected.angleLocked;
      const startLink = selected.type === 'electric' ? endpointLink(selected.uid, 'start') : null;
      const endLink = selected.type === 'electric' ? endpointLink(selected.uid, 'end') : null;
      if (distanceSquared(point, ends.start) <= handleRadius * handleRadius) {
        editDrag = startLink ? null : endLink
          ? makeEditDrag(event.pointerId, 'electricOuter', selected, { movingEnd: 'start', linkedEnd: 'end', linkId: endLink.id })
          : rotatesAroundCenter
            ? makeEditDrag(event.pointerId, 'rotateFixed', selected)
            : angleLockedInPlayer ? null : makeEditDrag(event.pointerId, 'start', selected, { fixed: ends.end });
      } else if (distanceSquared(point, ends.end) <= handleRadius * handleRadius) {
        editDrag = endLink ? null : startLink
          ? makeEditDrag(event.pointerId, 'electricOuter', selected, { movingEnd: 'end', linkedEnd: 'start', linkId: startLink.id })
          : rotatesAroundCenter
            ? makeEditDrag(event.pointerId, 'rotateFixed', selected)
            : angleLockedInPlayer ? null : makeEditDrag(event.pointerId, 'end', selected, { fixed: ends.start });
      } else if (!fixedInPlayer && distanceSquared(point, selected) <= handleRadius * handleRadius) {
        editDrag = makeEditDrag(event.pointerId, 'move', selected, { offsetX: point.x - selected.x, offsetY: point.y - selected.y });
      }
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
      const width = clamp(Math.abs(point.x - sizingMode.start.x), sizingMode.type === 'swing' ? 65 : 40, sizingMode.type === 'swing' ? 480 : 600);
      const height = sizingMode.type === 'electric' || sizingMode.type === 'breakable'
        ? (sizingMode.type === 'breakable' ? BREAKABLE_THICKNESS : ELECTRIC_PLATFORM_THICKNESS)
        : clamp(Math.abs(point.y - sizingMode.start.y), 12, 420);
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
      if (editDrag.mode === 'joint') {
        const link = electricLinks.find(item => item.id === editDrag.linkId);
        if (link) moveElectricJoint(link, point);
      } else if (editDrag.mode === 'electricOuter') {
        const link = electricLinks.find(item => item.id === editDrag.linkId);
        const linkedEndpoint = link && endpointForRod(link, entity.uid);
        if (link && linkedEndpoint) rotateElectricOuterEnd(entity, editDrag.movingEnd, point, editDrag.linkedEnd, linkedEndpoint, link);
      } else if (editDrag.mode === 'move' || editDrag.mode === 'moveGoal' || editDrag.mode === 'moveField') {
        const nextX = point.x - editDrag.offsetX;
        const nextY = point.y - editDrag.offsetY;
        if (editDrag.groupOriginal) {
          const dx = nextX - editDrag.original.x;
          const dy = nextY - editDrag.original.y;
          editDrag.groupOriginal.forEach(item => { item.rod.x = item.x + dx; item.rod.y = item.y + dy; });
        } else {
          entity.x = nextX;
          entity.y = nextY;
        }
      } else if (editDrag.mode === 'swingLength') {
        entity.length = clamp((point.x - entity.x) * Math.sin(entity.angle)
          - (point.y - entity.y) * Math.cos(entity.angle), 65, 480);
      } else if (editDrag.mode === 'swingRelease') {
        entity.releaseAngle = Math.atan2(point.x - entity.x, entity.y - point.y);
      } else if (editDrag.mode === 'swingAngle') {
        entity.angle = Math.atan2(point.x - entity.x, entity.y - point.y);
        entity.startAngle = entity.angle;
        entity.swingOmega = 0;
        entity.swingStarted = false;
        entity.swingBlocked = false;
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
      const blockedGoal = editDrag.entity.kind === 'field' || editDrag.entity.type === 'swing' ? false : editDrag.entity.kind === 'goal'
        ? goalOverlapsAnyRod(editDrag.entity)
        : editDrag.groupOriginal || editDrag.mode === 'joint'
          ? rods.some(rod => rodOverlapsAnyGoal(rod))
          : rodOverlapsAnyGoal(editDrag.entity);
      const blocked = blockedGoal || swingConflictsInWorld();
      if (blocked) {
        restoreWorld(editDrag.beforeSnapshot);
        setHint(blockedGoal ? '골인 바구니와 블록은 겹칠 수 없습니다.' : '스윙 점선 회전 범위에는 다른 블록을 놓을 수 없어요.', 3400);
      } else {
        const changed = JSON.stringify(captureWorld()) !== JSON.stringify(editDrag.beforeSnapshot);
        if (changed) pushUndo(editDrag.beforeSnapshot);
      }
      editDrag = null;
      updateDeleteButton();
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
      releaseAngle: card.dataset.releaseAngle === undefined ? undefined : Number(card.dataset.releaseAngle),
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
    try { card.setPointerCapture?.(event.pointerId); } catch { /* cancelled or synthetic pointer */ }
    event.preventDefault();
    if (placement.dragging) setHint('게임 화면의 원하는 위치에서 손을 놓아 배치하세요.', 0);
  }

  function updatePlacement(event) {
    if (!placement || placement.pointerId !== event.pointerId) return;
    const dx = event.clientX - placement.startX;
    const dy = event.clientY - placement.startY;
    if (placement.mode === 'pending' && Math.hypot(dx, dy) >= 10) {
      const clearlyDraggingUp = dy < -8;
      const clearlyScrolling = Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.35;
      if (!clearlyDraggingUp && !clearlyScrolling) return;
      placement.mode = clearlyDraggingUp ? 'drag' : 'scroll';
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
        releaseAngle: current.releaseAngle,
        length: current.length,
        thickness: current.thickness
      });
    } else {
      setHint('블록은 하단 창보다 위쪽의 게임 화면에 놓아 주세요.');
    }
    event.preventDefault();
  }

  function basketSegments(goal) {
    const thickness = goal.thickness + 4;
    const radius = thickness / 2;
    const left = goal.x - goal.width / 2;
    const right = goal.x + goal.width / 2;
    const top = goal.y - goal.height;
    const bottom = goal.y;
    return [
      { x1: left + radius, y1: top + radius, x2: left + radius, y2: bottom - radius, thickness, material: MATERIALS.basket, goalId: goal.id, name: 'left' },
      { x1: right - radius, y1: top + radius, x2: right - radius, y2: bottom - radius, thickness, material: MATERIALS.basket, goalId: goal.id, name: 'right' },
      { x1: left + radius, y1: bottom - radius, x2: right - radius, y2: bottom - radius, thickness, material: MATERIALS.basket, goalId: goal.id, name: 'bottom' }
    ];
  }

  function basketSegmentBounds(segment) {
    return {
      x: (segment.x1 + segment.x2) / 2,
      y: (segment.y1 + segment.y2) / 2,
      width: Math.abs(segment.x2 - segment.x1) + segment.thickness,
      height: Math.abs(segment.y2 - segment.y1) + segment.thickness,
      angle: 0
    };
  }

  function pointInsideBasket(goal, point) {
    const thickness = goal.thickness + 4;
    const left = goal.x - goal.width / 2 + thickness;
    const right = goal.x + goal.width / 2 - thickness;
    const top = goal.y - goal.height;
    const bottom = goal.y - thickness;
    return point.x > left && point.x < right && point.y > top && point.y < bottom;
  }

  function getImpactRestitution(material, normalSpeed) {
    const impactSpeed = Math.abs(normalSpeed);
    if (impactSpeed < 0.3) return 0;
    const speedFactor = clamp((impactSpeed - 0.3) / 2.7, 0, 1);
    return material.restitution * (0.4 + speedFactor * 0.6);
  }

  function reboundSpeed(fallDistanceMeters, reboundRatio) {
    return Math.sqrt(2 * activeGravity() * Math.max(0, fallDistanceMeters) * reboundRatio);
  }

  function placeBallOnElectricRide(ride) {
    const rod = rodByUid(ride.rodUid);
    if (!rod || !ball) return false;
    const localX = clamp(ride.distance, 0, rod.length) - rod.length / 2;
    const localY = -(rod.thickness / 2 + ball.radius + .25);
    const cos = Math.cos(rod.angle); const sin = Math.sin(rod.angle);
    ball.x = rod.x + localX * cos - localY * sin;
    ball.y = rod.y + localX * sin + localY * cos;
    ball.vx = cos * ride.direction * ride.speed;
    ball.vy = sin * ride.direction * ride.speed;
    ball.omega = ride.direction * ride.speed * PIXELS_PER_METER / Math.max(1, ball.radius);
    rod.touched = true;
    touchedRodIds.add(rod.id);
    rod.electricPulse = Math.max(rod.electricPulse || 0, .12);
    return true;
  }

  function adjacentElectricExit(rod, end, side) {
    // A visually flush, unlinked pair should not act as a reflecting wall.
    // This is a ride-only handoff; it never creates or saves an editor link.
    if (side !== 'top') return null;
    const point = rodCorner(rod, end, side);
    const matches = [];
    for (const other of rods) {
      if (other.uid === rod.uid || other.type !== 'electric') continue;
      for (const otherEnd of ['start', 'end']) {
        if (endpointLink(other.uid, otherEnd)) continue;
        const target = rodCorner(other, otherEnd, 'top');
        if (distanceSquared(point, target) > 8 * 8) continue;
        const towardRod = { x: rod.x - point.x, y: rod.y - point.y };
        const towardOther = { x: other.x - target.x, y: other.y - target.y };
        const dot = towardRod.x * towardOther.x + towardRod.y * towardOther.y;
        const length = Math.hypot(towardRod.x, towardRod.y) * Math.hypot(towardOther.x, towardOther.y);
        if (dot > -length * Math.SQRT1_2) continue; // inside angle must be 135°..180°
        matches.push({ rodUid: other.uid, end: otherEnd, side: 'top' });
      }
    }
    // Do not invent a branch when several platforms meet at one corner.
    return matches.length === 1 ? matches[0] : null;
  }

  function updateElectricRide(dt) {
    const ride = ball?.electricRide;
    if (!ride) return false;
    // Brief visible roll at the entry, then a strong boost on the same block.
    ride.speed = Math.min(ELECTRIC_MAX_SPEED, ride.speed + ((ride.boostTravel || 0) < 24 ? 10 : ELECTRIC_ACCELERATION) * dt);
    let travel = ride.speed * PIXELS_PER_METER * dt;
    ride.boostTravel = (ride.boostTravel || 0) + travel;
    let guard = 0;
    while (travel > 0 && guard++ < 12) {
      const rod = rodByUid(ride.rodUid);
      if (!rod) { ball.electricRide = null; return false; }
      const rodLength = rod.length;
      const available = ride.direction > 0 ? rodLength - ride.distance : ride.distance;
      if (travel <= available) {
        ride.distance += ride.direction * travel;
        placeBallOnElectricRide(ride);
        ball.angle += ball.omega * dt;
        updateRollingSound('electric', ride.speed, ball.omega);
        return true;
      }
      ride.distance = ride.direction > 0 ? rodLength : 0;
      placeBallOnElectricRide(ride);
      travel -= Math.max(0, available);
      const end = ride.direction > 0 ? 'end' : 'start';
      const link = endpointLink(rod.uid, end);
      const nextEndpoint = link
        ? link.a.rodUid === rod.uid ? link.b : link.a
        : adjacentElectricExit(rod, end, ride.side);
      if (!nextEndpoint) {
        ball.vx = Math.cos(rod.angle) * ride.direction * ride.speed;
        ball.vy = Math.sin(rod.angle) * ride.direction * ride.speed;
        ball.electricRide = null;
        // Do not collide again in this same step at the track tip: it can reverse the launch.
        return true;
      }
      const nextRod = rodByUid(nextEndpoint.rodUid);
      if (!nextRod) { ball.electricRide = null; return true; }
      ride.rodUid = nextRod.uid;
      ride.side = 'top';
      ride.direction = nextEndpoint.end === 'start' ? 1 : -1;
      ride.distance = nextEndpoint.end === 'start' ? 0 : nextRod.length;
    }
    if (placeBallOnElectricRide(ride)) {
      ball.angle += ball.omega * dt;
      updateRollingSound('electric', ride.speed, ball.omega);
      return true;
    }
    ball.electricRide = null;
    return true;
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
    const specialType = rect.material.slime ? 'slime' : rect.material.electric ? 'electric' : null;
    const specialSurface = specialType === 'slime' || (specialType === 'electric' && nyLocal < -0.25);
    const contactKey = specialSurface ? `${specialType}:${rect.blockId}` : null;
    const isFreshContact = Boolean(contactKey && !ball.specialContacts.includes(contactKey));
    if (contactKey) specialContactsThisStep.add(contactKey);

    const normalSpeed = contactVx * nx + contactVy * ny;
    if (rect.blockType === 'breakable' && rect.source && appMode !== 'editor') {
      const rod = rect.source;
      const separated = physicsStepCount - (rod.lastDamageSeenStep ?? -100) > 8;
      rod.lastDamageSeenStep = physicsStepCount;
      if (separated && normalSpeed < -0.35 && rod.hp > 0) {
        const massFactor = Math.pow(ball.mass / BALL_MASS, .75);
        const damage = Math.max(1, Math.round(12 * Math.pow(-normalSpeed - .35, 2) * massFactor));
        const previousStage = breakableStage(rod.hp);
        rod.hp = Math.max(0, rod.hp - damage);
        if (breakableStage(rod.hp) !== previousStage || rod.hp === 0) {
          spawnContactParticles(ball.x - nx * ball.radius, ball.y - ny * ball.radius, 'breakable', rod.hp === 0 ? 9 : 2);
        }
        if (rod.hp === 0) {
          rod.touched = true;
          touchedRodIds.add(rod.id);
          if (selected === rod) selectEntity(null);
          return false;
        }
      }
    }
    const incomingVx = ball.vx;
    const incomingVy = ball.vy;
    const impactContactKey = `rod:${rect.blockId ?? rect.source?.uid ?? `${rect.x}:${rect.y}`}`;
    playImpactSoundForContact(impactContactKey, rect.blockType || 'wood', Math.max(0, -normalSpeed));
    if (normalSpeed < 0) {
      const inverseMass = 1 / ball.mass;
      const inverseInertia = 1 / ballInertia();
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
      let tangentImpulse = -tangentSpeed / (inverseMass + crossT * crossT * inverseInertia);
      const maxFriction = rect.material.friction * normalImpulse;
      tangentImpulse = clamp(tangentImpulse, -maxFriction, maxFriction);
      const tangentIx = tx * tangentImpulse;
      const tangentIy = ty * tangentImpulse;
      ball.vx += tangentIx * inverseMass;
      ball.vy += tangentIy * inverseMass;
      ball.omega += (rx * tangentIy - ry * tangentIx) * inverseInertia;
    }

    if (contactKey && isFreshContact) {
      const fallDistanceMeters = Math.max(0, (ball.y - (ball.fallPeakY ?? ball.y)) / PIXELS_PER_METER);
      if (specialType === 'slime' && normalSpeed < 0) {
        const incomingNormalSpeed = Math.max(0, -(incomingVx * nx + incomingVy * ny));
        const fallHeightRebound = ny < -0.5 && incomingVy > 0
          ? reboundSpeed(fallDistanceMeters, 2 / 3)
          : 0;
        const targetNormalSpeed = Math.max(
          fallHeightRebound,
          incomingNormalSpeed * Math.sqrt(2 / 3)
        );
        const outgoingNormalSpeed = ball.vx * nx + ball.vy * ny;
        const boost = Math.max(0, targetNormalSpeed - outgoingNormalSpeed);
        ball.vx += nx * boost;
        ball.vy += ny * boost;
        ball.fallPeakY = ball.y;
        spawnContactParticles(ball.x - nx * ball.radius, ball.y - ny * ball.radius, 'slime', Math.abs(normalSpeed));
      } else if (specialType === 'electric' && normalSpeed < 0) {
        const incomingSpeed = Math.hypot(incomingVx, incomingVy);
        const angleFromSurface = Math.asin(clamp(Math.max(0, -(incomingVx * nx + incomingVy * ny)) / Math.max(.0001, incomingSpeed), 0, 1));
        if (angleFromSurface <= ELECTRIC_ATTACH_ANGLE && rect.source) {
          const surfaceAngle = rect.surfaceAngle ?? rect.source.angle;
          const tangent = { x: Math.cos(surfaceAngle), y: Math.sin(surfaceAngle) };
          const along = incomingVx * tangent.x + incomingVy * tangent.y;
          const localDx = ball.x - rect.source.x;
          const localDy = ball.y - rect.source.y;
          const localX = tangent.x * localDx + tangent.y * localDy;
          ball.electricRide = {
            rodUid: rect.source.uid,
            side: 'top',
            direction: Math.abs(along) > .08 ? Math.sign(along) : 1,
            speed: Math.max(1.5, Math.abs(along)),
            distance: clamp(localX + rect.source.length / 2, 0, rect.source.length),
            boostTravel: 0
          };
          placeBallOnElectricRide(ball.electricRide);
        } else {
          const dot = incomingVx * nx + incomingVy * ny;
          ball.vx = (incomingVx - 2 * dot * nx) * ELECTRIC_SPEED_MULTIPLIER;
          ball.vy = (incomingVy - 2 * dot * ny) * ELECTRIC_SPEED_MULTIPLIER;
          ball.fallPeakY = ball.y;
        }
        if (rect.source) rect.source.electricPulse = 0.45;
        spawnContactParticles(ball.x - nx * ball.radius, ball.y - ny * ball.radius, 'electric', Math.abs(normalSpeed) + 2);
      }
    }
    return true;
  }

  function resolveBallBasketSegment(segment) {
    if (!ball) return false;
    const segmentX = segment.x2 - segment.x1;
    const segmentY = segment.y2 - segment.y1;
    const lengthSquared = segmentX * segmentX + segmentY * segmentY;
    const along = lengthSquared > 0
      ? clamp(((ball.x - segment.x1) * segmentX + (ball.y - segment.y1) * segmentY) / lengthSquared, 0, 1)
      : 0;
    const closestX = segment.x1 + segmentX * along;
    const closestY = segment.y1 + segmentY * along;
    let nx = ball.x - closestX;
    let ny = ball.y - closestY;
    let distance = Math.hypot(nx, ny);
    const collisionDistance = ball.radius + segment.thickness / 2;
    if (distance >= collisionDistance) return false;
    if (distance < .0001) {
      if (Math.abs(segmentX) >= Math.abs(segmentY)) {
        nx = 0;
        ny = ball.y <= closestY ? -1 : 1;
      } else {
        nx = ball.x <= closestX ? -1 : 1;
        ny = 0;
      }
      distance = 0;
    } else {
      nx /= distance;
      ny /= distance;
    }

    const penetration = collisionDistance - distance;
    ball.x += nx * (penetration + .02);
    ball.y += ny * (penetration + .02);
    if (ny < -.15 && segment.material.rollingResistance) {
      supportContacts.push({ nx, ny, resistance: segment.material.rollingResistance, type: 'basket' });
    }

    const radiusM = ball.radius / PIXELS_PER_METER;
    const rx = -nx * radiusM;
    const ry = -ny * radiusM;
    const contactVx = ball.vx - ball.omega * ry;
    const contactVy = ball.vy + ball.omega * rx;
    const normalSpeed = contactVx * nx + contactVy * ny;
    playImpactSoundForContact(`basket:${segment.goalId ?? 'goal'}:${segment.name}`, 'wood', Math.max(0, -normalSpeed));
    if (normalSpeed < 0) {
      const inverseMass = 1 / ball.mass;
      const inverseInertia = 1 / ballInertia();
      const crossN = rx * ny - ry * nx;
      const restitution = getImpactRestitution(segment.material, normalSpeed);
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
      let tangentImpulse = -tangentSpeed / (inverseMass + crossT * crossT * inverseInertia);
      const maxFriction = segment.material.friction * normalImpulse;
      tangentImpulse = clamp(tangentImpulse, -maxFriction, maxFriction);
      const tangentIx = tx * tangentImpulse;
      const tangentIy = ty * tangentImpulse;
      ball.vx += tangentIx * inverseMass;
      ball.vy += tangentIy * inverseMass;
      ball.omega += (rx * tangentIy - ry * tangentIx) * inverseInertia;
    }
    return true;
  }

  function applyRollingResistance(dt) {
    if (!ball) return;
    const gravity = activeGravity();
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
      const gravityAlongTangent = gravity * ty;
      let maxSlowdown = gravity * contact.resistance * dt;
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
    // Roll only while supported by a wooden block; empty map space stays quiet.
    const woodSupported = rollingType === 'wood' || rollingType === 'breakable';
    updateRollingSound(woodSupported ? rollingType : null, woodSupported ? rollingSpeed : 0, ball.omega);
  }

  function swingPoint(rod, distance) {
    const angle = rod.angle || 0;
    return { x: rod.x - distance * Math.sin(angle), y: rod.y + distance * Math.cos(angle) };
  }
  function swingReleasePoint(rod) {
    return swingPoint({ x: rod.x, y: rod.y, angle: rod.releaseAngle ?? DEFAULT_SWING_RELEASE_ANGLE }, -swingRadius(rod));
  }
  function onSwingReleaseArc(rod, point, handleRadius) {
    const dx = point.x - rod.x; const dy = point.y - rod.y;
    const radius = swingRadius(rod);
    const angle = Math.atan2(dx, -dy);
    const releaseAngle = rod.releaseAngle ?? DEFAULT_SWING_RELEASE_ANGLE;
    const difference = Math.atan2(Math.sin(angle - releaseAngle), Math.cos(angle - releaseAngle));
    return Math.abs(Math.hypot(dx, dy) - radius) <= handleRadius
      && Math.abs(difference) <= .09 + handleRadius / radius;
  }
  function swingCapturePoint(rod, radius = BALL_RADIUS) {
    return swingPoint(rod, -(swingRadius(rod) + Math.max(0, radius - BALL_RADIUS) * 1.5));
  }
  function crossedSwingRelease(before, after, target) {
    const wrap = value => ((value % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return after > before ? wrap(target - before) <= after - before
      : after < before && wrap(before - target) <= before - after;
  }
  function exactSwingReleaseAngle(before, after, target) {
    if (!crossedSwingRelease(before, after, target)) return null;
    const wrap = value => ((value % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    return before + (after > before ? wrap(target - before) : -wrap(before - target));
  }
  // The sprite's opaque pixels, not its rectangular image bounds or an invisible disk,
  // define both the solid arms and the open mouth of the magnet.
  let magnetShape = null;
  function swingMagnetShape() {
    if (magnetShape) return magnetShape;
    const image = swingImages.magnet;
    if (!image.complete || !image.naturalWidth) return null;
    const sample = document.createElement('canvas');
    sample.width = 84; sample.height = 59;
    const context = sample.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, 84, 59);
    const pixels = context.getImageData(0, 0, 84, 59).data;
    const solid = new Uint8Array(84 * 59);
    for (let index = 0; index < solid.length; index++) solid[index] = pixels[index * 4 + 3] >= 96 ? 1 : 0;
    const edge = [];
    const has = (x, y) => x >= 0 && x < 84 && y >= 0 && y < 59 && solid[y * 84 + x];
    for (let y = 0; y < 59; y++) for (let x = 0; x < 84; x++) {
      if (has(x, y) && (!has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1) || !has(x, y + 1))) {
        edge.push({ x: x - 41.5, y: y - 52.5 });
      }
    }
    magnetShape = { solid, edge };
    return magnetShape;
  }
  function swingLocalPoint(rod, point) {
    const dx = point.x - rod.x; const dy = point.y - rod.y;
    const cos = Math.cos(rod.angle); const sin = Math.sin(rod.angle);
    return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos + rod.length };
  }
  function magnetSolidAt(shape, x, y) {
    const ix = Math.floor(x + 42); const iy = Math.floor(y + 53);
    return ix >= 0 && ix < 84 && iy >= 0 && iy < 59 && shape.solid[iy * 84 + ix];
  }
  function magnetContact(rod, point, radius) {
    const shape = swingMagnetShape();
    if (!shape) return null;
    const local = swingLocalPoint(rod, point);
    let nearest = null; let distanceSquaredToEdge = (radius + 2) ** 2;
    const inside = magnetSolidAt(shape, local.x, local.y);
    for (const edge of shape.edge) {
      const dx = local.x - edge.x; const dy = local.y - edge.y;
      const distance = dx * dx + dy * dy;
      if (distance < distanceSquaredToEdge || (inside && !nearest)) {
        distanceSquaredToEdge = distance; nearest = edge;
      }
    }
    if (!nearest || (!inside && distanceSquaredToEdge >= (radius + .5) ** 2)) return null;
    const distance = Math.sqrt(distanceSquaredToEdge) || .0001;
    const direction = inside ? -1 : 1;
    const localNx = (local.x - nearest.x) / distance * direction;
    const localNy = (local.y - nearest.y) / distance * direction;
    const cos = Math.cos(rod.angle); const sin = Math.sin(rod.angle);
    return { nx: localNx * cos - localNy * sin, ny: localNx * sin + localNy * cos,
      penetration: inside ? radius + distance : radius + .5 - distance,
      point: { x: rod.x + nearest.x * cos - (nearest.y - rod.length) * sin,
        y: rod.y + nearest.x * sin + (nearest.y - rod.length) * cos } };
  }
  function magnetTouchesRect(rod, rect) {
    const shape = swingMagnetShape();
    if (!shape) return false;
    const cos = Math.cos(rod.angle); const sin = Math.sin(rod.angle);
    for (const point of shape.edge) {
      const x = rod.x + point.x * cos - (point.y - rod.length) * sin;
      const y = rod.y + point.x * sin + (point.y - rod.length) * cos;
      if (circleTouchesRect({ x, y }, .7, rect)) return true;
    }
    return orientedRectCorners(rect).some(corner => {
      const local = swingLocalPoint(rod, corner);
      return magnetSolidAt(shape, local.x, local.y);
    });
  }
  function pointSegmentDistanceSquared(point, start, end) {
    const dx = end.x - start.x; const dy = end.y - start.y;
    const fraction = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    const x = start.x + fraction * dx; const y = start.y + fraction * dy;
    return { x, y, distance: (point.x - x) ** 2 + (point.y - y) ** 2 };
  }
  function shaftTouchesRect(rod, rect) {
    const start = { x: rod.x, y: rod.y };
    const end = swingPoint(rod, -(rod.length + 5));
    if (circleTouchesRect(start, 2, rect) || circleTouchesRect(end, 2, rect)) return true;
    const corners = orientedRectCorners(rect);
    if (corners.some(corner => pointSegmentDistanceSquared(corner, start, end).distance <= 4)) return true;
    const intersects = (a, b, c, d) => {
      const cross = (u, v) => u.x * v.y - u.y * v.x;
      const ab = { x: b.x - a.x, y: b.y - a.y };
      const cd = { x: d.x - c.x, y: d.y - c.y };
      const divisor = cross(ab, cd);
      if (Math.abs(divisor) < 1e-8) return false;
      const ac = { x: c.x - a.x, y: c.y - a.y };
      const t = cross(ac, cd) / divisor; const u = cross(ac, ab) / divisor;
      return t >= 0 && t <= 1 && u >= 0 && u <= 1;
    };
    return corners.some((corner, index) => intersects(start, end, corner, corners[(index + 1) % 4]));
  }
  function swingBlockedAt(rod, angle) {
    const probe = { ...rod, angle };
    const obstacles = rods.filter(other => other !== rod && !(other.type === 'breakable' && other.hp <= 0)).map(other => other.type === 'swing'
      ? { x: other.x, y: other.y, width: 26, height: 26 }
      : { x: other.x, y: other.y, width: other.length, height: other.thickness, angle: other.angle });
    obstacles.push(...goals.flatMap(goal => basketSegments(goal).map(basketSegmentBounds)));
    const attached = ball?.attachedSwingUid === rod.uid;
    const mouth = attached && swingCapturePoint(probe, ball.radius);
    return obstacles.some(rect => magnetTouchesRect(probe, rect)
      || shaftTouchesRect(probe, rect)
      || (mouth && circleTouchesRect(mouth, ball.radius, rect)));
  }
  function swingBlockedBetween(rod, from, to) {
    const steps = Math.max(1, Math.ceil(Math.abs(to - from) * swingRadius(rod) / 4));
    for (let step = 1; step <= steps; step++) {
      if (swingBlockedAt(rod, from + (to - from) * step / steps)) return true;
    }
    return false;
  }
  function swingInertia(rod, attachedMass = 0) {
    const length = rod.length / PIXELS_PER_METER;
    const mouthArm = (rod.length + SWING_MOUTH + (attachedMass && ball ? Math.max(0, ball.radius - BALL_RADIUS) * 1.5 : 0)) / PIXELS_PER_METER;
    return SWING_MAGNET_MASS * length * length
      + SWING_ROD_MASS * length * length / 3 + attachedMass * mouthArm * mouthArm;
  }
  let lastSwingRelease = null;
  function resetSwingState() {
    lastSwingRelease = null;
    rods.filter(rod => rod.type === 'swing').forEach(rod => {
      rod.angle = Number.isFinite(rod.startAngle) ? rod.startAngle : (rod.angle || 0);
      rod.swingOmega = 0;
      rod.swingStarted = false;
      rod.swingBlocked = false;
      rod.releaseRequested = false;
    });
  }

  function releaseSwingBall(rod) {
    if (!ball || ball.attachedSwingUid !== rod.uid) return false;
    const mouth = swingCapturePoint(rod, ball.radius);
    const speed = (rod.swingOmega || 0) * Math.hypot(mouth.x - rod.x, mouth.y - rod.y) / PIXELS_PER_METER;
    // Velocity at the magnet, not at the distant weight or the pivot.
    ball.x = mouth.x; ball.y = mouth.y;
    ball.vx = speed * Math.cos(rod.angle);
    ball.vy = speed * Math.sin(rod.angle);
    lastSwingRelease = { angle: rod.angle, x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy };
    ball.attachedSwingUid = null;
    rod.releaseRequested = false;
    ball.swingDetachUid = rod.uid;
    ball.swingDetachTime = 2;
    ball.fallPeakY = ball.y;
    setHint('자석에서 공을 놓았습니다. 스윙 속도를 이어받아 날아갑니다.', 2500);
    return true;
  }

  function advanceSwings(dt) {
    for (const rod of rods) {
      if (rod.type !== 'swing' || !rod.swingStarted) continue;
      if (rod.swingBlocked) {
        const toward = Math.sign(rod.swingOmega || Math.sin(rod.angle) || 1);
        if (!swingBlockedAt(rod, rod.angle + toward * .001)) rod.swingBlocked = false;
        else continue;
      }
      const attachedMass = ball?.attachedSwingUid === rod.uid ? ball.mass : 0;
      const moment = swingInertia(rod, attachedMass);
      const torque = (SWING_MAGNET_MASS * rod.length / PIXELS_PER_METER
        + SWING_ROD_MASS * rod.length / (2 * PIXELS_PER_METER)
        + attachedMass * (rod.length + SWING_MOUTH) / PIXELS_PER_METER) * activeGravity() * Math.sin(rod.angle);
      rod.swingOmega = clamp((rod.swingOmega || 0) + torque / moment * dt, -9, 9) * Math.exp(-0.18 * dt);
      const before = rod.angle;
      const after = before + rod.swingOmega * dt;
      const release = rod.releaseRequested && ball?.attachedSwingUid === rod.uid
        ? exactSwingReleaseAngle(before, after, rod.releaseAngle ?? DEFAULT_SWING_RELEASE_ANGLE) : null;
      const destination = release ?? after;
      if (swingBlockedBetween(rod, before, destination)) {
        // Binary-search the last nonintersecting position to stop at visible contact.
        if (!swingBlockedAt(rod, before)) {
          let free = before; let blocked = destination;
          for (let probe = 0; probe < 10; probe += 1) {
            const middle = (free + blocked) / 2;
            if (swingBlockedBetween(rod, before, middle)) blocked = middle;
            else free = middle;
          }
          rod.angle = free;
        }
        rod.swingOmega = 0;
        rod.swingBlocked = true;
        continue;
      }
      rod.angle = destination;
      if (release !== null) releaseSwingBall(rod);
    }
  }

  function attractSwingBall(rod, dt) {
    if (!ball || ball.attachedSwingUid || ball.swingDetachUid === rod.uid) return;
    const mouth = swingCapturePoint(rod, ball.radius);
    const dx = mouth.x - ball.x; const dy = mouth.y - ball.y;
    const distance = Math.hypot(dx, dy);
    const localY = -Math.sin(rod.angle) * (ball.x - rod.x) + Math.cos(rod.angle) * (ball.y - rod.y);
    if (distance > 65 || distance < .001 || localY > -rod.length - 20) return;
    const acceleration = 12 + 80 * Math.pow(1 - distance / 65, 1.5);
    ball.vx += dx / distance * acceleration * dt;
    ball.vy += dy / distance * acceleration * dt;
  }

  function resolveSwingContact(rod) {
    if (!ball || ball.attachedSwingUid) return false;
    const mouth = swingCapturePoint(rod, ball.radius);
    const dx = ball.x - mouth.x; const dy = ball.y - mouth.y;
    const localY = -Math.sin(rod.angle) * (ball.x - rod.x) + Math.cos(rod.angle) * (ball.y - rod.y);
    const canAttach = ball.swingDetachUid !== rod.uid;
    const captureDistance = ball.radius > BALL_RADIUS ? 14 : 6;
    if (canAttach && localY < -rod.length - 20 && Math.hypot(dx, dy) <= captureDistance) {
      const rx = (mouth.x - rod.x) / PIXELS_PER_METER;
      const ry = (mouth.y - rod.y) / PIXELS_PER_METER;
      rod.swingOmega = clamp(((rod.swingOmega || 0) * swingInertia(rod) + ball.mass * (rx * ball.vy - ry * ball.vx))
        / swingInertia(rod, ball.mass), -9, 9);
      rod.swingStarted = true;
      rod.swingBlocked = false;
      ball.attachedSwingUid = rod.uid;
      ball.x = mouth.x; ball.y = mouth.y;
      ball.vx = 0; ball.vy = 0;
      rod.touched = true; touchedRodIds.add(rod.id);
      setHint('공이 자석에 붙었어요. 중심축을 터치하면 빨간 곡선에서 놓습니다.', 2800);
      return true;
    }
    const end = swingPoint(rod, -(rod.length + 5));
    const shaft = pointSegmentDistanceSquared(ball, rod, end);
    const shaftDistance = Math.sqrt(shaft.distance);
    const magnetHit = magnetContact(rod, ball, ball.radius);
    const weightDistance = Math.hypot(ball.x - rod.x, ball.y - rod.y);
    let contact = null;
    if (magnetHit) contact = magnetHit;
    else if (shaftDistance < ball.radius + 2) {
      contact = { point: shaft, nx: (ball.x - shaft.x) / (shaftDistance || 1),
        ny: (ball.y - shaft.y) / (shaftDistance || 1), penetration: ball.radius + 2 - shaftDistance };
    } else if (weightDistance < ball.radius + 12) {
      contact = { point: rod, nx: (ball.x - rod.x) / (weightDistance || 1),
        ny: (ball.y - rod.y) / (weightDistance || 1), penetration: ball.radius + 12 - weightDistance };
    }
    if (contact) {
      const { point, nx, ny } = contact;
      ball.x += nx * (contact.penetration + .02);
      ball.y += ny * (contact.penetration + .02);
      const rx = (point.x - rod.x) / PIXELS_PER_METER;
      const ry = (point.y - rod.y) / PIXELS_PER_METER;
      const angular = rod.swingOmega || 0;
      const relativeSpeed = (ball.vx + angular * ry) * nx + (ball.vy - angular * rx) * ny;
      if (relativeSpeed < -0.08) {
        const cross = rx * ny - ry * nx;
        const impulse = -(1 + 0.3) * relativeSpeed / (1 / ball.mass + cross * cross / swingInertia(rod));
        ball.vx += nx * impulse / ball.mass;
        ball.vy += ny * impulse / ball.mass;
        rod.swingOmega = clamp(angular - cross * impulse / swingInertia(rod), -9, 9);
        rod.swingStarted = true;
        rod.swingBlocked = false;
        rod.touched = true; touchedRodIds.add(rod.id);
      }
      return true;
    }
    return false;
  }

  function physicsStep(dt) {
    if (!ball || won || editDrag) return;
    advanceSwings(dt);
    if (ball.attachedSwingUid) {
      const rod = rods.find(item => item.uid === ball.attachedSwingUid);
      if (rod) {
        const mouth = swingCapturePoint(rod, ball.radius);
        ball.x = mouth.x; ball.y = mouth.y;
        const arm = Math.hypot(mouth.x - rod.x, mouth.y - rod.y) / PIXELS_PER_METER;
        ball.vx = rod.swingOmega * arm * Math.cos(rod.angle);
        ball.vy = rod.swingOmega * arm * Math.sin(rod.angle);
        return;
      }
      ball.attachedSwingUid = null;
    }
    if (ball.swingDetachUid) {
      ball.swingDetachTime = Math.max(0, (ball.swingDetachTime || 0) - dt);
      const old = rods.find(rod => rod.uid === ball.swingDetachUid);
      if (!old || (ball.swingDetachTime <= 0 && Math.hypot(ball.x - swingCapturePoint(old, ball.radius).x, ball.y - swingCapturePoint(old, ball.radius).y) > ball.radius + 18)) {
        ball.swingDetachUid = null;
      }
    }
    if (ball.electricRide && updateElectricRide(dt)) return;
    physicsStepCount += 1;
    specialContactsThisStep.clear();
    if (ball.vy <= 0) ball.fallPeakY = Math.min(ball.fallPeakY ?? ball.y, ball.y);
    const gravity = activeGravity();
    for (const rod of rods) if (rod.type === 'swing') attractSwingBall(rod, dt);
    let gravityX = 0;
    let gravityY = gravity;
    for (const field of fields) {
      if (!pointInField(ball, field)) continue;
      gravityX = field.direction === 'left' ? -gravity : field.direction === 'right' ? gravity : 0;
      gravityY = field.direction === 'up' ? -gravity : 0;
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
    for (const rod of rods) {
      if (rod.type === 'breakable' && rod.hp <= 0) continue;
      if (rod.type === 'swing') {
        resolveSwingContact(rod);
        if (ball.attachedSwingUid) break;
        continue;
      }
      let touched = false;
      touched = resolveBallRect({
        x: rod.x, y: rod.y, width: rod.length, height: rod.thickness,
        angle: rod.angle, material: materialForType(rod.type),
        blockType: rod.type, blockId: rod.id, source: rod
      });
      if (touched) {
        rod.touched = true;
        touchedRodIds.add(rod.id);
      }
      // Once the marble attaches, the ride owns this frame. Another platform
      // touching the same corner must not apply a second impulse and reverse it.
      if (ball.electricRide) break;
    }
    if (ball.electricRide) {
      ball.specialContacts = [...specialContactsThisStep];
      finishImpactSoundContacts();
      return;
    }
    goals.forEach(goal => basketSegments(goal).forEach(resolveBallBasketSegment));
    applyRollingResistance(dt);
    ball.specialContacts = [...specialContactsThisStep];
    finishImpactSoundContacts();

    // Editor drops are previews, not playable stage wins or progress updates.
    if (appMode === 'editor') return;
    const insideGoal = goals.some(goal => pointInsideBasket(goal, ball));

    const playableRods = rods;
    const allRodsTouched = playableRods.length > 0 && playableRods.every(rod => touchedRodIds.has(rod.id));
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
    ctx.arc(spawn.x, spawn.y, (selectedBallType === 'giant' ? GIANT_BALL_RADIUS : BALL_RADIUS) + 5, 0, Math.PI * 2);
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

  const PLATFORM_SOURCE_INSETS = {
    wood: { left: 6, top: 6, right: 6, bottom: 6 },
    slime: { left: 6, top: 6, right: 6, bottom: 6 },
    electric: { left: 3, top: 3, right: 3, bottom: 3 }
  };

  const MATERIAL_REPEAT_LAYOUT = {
    wood: {
      sourceX: 17, sourceY: 20, sourceWidth: 1317, sourceHeight: 158,
      tileWidth: 176, tileHeight: 176 * 158 / 1317, mirrorAlternateRows: false
    },
    slime: {
      sourceX: 15, sourceY: 15, sourceWidth: 1359, sourceHeight: 112,
      tileWidth: 176, tileHeight: 176 * 112 / 1359, mirrorAlternateRows: true
    }
  };

  function drawRepeatedMaterial(image, width, height, type) {
    if (!image?.complete || !image.naturalWidth) return false;
    const layout = MATERIAL_REPEAT_LAYOUT[type];
    if (!layout) return false;
    const borderInset = 2;
    const left = -width / 2 + borderInset;
    const top = -height / 2 + borderInset;
    const right = width / 2 - borderInset;
    const bottom = height / 2 - borderInset;
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
    ctx.clip();
    let row = 0;
    for (let y = top; y < bottom; y += layout.tileHeight, row += 1) {
      const mirrored = layout.mirrorAlternateRows && row % 2 === 1;
      for (let x = left; x < right; x += layout.tileWidth) {
        if (mirrored) {
          ctx.save();
          ctx.translate(x + layout.tileWidth / 2, y + layout.tileHeight / 2);
          ctx.scale(-1, 1);
          ctx.drawImage(
            image,
            layout.sourceX, layout.sourceY, layout.sourceWidth, layout.sourceHeight,
            -layout.tileWidth / 2, -layout.tileHeight / 2, layout.tileWidth, layout.tileHeight
          );
          ctx.restore();
        } else {
          ctx.drawImage(
            image,
            layout.sourceX, layout.sourceY, layout.sourceWidth, layout.sourceHeight,
            x, y, layout.tileWidth, layout.tileHeight
          );
        }
      }
    }
    ctx.restore();
    return true;
  }

  function drawPlatformAsset(image, width, height, type) {
    if (type === 'wood' || type === 'slime') {
      return drawRepeatedMaterial(image, width, height, type);
    }
    if (!image?.complete || !image.naturalWidth) return false;
    const inset = PLATFORM_SOURCE_INSETS[type] || { left: 0, top: 0, right: 0, bottom: 0 };
    const sourceX = inset.left;
    const sourceY = inset.top;
    const sourceWidth = image.naturalWidth - inset.left - inset.right;
    const sourceHeight = image.naturalHeight - inset.top - inset.bottom;
    ctx.save();
    ctx.beginPath();
    ctx.rect(-width / 2, -height / 2, width, height);
    ctx.clip();

    const sourceCap = Math.min(sourceWidth * .16, sourceHeight * 1.35);
    const targetCap = Math.min(width / 3, Math.max(height * 1.15, 12));
    const centerSourceWidth = Math.max(1, sourceWidth - sourceCap * 2);
    const centerTargetWidth = Math.max(1, width - targetCap * 2);
    ctx.drawImage(image, sourceX, sourceY, sourceCap, sourceHeight, -width / 2, -height / 2, targetCap, height);
    ctx.drawImage(image, sourceX + sourceCap, sourceY, centerSourceWidth, sourceHeight, -width / 2 + targetCap, -height / 2, centerTargetWidth, height);
    ctx.drawImage(image, sourceX + sourceWidth - sourceCap, sourceY, sourceCap, sourceHeight, width / 2 - targetCap, -height / 2, targetCap, height);
    ctx.restore();
    return true;
  }

  function drawSwingSweep(rod, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#73a7dc';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    ctx.arc(rod.x, rod.y, swingRadius(rod), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    const center = (rod.releaseAngle ?? DEFAULT_SWING_RELEASE_ANGLE) - Math.PI / 2;
    ctx.strokeStyle = '#e94736';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(rod.x, rod.y, swingRadius(rod), center - .09, center + .09);
    ctx.stroke();
    ctx.restore();
  }

  // The original electric sprite stays intact; cover only a joint's open wedge.
  function drawRod(rod, alpha = 1) {
    if (rod.type === 'breakable' && rod.hp <= 0) return;
    if (rod.type === 'swing') {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(rod.x, rod.y);
      ctx.rotate(rod.angle || 0);
      ctx.strokeStyle = '#62727f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -rod.length - 5);
      ctx.stroke();
      if (swingImages.magnet.complete && swingImages.magnet.naturalWidth) {
        ctx.drawImage(swingImages.magnet, -42, -rod.length - 53, 84, 59);
      }
      if (swingImages.weight.complete && swingImages.weight.naturalWidth) {
        ctx.drawImage(swingImages.weight, -14, -16, 27, 31);
      }
      ctx.restore();
      return;
    }
    const material = MATERIALS[rod.type] || MATERIALS.wood;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(rod.x, rod.y);
    ctx.rotate(rod.angle);
    ctx.shadowColor = 'rgba(23, 50, 77, .18)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = material.color;
    ctx.fillRect(-rod.length / 2, -rod.thickness / 2, rod.length, rod.thickness);
    ctx.shadowColor = 'transparent';
    if (rod.type === 'breakable') {
      const sprite = breakableImages[breakableStage(rod.hp ?? BREAKABLE_HP)];
      if (sprite.complete && sprite.naturalWidth) {
        const cap = Math.min(rod.length / 3, rod.thickness * 1.2);
        const sourceCap = sprite.naturalHeight * 1.2;
        ctx.drawImage(sprite, 0, 0, sourceCap, sprite.naturalHeight, -rod.length / 2, -rod.thickness / 2, cap, rod.thickness);
        ctx.drawImage(sprite, sourceCap, 0, sprite.naturalWidth - sourceCap * 2, sprite.naturalHeight, -rod.length / 2 + cap, -rod.thickness / 2, rod.length - cap * 2, rod.thickness);
        ctx.drawImage(sprite, sprite.naturalWidth - sourceCap, 0, sourceCap, sprite.naturalHeight, rod.length / 2 - cap, -rod.thickness / 2, cap, rod.thickness);
      }
    } else drawPlatformAsset(platformImages[rod.type], rod.length, rod.thickness, rod.type);
    ctx.strokeStyle = material.edge;
    ctx.lineWidth = 4;
    const borderInset = ctx.lineWidth / 2;
    ctx.strokeRect(
      -rod.length / 2 + borderInset,
      -rod.thickness / 2 + borderInset,
      Math.max(0, rod.length - ctx.lineWidth),
      Math.max(0, rod.thickness - ctx.lineWidth)
    );
    if (rod.type === 'electric') {
      if (rod.electricPulse > 0) {
        const pulse = clamp(rod.electricPulse / 0.45, 0, 1);
        ctx.globalAlpha = alpha * pulse;
        ctx.shadowColor = '#73efff';
        ctx.shadowBlur = 22;
        ctx.strokeStyle = '#eaffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(-rod.length / 2 - 5, -rod.thickness / 2 - 5, rod.length + 10, rod.thickness + 10);
        ctx.lineWidth = 2.5;
        for (let bolt = -1; bolt <= 1; bolt += 1) {
          const centerX = bolt * rod.length * 0.28;
          ctx.beginPath();
          ctx.moveTo(centerX - 11, -rod.thickness / 2 - 8);
          ctx.lineTo(centerX - 3, -rod.thickness / 2 - 18 - pulse * 8);
          ctx.lineTo(centerX + 2, -rod.thickness / 2 - 10);
          ctx.lineTo(centerX + 12, -rod.thickness / 2 - 23 - pulse * 5);
          ctx.stroke();
        }
        ctx.shadowColor = 'transparent';
        ctx.globalAlpha = alpha;
      }
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
    const segments = basketSegments(goal);
    const traceSegments = () => {
      ctx.beginPath();
      segments.forEach(segment => {
        ctx.moveTo(segment.x1, segment.y1);
        ctx.lineTo(segment.x2, segment.y2);
      });
    };
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    traceSegments();
    ctx.strokeStyle = '#8b501c';
    ctx.lineWidth = segments[0].thickness;
    ctx.stroke();
    traceSegments();
    ctx.strokeStyle = '#d89235';
    ctx.lineWidth = Math.max(3, segments[0].thickness - 4);
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
      ctx.fillStyle = particle.type === 'electric' ? '#55ddff' : particle.type === 'breakable' ? '#ac662e' : '#54c95b';
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
      if (selected.type === 'swing') {
        ctx.beginPath(); ctx.moveTo(ends.start.x, ends.start.y); ctx.lineTo(ends.end.x, ends.end.y); ctx.stroke();
        if (appMode !== 'stage') {
          drawHandle(ends.start.x, ends.start.y, '#2674d9');
          drawHandle(ends.end.x, ends.end.y, '#ffaf21');
          const angleHandle = swingPoint(selected, -(selected.length + 38));
          drawHandle(angleHandle.x, angleHandle.y, '#a967db');
        }
        ctx.restore();
        return;
      }
      const fixedInPlayer = appMode === 'stage' && selected.fixed;
      const angleLockedInPlayer = appMode === 'stage' && selected.angleLocked;
      if (!angleLockedInPlayer) {
        ctx.beginPath();
        ctx.moveTo(ends.start.x, ends.start.y);
        ctx.lineTo(ends.end.x, ends.end.y);
        ctx.stroke();
        if (!endpointLink(selected.uid, 'start')) drawHandle(ends.start.x, ends.start.y, '#ffaf21');
        if (!endpointLink(selected.uid, 'end')) drawHandle(ends.end.x, ends.end.y, '#ffaf21');
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

  function drawElectricJoints() {
    for (const link of electricLinks) {
      const joint = electricJointPoint(link);
      if (!joint) continue;
      ctx.save();
      ctx.fillStyle = validElectricJoint(link) ? '#ffbd18' : '#e84d53';
      ctx.strokeStyle = link.id === selectedElectricLinkId ? '#fff7cf' : '#c46d00';
      ctx.lineWidth = link.id === selectedElectricLinkId ? 5 : 2;
      ctx.shadowColor = validElectricJoint(link) ? 'rgba(255,181,0,.45)' : 'rgba(232,77,83,.5)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(joint.x, joint.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    const candidate = findElectricConnectionCandidate(selected);
    if (!candidate) return;
    ctx.save();
    ctx.strokeStyle = '#05a9d6';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 4]);
    for (const point of [candidate.point, candidate.target]) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 13, 0, Math.PI * 2);
      ctx.stroke();
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
    const gradient = ctx.createRadialGradient(-ball.radius / 3, -ball.radius / 3, 2, 0, 0, ball.radius);
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
        thickness: placement.thickness || toolSettings[placement.tool]?.thickness || 14,
        angle: placement.angle || 0,
        releaseAngle: placement.releaseAngle,
        type: placement.tool
      };
      drawRod(preview, appMode === 'editor' && !placement.fixed ? .42 : .65);
      if (preview.type === 'swing') drawSwingSweep(preview, .72);
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

    rods.filter(rod => rod.type === 'swing').forEach(rod => drawSwingSweep(rod, .78));
    rods.forEach(rod => drawRod(rod, appMode === 'editor' && !rod.fixed ? 0.42 : 1));
    drawElectricJoints();
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
      else {
        const preview = { x: sizingMode.preview.x, y: sizingMode.preview.y, length: sizingMode.preview.width, thickness: sizingMode.preview.height, angle: 0, type: sizingMode.type };
        if (preview.type === 'swing') drawSwingSweep(preview, .9);
        drawRod(preview, .8);
      }
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
    if (followBall && ball && (appMode === 'free' || appMode === 'stage' || appMode === 'editor' || appMode === 'physics-lab')) {
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
  ballTypeButton.addEventListener('click', () => {
    selectedBallType = selectedBallType === 'giant' ? 'normal' : 'giant';
    updateBallTypeButton();
    setHint(selectedBallType === 'giant' ? '크고 무거운 거대 공을 선택했어요.' : '기본 공을 선택했어요.');
  });
  deleteButton.addEventListener('click', deleteSelected);
  toggleFixedButton.addEventListener('click', toggleSelectedFixed);
  combineElectricButton.addEventListener('click', combineSelectedElectric);
  detachElectricButton.addEventListener('click', detachSelectedElectricLink);
  convertElectricButton.addEventListener('click', convertSelectedElectricCorner);

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
  physicsLabButton.addEventListener('click', startPhysicsLab);
  stageModeButton.addEventListener('click', showStageList);
  swapStagesButton.addEventListener('click', () => {
    firstStageNumber.value = '';
    secondStageNumber.value = '';
    swapStagesError.hidden = true;
    swapStagesDialog.showModal();
    firstStageNumber.focus();
  });
  swapStagesForm.addEventListener('submit', event => {
    event.preventDefault();
    const first = Number(firstStageNumber.value);
    const second = Number(secondStageNumber.value);
    if (!Number.isInteger(first) || !Number.isInteger(second) || !swapStageNumbers(first, second)) {
      swapStagesError.textContent = first === second ? '서로 다른 번호 두 개를 입력하세요.' : '두 번호 모두 존재하는 스테이지를 입력하세요.';
      swapStagesError.hidden = false;
      return;
    }
    document.activeElement?.blur();
    swapStagesDialog.close();
  });
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
  gravityRange.addEventListener('input', () => updatePhysicsLabSetting('gravity', gravityRange.value));
  gravityInput.addEventListener('change', () => updatePhysicsLabSetting('gravity', gravityInput.value));
  woodFrictionRange.addEventListener('input', () => updatePhysicsLabSetting('woodFriction', woodFrictionRange.value));
  woodFrictionInput.addEventListener('change', () => updatePhysicsLabSetting('woodFriction', woodFrictionInput.value));
  woodBounceRange.addEventListener('input', () => updatePhysicsLabSetting('woodBounce', woodBounceRange.value));
  woodBounceInput.addEventListener('change', () => updatePhysicsLabSetting('woodBounce', woodBounceInput.value));
  physicsLabRespawnButton.addEventListener('click', spawnBall);
  physicsLabResetButton.addEventListener('click', resetPhysicsLabSettings);
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
      persistStageOrder(stages.filter(stage => stage.id !== pendingDeleteStageId).sort((a, b) => a.number - b.number));
    }
    pendingDeleteStageId = null;
    deleteStageDialog.close();
    renderStageList();
  });
  document.querySelectorAll('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));

  const activateAudioFromGesture = () => {
    const audio = ensureAudio();
    if (audio.state !== 'running') audio.resume().catch(() => {});
  };
  window.addEventListener('pointerdown', activateAudioFromGesture, { passive: true, capture: true });
  window.addEventListener('keydown', activateAudioFromGesture, { passive: true, capture: true });
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
    if (event.code === 'Space' && ['free', 'stage', 'editor', 'physics-lab'].includes(appMode)) {
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
      GOAL_SUCCESS_DELAY,
      ELECTRIC_PLATFORM_THICKNESS,
      BREAKABLE_HP,
      BREAKABLE_THICKNESS,
      ELECTRIC_ATTACH_ANGLE,
      ELECTRIC_SPEED_MULTIPLIER,
      ELECTRIC_ACCELERATION,
      ELECTRIC_MAX_SPEED,
      ELECTRIC_MIN_JOINT_ANGLE
    },
    getState: () => ({
      rodCount: rods.length,
      goalCount: goals.length,
      fieldCount: fields.length,
      electricLinkCount: electricLinks.length,
      electricLinks: clone(electricLinks),

      selectedKind: selected?.kind || null,
      selected: selected ? { kind: selected.kind, x: selected.x, y: selected.y, angle: selected.angle ?? null, fixed: Boolean(selected.fixed) } : null,
      rods: rods.map(rod => ({ id: rod.id, uid: rod.uid, type: rod.type, x: rod.x, y: rod.y, angle: rod.angle, length: rod.length, thickness: rod.thickness, hp: rod.hp, damageStage: rod.type === 'breakable' ? breakableStage(rod.hp ?? BREAKABLE_HP) : null, electricPulse: rod.electricPulse || 0, fixed: rod.fixed, angleLocked: rod.angleLocked, supplyId: rod.supplyId, startAngle: rod.startAngle, releaseAngle: rod.releaseAngle, releaseRequested: rod.releaseRequested, swingOmega: rod.swingOmega, swingStarted: rod.swingStarted, swingBlocked: rod.swingBlocked })),
      goals: goals.map(goal => ({ id: goal.id, x: goal.x, y: goal.y })),
      fields: fields.map(field => ({ id: field.id, x: field.x, y: field.y, width: field.width, height: field.height, direction: field.direction })),
      supplies: clone(stageSupplies),
      recentTools: [...recentTools],
      ball: ball ? { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, radius: ball.radius, mass: ball.mass, type: ball.type, omega: ball.omega, fallPeakY: ball.fallPeakY, attachedSwingUid: ball.attachedSwingUid || null, electricRide: ball.electricRide ? clone(ball.electricRide) : null } : null,
      selectedBallType,
      lastSwingRelease: lastSwingRelease ? { ...lastSwingRelease } : null,
      won,
      appMode,
      developerEnabled,
      physicsLabSettings: { ...physicsLabSettings },
      activeGravity: activeGravity(),
      activeWoodFriction: materialForType('wood').friction,
      activeWoodBounce: materialForType('wood').restitution,
      activeWoodRollingResistance: materialForType('wood').rollingResistance,

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
    getRodByUid: rodByUid,
    swingReleasePoint,
    swingBlockedAt,
    shaftTouchesRect,
    magnetTouchesRect,
    magnetContact,
    setSwingState: (uid, state) => {
      const rod = rodByUid(uid);
      if (!rod || rod.type !== 'swing') return null;
      if (Number.isFinite(state.angle)) rod.angle = state.angle;
      if (Number.isFinite(state.omega)) rod.swingOmega = state.omega;
      if (typeof state.started === 'boolean') rod.swingStarted = state.started;
      return rod;
    },
    addGoal,
    selectRod: index => selectEntity(rods[index] || null),
    setBallState: state => {
      if (!ball) spawnBall();
      Object.assign(ball, state);
      ball.specialContacts ||= [];
      return ball;
    },
    stepPhysics: (steps = 1) => {
      for (let index = 0; index < steps; index += 1) physicsStep(FIXED_STEP);
      return ball;
    },
    combineSelectedElectric,
    detachSelectedElectricLink,
    convertSelectedElectricCorner,
    electricJointAngle,
    electricJointSides,
    validElectricJoint,
    moveElectricJoint,
    rotateElectricOuterEnd,
    findElectricConnectionCandidate,
    selectElectricLink: index => {
      const link = electricLinks[index];
      if (!link) return null;
      selected = rodByUid(link.a.rodUid);
      selectedElectricLinkId = link.id;
      updateDeleteButton();
      return link;
    },
    spawnBall,
    clearAll,
    resetGame,
    setZoomAt,
    showHome,
    showStageList,
    swapStageNumbers,
    startFreeMode,
    startPhysicsLab,
    updatePhysicsLabSetting,
    resetPhysicsLabSettings,
    loadStage,
    startEditor,
    saveEditedStage,
    normalizeStage,
    renderToolDock,
    resize,
    toggleSelectedFixed,
    undoLastAction,
    redoLastAction,
    loadCreation,
    saveCreation,
    physicsStep,
    reboundSpeed,
    playImpactSound,
    updateRollingSound,
    rollingPlaybackRateForOmega,
    rollingGainForRevolutions,
    getAudioState: () => ({
      contextState: audioContext?.state || 'none',
      masterGain: audioMaster?.gain.value || 0,
      limiterActive: Boolean(audioLimiter),
      limiterThreshold: audioLimiter?.threshold.value ?? null,
      rollingActive: Boolean(rollingAudio),
      rollingToneType: null,
      rollingFilterType: rollingAudio?.filter.type || null,
      referenceRollingLoaded: Boolean(rollingReferenceBuffer),
      woodImpactCount: woodImpactBuffers.length,
      woodImpactDurations: woodImpactBuffers.map(buffer => buffer.duration),
      recordedRollingActive: Boolean(recordedRollingAudio),
      recordedRollingSourceStarts,
      recordedRollingRevolutionsPerSecond,
      recordedRollingPlaybackRate,
      recordedRollingGain: recordedRollingAudio?.gain.gain.value ?? 0,
      woodPassageMix: recordedRollingAudio?.swishGain.gain.value ?? 0,
      woodPassageDurations: [rollingReferenceBuffer?.duration, woodSwishBuffer?.duration],
      impactSoundCount,
      soundedImpactContactCount: soundedImpactContacts.size
    }),
    openBlockCatalog,
    rodOverlapsAnyGoal,
    goalOverlapsAnyRod,
    resolveBallRect,
    basketSegments,
    pointInsideBasket,
    resolveBallBasketSegment,
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
