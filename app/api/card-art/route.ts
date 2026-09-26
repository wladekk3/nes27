import {additionalArt} from '@/lib/secret-card-data';
import {getD1,getSessionUser} from '@/lib/s27-server';
import {privateArt} from '@/lib/private-art';
import {privateArtEn} from '@/lib/private-art-en';
export async function GET(r:Request){const u=await getSessionUser(r);const url=new URL(r.url);const slug=url.searchParams.get('id')||'';const english=url.searchParams.get('lang')==='en';const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};if(!u)return new Response(null,{status:404,headers});const owned=await getD1().prepare('SELECT count FROM user_cards WHERE user_id=? AND card_slug=? AND count>0').bind(u.discord_id,slug).first();const art=english?privateArtEn[slug]:(privateArt[slug]||additionalArt[slug]||privateArtEn[slug]);if(!owned||!art)return new Response(null,{status:404,headers});return new Response(Uint8Array.from(atob(art),c=>c.charCodeAt(0)),{headers:{...headers,'Content-Type':'image/webp','X-Content-Type-Options':'nosniff'}});}
