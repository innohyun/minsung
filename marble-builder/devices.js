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
  // The guide and the real harpoon use the same accelerating, gravity-free step.
  function advanceHead(head,force,pixels,dt) {
    head.speed=Math.min(Math.max(18,force*3),head.speed+Math.max(22,force*5)*dt);
    head.travel+=head.speed*pixels*dt;
    head.x=head.base.x+head.dir.x*head.travel;
    head.y=head.base.y+head.dir.y*head.travel;
  }
  function robotPath(rod,targets,gravity,pixels,boundary) {
    const base=muzzle(rod),dir={x:Math.cos(rod.angle||0),y:Math.sin(rod.angle||0)};
    const force=clamp(Number(rod.force)||7,2,20);
    const head={base,dir,x:base.x,y:base.y,travel:0,speed:force*.7};
    const points=[{x:base.x,y:base.y}];
    // Preview only the visible distance, regardless of the map's reset circle.
    // The launched hand itself has no artificial travel limit.
    for(let i=0;i<20000 && head.travel<=boundary;i++) {
      const old=head.travel;
      advanceHead(head,force,pixels,1/120);
      const steps=Math.max(1,Math.ceil((head.travel-old)/3));
      for(let k=1;k<=steps;k++) {
        const distance=old+(head.travel-old)*k/steps;
        const tip={x:base.x+dir.x*distance,y:base.y+dir.y*distance};
        if(distance>12 && targets.some(target=>target!==rod && target.type!=='fixedBall'
          && target.type!=='antigravity' && !(target.type==='breakable' && target.hp<=0)
          && !(target.type==='wood' && distance<24 && Math.hypot(target.x-base.x,target.y-base.y)<target.length/2+18)
          && robotContact(target,tip))) { points.push(tip);return {points,hit:true}; }
      }
      if(i%6===0) points.push({x:head.x,y:head.y});
    }
    points.push({x:base.x+dir.x*boundary,y:base.y+dir.y*boundary});
    return {points,hit:false};
  }
  function releaseRobot(st) {
    if(st.grabbed?.radius) st.grabbed.attachedRobotUid=null;
    st.grabbed = null; st.grabPoint = null; st.handNormal = null; st.tension=0;
  }
  // Straight corrugations: feed complete tiles through the flat housing, not
  // an elastic image. Only the hand and the object move; the rope has no gravity.
  function straightLinks(st,base,dir,length,tip) {
    // Keep collision geometry bounded on a flight through empty infinite space.
    const count=Math.max(2,Math.min(1025,Math.ceil(length/HOSE_STEP)+1));
    st.links=Array.from({length:count},(_,i)=>{
      const d=length*i/(count-1);
      return {x:base.x+dir.x*d,y:base.y+dir.y*d};
    });
    if(tip) st.links.at(-1).x=tip.x,st.links.at(-1).y=tip.y;
  }
  function tickRobot(rod,st,balls,dt,pixels,rods,gravity,boundary) {
    const base=muzzle(rod),dir={x:Math.cos(rod.angle||0),y:Math.sin(rod.angle||0)};
    const force=clamp(Number(rod.force)||7,2,20);
    const reel=clamp(Number(rod.reelSpeed)||1.9,.2,8)*pixels;
    if(st.phase==='idle') {st.travel=0;st.links=null;st.head=null;st.returnDir=null;releaseRobot(st);return;}
    if(st.phase==='out') {
      if(!st.head) st.head={base,dir,x:base.x,y:base.y,travel:0,speed:force*.7};
      const old=st.travel;
      advanceHead(st.head,force,pixels,dt);
      let struck=false;
      const steps=Math.max(1,Math.ceil((st.head.travel-old)/3));
      for(let k=1;k<=steps && !struck;k++) {
        const distance=old+(st.head.travel-old)*k/steps;
        const tip={x:base.x+dir.x*distance,y:base.y+dir.y*distance};
        for(const target of [...balls,...rods]) {
          if(target===rod||target.type==='fixedBall'||target.type==='antigravity'
            || target.type==='breakable' && target.hp<=0
            || target.attachedRobotUid||target.attachedMagnetUid||target.attachedSwingUid) continue;
          if(target.type==='wood' && distance<24 && Math.hypot(target.x-base.x,target.y-base.y)<target.length/2+18) continue;
          const point=robotContact(target,tip);
          if(!point) continue;
          const a=target.radius?0:target.angle||0,c=Math.cos(a),s=Math.sin(a);
          st.grabbed=target;
          st.grabPoint={x:(point.x-target.x)*c+(point.y-target.y)*s,
            y:-(point.x-target.x)*s+(point.y-target.y)*c};
          st.handNormal={x:point.nx*c+point.ny*s,y:-point.nx*s+point.ny*c};
          st.phase='hold';st.hold=clamp(Number(rod.holdSeconds)||2,.1,30);
          st.travel=Math.max(0,(point.x-base.x)*dir.x+(point.y-base.y)*dir.y);
          st.head.x=point.x;st.head.y=point.y;
          st.lastGripDistance=st.travel;st.stall=0;
          if(target.radius) {target.attachedRobotUid=rod.uid;target.vx=0;target.vy=0;}
          struck=true;break;
        }
      }
      if(!struck) {
        st.travel=st.head.travel;
        // No texture-length or map-boundary limit on the straight launch.
      }
    }
    if(st.phase==='hold') {
      const target=st.grabbed;
      if(!target || !balls.includes(target) && !rods.includes(target)) {
        // If a grabbed body disappears, reel from the visible hand position.
        const span=Math.hypot(st.head.x-base.x,st.head.y-base.y);
        st.returnDir=span>1e-6?{x:(st.head.x-base.x)/span,y:(st.head.y-base.y)/span}:dir;
        st.travel=span;
        releaseRobot(st);st.phase='back';
      } else {
        st.hold=Math.max(0,st.hold-dt);
        const a=target.radius?0:target.angle||0,c=Math.cos(a),s=Math.sin(a),p=st.grabPoint;
        const grip={x:target.x+p.x*c-p.y*s,y:target.y+p.x*s+p.y*c};
        if(st.hold===0) {
          // Stop pulling on the expiration tick, including constrained bodies.
          st.head.x=grip.x;st.head.y=grip.y;
          const span=Math.hypot(st.head.x-base.x,st.head.y-base.y);
          st.returnDir=span>1e-6?{x:(st.head.x-base.x)/span,y:(st.head.y-base.y)/span}:dir;
          st.travel=span;
          releaseRobot(st);st.phase='back';
        } else {
        const distance=Math.hypot(grip.x-base.x,grip.y-base.y);
        const fixed=target.type==='wood'||target.type==='breakable'||target.type==='magnet'||target.type==='robotArm'||target.type==='punch';
        const minimum=target.radius?target.radius+HOSE_WIDTH+8:0;
        // The drum cannot shorten through an immovable obstacle or past the
        // constrained body's actual position. Eight pixels of cable compliance
        // are enough to build tension without allowing visible penetration.
        st.travel=Math.max(minimum,fixed?distance:Math.max(distance-8,st.travel-reel*dt));
        const shortening=st.lastGripDistance-distance;
        if(!fixed && (target.type==='rotor'||target.type==='zipline'||target.type==='swing')) {
          st.stall=shortening>.08?0:(st.stall||0)+dt;
          if(st.stall>.25) st.travel=Math.max(st.travel,distance);
        }
        st.lastGripDistance=distance;
        const nx=(grip.x-base.x)/(distance||1),ny=(grip.y-base.y)/(distance||1);
        const error=Math.max(0,distance-st.travel);
        if(target.radius) {
          // While suction holds a marble, the motor owns its movement. World
          // gravity resumes on release; no spring/ballistic orbit can form.
          const next=Math.max(minimum,Math.min(distance,st.travel));
          const contact={x:base.x+nx*next,y:base.y+ny*next};
          target.x=contact.x-p.x;target.y=contact.y-p.y;
          target.vx=-nx*Math.min(reel/pixels,(distance-next)/pixels/Math.max(dt,1e-6));
          target.vy=-ny*Math.min(reel/pixels,(distance-next)/pixels/Math.max(dt,1e-6));
        } else if(error>.01 && !fixed) {
          const power=clamp(8+error*.9,8,38)*dt;
          if(target.type==='rotor'||target.type==='zipline')
            window.MarbleKinetics.applyImpulse(target,grip,-nx*power,-ny*power,pixels);
          else if(target.type==='swing') {
            const armX=(grip.x-target.x)/pixels,armY=(grip.y-target.y)/pixels;
            const inertia=Math.max(.05,.7*(target.length/pixels)**2/3);
            target.swingOmega=clamp((target.swingOmega||0)+(armY*nx-armX*ny)*power/inertia,-16,16);
            target.swingStarted=true;
          }
        }
        if(target.radius) {grip.x=target.x+p.x;grip.y=target.y+p.y;}
        st.head.x=grip.x;st.head.y=grip.y;
        }
      }
    }
    if(st.phase==='back') {
      st.travel=Math.max(0,st.travel-reel*dt);
      if(st.travel<=0) {st.phase='idle';st.head=null;st.links=null;return;}
      const returnDir=st.returnDir||dir;
      st.head={x:base.x+returnDir.x*st.travel,y:base.y+returnDir.y*st.travel};
    }
    const span=st.phase==='hold' ? Math.hypot(st.head.x-base.x,st.head.y-base.y) : st.travel;
    const line=st.phase==='hold' && span>0 ? {x:(st.head.x-base.x)/span,y:(st.head.y-base.y)/span}
      : st.phase==='back'&&st.returnDir ? st.returnDir : dir;
    straightLinks(st,base,line,span);
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
    if(friction && typeof friction === 'object') {
      // Same contact-normal, tangential Coulomb and rolling model as wood.
      // The hose's segment angle supplies the actual surface normal.
      const mass=Math.max(.08,ball.mass||.18),radius=ball.radius/(friction.pixels||100);
      const tx=-wy,ty=wx,spinInertia=Math.max(.0001,.5*mass*radius*radius);
      const crossT=-radius;
      const relative=ball.vx*tx+ball.vy*ty+(ball.omega||0)*crossT;
      const impulse=Math.max(0,-inward)*mass;
      const support=mass*(friction.gravity||0)*(friction.dt||0)*Math.max(0,-wy);
      const amount=clamp(-relative/(1/mass+crossT*crossT/spinInertia),
        -friction.friction*(impulse+support),friction.friction*(impulse+support));
      ball.vx+=tx*amount/mass;ball.vy+=ty*amount/mass;
      ball.omega=(ball.omega||0)+crossT*amount/spinInertia;
      if(support && friction.rollingResistance) {
        const slow=clamp(ball.vx*tx+ball.vy*ty,
          -(friction.gravity||0)*friction.rollingResistance*friction.dt,
          (friction.gravity||0)*friction.rollingResistance*friction.dt);
        ball.vx-=tx*slow;ball.vy-=ty*slow;
        ball.omega*=Math.exp(-friction.rollingResistance*12*friction.dt);
      }
    } else if(friction) {
      const tx=-wy,ty=wx,tangent=ball.vx*tx+ball.vy*ty;
      ball.vx-=tx*tangent*friction;ball.vy-=ty*tangent*friction;
    }
    return true;
  }
  function resolveBall(rods, ball, woodContact) {
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
            angle:Math.atan2(b.y-a.y,b.x-a.x),length,thickness:HOSE_WIDTH},woodContact || .05);
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
  function draw(ctx, rod, alpha = 1, visible = null) {
    const st = state(rod);
    if (rod.type === 'robotArm') {
      const body = images['robot-body'], tile = images['robot-hose'];
      if (st.links && st.travel > 1) {
        const start=st.links[0],b=st.links.at(-1);
        const origin={x:start.x-Math.cos(rod.angle||0)*6,
          y:start.y-Math.sin(rod.angle||0)*6};
        const length=Math.hypot(b.x-origin.x,b.y-origin.y);
        if(length>.3) {
          ctx.save(); ctx.globalAlpha *= alpha;
          ctx.translate(origin.x,origin.y); ctx.rotate(Math.atan2(b.y-origin.y,b.x-origin.x)-Math.PI/2);
          if (tile.complete && tile.naturalWidth) {
            // Feed complete corrugations at fixed scale; only the last tile is cropped.
            // Do not issue thousands of off-screen tiles on an endless flight.
            let first=0,last=length;
            if(visible) {
              const axis={x:(b.x-origin.x)/length,y:(b.y-origin.y)/length};
              const projection=[{x:visible.x,y:visible.y},
                {x:visible.x+visible.width,y:visible.y},
                {x:visible.x,y:visible.y+visible.height},
                {x:visible.x+visible.width,y:visible.y+visible.height}]
                .map(p=>(p.x-origin.x)*axis.x+(p.y-origin.y)*axis.y);
              first=Math.max(0,Math.floor((Math.min(...projection)-HOSE_STEP*2)/HOSE_STEP)*HOSE_STEP);
              last=Math.min(length,Math.max(...projection)+HOSE_STEP*2);
            }
            for(let at=first;at<last;at+=HOSE_STEP) {
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
      // The first corrugation is hidden behind the flat housing face: no gap,
      // projecting collar, or extra nozzle sprite at the outlet.
      ctx.save(); ctx.globalAlpha *= alpha;
      ctx.translate(rod.x, rod.y); ctx.rotate(rod.angle || 0);
      if (body.complete && body.naturalWidth) ctx.drawImage(body, -rod.length/2, -rod.thickness/2, rod.length, rod.thickness);
      else { ctx.fillStyle = '#405a73'; ctx.fillRect(-rod.length/2, -rod.thickness/2, rod.length, rod.thickness); }
      ctx.restore();
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
