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
    if(o.companionRun){hip[1]+=14*moving;shoulder[1]+=14*moving;head[1]+=14*moving;shoulder[0]+=19*moving;head[0]+=23*moving;}
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
    if(o.pose==='dig'){const q=Math.sin(clamp(age/.4,0,1)*Math.PI);shoulder[0]+=q*10;hip[1]+=q*8;shoulder[1]+=q*12;head[1]+=q*12;rearFoot=[-10,0];frontFoot=[10,0];}
    if(o.hit){shoulder[0]-=6;head[0]-=9;}
    if(o.carrying){shoulder[0]*=.15;head[0]*=.15;shoulder[1]=-147+bob*.25;head[1]=-173+bob*.25;}
    if(o.blocking){hip[1]+=32;shoulder[1]+=32;head[1]+=32;rearFoot=[-12,0];frontFoot=[12,0];}
    // Side-view projection: the far shoulder lies behind the near shoulder.
    // Plant the feet and rotate/shift the torso before solving either arm.
    if(o.companionId==='archer'&&o.pose==='bow'){
      const pull=smooth((age-.43)/.43),recoil=strike(age-.94,.025,.02,.18);
      rearFoot=[-25,0];frontFoot=[29,0];hip[0]=-5-pull*3;hip[1]=-91;
      shoulder[0]=-3-pull*4-recoil*3;shoulder[1]=-143;head[0]=shoulder[0]-1;head[1]=-169;
    }
    if(o.companionId==='flame'&&o.pose==='cast'){
      const brace=smooth(age/.22),pulse=Math.sin(age*17)*.5;
      rearFoot=[-27,0];frontFoot=[23,0];hip[0]=-8*brace;hip[1]=-85;
      shoulder[0]=-10*brace+pulse;shoulder[1]=-138;head[0]=shoulder[0]+1;head[1]=-165;
    }
    if(o.companionId==='sword'&&o.pose==='sword'){
      const down=strike(age-.24,.12,.1,.18),sweep=strike(age-.83,.12,.11,.21);
      rearFoot=[-27,0];frontFoot=[26+sweep*12,0];hip[0]=-6+down*13+sweep*15;hip[1]=-86-down*6;
      shoulder[0]=-9+down*20+sweep*26;shoulder[1]=-137-down*5;head[0]=shoulder[0]+1;head[1]=shoulder[1]-26;
    }
    const rearShoulder=[...shoulder],frontShoulder=[...shoulder];
    if(['bow','cast','sword'].includes(o.pose)&&o.companionId){rearShoulder[0]-=4;rearShoulder[1]-=1;frontShoulder[0]+=3;}
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
    if(o.pose==='dig'){rearArm=aimArm(rearShoulder,[24,-98],-1);frontArm=aimArm(frontShoulder,[47,-102],-1);}
    if(o.carrying){
      // Separate shoulder/hand lanes and outward elbows support the ceramic base without crossing.
      rearArm=aimArm(rearShoulder,[-31,-196],1);frontArm=aimArm(frontShoulder,[31,-196],-1);
    }
    else if(o.companionId){
      if(o.pose==='bow'){
        const lift=smooth(age/.28),draw=smooth((age-.43)/.43),release=smooth((age-.94)/.12);
        frontArm=aimArm(frontShoulder,point([25,-118],[54,-145],lift),-1);
        // Retrieve over the far shoulder, nock, draw to the cheek, then release.
        const retrieval=point([-19,-145],[-27,-167],smooth(age/.16));
        const nock=[frontArm.hand[0]-22,frontArm.hand[1]];
        const back=age<.28?retrieval:age<.43?point(retrieval,nock,smooth((age-.28)/.15)):point(point(nock,[-10,-153],draw),[-4,-146],release);
        rearArm=aimArm(rearShoulder,back,1);
      }
      if(o.pose==='cast'||o.pose==='heal'||o.pose==='barrier'){
        frontArm=aimArm(frontShoulder,point([24,-119],[50,-140],smooth(age/.23)),-1);rearArm=fkArm(rearShoulder,-.6,1.8);
      }
      if(o.pose==='sword'){
        const down=age>=.32&&age<.64,side=age>=.8;
        const target=age<.24?point([10,-157],[0,-189],smooth(age/.24)):age<.51?point([0,-189],[44,-108],smooth((age-.24)/.13)):age<.84?point([44,-108],[-25,-143],smooth((age-.51)/.25)):point([-25,-143],[52,-127],smooth((age-.84)/.15));
        frontArm=aimArm(frontShoulder,target,-1);
        const v=o.weaponGrip||[0,-1];rearArm=aimArm(rearShoulder,[frontArm.hand[0]-v[0]*10,frontArm.hand[1]-v[1]*10],1);
      }
      if(o.pose==='push'){frontArm=aimArm(frontShoulder,[59,-126],-1);rearArm=aimArm(rearShoulder,[49,-141],-1);}
      if(o.pose==='dodge'){rearFoot=[-26,-24];frontFoot=[22,-34];rearArm=fkArm(rearShoulder,-.65,1.1);frontArm=fkArm(frontShoulder,.55,1);}
    }
    else if(o.playerShield){frontArm=aimArm(frontShoulder,[32,o.blocking?-74:-113]);}
    return {hip,shoulder,rearShoulder,frontShoulder,head,rearFoot,frontFoot,
      rearHand:rearArm.hand,frontHand:frontArm.hand,rearElbow:rearArm.elbow,frontElbow:frontArm.elbow,
      rearKnee:joint(hip,rearFoot,47,48),frontKnee:joint(hip,frontFoot,47,48),
      rearPlanted:rear.planted,frontPlanted:front.planted,attackArm,kickExtension,turn,spinArc};
  }
  P.Motion={pose,foot,joint,strike};
})(globalThis.PIGGY=globalThis.PIGGY||{});
