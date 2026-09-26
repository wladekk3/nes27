'use client';
export type AudioPrefs={volume:number;clicks:number;effects:number;muted:boolean;pack:string;useEquipped:boolean};
export const defaultAudio:AudioPrefs={volume:22,clicks:15,effects:45,muted:false,pack:'soft',useEquipped:true};
let prefs={...defaultAudio},ctx:AudioContext|null=null,master:GainNode|null=null;
export function configureAudio(value:AudioPrefs){prefs=value;if(master&&ctx)master.gain.setTargetAtTime(value.muted?0:value.volume/100,ctx.currentTime,.04);}
export function unlockAudio(){try{if(!ctx){ctx=new AudioContext();master=ctx.createGain();master.connect(ctx.destination);master.gain.value=prefs.muted?0:prefs.volume/100;}if(ctx.state==='suspended')void ctx.resume().catch(()=>{});}catch{}}
function softTone(freq:number,duration:number,delay:number,level:number,channel:'clicks'|'effects'='effects'){
 if(!ctx||!master||ctx.state!=='running'||prefs.muted)return;const t=ctx.currentTime+delay,o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(level*prefs[channel]/100,t+.025);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(master);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
}
function air(duration:number,level:number,channel:'clicks'|'effects'){
 if(!ctx||!master||ctx.state!=='running'||prefs.muted)return;const size=Math.ceil(ctx.sampleRate*duration),buffer=ctx.createBuffer(1,size,ctx.sampleRate),samples=buffer.getChannelData(0);for(let i=0;i<size;i++)samples[i]=(Math.random()*2-1);const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=450;const t=ctx.currentTime;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(level*prefs[channel]/100,t+Math.min(.12,duration/3));gain.gain.exponentialRampToValueAtTime(.0001,t+duration);source.connect(filter);filter.connect(gain);gain.connect(master);source.start(t);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
}
export const freeSounds=[{id:'soft',name:'ТИХАЯ МЕХАНИКА',description:'Мягкий щелчок и тёплый отклик.'},{id:'glass',name:'СТЕКЛО',description:'Короткие прозрачные ноты.'},{id:'relay',name:'ПОЛЕВОЕ РЕЛЕ',description:'Низкий сухой щелчок прибора.'}];
const tuning:Record<string,number>={soft:1,glass:1.5,relay:.75,'sound-crystal':1.25,'sound-vault':.5,'sound-orbit':.9};
function tune(){return tuning[prefs.pack]||1;}
export function previewSound(pack:string){const old=prefs;prefs={...prefs,pack};playClick();playPhase(1);prefs=old;}
export function playClick(){unlockAudio();const t=tune();if(prefs.pack==='soft'||prefs.pack==='relay'||prefs.pack==='sound-vault')air(.065,.13,'clicks');softTone(240*t,.13,0,.045,'clicks');if(prefs.pack==='glass'||prefs.pack==='sound-crystal')softTone(720*t,.22,.025,.022,'clicks');}
export function playPhase(phase:number){unlockAudio();softTone((174.61+phase*43.65)*tune(),.65,0,.038);softTone((261.63+phase*32.7)*tune(),.75,.09,.022);}

export function playCharge(){unlockAudio();air(1.3,.16,'effects');softTone(130.81*tune(),1.4,0,.07);softTone(196*tune(),1.2,.12,.035);}
export function playReveal(rank:number){unlockAudio();const notes=[[261.63,392],[261.63,329.63,392],[220,329.63,440],[261.63,329.63,392,523.25],[196,293.66,392,587.33]][rank]??[261.63];notes.forEach((n,i)=>softTone(n*tune(),1.3,i*.11,.055));}
