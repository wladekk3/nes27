import {getD1,getSessionUser,profilePayload} from '@/lib/s27-server';
import {products} from '@/lib/economy';
import {cosmetics,avatars} from '@/lib/cosmetics';
async function data(id:string){const db=getD1();const profile=await db.prepare('SELECT * FROM user_profiles WHERE user_id=?').bind(id).first();const owned=await db.prepare('SELECT item_id FROM user_cosmetics WHERE user_id=?').bind(id).all();const extras=await db.prepare('SELECT wishlist,presets FROM profile_extras WHERE user_id=?').bind(id).first<any>();return {extras:extras?{wishlist:JSON.parse(extras.wishlist),presets:JSON.parse(extras.presets)}:{wishlist:[],presets:[]},profile:profile??{nickname:'',bio:'',status:'На связи',avatar:'shinigami',equipped:'{}',showcase:'[]'},owned:owned.results.map((r:any)=>r.item_id),account:await profilePayload(id)};}
export async function GET(r:Request){try{const u=await getSessionUser(r);if(!u)return Response.json({error:'Войдите в профиль'},{status:401});return Response.json(await data(u.discord_id),{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Профиль временно недоступен'},{status:503});}}
export async function POST(r:Request){try{const u=await getSessionUser(r);if(!u)return Response.json({error:'Войдите в профиль'},{status:401});const b=await r.json(),db=getD1(),now=Date.now();
 if(['preset_save','preset_apply','preset_delete'].includes(b.action))return Response.json({error:'Функция образов удалена'},{status:410});
 if(b.action==='wish'){
 await db.prepare('INSERT OR IGNORE INTO profile_extras(user_id) VALUES (?)').bind(u.discord_id).run();
 const old=await db.prepare('SELECT wishlist,presets FROM profile_extras WHERE user_id=?').bind(u.discord_id).first<any>();
 if(b.action==='wish'){
 if((!cosmetics.some(c=>c.id===b.itemId)&&!products.some(c=>c.id===b.itemId))||typeof b.wanted!=='boolean')return Response.json({error:'Неверный предмет'},{status:400});const list=JSON.parse(old.wishlist) as string[],next=b.wanted?[...new Set([...list,b.itemId])]:list.filter(x=>x!==b.itemId);
 const result=await db.prepare('UPDATE profile_extras SET wishlist=? WHERE user_id=? AND wishlist=?').bind(JSON.stringify(next),u.discord_id,old.wishlist).run();if(!result.meta.changes)return Response.json({error:'Список изменился. Обновите страницу.'},{status:409});
 }else{
 const list=JSON.parse(old.presets) as any[];
 if(b.action==='preset_save'){
 const name=String(b.name||'').trim();if(!name||name.length>40||list.length>=10)return Response.json({error:'Укажите название до 40 символов. Максимум 10 образов.'},{status:400});
 const profile=await db.prepare('SELECT equipped FROM user_profiles WHERE user_id=?').bind(u.discord_id).first<any>();list.push({id:crypto.randomUUID(),name,equipped:JSON.parse(profile?.equipped||'{}')});
 }else if(b.action==='preset_apply'){
 const preset=list.find(p=>p.id===b.id);if(!preset)return Response.json({error:'Образ не найден'},{status:404});const owned=await db.prepare('SELECT item_id FROM user_cosmetics WHERE user_id=?').bind(u.discord_id).all<any>();for(const [slot,id] of Object.entries(preset.equipped))if(id&&(!cosmetics.some(c=>c.id===id&&c.slot===slot)||!owned.results.some((x:any)=>x.item_id===id)))return Response.json({error:'Предмет образа недоступен'},{status:403});
 await db.batch([db.prepare('INSERT OR IGNORE INTO user_profiles(user_id) VALUES (?)').bind(u.discord_id),db.prepare('UPDATE user_profiles SET equipped=? WHERE user_id=?').bind(JSON.stringify(preset.equipped),u.discord_id)]);return Response.json(await data(u.discord_id));
 }else{const i=list.findIndex(p=>p.id===b.id);if(i<0)return Response.json({error:'Образ не найден'},{status:404});list.splice(i,1);}
 const result=await db.prepare('UPDATE profile_extras SET presets=? WHERE user_id=? AND presets=?').bind(JSON.stringify(list),u.discord_id,old.presets).run();if(!result.meta.changes)return Response.json({error:'Образы изменились. Обновите страницу.'},{status:409});
 }return Response.json(await data(u.discord_id));
 }
 if(b.action==='purchase'){
 const item=cosmetics.find(i=>i.id===b.itemId);if(!item||typeof b.requestId!=='string'||! /^[a-f0-9-]{36}$/.test(b.requestId))return Response.json({error:'Неверная покупка'},{status:400});
 const id=u.discord_id+':cosmetic:'+b.requestId;const old=await db.prepare('SELECT id FROM operations WHERE id=?').bind(id).first();if(old)return Response.json(await data(u.discord_id));
 try{await db.batch([db.prepare('UPDATE users SET fragments=fragments-? WHERE discord_id=? AND fragments>=?').bind(item.price,u.discord_id,item.price),db.prepare("INSERT INTO operations(id,user_id,action,result,valid,created_at) VALUES (?,?,'cosmetic.purchase','{}',changes(),?)").bind(id,u.discord_id,now),db.prepare('INSERT INTO user_cosmetics(user_id,item_id,created_at) VALUES (?,?,?)').bind(u.discord_id,item.id,now),db.prepare("INSERT INTO audit_log(actor_id,action,target_id,payload,created_at) VALUES (?,'cosmetic.purchase',?,?,?)").bind(u.discord_id,u.discord_id,JSON.stringify({itemId:item.id,price:item.price}),now)]);}catch{return Response.json({error:'Украшение уже куплено или не хватает жетонов. Лишнего списания нет.'},{status:409});}
 }else if(b.action==='equip'){
 const slot=b.slot;if(!['cursor','frame','banner','effect','reveal','theme','click','sound'].includes(slot))return Response.json({error:'Неверный слот'},{status:400});
 if(b.itemId){const item=cosmetics.find(i=>i.id===b.itemId&&i.slot===slot);const owned=item&&await db.prepare('SELECT item_id FROM user_cosmetics WHERE user_id=? AND item_id=?').bind(u.discord_id,item.id).first();if(!owned)return Response.json({error:'Сначала приобретите украшение'},{status:403});}
 await db.prepare('INSERT OR IGNORE INTO user_profiles(user_id) VALUES (?)').bind(u.discord_id).run();
 await db.prepare('UPDATE user_profiles SET equipped=json_set(equipped,?,?) WHERE user_id=?').bind('$.'+slot,b.itemId||'',u.discord_id).run();
 }else if(b.action==='save'){
 const nickname=String(b.nickname||'').trim().slice(0,40),bio=String(b.bio||'').slice(0,280),status=String(b.status||'На связи').slice(0,80),avatar=u.discord_id.startsWith('lab:')&&Object.hasOwn(avatars,b.avatar)?b.avatar:'shinigami';
 const owned=await db.prepare('SELECT card_slug FROM user_cards WHERE user_id=? AND count>0').bind(u.discord_id).all<{card_slug:string}>();const showcase=Array.isArray(b.showcase)?[...new Set(b.showcase.filter((x:any)=>owned.results.some((c:any)=>c.card_slug===x)))].slice(0,3):[];
 await db.prepare('INSERT INTO user_profiles(user_id,nickname,bio,status,avatar,showcase) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET nickname=excluded.nickname,bio=excluded.bio,status=excluded.status,avatar=excluded.avatar,showcase=excluded.showcase').bind(u.discord_id,nickname,bio,status,avatar,JSON.stringify(showcase)).run();
 }else return Response.json({error:'Неверное действие'},{status:400});return Response.json(await data(u.discord_id));
 }catch{return Response.json({error:'Не удалось сохранить. Повторите позже.'},{status:503});}}
