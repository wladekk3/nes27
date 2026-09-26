import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(new URL('../lib/economy.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const economy=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('all 10000 probability buckets match published percentages exactly',()=>{const counts=[0,0,0,0,0];for(let i=0;i<10000;i++)counts[economy.rarityAt(i)]++;assert.deepEqual(counts,[5500,3800,500,180,20]);});
test('every rarity has cards; every draw is one eligible card',()=>{assert.equal(economy.pool.length,39);for(let rank=0;rank<5;rank++)assert.ok(economy.pool.some(c=>c[1]===rank));for(let i=0;i<10000;i++){const card=economy.draw();assert.ok(economy.pool.includes(card));}});
test('approved recycling and shop prices remain exact',()=>{assert.deepEqual(economy.salvage,[30,50,100,250,1000]);assert.deepEqual(economy.products.map(p=>p.price),[11760,8820,5290,10000,10590,38240,58820,52940,94120]);});
test('private art is absent from public assets and client bundle',()=>{assert.equal(fs.existsSync('public/cards/card_secret_manager.png'),false);for(const file of fs.readdirSync('dist/client/assets')){if(file.endsWith('.js')){const content=fs.readFileSync('dist/client/assets/'+file,'utf8');assert.ok(!content.includes('ДВА ИСТОЧНИКА'));assert.ok(!content.includes('КУРАТОР'));}}});

test("bonus chance is exactly one in one hundred thousand, independently of rarity",()=>{let n=0;assert.equal(economy.prizeBonusDenominator,100000);for(let i=0;i<100000;i++)if(economy.bonusAt(i))n++;assert.equal(n,1);});
