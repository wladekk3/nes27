import {getD1} from './s27-server';
import {newsChannelIds} from './collection-rewards';
const SERVICE_MESSAGE=/^(?:по\s+всем\s+вопросам\s+(?:пишите?|писать|обращайтесь?)\s+(?:к\s+)?менеджеру|for\s+all\s+(?:questions|inquiries)[\s\S]{0,80}(?:manager|management)|з\s+усіх\s+питань[\s\S]{0,80}менеджер)/iu;
export function isServiceNews(content:unknown){return typeof content==='string'&&SERVICE_MESSAGE.test(content.trim().replace(/^#+\s*/,''));}
export async function receiveNews(p:any){
 if(!newsChannelIds.includes(p.channelId)||!/^\d{16,22}$/.test(p.messageId||'')||!/^\d{16,22}$/.test(p.guildId||''))return Response.json({error:'Channel not allowed or invalid message'},{status:400});
 const version=Number(p.version);if(!Number.isSafeInteger(version)||version<0||version>Date.now()+300000)return Response.json({error:'Invalid version'},{status:400});
 const key='discord-news:'+p.messageId;
 if(p.action==='news_delete'){await getD1().prepare("INSERT INTO site_settings(key,value,updated_at) VALUES (?,'{\"deleted\":true}',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at WHERE excluded.updated_at>=site_settings.updated_at").bind(key,version).run();return Response.json({ok:true});}
 if(typeof p.content!=='string'||p.content.length>12000||typeof p.channelName!=='string'||p.channelName.length>100)return Response.json({error:'Invalid news content'},{status:400});
 if(isServiceNews(p.content)){await getD1().prepare("INSERT INTO site_settings(key,value,updated_at) VALUES (?,'{\"deleted\":true}',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at WHERE excluded.updated_at>=site_settings.updated_at").bind(key,version).run();return Response.json({ok:true,ignored:true});}
 const images=(Array.isArray(p.images)?p.images:[]).slice(0,8).filter((s:any)=>{try{const u=new URL(s);return u.protocol==='https:'&&['cdn.discordapp.com','media.discordapp.net'].includes(u.hostname);}catch{return false;}});
 const data={id:p.messageId,channelId:p.channelId,channelName:p.channelName,content:p.content,images,date:Number(p.createdAt)||version,url:`https://discord.com/channels/${p.guildId}/${p.channelId}/${p.messageId}`};
 await getD1().prepare('INSERT INTO site_settings(key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at WHERE excluded.updated_at>=site_settings.updated_at').bind(key,JSON.stringify(data),version).run();return Response.json({ok:true});
}
