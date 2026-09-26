import {
  clearSessionCookie,
  getD1,
  getSessionUser,
  parseCookie,
  profilePayload,
  sha256,
} from "@/lib/s27-server";

export async function GET(request: Request) {
  try {
    const user = await getSessionUser(request);
    if (!user) return Response.json({ authenticated: false, configured: true });
    return Response.json({
      authenticated: true,
      configured: true,
      profile: await profilePayload(user.discord_id),
    });
  } catch {
    return Response.json({ authenticated: false, configured: false });
  }
}

export async function DELETE(request: Request) {
  try {
    const token = parseCookie(request, "s27_session");
    if (token) {
      await getD1()
        .prepare("DELETE FROM sessions WHERE token_hash = ?")
        .bind(await sha256(token))
        .run();
    }
  } catch {
    // The cookie is cleared even if the database is temporarily unavailable.
  }
  return Response.json(
    { authenticated: false },
    { headers: { "Set-Cookie": clearSessionCookie() } },
  );
}
