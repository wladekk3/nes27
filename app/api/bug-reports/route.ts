import {ensureBugReportsTable} from '@/lib/bug-reports';
import {getD1,getSessionUser,hasAdminAccess,randomToken} from '@/lib/s27-server';

function cookie(request:Request,name:string){for(const part of(request.headers.get('cookie')||'').split(';')){const[key,...value]=part.trim().split('=');if(key===name)return decodeURIComponent(value.join('='));}return null;}
function text(value:unknown,max:number){return typeof value==='string'?value.trim().slice(0,max):'';}

export async function POST(request:Request){
 try{
  await ensureBugReportsTable();
  const db=getD1(),body=await request.json() as Record<string,unknown>,user=await getSessionUser(request);
  if(body.action==='resolve'){
   if(!user||!(await hasAdminAccess(user.discord_id)))return Response.json({error:'Нет доступа'},{status:403});
   const id=text(body.id,100);if(!id)return Response.json({error:'Неверный отчёт'},{status:400});
   await db.prepare("UPDATE bug_reports SET status='resolved',resolved_at=? WHERE id=? AND status='open'").bind(Date.now(),id).run();
   return Response.json({ok:true});
  }
  const section=text(body.section,100)||'Не указан',description=text(body.description,2000),userAgent=text(body.userAgent,500),pageUrl=text(body.pageUrl,500);
  if(description.length<5)return Response.json({error:'Опишите ошибку подробнее'},{status:400});
  let visitorId=cookie(request,'s27_visitor'),fresh=false;if(!visitorId||!/^[a-f0-9]{32}$/.test(visitorId)){visitorId=randomToken(16);fresh=true;}
  const now=Date.now(),recent=await db.prepare('SELECT COUNT(*) count FROM bug_reports WHERE visitor_id=? AND created_at>?').bind(visitorId,now-60_000).first<{count:number}>();
  if((recent?.count??0)>0)return Response.json({error:'Подождите минуту перед следующим отчётом'},{status:429});
  const daily=await db.prepare('SELECT COUNT(*) count FROM bug_reports WHERE visitor_id=? AND created_at>?').bind(visitorId,now-86_400_000).first<{count:number}>();
  if((daily?.count??0)>=10)return Response.json({error:'Достигнут дневной лимит отчётов'},{status:429});
  const id=crypto.randomUUID();
  await db.batch([
   db.prepare("INSERT INTO bug_reports(id,user_id,visitor_id,section,description,user_agent,page_url,status,created_at) VALUES (?,?,?,?,?,?,?,'open',?)").bind(id,user?.discord_id??null,visitorId,section,description,userAgent,pageUrl,now),
   db.prepare("INSERT INTO audit_log(actor_id,action,target_id,payload,created_at) VALUES (?,'bug.report',?,?,?)").bind(user?.discord_id??null,id,JSON.stringify({section}),now),
  ]);
  return Response.json({ok:true,id},{status:201,headers:{'Cache-Control':'no-store',...(fresh?{'Set-Cookie':`s27_visitor=${visitorId}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=31536000`}:{})}});
 }catch(error){console.error('bug report failed',error);return Response.json({error:'Не удалось отправить отчёт. Попробуйте позже.'},{status:503});}
}
