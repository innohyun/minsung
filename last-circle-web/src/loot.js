import{LOOT_SPOTS,POIS,BUILDINGS,rng,blocked,supportHeight}from'./world.js';
import{WEAPONS}from'./weapons.js';
const shuffle=(a,r)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function usableLootSpot(s){const floor=supportHeight(s.x,s.z,s.y+.04);return s.y-floor>=.045&&s.y-floor<.21&&!blocked(s.x,s.z,s.y,.12,.25);}
let validSpots;
export const GUN_WEIGHTS=[16,14,15,8,8,12,11,3,8,5];
export function weaponQuota(total){const counts=GUN_WEIGHTS.map(w=>Math.floor(total*w/100));for(let i=0,n=total-counts.reduce((a,b)=>a+b,0);i<n;i++)counts[i%counts.length]++;return counts;}
export function createLoot(seed,round){
 validSpots??=LOOT_SPOTS.filter(usableLootSpot);const r=rng(seed+round*173),items=[],used=new Set(),total=POIS.reduce((n,p)=>n+p.guns,0),pool=shuffle(weaponQuota(total).flatMap((n,w)=>Array(n).fill(w)),r);let sequence=0;
 const groups=new Map(POIS.map(p=>[p.id,{inside:shuffle(validSpots.filter(s=>s.zone===p.id&&!s.outdoor),r),outside:shuffle(validSpots.filter(s=>s.zone===p.id&&s.outdoor),r)}]));
 function place(item,spot){used.add(spot.id);items.push({...spot,...item,id:'loot-'+round+'-'+(++sequence)});}
 function pair(list,building){for(let a=0;a<list.length;a++)if(!used.has(list[a].id)&&(building===undefined||list[a].building===building))for(let b=a+1;b<list.length;b++)if(!used.has(list[b].id)&&list[b].building===list[a].building&&Math.hypot(list[a].x-list[b].x,list[a].z-list[b].z)<2.2&&Math.abs(list[a].y-list[b].y)<.25){const companion=list.splice(b,1)[0],spot=list.splice(a,1)[0];return{spot,companion};}throw Error('보급품을 놓을 수 있는 짝 위치가 부족해요: '+building);}
 const common=w=>['ar','bullpup','smg'].includes(WEAPONS[w].family);
 function gun(list,building,guarantee=false){const index=guarantee?pool.findIndex(common):0;if(index<0||!pool.length)throw Error('무기 할당량이 부족해요.');const w=pool.splice(index,1)[0],q=pair(list,building);place({kind:'weapon',weapon:w,magAmmo:WEAPONS[w].magazine,gunUID:'gun-'+round+'-'+sequence},q.spot);place({kind:'ammo',caliber:WEAPONS[w].caliber,amount:WEAPONS[w].magazine*2},q.companion);}
 // Reserve one useful gun set in each individual house before any random extras can use its spots.
 for(const poi of POIS){const g=groups.get(poi.id),houses=BUILDINGS.filter(b=>b.zone===poi.id);for(const b of houses)gun(g.inside,b.index,true);g.done=houses.length;}
 for(const poi of POIS.filter(p=>p.kind==='camp')){const g=groups.get(poi.id);gun(g.outside,undefined,true);gun(g.outside,undefined,true);g.outDone=2;}
 for(const poi of POIS){const g=groups.get(poi.id);for(let n=g.outDone||0;n<poi.outdoor;n++)gun(g.outside);for(let n=g.done;n<poi.guns-poi.outdoor;n++)gun(g.inside);}
 // Each building also gets a treatment item, giving the injury timer a useful local escape route.
 for(const b of BUILDINGS){const list=groups.get(b.zone).inside,spot=list.find(s=>s.building===b.index&&!used.has(s.id));if(spot)place({kind:b.index%3?'med':'pain',amount:1},spot);}
 const supplies=shuffle([...Array(45).fill('vest'),...Array(45).fill('helmet'),...Array(40).fill('med'),...Array(35).fill('pain'),...Array(32).fill('grenade'),...Array(28).fill('smoke'),...Array(24).fill('flash'),...Array(24).fill('molotov'),...Array(15).fill('fuel'),...Array(20).fill('pistolAmmo'),...Array(96).fill('coin')],r),remaining=shuffle(validSpots.filter(s=>!used.has(s.id)),r);
 for(const kind of supplies){const spot=remaining.pop();if(!spot)break;if(kind==='coin'){place({kind:'coin',amount:20+Math.floor(r()*36)},spot);continue;}place(kind==='vest'||kind==='helmet'?{kind:'armor',armor:kind,amount:100}:kind==='pistolAmmo'?{kind:'ammo',caliber:'9mm',amount:20}:{kind,amount:['grenade','smoke','flash','molotov'].includes(kind)?2:1},spot);}
 return items;
}
