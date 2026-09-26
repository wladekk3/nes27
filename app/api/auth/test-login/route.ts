import {getD1,randomToken,sha256,sessionCookie,profilePayload,bytesToHex} from '@/lib/s27-server';
import {labAccess} from '@/lib/lab-access';
import {managerAccess} from '@/lib/manager-access';
export async function POST(r:Request){try{
 if(process.env.NODE_ENV==='production'&&process.env.ENABLE_TEST_LOGIN!=='1')return Response.json({error:'Тестовый вход отключён'},{status:404});
 const b=await r.json() as {login?:string;password?:string};if(typeof b.login!=='string'||typeof b.password!=='string'||b.password.length>200)return Response.json({error:'Проверьте логин и пароль'},{status:400});
 const db=getD1(),now=Date.now(),key=await sha256((r.headers.get('cf-connecting-ip')||'unknown')+':'+b.login.slice(0,60));
 const limit=await db.prepare('INSERT INTO login_limits(key,attempts,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN expires<? THEN 1 ELSE attempts+1 END,expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END RETURNING attempts').bind(key,now+900000,now,now).first<{attempts:number}>();
 if((limit?.attempts??99)>12)return Response.json({error:'Слишком много попыток. Попробуйте через 15 минут.'},{status:429});
 const entry=b.login==='s27_manager'?managerAccess:labAccess[b.login];const salt=entry?.salt??'00000000000000000000000000000000';const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(b.password),'PBKDF2',false,['deriveBits']);const hash=bytesToHex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:Uint8Array.from(salt.match(/../g)!,x=>parseInt(x,16)),iterations:100000,hash:'SHA-256'},material,256));
 let diff=0;const expected=entry?.hash??'0'.repeat(64);for(let i=0;i<64;i++)diff|=hash.charCodeAt(i)^expected.charCodeAt(i);if(!entry||diff)return Response.json({error:'Неверный логин или пароль'},{status:401});
 await db.batch([db.prepare("INSERT OR IGNORE INTO users(discord_id,username,display_name,tokens,fragments,pack_count,created_at,updated_at) VALUES ('lab:admin','s27_admin','Куратор',30,15000,0,?,?)").bind(now,now),db.prepare("INSERT OR IGNORE INTO users(discord_id,username,display_name,tokens,fragments,pack_count,created_at,updated_at) VALUES ('lab:member','s27_member','Сталкер',9,1800,0,?,?)").bind(now,now)]);
 if(entry.id==='lab:manager')await db.prepare("INSERT OR IGNORE INTO users(discord_id,username,display_name,tokens,fragments,pack_count,created_at,updated_at) VALUES ('lab:manager','s27_manager','Менеджер',0,0,0,?,?)").bind(now,now).run();
 const token=randomToken();await db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)').bind(await sha256(token),entry.id,now+86400000,now).run();
 return Response.json({profile:await profilePayload(entry.id)},{headers:{'Set-Cookie':sessionCookie(token,86400),'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Не удалось войти. Попробуйте позже.'},{status:503});}}
