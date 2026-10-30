import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync} from 'node:fs';
export function database(path=':memory:'){
 if(path!==':memory:')mkdirSync('.local',{recursive:true});
 const sqlite=new DatabaseSync(path);sqlite.exec('PRAGMA busy_timeout=3000; PRAGMA journal_mode=WAL;');sqlite.exec(readFileSync(new URL('../drizzle/0000_rooms.sql',import.meta.url),'utf8').replaceAll('CREATE TABLE ','CREATE TABLE IF NOT EXISTS ').replaceAll('CREATE INDEX ','CREATE INDEX IF NOT EXISTS '));
 return{sqlite,prepare(sql){let values=[];return{bind(...v){values=v;return this;},async first(){return sqlite.prepare(sql).get(...values)||null;},async all(){return{results:sqlite.prepare(sql).all(...values)};},async run(){const r=sqlite.prepare(sql).run(...values);return{meta:{changes:Number(r.changes)}};}};}};
}
