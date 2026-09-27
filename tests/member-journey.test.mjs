import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createHmac,createHash} from 'node:crypto';
import {env} from './cloudflare-workers-mock.mjs';

// Run the built production routes against SQLite using the D1 transaction contract.
test('persisted member journey, role boundaries, purchases, grants and claims',async()=>{
 const sql=new DatabaseSync(':memory:');
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+f,'utf8'));
 class Statement{
  constructor(query,args=[]){this.query=query;this.args=args;}
  bind(...args){return new Statement(this.query,args);}
  async first(column){const row=sql.prepare(this.query).get(...this.args);return row?(column?row[column]:row):null;}
  async all(){return {success:true,results:sql.prepare(this.query).all(...this.args)};}
  execute(){const result=sql.prepare(this.query).run(...this.args);return {success:true,results:[],meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};}
  async run(){return this.execute();}
 }
 env.ENABLE_TEST_LOGIN='1';
 env.DB={prepare:q=>new Statement(q),batch:async statements=>{sql.exec('BEGIN');try{const values=statements.map(s=>s.execute());sql.exec('COMMIT');return values;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const {default:worker}=await import('../dist/server/index.js');const ctx={waitUntil(){},passThroughOnException(){}};
 async function call(path,body,token){const response=await worker.fetch(new Request('https://test.local'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json','Origin':'https://test.local'}:{}),...(token?{cookie:'s27_session='+token}:{})},body:body?JSON.stringify(body):undefined}),env,ctx);return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')};}
 if(process.env.S27_TEST_ACCESS_FILE){
  const access=JSON.parse(readFileSync(process.env.S27_TEST_ACCESS_FILE,'utf8'));
  for(const credential of access){const result=await call('/api/auth/test-login',credential);assert.equal(result.status,200);assert.match(result.cookie,/HttpOnly; Secure; SameSite=Lax/);assert.equal(result.body.profile.is_admin,credential.login==='s27_admin');}
  assert.equal((await call('/api/auth/test-login',{login:'s27_admin',password:'incorrect'})).status,401);
 }
 for(const [id,username] of [['lab:admin','s27_admin'],['lab:member','s27_member'],['discord-real','real']]){
  sql.prepare('INSERT OR IGNORE INTO users(discord_id,username,display_name,tokens,fragments,pack_count,created_at,updated_at) VALUES (?,?,?,9,1800,0,0,0)').run(id,username,username);
  sql.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,0)').run(createHash('sha256').update(id).digest('hex'),id,Date.now()+100000);
 }
 const member='lab:member',admin='lab:admin';const balance=()=>sql.prepare('SELECT fragments FROM users WHERE discord_id=?').get(member).fragments;
 assert.equal((await call('/api/member-profile')).status,401);
 assert.equal((await call('/api/inventory-admin',null,member)).status,403);
 assert.equal((await call('/api/inventory-admin',{kind:'tokens'},member)).status,403);
 assert.equal((await call('/api/orders?admin=1',null,member)).status,403);
 assert.equal((await call('/api/admin',{siteConfig:{}},member)).status,403);
 assert.equal((await call('/api/inventory-admin',{target:'discord-real'},admin)).status,400);
 const members=await call('/api/inventory-admin',null,admin);assert.equal(members.status,200);assert.ok(members.body.members.some(m=>m.discord_id==='discord-real'));
 const grant={kind:'tokens',target:member,amount:100,reason:'Integration test',requestId:crypto.randomUUID()};
 const original=balance();assert.equal((await call('/api/inventory-admin',grant,admin)).status,200);assert.equal((await call('/api/inventory-admin',grant,admin)).status,200);assert.equal(balance(),original+100);
 const purchase={action:'purchase',itemId:'ember-cursor',requestId:crypto.randomUUID()};
 assert.equal((await call('/api/member-profile',purchase,member)).status,200);assert.equal(balance(),original+100-920);
 assert.equal((await call('/api/member-profile',purchase,member)).status,200);assert.equal(balance(),original+100-920);
 assert.equal((await call('/api/member-profile',{...purchase,requestId:crypto.randomUUID()},member)).status,409);assert.equal(balance(),original+100-920);
 assert.equal((await call('/api/member-profile',{action:'equip',slot:'frame',itemId:'anomaly-frame'},member)).status,403);
 assert.equal((await call('/api/member-profile',{action:'equip',slot:'cursor',itemId:'ember-cursor'},member)).status,200);
 assert.equal((await call('/api/member-profile',{action:'save',nickname:'Проверка',bio:'Сохранено',status:'На связи',avatar:'lexa',showcase:['manager','lexa']},member)).status,200);
 const profile=await call('/api/member-profile',null,member);assert.equal(profile.body.profile.nickname,'Проверка');assert.equal(JSON.parse(profile.body.profile.equipped).cursor,'ember-cursor');assert.deepEqual(JSON.parse(profile.body.profile.showcase),[]);
 // An over-budget cosmetic purchase must roll back completely.
 const before=balance();assert.equal((await call('/api/member-profile',{action:'purchase',itemId:'aurora-reveal',requestId:crypto.randomUUID()},member)).status,409);assert.equal(balance(),before);
 const cardGrant={kind:'card',cardSlug:'manager',amount:1,target:member,reason:'Private card test',requestId:crypto.randomUUID()};
 assert.equal((await call('/api/inventory-admin',cardGrant,admin)).status,200);
 assert.ok((await call('/api/card-info',null,member)).body.cards.some(c=>c.slug==='manager'));
 assert.ok(!(await call('/api/card-info',null,admin)).body.cards.some(c=>c.slug==='manager'));
 assert.equal((await call('/api/community?admin=1',null,member)).status,403);
 assert.deepEqual((await call('/api/community',null,member)).body.history,[]);
 const searched=await call('/api/community?admin=1&q=s27_member',null,admin);assert.equal(searched.status,200);assert.ok(searched.body.history.length>0);assert.ok(searched.body.history.every(h=>h.username==='s27_member'));
 assert.equal((await call('/api/member-profile',{action:'wish',itemId:'nitro',wanted:true},member)).status,200);
 assert.ok((await call('/api/member-profile',null,member)).body.extras.wishlist.includes('nitro'));
 assert.equal((await call('/api/member-profile',{action:'preset_save',name:'Removed'},member)).status,410);
 const opened=await call('/api/game',{action:'open_pack',count:2,requestId:crypto.randomUUID()},member);assert.equal(opened.status,200);assert.equal(opened.body.results.length,2);
 sql.prepare("INSERT INTO shop_orders(id,user_id,product_id,name,price,status,created_at) VALUES ('test-order',?,'nitro','Nitro',1000,'pending',0)").run(member);
 assert.equal((await call('/api/prize-claim',{orderId:'test-order'},admin)).status,404);
 assert.equal((await call('/api/prize-claim',{orderId:'test-order'},member)).status,200);
 assert.equal((await call('/api/prize-claim',{orderId:'test-order'},member)).status,200);
 assert.equal(sql.prepare('SELECT count(*) AS n FROM prize_claims').get().n,1);
 assert.equal((await call('/api/orders?admin=1',null,admin)).body.orders[0].claim_status,'waiting_bot');
 assert.equal((await call('/api/orders',{id:'test-order',status:'fulfilled'},member)).status,403);
 const beforeRefund=balance();assert.equal((await call('/api/orders',{id:'test-order',status:'refunded'},admin)).status,200);assert.equal(balance(),beforeRefund+1000);
 assert.equal((await call('/api/orders',{id:'test-order',status:'refunded'},admin)).status,409);assert.equal(balance(),beforeRefund+1000);
 await call('/api/admin',{siteConfig:{brand:'TEST ONLY'}},admin);
 assert.equal(sql.prepare("SELECT count(*) AS n FROM site_settings WHERE key='site_config'").get().n,0);
 assert.equal((await call('/api/config',null,member)).body.config.brand,'TEST ONLY');
 sql.prepare('UPDATE users SET fragments=10000 WHERE discord_id=?').run(member);
 for(const [itemId,slot] of [['wheel-reveal','reveal'],['case-reveal','reveal'],['scanner-reveal','reveal'],['theme-frost','theme'],['click-sparks','click'],['classic-cursor','cursor'],['sound-crystal','sound'],['sound-vault','sound'],['sound-orbit','sound']]){
  assert.equal((await call('/api/member-profile',{action:'equip',itemId,slot},member)).status,403);
  assert.equal((await call('/api/member-profile',{action:'purchase',itemId,requestId:crypto.randomUUID()},member)).status,200);
  assert.equal((await call('/api/member-profile',{action:'equip',itemId,slot},member)).status,200);
  const saved=await call('/api/member-profile',null,member);assert.equal(JSON.parse(saved.body.profile.equipped)[slot],itemId);
 }
 assert.equal((await call('/api/member-profile',{action:'equip',slot:'theme',itemId:'wheel-reveal'},member)).status,403);

 assert.equal((await call('/api/community?admin=1',null,member)).status,403);
 assert.equal((await call('/api/community',{action:'config',config:{}},member)).status,403);
 const send=(b,user=member)=>call('/api/community',{...b,requestId:b.requestId||crypto.randomUUID()},user);
 for(const [slug,n] of [['lexa',4],['qwtep',3]])sql.prepare('INSERT INTO user_cards(user_id,card_slug,count,updated_at) VALUES (?,?,?,0) ON CONFLICT(user_id,card_slug) DO UPDATE SET count=excluded.count').run(member,slug,n);
 const copies=slug=>sql.prepare('SELECT count FROM user_cards WHERE user_id=? AND card_slug=?').get(member,slug)?.count??0;
 assert.equal((await send({action:'lock',slug:'lexa',locked:true})).status,200);
 assert.equal((await call('/api/game',{action:'dismantle',cardSlug:'lexa',requestId:crypto.randomUUID()},member)).status,409);
 const beforeRecycle=balance();
 assert.equal((await send({action:'recycle',items:[{slug:'qwtep',count:1},{slug:'lexa',count:2}]})).status,409);
 assert.equal(copies('qwtep'),3);assert.equal(copies('lexa'),4);assert.equal(balance(),beforeRecycle);
 assert.equal((await send({action:'lock',slug:'lexa',locked:false})).status,200);
 const recycle={action:'recycle',items:[{slug:'qwtep',count:2},{slug:'lexa',count:3}],requestId:crypto.randomUUID()};
 assert.equal((await send(recycle)).status,200);assert.equal((await send(recycle)).status,200);
 assert.equal(copies('lexa'),1);assert.equal(copies('qwtep'),1);assert.equal(balance(),beforeRecycle+150);
 assert.equal((await send({action:'recycle',items:[{slug:'lexa',count:1}]})).status,409);
 assert.equal((await send({action:'set_claim',setId:'nine'})).status,400);
 let cfg=(await call('/api/community?admin=1',null,admin)).body;
 cfg.config.sets.push({id:'test-set',name:'Test set',cards:['lexa','qwtep'],rewardKind:'coupons',rewardAmount:2,rewardItem:''});
 cfg.config.events.push({id:'test-event',name:'Server contest',description:'Submit your result',open:true,coupons:3});
 cfg.config.seasons.push({...cfg.config.seasons[0],id:'next',name:'Next season',status:'draft'});
 assert.equal((await send({action:'config',config:cfg.config,revision:cfg.revision},admin)).status,200);
 assert.equal((await send({action:'config',config:cfg.config,revision:cfg.revision},admin)).status,409);
 assert.ok(!(await call('/api/community',null,member)).body.config.seasons.some(s=>s.id==='next'));
 const coupons=()=>sql.prepare('SELECT tokens FROM users WHERE discord_id=?').get(member).tokens;
 const beforeSet=coupons(),setClaim={action:'set_claim',setId:'test-set',requestId:crypto.randomUUID()};
 assert.equal((await send(setClaim)).status,200);assert.equal((await send(setClaim)).status,200);assert.equal(coupons(),beforeSet+2);
 assert.equal((await send({action:'set_claim',setId:'test-set'})).status,409);assert.equal(coupons(),beforeSet+2);
 const eventReq={action:'event_enter',eventId:'test-event',evidence:'Result link',requestId:crypto.randomUUID()};
 assert.equal((await send(eventReq)).status,200);assert.equal((await send(eventReq)).status,200);
 const entry=(await call('/api/community',null,member)).body.entries.find(e=>e.event_id==='test-event');
 assert.equal((await send({action:'event_review',entryId:entry.id,status:'approved'})).status,403);
 assert.equal((await send({action:'event_review',entryId:entry.id,status:'approved'},admin)).status,200);
 assert.equal((await send({action:'event_review',entryId:entry.id,status:'approved'},admin)).status,409);assert.equal(coupons(),beforeSet+5);
 cfg=(await call('/api/community?admin=1',null,admin)).body;
 cfg.config.seasons[0].status='archived';cfg.config.seasons[1].status='active';cfg.config.activeSeason='next';
 const oldOwned=sql.prepare('SELECT SUM(count) AS n FROM user_cards WHERE user_id=?').get(member).n;
 assert.equal((await send({action:'config',config:cfg.config,revision:cfg.revision},admin)).status,200);
 assert.equal(sql.prepare('SELECT SUM(count) AS n FROM user_cards WHERE user_id=?').get(member).n,oldOwned);
 assert.ok((await call('/api/member-profile',null,member)).body.owned.includes('classic-cursor'));
 const seasonOpened=await call('/api/game',{action:'open_pack',count:1,requestId:crypto.randomUUID()},member);assert.equal(seasonOpened.status,200);assert.equal(seasonOpened.body.seasonId,'next');assert.equal(seasonOpened.body.results.length,1);
 assert.equal((await call('/api/game',{action:'purchase',productId:'nitro',requestId:crypto.randomUUID()},'discord-real')).status,409);
 const cancelId=crypto.randomUUID();sql.prepare("INSERT INTO shop_orders VALUES (?,?,?,'Nitro',1000,'pending',0)").run(cancelId,member,'nitro');
 const beforeCancel=balance();assert.equal((await call('/api/orders',{id:cancelId,status:'cancelled'},member)).status,200);assert.equal((await call('/api/orders',{id:cancelId,status:'cancelled'},member)).status,409);assert.equal(balance(),beforeCancel+1000);
 const processingId=crypto.randomUUID();sql.prepare("INSERT INTO shop_orders VALUES (?,?,?,'Nitro',1000,'pending',0)").run(processingId,member,'nitro');
 assert.equal((await call('/api/orders',{id:processingId,status:'processing'},admin)).status,200);
 assert.equal((await call('/api/orders',{id:processingId,status:'cancelled'},member)).status,409);
 assert.equal((await call('/api/orders',{id:processingId,status:'fulfilled'},admin)).status,200);
 const history=(await call('/api/community?admin=1&q='+member,null,admin)).body.history;assert.ok(history.some(x=>x.action==='recycle'));assert.ok(history.every(x=>x.target_id===member));
 assert.ok((await call('/api/community',null,'discord-real')).body.history.every(x=>x.target_id==='discord-real'));

 const wish={action:'wish',itemId:'thorn-frame',wanted:true};
 assert.equal((await call('/api/member-profile',wish)).status,401);
 assert.equal((await call('/api/member-profile',wish,member)).status,200);
 assert.equal((await call('/api/member-profile',wish,member)).status,200);
 assert.deepEqual((await call('/api/member-profile',null,member)).body.extras.wishlist,['nitro','thorn-frame']);
 assert.deepEqual((await call('/api/member-profile',null,'discord-real')).body.extras.wishlist,[]);
 for(const action of ['preset_save','preset_apply','preset_delete'])assert.equal((await call('/api/member-profile',{action,name:'Зимний рейд',id:'removed'},member)).status,410);
 assert.equal((await call('/api/member-profile',{action:'wish',itemId:'thorn-frame',wanted:false},member)).status,200);
 assert.deepEqual((await call('/api/member-profile',null,member)).body.extras.wishlist,['nitro']);
 const claimsBefore=sql.prepare('SELECT COUNT(*) AS n FROM prize_claims').get().n;
 assert.equal((await call('/api/prize-claim',{orderId:processingId},member)).status,409);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM prize_claims').get().n,claimsBefore);
 // Manager gets scoped prize workflows, never site administration or direct grants.
 const manager='lab:manager';sql.prepare('INSERT OR IGNORE INTO users(discord_id,username,display_name,tokens,fragments,pack_count,created_at,updated_at) VALUES (?,?,?,0,0,0,0,0)').run(manager,'s27_manager','Manager');sql.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,0)').run(createHash('sha256').update(manager).digest('hex'),manager,Date.now()+100000);
 assert.equal((await call('/api/auth/session',null,manager)).body.profile.is_manager,true);
 assert.equal((await call('/api/admin',{siteConfig:{}},manager)).status,403);
 assert.equal((await call('/api/inventory-admin',null,manager)).status,403);
 assert.equal((await call('/api/orders?admin=1',null,manager)).status,200);
 assert.equal((await call('/api/reward-codes',null,member)).status,403);
 const base={action:'create',kind:'prize',coupons:15,count:1,maxUses:1,code:'Q',note:'Test contest',requestId:crypto.randomUUID()};
 assert.equal((await call('/api/reward-codes',base,member)).status,403);
 assert.equal((await call('/api/reward-codes',{...base,coupons:16},manager)).status,400);
 const made=await call('/api/reward-codes',base,manager);assert.equal(made.status,200);
 assert.deepEqual((await call('/api/reward-codes',base,manager)).body.codes,made.body.codes);
 assert.equal((await call('/api/reward-codes',{...base,requestId:crypto.randomUUID()},manager)).status,409);
 assert.equal((await call('/api/reward-codes',{action:'redeem',code:'Q'})).status,401);
 assert.equal((await call('/api/reward-codes',{action:'redeem',code:'q'},'discord-real')).status,404);
 const couponBefore=sql.prepare('SELECT tokens FROM users WHERE discord_id=?').get(member).tokens;
 assert.equal((await call('/api/reward-codes',{action:'redeem',code:'q'},member)).status,404);
 assert.equal((await call('/api/reward-codes',{action:'redeem',code:'Q'},member)).status,200);
 assert.equal((await call('/api/reward-codes',{action:'redeem',code:'Q'},member)).status,409);
 assert.equal((await call('/api/reward-codes',{action:'redeem',code:'Q'},admin)).status,409);
 assert.equal(sql.prepare('SELECT tokens FROM users WHERE discord_id=?').get(member).tokens,couponBefore+15);
 const batch=await call('/api/reward-codes',{...base,code:'',count:15,requestId:crypto.randomUUID()},manager);assert.equal(batch.status,200);assert.equal(new Set(batch.body.codes.map(c=>c.code)).size,15);for(const c of batch.body.codes)assert.match(c.code,/^[A-Za-z0-9]{4}(?:-[A-Za-z0-9]{4}){3}$/);
 await call('/api/reward-codes',{action:'disable',id:batch.body.codes[0].id},manager);assert.equal((await call('/api/reward-codes',{action:'redeem',code:batch.body.codes[0].code},member)).status,409);
 const communityCode=await call('/api/reward-codes',{...base,code:'Community100',kind:'community',coupons:1,maxUses:100,requestId:crypto.randomUUID()},manager);assert.equal(communityCode.status,200);
 for(let i=0;i<101;i++){const id='lab:winner'+i;sql.prepare('INSERT INTO users(discord_id,username,display_name,tokens,fragments,pack_count,created_at,updated_at) VALUES (?,?,?,0,0,0,0,0)').run(id,id,id);sql.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,0)').run(createHash('sha256').update(id).digest('hex'),id,Date.now()+100000);assert.equal((await call('/api/reward-codes',{action:'redeem',code:'Community100'},id)).status,i<100?200:409);}
 assert.equal((await call('/api/reward-codes',{action:'redeem',code:'Community100'},'lab:winner0')).status,409);
 assert.equal(sql.prepare('SELECT uses FROM reward_codes WHERE id=?').get(communityCode.body.codes[0].id).uses,100);
 assert.equal(sql.prepare("SELECT SUM(tokens) AS total FROM users WHERE discord_id LIKE 'lab:winner%'").get().total,100);
 assert.equal((await call('/api/bot',{action:'guild_stats',memberCount:999})).status,401);

 // Reward codes grant cosmetics and currency atomically; owned cosmetics do not consume a code.
 const cosmeticCode=await call('/api/reward-codes',{...base,code:'Outfit',rewardType:'cosmetic',rewardItem:'effect-scan',requestId:crypto.randomUUID()},manager);assert.equal(cosmeticCode.status,200);
 assert.equal((await call('/api/reward-codes',{action:'redeem',code:'Outfit'},member)).status,200);
 assert.ok((await call('/api/member-profile',null,member)).body.owned.includes('effect-scan'));
 const spare=await call('/api/reward-codes',{...base,code:'SpareOutfit',rewardType:'cosmetic',rewardItem:'effect-scan',requestId:crypto.randomUUID()},manager);assert.equal(spare.status,200);
 assert.equal((await call('/api/reward-codes',{action:'redeem',code:'SpareOutfit'},member)).status,409);assert.equal(sql.prepare('SELECT uses FROM reward_codes WHERE id=?').get(spare.body.codes[0].id).uses,0);
 const tokenCode=await call('/api/reward-codes',{...base,code:'Tokens',rewardType:'tokens',rewardAmount:350,requestId:crypto.randomUUID()},manager);assert.equal(tokenCode.status,200);const previousTokens=balance();
 assert.equal((await call('/api/reward-codes',{action:'redeem',code:'Tokens'},member)).status,200);assert.equal(balance(),previousTokens+350);assert.equal((await call('/api/reward-codes',{action:'redeem',code:'Tokens'},member)).status,409);assert.equal(balance(),previousTokens+350);
 assert.equal((await call('/api/bridge',{action:'rotate'},member)).status,403);assert.equal((await call('/api/bridge',{action:'rotate'},manager)).status,403);
 const keyResponse=await call('/api/bridge',{action:'rotate'},admin);assert.equal(keyResponse.status,200);const secret=keyResponse.body.secret;assert.equal(secret.length,64);assert.equal((await call('/api/bridge',null,admin)).body.secret,undefined);
 async function signed(body,key=secret){const raw=JSON.stringify(body),timestamp=String(Math.floor(Date.now()/1000));const signature=createHmac('sha256',key).update(timestamp+'.'+raw).digest('hex');const response=await worker.fetch(new Request('https://test.local/api/bot',{method:'POST',headers:{'Content-Type':'application/json','x-s27-timestamp':timestamp,'x-s27-signature':signature},body:raw}),env,ctx);return {status:response.status,body:await response.json()};}
 assert.equal((await signed({action:'ping'},'wrong')).status,401);assert.equal((await signed({action:'ping'})).status,200);assert.equal((await call('/api/bridge',null,admin)).body.online,true);
 const discordId='123456789012345678';assert.equal((await call('/api/bridge',{action:'managers',ids:[discordId]},admin)).status,200);
 const roleAdminId='823456789012345678';sql.prepare('INSERT INTO users(discord_id,username,display_name,tokens,fragments,pack_count,created_at,updated_at) VALUES (?,?,?,0,0,0,0,0)').run(roleAdminId,'role_admin','Role Admin');sql.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES (?,?,?,0)').run(createHash('sha256').update(roleAdminId).digest('hex'),roleAdminId,Date.now()+100000);
 const roles=await call('/api/bridge',{action:'roles',owners:[],admins:[roleAdminId],managers:[discordId]},admin);assert.equal(roles.status,200);assert.deepEqual(roles.body.admins,[roleAdminId]);
 assert.equal((await call('/api/admin',null,roleAdminId)).status,200);assert.equal((await call('/api/bridge',{action:'roles',owners:[],admins:[],managers:[]},roleAdminId)).status,403);
 assert.equal((await signed({action:'sync_member',discordId:'lab:admin'})).status,400);
 const link=await signed({action:'create_link',discordId,username:'stalker',displayName:'Stalker',avatarUrl:'https://cdn.discordapp.com/avatars/123/a.png'});assert.equal(link.status,200);
 const connected=await call('/api/auth/connect',{code:link.body.code});assert.equal(connected.status,200);assert.equal(connected.body.profile.is_manager,true);assert.equal((await call('/api/auth/connect',{code:link.body.code})).status,401);
 await signed({action:'sync_member',discordId,username:'stalker',displayName:'Updated',avatarUrl:'https://cdn.discordapp.com/avatars/123/b.png'});assert.equal(sql.prepare('SELECT avatar_url FROM users WHERE discord_id=?').get(discordId).avatar_url,'https://cdn.discordapp.com/avatars/123/b.png');
 assert.equal((await signed({action:'guild_stats',memberCount:847})).status,200);assert.equal((await call('/api/guild-stats')).body.members,847);
 assert.equal((await signed({action:'reward_code',actorDiscordId:discordId,command:{...base,code:'BotCode',rewardType:'tokens',rewardAmount:20,requestId:crypto.randomUUID()}})).status,200);
 assert.equal((await signed({action:'reward_code',actorDiscordId:roleAdminId,command:{...base,code:'RoleAdminCode',requestId:crypto.randomUUID()}})).status,200);
 sql.prepare('DELETE FROM site_registrations WHERE user_id=?').run(roleAdminId);sql.prepare('UPDATE users SET tokens=0 WHERE discord_id=?').run(roleAdminId);
 sql.prepare("INSERT INTO shop_orders VALUES ('live-ticket',?,'balance10','Balance certificate',0,'pending',0)").run(discordId);sql.prepare("INSERT INTO prize_claims(order_id,user_id,status,created_at) VALUES ('live-ticket',?,'waiting_bot',0)").run(discordId);
 assert.ok((await signed({action:'pending_claims'})).body.claims.some(c=>c.order_id==='live-ticket'));
 const ack={action:'claim_ticket',orderId:'live-ticket',ticketId:'323456789012345678'};assert.equal((await signed(ack)).status,200);assert.equal((await signed(ack)).status,200);assert.equal((await signed({...ack,ticketId:'423456789012345678'})).status,409);
 assert.equal((await signed({action:'claim_fulfilled',actorDiscordId:discordId,orderId:'live-ticket'})).status,200);assert.equal((await signed({action:'claim_fulfilled',actorDiscordId:discordId,orderId:'live-ticket'})).status,409);
 // Force the random bucket only in this local test: one card + one zero-price voucher, no duplicate on retry.
 const random=crypto.getRandomValues;crypto.getRandomValues=array=>{array.fill(0);return array;};try{const request={action:'open_pack',count:1,requestId:crypto.randomUUID()},result=await call('/api/game',request,member);assert.equal(result.status,200);assert.equal(result.body.results.length,1);assert.equal(result.body.bonuses.length,1);const bonusId=result.body.bonuses[0].id;assert.equal(sql.prepare('SELECT price FROM shop_orders WHERE id=?').get(bonusId).price,0);assert.equal((await call('/api/game',request,member)).body.bonuses[0].id,bonusId);}finally{crypto.getRandomValues=random;}
 // Curator-created legacy and new codes work for real Discord members.
 const tokenReal=connected.cookie.match(/s27_session=([^;]+)/)[1];
 assert.equal(connected.body.profile.tokens,2);
 assert.equal((await call('/api/auth/session',null,tokenReal)).body.profile.tokens,2);
 const freshCode=await call('/api/reward-codes',{...base,code:'RealCurator',coupons:2,requestId:crypto.randomUUID()},admin);assert.equal(freshCode.status,200);
 assert.equal((await call('/api/reward-codes',null,admin)).status,200);
 assert.equal((await call('/api/reward-codes',{action:'redeem',code:'RealCurator'},tokenReal)).status,200);
 assert.equal((await call('/api/reward-codes',{action:'redeem',code:'RealCurator'},tokenReal)).status,409);
 sql.prepare("UPDATE reward_codes SET scope='lab' WHERE code='RealCurator'").run();
 const another=await call('/api/reward-codes',{...base,code:'LegacyCurator',coupons:1,requestId:crypto.randomUUID()},admin);
 sql.prepare("UPDATE reward_codes SET scope='lab' WHERE id=?").run(another.body.codes[0].id);
 assert.equal((await call('/api/reward-codes',{action:'redeem',code:'LegacyCurator'},tokenReal)).status,200);
 const search=await call('/api/inventory-admin?q=@stalker',null,admin);assert.equal(search.status,200);assert.ok(search.body.members.some(m=>m.discord_id===discordId&&m.registered_at));
 assert.equal((await call('/api/inventory-admin',{kind:'coupons',target:discordId,amount:2,reason:'Real member grant',requestId:crypto.randomUUID()},admin)).status,200);
 // First thirty real site registrations get a numbered badge; sync alone grants nothing.
 async function newMember(id,name){const link=await signed({action:'create_link',discordId:id,username:name,displayName:name});assert.equal(sql.prepare('SELECT tokens FROM users WHERE discord_id=?').get(id).tokens,0);const c=await call('/api/auth/connect',{code:link.body.code});assert.equal(c.status,200);assert.equal(c.body.profile.tokens,2);const reconnectLink=await signed({action:'create_link',discordId:id,username:name,displayName:name});const reconnect=await call('/api/auth/connect',{code:reconnectLink.body.code});assert.equal(reconnect.status,200);assert.equal(reconnect.body.profile.tokens,2);return {token:c.cookie.match(/s27_session=([^;]+)/)[1],profile:c.body.profile};}
 const a=await newMember('223456789012345678','visitor_a'),b=await newMember('323456789012345678','visitor_b');
 const refBalance=sql.prepare('SELECT tokens FROM users WHERE discord_id=?').get(discordId).tokens;
 assert.equal((await call('/api/referrals',{referrer:'stalker'},a.token)).status,200);
 assert.equal((await call('/api/referrals',{referrer:'stalker'},a.token)).status,200);
 assert.equal(sql.prepare('SELECT tokens FROM users WHERE discord_id=?').get(discordId).tokens,refBalance);
 assert.equal((await call('/api/referrals',{referrer:'stalker'},b.token)).status,200);
 assert.equal(sql.prepare('SELECT tokens FROM users WHERE discord_id=?').get(discordId).tokens,refBalance+1);
 assert.equal((await call('/api/referrals',{referrer:'visitor_a'},a.token)).status,409);
 const youngId=((BigInt(Date.now()-86400000)-1420070400000n)<<22n).toString();const young=await newMember(youngId,'young');
 assert.equal((await call('/api/referrals',{referrer:'stalker'},young.token)).status,409);
 for(let i=0;i<27;i++){const m=await newMember(String(423456789012345600n+BigInt(i)),'early_'+i);assert.equal(!!m.profile.pioneer,i<26);}
 const totalBefore=sql.prepare('SELECT tokens FROM users WHERE discord_id=?').get(discordId).tokens;
 await call('/api/auth/session',null,tokenReal);await call('/api/auth/session',null,tokenReal);
 assert.equal(sql.prepare('SELECT tokens FROM users WHERE discord_id=?').get(discordId).tokens,totalBefore);
 // Collection claims are atomic, retain cards, and cannot be farmed by retries.
 const setId='s27-extra-lore', rewardId=member+':reward:'+setId;
 sql.prepare("DELETE FROM user_cards WHERE user_id=? AND card_slug IN ('burnt-map','silence','signal27')").run(member);
 const rewardBefore=coupons();
 assert.equal((await call('/api/collection-rewards',{setId},member)).status,409);
 assert.equal(coupons(),rewardBefore);
 for(const slug of ['burnt-map','silence','signal27'])sql.prepare('INSERT INTO user_cards(user_id,card_slug,count,updated_at) VALUES (?,?,1,0)').run(member,slug);
 assert.equal((await call('/api/collection-rewards',{setId},member)).status,200);
 assert.equal((await call('/api/collection-rewards',{setId},member)).body.alreadyClaimed,true);
 assert.equal(coupons(),rewardBefore+3);
 assert.equal(copies('silence'),1);
 assert.equal(sql.prepare('SELECT count(*) n FROM prize_claims WHERE order_id=?').get(rewardId).n,1);
 assert.equal((await call('/api/orders',{id:rewardId,status:'cancelled'},member)).status,409);
 // Upgrades reject last copies and protected cards without consuming any stake.
 sql.prepare("DELETE FROM card_locks WHERE user_id=? AND card_slug='lexa'").run(member);
 sql.prepare("INSERT INTO user_cards(user_id,card_slug,count,updated_at) VALUES (?,'lexa',1,0) ON CONFLICT(user_id,card_slug) DO UPDATE SET count=1").run(member);
 const upgrade=()=>({target:'zuban',stakes:['lexa'],requestId:crypto.randomUUID()});
 assert.equal((await call('/api/upgrader',upgrade(),member)).status,409);assert.equal(copies('lexa'),1);
 sql.prepare("UPDATE user_cards SET count=4 WHERE user_id=? AND card_slug='lexa'").run(member);
 await call('/api/community',{action:'lock',slug:'lexa',locked:true},member);
 assert.equal((await call('/api/upgrader',upgrade(),member)).status,409);assert.equal(copies('lexa'),4);
 sql.prepare("DELETE FROM card_locks WHERE user_id=? AND card_slug='lexa'").run(member);
 crypto.getRandomValues=array=>{array.fill(0);return array;};
 try{const req=upgrade(),beforeWin=copies('zuban');const win=await call('/api/upgrader',req,member);assert.equal(win.status,200);assert.equal(win.body.won,true);assert.equal(win.body.chance,15);assert.equal(copies('lexa'),3);assert.equal(copies('zuban'),beforeWin+1);assert.equal((await call('/api/upgrader',req,member)).body.slug,'zuban');assert.equal(copies('lexa'),3);}finally{crypto.getRandomValues=random;}
 assert.equal((await call('/api/upgrader',{...upgrade(),target:'heart-zone'},member)).status,400);
 // Editor is a display badge, never an administration permission.
 const editor=await newMember('1059423018931195994','editor');assert.equal(editor.profile.is_editor,true);assert.equal(editor.profile.is_admin,false);assert.equal(editor.profile.is_manager,false);
 assert.equal((await call('/api/inventory-admin',null,editor.token)).status,403);
 // Only signed allowlisted Discord news is mirrored; old edits cannot resurrect a deletion.
 const news={action:'news_upsert',channelId:'1013194498211315773',guildId:'123456789012345678',messageId:'1534567890123456789',channelName:'News',content:'Update',images:['https://example.com/no.png'],version:Date.now()-1000};
 assert.equal((await signed(news,'wrong')).status,401);
 assert.equal((await signed({...news,channelId:'999999999999999999'})).status,400);
 assert.equal((await signed(news)).status,200);assert.equal((await signed(news)).status,200);
 const feed=(await call('/api/news')).body.news;assert.equal(feed.length,1);assert.deepEqual(feed[0].images,[]);
 assert.equal((await signed({...news,action:'news_delete',version:news.version+1})).status,200);
 await signed(news);assert.equal((await call('/api/news')).body.news.length,0);
 // Public leaders use real registered members, never staff or hidden accounts.
 sql.prepare('UPDATE users SET fragments=123456,pack_count=87 WHERE discord_id=?').run('223456789012345678');
 const leaders=await call('/api/leaderboard?metric=tokens');assert.equal(leaders.status,200);assert.equal(leaders.body.members[0].username,'visitor_a');assert.equal(leaders.body.members[0].score,123456);
 assert.ok(!leaders.body.members.some(m=>m.username==='stalker'||m.username.startsWith('s27_')));
 assert.equal((await call('/api/leaderboard?admin=1',null,member)).status,403);
 assert.equal((await call('/api/leaderboard',{userId:'223456789012345678',hidden:true},member)).status,403);
 assert.equal((await call('/api/leaderboard',{userId:'223456789012345678',hidden:true},admin)).status,200);
 assert.ok(!(await call('/api/leaderboard?metric=packs')).body.members.some(m=>m.username==='visitor_a'));
 // Public counters have honest definitions: unique browser cookies and all non-test account profiles.
 const stats=await call('/api/site-stats',{visit:true});assert.equal(stats.status,200);assert.equal(stats.body.visitors,1);assert.equal(stats.body.accounts,sql.prepare("SELECT COUNT(*) n FROM users WHERE discord_id NOT LIKE 'lab:%'").get().n);
 // Bug reports persist, are visible to administrators, and only administrators can close them.
 const report=await call('/api/bug-reports',{section:'Тайники',description:'Кнопка открытия не отвечает',userAgent:'Test browser',pageUrl:'/'});assert.equal(report.status,201);assert.match(report.body.id,/^[0-9a-f-]{36}$/);
 const adminWithReports=await call('/api/admin',null,admin);assert.ok(adminWithReports.body.bugReports.some(item=>item.id===report.body.id&&item.status==='open'));
 assert.equal((await call('/api/bug-reports',{action:'resolve',id:report.body.id},member)).status,403);
 assert.equal((await call('/api/bug-reports',{action:'resolve',id:report.body.id},admin)).status,200);
 assert.equal(sql.prepare('SELECT status FROM bug_reports WHERE id=?').get(report.body.id).status,'resolved');
 const hiddenSearch=await call('/api/leaderboard?admin=1&q=@visitor_a',null,admin);assert.equal(hiddenSearch.body.members.length,1);assert.equal(hiddenSearch.body.members[0].hidden,1);
 assert.equal((await call('/api/leaderboard',{userId:'223456789012345678',hidden:false},admin)).status,200);
 assert.equal((await call('/api/leaderboard?metric=packs')).body.members[0].score,87);
 assert.equal((await call('/api/leaderboard?metric=invites')).status,200);
 assert.equal((await call('/api/leaderboard?metric=cards')).status,200);
 delete env.DB;sql.close();
});
