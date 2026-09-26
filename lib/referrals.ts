import {getD1} from './s27-server';
export function eligibleDiscordAccount(id:string,now=Date.now()){
 if(!/^\d{16,22}$/.test(id))return false;
 const born=Number(BigInt(id)>>22n)+1420070400000;
 return born<=now-30*86400000&&born>=1420070400000;
}
export async function trackReferral(referrer:string,referred:string,code:string){
 if(referrer===referred)throw Error('Нельзя пригласить себя');
 if(!eligibleDiscordAccount(referred))throw Error('Аккаунту Discord должно быть не менее 30 дней');
 const db=getD1(),now=Date.now();
 await db.prepare("INSERT OR IGNORE INTO referrals(referrer_user_id,referred_user_id,invite_code,status,reward_tokens,verify_after,created_at) VALUES (?,?,?,'pending',0,?,?)").bind(referrer,referred,code,now,now).run();
 const row=await db.prepare('SELECT id,referrer_user_id,status FROM referrals WHERE referred_user_id=?').bind(referred).first<any>();
 if(!row||row.referrer_user_id!==referrer||row.status==='rejected')throw Error('Приглашение уже связано с другим участником или отклонено');
 return row.status==='verified'||await verifyReferral(row.id,referrer);
}
export async function verifyReferral(id:number,referrer:string){const db=getD1(),now=Date.now();const r=await db.batch([
 db.prepare("UPDATE referrals SET status='verified',reward_tokens=0,verified_at=? WHERE id=? AND status='pending'").bind(now,id),
 db.prepare("UPDATE users SET tokens=tokens+CASE WHEN (SELECT COUNT(*) FROM referrals WHERE referrer_user_id=? AND status='verified' AND reward_tokens>=0)%2=0 THEN 1 ELSE 0 END,updated_at=? WHERE discord_id=? AND changes()=1").bind(referrer,now,referrer),
 db.prepare("INSERT INTO audit_log(actor_id,action,target_id,payload,created_at) SELECT 'bot','referral.verified',?,'{}',? WHERE changes()=1").bind(referrer,now),
 ]);return r[0].meta.changes===1;}
