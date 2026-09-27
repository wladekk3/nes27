import { writeFileSync } from "node:fs";

const production = process.env.GITHUB_REF === "refs/heads/main";
const databaseId = production ? process.env.CLOUDFLARE_D1_DATABASE_ID : process.env.CLOUDFLARE_D1_PREVIEW_DATABASE_ID;
if (!databaseId) throw new Error("Missing Cloudflare D1 database ID");
const config = {
  $schema: "node_modules/wrangler/config-schema.json",
  name: production ? "ne-s27-zone" : "ne-s27-preview",
  main: "dist/server/index.js",
  compatibility_date: "2026-09-26",
  compatibility_flags: ["nodejs_compat"],
  workers_dev: true,
  assets: { directory: "dist/client", binding: "ASSETS" },
  d1_databases: [{ binding: "DB", database_name: production ? "ne-s27-production" : "ne-s27-preview", database_id: databaseId, migrations_dir: "drizzle" }],
  vars: {
    SITE_BASE_URL:
      process.env.SITE_BASE_URL ||
      (production
        ? "https://ne-s27-zone.r9d8npjbr7.workers.dev"
        : "https://ne-s27-preview.r9d8npjbr7.workers.dev"),
    OWNER_DISCORD_IDS: process.env.OWNER_DISCORD_IDS || process.env.ADMIN_DISCORD_IDS || "684786698512760890",
    ADMIN_DISCORD_IDS: process.env.ADMIN_DISCORD_IDS || "684786698512760890",
    MANAGER_DISCORD_IDS: process.env.MANAGER_DISCORD_IDS ?? "",
    ENABLE_TEST_LOGIN: "0",
  },
};
writeFileSync("wrangler.deploy.json", `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
