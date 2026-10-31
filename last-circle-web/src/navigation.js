import {ROADS,BRIDGES,riverX,branchZ,riverDistance,terrainHeight,BUILDINGS,POIS} from './world.js';
const nodes=[],links=[],grid=new Map();
function add(p){const id=nodes.length;nodes.push(p);links.push([]);const key=Math.floor(p.x/12)+','+Math.floor(p.z/12);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(id);return id;}
for(const road of ROADS){let previous=null;for(let i=0;i<road.points.length;i+=3){const p=road.points[i],id=add({x:p.x,z:p.z,y:p.y});if(previous!==null){const d=Math.hypot(p.x-nodes[previous].x,p.z-nodes[previous].z);links[id].push([previous,d]);links[previous].push([id,d]);}previous=id;}const id=add(road.points.at(-1));if(previous!==null){const d=Math.hypot(nodes[id].x-nodes[previous].x,nodes[id].z-nodes[previous].z);links[id].push([previous,d]);links[previous].push([id,d]);}}
for(let i=0;i<nodes.length;i++){const p=nodes[i],cx=Math.floor(p.x/12),cz=Math.floor(p.z/12);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const j of grid.get((cx+dx)+','+(cz+dz))||[])if(j>i){const q=nodes[j],distance=Math.hypot(p.x-q.x,p.z-q.z);if(distance<9){links[i].push([j,distance]);links[j].push([i,distance]);}}}
const island=(x,z)=>x>riverX(z)?2:z>branchZ(x)?1:0;
function nearest(p){let best=Infinity,index=0;const area=island(p.x,p.z);for(let i=0;i<nodes.length;i++){const q=nodes[i];if(island(q.x,q.z)!==area)continue;const d=(p.x-q.x)**2+(p.z-q.z)**2;if(d<best){best=d;index=i;}}return index;}
function direct(a,b){const d=Math.hypot(a.x-b.x,a.z-b.z);if(d>180)return false;for(let t=0;t<1;t+=8/Math.max(8,d)){const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(riverDistance(x,z)<17&&!BRIDGES.some(q=>Math.abs(x-q.x)<q.w/2&&Math.abs(z-q.z)<q.d/2))return false;}return true;}
export function routeBetween(a,b){if(direct(a,b))return[{x:b.x,z:b.z}];const start=nearest(a),end=nearest(b),dist=new Float64Array(nodes.length).fill(Infinity),prev=new Int32Array(nodes.length).fill(-1),open=new Set([start]);dist[start]=0;
 while(open.size){let current=-1,best=Infinity;for(const i of open){const score=dist[i]+Math.hypot(nodes[i].x-nodes[end].x,nodes[i].z-nodes[end].z);if(score<best){best=score;current=i;}}if(current===end)break;open.delete(current);for(const[next,cost]of links[current])if(dist[current]+cost<dist[next]){dist[next]=dist[current]+cost;prev[next]=current;open.add(next);}}
 if(!Number.isFinite(dist[end]))return[{x:b.x,z:b.z}];const ids=[];for(let i=end;i!==-1;i=prev[i]){ids.push(i);if(i===start)break;}ids.reverse();const path=ids.map(i=>({x:nodes[i].x,z:nodes[i].z}));path.push({x:b.x,z:b.z});return path;
}
export function closestRegion(p){return POIS.reduce((best,q)=>Math.hypot(p.x-q.x,p.z-q.z)<Math.hypot(p.x-best.x,p.z-best.z)?q:best,POIS[0]);}
export const navigationStats=()=>({nodes:nodes.length,edges:links.reduce((n,a)=>n+a.length,0)/2});
