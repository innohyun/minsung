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
  function contact(a,b,skin=0) {
    const ac = corners(a), bc = corners(b);
    let depth = Infinity, nx = 0, ny = 0;
    for (const theta of [a.angle,a.angle+Math.PI/2,b.angle,b.angle+Math.PI/2]) {
      const ux = Math.cos(theta), uy = Math.sin(theta);
      const aa = ac.map(p => p.x*ux+p.y*uy), bb = bc.map(p => p.x*ux+p.y*uy);
      const overlap = Math.min(Math.max(...aa),Math.max(...bb))-Math.max(Math.min(...aa),Math.min(...bb));
      // A small contact skin is for moving bodies only; editor placement
      // still permits exactly adjacent rectangles and rejects real overlap.
      if (skin ? overlap < -skin : overlap <= 0) return null;
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
  function collideRotors(a,b,scale,hit) {
    const av=axis(a,hit.x,hit.y,hit.nx,hit.ny,scale);
    const bv=axis(b,hit.x,hit.y,hit.nx,hit.ny,scale);
    const approach=(bv.vx-av.vx)*hit.nx+(bv.vy-av.vy)*hit.ny;
    const denom=av.jac**2/av.inertia+bv.jac**2/bv.inertia;
    if(approach>=0 || denom<1e-8) return;
    const impulse=-(1+.08)*approach/denom;
    push(a,av,-impulse,scale);push(b,bv,impulse,scale);
  }
  function advanceAgainstWalls(rods,dynamic,solids,dt,scale) {
    // Only run the swept solver for walls/rotor pairs. The original
    // rotor-to-zipline solver below is left alone when those are by themselves.
    const travel=Math.max(...dynamic.map(r=>r.type==='rotor'
      ? Math.abs(r.omega||0)*(r.length/2+Math.abs(r.pivotOffset||0))*dt
      : Math.abs(r.pathSpeed||0)*dt));
    const rotorOnly=!solids.length && dynamic.every(r=>r.type==='rotor');
    const count=Math.max(1,Math.min(rotorOnly?64:96,
      Math.ceil(travel/(rotorOnly?3:2))));
    const step=dt/count;
    for(let sub=0;sub<count;sub++) {
      const previous=new Map();
      for(const rod of dynamic) {
        previous.set(rod,rod.type==='rotor'?rod.angle:rod.pathT||0);
        if(rod.type==='rotor') {
          rod.omega=(rod.omega||0)*Math.exp(-.28*step);
          rod.angle+=rod.omega*step;
        } else {
          rod.pathSpeed=(rod.pathSpeed||0)*Math.exp(-.45*step);
          const target=(rod.pathT||0)+rod.pathSpeed*step;
          rod.pathT=clamp(target,0,curve(rod).total);
          if(target!==rod.pathT) rod.pathSpeed=0;
        }
        position(rod);
        for(const wall of solids) {
          const reach=Math.hypot(rod.length,rod.thickness)/2+
            Math.hypot(wall.length,wall.thickness)/2+2;
          if(Math.hypot(rod.x-wall.x,rod.y-wall.y)>reach) continue;
          const hit=contact(rod,wall,.005);
          if(!hit) continue;
          const start=previous.get(rod),end=rod.type==='rotor'?rod.angle:rod.pathT;
          const at=t=>{
            if(rod.type==='rotor') rod.angle=start+(end-start)*t;
            else rod.pathT=start+(end-start)*t;
            position(rod);
          };
          at(0);const before=contact(rod,wall,.005);
          at(1);
          // Older authored maps may already overlap a support. Do not roll
          // back motion parallel to the wall or motion out of that overlap.
          if(before && hit.depth<=before.depth+.005) continue;
          const allowed=before?before.depth+.005:0;
          let lo=0,hi=1;
          for(let n=0;n<16;n++) {
            const mid=(lo+hi)/2;at(mid);
            const test=contact(rod,wall,.005);
            if(test && test.depth>allowed) hi=mid;else lo=mid;
          }
          at(lo);
          const motion=axis(rod,hit.x,hit.y,hit.nx,hit.ny,scale);
          const inward=motion.vx*hit.nx+motion.vy*hit.ny;
          if(inward>0) {
            if(rod.type==='rotor') rod.omega=0;
            else rod.pathSpeed=0;
          }
        }
      }
      for(let i=0;i<dynamic.length;i++) for(let j=i+1;j<dynamic.length;j++) {
        const a=dynamic[i],b=dynamic[j];
        if(a.type!=='rotor'||b.type!=='rotor') {collidePair(a,b,scale);continue;}
        const hit=contact(a,b,.05);
        if(!hit) continue;
        const startA=previous.get(a),startB=previous.get(b);
        const endA=a.angle,endB=b.angle;
        const at=t=>{a.angle=startA+(endA-startA)*t;
          b.angle=startB+(endB-startB)*t;position(a);position(b);};
        at(0);const resting=contact(a,b,.05);at(1);
        if(resting) {
          const current=contact(a,b,.05);
          collideRotors(a,b,scale,current||resting);
          if(current && current.depth>resting.depth+.01) {
            // Restore the pre-rollback rotor-pair solver: correct only newly
            // added overlap in the two bearing coordinates, not the whole step.
            const da=axis(a,current.x,current.y,current.nx,current.ny,scale);
            const db=axis(b,current.x,current.y,current.nx,current.ny,scale);
            const ja=da.jac*scale,jb=db.jac*scale;
            const wa=1/da.inertia,wb=1/db.inertia;
            const denom=ja*ja*wa+jb*jb*wb;
            if(denom>1e-8) {
              const delta=Math.min(current.depth-resting.depth,2);
              a.angle-=clamp(delta*ja*wa/denom,-.025,.025);
              b.angle+=clamp(delta*jb*wb/denom,-.025,.025);
              position(a);position(b);
            }
          }
          continue;
        }
        at(0);
        let lo=0,hi=1;
        for(let n=0;n<12;n++) {
          const mid=(lo+hi)/2;at(mid);
          if(contact(a,b,.05)) hi=mid;else lo=mid;
        }
        at(hi);
        collideRotors(a,b,scale,contact(a,b,.05));
        at(lo);
        // Do not discard the remainder of the step after transferring the
        // impulse. Repeated first-touch rollbacks stored angular speed while
        // the second rotor's visible angle stayed frozen under pressure.
        const left=step*(1-lo);
        const touchA=a.angle,touchB=b.angle;
        const restingAfter=contact(a,b,.005);
        a.angle+=a.omega*left;b.angle+=b.omega*left;
        position(a);position(b);
        const newHit=contact(a,b,.005);
        if(newHit && newHit.depth>(restingAfter?.depth||0)+.005) {
          const endAfterA=a.angle,endAfterB=b.angle;
          let low=0,high=1;
          for(let n=0;n<12;n++) {
            const mid=(low+high)/2;
            a.angle=touchA+(endAfterA-touchA)*mid;
            b.angle=touchB+(endAfterB-touchB)*mid;
            position(a);position(b);
            const overlap=contact(a,b,.005);
            if(overlap && overlap.depth>(restingAfter?.depth||0)+.005)high=mid;
            else low=mid;
          }
          a.angle=touchA+(endAfterA-touchA)*low;
          b.angle=touchB+(endAfterB-touchB)*low;
          position(a);position(b);
        }
        // Pair motion must not bypass the wall constraint that ran earlier
        // in this same substep. Limit only the new pair-contact remainder.
        for(const [rod,touch] of [[a,touchA],[b,touchB]]) for(const wall of solids) {
          const end=rod.angle;
          rod.angle=touch;position(rod);
          const before=contact(rod,wall,.005);
          rod.angle=end;position(rod);
          const after=contact(rod,wall,.005);
          if(!after || after.depth<=(before?.depth||0)+.005) continue;
          let low=0,high=1;
          for(let n=0;n<12;n++) {
            const mid=(low+high)/2;
            rod.angle=touch+(end-touch)*mid;position(rod);
            const overlap=contact(rod,wall,.005);
            if(overlap && overlap.depth>(before?.depth||0)+.005) high=mid;
            else low=mid;
          }
          rod.angle=touch+(end-touch)*low;position(rod);
          rod.omega=0;
        }
      }
    }
  }
  function advance(rods,dt,scale) {
    const dynamic = rods.filter(r => r.type === 'rotor' || r.type === 'zipline');
    const solids=rods.filter(r=>['wood','slime','electric','breakable'].includes(r.type)
      && (r.type!=='breakable'||r.hp>0));
    if(dynamic.length && (solids.length || dynamic.filter(r=>r.type==='rotor').length>1)) {
      advanceAgainstWalls(rods,dynamic,solids,dt,scale);
      return;
    }
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
  function resolveRotorContacts(rods,scale) {
    // Pre-rollback same-tick impulse exchange, restricted to rotor pairs.
    // The original rotor-to-zipline path is intentionally unchanged.
    const rotors=rods.filter(r=>r.type==='rotor');
    for(let pass=0;pass<Math.min(6,rotors.length+1);pass++) {
      let changed=false;
      for(let i=0;i<rotors.length;i++) for(let j=i+1;j<rotors.length;j++) {
        const a=rotors[i],b=rotors[j],hit=contact(a,b,.05);
        if(!hit) continue;
        const beforeA=a.omega,beforeB=b.omega;
        collideRotors(a,b,scale,hit);
        if(a.omega!==beforeA||b.omega!==beforeB) changed=true;
      }
      if(!changed) break;
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
      const rx=-wx*radius,ry=-wy*radius;
      const crossT=rx*ty-ry*tx;
      const relative=(ball.vx-ball.omega*ry-tangent.vx)*tx
        +(ball.vy+ball.omega*rx-tangent.vy)*ty;
      const tangentDenom=invBall+crossT*crossT/spinInertia+tangent.jac*tangent.jac/tangent.inertia;
      const support=ball.mass*(options.gravity||0)*(options.dt||0)*Math.max(0,-wy);
      const friction=clamp(-relative/tangentDenom,
        -options.friction*(impulse+support),options.friction*(impulse+support));
      ball.vx+=tx*friction*invBall;ball.vy+=ty*friction*invBall;
      ball.omega+=crossT*friction/spinInertia;
      push(rod,tangent,-friction,scale);
      if(support && options.rollingResistance) {
        const speed=ball.vx*tx+ball.vy*ty;
        const slow=clamp(speed,-(options.gravity||0)*options.rollingResistance*(options.dt||0),
          (options.gravity||0)*options.rollingResistance*(options.dt||0));
        ball.vx-=tx*slow;ball.vy-=ty*slow;
        ball.omega*=Math.exp(-options.rollingResistance*12*(options.dt||0));
      }
    }
    return true;
  }
  return { curve,position,advance,collideBall,contact,applyImpulse,resolveRotorContacts };
})();
