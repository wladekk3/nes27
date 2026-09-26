import { getD1, getSessionUser } from "@/lib/s27-server";

export async function GET(request:Request) {
  try {
    const user=await getSessionUser(request);
    const row = await getD1()
      .prepare("SELECT value FROM site_settings WHERE key = ? LIMIT 1").bind(user?.discord_id.startsWith('lab:')?'lab_site_config':'site_config')
      .first<{ value: string }>();
    return Response.json(
      { configured: true, config: row ? JSON.parse(row.value) : null },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { configured: false, config: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
