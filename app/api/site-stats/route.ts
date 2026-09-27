import {getD1,randomToken} from '@/lib/s27-server';
const accountBaselineKey='stats:production_account_baseline:v1';
function cookie(r:Request,n:string){for(const p of(r.headers.get('cookie')||'').split(';')){const[k,...v]=p.trim().split('=');if(k===n)return decodeURIComponent(v.join('='));}return null;}
async function stats(){
 const db=getD1(),now=Date.now();
 await db.prepare("INSERT OR IGNORE INTO site_settings(key,value,updated_at) SELECT ?,CAST(COALESCE(MAX(id),0) AS TEXT),? FROM site_registrations").bind(accountBaselineKey,now).run();
 const baselineRow=await db.prepare('SELECT value FROM site_settings WHERE key=?').bind(accountBaselineKey).first<{value:string}>();
 const baseline=Math.max(0,Number(baselineRow?.value)||0);
 const[v,a]=await Promise.all([db.prepare('SELECT COUNT(*) count FROM site_visitors').first<{count:number}>(),db.prepare("SELECT COUNT(*) count FROM site_registrations WHERE user_id NOT LIKE 'lab:%' AND id>?").bind(baseline).first<{count:number}>()]);
 return{visitors:v?.count??0,accounts:a?.count??0};
}
export async function GET(){try{return Response.json(await stats(),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({visitors:0,accounts:0})}}
export async function POST(r:Request){try{const db=getD1(),now=Date.now();let id=cookie(r,'s27_visitor');const fresh=!id||!/^[a-f0-9]{32}$/.test(id);if(fresh)id=randomToken(16);await db.batch([db.prepare("INSERT OR IGNORE INTO site_registrations(user_id,created_at) SELECT user_id,MIN(used_at) FROM link_codes WHERE used_at IS NOT NULL AND user_id NOT LIKE 'lab:%' GROUP BY user_id"),db.prepare('INSERT INTO site_visitors(visitor_id,first_seen_at,last_seen_at,visits) VALUES (?,?,?,1) ON CONFLICT(visitor_id) DO UPDATE SET last_seen_at=excluded.last_seen_at,visits=site_visitors.visits+1').bind(id,now,now)]);return Response.json(await stats(),{headers:{'Cache-Control':'no-store',...(fresh?{'Set-Cookie':`s27_visitor=${id}; Path=/; Secure; SameSite=Lax; Max-Age=31536000`}:{})}})}catch{return Response.json({visitors:0,accounts:0},{status:503})}}
