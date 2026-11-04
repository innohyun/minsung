import{assetRoute}from'./assets.js';
// Keep terrain and collision construction out of the edge isolate's startup
// budget. The cached module is initialized once, on the first game request.
let realtime;
const loadRealtime=()=>realtime??=import('../realtime/worker.js');
export class MatchRoom{
 constructor(ctx,env){this.instance=loadRealtime().then(({MatchRoom})=>new MatchRoom(ctx,env));}
 async fetch(req){return(await this.instance).fetch(req);}
}
export function routeServer(req,env,ctx){const url=new URL(req.url);env={...env,SITE_ORIGIN:env.SITE_ORIGIN||url.origin};if(url.pathname.startsWith('/assets/')||url.pathname.startsWith('/api/admin/assets/'))return assetRoute(req,env);if(url.pathname.startsWith('/rooms/'))return loadRealtime().then(m=>m.default.fetch(req,env,ctx));if(url.pathname.startsWith('/api/'))return import('./api.js').then(m=>m.api(req,env,ctx));return null;}
export default{fetch(req,env,ctx){return routeServer(req,env,ctx)||new Response('Not found',{status:404});}};
