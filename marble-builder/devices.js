// Punch and remotely mounted button. Only placed rods have runtime state.
(() => {
  'use strict';
  const states = new Map();
  let swingMagnetContact = () => false;
  function setSwingMagnetContact(test) { swingMagnetContact = test; }
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const images = Object.fromEntries(['button', 'button-pressed', 'punch-body', 'punch-shaft', 'punch-head'].map(name => {
    const image = new Image();
    image.src = `/assets/marble-builder/devices/${name}.png?v=2`;
    return [name, image];
  }));
  for (const [name, file] of Object.entries({ 'robot-body': 'robot-body.png', 'robot-hose': 'robot-hose-tile.png' })) {
    const image = new Image(); image.src = `/assets/marble-builder/robot-arm/${file}?v=1`; images[name] = image;
  }
  function fresh() { return { down: false, depth: 0, phase: 'idle', hold: 0, travel: 0, hit: new Set() }; }
  function state(rod) {
    if (!rod.uid) return fresh();
    if (!states.has(rod.uid)) states.set(rod.uid, fresh());
    return states.get(rod.uid);
  }
  function reset() { states.clear(); }
  function isDevice(rod) { return rod?.type === 'punch' || rod?.type === 'robotArm'; }
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
      // Match the opaque magnet art, not its transparent rectangular mouth.
      const a=target.angle||0, c=Math.cos(a), s=Math.sin(a);
      if (swingMagnetContact(target,head)) return {x:head.x+c*6,y:head.y+s*6};
      for (const [ly,length,thickness] of [[-(target.length+5)/2,4,target.length+5],[-.5,27,31]]) {
        const part={x:target.x-s*ly,y:target.y+c*ly,length,thickness,angle:a};
        const hit=window.MarbleKinetics.contact(head,part);
        if (hit) return {x:hit.x,y:hit.y};
      }
      return null;
    }
    const hit = window.MarbleKinetics.contact(head, target);
    return hit ? { x: hit.x, y: hit.y } : null;
  }
  function tick(rods, balls, dt, pixels, onImpact, barriers = [], gravity = 19.35, boundary = 1000) {
    for (const rod of rods) {
      if (!isDevice(rod)) continue;
      const st = state(rod), b = button(rods, rod);
      const press = b ? balls.reduce((max, ball) => Math.max(max, pressure(ball, b)), 0) : 0;
      st.depth += (press - st.depth) * Math.min(1, dt * 22);
      if (press > .15 && !st.down && st.phase === 'idle') { st.phase = 'out'; st.travel = 0; st.hit.clear(); }
      st.down = press > .15;
      if (rod.type === 'robotArm') { tickRobot(rod, st, balls, dt, pixels, rods, gravity, boundary); continue; }
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
  const HOSE_STEP = 12, HOSE_WIDTH = 16;
  function muzzle(rod) {
    const angle = rod.angle || 0;
    return { x: rod.x + Math.cos(angle) * rod.length / 2,
      y: rod.y + Math.sin(angle) * rod.length / 2 };
  }
  function robotContact(target, tip) {
    if (target.radius || target.type === 'magnet' || target.type === 'fixedBall') {
      const radius = target.radius || target.length / 2;
      const distance = Math.hypot(target.x - tip.x, target.y - tip.y);
      return distance <= radius + HOSE_WIDTH / 2 + 3 && distance > .001
        ? {x:target.x+(tip.x-target.x)*radius/distance,
          y:target.y+(tip.y-target.y)*radius/distance,
          nx:(tip.x-target.x)/distance,ny:(tip.y-target.y)/distance} : null;
    }
    if (target.type === 'swing') {
      // Use the physical shaft and the visible magnetic mouth, not its dotted orbit.
      const a = target.angle || 0, c = Math.cos(a), s = Math.sin(a);
      const shaft = closestSegment(tip, {x:target.x,y:target.y},
        {x:target.x + s * (target.length + 5), y:target.y - c * (target.length + 5)});
      const mouth = {x:target.x + s * (target.length + 5),y:target.y - c * (target.length + 5)};
      if (Math.hypot(tip.x-shaft.x,tip.y-shaft.y) <= HOSE_WIDTH/2 + 5
        || Math.hypot(tip.x-mouth.x,tip.y-mouth.y) <= 22) {
        const dx=tip.x-shaft.x,dy=tip.y-shaft.y,d=Math.hypot(dx,dy)||1;
        return {x:shaft.x,y:shaft.y,nx:dx/d,ny:dy/d};
      }
      return null;
    }
    if (target.type === 'breakable' && target.hp <= 0) return null;
    const near = closestRect(tip, target);
    const dx=tip.x-near.x,dy=tip.y-near.y,d=Math.hypot(dx,dy);
    return d<=HOSE_WIDTH/2+3 ? {...near,nx:d>.001?dx/d:Math.cos(target.angle||0),
      ny:d>.001?dy/d:Math.sin(target.angle||0)} : null;
  }
  // Preview and the launched hand share an identical fixed-step projectile.
  function advanceHead(head,gravity,pixels,dt) {
    head.vy+=gravity*dt;
    head.x+=head.vx*pixels*dt;head.y+=head.vy*pixels*dt;
  }
  function robotPath(rod, targets, gravity, pixels, boundary) {
    const base=muzzle(rod), dir={x:Math.cos(rod.angle||0),y:Math.sin(rod.angle||0)};
    const head={x:base.x,y:base.y,vx:dir.x*clamp(Number(rod.force)||7,2,20)*.55,
      vy:dir.y*clamp(Number(rod.force)||7,2,20)*.55};
    const points=[{x:head.x,y:head.y}];
    for(let i=0;i<720;i++) {
      advanceHead(head,gravity,pixels,1/120);
      const {x,y}=head;
      if(i%6===0) points.push({x,y});
      if(i>2 && targets.some(target=>target!==rod
        && !(target.type==='wood' && Math.hypot(target.x-base.x,target.y-base.y)<target.length/2+18
          && Math.hypot(x-base.x,y-base.y)<24)
        && robotContact(target,{x,y})))
        return {points,hit:true};
      if(Math.hypot(x-base.x,y-base.y)>boundary) return {points,hit:false};
    }
    return {points,hit:false};
  }
  function releaseRobot(st) {
    st.grabbed = null; st.grabPoint = null; st.handNormal = null;
  }
  function hoseOutside(node, target, radius) {
    if(target.type==='antigravity'||target.type==='fixedBall') return;
    if(target.radius || target.type==='magnet') {
      const r=(target.radius||target.length/2)+radius;
      const dx=node.x-target.x,dy=node.y-target.y,d=Math.hypot(dx,dy);
      if(d<r && d>.001) {node.x=target.x+dx/d*r;node.y=target.y+dy/d*r;}
      return;
    }
    if(!target.length||!target.thickness || Math.hypot(node.x-target.x,node.y-target.y)
      >target.length/2+target.thickness/2+radius+16) return;
    const c=Math.cos(target.angle||0),s=Math.sin(target.angle||0);
    const dx=node.x-target.x,dy=node.y-target.y,x=dx*c+dy*s,y=-dx*s+dy*c;
    const hx=target.length/2,hy=target.thickness/2;
    const cx=clamp(x,-hx,hx),cy=clamp(y,-hy,hy);
    let px=x-cx,py=y-cy,d=Math.hypot(px,py);
    if(d>=radius) return;
    if(d<.001) {
      const sideX=hx-Math.abs(x),sideY=hy-Math.abs(y);
      if(sideX<sideY) {px=x>=0?1:-1;py=0;d=-sideX;}
      else {px=0;py=y>=0?1:-1;d=-sideY;}
    } else {px/=d;py/=d;}
    const outX=x+px*(radius-d+.02),outY=y+py*(radius-d+.02);
    node.x=target.x+outX*c-outY*s;node.y=target.y+outX*s+outY*c;
  }
  function tickRobot(rod, st, balls, dt, pixels, rods, gravity, boundary) {
    const base=muzzle(rod), direction={x:Math.cos(rod.angle||0),y:Math.sin(rod.angle||0)};
    if(st.phase === 'idle' && !st.travel) { st.links=null; st.head=null; releaseRobot(st); return; }
    if(!st.links) {
      st.links=[{x:base.x,y:base.y,px:base.x,py:base.y},
        {x:base.x,y:base.y,px:base.x-direction.x*clamp(Number(rod.force)||7,2,20)*.55*pixels*dt,
          py:base.y-direction.y*clamp(Number(rod.force)||7,2,20)*.55*pixels*dt}];
      st.head={x:base.x,y:base.y,vx:direction.x*clamp(Number(rod.force)||7,2,20)*.55,
        vy:direction.y*clamp(Number(rod.force)||7,2,20)*.55};
    }
    if(st.phase==='out') {
      const oldX=st.head.x,oldY=st.head.y;
      advanceHead(st.head,gravity,pixels,dt);
      st.travel+=Math.hypot(st.head.x-oldX,st.head.y-oldY)+.2;
    }
    if(st.phase==='hold') {
      st.hold-=dt;
      const target=st.grabbed,p=st.grabPoint;
      const c=Math.cos(target?.angle||0),s=Math.sin(target?.angle||0);
      const grip=target&&p ? {x:target.x+p.x*c-p.y*s,y:target.y+p.x*s+p.y*c} : base;
      st.travel=Math.max(Math.hypot(grip.x-base.x,grip.y-base.y),st.travel-190*dt);
      if(st.hold<=0) { st.head={x:grip.x,y:grip.y}; releaseRobot(st); st.phase='back'; }
    }
    if(st.phase==='back') {
      st.travel=Math.max(0,st.travel-190*dt);
      if(!st.travel) {st.phase='idle';st.links=null;st.head=null;return;}
      const dx=st.head.x-base.x,dy=st.head.y-base.y,d=Math.hypot(dx,dy);
      const next=Math.min(st.travel,Math.max(0,d-190*dt));
      if(d>.001) {st.head.x=base.x+dx/d*next;st.head.y=base.y+dy/d*next;}
      else {st.head.x=base.x;st.head.y=base.y;}
    }
    // New hose sections are fed from the flat body. No texture or black joint is stretched.
    while(st.links.length-1 < Math.ceil(st.travel/HOSE_STEP)) {
      const first=st.links[1];
      st.links.splice(1,0,{x:base.x+(first.x-base.x)*.35,y:base.y+(first.y-base.y)*.35,
        px:base.x+(first.px-base.x)*.35,py:base.y+(first.py-base.y)*.35});
    }
    while(st.links.length>2 && st.links.length-2 >= Math.ceil(st.travel/HOSE_STEP)) st.links.splice(1,1);
    st.links[0].x=st.links[0].px=base.x; st.links[0].y=st.links[0].py=base.y;
    const segment=st.travel/(st.links.length-1);
    for(let i=1;i<st.links.length;i++) {
      const link=st.links[i],vx=(link.x-link.px)*.996,vy=(link.y-link.py)*.996;
      link.px=link.x;link.py=link.y;
      link.x+=vx;link.y+=vy+gravity*pixels*dt*dt;
    }
    if(st.phase==='out'||st.phase==='back') {const end=st.links.at(-1);end.x=st.head.x;end.y=st.head.y;}
    for(let iteration=0;iteration<6;iteration++) {
      for(let i=1;i<st.links.length-1;i++) {
        const a=st.links[i-1],b=st.links[i];
        for(const other of rods) {
          if(other===rod || (other===st.grabbed && i>=st.links.length-2)
            || (other.type==='wood' && i<=2 && Math.hypot(other.x-base.x,other.y-base.y)<other.length/2+18)) continue;
          hoseOutside(b,other,HOSE_WIDTH/2);
          if(i>1) {
            const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,mid={x:mx,y:my};
            hoseOutside(mid,other,HOSE_WIDTH/2);
            const dx=clamp(mid.x-mx,-8,8),dy=clamp(mid.y-my,-8,8);
            a.x+=dx;b.x+=dx;a.y+=dy;b.y+=dy;
          }
        }
      }
      for(let i=1;i<st.links.length;i++) {
        const a=st.links[i-1],b=st.links[i];
        const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);
        if(d<=segment || d<.001) continue;
        const excess=(d-segment)/d;
        if(i===1) {b.x-=dx*excess;b.y-=dy*excess;}
        else {a.x+=dx*excess*.5;a.y+=dy*excess*.5;b.x-=dx*excess*.5;b.y-=dy*excess*.5;}
      }
      if(st.phase==='out'||st.phase==='back') {
        const end=st.links.at(-1);end.x=st.head.x;end.y=st.head.y;
        for(let i=st.links.length-1;i>1;i--) {
          const a=st.links[i-1],b=st.links[i],dx=a.x-b.x,dy=a.y-b.y,d=Math.hypot(dx,dy);
          if(d>segment && d>.001) {a.x=b.x+dx/d*segment;a.y=b.y+dy/d*segment;}
        }
      }
    }
    if(st.links.length>2) {
      const first=st.links[1],reach=Math.min(HOSE_STEP,st.travel);
      first.x=base.x+direction.x*reach;first.y=base.y+direction.y*reach;
      first.px=first.x;first.py=first.y;
    }
    const tip=st.links.at(-1);
    if(st.grabbed && !balls.includes(st.grabbed) && !rods.includes(st.grabbed)) releaseRobot(st);
    if(st.phase==='out' && st.travel>12) {
      for(const target of [...balls,...rods]) {
        if(target===rod || target.type==='fixedBall' || target.type==='antigravity'
          || target.attachedRobotUid || target.attachedMagnetUid || target.attachedSwingUid) continue;
        if(target.type==='wood' && Math.hypot(target.x-base.x,target.y-base.y)<target.length/2+18
          && Math.hypot(tip.x-base.x,tip.y-base.y)<24) continue;
        const point=robotContact(target,tip);
        if(!point) continue;
        const angle=target.angle||0,c=Math.cos(angle),s=Math.sin(angle);
        st.grabbed=target;
        st.grabPoint={x:(point.x-target.x)*c+(point.y-target.y)*s,
          y:-(point.x-target.x)*s+(point.y-target.y)*c};
        st.handNormal={x:point.nx*c+point.ny*s,y:-point.nx*s+point.ny*c};
        st.phase='hold';st.hold=clamp(Number(rod.holdSeconds)||2,.1,30);
        break;
      }
    }
    if(st.grabbed) {
      const target=st.grabbed,p=st.grabPoint,c=Math.cos(target.angle||0),s=Math.sin(target.angle||0);
      const contact={x:target.x+p.x*c-p.y*s,y:target.y+p.x*s+p.y*c};
      const rx=contact.x-base.x,ry=contact.y-base.y,d=Math.hypot(rx,ry)||1;
      const tension=st.travel<=d+4 ? 24 : 0;
      const impulse=tension*dt;
      if(target.radius) {
        const m=Math.max(.08,target.mass||.18);
        target.vx-=rx/d*impulse/m;target.vy-=ry/d*impulse/m;
      } else if(target.type==='rotor'||target.type==='zipline') {
        const mass=Math.max(.15,target.length*target.thickness/3600*.7);
        window.MarbleKinetics.applyImpulse(target,{x:target.x,y:target.y},0,mass*gravity*dt,pixels);
        window.MarbleKinetics.applyImpulse(target,contact,-rx/d*impulse,-ry/d*impulse,pixels);
      } else if(target.type==='swing') {
        const leverX=(contact.x-target.x)/pixels,leverY=(contact.y-target.y)/pixels;
        const inertia=Math.max(.05,.7*(target.length/pixels)**2/3);
        target.swingOmega=clamp((target.swingOmega||0)+(leverX*(-ry/d)-leverY*(-rx/d))*impulse/inertia,-16,16);
        target.swingStarted=true;
      }
      // A joint follows its actual contact; target velocity is never overwritten.
      tip.x=contact.x;tip.y=contact.y;
      const localNormal=st.handNormal || {x:1,y:0};
      const normal={x:localNormal.x*c-localNormal.y*s,
        y:localNormal.x*s+localNormal.y*c};
      if(st.links.length>2) {
        const before=st.links.at(-2);
        before.x=contact.x+normal.x*Math.min(HOSE_STEP,st.travel/(st.links.length-1));
        before.y=contact.y+normal.y*Math.min(HOSE_STEP,st.travel/(st.links.length-1));
      }
    } else if(st.phase==='out' && Math.hypot(tip.x-base.x,tip.y-base.y)>boundary) {
      st.phase='back';
    }
  }
  function resolveBox(ball, box, friction = 0) {
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
    if(friction) {
      const tx=-wy,ty=wx,tangent=ball.vx*tx+ball.vy*ty;
      ball.vx-=tx*tangent*friction;ball.vy-=ty*tangent*friction;
    }
    return true;
  }
  function resolveBall(rods, ball) {
    if (!ball || ball.attachedMagnetUid || ball.attachedSwingUid || ball.electricRide) return;
    for (const rod of rods) {
      if (!isDevice(rod)) continue;
      const st = state(rod), angle = rod.angle || 0;
      if (rod.type === 'punch' && st.travel > 0) {
        const x = rod.x + Math.cos(angle) * (rod.length/2 + (st.travel-3)/2);
        const y = rod.y + Math.sin(angle) * (rod.length/2 + (st.travel-3)/2);
        if (st.travel > 3) resolveBox(ball, { x,y,angle,length:st.travel-3,thickness:10 });
      }
      if (rod.type === 'punch') resolveBox(ball, headRect(rod, st.travel));
      if (rod.type === 'robotArm' && st.travel > 1 && st.grabbed !== ball && st.links) {
        for (let i = 1; i < st.links.length; i++) {
          const a = st.links[i-1], b = st.links[i], length = Math.hypot(b.x-a.x,b.y-a.y);
          if (length > .3) resolveBox(ball,{x:(a.x+b.x)/2,y:(a.y+b.y)/2,
            angle:Math.atan2(b.y-a.y,b.x-a.x),length,thickness:HOSE_WIDTH},.05);
        }
      }
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
    if (rod.type === 'robotArm') {
      const body = images['robot-body'], tile = images['robot-hose'];
      ctx.save(); ctx.globalAlpha *= alpha;
      ctx.translate(rod.x, rod.y); ctx.rotate(rod.angle || 0);
      if (body.complete && body.naturalWidth) ctx.drawImage(body, -rod.length/2, -rod.thickness/2, rod.length, rod.thickness);
      else { ctx.fillStyle = '#405a73'; ctx.fillRect(-rod.length/2, -rod.thickness/2, rod.length, rod.thickness); }
      ctx.restore();
      if (st.links && st.travel > 1) {
        for (let i = 1; i < st.links.length; i++) {
          const a = st.links[i-1], b = st.links[i], length = Math.hypot(b.x-a.x, b.y-a.y);
          if (length < .3) continue;
          ctx.save(); ctx.globalAlpha *= alpha;
          ctx.translate(a.x,a.y); ctx.rotate(Math.atan2(b.y-a.y,b.x-a.x)-Math.PI/2);
          if (tile.complete && tile.naturalWidth) {
            // Repeat a single corrugation at fixed scale, never stretch the full hose.
            for(let at=0;at<length;at+=HOSE_STEP) {
              const piece=Math.min(HOSE_STEP,length-at);
              ctx.drawImage(tile,0,21,tile.naturalWidth,15*piece/HOSE_STEP,
                -HOSE_WIDTH/2,at,HOSE_WIDTH,piece+.4);
            }
          } else { ctx.fillStyle = '#79818a'; ctx.fillRect(-HOSE_WIDTH/2, 0, HOSE_WIDTH, length + 1); }
          ctx.restore();
        }
        const tip = st.links.at(-1);
        ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(tip.x,tip.y);
        const before=st.links.at(-2);
        const n=st.handNormal, a=st.grabbed?.angle||0;
        ctx.rotate(n&&st.grabbed ? Math.atan2(n.x*Math.sin(a)+n.y*Math.cos(a),
          n.x*Math.cos(a)-n.y*Math.sin(a)) : Math.atan2(tip.y-before.y,tip.x-before.x));
        ctx.strokeStyle = '#999da2'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath();
        if (st.grabbed?.radius || st.grabbed?.type==='magnet') {
          ctx.moveTo(0,-6);ctx.lineTo(2,-4);ctx.lineTo(2,4);ctx.lineTo(0,6);
        } else { ctx.moveTo(0,-6); ctx.lineTo(0,6); }
        ctx.stroke(); ctx.restore();
      }
      return;
    }
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
  window.MarbleDevices = { isDevice, state, reset, button, snap, pressure, contact, resolveBall, tick, draw, drawButton, images, setSwingMagnetContact, robotPath, robotContact, muzzle };
})();
