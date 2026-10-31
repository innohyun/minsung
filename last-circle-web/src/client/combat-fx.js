import{segmentDistance}from'../throwables.js';
export function shotCues(shot,listener,yaw=0){const cues=[],pan=point=>Math.max(-1,Math.min(1,((point[0]-listener[0])*Math.cos(yaw)-(point[2]-listener[2])*Math.sin(yaw))/8));
 const misses=shot.rays||[shot.to];if(!shot.hits?.some(h=>h.id===listener.id))for(const end of misses){const near=segmentDistance(shot.from,end,listener);if(near.distance<7){cues.push({kind:'nearMiss',distance:near.distance,pan:pan(near.point)});break;}}
 for(const hit of shot.impacts||[]){const distance=Math.hypot(...hit.point.map((v,i)=>v-listener[i]));if(distance<22)cues.push({kind:'impact',distance,pan:pan(hit.point),material:hit.material});}return cues;
}
export function vehicleCameraYaw(yaw,target,dt){const d=Math.atan2(Math.sin(target-yaw),Math.cos(target-yaw));return yaw+d*(1-Math.exp(-dt*4.8));}
