import {WEAPONS} from './weapons.js';
import {supportHeight,blocked,terrainHeight} from './world.js';
export function activeGun(p){return p.loadout?.[p.activeSlot]||null;}
export function syncLoadout(p,keepDrawn=false){
 p.guns=Array(5).fill(false);p.ammo=Array(5).fill(0);
 for(const gun of p.loadout||[])if(gun){p.guns[gun.weapon]=true;p.ammo[gun.weapon]=gun.ammo;}
 const gun=activeGun(p);if(gun){if(!keepDrawn)p.weapon=gun.weapon;p.ammo[gun.weapon]=gun.ammo;}
 if(keepDrawn&&p.switchOld){p.ammo[p.switchFrom]=p.switchOld.ammo;}
 p.stowedWeapon=p.loadout?.[1-p.activeSlot]?.weapon??null;
}
export function setMagazine(p,amount){const gun=activeGun(p);if(gun)gun.ammo=amount;syncLoadout(p,p.switchLeft>0&&p.switchLeft>p.switchTotal/2);}
export function giveWeapon(p,weapon,ammo=WEAPONS[weapon].magazine,slot){
 if(!p.loadout)p.loadout=[null,null];const free=p.loadout.findIndex(g=>!g),target=slot??(free<0?p.activeSlot:free);
 p.loadout[target]={uid:'fixture-'+p.id+'-'+weapon+'-'+target,weapon,ammo};if(!activeGun(p))p.activeSlot=target;syncLoadout(p);return p.loadout[target];
}
export function startSwitch(p,toSlot){
 if(!Number.isInteger(toSlot)||toSlot<0||toSlot>1||toSlot===p.activeSlot||!p.loadout[toSlot]||p.reload||p.switchLeft||p.vehicleId||p.usingPain)return false;
 p.switchFromSlot=p.activeSlot;p.switchToSlot=toSlot;p.switchFrom=p.weapon;p.switchTo=p.loadout[toSlot].weapon;p.switchOld={...activeGun(p)};p.switchLeft=p.switchTotal=1.45;p.input.fire=false;syncLoadout(p,true);return true;
}
export function advanceSwitch(p,dt){if(!p.switchLeft)return;p.switchLeft=Math.max(0,p.switchLeft-dt);if(p.switchLeft<=p.switchTotal/2){p.activeSlot=p.switchToSlot;syncLoadout(p);}if(!p.switchLeft)p.switchOld=null;}
function dropPosition(p,s){
 const sx=Math.sin(p.yaw),sz=Math.cos(p.yaw);
 for(const side of[1,-1,0]){const x=p.x+sx*.65+Math.cos(p.yaw)*side*.65,z=p.z+sz*.65-Math.sin(p.yaw)*side*.65,y=supportHeight(x,z,p.y+.6,s.vehicles);if(!blocked(x,z,y+.1,.12,.3,0,s.doors,s.vehicles))return{x,y:y+.1,z};}
 return{x:p.x,y:supportHeight(p.x,p.z,p.y+.6)+.1,z:p.z};
}
export function takeWeapon(s,p,item,requestedSlot){
 if(p.switchLeft||p.reload)return false;const free=p.loadout.findIndex(g=>!g),slot=Number.isInteger(requestedSlot)&&requestedSlot>=0&&requestedSlot<2?requestedSlot:free<0?p.activeSlot:free,old=p.loadout[slot],held=activeGun(p);
 const gun={uid:item.gunUID||item.id,weapon:item.weapon,ammo:item.magAmmo??WEAPONS[item.weapon].magazine};
 if(old)s.loot.push({id:'drop-'+s.round+'-'+(++s.itemSeq),kind:'weapon',weapon:old.weapon,magAmmo:old.ammo,gunUID:old.uid,...dropPosition(p,s),category:'dropped',outdoor:true});
 p.loadout[slot]=gun;
 if(!held){p.activeSlot=slot;syncLoadout(p);return true;}
 if(slot!==p.activeSlot){startSwitch(p,slot);}else{
  p.switchFromSlot=slot;p.switchToSlot=slot;p.switchFrom=p.weapon;p.switchTo=gun.weapon;p.switchOld={...old};p.switchLeft=p.switchTotal=1.45;p.input.fire=false;syncLoadout(p,true);
 }
 return true;
}
export function dropEquipment(s,p){
 if(p.dropped)return;p.dropped=true;const items=[];
 for(const gun of p.loadout||[])if(gun)items.push({id:gun.uid,kind:'weapon',weapon:gun.weapon,magAmmo:gun.ammo,gunUID:gun.uid});
 for(const[caliber,amount]of Object.entries(p.bag))if(amount>0)items.push({id:'ammo-'+caliber,kind:'ammo',caliber,amount});
 for(const[field,kind]of[['meds','med'],['painkillers','pain'],['grenades','grenade']])if(p[field]>0)items.push({id:kind,kind,amount:p[field]});
 if(p.armor>0)items.push({id:'vest',kind:'armor',armor:'vest',amount:p.armor});if(p.helmet>0)items.push({id:'helmet',kind:'armor',armor:'helmet',amount:p.helmet});
 if(items.length)s.containers.push({id:'fallen-'+s.round+'-'+p.id,name:p.name,...dropPosition(p,s),items});
 p.loadout=[null,null];p.bag={556:0,762:0,45:0,'12g':0};p.meds=p.painkillers=p.grenades=p.armor=p.helmet=0;p.switchLeft=0;syncLoadout(p);
}
