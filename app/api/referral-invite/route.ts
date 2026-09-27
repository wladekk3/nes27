import {getD1,getSessionUser} from '@/lib/s27-server';

type InviteRow={invite_code:string};

async function currentInvite(userId:string){
 return getD1().prepare(
  'SELECT invite_code FROM referral_invites WHERE referrer_user_id=? ORDER BY created_at ASC LIMIT 1'
 ).bind(userId).first<InviteRow>();
}

function ready(code:string){
 return {status:'ready',inviteCode:code,inviteUrl:`https://discord.gg/${code}`};
}

export async function GET(request:Request){
 const user=await getSessionUser(request);
 if(!user)return Response.json({error:'Войдите в профиль'},{status:401});
 if(user.discord_id.startsWith('lab:'))return Response.json({error:'Подключите Discord для приглашений'},{status:400});
 const invite=await currentInvite(user.discord_id);
 if(invite)return Response.json(ready(invite.invite_code));
 const row=await getD1().prepare('SELECT status,error FROM referral_invite_requests WHERE user_id=?').bind(user.discord_id).first<{status:string;error:string|null}>();
 return Response.json(row??{status:'not_requested'});
}

export async function POST(request:Request){
 if(new URL(request.url).origin!==request.headers.get('origin'))return Response.json({error:'Недопустимый источник запроса'},{status:403});
 const user=await getSessionUser(request);
 if(!user)return Response.json({error:'Войдите в профиль'},{status:401});
 if(user.discord_id.startsWith('lab:'))return Response.json({error:'Подключите Discord для приглашений'},{status:400});
 const invite=await currentInvite(user.discord_id);
 if(invite)return Response.json(ready(invite.invite_code));
 const now=Date.now();
 await getD1().prepare(
  `INSERT INTO referral_invite_requests(user_id,status,error,created_at,updated_at) VALUES (?,'pending',NULL,?,?)
   ON CONFLICT(user_id) DO UPDATE SET status='pending',error=NULL,updated_at=excluded.updated_at`
 ).bind(user.discord_id,now,now).run();
 return Response.json({status:'pending'});
}
