/** Local Web Audio foley: soil steps, strikes, ceramic clinks and rewards. */
(function(P){
  'use strict';
  let context=null,master=null,analyser=null,lastPlayed='',playCount=0,suppressed=0;const last=new Map(),counts={};let voices=0,windowStart=0,windowCount=0;
  function tone(t,f,end,duration,volume=.025,type='sine'){
    if(voices>=24)return;voices++;const o=context.createOscillator(),g=context.createGain();o.type=type;
    o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);
    g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(master);o.onended=()=>{voices--;o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.01);
  }
  function noise(t,duration,frequency,volume=.025){
    if(voices>=24)return;voices++;const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
    const src=context.createBufferSource(),f=context.createBiquadFilter(),g=context.createGain();src.buffer=buffer;f.type='lowpass';f.frequency.value=frequency;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    src.connect(f);f.connect(g);g.connect(master);src.onended=()=>{voices--;src.disconnect();f.disconnect();g.disconnect();};src.start(t);src.stop(t+duration+.01);
  }
  P.Audio={
    unlock(){
      try{
        if(!context){context=new (window.AudioContext||window.webkitAudioContext)();master=context.createGain();master.gain.value=1;
          analyser=context.createAnalyser();analyser.fftSize=256;master.connect(analyser);analyser.connect(context.destination);}
        return context.resume().then(()=>context.state==='running').catch(()=>false);
      }catch{return Promise.resolve(false);}
    },
    status(){return context?.state||'locked';},
    diagnostics(){return {state:context?.state||'locked',lastPlayed,playCount,suppressed,voices,counts:{...counts},volume:P.state?.settings.volume};},
    energy(){if(!analyser)return 0;const samples=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);return Math.sqrt(samples.reduce((n,v)=>n+v*v,0)/samples.length);},
    play(name){
      if(!P.state?.settings.sound||!context||context.state!=='running')return;
      try{
        const t=context.currentTime,key=name.includes('step')?'footsteps':name,spacing=name.includes('step')?.16:name==='hit'?.065:.075;
        if(t-windowStart>.025){windowStart=t;windowCount=0;}if(windowCount>=3){suppressed++;return;}windowCount++;
        if(t-(last.get(key)??-100)<spacing){suppressed++;return;}last.set(key,t);counts[name]=(counts[name]||0)+1;master.gain.value=(P.state.settings.volume??.8)*3.5;lastPlayed=name;playCount++;
        const action=name.replace(/^(companion|monster)-/,'');
        if(action==='bow-draw'){noise(t,.19,1900,.026);tone(t,170,340,.18,.015,'triangle');}
        else if(action==='bow-reload'){noise(t,.10,1600,.025);tone(t,480,260,.09,.009);}
        else if(action==='bow-release'||action==='arrow-hit'){noise(t,.10,3400,.036);tone(t,390,140,.10,.016,'triangle');}
        else if(action==='sword-down'||action==='sword-side'){noise(t,action==='sword-down'?.18:.13,4200,.047);tone(t,action==='sword-down'?290:420,80,.17,.022,'triangle');}
        else if(action==='pillar'||action==='fireball'||action==='flight'){noise(t,.24,2800,.04);tone(t,120,330,.18,.017,'sawtooth');}
        else if(action==='fire-explosion'){noise(t,.29,1200,.055);tone(t,95,25,.27,.029,'triangle');}
        else if(action==='heal'){tone(t,520,780,.18,.019);tone(t+.06,780,1040,.22,.014);}
        else if(action==='barrier'||action==='barrier-hit'){tone(t,action==='barrier'?460:180,action==='barrier'?690:60,.16,.025,'triangle');noise(t,.08,1700,.028);}
        else if(action==='punch'||action==='claw'){noise(t,.09,action==='claw'?2600:1400,.039);tone(t,135,55,.10,.019,'triangle');}
        else if(action==='kick'||action==='push'){noise(t,.13,1800,.039);tone(t,110,40,.13,.023,'triangle');}
        else if(action==='dodge'||action==='dash'||action==='leap'){noise(t,.12,3200,.029);tone(t,280,120,.11,.012,'triangle');}
        else if(action==='death'||action==='fall'||action==='hurt'){noise(t,.12,750,.024);tone(t,130,40,.18,.018,'triangle');}
        else if(action==='charge'){noise(t,.23,900,.035);tone(t,85,42,.23,.026,'triangle');}
        else if(action==='slam'||action==='spikes'){noise(t,.18,650,.05);tone(t,100,28,.24,.033,'triangle');}
        else if(action==='guard'||action==='reflect'){noise(t,.075,2400,.033);tone(t,350,160,.12,.027,'triangle');}
        else if(action==='venom'){noise(t,.13,1100,.038);tone(t,280,95,.14,.018,'triangle');}
        else if(action==='volley'){noise(t,.15,1700,.04);tone(t,180,320,.13,.021,'triangle');}
        else if(action==='step'||action==='run-step'){noise(t,.055,650,.012);tone(t,80,38,.065,.007,'triangle');}
        else if(name==='dig'){noise(t,.16,900,.07);tone(t,120,42,.16,.028,'triangle');}
        else if(name==='arrow'){noise(t,.11,3300,.04);tone(t,360,170,.09,.015);}
        else if(name==='step'||name==='run-step'){noise(t,.07,650,.024);tone(t,name==='step'?80:105,38,.07,.012,'triangle');}
        else if(name==='punch'){noise(t,.10,1500,.040);tone(t,130,62,.10,.02,'triangle');}
        else if(name==='kick'){noise(t,.14,2600,.045);tone(t,98,42,.14,.025,'triangle');}
        else if(name==='spin'){noise(t,.22,3400,.045);tone(t,165,58,.18,.023,'triangle');}
        else if(name==='wood'){noise(t,.075,850,.095);tone(t,165,82,.16,.08,'triangle');tone(t+.018,320,135,.09,.025);}
        else if(name==='hit'){noise(t,.055,700,.08);tone(t,88,32,.13,.045,'triangle');}
        else if(name==='coin'){tone(t,960,1160,.15,.024);tone(t+.065,1450,1630,.15,.019);}
        else if(name==='carry'){tone(t,610,560,.11,.018);tone(t+.025,970,900,.09,.009);}
        else if(name==='chest'||name==='clear'){[520,690,870].forEach((f,i)=>tone(t+i*.09,f,f*1.02,.23,.018));}
        else if(name==='heal'){tone(t,440,880,.22,.025);}
        else if(name==='warning'){tone(t,190,140,.16,.033,'triangle');}
        else tone(t,340,680,.17,.022);
      }catch{}
    }
  };
})(globalThis.PIGGY=globalThis.PIGGY||{});
