import {pool} from './economy';

// Parts per million keep server-side rolls exact. The adjacent-rarity path is
// intentionally exciting without replacing caches: Epic 10%, Legendary 3%,
// and Mythic 1% for one card. Lower-rarity jumps remain substantially harder.
const chanceByTarget:Record<number,Record<number,number>>={
 1:{0:150000},
 2:{0:10000,1:100000},
 3:{0:300,1:3000,2:30000},
 4:{0:12,1:120,2:1200,3:10000},
};
const setBonus=[0,1,1.03,1.08] as const;
export function upgradeChance(targetRank:number,stakes:readonly number[]){
 if(!Number.isInteger(targetRank)||targetRank<1||targetRank>4||stakes.length<1||stakes.length>3||stakes.some(r=>!Number.isInteger(r)||r<0||r>=targetRank))throw Error('Invalid upgrade');
 const miss=stakes.reduce((product,rank)=>product*(1-chanceByTarget[targetRank][rank]/1_000_000),1);
 return Math.min(350000,Math.max(1,Math.round((1-miss)*1_000_000*setBonus[stakes.length])));
}
export function upgradeTarget(slug:string){return slug==='mythic'?{rank:4,slug:null}:pool.filter(c=>c[1]>=1&&c[1]<=3).map(c=>({slug:c[0],rank:c[1]})).find(c=>c.slug===slug);}
