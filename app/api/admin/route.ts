import { getD1, getSessionUser, isAdmin } from "@/lib/s27-server";

const defaultActs=[{number:'I',title:'СЕЗОН STALKER',status:'АКТИВНА',progress:0,text:'Сюжет будет объявлен позже.'},{number:'II',title:'СКОРО',status:'ЗАКРЫТА',progress:0,text:'Следующая часть пока не объявлена.'},{number:'III',title:'СКОРО',status:'ЗАКРЫТА',progress:0,text:'Подробности появятся в новостях.'}];
const defaultNews = [
  { date: "26.08.2026", title: "ТЕМАТИЧЕСКИЕ КАНАЛЫ ВОЗВРАЩАЮТСЯ К РАБОТЕ", tag: "СЕРВЕР" },
  { date: "07.08.2026", title: "НАЧАЛСЯ ПЕРИОД SOLSTICE", tag: "ПЕРИОД" },
  { date: "03.08.2026", title: "ЗАВЕРШЁН WORLD CUP", tag: "СОБЫТИЕ" },
];

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeText(value: unknown, fallback: string, maxLength: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback;
}

function safeInteger(value: unknown, fallback: number, minimum: number, maximum: number) {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}

function safeImage(v:unknown,fallback:string){return typeof v==='string' && /^(\/(?!\/)|https:\/\/)[a-zA-Z0-9/_.?=&%:+~-]+$/.test(v)&&v.length<=1000?v:fallback;}
function safeDate(value:unknown,fallback:string){if(typeof value!=='string')return fallback;const parsed=Date.parse(value);return Number.isFinite(parsed)&&parsed>Date.UTC(2020,0,1)&&parsed<Date.UTC(2100,0,1)?new Date(parsed).toISOString():fallback;}
function sanitizeSiteConfig(input: unknown, reward: number, holdDays: number) {
  const source = objectValue(input);
  const dismantle = objectValue(source.dismantleValues);
  const statuses = new Set(["АКТИВНА", "ЗАКРЫТА", "ЗАВЕРШЕНА"]);
  const rawActs = Array.isArray(source.acts) ? source.acts.slice(0, 6) : defaultActs;
  const rawNews = Array.isArray(source.news) ? source.news.slice(0, 20) : defaultNews;

  return {
    maintenanceMode: source.maintenanceMode === true,
    maintenanceCycle: safeInteger(source.maintenanceCycle,0,0,Number.MAX_SAFE_INTEGER),
    heroDesktop:safeImage(source.heroDesktop,"/hero/zone-desktop.webp"),
    heroMobile:safeImage(source.heroMobile,"/hero/zone-mobile.webp"),
    heroLore:safeText(source.heroLore,"Зона зовёт. Исследуй, участвуй и стань частью общей хроники.",1000),
    frameStyle:['scorched','steel','plain'].includes(String(source.frameStyle))?String(source.frameStyle):'scorched',
    frameWidth:safeInteger(source.frameWidth,14,4,18),
    brand: safeText(source.brand, "NE S27", 40),
    portalTitle: safeText(source.portalTitle, "НОВАЯ ЗОНА", 80),
    seasonTitle: safeText(source.seasonTitle, "SHADOW OF CHERNOBYL", 120),
    nextPartAt:safeDate(source.nextPartAt,"2026-10-15T16:00:00.000Z"),
    seasonSubtitle: safeText(
      source.seasonSubtitle,
      "Коллекционные карточки NE S27. Открывай тайники и собирай коллекцию.",
      500,
    ),
    accent:
      typeof source.accent === "string" && /^#[0-9a-f]{6}$/i.test(source.accent)
        ? source.accent.toLowerCase()
        : "#d6a548",
    referralReward: reward,
    referralHoldDays: holdDays,
    dismantleValues: {
      НЕОБЫЧНАЯ: 30,
      РЕДКАЯ: 50,
      ЭПИЧЕСКАЯ: 100,
      ЛЕГЕНДАРНАЯ: 250,
      МИФИЧЕСКАЯ: 1000,
    },
    acts: rawActs.map((value, index) => {
      const act = objectValue(value);
      const fallback = defaultActs[index] ?? defaultActs[defaultActs.length - 1];
      const status = safeText(act.status, fallback.status, 20);
      return {
        number: safeText(act.number, fallback.number, 8),
        title: safeText(act.title, fallback.title, 120),
        status: statuses.has(status) ? status : fallback.status,
        progress: safeInteger(act.progress, fallback.progress, 0, 100),
        text: safeText(act.text, fallback.text, 1_000),
      };
    }),
    news: rawNews.map((value, index) => {
      const item = objectValue(value);
      const fallback = defaultNews[index] ?? { date: "", title: "НОВАЯ ЗАПИСЬ", tag: "СЕРВЕР" };
      return {
        date: safeText(item.date, fallback.date, 20),
        title: safeText(item.title, fallback.title, 200),
        tag: safeText(item.tag, fallback.tag, 40),
      };
    }),
  };
}

