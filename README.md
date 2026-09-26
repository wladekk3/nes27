# NE S27

Production source for the NE S27 seasonal portal, card collection, rewards, administration and Discord integration.

## Architecture

- **Cloudflare Worker**: Vinext frontend and all `/api/*` routes.
- **Cloudflare D1 (`DB`)**: accounts, Discord links, sessions, cards, inventory, codes, referrals, rewards, orders, roles and audit history.
- **Worker static assets**: card art, audio, cosmetics, prize images and the responsive NE S27 interface.
- **GitHub Actions**: production deployment from `main`; pull requests deploy to an isolated preview Worker and preview D1 database.
- **Discord bot**: `bot/`, connected through signed HMAC requests. Tokens and secrets stay in environment variables.

The production system is independent of `chatgpt.site` and Render. A future custom domain only changes `SITE_BASE_URL`.

## Local development

Requirements: Node.js 22+ and npm.

```bash
npm ci
npm run dev
npm test
```

Use `.env.example` as the variable list. Never commit a real `.env` file. The test suite builds the production Worker and validates accounts, Discord linking, codes, the two-cache starter bonus, inventory, recycling, rewards, referrals, upgrader, administration and transaction rules.

## Cloudflare setup

Create two D1 databases:

```bash
npx wrangler d1 create ne-s27-production
npx wrangler d1 create ne-s27-preview
```

Add these GitHub Actions secrets to `wladekk3/nes27`:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Scoped Workers/D1 deployment token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account |
| `CLOUDFLARE_D1_DATABASE_ID` | Production D1 ID |
| `CLOUDFLARE_D1_PREVIEW_DATABASE_ID` | Preview D1 ID |
| `SITE_BASE_URL` | Exact production `workers.dev` origin, including the account subdomain |
| `PREVIEW_SITE_BASE_URL` | Exact preview `workers.dev` origin, including the account subdomain |
| `BOT_WEBHOOK_SECRET` | Shared HMAC secret used by the site and bot |
| `ADMIN_DISCORD_IDS` | Comma-separated administrator Discord IDs |
| `MANAGER_DISCORD_IDS` | Optional comma-separated manager Discord IDs |

The workflow generates an ignored deployment config, applies migrations and deploys to:

- production: `https://ne-s27-zone.r9d8npjbr7.workers.dev`
- preview: `https://ne-s27-preview.r9d8npjbr7.workers.dev`

`wrangler.jsonc.example` documents the equivalent manual configuration.

## Database migration

Before the first production switch:

1. Export every live D1 table and keep the export outside Git.
2. Create `ne-s27-production` and apply all files in `drizzle/`.
3. Convert the JSON export into retry-safe D1 chunks:

   ```bash
   npm run db:import:sql -- backups/ne-s27-live-d1-export.json backups/ne-s27-live-d1-import.sql --chunk-size=250
   ```

4. Apply the generated `backups/ne-s27-live-d1-import-*.sql` files in lexical order with `wrangler d1 execute DB --remote --file ...`.
5. Compare row counts for every table and spot-check users, Discord IDs, inventory, codes, referrals, cosmetics and roles.
6. Only then update the bot and public traffic.

Never commit database exports: they can contain session hashes and private Discord identifiers.

## Maintenance mode

Administrators control **MAINTENANCE MODE — ON / OFF** in the administration panel and save it to the server. Ordinary members then see the NE S27 maintenance screen. Administrators and managers retain access; the Discord bot continues using signed backend routes. Game, upgrader and code-redemption writes are blocked for ordinary members.

Recommended release flow:

1. Enable maintenance mode.
2. Push changes to a branch and verify the preview Worker.
3. Merge into `main`; GitHub Actions deploys production.
4. Run smoke checks.
5. Disable maintenance mode.

## Discord bot

The bot is in `bot/` and uses `bot/.env.example`. After production is verified, set:

```env
SITE_BASE_URL=https://ne-s27-zone.r9d8npjbr7.workers.dev
```

Keep `DISCORD_BOT_TOKEN` and `BOT_WEBHOOK_SECRET` only in the bot host's secret settings. `/connect`, `/invite`, referral attribution, news sync and prize tickets use the signed Worker API.

## Starter bonus

A Discord member receives exactly **2 starter coupons** on the first successful site registration. The idempotency record is `operations.id = welcome:<discord_id>`, so reconnecting, logging in again or redeploying cannot grant it twice. Existing members are not modified by the change from 3 to 2.
