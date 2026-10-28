import {build} from 'esbuild';
import {readFile,mkdir,writeFile,copyFile,cp} from 'node:fs/promises';
await mkdir('worker',{recursive:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});await mkdir('.local',{recursive:true});
const client=await build({entryPoints:['src/client/app.js'],bundle:true,format:'esm',minify:true,write:false,target:'es2022',legalComments:'eof'});
const js=client.outputFiles[0].text,html=await readFile('src/client/index.html','utf8'),css=await readFile('src/client/style.css','utf8');
await writeFile('.local/game.js',js);
const source=`import {api} from './src/server/api.js';
const HTML=${JSON.stringify(html)},CSS=${JSON.stringify(css)},JS=${JSON.stringify(js)};
export default{async fetch(req,env){const url=new URL(req.url);if(url.pathname.startsWith('/api/'))return api(req,env);if(req.method!=='GET'&&req.method!=='HEAD')return new Response('Method not allowed',{status:405});const files={'/':[HTML,'text/html; charset=utf-8'],'/index.html':[HTML,'text/html; charset=utf-8'],'/style.css':[CSS,'text/css; charset=utf-8'],'/game.js':[JS,'text/javascript; charset=utf-8']};const file=files[url.pathname];if(!file)return new Response('Not found',{status:404});return new Response(req.method==='HEAD'?null:file[0],{headers:{'content-type':file[1],'cache-control':url.pathname.endsWith('.js')?'public, max-age=300':'no-cache','x-content-type-options':'nosniff','referrer-policy':'same-origin'}});}};`;
const worker=await build({stdin:{contents:source,resolveDir:process.cwd(),sourcefile:'entry.js'},bundle:true,format:'esm',minify:true,write:false,target:'es2022',legalComments:'eof'});
await writeFile('worker/index.js',worker.outputFiles[0].text);await copyFile('worker/index.js','dist/server/index.js');await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
// Sites owns provisioning and migrations; this file declares the runtime binding for the artifact.
const wrangler={name:'last-circle-arena',main:'index.js',compatibility_date:'2026-10-01',d1_databases:[{binding:'DB',database_name:'last-circle-rooms',migrations_dir:'../../drizzle'}]};
await writeFile('dist/server/wrangler.json',JSON.stringify(wrangler,null,2));
await cp('drizzle','dist/drizzle',{recursive:true});
console.log(`Built embedded Worker (${worker.outputFiles[0].contents.length} bytes), client (${js.length} chars).`);
