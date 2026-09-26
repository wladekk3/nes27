import {handleRewardCode} from '@/app/api/reward-codes/route';
import {receiveNews} from '@/lib/discord-news';
import {verifyReferral,trackReferral,eligibleDiscordAccount} from '@/lib/referrals';
import {
  getD1,
  getRuntimeValue,
  isAdmin,
  isManager,
  profilePayload,
  randomLinkCode,
  sha256,
  upsertDiscordUser,
  verifyBotRequest,
} from "@/lib/s27-server";

type DiscordIdentity = {
  discordId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
};

type BotPayload = DiscordIdentity & {
  action?: string;
  actorDiscordId?: string;
  joinedDiscordId?: string;
  inviteCode?: string;
  amount?: number;
  reason?: string;
  memberCount?:number;
};

async function integerSetting(key: string, fallback: number) {
  const row = await getD1()
    .prepare("SELECT value FROM site_settings WHERE key = ? LIMIT 1")
    .bind(key)
    .first<{ value: string }>();
  const value = Number(row?.value);
  return Number.isFinite(value) ? value : fallback;
}

async function writeAudit(
  actorId: string | null,
  action: string,
  targetId: string | null,
  payload: unknown,
) {
  await getD1()
    .prepare(
      "INSERT INTO audit_log (actor_id, action, target_id, payload, created_at) VALUES (?, ?, ?, ?, ?)",
    )
    .bind(actorId, action, targetId, JSON.stringify(payload ?? {}), Date.now())
    .run();
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await verifyBotRequest(request, rawBody))) {
    return Response.json({ error: "Invalid bot signature." }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as BotPayload & Record<string,any>;
    for(const field of ['discordId','actorDiscordId','joinedDiscordId'])if(payload[field]!==undefined&&!/^\d{16,22}$/.test(payload[field]))return Response.json({error:'Invalid Discord ID'},{status:400});
    const db = getD1();
    if(payload.action==='news_upsert'||payload.action==='news_delete')return receiveNews(payload);
    const now = Date.now();

    await db.prepare("INSERT INTO site_settings(key,value,updated_at) VALUES ('bridge:heartbeat','{}',?) ON CONFLICT(key) DO UPDATE SET updated_at=excluded.updated_at").bind(now).run();
    if(payload.action==='reward_code'){
      const actor=payload.actorDiscordId||'';
      if(!/^\d{16,22}$/.test(actor)||!(await isManager(actor)))return Response.json({error:'Manager access denied'},{status:403});
      if(!['create','disable'].includes(payload.command?.action))return Response.json({error:'Invalid code command'},{status:400});
      return handleRewardCode(payload.command,actor);
    }
    if(payload.action==='claim_status'){const row=await db.prepare("SELECT s.id,s.status,c.ticket_id,c.status AS claim_status FROM shop_orders s LEFT JOIN prize_claims c ON c.order_id=s.id WHERE s.id=? AND s.user_id NOT LIKE 'lab:%'").bind(payload.orderId).first();return Response.json(row?{order:row}:{error:'Order not found'},{status:row?200:404});}
    if(payload.action==='code_list'){if(!(await isManager(payload.actorDiscordId||'')))return Response.json({error:'Manager access denied'},{status:403});const codes=await db.prepare("SELECT id,code,kind,reward_type,reward_item,reward_amount,coupons,uses,max_uses,active,note FROM reward_codes WHERE scope='live' ORDER BY created_at DESC LIMIT 100").all();return Response.json({codes:codes.results});}
    if(payload.action==='pending_claims'){
      const rows=await db.prepare("SELECT c.order_id,c.user_id,c.ticket_id,s.product_id,s.name,s.price FROM prize_claims c JOIN shop_orders s ON s.id=c.order_id WHERE c.status='waiting_bot' AND s.status='pending' AND c.user_id NOT LIKE 'lab:%' ORDER BY c.created_at LIMIT 50").all();return Response.json({claims:rows.results});
    }
    if(payload.action==='claim_ticket'){
      if(typeof payload.orderId!=='string'||!/^\d{16,22}$/.test(payload.ticketId||''))return Response.json({error:'Invalid ticket'},{status:400});
      const row=await db.prepare("SELECT c.ticket_id,c.status,s.status AS order_status FROM prize_claims c JOIN shop_orders s ON s.id=c.order_id WHERE c.order_id=? AND c.user_id NOT LIKE 'lab:%'").bind(payload.orderId).first<any>();if(!row)return Response.json({error:'Claim not found'},{status:404});
      if(row.ticket_id)return Response.json({ok:row.ticket_id===payload.ticketId,ticketId:row.ticket_id},{status:row.ticket_id===payload.ticketId?200:409});
      if(row.order_status!=='pending'||row.status!=='waiting_bot')return Response.json({error:'Claim already closed'},{status:409});
      await db.prepare("UPDATE prize_claims SET ticket_id=?,status='ticket_created' WHERE order_id=? AND ticket_id IS NULL AND status='waiting_bot'").bind(payload.ticketId,payload.orderId).run();const saved=await db.prepare('SELECT ticket_id FROM prize_claims WHERE order_id=?').bind(payload.orderId).first<any>();return Response.json({ok:saved.ticket_id===payload.ticketId,ticketId:saved.ticket_id},{status:saved.ticket_id===payload.ticketId?200:409});
    }
    if(payload.action==='claim_fulfilled'){
      const actor=payload.actorDiscordId||'';if(!/^\d{16,22}$/.test(actor)||!(await isManager(actor)))return Response.json({error:'Manager access denied'},{status:403});
      try{await db.batch([db.prepare("UPDATE shop_orders SET status='fulfilled' WHERE id=? AND user_id NOT LIKE 'lab:%' AND status IN ('pending','processing')").bind(payload.orderId),db.prepare("INSERT INTO operations(id,user_id,action,result,valid,created_at) VALUES (?,?,'fulfilled','{}',changes(),?)").bind('close:'+payload.orderId,actor,now),db.prepare("UPDATE prize_claims SET status='fulfilled' WHERE order_id=?").bind(payload.orderId),db.prepare("INSERT INTO audit_log(actor_id,action,target_id,payload,created_at) VALUES (?,'bot.prize_fulfilled',NULL,?,?)").bind(actor,JSON.stringify({orderId:payload.orderId}),now)]);}catch{return Response.json({error:'Already processed'},{status:409});}return Response.json({ok:true});
    }
    if (payload.action === "ping") {
      return Response.json({ ok: true, service: "NE S27 bridge" });
    }

    if(payload.action==='guild_stats'){
      if(!Number.isInteger(payload.memberCount)||payload.memberCount!<0||payload.memberCount!>100000000)return Response.json({error:'Invalid memberCount'},{status:400});
      await db.prepare("INSERT INTO site_settings(key,value,updated_at) VALUES ('guild_stats',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(JSON.stringify({members:payload.memberCount}),now).run();
      return Response.json({ok:true});
    }

    if (payload.action === "sync_member" || payload.action === "create_link") {
      if (!payload.discordId) {
        return Response.json({ error: "discordId is required" }, { status: 400 });
      }
      await upsertDiscordUser(payload);
      if (payload.action === "sync_member") {
        return Response.json({ ok: true });
      }

      const code = randomLinkCode();
      const codeHash = await sha256(code);
      await db
        .prepare("DELETE FROM link_codes WHERE user_id = ? AND used_at IS NULL")
        .bind(payload.discordId)
        .run();
      await db
        .prepare(
          "INSERT INTO link_codes (code_hash, user_id, expires_at, used_at, created_at) VALUES (?, ?, ?, NULL, ?)",
        )
        .bind(codeHash, payload.discordId, now + 10 * 60 * 1000, now)
        .run();
      const baseUrl = getRuntimeValue("SITE_BASE_URL") || new URL(request.url).origin;
      await writeAudit(payload.discordId, "account.link_code", payload.discordId, {});
      return Response.json({
        code,
        expiresInSeconds: 600,
        connectUrl: `${baseUrl}/?link=${encodeURIComponent(code)}`,
      });
    }

    if (payload.action === "profile") {
      if (!payload.discordId) {
        return Response.json({ error: "discordId is required" }, { status: 400 });
      }
      const profile = await profilePayload(payload.discordId);
      return profile
        ? Response.json({ profile })
        : Response.json({ error: "Профиль ещё не создан. Используйте /connect." }, { status: 404 });
    }

    if (payload.action === "register_invite") {
      if (!payload.discordId || !payload.inviteCode) {
        return Response.json({ error: "discordId and inviteCode are required" }, { status: 400 });
      }
      await upsertDiscordUser(payload);
      await db
        .prepare(
          `INSERT INTO referral_invites (invite_code, referrer_user_id, created_at)
           VALUES (?, ?, ?)
           ON CONFLICT(invite_code) DO UPDATE SET referrer_user_id = excluded.referrer_user_id`,
        )
        .bind(payload.inviteCode, payload.discordId, now)
        .run();
      return Response.json({ ok: true });
    }

    if (payload.action === "referral_join") {
      if (!payload.joinedDiscordId || !payload.inviteCode) {
        return Response.json(
          { error: "joinedDiscordId and inviteCode are required" },
          { status: 400 },
        );
      }
      const invite = await db
        .prepare(
          "SELECT referrer_user_id FROM referral_invites WHERE invite_code = ? LIMIT 1",
        )
        .bind(payload.inviteCode)
        .first<{ referrer_user_id: string }>();
      if (!invite) return Response.json({ ok: true, tracked: false, reason: "unknown_invite" });
      if (invite.referrer_user_id === payload.joinedDiscordId) {
        return Response.json({ ok: true, tracked: false, reason: "self_referral" });
      }

      await upsertDiscordUser({
        discordId: payload.joinedDiscordId,
        username: payload.username,
        displayName: payload.displayName,
        avatarUrl: payload.avatarUrl,
      });
      if(!eligibleDiscordAccount(payload.joinedDiscordId))return Response.json({ok:true,tracked:false,reason:'account_under_30_days'});
      const tracked=await trackReferral(invite.referrer_user_id,payload.joinedDiscordId,payload.inviteCode);
      return Response.json({ok:true,tracked,verified:tracked,reward:0,holdDays:0});
    }

    if(payload.action==='pending_referrals'){
      const pending=await db.prepare("SELECT referred_user_id FROM referrals WHERE status='pending' LIMIT 100").all();return Response.json({pending:pending.results});
    }
    if(payload.action==='verify_member'){
      const row=await db.prepare("SELECT id,referrer_user_id FROM referrals WHERE referred_user_id=? AND status='pending'").bind(payload.joinedDiscordId??'').first<{id:number;referrer_user_id:string}>();
      return Response.json({ok:true,verified:row&&eligibleDiscordAccount(payload.joinedDiscordId||'')?await verifyReferral(row.id,row.referrer_user_id):false});
    }
    if(payload.action==='referral_leave'){
      await db.prepare("UPDATE referrals SET status='rejected' WHERE referred_user_id=? AND status='pending'").bind(payload.joinedDiscordId??'').run();return Response.json({ok:true});
    }
    if (payload.action === "admin_adjust_tokens") {
      const actor = payload.actorDiscordId ?? "";
      const target = payload.discordId ?? "";
      const amount = Math.trunc(Number(payload.amount));
      if (!isAdmin(actor)) return Response.json({ error: "Admin access denied." }, { status: 403 });
      if (!target || !Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1000) {
        return Response.json({ error: "Invalid target or amount." }, { status: 400 });
      }
      const result = await db
        .prepare(
          `UPDATE users
           SET tokens = MAX(0, tokens + ?), updated_at = ?
           WHERE discord_id = ?`,
        )
        .bind(amount, now, target)
        .run();
      if ((result.meta.changes ?? 0) !== 1) {
        return Response.json({ error: "Пользователь не найден." }, { status: 404 });
      }
      await writeAudit(actor, "admin.tokens", target, {
        amount,
        reason: payload.reason ?? "",
      });
      return Response.json({ ok: true, profile: await profilePayload(target) });
    }

    if (payload.action === "admin_verify_referral") {
      const actor = payload.actorDiscordId ?? "";
      if (!isAdmin(actor)) return Response.json({ error: "Admin access denied." }, { status: 403 });
      const referred = payload.joinedDiscordId ?? "";
      const referral = await db
        .prepare(
          `SELECT id, referrer_user_id, reward_tokens
           FROM referrals
           WHERE referred_user_id = ? AND status = 'pending'
           LIMIT 1`,
        )
        .bind(referred)
        .first<{ id: number; referrer_user_id: string; reward_tokens: number }>();
      if (!referral) {
        return Response.json({ error: "Ожидающее приглашение не найдено." }, { status: 404 });
      }
      const claimed=await verifyReferral(referral.id,referral.referrer_user_id);
      if(!claimed)return Response.json({error:'Приглашение уже обработано'},{status:409});
      await writeAudit(actor, "admin.referral.verify", referral.referrer_user_id, {
        referredDiscordId: referred,
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown bot action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bridge request failed.";
    return Response.json({ error: message }, { status: 503 });
  }
}
