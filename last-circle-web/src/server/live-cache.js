// Per-isolate fan-out avoids one database read for every connected viewer.
const stores=new WeakMap(),workerBinding={};
function store(env){const key=env.DB.sqlite?env.DB:workerBinding;let s=stores.get(key);if(!s){s=new Map();stores.set(key,s);}return s;}
function entry(env,code){const s=store(env);let e=s.get(code);if(!e){e={live:null,at:0,pending:null,listeners:new Set()};s.set(code,e);if(s.size>96)for(const[k,v]of s)if(!v.listeners.size&&Date.now()-v.at>30000)s.delete(k);}return e;}
export function rememberLive(env,live){const e=entry(env,live.code);if(e.live&&(e.live.revision||0)>live.revision)return;const copy=structuredClone(live);e.live=copy;e.at=Date.now();for(const send of e.listeners)send(copy);}
export function watchLive(env,code,send){const e=entry(env,code);e.listeners.add(send);return()=>e.listeners.delete(send);}
export async function readLive(env,code){const e=entry(env,code);if(e.live&&Date.now()-e.at<120)return e.live;if(!e.pending)e.pending=(async()=>{const row=await env.DB.prepare('SELECT state,version FROM room_live WHERE code=?').bind(code).first();if(row){const live=JSON.parse(row.state);if(!e.live||live.revision>=e.live.revision){e.live=live;e.at=Date.now();}}return e.live;})().finally(()=>{e.pending=null;});return e.pending;}
