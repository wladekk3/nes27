import {communityConfig,scopeFor,configGuard,drawFromSeason} from '@/lib/community';
import { getD1,getSessionUser,profilePayload,maintenanceBlocked } from '@/lib/s27-server';
import {draw,pool,salvage,products,uniform,bonusAt,prizeBonusDenominator} from '@/lib/economy';
export async function GET(request:Request){const u=await getSessionUser(request);if(!u)return Response.json({error:'Требуется аккаунт'},{status:401});return Response.json({profile:await profilePayload(u.discord_id)},{headers:{'Cache-Control':'no-store'}});}
export async function POST(request:Request){
 try {
 const u=await getSessionUser(request);if(!u)return Response.json({error:'Требуется аккаунт'},{status:401});
 if(await maintenanceBlocked(u.discord_id))return Response.json({error:'Сайт временно приостановлен'},{status:503});
 const b=await request.json() as {action:string;cardSlug?:string;productId?:string;requestId?:string;count?:number};
 if(!b.requestId||! /^[a-f0-9-]{36}$/.test(b.requestId))return Response.json({error:'Нужен идентификатор операции'},{status:400});
 const db=getD1(),now=Date.now(),id=u.discord_id+':'+b.requestId;
 const old=await db.prepare('SELECT result FROM operations WHERE id=? AND user_id=?').bind(id,u.discord_id).first<{result:string}>();
 if(old)return Response.json({...JSON.parse(old.result),profile:await profilePayload(u.discord_id)});
 let result:Record<string,unknown>={},statements:D1PreparedStatement[]=[];
 if(b.action==='open_pack'){
 const count=b.count??1;if(!Number.isInteger(count)||count<1||count>2)return Response.json({error:'Можно открыть от 1 до 2 тайников'},{status:400});
 const scope=scopeFor(u.discord_id),{config,raw}=await communityConfig(scope);const season=config.seasons.find((s:any)=>s.id===config.activeSeason&&s.status==='active');if(!season)return Response.json({error:'Сезон ещё не открыт'},{status:409});statements.push(configGuard(scope,raw));const cards=Array.from({length:count},()=>drawFromSeason(season.cards));const eligible=products.filter(p=>config.products.some((x:any)=>x.id===p.id&&x.available));const bonuses=Array.from({length:count},()=>eligible.length&&bonusAt(uniform(prizeBonusDenominator))?eligible[uniform(eligible.length)]:null).filter(Boolean).map((p:any)=>({id:crypto.randomUUID(),productId:p.id,name:p.name}));result={results:cards.map(c=>c[0]),bonuses,seasonId:season.id,couponsSpent:count};
 statements.push(db.prepare('UPDATE users SET tokens=tokens-?,pack_count=pack_count+?,updated_at=? WHERE discord_id=? AND tokens>=?').bind(count,count,now,u.discord_id,count));
 }else if(b.action==='dismantle'){
 const card=pool.find(c=>c[0]===b.cardSlug);if(!card)return Response.json({error:'Карточка недоступна'},{status:404});
 result={cardSlug:card[0],fragmentsAdded:salvage[card[1]]};
 statements.push(db.prepare('UPDATE user_cards SET count=count-1,updated_at=? WHERE user_id=? AND card_slug=? AND count>1 AND NOT EXISTS (SELECT 1 FROM card_locks l WHERE l.user_id=user_cards.user_id AND l.card_slug=user_cards.card_slug)').bind(now,u.discord_id,card[0]));
 }else if(b.action==='purchase'){
 const product=products.find(p=>p.id===b.productId);if(!product)return Response.json({error:'Товар не найден'},{status:404});
 const scope=scopeFor(u.discord_id),{config,raw}=await communityConfig(scope);if(!config.products.find((p:any)=>p.id===product.id)?.available)return Response.json({error:'Приз сейчас недоступен'},{status:409});statements.push(configGuard(scope,raw));result={orderId:b.requestId,productId:product.id,name:product.name,fragmentsSpent:product.price};
 statements.push(db.prepare('UPDATE users SET fragments=fragments-?,updated_at=? WHERE discord_id=? AND fragments>=?').bind(product.price,now,u.discord_id,product.price));
 }else return Response.json({error:'Неизвестное действие'},{status:400});
 statements.push(db.prepare('INSERT INTO operations (id,user_id,action,result,valid,created_at) VALUES (?,?,?,?,changes(),?)').bind(id,u.discord_id,b.action,JSON.stringify(result),now));
 if(b.action==='open_pack')for(const slug of result.results as string[])statements.push(db.prepare('INSERT INTO user_cards(user_id,card_slug,count,updated_at) VALUES (?,?,1,?) ON CONFLICT(user_id,card_slug) DO UPDATE SET count=count+1,updated_at=excluded.updated_at').bind(u.discord_id,slug,now));
 if(b.action==='open_pack')for(const bonus of (result.bonuses as any[]))statements.push(db.prepare("INSERT INTO shop_orders(id,user_id,product_id,name,price,status,created_at) VALUES (?,?,?,?,0,'pending',?)").bind(bonus.id,u.discord_id,bonus.productId,bonus.name,now));
 if(b.action==='dismantle')statements.push(db.prepare('UPDATE users SET fragments=fragments+?,updated_at=? WHERE discord_id=?').bind(result.fragmentsAdded,now,u.discord_id));
 if(b.action==='purchase'){const product=products.find(p=>p.id===b.productId)!;statements.push(db.prepare('INSERT INTO shop_orders(id,user_id,product_id,name,price,status,created_at) VALUES (?,?,?,?,?,"pending",?)').bind(b.requestId,u.discord_id,product.id,product.name,product.price,now));}
 statements.push(db.prepare('INSERT INTO audit_log(actor_id,action,target_id,payload,created_at) VALUES (?,?,?,?,?)').bind(u.discord_id,b.action,u.discord_id,JSON.stringify(result),now));
 try{await db.batch(statements);}catch{const retry=await db.prepare('SELECT result FROM operations WHERE id=? AND user_id=?').bind(id,u.discord_id).first<{result:string}>();if(retry)return Response.json({...JSON.parse(retry.result),profile:await profilePayload(u.discord_id)});return Response.json({error:'Операция не выполнена: недостаточно купонов, жетонов или повторок. Баланс сохранён.'},{status:409});}
 return Response.json({...result,profile:await profilePayload(u.discord_id)});
 }catch{return Response.json({error:'Сервис временно недоступен'},{status:503});}
}
