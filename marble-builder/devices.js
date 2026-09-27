// Punch and remotely mounted button. Only placed rods have runtime state.
(() => {
  'use strict';
  const states = new Map();
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const images = Object.fromEntries(['button', 'button-pressed', 'punch-body', 'punch-shaft', 'punch-head'].map(name => {
    const image = new Image();
    image.src = `/assets/marble-builder/devices/${name}.png?v=2`;
    return [name, image];
  }));
  function fresh() { return { down: false, depth: 0, phase: 'idle', hold: 0, travel: 0, hit: new Set() }; }
  function state(rod) {
    if (!rod.uid) return fresh();
    if (!states.has(rod.uid)) states.set(rod.uid, fresh());
    return states.get(rod.uid);
  }
  function reset() { states.clear(); }
  function isDevice(rod) { return rod?.type === 'punch'; }
  function button(rods, punch) {
    const anchor = punch.buttonAnchor;
    const wood = anchor && rods.find(rod => rod.uid === anchor.woodUid && rod.type === 'wood');
    if (!wood) return null;
    const c = Math.cos(wood.angle || 0), s = Math.sin(wood.angle || 0);
    const offset = clamp(Number(anchor.offset) || 0,
      -(anchor.side === 'left' || anchor.side === 'right' ? wood.thickness : wood.length) / 2,
      (anchor.side === 'left' || anchor.side === 'right' ? wood.thickness : wood.length) / 2);
    const side = anchor.side;
    const lx = side === 'left' ? -wood.length / 2 : side === 'right' ? wood.length / 2 : offset;
    const ly = side === 'top' ? -wood.thickness / 2 : side === 'bottom' ? wood.thickness / 2 : offset;
    const nx = side === 'left' ? -1 : side === 'right' ? 1 : 0;
    const ny = side === 'top' ? -1 : side === 'bottom' ? 1 : 0;
    const normal = { x: nx * c - ny * s, y: nx * s + ny * c };
    const face = { x: wood.x + lx * c - ly * s, y: wood.y + lx * s + ly * c };
    return { x: face.x + normal.x * 7, y: face.y + normal.y * 7,
      nx: normal.x, ny: normal.y, angle: Math.atan2(normal.x, -normal.y), woodUid: wood.uid };
  }
  function snap(rods, point) {
    let best = null;
    for (const wood of rods) {
      if (wood.type !== 'wood') continue;
      const c = Math.cos(wood.angle || 0), s = Math.sin(wood.angle || 0);
      const dx = point.x - wood.x, dy = point.y - wood.y;
      const x = dx * c + dy * s, y = -dx * s + dy * c;
      const faces = [
        { side: 'top', x: clamp(x, -wood.length / 2 + 17, wood.length / 2 - 17), y: -wood.thickness / 2 },
        { side: 'bottom', x: clamp(x, -wood.length / 2 + 17, wood.length / 2 - 17), y: wood.thickness / 2 },
        { side: 'left', x: -wood.length / 2, y: clamp(y, -wood.thickness / 2, wood.thickness / 2) },
        { side: 'right', x: wood.length / 2, y: clamp(y, -wood.thickness / 2, wood.thickness / 2) }
      ];
      for (const face of faces) {
        const dist = Math.hypot(x - face.x, y - face.y);
        if (dist < 42 && (!best || dist < best.distance)) best = {
          woodUid: wood.uid, side: face.side,
          offset: face.side === 'top' || face.side === 'bottom' ? face.x : face.y,
          distance: dist
        };
      }
    }
    return best && { woodUid: best.woodUid, side: best.side, offset: best.offset };
  }
  function pressure(ball, b) {
    if (ball.attachedMagnetUid || ball.attachedSwingUid) return 0;
    const dx = ball.x - b.x, dy = ball.y - b.y;
    const along = dx * b.nx + dy * b.ny + 7;
    const across = Math.abs(-dx * b.ny + dy * b.nx);
    // The red plate is 14px above the wood face; the marble touching the plate
    // (not merely the wooden support) actuates it. Follow the rotated face normal.
    return across < ball.radius + 17 && along > ball.radius / 2 && along <= ball.radius + 15
      ? clamp((ball.radius + 15 - along) / 2, 0, 1) : 0;
  }
  function closestRect(p, rod) {
    const c = Math.cos(rod.angle || 0), s = Math.sin(rod.angle || 0);
    const dx = p.x - rod.x, dy = p.y - rod.y;
    const x = clamp(dx * c + dy * s, -rod.length / 2, rod.length / 2);
    const y = clamp(-dx * s + dy * c, -rod.thickness / 2, rod.thickness / 2);
    return { x: rod.x + x * c - y * s, y: rod.y + x * s + y * c };
  }
  function closestSegment(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return { x: a.x + t * dx, y: a.y + t * dy };
  }
  function impulse(target, d, power, point) {
    if (target.radius) {
      if (target.attachedMagnetUid || target.attachedSwingUid || target.electricRide) return;
      const mass = Math.max(.08, target.mass || .18);
      target.vx += d.x * power / mass;
      target.vy += d.y * power / mass;
      target.omega = (target.omega || 0) + ((point.x - target.x) * d.y - (point.y - target.y) * d.x) * power / Math.max(1, target.radius * mass);
    } else if (target.type === 'rotor' || target.type === 'zipline') {
      window.MarbleKinetics.applyImpulse(target, point, d.x * power, d.y * power, 100);
    } else if (target.type === 'swing') {
      const rx = (point.x - target.x) / 100, ry = (point.y - target.y) / 100;
      const lever = Math.max(.15, target.length / 100);
      const inertia = Math.max(.05, .7 * lever * lever / 3);
      target.swingOmega = clamp((target.swingOmega || 0) + (rx * d.y - ry * d.x) * power / inertia, -16, 16);
      target.swingStarted = true;
    }
  }
  // The actual drawn striking face occupies [travel-3, travel+9] measured
  // from the muzzle, with half height .44*thickness. All contacts use it.
  function headRect(rod, travel) {
    const angle = rod.angle || 0;
    return { x: rod.x + Math.cos(angle) * (rod.length / 2 + travel + 3),
      y: rod.y + Math.sin(angle) * (rod.length / 2 + travel + 3),
      length: 12, thickness: rod.thickness * .88, angle };
  }
  function contact(rod, target, travel) {
    const head = headRect(rod, travel);
    if (Number.isFinite(target.x1) && Number.isFinite(target.y1)) {
      // These are the same visible capsule centerlines used to draw the basket.
      const length = Math.hypot(target.x2-target.x1,target.y2-target.y1);
      const samples = Math.max(1,Math.ceil(length));
      for (let i=0;i<=samples;i++) {
        const t=i/samples;
        const p={x:target.x1+(target.x2-target.x1)*t,y:target.y1+(target.y2-target.y1)*t};
        if (Math.hypot(p.x-closestRect(p,head).x,p.y-closestRect(p,head).y) <= target.thickness/2) return p;
      }
      return null;
    }
    if (target.radius || target.type === 'magnet') {
      const radius = target.radius || target.length / 2;
      const c = Math.cos(head.angle), s = Math.sin(head.angle);
      const dx = target.x - head.x, dy = target.y - head.y;
      const lx = dx*c + dy*s, ly = -dx*s + dy*c;
      const px = clamp(lx, -6, 6), py = clamp(ly, -head.thickness/2, head.thickness/2);
      if (Math.hypot(lx-px, ly-py) > radius) return null;
      return { x: head.x + px*c - py*s, y: head.y + px*s + py*c };
    }
    if (target.type === 'swing') {
      // The swing artwork extends UP from its pivot: rod to -length,
      // magnet at -length-23.5 and weight at the pivot. The old downward
      // segment tested the empty side and missed the pictured magnet entirely.
      const a=target.angle||0, c=Math.cos(a), s=Math.sin(a);
      for (const [ly,length,thickness] of [[-(target.length+5)/2,4,target.length+5],[-target.length-23.5,84,59],[-.5,27,31]]) {
        const part={x:target.x-s*ly,y:target.y+c*ly,length,thickness,angle:a};
        const hit=window.MarbleKinetics.contact(head,part);
        if (hit) return {x:hit.x,y:hit.y};
      }
      return null;
    }
    const hit = window.MarbleKinetics.contact(head, target);
    return hit ? { x: hit.x, y: hit.y } : null;
  }
  function tick(rods, balls, dt, pixels, onImpact, barriers = []) {
    for (const rod of rods) {
      if (!isDevice(rod)) continue;
      const st = state(rod), b = button(rods, rod);
      const press = b ? balls.reduce((max, ball) => Math.max(max, pressure(ball, b)), 0) : 0;
      st.depth += (press - st.depth) * Math.min(1, dt * 22);
      if (press > .15 && !st.down && st.phase === 'idle') { st.phase = 'out'; st.travel = 0; st.hit.clear(); }
      st.down = press > .15;
      if (st.phase === 'hold') {
        st.hold -= dt;
        if (st.hold <= 0) st.phase = 'back';
        continue;
      }
      if (st.phase === 'back') {
        st.travel = Math.max(0, st.travel - 160 * dt);
        if (!st.travel) st.phase = 'idle';
        continue;
      }
      if (st.phase !== 'out') continue;
      const d = { x: Math.cos(rod.angle || 0), y: Math.sin(rod.angle || 0) };
      const speed = clamp(Number(rod.force) || 7, 2, 20);
      const previous = st.travel;
      const end = Math.min(105, previous + speed * pixels * dt);
      const steps = Math.max(1, Math.ceil((end - previous) / 4));
      let blocked = false;
      for (let i = 1; i <= steps && !blocked; i++) {
        const travel = previous + (end - previous) * i / steps;
        // Sweep the exact visible head in <=4px increments. Refine the first
        // touching position to subpixel precision so walls never stop it early.
        for (const target of [...balls, ...rods, ...barriers]) {
          if (target === rod || target.type === 'breakable' && target.hp <= 0 || st.hit.has(target)) continue;
          const at = contact(rod, target, travel);
          if (!at) continue;
          st.hit.add(target);
          if (target.radius || ['swing', 'rotor', 'zipline'].includes(target.type)) {
            impulse(target, d, speed * .09, at);
            onImpact?.(rod, target, speed);
          }
          // A moving target receives momentum but must still stop the striking
          // face at the first contact; applying only an impulse lets it tunnel.
          {
            let lo = previous + (end - previous) * (i-1) / steps, hi = travel;
            for (let k = 0; k < 12; k++) {
              const mid = (lo+hi)/2;
              if (contact(rod, target, mid)) hi = mid;
              else lo = mid;
            }
            st.travel = Math.max(0, lo);
            blocked = true;
            onImpact?.(rod, target, speed);
            break;
          }
        }
        if (!blocked) st.travel = travel;
      }
      if (blocked || st.travel >= 105) { st.phase = 'hold'; st.hold = .05; }
    }
  }
  function resolveBox(ball, box) {
    const c = Math.cos(box.angle), s = Math.sin(box.angle);
    const dx = ball.x - box.x, dy = ball.y - box.y;
    const x = dx*c + dy*s, y = -dx*s + dy*c;
    const hx = box.length/2, hy = box.thickness/2;
    const px = clamp(x, -hx, hx), py = clamp(y, -hy, hy);
    let nx = x-px, ny = y-py, distance = Math.hypot(nx, ny);
    if (distance >= ball.radius) return false;
    if (distance < 1e-8) {
      const horizontal = hx - Math.abs(x), vertical = hy - Math.abs(y);
      if (horizontal < vertical) { nx = x >= 0 ? 1 : -1; ny = 0; distance = -horizontal; }
      else { nx = 0; ny = y >= 0 ? 1 : -1; distance = -vertical; }
    } else { nx /= distance; ny /= distance; }
    const wx = nx*c - ny*s, wy = nx*s + ny*c;
    ball.x += wx * (ball.radius - distance + .01);
    ball.y += wy * (ball.radius - distance + .01);
    const inward = ball.vx*wx + ball.vy*wy;
    if (inward < 0) { ball.vx -= inward*wx; ball.vy -= inward*wy; }
    return true;
  }
  function resolveBall(rods, ball) {
    if (!ball || ball.attachedMagnetUid || ball.attachedSwingUid || ball.electricRide) return;
    for (const rod of rods) {
      if (!isDevice(rod)) continue;
      const st = state(rod), angle = rod.angle || 0;
      if (st.travel > 0) {
        const x = rod.x + Math.cos(angle) * (rod.length/2 + (st.travel-3)/2);
        const y = rod.y + Math.sin(angle) * (rod.length/2 + (st.travel-3)/2);
        if (st.travel > 3) resolveBox(ball, { x,y,angle,length:st.travel-3,thickness:10 });
      }
      resolveBox(ball, headRect(rod, st.travel));
      const b = button(rods, rod);
      if (b) {
        const height = 14 - st.depth*8;
        resolveBox(ball, { x:b.x + b.nx*(height/2-7), y:b.y + b.ny*(height/2-7),
          angle:b.angle,length:34,thickness:height });
      }
    }
  }
  function drawImage(ctx, name, x, y, w, h) {
    const img = images[name];
    if (img.complete && img.naturalWidth) ctx.drawImage(img, x, y, w, h);
    else { ctx.fillStyle = name === 'button' ? '#e53120' : '#4d637a'; ctx.fillRect(x, y, w, h); }
  }
  function draw(ctx, rod, alpha = 1) {
    const st = state(rod);
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(rod.x, rod.y); ctx.rotate(rod.angle || 0);
    drawImage(ctx, 'punch-body', -rod.length / 2, -rod.thickness / 2, rod.length, rod.thickness);
    if (st.travel > 0) drawImage(ctx, 'punch-shaft', rod.length / 2, -5, st.travel, 10);
    drawImage(ctx, 'punch-head', rod.length / 2 + st.travel - 3, -rod.thickness * .44, 12, rod.thickness * .88);
    ctx.restore();
  }
  function drawButton(ctx, rods, rod, alpha = 1) {
    const b = button(rods, rod);
    if (!b) return;
    const st = state(rod);
    ctx.save(); ctx.globalAlpha *= alpha;
    const height = 14 - st.depth*8;
    ctx.translate(b.x + b.nx * (height/2-7), b.y + b.ny * (height/2-7));
    ctx.rotate(b.angle);
    drawImage(ctx, st.depth > .55 ? 'button-pressed' : 'button', -17, -height/2, 34, height);
    ctx.restore();
  }
  window.MarbleDevices = { isDevice, state, reset, button, snap, pressure, contact, resolveBall, tick, draw, drawButton, images };
})();
