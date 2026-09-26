import {additionalSecrets} from '@/lib/secret-card-data';
import {secretCopy} from '@/lib/secret-card-copy';
import {uniqueCards} from '@/lib/collection-rewards';
import {getD1,getSessionUser} from '@/lib/s27-server';
const secrets=[{slug:'manager',name:'MANAGER',callsign:'КУРАТОР',weapon:'???',tirazh:null},{slug:'founders',name:'ДВА ИСТОЧНИКА',callsign:'SHINIGAMI · WLADEKK3',weapon:'—',tirazh:24}];
export async function GET(r:Request){const u=await getSessionUser(r);const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};if(!u)return Response.json({cards:[]},{headers});const owned=await getD1().prepare('SELECT card_slug FROM user_cards WHERE user_id=? AND count>0').bind(u.discord_id).all<{card_slug:string}>();return Response.json({cards:[...secrets.map(c=>({...c,rarity:'МИФИЧЕСКАЯ'})),...additionalSecrets].filter(c=>owned.results.some((o:{card_slug:string})=>o.card_slug===c.slug)).map(c=>({...c,...secretCopy[c.slug],rarity:uniqueCards.includes(c.slug)?'УНИКАЛЬНАЯ':c.rarity,secret:true,image:'/api/card-art?id='+c.slug}))},{headers});}
