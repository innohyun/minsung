import{assetRoute}from'./assets.js';
import {api} from './api.js';
import realtimeWorker,{MatchRoom} from '../realtime/worker.js';
export {MatchRoom};
export function routeServer(req,env,ctx){const url=new URL(req.url);env={...env,SITE_ORIGIN:env.SITE_ORIGIN||url.origin};if(url.pathname.startsWith('/assets/')||url.pathname.startsWith('/api/admin/assets/'))return assetRoute(req,env);if(url.pathname.startsWith('/rooms/'))return realtimeWorker.fetch(req,env,ctx);if(url.pathname.startsWith('/api/'))return api(req,env,ctx);return null;}
export default{fetch(req,env,ctx){return routeServer(req,env,ctx)||new Response('Not found',{status:404});}};
