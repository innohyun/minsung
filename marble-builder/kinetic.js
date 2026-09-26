/* Gravity-free constrained blocks. Speeds use pixels/s; marble speeds use metres/s. */
window.MarbleKinetics = (() => {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const mass = rod => Math.max(.15, rod.length * rod.thickness / 3600 * .7);
  function curve(rod, distance = 0) {
    const nodes = rod.path || [];
    if (nodes.length < 2) return { x: rod.x, y: rod.y, tx: 1, ty: 0, total: 0 };
    const samples = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i], b = nodes[i + 1], before = nodes[i - 1] || a, after = nodes[i + 2] || b;
      const dx = b.x - a.x, dy = b.y - a.y, size = Math.hypot(dx, dy) || 1;
      const bend = nodes.length === 2 ? 24 : 0;
      const c1 = { x: a.x + (b.x - before.x) / 6 - dy / size * bend,
        y: a.y + (b.y - before.y) / 6 + dx / size * bend };
      const c2 = { x: b.x - (after.x - a.x) / 6 - dy / size * bend,
        y: b.y - (after.y - a.y) / 6 + dx / size * bend };
      for (let k = 0; k <= 24; k++) {
        if (i && !k) continue;
        const t = k / 24, v = 1 - t;
        samples.push({ x: v*v*v*a.x + 3*v*v*t*c1.x + 3*v*t*t*c2.x + t*t*t*b.x,
          y: v*v*v*a.y + 3*v*v*t*c1.y + 3*v*t*t*c2.y + t*t*t*b.y });
      }
    }
    let total = 0;
    for (let i = 1; i < samples.length; i++) {
      total += Math.hypot(samples[i].x - samples[i-1].x, samples[i].y - samples[i-1].y);
      samples[i].d = total;
    }
    const target = clamp(distance, 0, total);
    let i = 1;
    while (i < samples.length - 1 && samples[i].d < target) i++;
    const a = samples[i-1], b = samples[i], length = b.d - (a.d || 0) || 1;
    const t = (target - (a.d || 0)) / length;
    return { x: a.x + (b.x-a.x)*t, y: a.y + (b.y-a.y)*t,
      tx: (b.x-a.x)/length, ty: (b.y-a.y)/length, total };
  }
  function position(rod) {
    if (rod.type === 'rotor') {
      rod.x = rod.pivotX - Math.cos(rod.angle) * (rod.pivotOffset || 0);
      rod.y = rod.pivotY - Math.sin(rod.angle) * (rod.pivotOffset || 0);
    } else if (rod.type === 'zipline') {
      const p = curve(rod, rod.pathT || 0);
      rod.pathT = clamp(rod.pathT || 0, 0, p.total);
      rod.x = p.x; rod.y = p.y;
    }
  }
  function axis(rod, x, y, nx, ny, scale) {
    if (rod.type === 'rotor') {
      const rx = (x - rod.pivotX)/scale, ry = (y - rod.pivotY)/scale;
      const jac = rx*ny - ry*nx, m = mass(rod), l = rod.length/scale, h = rod.thickness/scale;
      const inertia = m * (l*l + h*h)/12 + m*((rod.pivotOffset || 0)/scale)**2;
      return { jac, inertia, vx: -(rod.omega || 0)*ry, vy: (rod.omega || 0)*rx };
    }
    const t = curve(rod, rod.pathT || 0);
    return { jac: t.tx*nx + t.ty*ny, inertia: mass(rod),
      vx: t.tx*(rod.pathSpeed || 0)/scale, vy: t.ty*(rod.pathSpeed || 0)/scale };
  }
  function push(rod, a, j, scale) {
    if (rod.type === 'rotor') rod.omega = (rod.omega || 0) + j*a.jac/a.inertia;
    else rod.pathSpeed = (rod.pathSpeed || 0) + j*a.jac/a.inertia*scale;
  }
  function corners(r) {
    const c = Math.cos(r.angle), s = Math.sin(r.angle), w = r.length/2, h = r.thickness/2;
    return [[-w,-h],[w,-h],[w,h],[-w,h]].map(([x,y]) => ({x:r.x+c*x-s*y,y:r.y+s*x+c*y}));
  }
  function collidePair(a,b,scale) {
    const ac = corners(a), bc = corners(b);
    let depth = Infinity, nx = 0, ny = 0;
    for (const theta of [a.angle,a.angle+Math.PI/2,b.angle,b.angle+Math.PI/2]) {
      const ux = Math.cos(theta), uy = Math.sin(theta);
      const aa = ac.map(p => p.x*ux+p.y*uy), bb = bc.map(p => p.x*ux+p.y*uy);
      const overlap = Math.min(Math.max(...aa),Math.max(...bb))-Math.max(Math.min(...aa),Math.min(...bb));
      if (overlap <= 0) return;
      if (overlap < depth) { const sign = (b.x-a.x)*ux+(b.y-a.y)*uy >= 0 ? 1 : -1;
        depth = overlap; nx = ux*sign; ny = uy*sign; }
    }
    const ap = ac.reduce((u,p) => p.x*nx+p.y*ny > u.x*nx+u.y*ny ? p : u);
    const bp = bc.reduce((u,p) => p.x*nx+p.y*ny < u.x*nx+u.y*ny ? p : u);
    const x = (ap.x+bp.x)/2, y = (ap.y+bp.y)/2;
    const av = axis(a,x,y,nx,ny,scale), bv = axis(b,x,y,nx,ny,scale);
    const approach = (bv.vx-av.vx)*nx+(bv.vy-av.vy)*ny;
    const denom = av.jac**2/av.inertia + bv.jac**2/bv.inertia;
    if (approach >= 0 || denom < 1e-8) return;
    const impulse = -(1+.08)*approach/denom;
    push(a,av,-impulse,scale); push(b,bv,impulse,scale);
  }
  function advance(rods,dt,scale) {
    const dynamic = rods.filter(r => r.type === 'rotor' || r.type === 'zipline');
    for (const rod of dynamic) {
      if (rod.type === 'rotor') {
        rod.omega = (rod.omega || 0)*Math.exp(-.28*dt);
        rod.angle += rod.omega*dt;
      } else {
        rod.pathSpeed = (rod.pathSpeed || 0)*Math.exp(-.45*dt);
        const target = (rod.pathT || 0) + rod.pathSpeed*dt;
        rod.pathT = clamp(target, 0, curve(rod).total);
        if (target !== rod.pathT) rod.pathSpeed = 0;
      }
      position(rod);
    }
    for (let i = 0; i < dynamic.length; i++) for (let j = i+1; j < dynamic.length; j++) {
      collidePair(dynamic[i],dynamic[j],scale);
    }
  }
  function collideBall(rod,ball,scale) {
    if (!ball) return;
    const c = Math.cos(rod.angle), s = Math.sin(rod.angle), dx = ball.x-rod.x, dy = ball.y-rod.y;
    const lx = c*dx+s*dy, ly = -s*dx+c*dy;
    const cx = clamp(lx,-rod.length/2,rod.length/2), cy = clamp(ly,-rod.thickness/2,rod.thickness/2);
    let nx = lx-cx, ny = ly-cy, d = Math.hypot(nx,ny);
    if (d >= ball.radius) return false;
    if (d < .0001) { nx = 0; ny = ly >= 0 ? 1 : -1; d = 0; }
    else { nx /= d; ny /= d; }
    const wx = c*nx-s*ny, wy = s*nx+c*ny;
    const px = rod.x+c*cx-s*cy, py = rod.y+s*cx+c*cy;
    const ax = axis(rod,px,py,wx,wy,scale);
    const invBall = ball.attachedMagnetUid || ball.attachedSwingUid || ball.electricRide ? 0 : 1/ball.mass;
    const denom = invBall + ax.jac**2/ax.inertia;
    if (denom < 1e-8) return;
    if (invBall) { ball.x += wx*(ball.radius-d+.01); ball.y += wy*(ball.radius-d+.01); }
    const approach = (ball.vx-ax.vx)*wx+(ball.vy-ax.vy)*wy;
    if (approach >= 0) return true;
    const impulse = -(1+.18)*approach/denom;
    if (invBall) { ball.vx += wx*impulse*invBall; ball.vy += wy*impulse*invBall; }
    push(rod,ax,-impulse,scale);
    return true;
  }
  return { curve,position,advance,collideBall };
})();
