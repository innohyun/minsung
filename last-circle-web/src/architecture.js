import{furnishHouse,facadeDetails}from'./house-details.js';
import{createFarmBarn}from'./farm-architecture.js';
import{localPoint,buildingYaw}from'./building-utils.js';
import{rng}from'./math.js';
import{terrainHeight as groundHeight}from'./map.js';

// All joins are adjacent solids. Slabs, foundations, porches and walls never share a visible face.
const roofHeight=b=>b.h;
export function createArchitecture(buildings){
 const boxes=[],doors=[],windows=[],lootSpots=[];
 for(const b of buildings){if(b.style==='farm-barn'){const barn=createFarmBarn(b);boxes.push(...barn.boxes);lootSpots.push(...barn.lootSpots);continue;}
  const random=rng(b.variant+993),t=.32,external=b.externalStairs,strip=external?0:5.2,side=b.stairSide||1,orientation=b.stairStart||1,main=b.w-strip,center=-side*strip/2;
  b.routes=[];b.rooms=[];b.layoutId=[b.style,b.variant,side,orientation,b.w,b.d,b.roofType].join(':');
  const add=(x,z,w,d,h,y=0,kind='wall',color=b.color,extra={})=>{const p=localPoint(b,x,z,y),shaped=['gable','hiproof','obb'].includes(extra.shape);const q={...p,w:shaped?w:b.rot?d:w,d:shaped?d:b.rot?w:d,h,kind,color,shape:shaped?extra.shape:'box',building:b.index,texture:kind==='wall'?b.wallTexture:kind==='partition'?'plaster':undefined,...extra};if(shaped)q.yaw=buildingYaw(b);boxes.push(q);return q;};
  const groundedStep=(x,z,w,d,top)=>{const corners=[[-w/2,-d/2],[-w/2,d/2],[w/2,-d/2],[w/2,d/2]].map(([a,c])=>localPoint(b,x+a,z+c)),base=Math.min(-.43,...corners.map(q=>groundHeight(q.x,q.z)-b.y))-.025;return add(x,z,w,d,top-base,base,'step',0x8e8876);};
  const visual=(...args)=>{const q=add(...args);q.solid=false;return q;};
  const slab=(x,z,w,d,y,kind='floor',color=0x92734f)=>add(x,z,w,d,.20,y-.20,kind,color);
  const loot=(x,z,y,id,category='floor',floor=0)=>lootSpots.push({...localPoint(b,x,z,y),id:'b'+b.index+'-'+id,building:b.index,floor,zone:b.zone,outdoor:false,category});
  const opening=(axis,fixed,start,end,y,which,exterior=true)=>{
   const cuts=[start,end,...which.flatMap(o=>[Math.max(start,o.at-o.w/2),Math.min(end,o.at+o.w/2)])].filter(x=>x>=start&&x<=end).sort((a,b)=>a-b);
   for(let j=1;j<cuts.length;j++){const a=cuts[j-1],c=cuts[j];if(c-a<.008)continue;const o=which.find(o=>(a+c)/2>o.at-o.w/2+.001&&(a+c)/2<o.at+o.w/2-.001),segments=o?[[0,o.bottom],[o.top,b.level]]:[[0,b.level]];for(const[lo,hi]of segments)if(hi-lo>.005)add(axis==='x'?(a+c)/2:fixed,axis==='z'?(a+c)/2:fixed,axis==='x'?c-a:t,axis==='z'?c-a:t,hi-lo,y+lo,exterior?'wall':'partition',exterior?b.color:0xb2a68a);}
   if(exterior)for(const o of which.filter(o=>o.type==='window')){
    const sx=axis==='z'?Math.sign(fixed):0,sz=axis==='x'?Math.sign(fixed):0,p=localPoint(b,axis==='z'?fixed+sx*t/2:o.at,axis==='x'?fixed+sz*t/2:o.at,y),f=b.flip?-1:1,nx=(b.rot?-sz:sx)*f,nz=(b.rot?sx:sz)*f;
    windows.push({...p,nx,nz,width:o.w,building:b.index,floor:Math.round(y/b.level),bottom:o.bottom,top:o.top});
    visual(axis==='x'?o.at:fixed+sx*.26,axis==='z'?o.at:fixed+sz*.26,axis==='x'?o.w+.25:.32,axis==='z'?o.w+.25:.32,.09,y+o.bottom-.12,'window-sill',0xa9a28e);visual(axis==='x'?o.at:fixed,axis==='z'?o.at:fixed,axis==='x'?o.w-.10:.025,axis==='z'?o.w-.10:.025,.18,y+o.top-.20,'window-glass',0x9cafab);
    const trim=b.variant%3===0?0x657267:0xcac1a7;
    for(const sign of[-1,1])visual(axis==='x'?o.at+sign*(o.w/2+.06):fixed+sx*.205,axis==='z'?o.at+sign*(o.w/2+.06):fixed+sz*.205,axis==='x'?.12:.1,axis==='z'?.12:.1,o.top-o.bottom+.22,y+o.bottom-.11,'window-trim',trim);
    for(const yy of[o.bottom-.10,o.top+.04])visual(axis==='x'?o.at:fixed+sx*.21,axis==='z'?o.at:fixed+sz*.21,axis==='x'?o.w+.22:.12,axis==='z'?o.w+.22:.12,.08,y+yy,'window-trim',trim);
    if(b.variant%3!==1)for(const sign of[-1,1])visual(axis==='x'?o.at+sign*(o.w/2+.35):fixed+sx*.24,axis==='z'?o.at+sign*(o.w/2+.35):fixed+sz*.24,axis==='x'?.45:.08,axis==='z'?.45:.08,o.top-o.bottom,y+o.bottom,'shutter',b.variant%2?0x697b65:0x846449);
   }
  };
  // Outer bounds contain the wall thickness; side walls stop at the inner front/back planes.
  slab(0,0,b.w-2*t,b.d-2*t,0);add(0,0,b.w,b.d,.40,-.60,'foundation',0x726d5a);
  const doorX=((b.variant%5)-2)*.25,doorWidth=b.style==='warehouse'?5.8:b.style==='garage'?3.6:1.35;
  b.doorX=doorX;
  doors.push({...localPoint(b,doorX,-b.d/2+t/2),id:'door-'+b.index,building:b.index,rot:b.rot,flip:b.flip,w:doorWidth-.06,h:b.style==='warehouse'||b.style==='garage'?2.68:2.18,yaw:buildingYaw(b)});
  for(const sign of[-1,1])visual(doorX+sign*(doorWidth/2+.07),-b.d/2-.07,.12,.18,b.style==='warehouse'||b.style==='garage'?2.7:2.23,0,'door-frame',b.variant%2?0xa59b83:0x777b6b);
  for(let floor=0;floor<b.floors;floor++){
   const y=floor*b.level,ww=2.15+(b.variant%4)*.15;
   for(const s of[-1,1]){
    const holes=[-1,1].map(k=>({type:'window',at:k*b.d*.24+(((b.variant+floor*7+s*3+k+19)%7)-3)*.12,w:1.55+((b.variant+floor+k+13)%4)*.27,bottom:.92+((b.variant+floor)%3)*.04,top:2.22+((b.variant+floor)%2)*.04}));
    if(b.annex&&s===-1&&floor===0){const a=b.annex;for(let j=holes.length-1;j>=0;j--)if(Math.abs(holes[j].at-a.z)<a.d/2)holes.splice(j,1);holes.push({type:'door',at:a.z,w:2.7,bottom:0,top:2.7});slab(-b.w/2+t/2,a.z,t,2.7,0);}
    opening('z',s*(b.w/2-t/2),-b.d/2+t,b.d/2-t,y,holes);
   }
   for(const s of[-1,1]){const holes=[-1,1].map(k=>({type:'window',at:k*b.w*(.27+((b.variant+floor+k+17)%3)*.015)+(((b.variant+floor*13+k+19)%5)-2)*.13,w:ww-(floor?((b.variant+k+9)%2)*.35:0),bottom:.94+(b.variant%2)*.05,top:2.24}));if(floor>0&&s<0&&b.variant%3===1)holes.push({type:'window',at:doorX+.14,w:1.1,bottom:1.02,top:2.24});if(floor===0&&s<0)holes.push({type:'door',at:doorX,w:doorWidth,bottom:0,top:b.style==='warehouse'||b.style==='garage'?2.7:2.22});opening('x',s*(b.d/2-t/2),-b.w/2,b.w/2,y,holes);}
  }
  const front=-b.d/2,porchWidth=b.style==='corner-shop'?b.w-1:b.style==='garage'?5.5:b.w*(.5+(b.variant%3)*.1),porchDepth=1.8+(b.variant%3)*.5;
  slab(doorX,front-porchDepth/2,porchWidth,porchDepth,-.035,'porch');
  groundedStep(doorX,front-porchDepth-.35,doorWidth+.5,.7,-.22);groundedStep(doorX,front-porchDepth-.95,doorWidth+.5,.5,-.36);
  if(b.variant%4!==2){slab(doorX,front-porchDepth/2,porchWidth+.15,porchDepth,2.72,b.floors===2?'balcony':'awning',b.roofColor);for(const s of[-1,1])add(doorX+s*(porchWidth/2-.15),front-porchDepth+.2,.16,.16,2.72,0,'post',0x827054);}
  // Alternating staircase lanes and mirrored entry directions create four circulation plans.
  for(let f=1;f<=b.floors;f++){
   const y=f*b.level,end=orientation*(f%2?1:-1),kind=f===b.floors?'roof-deck':'floor';
   slab(external?0:center+side*t/2,0,external?b.w-2*t:main-t,b.d-2*t,y,kind,f===b.floors?0x8d8267:0x92734f);
   if(!external)slab(side*(b.w/2-strip/2-t/2),end*(b.d/2-1-t/2),strip-t,2-t,y,kind);
  }
  const run=external?b.d-2:b.d-4,steps=Math.ceil(b.level/.18);
  if(external){const lane=b.w/2+1.45;b.routes.push([localPoint(b,lane,-run/2,0),localPoint(b,lane,run/2,roofHeight(b)),localPoint(b,b.w/2-.65,b.d/2-1.25,roofHeight(b))]);for(let j=0;j<steps;j++){const z=-run/2+(j+.5)*run/steps,h=(j+1)*b.level/steps;groundedStep(lane,z,2.35,run/steps,h);}slab(b.w/2+1.15,b.d/2-1,2.94,1.65,b.h+.02,'roof-deck');groundedStep(lane,-run/2-.9,2.7,.9,-.20);groundedStep(lane,-run/2-.225,2.7,.45,0);}

  for(let f=0;!external&&f<b.floors;f++){
   const lane=side*(b.w/2-(f%2?3.9:1.3)),dir=orientation*(f%2?-1:1);
   b.routes.push([localPoint(b,lane,-dir*run/2,f*b.level),localPoint(b,lane,dir*(b.d/2-.85),(f+1)*b.level),localPoint(b,side*(b.w/2-strip-.8),dir*(b.d/2-1.6),(f+1)*b.level)]);
   for(let j=0;j<steps;j++){const z=-dir*run/2+dir*(j+.5)*run/steps,h=(j+1)*b.level/steps;add(lane,z,2.35,run/steps,h,f*b.level,'step',0x8e8876);}
  }
  const roof=b.h,towerX=side*(b.w/2-strip/2),exit=orientation*(b.floors%2?1:-1),passZ=exit*(b.d/2-1.75),inner=side*(b.w/2-strip);
  if(!external){const last=b.floors-1,dir=orientation*(last%2?-1:1),lane=side*(b.w/2-(last%2?3.9:1.3)),headZ=dir*(b.d/2-2.38),depth=4.42,outerX=lane+side*1.42,innerX=lane-side*1.42,lo=headZ-depth/2,hi=headZ+depth/2,opening=[dir*(b.d/2-2.70),dir*(b.d/2-.55)].sort((a,c)=>a-c);
   slab(lane,headZ,3.08,depth+.10,roof+2.35,'stair-roof',0x85897d);
   add(outerX,headZ,.24,depth,2.35,roof,'stairwall',b.color,{texture:b.wallTexture});
   add(lane,dir*(b.d/2-.17),2.62,.24,2.35,roof,'stairwall',b.color,{texture:b.wallTexture});
   add(lane,dir*(b.d/2-4.59),2.62,.20,.50,roof+1.85,'stairwall',b.color,{texture:b.wallTexture});
   for(const[a,c]of[[lo,opening[0]],[opening[1],hi]])if(c-a>.02)add(innerX,(a+c)/2,.24,c-a,2.35,roof,'stairwall',b.color,{texture:b.wallTexture});
   add(innerX,(opening[0]+opening[1])/2,.24,opening[1]-opening[0],.20,roof+2.15,'stairwall',b.color,{texture:b.wallTexture});
  }
  if(b.roofType!=='terrace')add(center,0,main-.08,b.d-.05,1.4+(b.variant%5)*.16,roof+.015,'pitched-roof',b.roofColor,{shape:b.roofType,texture:'tile'});
  else{for(const s of[-1,1])add(center,s*(b.d/2-.12),main-.05,.24,.64,roof+.015,'parapet',b.color);add(-(external?1:side)*(b.w/2-.12),0,.24,b.d-.48,.64,roof+.015,'parapet',b.color);}
  // Rooms and furnishings stay on the wide side, with a 1.4m hall beside the stairs.
  const roomMin=center-main/2+t,roomMax=center+main/2-t,roomCenter=(roomMin+roomMax)/2;
  for(let f=0;f<b.floors;f++){
   if(b.style==='warehouse'){for(const side of[-1,1])for(let row=0;row<4;row++){const x=side*b.w*.28,z=-b.d*.23+row*b.d*.17,height=.75+(row%3)*.65;add(x,z,3.8,2.6,height,0,'cargo-crate',0x8d7755);for(let k=0;k<3;k++)loot(x+(k-1)*.7,z,height+.10,'cargo-'+side+'-'+row+'-'+k,'table',f);loot(side*2,z,.10,'aisle-'+side+'-'+row,'floor',f);}b.rooms.push({floor:f,plan:'cargo',center:0,splitZ:0,doorAt:0});continue;}
   const y=f*b.level,plan=(b.variant+f)%4,splitZ=(plan<2?1:-1)*b.d*(.08+(b.variant%7)*.009),partitionStart=roomMin+(side<0?1.4:.05),partitionEnd=roomMax-(side>0?1.4:.05);
   if(partitionEnd-partitionStart>2.4){const gapAt=roomCenter+(plan%2?.65:-.4),left=gapAt-1.2,right=gapAt+1.2;for(const[a,c]of[[partitionStart,left],[right,partitionEnd]])if(c-a>.1)add((a+c)/2,splitZ,c-a,.22,2.85,y,'partition',0xb2a68a);}
   if(plan>1&&main>10){const x=roomMin+main*.31,z=splitZ+(splitZ>0?-1:1)*b.d*.19;add(x,z,.22,b.d*.24,2.7,y,'partition',0xb2a68a);}
   b.rooms.push({floor:f,plan,splitZ,center:roomCenter,doorAt:roomCenter+(plan%2?.65:-.4)});
   const tableX=roomCenter+(plan%2?.24:-.2),tableZ=-b.d*.30;add(tableX,tableZ,2.6,1.05,.80,y,'table',0x92734f);
   for(let k=0;k<3;k++)loot(tableX+(k-1)*.72,tableZ,y+.91,'f'+f+'-table'+k,'table',f);
   furnishHouse(b,{add,visual,loot,roomMin,roomMax,roomCenter,plan,floor:f,y});
   for(const[k,z]of[-.12,.17].entries())for(const[j,x]of[roomCenter-.8,roomCenter+.85].entries())loot(x,z*b.d,y+.09,'f'+f+'-floor'+k+'-'+j,'floor',f);
  }
  facadeDetails(b,{visual,center,main});
  if(b.style==='garage'||b.style==='workshop'){add(roomCenter,b.d*.05,1.8,1.1,.78,0,'workbench',0x826345);for(const s of[-1,1])visual(roomCenter+s*.6,b.d*.05,.18,.55,.08,.78,'tool',0x606d70);}
  if(b.style==='clinic'){for(const s of[-1,1])visual(doorX+s*.25,front-.21,.4,.05,.08,2.95,'sign',0xe0e2cf);visual(doorX,front-.22,.16,.05,.6,2.68,'sign',0xb65d51);}
  if(b.style==='corner-shop'){add(roomCenter,-b.d*.02,Math.min(4,main-2),.65,.95,0,'counter',0x826345);visual(doorX,front-.22,doorWidth+.8,.08,.48,2.76,'shop-sign',0x62796e);}
  if(b.style==='summit-lodge'){visual(0,front-.24,4,.12,.55,2.8,'summit-sign',0xb9a56c);add(roomMin+1,b.d*.2,1.3,1.3,1.3,0,'stove',0x484b4c);for(const side of[-1,1])visual(side*(b.w/2-.7),front-.4,.28,.28,4.2,0,'summit-tower',0x82734e);}
  if(b.style==='hunter'||b.style==='lumberjack'){
   if(b.style==='hunter'){add(roomMin+.9,-b.d*.02,.9,.9,.9,0,'stove',0x454e48);add(roomMin+.9,-b.d*.02,.18,.18,1.8,.9,'chimney',0x62675a);visual(roomMin+.6,b.d*.25,.8,1.8,.18,.56,'bedroll',0x5e7153);}
   else{add(roomMin+.8,-b.d*.02,1.2,2,.8,0,'workbench',0x987142);for(let k=0;k<4;k++)add(roomMin+.7,b.d*.35-k*.5,.6,.4,.28,0,'split-wood',0x9b733f);visual(roomMin+.5,-.4,.07,.12,1.05,.5,'axe-handle',0x967547);visual(roomMin+.5,-.4,.18,.4,.22,1.4,'axe-head',0x65726c);}
  }
  if(b.annex){const a=b.annex;add(a.x,a.z,a.w,a.d,.4,-.6,'foundation',0x726d5a);slab(a.x,a.z,a.w,a.d-2*t,0);for(const s of[-1,1])opening('x',a.z+s*(a.d/2-t/2),a.x-a.w/2,a.x+a.w/2,0,[{type:'window',at:a.x,w:2,bottom:1,top:2.25}]);opening('z',a.x-a.w/2+t/2,a.z-a.d/2+t,a.z+a.d/2-t,0,[{type:'window',at:a.z,w:2.4,bottom:1,top:2.25}]);slab(a.x,a.z,a.w,a.d,3.4,'annex-roof',b.roofColor);add(a.x-.5,a.z+1,2,1,.7,0,'table',0x92734f);for(let k=0;k<3;k++)loot(a.x-.5+(k-1)*.6,a.z+1,.81,'annex-table'+k,'table');}
 }
 return{boxes,doors,windows,lootSpots};
}
