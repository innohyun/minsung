/** Tiny synthesized sound palette. Nothing is downloaded; silent until an input gesture. */
(function(P){let context=null;P.Audio={
 unlock(){try{context ||= new (window.AudioContext||window.webkitAudioContext)();context.resume().catch(()=>{});}catch{}},
 play(name){if(!P.state?.settings.sound||!context)return;try{const t=context.currentTime,o=context.createOscillator(),g=context.createGain();o.connect(g);g.connect(context.destination);o.type=name==='hit'?'triangle':'sine';const f={coin:840,hit:160,heal:520,chest:680,warning:240,skill:340}[name]||440;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(name==='coin'?f*1.5:f*.5,t+.12);g.gain.setValueAtTime(.04,t);g.gain.exponentialRampToValueAtTime(.001,t+.17);o.start(t);o.stop(t+.18);}catch{}}
};})(globalThis.PIGGY = globalThis.PIGGY || {});
