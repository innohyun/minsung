/** Original articulated poses: planted steps, shoulder swing, jab/cross and snap kick. */
(function(P){
  'use strict';
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const mix=(a,b,t)=>a+(b-a)*t;
  function joint(a,b,upper,lower,bend=1){
    const dx=b[0]-a[0],dy=b[1]-a[1],distance=Math.max(.001,Math.hypot(dx,dy));
    const d=Math.min(distance,upper+lower-.001);
    const along=(upper*upper-lower*lower+d*d)/(2*d);
    const side=Math.sqrt(Math.max(0,upper*upper-along*along))*bend;
    return [a[0]+dx/distance*along+dy/distance*side,a[1]+dy/distance*along-dx/distance*side];
  }
  function foot(phase){
    const a=((phase%1)+1)%1;
    // During contact the foot moves backwards exactly as far as the body travels.
    if(a<.5)return {point:[37.5-150*a,0],planted:true};
    const p=(a-.5)*2;
    return {point:[mix(-37.5,37.5,smooth(p)),-Math.sin(p*Math.PI)*24],planted:false};
  }
  function strike(age,out,hold,back){
    if(age<0)return 0;
    if(age<out)return smooth(age/out);
    if(age<out+hold)return 1;
    return 1-smooth((age-out-hold)/back);
  }
  function pose(o={}){
    const speed=Math.abs(o.speed||0),moving=clamp(o.walkBlend??speed/P.CONFIG.walkSpeed,0,1);
    const phase=o.phase??(o.walkDistance??(o.time||0)*speed)/150;
    const angle=phase*Math.PI*2,wave=Math.cos(angle);
    const bob=-(Math.sin(angle*2)**2)*2*moving;
    const lean=7*moving;
    const hip=[lean*.3,-94+8*moving+bob],shoulder=[lean,-147+8*moving+bob],head=[lean+1,-173+8*moving+bob*.55];
    const rear=foot(phase+.5),front=foot(phase);
    let rearFoot=[mix(-5,rear.point[0],moving),rear.point[1]*moving];
    let frontFoot=[mix(5,front.point[0],moving),front.point[1]*moving];
    const arm=(a)=>{const elbow=[shoulder[0]+Math.sin(a)*32,shoulder[1]+Math.cos(a)*32];return {elbow,hand:[elbow[0]+Math.sin(a+.18)*30,elbow[1]+Math.cos(a+.18)*30]};};
    const rearArm=arm(.06+wave*.62*moving),frontArm=arm(-.06-wave*.62*moving);
    let rearHand=rearArm.hand,frontHand=frontArm.hand,attackArm=null,kickExtension=0;
    if(o.air){rearFoot=[-15,-27];frontFoot=[23,-37];}
    if(o.pose==='punch'){
      const age=o.age||0,second=age>=.16,power=strike(age-(second?.16:0),.055,.012,.093);
      const crouch=Math.max(0,(o.aimY??-125)+105)*.65*strike(age,.04,.22,.08);
      hip[1]+=crouch*.75;shoulder[1]+=crouch;head[1]+=crouch;
      attackArm=second?'rear':'front';shoulder[0]+=power*11;head[0]+=power*4;
      const punch=[14+power*66,mix(-125,o.aimY??-125,power)];
      rearHand=second?punch:[8,-127];frontHand=second?[14,-131]:punch;
    }
    if(o.pose==='kick'||o.pose==='spin'){
      kickExtension=strike(o.age||0,.045,.025,.15);
      hip[0]+=kickExtension*9;
      const height=o.kickAimY??-74,reach=Math.sqrt(Math.max(0,93**2-(hip[1]-height)**2));
      frontFoot=[5+kickExtension*Math.min(96,hip[0]+reach-5),kickExtension*height];rearFoot=[-6,0];
      shoulder[0]-=kickExtension*13;head[0]-=kickExtension*10;
      frontHand=[19,-125];rearHand=[-27,-121];
    }
    if(o.pose==='dash'){shoulder[0]+=20;head[0]+=25;frontHand=[56,-122];rearHand=[-24,-112];}
    if(o.carrying){frontHand=[22,-196+bob];rearHand=[-18,-196+bob];}
    if(o.hit){shoulder[0]-=6;head[0]-=9;}
    const withinReach=hand=>{const d=Math.hypot(hand[0]-shoulder[0],hand[1]-shoulder[1]);return d>62?[shoulder[0]+(hand[0]-shoulder[0])*62/d,shoulder[1]+(hand[1]-shoulder[1])*62/d]:hand;};
    rearHand=withinReach(rearHand);frontHand=withinReach(frontHand);
    return {hip,shoulder,head,rearFoot,frontFoot,rearHand,frontHand,
      rearElbow:joint(shoulder,rearHand,32,31,-1),frontElbow:joint(shoulder,frontHand,32,31,1),
      rearKnee:joint(hip,rearFoot,47,48),frontKnee:joint(hip,frontFoot,47,48),
      rearPlanted:rear.planted,frontPlanted:front.planted,attackArm,kickExtension};
  }
  P.Motion={pose,foot,joint,strike};
})(globalThis.PIGGY=globalThis.PIGGY||{});
