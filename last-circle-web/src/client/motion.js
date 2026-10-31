import {integrateMovement,beginJump} from '../world.js';
const damp=(x,target,velocity,dt,smooth=.095)=>{const w=2/smooth,q=w*dt,e=1/(1+q+.48*q*q+.235*q*q*q),change=x-target,temp=(velocity+w*change)*dt;return{value:target+(change+temp)*e,velocity:(velocity-w*temp)*e};};
export class Motion{
 constructor(){this.reset();}
 reset(){this.physics=null;this.display=null;this.velocity={x:0,y:0,z:0};this.received=0;this.serverTime=0;this.dropUntil=0;}
 receive(p,time,now,input,oneWay=0){if(!p)return;const next={...p,vault:p.vault?{...p.vault}:null};
  if(now<this.dropUntil&&next.onPlane&&this.physics){Object.assign(next,{onPlane:false,gliding:true,chute:true,y:this.physics.y,vy:this.physics.vy,glideYaw:this.physics.glideYaw,vx:this.physics.vx,vz:this.physics.vz});}
  for(let t=0;t<Math.min(.15,oneWay);t+=.015)integrateMovement(next,input,Math.min(.015,Math.min(.15,oneWay)-t),time+t,this.doors,this.vehicles);
  if(!this.display||Math.hypot(next.x-this.display.x,next.y-this.display.y,next.z-this.display.z)>35){this.display={...next};this.velocity={x:next.vx||0,y:next.vy||0,z:next.vz||0};}
  this.physics=next;this.serverTime=time+Math.min(.15,oneWay);this.received=now;
 }
 action(action,now){if(!this.physics)return;if(action==='jump'){const was=this.physics.onPlane;beginJump(this.physics,this.doors,this.vehicles);if(was)this.dropUntil=now+1600;}}
 frame(dt,input,now){if(!this.physics)return null;let left=dt;while(left>.00001){const d=Math.min(.016,left);integrateMovement(this.physics,input,d,this.serverTime+(now-this.received)/1000,this.doors,this.vehicles);left-=d;}
  const p=this.physics,last=this.display;const result={...p,yaw:input.yaw,pitch:input.pitch,view:input.view,aim:input.aim,grenadeAim:input.grenadeAim,reload:Math.max(0,(p.reload||0)-(now-this.received)/1000),switchLeft:Math.max(0,(p.switchLeft||0)-(now-this.received)/1000)};
  for(const axis of ['x','y','z']){const filtered=damp(last[axis],p[axis],this.velocity[axis],dt,p.gliding?.11:.085);result[axis]=filtered.value;this.velocity[axis]=filtered.velocity;}
  // Never let a delayed airborne snapshot make the camera bounce upward during descent.
  if(p.gliding&&p.vy<0&&result.y>last.y){result.y=last.y;this.velocity.y=Math.min(0,this.velocity.y);}
  this.display=result;return result;
 }
}
