import {LOOT_SPOTS,POIS,rng,blocked,supportHeight} from './world.js';
import {WEAPONS} from './weapons.js';
const shuffle=(a,random)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
export function usableLootSpot(spot){const floor=supportHeight(spot.x,spot.z,spot.y+.04);return spot.y-floor>=.045&&spot.y-floor<.21&&!blocked(spot.x,spot.z,spot.y,.12,.25);}
let validSpots;
export function createLoot(seed,round){
 validSpots??=LOOT_SPOTS.filter(usableLootSpot);
 const random=rng(seed+round*173),types=shuffle([...Array(36).fill(0),...Array(30).fill(1),...Array(30).fill(2),...Array(12).fill(3),...Array(12).fill(4)],random),items=[];let sequence=0;
 const globalSupplies=shuffle([...Array(30).fill('vest'),...Array(30).fill('helmet'),...Array(40).fill('med'),...Array(30).fill('pain'),...Array(30).fill('grenade')],random);
 const used=new Set(),byZone=new Map();
 for(const p of POIS)byZone.set(p.id,{inside:shuffle(validSpots.filter(l=>l.zone===p.id&&!l.outdoor),random),outside:shuffle(validSpots.filter(l=>l.zone===p.id&&l.outdoor),random)});
 function place(item,spot){used.add(spot.id);items.push({...spot,...item,id:'loot-'+round+'-'+(++sequence)});}
 function takeSpot(list){let s=list.shift();while(s&&used.has(s.id))s=list.shift();if(!s)throw Error('보급품 위치가 부족해요.');return s;}
 const regionTypes=new Map();
 for(const poi of [...POIS.filter(p=>p.kind==='camp'),...POIS.filter(p=>p.kind!=='camp')]){const min=poi.kind==='camp'?2:poi.kind==='village'?6:poi.kind==='training'?16:poi.kind==='resort'||poi.kind==='port'?12:4,assigned=[];for(let n=0;n<min;n++){const index=poi.kind==='camp'?types.indexOf(n===0?0:2):types.findIndex(t=>t<3);assigned.push(types.splice(index,1)[0]);}regionTypes.set(poi.id,assigned);}
 for(const poi of POIS){const assigned=regionTypes.get(poi.id);while(assigned.length<poi.guns)assigned.push(types.shift());}
 for(const poi of [...POIS.filter(p=>p.kind==='camp'),...POIS.filter(p=>p.kind!=='camp')]){
  const group=byZone.get(poi.id);for(let i=0;i<poi.guns;i++){
   const type=regionTypes.get(poi.id)[i],candidates=i<poi.outdoor?group.outside:group.inside;
   let pair=null;for(let a=0;a<candidates.length&&!pair;a++)for(let b=a+1;b<candidates.length;b++)if(Math.hypot(candidates[a].x-candidates[b].x,candidates[a].z-candidates[b].z)<2.2&&Math.abs(candidates[a].y-candidates[b].y)<.25){const companion=candidates.splice(b,1)[0],spot=candidates.splice(a,1)[0];pair={spot,companion};break;}
   if(!pair)throw Error('연결된 탄약 보급 위치가 부족해요.');const {spot,companion}=pair;
   place({kind:'weapon',weapon:type,magAmmo:WEAPONS[type].magazine,gunUID:'gun-'+round+'-'+sequence},spot);
   place({kind:'ammo',caliber:WEAPONS[type].caliber,amount:WEAPONS[type].magazine*2},companion);
  }
 }
 const remaining=shuffle(validSpots.filter(l=>!used.has(l.id)),random);
 for(const kind of globalSupplies){const spot=takeSpot(remaining);place(kind==='vest'||kind==='helmet'?{kind:'armor',armor:kind,amount:100}:{kind,amount:kind==='grenade'?2:1},spot);}
 return items;
}
