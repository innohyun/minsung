import * as T from 'three';
import{WEAPONS}from'../weapons.js';
const PROFILES={
 m416:{width:.14,height:.17,body:.50,stock:'rail',rail:9,handguard:.14,foregrip:true},
 akm:{width:.13,height:.15,body:.54,stock:'wood',woodFront:true,handguard:.12,curved:true},
 ump45:{width:.125,height:.16,body:.32,stock:'skeleton',handguard:.13},
 kar98k:{width:.10,height:.12,body:.54,stock:'wood'},
 s12k:{width:.16,height:.19,body:.53,stock:'skeleton',handguard:.17},
 aug:{width:.19,height:.19,body:.58},
 vector:{width:.14,height:.18,body:.28,stock:'rail',rail:5},
 awm:{width:.13,height:.16,body:.61,stock:'thumbhole',bipod:true,brake:true},
 mini14:{width:.10,height:.12,body:.57,stock:'wood',handguard:.11},
 m249:{width:.21,height:.23,body:.57,stock:'skeleton',handguard:.18},
 p10:{width:.10,height:.115,body:.19},
 groza:{width:.17,height:.22,body:.51,handguard:.13,curved:true},
 mk14:{width:.15,height:.17,body:.58,stock:'precision',rail:8,bipod:true,handguard:.15},
 'summit-300':{width:.145,height:.15,body:.64,stock:'precision',rail:12,brake:true,handguard:.10,bipod:true}
};
export function createWeaponModel(parent,index,{geo,mat,box,M}){const w=WEAPONS[index],group=new T.Group();parent.add(group);group.name='weapon-'+w.id;const pistol=w.family==='pistol',bull=w.family==='bullpup',bolt=w.family==='bolt',lmg=w.family==='lmg',compact=w.family==='smg',metal=mat(w.color,{metalness:.5,roughness:.43}),black=M.dark,wood=mat(index===1||index===3?'#a87a4b':'#526762');
  const profile=PROFILES[w.id],body=box(group,0,0,bull?-.08:0,profile.width,profile.height,profile.body,metal,true);group.userData.silhouette=w.id;
  const barrel=new T.Mesh(geo.cylinder,black);barrel.position.set(0,.03,w.length*.34);barrel.rotation.x=Math.PI/2;barrel.scale.set(pistol?.035:.055,w.length*.54,pistol?.035:.055);group.add(barrel);
  box(group,0,pistol?-.10:-.13,pistol?-.045:-.08,pistol?.075:.085,pistol?.18:.23,pistol?.10:.12,black,true);
  if(!pistol&&!profile.stock)box(group,0,-.01,-w.length*.32,bolt?.13:.16,.20,w.length*.26,wood,true);
  if(index===6){box(group,0,-.07,.1,.15,.29,.18,metal,true);box(group,0,-.17,.18,.07,.16,.09,black);}
  if(bull)box(group,0,-.08,.15,.07,.14,.09,black,true);
  const magazine=box(group,0,pistol?-.18:-.19,bull?-.22:pistol?-.045:.1,lmg?.28:index===4?.14:pistol?.055:.075,lmg?.25:pistol?.06:bolt?.09:.26,lmg?.28:index===4?.22:.14,lmg?mat('#8c8c5e'):black,true);
  if(lmg){box(group,0,.14,.05,.14,.09,.5,black);for(const side of[-1,1]){const leg=box(group,side*.09,-.13,.58,.035,.36,.035,black);leg.rotation.z=side*.32;}}
  const opticalHeight=w.sight==='dot'||w.sight==='holo'?.245:w.sight==='scope'?.18:pistol?.088:.13;
  if(w.sight==='scope'){const scope=new T.Mesh(geo.cylinder,black);scope.rotation.x=Math.PI/2;scope.position.set(0,opticalHeight,.03);scope.scale.set(w.family==='dmr'?.11:.145,w.family==='dmr'?.32:.48,w.family==='dmr'?.11:.145);group.add(scope);box(group,0,.11,0,.09,.1,.2,black);}
  else if(w.sight==='dot'){box(group,0,.12,0,.075,.09,.09,black);const rim=new T.Mesh(new T.TorusGeometry(.068,.011,6,24),black);rim.position.set(0,opticalHeight,-.025);group.add(rim);const glass=new T.Mesh(new T.CircleGeometry(.057,24),new T.MeshBasicMaterial({color:'#85c3ba',transparent:true,opacity:.07,side:T.DoubleSide,depthWrite:false}));glass.position.copy(rim.position);group.add(glass);}
  else if(w.sight==='holo'){box(group,0,.12,0,.11,.08,.09,black);for(const side of[-1,1]){box(group,side*.087,opticalHeight,-.025,.018,.16,.07,black,true);box(group,0,opticalHeight+side*.075,-.025,.185,.018,.07,black,true);}}
  else{for(const side of[-1,1])box(group,side*(pistol?.028:.05),pistol?.071:.12,-.08,.012,pistol?.038:.06,.025,black);box(group,0,pistol?.056:.085,w.length*.43,.018,pistol?.042:.075,.032,black);}
  if(w.sight==='dot'||w.sight==='holo'){const dot=new T.Mesh(new T.SphereGeometry(.0038,8,6),new T.MeshBasicMaterial({color:w.sight==='holo'?'#a5ff97':'#ff5144',toneMapped:false}));dot.position.set(0,opticalHeight,.022);group.add(dot);}
  // Each receiver, stock, fore-end and magazine has an individual silhouette.
  const add=(x,y,z,sx,sy,sz,m=black,angle=0)=>{const part=box(group,x,y,z,sx,sy,sz,m,true);part.rotation.x=angle;return part;};
  const stock=profile.stock;if(stock==='rail'){for(const side of[-1,1])add(side*.045,.035,-w.length*.36,.023,.028,w.length*.32);add(0,-.025,-w.length*.53,.12,.21,.045);}
  if(stock==='skeleton'){for(const side of[-1,1])add(side*.055,-.01,-w.length*.37,.026,.035,w.length*.30);add(0,-.02,-w.length*.52,.14,.22,.045);}
  if(stock==='wood'){add(0,-.015,-w.length*.32,.15,.19,w.length*.39,wood);add(0,-.015,.22,.12,.105,w.length*.34,wood);}
  if(stock==='precision'){add(0,.075,-w.length*.34,.15,.08,.24,metal);add(0,-.04,-w.length*.48,.15,.28,.065,black);add(0,.025,-w.length*.37,.045,.035,.31,black);}
  if(stock==='thumbhole'){add(0,.075,-w.length*.32,.15,.075,.32,metal);add(0,-.13,-w.length*.37,.15,.06,.28,metal);add(0,-.025,-w.length*.49,.15,.25,.06,metal);}
  if(profile.rail){for(let i=0;i<profile.rail;i++)add(0,.115,.13+i*.035,.13,.018,.016);}
  if(profile.foregrip)add(0,-.20,.28,.065,.22,.07,black,.10);
  if(profile.handguard){add(0,.005,.25,profile.handguard,.125,.27,profile.woodFront?wood:metal);for(const side of[-1,1])for(let j=0;j<4;j++)add(side*(profile.handguard/2+.002),.025,.15+j*.055,.008,.027,.028,black);}
  if(profile.curved){magazine.visible=false;for(let i=0;i<4;i++)add(0,-.17-i*.058,.1-i*i*.007,.075,.07,.12,black,-i*.13);}
  if(w.id==='vector'){add(0,-.19,.08,.18,.30,.22,metal);add(0,-.28,-.07,.055,.28,.09);}
  if(w.id==='aug'){add(0,-.05,.1,.19,.22,.24,metal);add(0,-.19,.27,.055,.19,.06,metal,.18);}
  if(w.id==='groza'){add(0,.09,.06,.075,.075,.44,black);add(0,-.12,-.25,.09,.27,.15,black,-.18);add(0,-.14,.31,.07,.12,.09);}
  if(w.id==='kar98k'){add(.11,.07,-.08,.19,.025,.025,metal);const boltHandle=add(.20,.025,-.08,.035,.11,.035,black);boltHandle.rotation.z=-.4;}
  if(w.id==='s12k'){add(0,.08,.2,.055,.055,.56,black);add(0,-.11,.07,.14,.21,.22,metal);}
  if(w.id==='m249'){add(0,.24,.10,.035,.12,.28,black);add(-.16,-.12,.06,.18,.25,.26,mat('#8b8257'));}
  if(w.id==='p10'){add(0,.015,.055,.103,.075,.25,metal);for(const side of[-1,1])for(let i=0;i<5;i++)add(side*.052,.025,-.07+i*.013,.005,.055,.006,black);}
  if(profile.bipod){for(const side of[-1,1]){const leg=add(side*.09,-.14,.43,.025,.35,.025,black);leg.rotation.z=side*.45;}}
  if(profile.brake)add(0,.03,w.length*.59,.09,.07,.12,black);
  const flash=new T.Mesh(new T.ConeGeometry(pistol?.07:.13,pistol?.19:.36,5),new T.MeshBasicMaterial({color:'#ffe495'}));flash.rotation.x=Math.PI/2;flash.position.set(0,.03,w.length*.66);flash.visible=false;group.add(flash);return{group,magazine,flash,opticalHeight};
 }
