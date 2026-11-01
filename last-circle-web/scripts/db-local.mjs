import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdirSync} from 'node:fs';
export function database(path=':memory:'){
 if(path!==':memory:')mkdirSync('.local',{recursive:true});
 const sqlite=new DatabaseSync(path);sqlite.exec('PRAGMA busy_timeout=3000; PRAGMA journal_mode=WAL;');for(const name of ['0000_rooms','0001_duel_queue','0002_room_live','0003_input_mailboxes'])sqlite.exec(readFileSync(new URL('../drizzle/'+name+'.sql',import.meta.url),'utf8').replaceAll('CREATE TABLE ','CREATE TABLE IF NOT EXISTS ').replaceAll('CREATE INDEX ','CREATE INDEX IF NOT EXISTS '));
 return{sqlite,async batch(statements){sqlite.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>{const{sql,values}=s._query();if(/^\s*(SELECT|PRAGMA)/i.test(sql))return{results:sqlite.prepare(sql).all(...values),meta:{changes:0}};const r=sqlite.prepare(sql).run(...values);return{results:[],meta:{changes:Number(r.changes)}};});sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}},prepare(sql){let values=[];return{_query(){return{sql,values};},bind(...v){values=v;return this;},async first(){return sqlite.prepare(sql).get(...values)||null;},async all(){return{results:sqlite.prepare(sql).all(...values)};},async run(){const r=sqlite.prepare(sql).run(...values);return{meta:{changes:Number(r.changes)}};}};}};
}
