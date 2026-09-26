// Presentation only: rewards and rarity probabilities remain server-authoritative.
export function landingFraction(sample:number){if(!Number.isFinite(sample)||sample<0||sample>=1)throw new RangeError('sample');return .015+sample*.97;}
export function wheelLanding(weights:readonly number[],rank:number,fraction:number){if(rank<0||rank>=weights.length||fraction<=0||fraction>=1)throw new RangeError('landing');const total=weights.reduce((a,b)=>a+b,0);return (weights.slice(0,rank).reduce((a,b)=>a+b,0)+weights[rank]*fraction)/total*360;}
export function caseLanding(index:number,width:number,gap:number,fraction:number){return index*(width+gap)+width*fraction;}
export function randomPresentation(){const x=new Uint32Array(3);crypto.getRandomValues(x);return {fraction:landingFraction(x[0]/4294967296),index:26+x[1]%7,turns:6+x[2]%3};}
