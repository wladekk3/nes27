import {mkdirSync,writeFileSync,unlinkSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
// Original offline-rendered sound design; no third-party recordings.
const rate=24000;mkdirSync('public/audio',{recursive:true});let seed=27012;
function noise(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;}
function render(name,duration,make){const length=Math.ceil(rate*duration),out=new Float32Array(length);make(out);let peak=.001;for(const v of out)peak=Math.max(peak,Math.abs(v));const gain=.68/Math.max(1,peak),buf=Buffer.alloc(44+length*2);buf.write('RIFF');buf.writeUInt32LE(36+length*2,4);buf.write('WAVEfmt ',8);buf.writeUInt32LE(16,16);buf.writeUInt16LE(1,20);buf.writeUInt16LE(1,22);buf.writeUInt32LE(rate,24);buf.writeUInt32LE(rate*2,28);buf.writeUInt16LE(2,32);buf.writeUInt16LE(16,34);buf.write('data',36);buf.writeUInt32LE(length*2,40);for(let i=0;i<length;i++)buf.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(out[i]*gain*32767))),44+i*2);writeFileSync('public/audio/'+name+'.wav',buf);}
// Physical-style transients and filtered air only: no musical notes or chords.
function air(a,start,duration,level,cut=.2){let low=0;for(let i=0;i<duration*rate;i++){const j=Math.floor(start*rate)+i;if(j>=a.length)break;low+=(noise()-low)*cut;const x=i/(duration*rate);a[j]+=low*level*Math.sin(Math.PI*x)**2;}}
function pop(a,start=0,level=.6){let low=0;for(let i=0;i<rate*.075;i++){const j=Math.floor(start*rate)+i;if(j>=a.length)break;const t=i/rate;low+=(noise()-low)*.32;const shell=Math.sin(2*Math.PI*(230*t-1100*t*t))*Math.exp(-t*100);a[j]+=level*Math.min(1,t/.0015)*(low*Math.exp(-t*160)+shell*.45);}}
function shutter(a,start=0,level=.7){air(a,start,.018,level,.35);air(a,start+.028,.028,level*.65,.2);}
function latch(a,start=0,level=.7){air(a,start,.032,level,.13);pop(a,start+.037,level*.35);}
render('click-soft',.12,a=>pop(a));
render('click-glass',.14,a=>shutter(a));
render('click-relay',.16,a=>latch(a));
render('click-paper',.2,a=>{air(a,0,.12,.5,.48);air(a,.08,.07,.22,.25);});
render('click-switch',.16,a=>{latch(a,0,.5);latch(a,.08,.3);});
render('click-rain',.16,a=>{pop(a,0,.35);pop(a,.06,.18);});
render('vault-charge',1.75,a=>{latch(a,0,.7);air(a,.12,1.5,.9,.035);shutter(a,1.5,.4);});
for(let stage=0;stage<4;stage++)render('vault-stage-'+stage,.7,a=>{air(a,0,.3,.6,.06+stage*.025);latch(a,.25,.65);if(stage>1)shutter(a,.38,.3);});
for(let rank=0;rank<5;rank++)render('vault-reveal-'+rank,1.6+rank*.18,a=>{pop(a,0,.65);air(a,.01,.6,.95,.025);air(a,.25,1+rank*.15,.5,.08);for(let n=0;n<=rank;n++)shutter(a,.3+n*.12,.22);});
render('case-charge',1.2,a=>{for(let i=0;i<8;i++)latch(a,i*.12,.25);air(a,0,1,.3,.06);});
render('case-result',.65,a=>{latch(a,0,.7);air(a,.08,.45,.5,.08);});
console.log('Rendered 18 original foley-style effects without melodic notes');
// Cinematic game cues: tuned metal resonances, sub impacts, air sweeps and sparse echoes.
function impact(a,start,power=1,scale=1){for(let i=0;i<rate*1.6;i++){const j=Math.floor(start*rate)+i;if(j>=a.length)break;const t=i/rate,attack=Math.min(1,t/.003);let v=Math.sin(2*Math.PI*(62*t+1.8*(1-Math.exp(-22*t))))*Math.exp(-9*t)*.6;for(const [hz,g,decay] of [[173,.16,6],[391,.10,4],[717,.06,5],[1133,.035,7]])v+=Math.sin(2*Math.PI*hz*scale*t)*g*Math.exp(-decay*t);a[j]+=v*attack*power;}air(a,start,.09,power*.7,.65);}
function sweep(a,start,duration,power){let low=0;for(let i=0;i<rate*duration;i++){const j=Math.floor(start*rate)+i;if(j>=a.length)break;const x=i/(rate*duration);low+=(noise()-low)*(.015+.7*x*x);a[j]+=low*Math.sin(Math.PI*x)**.8*power;}}
render('arrival-fire',3.8,a=>{air(a,0,3.8,.55,.014);for(let i=0;i<24;i++){const t=.08+i*.14+Math.abs(noise())*.09;pop(a,t,.12+Math.abs(noise())*.35);}});
// Latch disengages, pressure builds, the vault door releases.
render('vault-charge',2.2,a=>{latch(a,0,.8);impact(a,.12,.35,.6);sweep(a,.25,1.65,.9);shutter(a,1.92,.55);});
for(let stage=0;stage<4;stage++)render('vault-stage-'+stage,1.15,a=>{sweep(a,0,.32,.55);impact(a,.28,.55+stage*.06,1+stage*.16);air(a,.32,.6,.25,.06);});
for(let rank=0;rank<5;rank++)render('vault-reveal-'+rank,2.5+rank*.35,a=>{sweep(a,0,.22+rank*.05,.6);impact(a,.22+rank*.05,.85,1-rank*.1);if(rank>=1){sweep(a,.45,1.3,.3+rank*.12);impact(a,.6,.2,.8);}if(rank>=2){impact(a,.92,.25,.6);sweep(a,1.1,1.1,.4);}if(rank>=3){impact(a,1.5,.35,.45);air(a,1.7,1.4,.3,.04);}if(rank===4){sweep(a,1.8,.7,.65);impact(a,2.5,.5,.4);}});
render('case-charge',1.4,a=>{for(let i=0;i<10;i++)shutter(a,i*.1,.25);sweep(a,.1,1.15,.6);});
render('case-result',1.8,a=>{impact(a,.03,.8);sweep(a,.2,.8,.35);});
console.log('Rendered cinematic field-vault cues and a non-looping fire arrival');

