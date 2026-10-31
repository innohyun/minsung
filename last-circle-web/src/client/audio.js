export class GameAudio {
 constructor(){this.ctx=null;this.enabled=true;this.counts={shot:0,step:0,reload:0,hit:0};}
 unlock(){if(!this.ctx){try{this.ctx=new AudioContext();const n=this.ctx.sampleRate;this.noise=this.ctx.createBuffer(1,n, this.ctx.sampleRate);const d=this.noise.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;}catch{return;}}if(this.ctx.state==='suspended')this.ctx.resume();}
 gain(volume,duration,pan=0){const c=this.ctx,t=c.currentTime,g=c.createGain();g.gain.setValueAtTime(Math.max(.0001,volume),t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);const p=c.createStereoPanner();p.pan.value=Math.max(-1,Math.min(1,pan));g.connect(p);p.connect(c.destination);return g;}
 noiseBurst(volume,duration,freq,pan=0,type='lowpass'){const c=this.ctx,s=c.createBufferSource(),f=c.createBiquadFilter();s.buffer=this.noise;f.type=type;f.frequency.value=freq;s.connect(f);f.connect(this.gain(volume,duration,pan));s.start(c.currentTime,Math.random()*.5);s.stop(c.currentTime+duration);}
 tone(volume,freq,end,duration,pan=0){const c=this.ctx,o=c.createOscillator();o.type='triangle';o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(end,c.currentTime+duration);o.connect(this.gain(volume,duration,pan));o.start();o.stop(c.currentTime+duration);}
 play(kind,{distance=0,pan=0,weapon=0,run=false,prone=false,material='dirt'}={}){
  if(!this.ctx||!this.enabled||kind==='nearMiss'&&distance>=7||kind==='impact'&&distance>=22)return;this.counts[kind]=(this.counts[kind]||0)+1;
  const v=1/(1+distance*.12);
  if(kind==='shot'){this.noiseBurst((weapon===3?.42:.30)*v,weapon===4?.2:.12,[5100,4200,6500,3300,2900][weapon]||4200,pan);this.tone(.22*v,[95,75,150,56,68][weapon]||95,35,.16,pan);this.noiseBurst(.06*v,.25,1800,pan,'bandpass');}
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
