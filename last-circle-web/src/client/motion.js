import {integrateMovement,supportHeight} from '../world.js';
export class Motion {
 constructor(){this.reset();}
 reset(){this.physics=null;this.offset={x:0,y:0,z:0};this.display=null;this.receivedTime=0;this.serverTime=0;this.dropUntil=0;}
 receive(p,serverTime,now,input,oneWay=0){
  if(!p)return;
  const old=this.display&&{...this.display};
  const next={...p};
  if(now<this.dropUntil&&next.onPlane){next.onPlane=false;if(this.physics){next.y=this.physics.y;next.vy=this.physics.vy;}}
  for(let t=0;t<Math.min(.18,oneWay);t+=.015)integrateMovement(next,input,Math.min(.015,Math.min(.18,oneWay)-t),serverTime+t);
  this.physics=next;this.serverTime=serverTime+Math.min(.18,oneWay);this.receivedTime=now;
  if(!old||Math.hypot(old.x-next.x,old.y-next.y,old.z-next.z)>24){this.offset={x:0,y:0,z:0};this.display={...next};}
  else this.offset={x:old.x-next.x,y:old.y-next.y,z:old.z-next.z};
 }
 action(action,now){
  const p=this.physics;if(!p||p.dead)return;
  if(action==='jump'){
   if(p.onPlane){p.onPlane=false;this.dropUntil=now+1400;}
   else if(p.y<=supportHeight(p.x,p.z,p.y+.15)+.15)p.vy=5.2;
  }
 }
 frame(dt,input,now){
  if(!this.physics)return null;
  let left=dt;while(left>.00001){const d=Math.min(.016,left);integrateMovement(this.physics,input,d,this.serverTime+(now-this.receivedTime)/1000);left-=d;}
  const decay=Math.exp(-dt*11);for(const k of ['x','y','z'])this.offset[k]*=decay;
  this.display={...this.physics,x:this.physics.x+this.offset.x,y:this.physics.y+this.offset.y,z:this.physics.z+this.offset.z,yaw:input.yaw,pitch:input.pitch,aim:input.aim,crouch:input.crouch};
  return this.display;
 }
}
