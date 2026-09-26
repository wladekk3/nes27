import {getD1} from '@/lib/s27-server';

const fallbackProfile={nickname:'',bio:'',status:'На связи',avatar:'shinigami',equipped:'{}',showcase:'[]'};

export async function GET(request:Request){
 try{
  const db=getD1(),url=new URL(request.url),username=(url.searchParams.get('username')||'').replace(/^@/,'').trim().slice(0,64),q=(url.searchParams.get('q')||'').replace(/^@/,'').trim().slice(0,64);
  if(username){
   const member=await db.prepare(`SELECT u.discord_id,u.username,u.display_name,u.avatar_url,u.created_at,p.nickname,p.bio,p.status,p.avatar,p.equipped,p.showcase,
    COALESCE((SELECT SUM(count) FROM user_cards WHERE user_id=u.discord_id),0) AS card_total,
    COALESCE((SELECT COUNT(*) FROM user_cards WHERE user_id=u.discord_id AND count>0),0) AS card_types,
    COALESCE((SELECT COUNT(*) FROM referrals WHERE referrer_user_id=u.discord_id AND status='verified'),0) AS invites
    FROM users u JOIN site_registrations s ON s.user_id=u.discord_id LEFT JOIN user_profiles p ON p.user_id=u.discord_id
    WHERE u.discord_id NOT LIKE 'lab:%' AND lower(u.username)=lower(?) LIMIT 1`).bind(username).first<any>();
   if(!member)return Response.json({error:'Participant not found'},{status:404});
   const cards=await db.prepare('SELECT card_slug,count FROM user_cards WHERE user_id=? AND count>0 ORDER BY count DESC,card_slug').bind(member.discord_id).all<any>();
   delete member.discord_id;
   return Response.json({member:{...fallbackProfile,...member,cards:cards.results,showcase:safeArray(member.showcase),equipped:safeObject(member.equipped)}} ,{headers:{'Cache-Control':'public, max-age=30'}});
  }
  const rows=await db.prepare(`SELECT u.username,u.display_name,u.avatar_url,COALESCE(p.nickname,'') AS nickname,COALESCE(p.status,'На связи') AS status,
   COALESCE((SELECT COUNT(*) FROM user_cards WHERE user_id=u.discord_id AND count>0),0) AS card_types
   FROM users u JOIN site_registrations s ON s.user_id=u.discord_id LEFT JOIN user_profiles p ON p.user_id=u.discord_id
   WHERE u.discord_id NOT LIKE 'lab:%' AND (?='' OR instr(lower(u.username),lower(?))>0 OR instr(lower(u.display_name),lower(?))>0 OR instr(lower(COALESCE(p.nickname,'')),lower(?))>0)
   ORDER BY CASE WHEN lower(u.username)=lower(?) THEN 0 ELSE 1 END,u.display_name COLLATE NOCASE LIMIT 24`).bind(q,q,q,q,q).all<any>();
  return Response.json({members:rows.results},{headers:{'Cache-Control':'public, max-age=20'}});
 }catch(e){console.error('public profiles unavailable',e);return Response.json({error:'Profiles unavailable'},{status:503});}
}
function safeArray(value:any){try{const parsed=JSON.parse(value||'[]');return Array.isArray(parsed)?parsed.slice(0,3):[];}catch{return [];}}
function safeObject(value:any){try{const parsed=JSON.parse(value||'{}');return parsed&&typeof parsed==='object'?parsed:{};}catch{return {};}}
