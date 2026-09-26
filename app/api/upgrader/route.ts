import {getD1,getSessionUser,profilePayload,maintenanceBlocked} from '@/lib/s27-server';
import {pool,uniform} from '@/lib/economy';
import {upgradeChance,upgradeTarget} from '@/lib/upgrader';
export async function POST(r:Request){try{
 const u=await getSessionUser(r);if(!u)return Response.json({error:'Sign in first / Войдите в профиль'},{status:401});
 if(await maintenanceBlocked(u.discord_id))return Response.json({error:'Site paused / Сайт временно приостановлен'},{status:503});
 const b=await r.json(),db=getD1(),now=Date.now();
 if(typeof b.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(b.requestId))return Response.json({error:'Invalid request ID'},{status:400});
 const id=u.discord_id+':upgrade:'+b.requestId;
 const previous=await db.prepare('SELECT result FROM operations WHERE id=?').bind(id).first<{result:string}>();
 if(previous)return Response.json({...JSON.parse(previous.result),profile:await profilePayload(u.discord_id)});
 const target=upgradeTarget(b.target);
 if(!target||!Array.isArray(b.stakes)||b.stakes.length<1||b.stakes.length>3||b.stakes.some((s:unknown)=>typeof s!=='string'))return Response.json({error:'Choose 1–3 duplicate cards and a target / Выберите 1–3 повторки и цель'},{status:400});
 const ranks=b.stakes.map((slug:string)=>pool.find(c=>c[0]===slug)?.[1]??-1);
 let chance:number;try{chance=upgradeChance(target.rank,ranks);}catch{return Response.json({error:'Stake rarity must be below the target / Редкость ставки должна быть ниже цели'},{status:400});}
 const roll=uniform(1_000_000),won=roll<chance;
 const mythics=pool.filter(c=>c[1]===4),slug=won?(target.slug??mythics[uniform(mythics.length)][0]):null;
 const result={won,slug,chance:chance/10000,roll:roll/10000,stakes:b.stakes,target:b.target};
 const statements=[db.prepare("INSERT INTO operations(id,user_id,action,result,valid,created_at) VALUES (?,?,'upgrade',?,1,?)").bind(id,u.discord_id,JSON.stringify(result),now)];
 for(const card of new Set<string>(b.stakes)){
 const count=b.stakes.filter((s:string)=>s===card).length;
 statements.push(db.prepare('UPDATE user_cards SET count=count-?,updated_at=? WHERE user_id=? AND card_slug=? AND count>? AND NOT EXISTS (SELECT 1 FROM card_locks WHERE user_id=? AND card_slug=?)').bind(count,now,u.discord_id,card,count,u.discord_id,card));
 statements.push(db.prepare("INSERT INTO operations(id,user_id,action,result,valid,created_at) VALUES (?,?,'upgrade.guard','{}',changes(),?)").bind(id+':'+card,u.discord_id,now));
 }
 if(slug)statements.push(db.prepare('INSERT INTO user_cards(user_id,card_slug,count,updated_at) VALUES (?,?,1,?) ON CONFLICT(user_id,card_slug) DO UPDATE SET count=count+1,updated_at=excluded.updated_at').bind(u.discord_id,slug,now));
 statements.push(db.prepare("INSERT INTO audit_log(actor_id,action,target_id,payload,created_at) VALUES (?,'upgrade',?,?,?)").bind(u.discord_id,u.discord_id,JSON.stringify(result),now));
 try{await db.batch(statements);}catch{const retry=await db.prepare('SELECT result FROM operations WHERE id=?').bind(id).first<{result:string}>();if(retry)return Response.json({...JSON.parse(retry.result),profile:await profilePayload(u.discord_id)});return Response.json({error:'Cards changed or protected. Nothing spent / Карты изменились или защищены. Списания нет.'},{status:409});}
 return Response.json({...result,profile:await profilePayload(u.discord_id)});
 }catch(e){console.error('upgrade failed',e);return Response.json({error:'Upgrade unavailable / Апгрейдер временно недоступен'},{status:503});}}