// Five independent sonic identities, rather than increasingly long copies.
function resonance(a,start,duration,hz,level,decay=2,mod=0){for(let i=0;i<duration*rate;i++){const j=Math.floor(start*rate)+i;if(j>=a.length)break;const t=i/rate;const fade=Math.min(1,t/.012)*Math.min(1,(duration-t)/.18);a[j]+=level*fade*Math.exp(-decay*t)*Math.sin(2*Math.PI*hz*t+mod*Math.sin(2*Math.PI*hz*1.414*t)*Math.exp(-3*t));}}
render('vault-reveal-0',1.3,a=>{latch(a,0,.8);air(a,.06,.38,.65,.11);impact(a,.09,.35,1.3);shutter(a,.24,.3);});
render('vault-reveal-1',2.4,a=>{sweep(a,0,.32,.6);for(const [t,h] of [[.28,640],[.43,960],[.61,1280]])resonance(a,t,1.7,h,.17,2.3,1.5);air(a,.3,1.5,.25,.2);});
render('vault-reveal-2',3.1,a=>{sweep(a,0,.65,.85);resonance(a,.25,2.7,93,.36,1.6,7);impact(a,.64,.55,.75);for(let n=0;n<6;n++)air(a,.72+n*.085,.045,.6,.7);resonance(a,1,1.8,311,.11,2,3);});
render('vault-reveal-3',3.5,a=>{sweep(a,0,.36,.8);impact(a,.36,.95,.7);for(const hz of [146,219,292,438])resonance(a,.38,2.9,hz,.14,1.15,1.1);impact(a,.95,.28,1.6);air(a,.6,2.7,.35,.12);});
render('vault-reveal-4',4,a=>{resonance(a,0,.5,61,.2,1,4);sweep(a,.15,.9,.9);impact(a,1.06,1,.38);resonance(a,1.07,2.85,43,.4,1.3,4);resonance(a,1.3,2.5,171,.14,.9,6);sweep(a,1.45,1.1,.45);impact(a,2.55,.3,.42);});
// Night perimeter: slow harmonic mist, filtered wind, distant resonances.
// Integer-cycle carriers and matching fades keep the 48-second loop unobtrusive.
function pad(a,start,duration,hz,level){for(let i=0;i<duration*rate;i++){const j=Math.floor(start*rate)+i;if(j>=a.length)break;const t=i/rate,x=t/duration,env=Math.sin(Math.PI*x)**1.4;const wave=Math.sin(2*Math.PI*hz*t)*.65+Math.sin(2*Math.PI*hz*1.003*t)*.2+Math.sin(2*Math.PI*hz*2*t)*.1;a[j]+=wave*level*env*(.85+.15*Math.sin(t*.9));}}
render('zone-ambient',64,a=>{for(let bar=0;bar<8;bar++){const root=[55,65.406,49,58.27][bar%4];for(const [ratio,gain] of [[1,.24],[1.5,.12],[2,.08],[2.378,.045]])pad(a,bar*8,12,root*ratio,gain);air(a,bar*8,8,.13,.008);if(bar%2===0)resonance(a,bar*8+2,6,root*6,.07,.45,1.8);}const fade=rate*3;for(let i=0;i<a.length;i++)a[i]*=Math.min(1,i/fade,(a.length-1-i)/fade);});
const groups=[
 ['qwtep','lexa','burnt-map','stalker-tokens','new-coordinates','qwtep-route','myatus-control','lexa-shoulder','first-sirens','nine-bunker','hall-of-fame','solstice','fallen-angel'],
 ['zuban','myatus','silence','vent-shaft','noosphere-crack','evacuation','dark-side','light-side'],
 ['shinigami','oleg','everfrost','silverhand-door','manager-protocol','super-emission','wastelands'],
 ['silverhand','vlad','signal27','crown-emission','revival','zuban-return','world-cup'],
 ['manager','founders','noosphere-archive','case-27'],
 ['heart-zone','last-score','vice-city-king'],
];
for(const [rank,slugs] of groups.entries())for(const slug of slugs){const hash=[...slug].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,27),root=55*2**((hash%12)/12),beat=.29+(hash%7)*.025;render('card-'+slug,7.5+rank*.5,a=>{sweep(a,0,.35+rank*.07,.65);impact(a,.4,.5+rank*.07,.8);for(const interval of [0,7,12])pad(a,.4,6.5,root*2**(interval/12),.16);const scale=[0,3,7,10,12,15,19];for(let n=0;n<12;n++){const note=scale[(n*(hash%3+1)+hash)%scale.length];resonance(a,.65+n*beat,2.2,root*2**(note/12)*2,.13,1.7,.6+(rank*.4));if(n%3===0)impact(a,.65+n*beat,.14,1.4);}if(rank>=3){pad(a,2.7,4.8,root*3,.13);sweep(a,3.5,.6,.3);impact(a,4.1,.4,.5);}if(rank>=4){resonance(a,5,3.4,root*4,.15,.5,2);pad(a,4.8,4,root*.5,.25);}});}
render('vault-reveal-5',6,a=>{sweep(a,0,1,.8);impact(a,1,.9,.35);for(const hz of [110,165,220,330,440])pad(a,1,5,hz,.13);resonance(a,1.4,3.6,880,.13,.7,2);});
for(const name of [...groups.flat().map(slug=>'card-'+slug),'zone-ambient','vault-reveal-5']){const path='public/audio/'+name;execFileSync('ffmpeg',['-y','-loglevel','error','-i',path+'.wav','-codec:a','libmp3lame','-b:a','96k',path+'.mp3']);unlinkSync(path+'.wav');}
console.log('Rendered and compressed 42 individual musical card reveals and original ambient score');
