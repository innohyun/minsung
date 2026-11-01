import{WEAPONS}from'../weapons.js';
export class GameAudio {
 constructor(){this.ctx=null;this.enabled=true;this.counts={shot:0,step:0,reload:0,hit:0};}
 unlock(){if(!this.ctx){try{this.ctx=new AudioContext();const master=this.master=this.ctx.createGain(),limiter=this.ctx.createDynamicsCompressor();master.gain.value=.8;limiter.threshold.value=-12;limiter.ratio.value=5;limiter.attack.value=.008;limiter.release.value=.18;master.connect(limiter);limiter.connect(this.ctx.destination);const n=this.ctx.sampleRate;this.noise=this.ctx.createBuffer(1,n, this.ctx.sampleRate);const d=this.noise.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;}catch{return;}}if(this.ctx.state==='suspended')this.ctx.resume();}
 gain(volume,duration,pan=0){const c=this.ctx,t=c.currentTime,g=c.createGain();g.gain.setValueAtTime(Math.max(.0001,volume),t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);const p=c.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));g.connect(p);p.connect(this.master||c.destination);return g;}
 noiseBurst(volume,duration,freq,pan=0,type='lowpass'){const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter();s.buffer=this.noise;f.type=type;f.frequency.value=freq;s.connect(f);f.connect(this.gain(volume,duration,pan));s.start(c.currentTime,Math.random()*.5);s.stop(c.currentTime+duration);}
 tone(volume,freq,end,duration,pan=0){const c=this.ctx,o=c.createOscillator();o.type='triangle';o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(end,c.currentTime+duration);o.connect(this.gain(volume,duration,pan));o.start();o.stop(c.currentTime+duration);}
 water(volume=1,step=false){const c=this.ctx,duration=step?.25:.65,t=c.currentTime,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=this.noise;filter.type='lowpass';filter.frequency.setValueAtTime(step?650:1000,t);filter.frequency.exponentialRampToValueAtTime(240,t+duration);gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime((step?.12:.28)*volume,t+.025);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);source.connect(filter);filter.connect(gain);gain.connect(this.master||c.destination);source.start(t,Math.random()*.2);source.stop(t+duration);for(let n=0;n<(step?2:5);n++){const at=t+.04+n*(step?.065:.075),o=c.createOscillator(),g=c.createGain();o.type='sine';const f=100+Math.random()*190;o.frequency.setValueAtTime(f,at);o.frequency.exponentialRampToValueAtTime(f*.65,at+.08);g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime((step?.022:.04)*volume,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+.11);o.connect(g);g.connect(this.master||c.destination);o.start(at);o.stop(at+.12);}}
 wind(intensity=0){if(!this.ctx)return;if(!this.windSource){const c=this.ctx,source=this.windSource=c.createBufferSource(),filter=c.createBiquadFilter(),gain=this.windGain=c.createGain();source.buffer=this.noise;source.loop=true;filter.type='lowpass';filter.frequency.value=650;gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();}this.windGain.gain.setTargetAtTime(this.enabled?Math.max(0,Math.min(1,intensity))*.034:0,this.ctx.currentTime,.2);}
 coin(){const c=this.ctx,t=c.currentTime;if(t-(this.lastCoin??-10)<.045)return;this.lastCoin=t;const notes=[660,740,880,988,880,740],frequency=notes[(this.coinIndex=(this.coinIndex||0)+1)%notes.length];for(const[delay,multiple,level]of[[0,1,.031],[.045,1.5,.012]]){const o=c.createOscillator(),g=c.createGain(),at=t+delay;o.type='sine';o.frequency.value=frequency*multiple;g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(level,at+.008);g.gain.exponentialRampToValueAtTime(.0001,at+.20);o.connect(g);g.connect(this.master);o.start(at);o.stop(at+.21);}}
 play(kind,{distance=0,pan=0,weapon=0,run=false,prone=false,material='dirt'}={}){
  if(!this.ctx||!this.enabled||kind==='nearMiss'&&distance>=7||kind==='impact'&&distance>=22)return;this.counts[kind]=(this.counts[kind]||0)+1;
  const v=1/(1+distance*.12);if(kind==='coin')this.coin();if(kind==='trap'){this.noiseBurst(.065*v,.09,1700,pan,'bandpass');this.tone(.035*v,420,170,.12,pan);}
  if(kind==='shot'){const family=WEAPONS[weapon]?.family,pistol=family==='pistol';if(pistol){this.noiseBurst(.18*v,.075,3300,pan);this.tone(.1*v,125,55,.10,pan);return;}this.noiseBurst((weapon===3?.42:.30)*v,weapon===4?.2:.12,[5100,4200,6500,3300,2900][weapon]||4200,pan);this.tone(.22*v,[95,75,150,56,68][weapon]||95,35,.16,pan);this.noiseBurst(.06*v,.25,1800,pan,'bandpass');}
  if(kind==='chute'){this.noiseBurst(.11,.65,1100,0,'bandpass');this.noiseBurst(.065,.20,320,0);this.tone(.025,145,85,.25);}
  if(kind==='splash')this.water(v,false);
  if(kind==='waterStep')this.water(v,true);
  if(kind==='step'){this.noiseBurst((prone?.035:run?.12:.075)*v,.09,600,pan,'bandpass');this.tone(.055*v,90,42,.07,pan);}
  if(kind==='reload'){this.noiseBurst(.09*v,.065,2600,pan,'highpass');this.tone(.035*v,540,230,.07,pan);}
  if(kind==='hit'){this.noiseBurst(.10,.11,900,0);this.tone(.08,100,42,.14);}
  if(kind==='explosion'){this.noiseBurst(.65*v,.7,550,pan);this.tone(.4*v,75,24,.55,pan);}
  if(kind==='zone'){this.tone(.045,520,760,.18);}
  if(kind==='nearMiss'){const level=(1-distance/7)**2;this.noiseBurst(.12*level,.12,3200,pan,'bandpass');this.tone(.035*level,1800,420,.105,pan);}
  if(kind==='impact'){const level=(1-distance/22)**2,hard=/metal|container|outcrop|wall|stone|arena/.test(material);this.noiseBurst((hard?.12:.065)*level,.07,hard?2600:950,pan,'bandpass');if(hard)this.tone(.035*level,750,230,.06,pan);}
  if(kind==='hiss')this.noiseBurst(.10*v,.65,2200,pan,'bandpass');
  if(kind==='shatter')this.noiseBurst(.17*v,.23,4600,pan,'highpass');
  if(kind==='flash')this.tone(.018,3200,2100,2.1);
  if(kind==='confirm'){this.tone(.025,950,1250,.07);}
 }
}
