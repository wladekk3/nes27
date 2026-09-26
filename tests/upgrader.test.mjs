import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const data=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const economy=data(compile('lib/economy.ts'));
const upgrade=await import(data(compile('lib/upgrader.ts').replace("'./economy'",JSON.stringify(economy))));
const presentation=await import(data(compile('lib/upgrade-presentation.ts')));
test('top and bottom sectors preserve every winning and losing roll',()=>{
 for(const position of ['top','bottom'])for(const chance of [38,5,1.8,.2,.7,1.7,3.3]){
  const start=presentation.upgradeSectorStart(chance,position);
  for(let bucket=0;bucket<10000;bucket++){
   const roll=bucket/100,angle=presentation.upgradeNeedleAngle(roll,chance,position),delta=(angle-start+360)%360;
   assert.equal(delta<chance*3.6-1e-8,roll<chance);
  }
 }
 assert.ok(presentation.upgradeDurations.fast<presentation.upgradeDurations.slow);
});
test('upgrade chances feel achievable while preserving rarity steps',()=>{
 assert.equal(upgrade.upgradeChance(2,[1]),100000);
 assert.equal(upgrade.upgradeChance(2,[1,1,1]),292680);
 assert.equal(upgrade.upgradeChance(3,[2]),30000);
 assert.equal(upgrade.upgradeChance(3,[2,2,2]),94313);
 assert.equal(upgrade.upgradeChance(4,[3]),10000);
 assert.equal(upgrade.upgradeChance(4,[3,3,3]),32077);
 assert.equal(upgrade.upgradeChance(4,[1]),120);
 assert.equal(upgrade.upgradeChance(4,[1,1]),247);
 assert.equal(upgrade.upgradeChance(4,[1,1,1]),389);
 assert.equal(upgrade.upgradeChance(3,[2,1,0]),35856);
 for(const [rank,stakes] of [[0,[0]],[5,[3]],[3,[]],[4,[3,3,3,3]],[3,[3]],[2,[-1]]])assert.throws(()=>upgrade.upgradeChance(rank,stakes));
 assert.equal(upgrade.upgradeTarget('heart-zone'),undefined);
 assert.equal(upgrade.upgradeTarget('lexa'),undefined);
 assert.equal(upgrade.upgradeTarget('manager'),undefined);
 assert.deepEqual(upgrade.upgradeTarget('mythic'),{rank:4,slug:null});
});