async function requireAdmin(request: Request) {
  const user = await getSessionUser(request);
  if (!user || !isAdmin(user.discord_id)) return null;
  return user;
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return Response.json({ error: "Доступ администратора не подтверждён." }, { status: 403 });
    const db = getD1();

    const [users, cards, referrals, settings, audit] = await Promise.all([
      db.prepare("SELECT COUNT(*) AS count FROM users").first<{ count: number }>(),
      db
        .prepare("SELECT COALESCE(SUM(count), 0) AS count FROM user_cards")
        .first<{ count: number }>(),
      db
        .prepare(
          `SELECT
             SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
             SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verified
           FROM referrals`,
        )
        .first<{ pending: number | null; verified: number | null }>(),
      db.prepare("SELECT key, value FROM site_settings WHERE key IN ('site_config','referral_reward','referral_hold_days') ORDER BY key").all<{ key: string; value: string }>(),
      db
        .prepare(
          "SELECT actor_id, action, target_id, payload, created_at FROM audit_log ORDER BY id DESC LIMIT 20",
        )
        .all(),
    ]);
    return Response.json({
      stats: {
        users: users?.count ?? 0,
        cards: cards?.count ?? 0,
        pendingReferrals: referrals?.pending ?? 0,
        verifiedReferrals: referrals?.verified ?? 0,
      },
      settings: Object.fromEntries(settings.results.map((row) => [row.key, row.value])),
      audit: audit.results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CMS unavailable.";
    return Response.json({ error: message }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return Response.json({ error: "Доступ администратора не подтверждён." }, { status: 403 });
    const payload = (await request.json()) as {
      referralReward?: number;
      referralHoldDays?: number;
      siteConfig?: unknown;
    };
    const reward = 1;
    const holdDays = Math.min(
      30,
      Math.max(1, Math.trunc(Number(payload.referralHoldDays ?? 7))),
    );
    const db = getD1();
    const now = Date.now();
    const siteConfig = sanitizeSiteConfig(payload.siteConfig, reward, holdDays);
    if(admin.discord_id==='lab:admin'){
      await db.prepare("INSERT INTO site_settings(key,value,updated_at) VALUES ('lab_site_config',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(JSON.stringify(siteConfig),now).run();return Response.json({ok:true,config:siteConfig});
    }

    await db.batch([
      db
        .prepare(
          `INSERT INTO site_settings (key, value, updated_at)
           VALUES ('referral_reward', ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        )
        .bind(String(reward), now),
      db
        .prepare(
          `INSERT INTO site_settings (key, value, updated_at)
           VALUES ('referral_hold_days', ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        )
        .bind(String(holdDays), now),
      db
        .prepare(
          `INSERT INTO site_settings (key, value, updated_at)
           VALUES ('site_config', ?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        )
        .bind(JSON.stringify(siteConfig), now),
      db
        .prepare(
          "INSERT INTO audit_log (actor_id, action, target_id, payload, created_at) VALUES (?, 'admin.settings', NULL, ?, ?)",
        )
        .bind(
          admin.discord_id,
          JSON.stringify({ reward, holdDays, sections: ["brand", "season", "news", "acts", "economy"] }),
          now,
        ),
    ]);
    return Response.json({
      ok: true,
      referralReward: reward,
      referralHoldDays: holdDays,
      config: siteConfig,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CMS update failed.";
    return Response.json({ error: message }, { status: 503 });
  }
}
