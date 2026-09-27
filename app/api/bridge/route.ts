import {adminIds,getD1,getRuntimeValue,getSessionUser,hasAdminAccess,isManager,isOwner,ownerIds,randomToken} from '@/lib/s27-server';

const roleKeys=['bridge:owners','bridge:admins','bridge:managers'] as const;
function readIds(value?:string){if(!value)return [] as string[];try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.filter((id):id is string=>typeof id==='string'):[];}catch{return [] as string[];}}
function validIds(value:unknown):value is string[]{return Array.isArray(value)&&value.length<=30&&value.every(id=>typeof id==='string'&&/^\d{16,22}$/.test(id));}
async function roleState(){const rows=await getD1().prepare("SELECT key,value FROM site_settings WHERE key IN ('bridge:owners','bridge:admins','bridge:managers')").all<{key:string;value:string}>();const values=new Map(rows.results.map(row=>[row.key,row.value]));return {owners:readIds(values.get('bridge:owners')),admins:readIds(values.get('bridge:admins')),managers:readIds(values.get('bridge:managers'))};}

export async function GET(r:Request){
 const user=await getSessionUser(r);if(!user||!(await isManager(user.discord_id)))return Response.json({error:'Нет доступа'},{status:403});
 const db=getD1(),roles=await roleState();
 const secret=await db.prepare("SELECT key FROM site_settings WHERE key='bridge:secret'").first();
 const heartbeat=await db.prepare("SELECT value,updated_at FROM site_settings WHERE key='bridge:heartbeat'").first<{value:string;updated_at:number}>();
 return Response.json({...roles,bootstrapOwners:[...ownerIds()],bootstrapAdmins:[...adminIds()],configured:!!(getRuntimeValue('BOT_WEBHOOK_SECRET')||secret),canConfigure:await hasAdminAccess(user.discord_id),canManageRoles:await isOwner(user.discord_id),environmentManaged:!!getRuntimeValue('BOT_WEBHOOK_SECRET'),lastSeen:heartbeat?.updated_at||null,online:!!heartbeat&&Date.now()-heartbeat.updated_at<180000,endpoint:new URL('/api/bot',r.url).href},{headers:{'Cache-Control':'private, no-store'}});
}

export async function POST(r:Request){
 const user=await getSessionUser(r);if(!user||!(await hasAdminAccess(user.discord_id)))return Response.json({error:'Настройка доступна только администратору'},{status:403});
 if(new URL(r.url).origin!==r.headers.get('origin'))return Response.json({error:'Недопустимый источник запроса'},{status:403});
 const body=await r.json(),db=getD1(),now=Date.now();
 if(body.action==='roles'){
  if(!(await isOwner(user.discord_id)))return Response.json({error:'Роли администраторов меняет только овнер'},{status:403});
  if(!validIds(body.owners)||!validIds(body.admins)||!validIds(body.managers))return Response.json({error:'Неверные Discord ID'},{status:400});
  const bootstrapOwners=ownerIds(),owners=[...new Set(body.owners)],effectiveOwners=new Set([...bootstrapOwners,...owners]);
  if(user.discord_id!=='lab:admin'&&(!effectiveOwners.size||!effectiveOwners.has(user.discord_id)))return Response.json({error:'Нельзя удалить последнего овнера или собственный доступ'},{status:409});
  const admins=[...new Set(body.admins)].filter(id=>!effectiveOwners.has(id));
  const effectiveAdmins=new Set([...effectiveOwners,...adminIds(),...admins]);
  const managers=[...new Set(body.managers)].filter(id=>!effectiveAdmins.has(id));
  const values=[owners,admins,managers];
  await db.batch([...roleKeys.map((key,index)=>db.prepare("INSERT INTO site_settings(key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(key,JSON.stringify(values[index]),now)),db.prepare("INSERT INTO audit_log(actor_id,action,target_id,payload,created_at) VALUES (?,'access.roles',NULL,?,?)").bind(user.discord_id,JSON.stringify({owners,admins,managers}),now)]);
  return Response.json({ok:true,owners,admins,managers});
 }
 if(body.action==='managers'){
  if(!validIds(body.ids))return Response.json({error:'Неверные Discord ID'},{status:400});
  const roles=await roleState(),elevated=new Set([...ownerIds(),...adminIds(),...roles.owners,...roles.admins]);
  const managers=[...new Set(body.ids)].filter(id=>!elevated.has(id));
  await db.batch([db.prepare("INSERT INTO site_settings(key,value,updated_at) VALUES ('bridge:managers',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(JSON.stringify(managers),now),db.prepare("INSERT INTO audit_log(actor_id,action,target_id,payload,created_at) VALUES (?,'bridge.managers',NULL,?,?)").bind(user.discord_id,JSON.stringify({ids:managers}),now)]);
  return Response.json({ok:true,managers});
 }
 if(getRuntimeValue('BOT_WEBHOOK_SECRET'))return Response.json({error:'Ключ задан в настройках сервера. Измените его там.'},{status:409});
 if(body.action!=='rotate')return Response.json({error:'Неверное действие'},{status:400});
 const secret=randomToken(32);
 await db.batch([db.prepare("INSERT INTO site_settings(key,value,updated_at) VALUES ('bridge:secret',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(secret,now),db.prepare("INSERT INTO audit_log(actor_id,action,target_id,payload,created_at) VALUES (?,'bridge.rotate',NULL,'{}',?)").bind(user.discord_id,now),db.prepare("DELETE FROM site_settings WHERE key='bridge:heartbeat'")]);
 return Response.json({secret},{headers:{'Cache-Control':'private, no-store'}});
}
