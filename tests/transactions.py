import sqlite3,pathlib,re
root=pathlib.Path(__file__).resolve().parent.parent
con=sqlite3.connect(':memory:')
for path in sorted((root/'drizzle').glob('*.sql')):con.executescript(path.read_text())
con.execute("INSERT INTO users VALUES('u','user','User',NULL,2,1000,0,0,0)")
con.commit()
source=(root/'app/api/game/route.ts').read_text()
# Execute the actual SQL strings used by the API, in its batch order.
queries=re.findall(r"db.prepare\('([^']*)'\)",source)
def q(start):return next(s for s in queries if s.startswith(start))
def open_cache(op,count=1):
 try:
  with con:
   con.execute(q('UPDATE users SET tokens='),(count,count,1,'u',count))
   con.execute(q('INSERT INTO operations'),(op,'u','open_pack','{}',1))
   for _ in range(count):con.execute(q('INSERT INTO user_cards'),('u','lexa',1))
  return True
 except sqlite3.IntegrityError:return False
assert open_cache('a')
assert not open_cache('a') # duplicate must roll back the debit
assert con.execute('SELECT tokens FROM users').fetchone()[0]==1
assert open_cache('b')
assert not open_cache('c') # no balance: rollback everything
assert con.execute('SELECT count FROM user_cards').fetchone()[0]==2
with con:
 con.execute(q('UPDATE user_cards SET count='),(1,'u','lexa'))
 con.execute(q('INSERT INTO operations'),('d','u','dismantle','{}',1))
 con.execute(q('UPDATE users SET fragments=fragments+'),(30,1,'u'))
assert con.execute('SELECT fragments FROM users').fetchone()[0]==1030
try:
 with con:
  con.execute(q('UPDATE user_cards SET count='),(1,'u','lexa'))
  con.execute(q('INSERT INTO operations'),('e','u','dismantle','{}',1))
  con.execute(q('UPDATE users SET fragments=fragments+'),(30,1,'u'))
except sqlite3.IntegrityError:pass
assert con.execute('SELECT fragments FROM users').fetchone()[0]==1030
with con:
 con.execute(q('UPDATE users SET fragments=fragments-'),(1000,1,'u',1000))
 con.execute(q('INSERT INTO operations'),('f','u','purchase','{}',1))
 con.execute(q('INSERT INTO shop_orders'),('f','u','nitro','Nitro',1000,1))
assert con.execute('SELECT fragments FROM users').fetchone()[0]==30
# Actual referral batch SQL; repeat confirmations never pay twice.
s=(root/'lib/referrals.ts').read_text();refs=re.findall(r'db.prepare\("([^"]*)"\)',s)
for n in range(1,7):
 con.execute("INSERT INTO users VALUES(?,?,?,NULL,0,0,0,0,0)",(str(n),str(n),str(n)))
 con.execute("INSERT INTO referrals(referrer_user_id,referred_user_id,invite_code,status,reward_tokens,verify_after,created_at) VALUES ('u',?,'test','pending',0,0,0)",(str(n),));con.commit()
 for _ in range(2):
  with con:
   con.execute(refs[0],(1,n));con.execute(refs[1],('u',1,'u'));con.execute(refs[2],('u',1))
 assert con.execute('SELECT tokens FROM users WHERE discord_id=\'u\'').fetchone()[0]==n//2
print('PASS: migrations, debit rollback, idempotency, one card, protected last copy, shop debit, 2 referrals/coupon, replay protection')

con.execute("UPDATE users SET tokens=2 WHERE discord_id='u'");con.commit()
old=con.execute("SELECT count FROM user_cards WHERE user_id='u' AND card_slug='lexa'").fetchone()[0]
assert not open_cache('triple-no-balance',3)
assert con.execute("SELECT tokens FROM users WHERE discord_id='u'").fetchone()[0]==2
con.execute("UPDATE users SET tokens=3 WHERE discord_id='u'");con.commit()
assert open_cache('triple',3)
assert not open_cache('triple',3)
assert con.execute("SELECT count FROM user_cards WHERE user_id='u' AND card_slug='lexa'").fetchone()[0]==old+3
assert con.execute("SELECT tokens FROM users WHERE discord_id='u'").fetchone()[0]==0
print('PASS: 3 caches atomically debit 3 coupons and grant 3 cards; insufficient funds and replay do not change balances')
