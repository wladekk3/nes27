import {getD1,getSessionUser,profilePayload} from '@/lib/s27-server';
import {collectionRewards} from '@/lib/collection-rewards';
export async function GET(r:Request){try{const u=await getSessionUser(r);const claims=u?await getD1().prepare('SELECT set_id,reward FROM collection_claims WHERE user_id=?').bind(u.discord_id).all():{results:[]};return Response.json({claims:claims.results},{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Rewards unavailable'},{status:503});}}
export async function POST(r:Request){try{
 const u=await getSessionUser(r);if(!u)return Response.json({error:'Sign in / Войдите в профиль'},{status:401});
 const b=await r.json(),set=collectionRewards.find(s=>s.id===b.setId);if(!set)return Response.json({error:'Unknown collection'},{status:400});
 const db=getD1(),now=Date.now(),orderId=u.discord_id+':reward:'+set.id;
 const old=await db.prepare('SELECT reward FROM collection_claims WHERE user_id=? AND set_id=?').bind(u.discord_id,set.id).first();
 if(old)return Response.json({ok:true,alreadyClaimed:true,orderId,profile:await profilePayload(u.discord_id)});
 const statements=[
 db.prepare("INSERT INTO operations(id,user_id,action,result,valid,created_at) SELECT ?,?,'reward.guard','{}',CASE WHEN (SELECT COUNT(*) FROM user_cards WHERE user_id=? AND count>0 AND card_slug IN (SELECT value FROM json_each(?)))=? THEN 1 ELSE 0 END,?").bind(orderId,u.discord_id,u.discord_id,JSON.stringify(set.cards),set.cards.length,now),
 db.prepare('INSERT INTO collection_claims(user_id,set_id,reward,created_at) VALUES (?,?,?,?)').bind(u.discord_id,set.id,JSON.stringify({coupons:set.coupons,prize:set.prize,orderId}),now),
 db.prepare('UPDATE users SET tokens=tokens+?,updated_at=? WHERE discord_id=?').bind(set.coupons,now,u.discord_id),
 db.prepare("INSERT INTO shop_orders(id,user_id,product_id,name,price,status,created_at) VALUES (?,?,?,?,0,'pending',?)").bind(orderId,u.discord_id,set.id,set.name+' — '+set.prize,now),
 db.prepare("INSERT INTO prize_claims(order_id,user_id,status,created_at) VALUES (?,?,'waiting_bot',?)").bind(orderId,u.discord_id,now),
 db.prepare("INSERT INTO audit_log(actor_id,action,target_id,payload,created_at) VALUES (?,'collection.reward',?,?,?)").bind(u.discord_id,u.discord_id,JSON.stringify({setId:set.id,coupons:set.coupons,orderId}),now)];
 try{await db.batch(statements);}catch{return Response.json({error:'Collection incomplete or already claimed / Набор неполный или награда уже получена'},{status:409});}
 return Response.json({ok:true,orderId,profile:await profilePayload(u.discord_id)});
 }catch(e){console.error('reward failed',e);return Response.json({error:'Rewards unavailable / Награды временно недоступны'},{status:503});}}
