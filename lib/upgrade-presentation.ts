export function upgradeSectorStart(chance:number,position:'top'|'bottom'){
 return (position==='bottom'?180:0)-chance*3.6/2;
}
export function upgradeNeedleAngle(roll:number,chance:number,position:'top'|'bottom'){
 return upgradeSectorStart(chance,position)+roll*3.6;
}
export const upgradeDurations={fast:1200,slow:6000};
