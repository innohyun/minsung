(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const key = 'marble-builder-custom-balls-v1';
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(key)) || []; } catch (_) { saved = []; }
  saved = Array.isArray(saved) ? saved.filter(b => b && typeof b.id === 'string' && typeof b.image === 'string' && b.image.startsWith('data:image/')).slice(0, 40) : [];
  const editor = $('ballEditor'), context = editor.getContext('2d');
  const wheel = $('colorWheel'), wheelContext = wheel.getContext('2d');
  const crop = $('photoCropCanvas'), cropContext = crop.getContext('2d');
  const imageCache = new Map();
  let currentIndex = saved.length, layers = [], working = false, tool = 'pencil', color = '#ff7100';
  let hue = 25;
  const undo = [], redo = [];
  const cloneLayers = () => JSON.parse(JSON.stringify(layers));
  function updateHistory() { $('workshopUndo').disabled = !working || !undo.length; $('workshopRedo').disabled = !working || !redo.length; }
  function rememberEdit() { undo.push(cloneLayers()); if (undo.length > 60) undo.shift(); redo.length = 0; updateHistory(); }
  $('workshopUndo').onclick = () => { if (!working || !undo.length) return; redo.push(cloneLayers()); layers = undo.pop(); drawing = null; paint(context, 512); updateHistory(); };
  $('workshopRedo').onclick = () => { if (!working || !redo.length) return; undo.push(cloneLayers()); layers = redo.pop(); drawing = null; paint(context, 512); updateHistory(); };
  let drawing = null, photo = null, photoX = 0, photoY = 0, photoScale = 1, movingPhoto = null;
  const persist = () => { try { localStorage.setItem(key, JSON.stringify(saved)); return true; } catch (_) { alert('저장 공간이 부족해요. 사진을 작게 선택하거나 오래된 공을 삭제해 주세요.'); return false; } };
  function getImage(id) {
    const ball = saved.find(item => item.id === id);
    if (!ball) return null;
    if (!imageCache.has(id) || imageCache.get(id).src !== ball.image) {
      const img = new Image(); img.src = ball.image; imageCache.set(id, img);
    }
    return imageCache.get(id);
  }
  const circle = (c, size) => { c.beginPath(); c.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); c.clip(); };
  function paint(c, size, items = layers) {
    c.clearRect(0, 0, size, size);
    c.save(); circle(c, size);
    c.fillStyle = '#fff'; c.fillRect(0, 0, size, size);
    for (const layer of items) {
      if (layer.kind === 'photo') {
        const img = getLayerImage(layer);
        if (img?.complete && img.naturalWidth) c.drawImage(img, layer.x * size, layer.y * size, layer.w * size, layer.h * size);
      } else if (layer.points?.length) {
        c.beginPath(); c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = layer.width * size;
        c.strokeStyle = layer.kind === 'erase' ? '#fff' : layer.color;
        c.moveTo(layer.points[0][0] * size, layer.points[0][1] * size);
        for (const [x, y] of layer.points.slice(1)) c.lineTo(x * size, y * size);
        if (layer.points.length === 1) c.lineTo(layer.points[0][0] * size + .01, layer.points[0][1] * size);
        c.stroke();
      }
    }
    c.restore();
  }
  const layerImages = new Map();
  function getLayerImage(layer) {
    if (!layerImages.has(layer.src)) { const img = new Image(); img.onload = () => paint(context, 512); img.src = layer.src; layerImages.set(layer.src, img); }
    return layerImages.get(layer.src);
  }
  function show(index) {
    currentIndex = Math.max(0, Math.min(saved.length, index));
    const record = saved[currentIndex];
    layers = record ? JSON.parse(JSON.stringify(record.layers || [])) : [];
    working = !record;
    undo.length = 0; redo.length = 0; updateHistory();
    $('workshopPosition').textContent = record ? `내 공 ${currentIndex + 1} / ${saved.length}` : '새 공';
    $('editBall').hidden = !record; $('deleteBall').hidden = !record;
    $('workshopSave').hidden = !working;
    paint(context, 512);
  }
  async function save() {
    if (!working) return;
    const images = layers.filter(layer => layer.kind === 'photo').map(getLayerImage);
    try { await Promise.all(images.map(img => img.decode())); }
    catch (_) { alert('사진을 아직 읽지 못했어요. 잠시 뒤 다시 저장해 주세요.'); return; }
    paint(context, 512);
    const record = saved[currentIndex];
    const value = { id: record?.id || `ball-${Date.now()}-${Math.random().toString(36).slice(2)}`, layers: JSON.parse(JSON.stringify(layers)), image: editor.toDataURL('image/png') };
    const previous = saved.slice();
    if (record) saved[currentIndex] = value; else saved.push(value);
    if (!persist()) { saved = previous; return; }
    imageCache.delete(value.id); show(saved.findIndex(item => item.id === value.id));
  }
  function close() { if (working && layers.length && !confirm('저장하지 않은 공을 버리고 홈으로 갈까요?')) return; $('ballWorkshop').hidden = true; }
  $('ballWorkshopButton').onclick = () => { show(saved.length); $('ballWorkshop').hidden = false; };
  $('workshopHome').onclick = close;
  $('workshopSave').onclick = save;
  $('editBall').onclick = () => { working = true; $('workshopSave').hidden = false; updateHistory(); };
  $('previousBall').onclick = () => { if (working && layers.length && !confirm('저장하지 않은 그림을 버리고 이동할까요?')) return; show(currentIndex - 1); };
  $('nextBall').onclick = () => { if (working && layers.length && !confirm('저장하지 않은 그림을 버리고 이동할까요?')) return; show(currentIndex + 1); };
  $('deleteBall').onclick = () => $('deleteBallDialog').showModal();
  $('cancelDeleteBall').onclick = () => $('deleteBallDialog').close();
  $('confirmDeleteBall').onclick = () => { const previous = saved.slice(); const [deleted] = saved.splice(currentIndex, 1); if (!persist()) saved = previous; else imageCache.delete(deleted.id); $('deleteBallDialog').close(); show(Math.min(currentIndex, saved.length)); };
  const chooseTool = name => { tool = name; working = true; $('workshopSave').hidden = false; updateHistory(); for (const [id, value] of [['pencilTool','pencil'],['pixelEraser','pixel'],['objectEraser','object']]) $(id).classList.toggle('active', name === value); };
  $('pencilTool').onclick = () => chooseTool('pencil');
  $('pixelEraser').onclick = () => chooseTool('pixel');
  $('objectEraser').onclick = () => chooseTool('object');
  chooseTool('pencil');
  const point = (event, el) => { const rect = el.getBoundingClientRect(); return [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height]; };
  const inside = ([x,y]) => (x - .5) ** 2 + (y - .5) ** 2 <= .25;
  editor.onpointerdown = event => {
    const pos = point(event, editor); if (!inside(pos)) return;
    if (!working) return;
    editor.setPointerCapture(event.pointerId);
    if (tool === 'object') {
      const hit = [...layers].reverse().findIndex(layer => layer.kind === 'photo' ? pos[0] >= layer.x && pos[0] <= layer.x + layer.w && pos[1] >= layer.y && pos[1] <= layer.y + layer.h : layer.points?.some(([x,y]) => Math.hypot(x-pos[0], y-pos[1]) < layer.width + .025));
      if (hit >= 0) { rememberEdit(); layers.splice(layers.length - 1 - hit, 1); paint(context, 512); }
      return;
    }
    rememberEdit();
    drawing = { kind: tool === 'pixel' ? 'erase' : 'stroke', color, width: Number($('brushSize').value) / 512, points: [pos] };
    layers.push(drawing); paint(context, 512);
  };
  editor.onpointermove = event => { if (!drawing || !editor.hasPointerCapture(event.pointerId)) return; const pos = point(event, editor); if (inside(pos)) { drawing.points.push(pos); paint(context, 512); } };
  editor.onpointerup = editor.onpointercancel = () => { drawing = null; };

  function updateColor() {
    const saturation = Number($('colorSaturation').value);
    const lightness = Number($('colorLightness').value);
    const boost = Number($('colorBoost').value) / 100;
    const opacity = Number($('colorOpacity').value) / 100;
    // Screen-compatible brightness boost; regular Canvas output is SDR.
    const boostedLightness = Math.min(95, lightness + (100 - lightness) * boost * .28);
    color = `hsla(${Math.round(hue)} ${saturation}% ${boostedLightness.toFixed(1)}% / ${opacity.toFixed(2)})`;
    $('pickedColor').style.background = color;
    wheelContext.clearRect(0, 0, 220, 220);
    for (let a = 0; a < 360; a++) { wheelContext.beginPath(); wheelContext.strokeStyle = `hsl(${a} 100% 50%)`; wheelContext.lineWidth = 36; wheelContext.arc(110, 110, 89, (a-1)*Math.PI/180, (a+1)*Math.PI/180); wheelContext.stroke(); }
    wheelContext.beginPath(); wheelContext.fillStyle = '#fff'; wheelContext.arc(110, 110, 62, 0, Math.PI*2); wheelContext.fill();
    const angle = hue * Math.PI / 180;
    wheelContext.beginPath(); wheelContext.arc(110 + 89*Math.cos(angle), 110 + 89*Math.sin(angle), 20, 0, Math.PI*2);
    wheelContext.fillStyle = `hsl(${Math.round(hue)} 100% 50%)`; wheelContext.fill();
    wheelContext.strokeStyle = '#fff'; wheelContext.lineWidth = 7; wheelContext.stroke();
  }
  function pick(event) { const [x,y] = point(event, wheel); const dx = x-.5, dy = y-.5; if (Math.hypot(dx,dy)<.23) return; hue = (Math.atan2(dy,dx)*180/Math.PI+360)%360; updateColor(); chooseTool('pencil'); }
  wheel.onpointerdown = e => { wheel.setPointerCapture(e.pointerId); pick(e); };
  wheel.onpointermove = e => { if (wheel.hasPointerCapture(e.pointerId)) pick(e); };
  for (const id of ['colorSaturation', 'colorLightness', 'colorOpacity', 'colorBoost']) $(id).oninput = updateColor;
  updateColor();
  $('addBallPhoto').onclick = () => { if (!working) chooseTool('pencil'); $('ballPhotoInput').click(); };
  $('ballPhotoInput').onchange = async e => {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file || !file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); photo = img; photoX = photoY = 0; photoScale = 1; $('photoZoom').value = '1'; paintCrop(); $('photoCropDialog').showModal(); };
    img.onerror = () => { URL.revokeObjectURL(url); alert('사진을 열 수 없어요.'); };
    img.src = url;
  };
  function paintCrop() {
    if (!photo) return;
    cropContext.clearRect(0,0,320,320); cropContext.save(); circle(cropContext,320);
    cropContext.fillStyle = '#fff'; cropContext.fillRect(0,0,320,320);
    const scale = Math.max(320/photo.width,320/photo.height)*photoScale;
    cropContext.drawImage(photo,160-photo.width*scale/2+photoX,160-photo.height*scale/2+photoY,photo.width*scale,photo.height*scale);
    cropContext.restore(); cropContext.lineWidth=3; cropContext.strokeStyle='#2674d9'; cropContext.beginPath(); cropContext.arc(160,160,158,0,Math.PI*2); cropContext.stroke();
  }
  crop.onpointerdown = e => { crop.setPointerCapture(e.pointerId); movingPhoto = [e.clientX,e.clientY]; };
  crop.onpointermove = e => { if (!movingPhoto) return; const r=crop.getBoundingClientRect(); photoX+=(e.clientX-movingPhoto[0])*320/r.width; photoY+=(e.clientY-movingPhoto[1])*320/r.height; movingPhoto=[e.clientX,e.clientY]; paintCrop(); };
  crop.onpointerup = crop.onpointercancel = () => { movingPhoto=null; };
  $('photoZoom').oninput = e => { photoScale=Number(e.target.value); paintCrop(); };
  $('cancelPhoto').onclick = () => { photo=null; $('photoCropDialog').close(); };
  $('applyPhoto').onclick = () => {
    if (!photo) return;
    const temp=document.createElement('canvas'); temp.width=temp.height=384; const c=temp.getContext('2d');
    const scale=Math.max(320/photo.width,320/photo.height)*photoScale*384/320;
    c.drawImage(photo,192-photo.width*scale/2+photoX*384/320,192-photo.height*scale/2+photoY*384/320,photo.width*scale,photo.height*scale);
    rememberEdit();
    layers.push({kind:'photo',src:temp.toDataURL('image/jpeg',.82),x:0,y:0,w:1,h:1});
    photo=null; $('photoCropDialog').close(); paint(context,512);
  };
  window.MarbleBalls = { list: () => saved.map(({id}) => id), getImage, has: id => saved.some(ball => ball.id === id) };
})();
