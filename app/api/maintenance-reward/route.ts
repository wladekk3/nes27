import {getD1,getSessionUser,parseCookie} from '@/lib/s27-server';

function randomCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const bytes=crypto.getRandomValues(new Uint8Array(16));return Array.from(bytes,(n,i)=>(i&&i%4===0?'-':'')+alphabet[n%alphabet.length]).join('');}
function visitorCookie(id:string){return `s27_visitor=${encodeURIComponent(id)}; Path=/; Secure; SameSite=Lax; Max-Age=31536000`;}

export async function POST(request:Request){
 try{
  const db=getD1(),user=await getSessionUser(request),configRow=await db.prepare("SELECT value,updated_at FROM site_settings WHERE key='site_config'").first<{value:string;updated_at:number}>();
  const config=configRow?JSON.parse(configRow.value):{};
  if(config.maintenanceMode!==true)return Response.json({error:'The maintenance event is not active.'},{status:409});
  // Pauses enabled before the Arkanoid update have no explicit cycle number.
  // The saved config timestamp is a stable fallback for that already-running pause.
  const cycle=String(Number(config.maintenanceCycle)||configRow?.updated_at||'legacy');
  let visitor=parseCookie(request,'s27_visitor');if(!visitor||!/^[a-zA-Z0-9_-]{12,80}$/.test(visitor))visitor=crypto.randomUUID();
  const claimant=user?'user:'+user.discord_id:'visitor:'+visitor;
  const previous=await db.prepare('SELECT c.code FROM maintenance_rewards m JOIN reward_codes c ON c.id=m.code_id WHERE m.cycle_id=? AND m.claimant=?').bind(cycle,claimant).first<{code:string}>();
  if(previous)return Response.json({ok:true,code:previous.code,alreadyClaimed:true},{headers:{'Set-Cookie':visitorCookie(visitor),'Cache-Control':'no-store'}});
  const now=Date.now(),id=crypto.randomUUID(),code=randomCode();
  try{await db.batch([
   db.prepare("INSERT INTO reward_codes(id,code,scope,kind,reward_type,reward_item,reward_amount,coupons,max_uses,uses,active,creator,note,created_at) VALUES (?,?,'live','prize','coupons','',0,2,1,0,1,'system:maintenance',?,?)").bind(id,code,'Арканоид NE S27 · цикл '+cycle,now),
   db.prepare('INSERT INTO maintenance_rewards(cycle_id,claimant,code_id,created_at) VALUES (?,?,?,?)').bind(cycle,claimant,id,now),
  ]);}catch{
   const raced=await db.prepare('SELECT c.code FROM maintenance_rewards m JOIN reward_codes c ON c.id=m.code_id WHERE m.cycle_id=? AND m.claimant=?').bind(cycle,claimant).first<{code:string}>();
   if(!raced)throw Error('claim_failed');
   return Response.json({ok:true,code:raced.code,alreadyClaimed:true},{headers:{'Set-Cookie':visitorCookie(visitor),'Cache-Control':'no-store'}});
  }
  return Response.json({ok:true,code,coupons:2},{headers:{'Set-Cookie':visitorCookie(visitor),'Cache-Control':'no-store'}});
 }catch(error){console.error('maintenance reward',error);return Response.json({error:'Reward is temporarily unavailable.'},{status:503});}
}
