import {
  getD1,
  profilePayload,
  randomToken,
  sessionCookie,
  sha256,
} from "@/lib/s27-server";
import {registerSiteMember} from '@/lib/registration';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { code?: string };
    const code = (payload.code ?? "").toUpperCase().replace(/[^2-9A-HJ-NP-Z]/g, "");
    if (code.length !== 8) {
      return Response.json({ error: "Код должен состоять из 8 символов." }, { status: 400 });
    }

    const db = getD1();
    const now = Date.now();
    const codeHash = await sha256(code);
    const record = await db
      .prepare(
        `SELECT user_id
         FROM link_codes
         WHERE code_hash = ? AND used_at IS NULL AND expires_at > ?
         LIMIT 1`,
      )
      .bind(codeHash, now)
      .first<{ user_id: string }>();

    if (!record) {
      return Response.json(
        { error: "Код не найден, уже использован или истёк. Получите новый через /connect." },
        { status: 401 },
      );
    }

    const consumed = await db
      .prepare(
        "UPDATE link_codes SET used_at = ? WHERE code_hash = ? AND used_at IS NULL",
      )
      .bind(now, codeHash)
      .run();
    if ((consumed.meta.changes ?? 0) !== 1) {
      return Response.json({ error: "Этот код уже использован." }, { status: 409 });
    }

    const token = randomToken();
    const tokenHash = await sha256(token);
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
    await db
      .prepare(
        "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
      )
      .bind(tokenHash, record.user_id, expiresAt, now)
      .run();
    await db
      .prepare("DELETE FROM sessions WHERE expires_at <= ?")
      .bind(now)
      .run();

    await registerSiteMember(record.user_id);
    const profile = await profilePayload(record.user_id);
    return Response.json(
      { authenticated: true, profile },
      { headers: { "Set-Cookie": sessionCookie(token) } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось подключить аккаунт.";
    return Response.json({ error: message }, { status: 503 });
  }
}
