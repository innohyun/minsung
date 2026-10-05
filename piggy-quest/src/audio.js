/** Local Web Audio foley: soil steps, strikes, ceramic clinks and rewards. */
(function(P){
  'use strict';
  let context=null,master=null,analyser=null,lastPlayed='',playCount=0;
  function tone(t,f,end,duration,volume=.025,type='sine'){
    const o=context.createOscillator(),g=context.createGain();o.type=type;
    o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.008);
    g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(master);o.start(t);o.stop(t+duration+.01);
  }
  function noise(t,duration,frequency,volume=.025){
    const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
    const src=context.createBufferSource(),f=context.createBiquadFilter(),g=context.createGain();src.buffer=buffer;f.type='lowpass';f.frequency.value=frequency;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.009);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    src.connect(f);f.connect(g);g.connect(master);src.start(t);src.stop(t+duration+.01);
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
    diagnostics(){return {state:context?.state||'locked',lastPlayed,playCount,volume:P.state?.settings.volume};},
    energy(){if(!analyser)return 0;const samples=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);return Math.sqrt(samples.reduce((n,v)=>n+v*v,0)/samples.length);},
    play(name){
      if(!P.state?.settings.sound||!context||context.state!=='running')return;
      try{
        const t=context.currentTime;master.gain.value=(P.state.settings.volume??.8)*3.5;lastPlayed=name;playCount++;
        if(name==='dig'){noise(t,.16,900,.07);tone(t,120,42,.16,.028,'triangle');}
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
