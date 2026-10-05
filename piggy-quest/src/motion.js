/** Fixed bone lengths and explicit elbow hinges; no arbitrary elbow branch flips. */
(function(P){
  'use strict';
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const point=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
  function joint(a,b,upper,lower,bend=1){
    const dx=b[0]-a[0],dy=b[1]-a[1],distance=Math.max(.001,Math.hypot(dx,dy));
    const d=clamp(distance,Math.abs(upper-lower)+.001,upper+lower-.001);
    const along=(upper*upper-lower*lower+d*d)/(2*d),side=Math.sqrt(Math.max(0,upper*upper-along*along))*bend;
    return [a[0]+dx/distance*along+dy/distance*side,a[1]+dy/distance*along-dx/distance*side];
  }
  function foot(phase,running=false){
    const a=((phase%1)+1)%1,run=clamp(Number(running),0,1),stride=mix(150,190,run),contact=mix(.5,.42,run),reach=stride*contact/2;
    if(a<contact)return {point:[reach-stride*a,0],planted:true};
    const p=(a-contact)/(1-contact);
    return {point:[mix(-reach,reach,smooth(p)),-Math.sin(p*Math.PI)*mix(20,42,run)],planted:false};
  }
  function strike(age,out,hold,back){
    if(age<0)return 0;if(age<out)return smooth(age/out);if(age<out+hold)return 1;
    return 1-smooth((age-out-hold)/back);
  }
  function fkArm(shoulder,angle,flex){
    const elbow=[shoulder[0]+Math.sin(angle)*32,shoulder[1]+Math.cos(angle)*32];
    return {elbow,hand:[elbow[0]+Math.sin(angle+flex)*31,elbow[1]+Math.cos(angle+flex)*31]};
  }
  function aimArm(shoulder,target,bend=-1){
    const dx=target[0]-shoulder[0],dy=target[1]-shoulder[1],d=Math.hypot(dx,dy),scale=Math.min(1,62/d);
    const hand=[shoulder[0]+dx*scale,shoulder[1]+dy*scale];
    return {hand,elbow:joint(shoulder,hand,32,31,bend)};
  }
  function pose(o={}){
    const speed=Math.abs(o.speed||0),moving=clamp(o.walkBlend??speed/P.CONFIG.walkSpeed,0,1),running=clamp(o.runBlend??Number(!!o.running),0,1);
    const phase=o.phase??(o.walkDistance??(o.time||0)*speed)/mix(150,190,running),angle=phase*Math.PI*2,wave=Math.cos(angle);
    const bob=-(Math.sin(angle*2)**2)*mix(.65,2,running)*moving,lean=mix(3,8,running)*moving;
    const hip=[lean*.3,-94+8*moving+bob],shoulder=[lean,-147+3*moving+bob*.2],head=[lean+1,-173+3*moving+bob*.15];
    const rear=foot(phase+.5,running),front=foot(phase,running);
    let rearFoot=point([-5,0],rear.point,moving),frontFoot=point([5,0],front.point,moving);
    let attackArm=null,kickExtension=0,turn=0,spinArc=0;
    const age=o.age||0;
    if(o.air){rearFoot=[-15,-27];frontFoot=[23,-37];}
    if(o.pose==='punch'){
      const stance=strike(age,.045,.32,.095),second=age>=.21;
      const power=strike(age-(second?.21:0),second?.08:.09,.035,.075);
      const crouch=Math.max(0,(o.aimY??-125)+118)*.74*stance;
      hip[1]+=crouch*.72;shoulder[1]+=crouch;head[1]+=crouch;
      rearFoot=point(rearFoot,[-14,0],stance);frontFoot=point(frontFoot,[18,0],stance);
      shoulder[0]+=power*(second?12:7);hip[0]+=power*(second?5:2);head[0]+=power*5;
      attackArm=second?'rear':'front';
    }
    if(o.pose==='kick'){
      kickExtension=strike(age,.045,.025,.15);hip[0]+=kickExtension*9;
      const height=o.kickAimY??-74,reach=Math.sqrt(Math.max(0,93**2-(hip[1]-height)**2));
      frontFoot=[5+kickExtension*Math.min(96,hip[0]+reach-5),kickExtension*height];rearFoot=[-6,0];
      shoulder[0]-=kickExtension*13;head[0]-=kickExtension*10;
      hip[1]+=kickExtension*2;shoulder[1]+=kickExtension*2;head[1]+=kickExtension*2;
    }
    if(o.pose==='spin'){
      // Roundhouse: lift the knee, turn the hip, sweep, re-chamber, plant.
      turn=Math.sin(clamp(age/.62,0,1)*Math.PI)*.9;
      hip[0]+=turn/ .9*7;hip[1]+=turn*4;shoulder[1]+=turn*4;head[1]+=turn*4;
      const chamber=[hip[0]+16,hip[1]+28],height=o.spinAimY??-76;
      const contact=[hip[0]+Math.sqrt(Math.max(0,93**2-(hip[1]-height)**2)),height];
      const lift=smooth(age/.13),extend=strike(age-.13,.13,.045,.12),plant=smooth((age-.425)/.195);
      frontFoot=point(point([5,0],chamber,lift),contact,extend);frontFoot=point(frontFoot,[9,0],plant);
      rearFoot=[-9,0];shoulder[0]-=extend*16;head[0]-=extend*11;
      kickExtension=extend;spinArc=extend;
    }
    if(o.pose==='dash'){shoulder[0]+=20;head[0]+=25;}
    if(o.hit){shoulder[0]-=6;head[0]-=9;}
    if(o.carrying){shoulder[0]*=.15;head[0]*=.15;shoulder[1]=-147+bob*.25;head[1]=-173+bob*.25;}
    if(o.blocking){hip[1]+=32;shoulder[1]+=32;head[1]+=32;rearFoot=[-12,0];frontFoot=[12,0];}
    const rearShoulder=[...shoulder],frontShoulder=[...shoulder];
    const swing=mix(.65,.82,running)*moving,flex=.2+moving*mix(.1,.75,running);
    // Keep these FK elbows. Re-solving them with opposite IK branches caused the broken arms.
    let rearArm=fkArm(rearShoulder,-.09+wave*swing,flex),frontArm=fkArm(frontShoulder,.09-wave*swing,flex);
    const guard=()=>{rearArm=fkArm(rearShoulder,.18,2.45);frontArm=fkArm(frontShoulder,.45,2.15);};
    if(o.pose==='punch'){
      guard();const second=age>=.21,power=strike(age-(second?.21:0),second?.08:.09,.035,.075);
      const anchor=second?rearShoulder:frontShoulder,arm=second?rearArm:frontArm;
      const hit=aimArm(anchor,point(arm.hand,[anchor[0]+74,o.aimY??-125],power));
      if(second)rearArm=hit;else frontArm=hit;
    }
    if(o.pose==='kick'||o.pose==='spin'){guard();if(o.pose==='spin')rearArm=fkArm(rearShoulder,-.55-turn*.3,.8);}
    if(o.pose==='dash'){rearArm=fkArm(rearShoulder,-1.1,.6);frontArm=fkArm(frontShoulder,.65,.7);}
    if(o.carrying){
      // Separate shoulder/hand lanes and outward elbows support the ceramic base without crossing.
      rearArm=aimArm(rearShoulder,[-31,-196],1);frontArm=aimArm(frontShoulder,[31,-196],-1);
    }
    else if(o.playerShield){frontArm=aimArm(frontShoulder,[32,o.blocking?-74:-113]);}
    return {hip,shoulder,rearShoulder,frontShoulder,head,rearFoot,frontFoot,
      rearHand:rearArm.hand,frontHand:frontArm.hand,rearElbow:rearArm.elbow,frontElbow:frontArm.elbow,
      rearKnee:joint(hip,rearFoot,47,48),frontKnee:joint(hip,frontFoot,47,48),
      rearPlanted:rear.planted,frontPlanted:front.planted,attackArm,kickExtension,turn,spinArc};
  }
  P.Motion={pose,foot,joint,strike};
})(globalThis.PIGGY=globalThis.PIGGY||{});
