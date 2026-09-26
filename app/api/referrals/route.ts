import {getD1,getSessionUser,profilePayload} from '@/lib/s27-server';
import {trackReferral} from '@/lib/referrals';
export async function POST(r:Request){try{
 const u=await getSessionUser(r);if(!u)return Response.json({error:'Войдите в профиль'},{status:401});
 if(u.discord_id.startsWith('lab:'))return Response.json({error:'Подключите Discord для приглашений'},{status:400});
 const b=await r.json();let nick=String(b.referrer||'').trim().replace(/^@/,'');
 if(nick.length>100)return Response.json({error:'Укажите @ник пригласившего'},{status:400});
 const target=await getD1().prepare('SELECT u.discord_id FROM users u JOIN site_registrations s ON s.user_id=u.discord_id WHERE lower(u.username)=lower(?) LIMIT 1').bind(nick).first<{discord_id:string}>();
 if(!target)return Response.json({error:'Пригласивший ещё не зарегистрирован на сайте'},{status:404});
 await trackReferral(target.discord_id,u.discord_id,'site:'+nick);
 return Response.json({ok:true,profile:await profilePayload(u.discord_id)});
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Ошибка приглашения'},{status:409});}}
