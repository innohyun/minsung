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
      const bend = nodes.length === 2 ? (Number.isFinite(rod.curveBend) ? rod.curveBend : 0) : 0;
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
      rod.x = p.x - Math.cos(rod.angle || 0)*(rod.guideOffset || 0);
      rod.y = p.y - Math.sin(rod.angle || 0)*(rod.guideOffset || 0);
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
  function applyImpulse(rod, point, ix, iy, scale) {
    // Constrained bodies retain their existing velocity; impulse projection is
    // weighted by the same mass, pivot inertia and curved guide tangent as collisions.
    if (rod.type !== 'rotor' && rod.type !== 'zipline') return;
    const magnitude = Math.hypot(ix, iy);
    if (!magnitude) return;
    const a = axis(rod, point.x, point.y, ix / magnitude, iy / magnitude, scale);
    push(rod, a, magnitude, scale);
  }
  function corners(r) {
    const c = Math.cos(r.angle), s = Math.sin(r.angle), w = r.length/2, h = r.thickness/2;
    return [[-w,-h],[w,-h],[w,h],[-w,h]].map(([x,y]) => ({x:r.x+c*x-s*y,y:r.y+s*x+c*y}));
  }
  function contact(a,b) {
    const ac = corners(a), bc = corners(b);
    let depth = Infinity, nx = 0, ny = 0;
    for (const theta of [a.angle,a.angle+Math.PI/2,b.angle,b.angle+Math.PI/2]) {
      const ux = Math.cos(theta), uy = Math.sin(theta);
      const aa = ac.map(p => p.x*ux+p.y*uy), bb = bc.map(p => p.x*ux+p.y*uy);
      const overlap = Math.min(Math.max(...aa),Math.max(...bb))-Math.max(Math.min(...aa),Math.min(...bb));
      if (overlap <= 0) return null;
      if (overlap < depth) { const sign = (b.x-a.x)*ux+(b.y-a.y)*uy >= 0 ? 1 : -1;
        depth = overlap; nx = ux*sign; ny = uy*sign; }
    }
    // A face may have two supporting corners. The first corner is not the
    // contact point; its false lever arm made the guide feel sticky on impact.
    const tx=-ny,ty=nx;
    const face=(vertices,outer)=>{
      const values=vertices.map(p=>p.x*nx+p.y*ny);
      const edge=outer?Math.max(...values):Math.min(...values);
      return vertices.filter((p,i)=>Math.abs(values[i]-edge)<.01);
    };
    const af=face(ac,true),bf=face(bc,false);
    const ta=af.map(p=>p.x*tx+p.y*ty),tb=bf.map(p=>p.x*tx+p.y*ty);
    const tangent=(Math.max(Math.min(...ta),Math.min(...tb))+
      Math.min(Math.max(...ta),Math.max(...tb)))/2;
    const normal=(Math.max(...ac.map(p=>p.x*nx+p.y*ny))+
      Math.min(...bc.map(p=>p.x*nx+p.y*ny)))/2;
    const x=nx*normal+tx*tangent, y=ny*normal+ty*tangent;
    return {x,y,nx,ny,depth};
  }
  function contactCircle(rod, magnet) {
    const c = Math.cos(rod.angle), s = Math.sin(rod.angle);
    const dx = magnet.x - rod.x, dy = magnet.y - rod.y;
    const lx = c*dx+s*dy, ly = -s*dx+c*dy;
    const px = clamp(lx,-rod.length/2,rod.length/2);
    const py = clamp(ly,-rod.thickness/2,rod.thickness/2);
    let nx = lx-px, ny = ly-py, distance = Math.hypot(nx,ny);
    if (distance >= magnet.length/2) return null;
    if (distance < .0001) { nx = 0; ny = ly >= 0 ? 1 : -1; distance = 0; }
    else { nx /= distance; ny /= distance; }
    return {x:rod.x+c*px-s*py,y:rod.y+s*px+c*py,
      nx:c*nx-s*ny,ny:s*nx+c*ny,depth:magnet.length/2-distance};
  }
  function collidePair(a,b,scale,hit=contact(a,b)) {
    if(!hit) return null;
    const {x,y,nx,ny}=hit;
    const av=axis(a,x,y,nx,ny,scale),bv=axis(b,x,y,nx,ny,scale);
    const approach=(bv.vx-av.vx)*nx+(bv.vy-av.vy)*ny;
    const denom=av.jac**2/av.inertia+bv.jac**2/bv.inertia;
    if(approach<0 && denom>1e-8) {
      const impulse=-(1+.08)*approach/denom;
      push(a,av,-impulse,scale);push(b,bv,impulse,scale);
    }
    return -Math.min(0,approach);
  }
  // All constrained bodies advance together in small swept increments. Rolling
  // a penetrated pair back *after* a full frame used to let thin rotors cross.
  function advance(rods,dt,scale,onImpact) {
    const dynamic=rods.filter(r=>r.type==='rotor'||r.type==='zipline');
    if(!dynamic.length) return;
    const solids=rods.filter(r=>r.type!=='rotor'&&r.type!=='zipline'&&r.type!=='swing'
      &&r.type!=='fixedBall'&&(r.type!=='breakable'||r.hp>0));
    const travel=Math.max(...dynamic.map(r=>r.type==='rotor'
      ? Math.abs(r.omega||0)*(r.length/2+Math.abs(r.pivotOffset||0))*dt
      : Math.abs(r.pathSpeed||0)*dt));
    const count=Math.max(1,Math.min(64,Math.ceil(travel/3)));
    const step=dt/count;
    for(let sub=0;sub<count;sub++) {
      const previous=new Map();
      for(const rod of dynamic) {
        previous.set(rod,{angle:rod.angle,pathT:rod.pathT});
        if(rod.type==='rotor') {
          rod.omega=(rod.omega||0)*Math.exp(-.28*step);
          rod.angle+=rod.omega*step;
        } else {
          rod.pathSpeed=(rod.pathSpeed||0)*Math.exp(-.45*step);
          const next=(rod.pathT||0)+rod.pathSpeed*step;
          rod.pathT=clamp(next,0,curve(rod).total);
          if(next!==rod.pathT) rod.pathSpeed=0;
        }
        position(rod);
        for(const fixed of solids) {
          const hit=fixed.type==='magnet'?contactCircle(rod,fixed):contact(rod,fixed);
          if(!hit) continue;
          const a=axis(rod,hit.x,hit.y,hit.nx,hit.ny,scale);
          const inward=a.vx*hit.nx+a.vy*hit.ny;
          const old=previous.get(rod);
          rod.angle=old.angle;rod.pathT=old.pathT;position(rod);
          if(inward>.02&&Math.abs(a.jac)>1e-6) {
            // An immovable wall reflects the one permitted axis velocity.
            // push() would multiply by the lever arm a second time and can
            // reverse the body repeatedly at shallow contact angles.
            if(rod.type==='rotor') rod.omega=-(rod.omega||0)*.12;
            else rod.pathSpeed=-(rod.pathSpeed||0)*.12;
            onImpact?.(rod,fixed,inward);
          } else if(inward>=0) {
            if(rod.type==='rotor') rod.omega=0;
            else rod.pathSpeed=0;
          }
          break;
        }
      }
      // Pair contact exchanges only normal impulse: no block-to-block
      // friction. Locate the first touch rather than undoing a whole substep
      // after every overlap (which looks like stick-slip or a small teleport).
      for(let i=0;i<dynamic.length;i++) for(let j=i+1;j<dynamic.length;j++) {
        const a=dynamic[i],b=dynamic[j],hit=contact(a,b);
        if(!hit) continue;
        const endA={angle:a.angle,pathT:a.pathT},endB={angle:b.angle,pathT:b.pathT};
        const at=t=>{
          for(const [rod,end] of [[a,endA],[b,endB]]) {
            const old=previous.get(rod);
            rod.angle=old.angle+(end.angle-old.angle)*t;
            rod.pathT=(old.pathT||0)+((end.pathT||0)-(old.pathT||0))*t;
            position(rod);
          }
        };
        const resting=(()=>{at(0);const hit=contact(a,b);at(1);return hit;})();
        if(resting) {
          // Resolve the current velocity without rewinding the bodies to the
          // same original overlap on every frame; that discarded all motion.
          const current=contact(a,b);
          const speed=collidePair(a,b,scale,current||resting);
          if(current && current.depth>resting.depth+.01) {
            // Remove only the NEW penetration along the actual bearing/rail
            // coordinates. Never reset both positions to the previous frame.
            const da=axis(a,current.x,current.y,current.nx,current.ny,scale);
            const db=axis(b,current.x,current.y,current.nx,current.ny,scale);
            const ja=da.jac*(a.type==='rotor'?scale:1);
            const jb=db.jac*(b.type==='rotor'?scale:1);
            const wa=1/da.inertia,wb=1/db.inertia;
            const denom=ja*ja*wa+jb*jb*wb;
            if(denom>1e-8) {
              const delta=Math.min(current.depth-resting.depth,2);
              if(a.type==='rotor') a.angle-=clamp(delta*ja*wa/denom,-.025,.025);
              else a.pathT-=clamp(delta*ja*wa/denom,-2,2);
              if(b.type==='rotor') b.angle+=clamp(delta*jb*wb/denom,-.025,.025);
              else b.pathT+=clamp(delta*jb*wb/denom,-2,2);
              position(a);position(b);
            }
          }
          if(speed>.12) onImpact?.(a,b,speed);
          continue;
        }
        at(0);
        let lo=0,hi=1;
        for(let n=0;n<12;n++) {
          const mid=(lo+hi)/2;
          at(mid);
          if(contact(a,b)) hi=mid; else lo=mid;
        }
        at(hi);
        const speed=collidePair(a,b,scale,contact(a,b));
        at(lo);
        if(speed>.12) onImpact?.(a,b,speed);
      }
    }
  }
  function collideBall(rod,ball,scale,onImpact,options={}) {
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
    const rx=-wx*ball.radius/scale, ry=-wy*ball.radius/scale;
    const invBall = ball.attachedMagnetUid || ball.attachedSwingUid || ball.electricRide ? 0 : 1/ball.mass;
    const denom = invBall + ax.jac**2/ax.inertia;
    if (denom < 1e-8) return;
    if (invBall) { ball.x += wx*(ball.radius-d+.01); ball.y += wy*(ball.radius-d+.01); }
    const approach = (ball.vx-ax.vx)*wx+(ball.vy-ax.vy)*wy;
    const impulse = approach < 0 ? -(1+.18)*approach/denom : 0;
    if (impulse) {
      if (invBall) { ball.vx += wx*impulse*invBall; ball.vy += wy*impulse*invBall; }
      push(rod,ax,-impulse,scale);
      onImpact?.(-approach);
    }
    if (invBall && options.friction) {
      const tx=-wy,ty=wx,radius=ball.radius/scale;
      const spinInertia=Math.max(.0001,.4*ball.mass*radius*radius);
      const tangent=axis(rod,px,py,tx,ty,scale);
      const crossT=rx*ty-ry*tx;
      const relative=(ball.vx-ball.omega*ry-tangent.vx)*tx
        +(ball.vy+ball.omega*rx-tangent.vy)*ty;
      const tangentDenom=invBall+crossT*crossT/spinInertia+tangent.jac*tangent.jac/tangent.inertia;
      // Wood's Coulomb coefficient also acts on a resting ball's gravity load.
      const support=ball.mass*(options.gravity||0)*(options.dt||0)*Math.max(0,-wy);
      const friction=clamp(-relative/tangentDenom,-options.friction*(impulse+support),options.friction*(impulse+support));
      ball.vx+=tx*friction*invBall; ball.vy+=ty*friction*invBall;
      ball.omega+=crossT*friction/spinInertia;
      push(rod,tangent,-friction,scale);
      if (support && options.rollingResistance) {
        const speed=ball.vx*tx+ball.vy*ty;
        const maxSlow=(options.gravity||0)*options.rollingResistance*(options.dt||0);
        const slow=clamp(speed,-maxSlow,maxSlow);
        ball.vx-=tx*slow;ball.vy-=ty*slow;
        ball.omega*=Math.exp(-options.rollingResistance*12*(options.dt||0));
      }
    }
    return true;
  }
  return { curve,position,advance,collideBall,contact,applyImpulse };
})();
