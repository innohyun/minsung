/** Optional player accounts. Separate database; never modifies the dashboard DB. */
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const derive=promisify(scrypt), TTL=7*24*3600*1000, cookie='piggy_session';
const hash=t=>createHash('sha256').update(t).digest('hex');
export function createPiggyAccounts({dbPath,origins=['https://minsung.pages.dev'],trustProxy=false}){
 mkdirSync(dirname(dbPath),{recursive:true});const db=new DatabaseSync(dbPath);
 db.exec(`PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS players(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,password TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS player_sessions(hash TEXT PRIMARY KEY,player INTEGER NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS player_saves(player INTEGER PRIMARY KEY,body TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0);`);
 const limits=new Map();let lastPrune=0;
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 async function body(req){let n=0,parts=[];for await(const part of req){n+=part.length;if(n>1_000_000)throw Object.assign(new Error('저장 파일이 너무 커요.'),{status:413});parts.push(part);}try{return JSON.parse(Buffer.concat(parts).toString()||'{}');}catch{throw Object.assign(new Error('올바른 JSON이 아니에요.'),{status:400});}}
 const authenticated=req=>{const token=(req.headers.cookie||'').split(';').map(p=>p.trim()).find(p=>p.startsWith(cookie+'='))?.slice(cookie.length+1);if(!token||token.length>128)return null;return db.prepare('SELECT p.id,p.name FROM player_sessions s JOIN players p ON p.id=s.player WHERE s.hash=? AND s.expires>?').get(hash(token),Date.now());};
 function session(req,res,id){db.prepare('DELETE FROM player_sessions WHERE expires<=?').run(Date.now());const token=randomBytes(32).toString('base64url');db.prepare('INSERT INTO player_sessions VALUES(?,?,?)').run(hash(token),id,Date.now()+TTL);setCookie(req,res,token,TTL/1000);}
 function setCookie(req,res,token,age){const secure=!!req.socket.encrypted||(trustProxy&&req.headers['x-forwarded-proto']==='https');res.setHeader('Set-Cookie',`${cookie}=${token}; HttpOnly; Path=/api/piggy; SameSite=${secure?'None':'Lax'}; Max-Age=${age}${secure?'; Secure':''}`);}
 async function handle(req,res,url){if(!url.pathname.startsWith('/api/piggy/'))return false;
  const origin=req.headers.origin,protocol=req.socket.encrypted||(trustProxy&&req.headers['x-forwarded-proto']==='https')?'https':'http',same=`${protocol}://${req.headers.host}`;
  if(origin&&origin!==same&&!origins.includes(origin)){json(res,403,{ok:false,error:'허용되지 않은 사이트예요.'});return true;}
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,OPTIONS');}
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return true;}
  try{
   const path=url.pathname.slice('/api/piggy/'.length),user=authenticated(req);
   if(path==='session'&&req.method==='GET'){json(res,200,{ok:true,user:user?{name:user.name}:null});return true;}
   if(['register','login'].includes(path)&&req.method==='POST'){
    const now=Date.now();if(now-lastPrune>60000){for(const [key,value]of limits)if(value.until<now)limits.delete(key);lastPrune=now;}
    const ip=req.socket.remoteAddress||'local',rate=limits.get(ip)||{count:0,until:now+60000};if(rate.until<now){rate.count=0;rate.until=now+60000;}rate.count++;limits.set(ip,rate);
    if(rate.count>15){json(res,429,{ok:false,error:'잠시 뒤 다시 로그인해 주세요.'});return true;}
    const data=await body(req),name=String(data.name||'').normalize('NFKC').trim().toLowerCase(),password=String(data.password||'');
    if(!/^[\p{L}\p{N}_-]{2,24}$/u.test(name)||password.length<8||password.length>128){json(res,400,{ok:false,error:'이름은 2~24자, 비밀번호는 8~128자로 입력하세요.'});return true;}
    const old=db.prepare('SELECT * FROM players WHERE name=?').get(name);
    if(path==='register'){
     if(old){json(res,409,{ok:false,error:'이미 등록된 이름이에요.'});return true;}
     const salt=randomBytes(16).toString('hex'),key=await derive(password,salt,64);
     let id;try{id=Number(db.prepare('INSERT INTO players(name,salt,password,created) VALUES(?,?,?,?)').run(name,salt,key.toString('hex'),now).lastInsertRowid);}catch(e){if(String(e.message).includes('UNIQUE')){json(res,409,{ok:false,error:'이미 등록된 이름이에요.'});return true;}throw e;}
     session(req,res,id);json(res,201,{ok:true,user:{name},isNew:true});return true;
    }
    const key=await derive(password,old?.salt||'unregistered-account',64),expected=Buffer.from(old?.password||'00'.repeat(64),'hex');
    if(!old||!timingSafeEqual(key,expected)){json(res,401,{ok:false,error:'이름 또는 비밀번호를 확인하세요.'});return true;}
    session(req,res,old.id);json(res,200,{ok:true,user:{name},isNew:false});return true;
   }
   if(!user){json(res,401,{ok:false,error:'로그인이 필요해요.'});return true;}
   if(path==='logout'&&req.method==='POST'){const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookie+'='))?.slice(cookie.length+1);if(token)db.prepare('DELETE FROM player_sessions WHERE hash=?').run(hash(token));setCookie(req,res,'',0);json(res,200,{ok:true});return true;}
   if(path==='save'&&req.method==='GET'){const save=db.prepare('SELECT body,revision FROM player_saves WHERE player=?').get(user.id);json(res,200,{ok:true,save:save?JSON.parse(save.body):null,revision:save?.revision||0});return true;}
   if(path==='save'&&req.method==='PUT'){
    const data=await body(req);if(![2,3].includes(data.save?.schema)||!Number.isSafeInteger(data.revision)||data.revision<0){json(res,400,{ok:false,error:'저장 형식이 올바르지 않아요.'});return true;}
    const raw=JSON.stringify(data.save);if(raw.length>750000){json(res,413,{ok:false,error:'저장 파일이 너무 커요.'});return true;}
    db.exec('BEGIN IMMEDIATE');try{const old=db.prepare('SELECT revision FROM player_saves WHERE player=?').get(user.id),revision=old?.revision||0;
     if(revision!==data.revision){db.exec('ROLLBACK');json(res,409,{ok:false,error:'다른 기기에서 변경된 기록이 있어요. 이 기기의 기록을 백업한 뒤 다시 로그인하세요.'});return true;}
     db.prepare('INSERT INTO player_saves VALUES(?,?,?) ON CONFLICT(player) DO UPDATE SET body=excluded.body,revision=excluded.revision').run(user.id,raw,revision+1);db.exec('COMMIT');json(res,200,{ok:true,revision:revision+1});return true;
    }catch(e){db.exec('ROLLBACK');throw e;}
   }
   json(res,404,{ok:false,error:'지원하지 않는 계정 요청이에요.'});
  }catch(e){json(res,e.status||500,{ok:false,error:e.status?e.message:'계정 요청을 처리하지 못했어요.'});}
  return true;
 }
 return {handle,close:()=>db.close()};
}
