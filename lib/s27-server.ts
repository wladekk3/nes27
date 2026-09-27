import { env } from "cloudflare:workers";
import {registerSiteMember} from './registration';
import {editorIds} from './collection-rewards';

type RuntimeEnv = {
  DB?: D1Database;
  BOT_WEBHOOK_SECRET?: string;
  ADMIN_DISCORD_IDS?: string;
  OWNER_DISCORD_IDS?: string;
  MANAGER_DISCORD_IDS?: string;
  SITE_BASE_URL?: string;
};

export type SessionUser = {
  discord_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  tokens: number;
  fragments: number;
  pack_count: number;
  created_at: number;
  updated_at: number;
};

function runtimeEnv() {
  return env as unknown as RuntimeEnv;
}

export function getD1() {
  const db = runtimeEnv().DB;
  if (!db) throw new Error("D1 binding DB is unavailable");
  return db;
}

export function getRuntimeValue(key: keyof RuntimeEnv) {
  return runtimeEnv()[key];
}

export function bytesToHex(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(view, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(digest);
}

export function randomToken(byteLength = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return bytesToHex(bytes);
}

export function randomLinkCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export function parseCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  for (const item of cookie.split(";")) {
    const [key, ...rest] = item.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function getSessionUser(request: Request) {
  const token = parseCookie(request, "s27_session");
  if (!token) return null;
  const tokenHash = await sha256(token);
  const user = await getD1()
    .prepare(
      `SELECT u.discord_id, u.username, u.display_name, u.avatar_url,
              u.tokens, u.fragments, u.pack_count, u.created_at, u.updated_at
       FROM sessions s
       JOIN users u ON u.discord_id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?
       LIMIT 1`,
    )
    .bind(tokenHash, Date.now())
    .first<SessionUser>();
  if(user?.discord_id.startsWith("lab:")&&process.env.NODE_ENV==="production"&&getRuntimeValue("ENABLE_TEST_LOGIN")!=="1")return null;
  if(user){await registerSiteMember(user.discord_id);const fresh=await getD1().prepare('SELECT tokens FROM users WHERE discord_id=?').bind(user.discord_id).first<{tokens:number}>();if(fresh)user.tokens=fresh.tokens;}
  return user;
}

export function sessionCookie(token: string, maxAgeSeconds = 60 * 60 * 24 * 30) {
  return `s27_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function clearSessionCookie() {
  return "s27_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

export function adminIds() {
  return new Set(
    (getRuntimeValue("ADMIN_DISCORD_IDS") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export function isAdmin(discordId: string) {
  return discordId === "lab:admin" || adminIds().has(discordId);
}

export function ownerIds() {
  const configured = new Set(
    (getRuntimeValue("OWNER_DISCORD_IDS") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  return configured.size ? configured : adminIds();
}

async function storedRoleIds(key: "bridge:owners" | "bridge:admins" | "bridge:managers") {
  const row = await getD1().prepare("SELECT value FROM site_settings WHERE key=?").bind(key).first<{value:string}>();
  if (!row) return [] as string[];
  try {
    const value = JSON.parse(row.value);
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [] as string[];
  }
}

export async function isOwner(id: string) {
  return id === "lab:admin" || ownerIds().has(id) || (await storedRoleIds("bridge:owners")).includes(id);
}

export async function hasAdminAccess(id: string) {
  return (await isOwner(id)) || adminIds().has(id) || (await storedRoleIds("bridge:admins")).includes(id);
}

export async function isManager(id:string){return (await storedRoleIds("bridge:managers")).includes(id)||await hasAdminAccess(id)||id==='lab:manager'||new Set((getRuntimeValue('MANAGER_DISCORD_IDS')??'').split(',').map(x=>x.trim()).filter(Boolean)).has(id);}
export async function maintenanceBlocked(id:string){if(await isManager(id))return false;const row=await getD1().prepare("SELECT value FROM site_settings WHERE key='site_config'").first<{value:string}>();if(!row)return false;try{return JSON.parse(row.value)?.maintenanceMode===true}catch{return false}}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function verifyBotRequest(request: Request, rawBody: string) {
  const stored=await getD1().prepare("SELECT value FROM site_settings WHERE key='bridge:secret'").first<{value:string}>();
  const secret = getRuntimeValue("BOT_WEBHOOK_SECRET")||stored?.value;
  if (!secret) return false;
  const timestamp = request.headers.get("x-s27-timestamp") ?? "";
  const signature = request.headers.get("x-s27-signature") ?? "";
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  return constantTimeEqual(bytesToHex(digest), signature.toLowerCase());
}

export async function upsertDiscordUser(user: {
  discordId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
}) {
  const now = Date.now();
  await getD1()
    .prepare(
      `INSERT INTO users (
         discord_id, username, display_name, avatar_url,
         tokens, fragments, pack_count, created_at, updated_at
       ) VALUES (?, ?, ?, ?, 0, 0, 0, ?, ?)
       ON CONFLICT(discord_id) DO UPDATE SET
         username = COALESCE(?, users.username),
         display_name = COALESCE(?, users.display_name),
         avatar_url = CASE WHEN ?=1 THEN excluded.avatar_url ELSE users.avatar_url END,
         updated_at = excluded.updated_at`,
    )
    .bind(
      user.discordId,
      user.username || `user_${user.discordId.slice(-4)}`,
      user.displayName || user.username || `Сталкер ${user.discordId.slice(-4)}`,
      user.avatarUrl ?? null,
      now,
      now,
      user.username || null,
      user.displayName || user.username || null,
      user.avatarUrl === undefined ? 0 : 1,
    )
    .run();
}

export async function profilePayload(discordId: string) {
  const db = getD1();
  const profile = await db
    .prepare(
      `SELECT discord_id, username, display_name, avatar_url, tokens, fragments,
              pack_count, created_at, updated_at
       FROM users WHERE discord_id = ? LIMIT 1`,
    )
    .bind(discordId)
    .first<SessionUser>();
  if (!profile) return null;
  const cards = await db
    .prepare("SELECT card_slug, count FROM user_cards WHERE user_id = ? ORDER BY card_slug")
    .bind(discordId)
    .all<{ card_slug: string; count: number }>();
  const referralCounts = await db
    .prepare(
      `SELECT
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
         SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verified,
         SUM(CASE WHEN status = 'verified' AND reward_tokens >= 0 THEN 1 ELSE 0 END) AS current_verified
       FROM referrals WHERE referrer_user_id = ?`,
    )
    .bind(discordId)
    .first<{ pending: number | null; verified: number | null; current_verified:number|null }>();

  return {
    ...profile,
    pioneer: await db.prepare('SELECT 1+(SELECT COUNT(*) FROM site_registrations earlier WHERE earlier.id<r.id) AS number FROM site_registrations r WHERE user_id=? AND (SELECT COUNT(*) FROM site_registrations earlier WHERE earlier.id<r.id)<30').bind(discordId).first<{number:number}>(),
    is_owner: await isOwner(discordId),
    is_admin: await hasAdminAccess(discordId),
    is_editor: editorIds.has(discordId),
    is_manager: await isManager(discordId),
    is_test: discordId.startsWith("lab:"),
    cards: cards.results,
    referrals: {
      pending: referralCounts?.pending ?? 0,
      verified: referralCounts?.verified ?? 0,
      currentVerified:referralCounts?.current_verified??0,
    },
  };
}
