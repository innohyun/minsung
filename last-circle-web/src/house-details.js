// Furnish real rooms around the existing collision-safe stair hall and loot sites.
// New small details are visual; the large sofa, beds and cabinets remain cover.
export function furnishHouse(b,{add,visual,loot,roomMin,roomMax,roomCenter,plan,floor,y}){
 const side=b.stairSide||1,bathSide=-side,bathX=bathSide<0?roomMin+1.15:roomMax-1.15,bathInner=bathSide<0?roomMin+2.45:roomMax-2.45,shelfX=roomCenter-bathSide*.8,shelfZ=b.d/2-.56;
 const white=0xc5bfae,dark=0x4f534c,wood=0x897155,cloth=[0x6c756c,0x8a7965,0x6b777a,0x86765e][b.variant%4],service=['garage','workshop','storehouse'].includes(b.style);
 function chair(x,z,angle=0){visual(x,z,.48,.48,.09,y+.44,'chair-seat',wood);visual(x,z+.20,.48,.08,.53,y+.5,'chair-back',wood);for(const a of[-1,1])for(const c of[-1,1])visual(x+a*.18,z+c*.18,.045,.045,.44,y,'chair-leg',dark);}
 if(!service){const tx=roomCenter+(plan%2?.24:-.2),tz=-b.d*.30;chair(tx-.6,tz+.92);if(b.variant%3)chair(tx+.62,tz+.94);if(b.variant%5<2)chair(tx,tz-1.0);}
 if(service){for(const s of[-1,1]){add(roomCenter+s*2.3,b.d*.28,1.2,1,.9,y,'storage-cabinet',0x7f8170);for(let n=0;n<3;n++)visual(roomCenter+s*2.3,b.d*.28,1.22,1.02,.025,y+.18+n*.28,'cabinet-seam',dark);}for(let k=0;k<3;k++)visual(roomCenter+(k-1)*.42,-b.d*.3,.20,.25,.16,y+.82,'workshop-tool',0x6f7169);}
 else if(b.style==='clinic'){add(roomCenter,b.d*.3,1.85,.78,.62,y,'examination-bed',0xb1b5aa);visual(roomCenter,b.d*.3,1.75,.72,.07,y+.62,'examination-pad',0x81958a);add(roomMin+.48,0,.7,2.0,1.7,y,'medical-cabinet',0xbfc4b7);for(let k=0;k<4;k++)visual(roomMin+.48,-.65+k*.44,.24,.2,.18,y+1.4,'medical-bottle',0xa1b79e);}
 else{
  // Compact working kitchen against the wall opposite the stair circulation.
  const kitchenX=side>0?roomMin+.43:roomMax-.43,kz=-b.d*.045;
  add(kitchenX,kz,.72,2.5,.85,y,'kitchen-cabinet',b.variant%2?0x9c9b86:0x7c887c);visual(kitchenX,kz,.79,2.58,.045,y+.85,'countertop',0x555950);
  for(let k=0;k<3;k++){visual(kitchenX+side*.37,kz-.82+k*.82,.025,.035,.24,y+.43,'cabinet-handle',0x424943);visual(kitchenX+side*.365,kz-.41+k*.82,.02,.018,.68,y+.12,'cabinet-seam',0x5f6659);}
  visual(kitchenX,kz-.6,.54,.57,.055,y+.90,'sink-rim',0xb6bdb5,{shape:'ellipsoid'});visual(kitchenX,kz-.6,.42,.43,.022,y+.93,'sink-basin',0x58665f,{shape:'ellipsoid'});visual(kitchenX-side*.16,kz-.6,.035,.035,.22,y+.93,'water-tap',0xa3aea9);visual(kitchenX-side*.08,kz-.6,.19,.035,.035,y+1.12,'water-tap',0xa3aea9);
  for(const a of[-1,1])for(const c of[-1,1])visual(kitchenX+a*.16,kz+.6+c*.16,.16,.16,.02,y+.90,'stove-ring',0x323c38,{shape:'cylinder'});
  add(kitchenX,kz+1.88,.70,.68,1.79,y,'refrigerator',0xb6b8ab);visual(kitchenX+side*.36,kz+1.88,.018,.69,.025,y+1.17,'fridge-seam',0x606b61);visual(kitchenX+side*.39,kz+1.66,.03,.035,.29,y+.87,'fridge-handle',0x5a665e);
  // A lived-in sitting area, with separate cushions and a low coffee table.
  const sofaX=roomCenter-bathSide*1.8,sofaZ=-b.d*.11;
  add(sofaX,sofaZ,2.2,.88,.38,y,'sofa-base',cloth);visual(sofaX,sofaZ+.36,2.2,.15,.52,y+.38,'sofa-back',cloth);
  for(const a of[-1,1]){add(sofaX+a*1.04,sofaZ,.15,.88,.58,y,'sofa-arm',cloth);visual(sofaX+a*.49,sofaZ-.02,.90,.68,.13,y+.38,'sofa-cushion',cloth);visual(sofaX+a*.77,sofaZ+.15,.30,.20,.30,y+.53,'sofa-pillow',b.variant%2?0xa49679:0x7c897b);}
  visual(sofaX,sofaZ-1.12,1.2,.68,.065,y+.38,'coffee-table',wood);for(const a of[-1,1])visual(sofaX+a*.46,sofaZ-1.12,.06,.5,.37,y,'coffee-leg',dark);visual(sofaX+.2,sofaZ-1.12,.26,.19,.035,y+.42,'book',0x948b64);
  // Side bathroom: an actual small room with a clear doorway and raised tile finish.
  const z0=b.d*.24,z1=b.d/2-.34,mid=(z0+z1)/2,gap=mid-.22;
  add(bathX,z0,2.38,.17,2.45,y,'bath-partition',0xbcb9a7,{texture:'plaster'});
  for(const[lo,hi]of[[z0,gap-.58],[gap+.58,z1]])if(hi-lo>.12)add(bathInner,(lo+hi)/2,.17,hi-lo,2.45,y,'bath-partition',0xbcb9a7,{texture:'plaster'});
  add(bathInner,gap,.17,1.16,.32,y+2.13,'bath-lintel',0xbcb9a7,{texture:'plaster'});
  visual(bathX,mid,2.25,z1-z0-.12,.016,y+.002,'bath-tile',0xb6b7aa);
  const toiletX=bathX-bathSide*.35,toiletZ=z1-.60;
  visual(toiletX,toiletZ,.38,.48,.33,y+.03,'toilet-base',white,{shape:'ellipsoid'});visual(toiletX,toiletZ-.06,.43,.58,.09,y+.34,'toilet-seat',0xd2cfc0,{shape:'ellipsoid'});visual(toiletX,toiletZ-.06,.28,.35,.02,y+.43,'toilet-bowl',0x7e8b81,{shape:'ellipsoid'});visual(toiletX,toiletZ+.27,.43,.15,.44,y+.36,'toilet-tank',white);
  visual(bathX+bathSide*.53,z0+.42,.49,.48,.12,y+.74,'bath-sink',white,{shape:'ellipsoid'});visual(bathX+bathSide*.53,z0+.42,.36,.34,.02,y+.85,'bath-basin',0x6c7970,{shape:'ellipsoid'});visual(bathX+bathSide*.53,z0+.57,.035,.035,.21,y+.83,'water-tap',0xa3aea9);
  visual(bathX-bathSide*.71,z1-.83,.83,1.25,.035,y+.02,'shower-tray',0xbdbbae);visual(bathX-bathSide*.75,z1-.20,.025,.025,1.75,y+.3,'shower-pipe',0x8b9992);visual(bathX-bathSide*.75,z1-.34,.17,.22,.045,y+1.97,'shower-head',0x7e8e85);
  if(floor>0||b.floors===1){const bx=bathSide<0?roomMax-2.05:roomMin+2.05,bz=b.d*.29;add(bx,bz,1.74,2.18,.34,y,'bed',wood);add(bx,bz,1.65,2.08,.16,y+.34,'mattress',cloth);visual(bx,bz+.94,1.78,.10,.76,y,'bed-headboard',wood);visual(bx,bz+.65,1.16,.42,.13,y+.5,'bed-pillow',0xc3bba1);visual(bx,bz-.34,1.66,1.12,.045,y+.51,'bed-blanket',cloth);}
  else{visual(roomCenter+bathSide*1.6,b.d*.30,1.8,.40,.58,y,'media-cabinet',wood);visual(roomCenter+bathSide*1.6,b.d*.30,1.15,.07,.65,y+.60,'television',0x374440);}
  b.rooms.at(-1).zones=['entry','living','hall','kitchen','bathroom',floor>0||b.floors===1?'bedroom':'dining'];
 }
 add(side>0?roomMin+.45:roomMax-.45,b.d*.39,.65,.9,1.55,y,'cabinet',wood);
 add(shelfX,shelfZ,2.5,.48,1.15,y,'shelf',wood);
 for(let k=0;k<3;k++)loot(shelfX+(k-1)*.7,shelfZ,y+1.26,'f'+floor+'-shelf'+k,'shelf',floor);
 return{shelfX,shelfZ};
}
export function facadeDetails(b,{visual,center,main}){const base=b.h+.025;
 // Ridge runs along local Z. Small overhangs, gutters and drainage distinguish a roof from a box.
 if(b.roofType!=='terrace')for(const side of[-1,1]){const x=center+side*(main/2+.12);visual(x,0,.24,b.d+.46,.10,base-.04,'eaves',0x7a7568);visual(x+side*.12,0,.12,b.d+.35,.08,base-.10,'gutter',0x646e66);if((b.variant+side)%3)visual(x+side*.12,b.d/2-.55,.075,.075,b.h-.15,.04,'downpipe',0x69736b);}
 else for(const side of[-1,1])visual(center+side*(main/2-.12),0,.30,b.d-.12,.08,base+.65,'parapet-cap',0xaaa596);
 if(b.variant%3!==1){const x=(b.variant%2?1:-1)*b.w*.24,z=b.d*.24;visual(x,z,.54,.54,.95,b.h+.25,'house-chimney',0x83786a,{texture:'brick'});visual(x,z,.65,.65,.07,b.h+1.20,'chimney-cap',0x657167);}
 for(const side of[-1,1]){const x=side*(b.w/2-.16);visual(x,0,.09,b.d-.7,.16,.16,'wall-plinth',0x8d8979);}
}
