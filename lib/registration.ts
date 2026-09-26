import {getD1} from './s27-server';
export async function registerSiteMember(id:string){
 if(!/^\d{16,22}$/.test(id))return;
 const db=getD1(),now=Date.now();
 await db.batch([
  db.prepare("INSERT OR IGNORE INTO site_registrations(user_id,created_at) SELECT user_id,MIN(used_at) FROM link_codes WHERE used_at IS NOT NULL AND user_id NOT LIKE 'lab:%' AND NOT EXISTS(SELECT 1 FROM site_settings WHERE key='registration:history_seeded') GROUP BY user_id ORDER BY MIN(used_at),user_id"),
  db.prepare("INSERT OR IGNORE INTO site_settings(key,value,updated_at) VALUES ('registration:history_seeded','1',?)").bind(now),
  db.prepare('INSERT OR IGNORE INTO site_registrations(user_id,created_at) VALUES (?,?)').bind(id,now),
  db.prepare("UPDATE users SET tokens=tokens+2,updated_at=? WHERE discord_id=? AND EXISTS(SELECT 1 FROM site_registrations WHERE user_id=?) AND NOT EXISTS(SELECT 1 FROM operations WHERE id='welcome:'||users.discord_id)").bind(now,id,id),
  db.prepare("INSERT INTO audit_log(actor_id,action,target_id,payload,created_at) SELECT user_id,'registration.welcome',user_id,'{\"coupons\":2}',? FROM site_registrations r WHERE r.user_id=? AND NOT EXISTS(SELECT 1 FROM operations WHERE id='welcome:'||r.user_id)").bind(now,id),
  db.prepare("INSERT INTO operations(id,user_id,action,result,valid,created_at) SELECT 'welcome:'||user_id,user_id,'registration.welcome','{\"coupons\":2}',1,? FROM site_registrations r WHERE r.user_id=? AND NOT EXISTS(SELECT 1 FROM operations WHERE id='welcome:'||r.user_id)").bind(now,id),
 ]);
}
