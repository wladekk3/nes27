# NE S27 — Discord bot implementation contract / Контракт бота

Updated 12 September 2026. This document supersedes earlier bot prompts.
Build only the Discord bot for bot-hosting.net. The website already exists.
Production site: https://ne-s27-zone.vladiksestakov476333.chatgpt.site

## Русская инструкция подключения

На сайте откройте Управление → Связь с ботом. Создайте ключ связи и скопируйте настройки на хостинг бота. Укажите Discord ID менеджеров в том же разделе. Обычные участники и тестовый менеджер не могут менять ключ. Он показывается только при создании; при замене старый отключается. Не публикуйте ключ. DISCORD_TOKEN хранится только у бота.

Бот должен отправлять ping и guild_stats раз в минуту. После запуска статус станет «Бот на связи». Команда /connect выдаёт участнику закрытым сообщением одноразовый восьмизначный код и ссылку на сайт. Участник вводит этот код на сайте. Это согласованное направление привязки: БОТ → САЙТ. Не просите пароли Discord. Тестовые аккаунты не превращаются автоматически в настоящие Discord-профили.

За 2 новых подтверждённых приглашённых участников выдаётся 1 купон. Не за 3. Призы выдаются менеджером через закрытые тикеты. Коды поддерживают купоны, жетоны и украшения. Обычные шансы карточек остаются 55 / 38 / 5 / 1,8 / 0,2%. Отдельный бонус-сертификат имеет общий шанс 0,01% за тайник среди доступных товаров. Бот не рассчитывает выпадения и не списывает баланс самостоятельно.

## Runtime configuration

Required bot environment variables:
- DISCORD_TOKEN — from the Discord Developer Portal, private.
- GUILD_ID — target NE S27 server ID.
- SITE_BASE_URL — site origin above, without /api/bot.
- BOT_WEBHOOK_SECRET — shared connection key created by the curator on the website.
- TICKET_CATEGORY_ID — private prize ticket category.
- MANAGER_ROLE_ID — Discord role to mention in prize tickets; this alone does not authorize website manager actions.

Manager Discord user IDs must be saved in the website's connection panel (or MANAGER_DISCORD_IDS server setting). Full administrators are configured using ADMIN_DISCORD_IDS on the site. Never trust a role supplied by a website visitor. Commands use Discord interaction.user.id as actorDiscordId; members cannot supply another actor ID. Never permit lab: account identifiers in bot calls.

Use Node.js supported by the host, discord.js, persistent SQLite for local invite snapshots and ticket jobs. Include package.json, .env.example without secrets, startup script, migrations, installation instructions and tests. Use only required intents and permissions; no Administrator permission. Do not build frontend, store balances locally, post unrelated messages or read chat content. UI responses should support RU and EN and use ephemeral responses for profiles, codes and account links.

## Signed website bridge

POST /api/bot
Content-Type: application/json
x-s27-timestamp: Unix seconds as a string
x-s27-signature: lowercase hex HMAC-SHA256(BOT_WEBHOOK_SECRET, `${timestamp}.${rawBody}`)

Serialize the body ONCE and sign those exact bytes. Maximum timestamp drift: 300 seconds. HTTPS only. A browser session cookie is not a bot credential. Keep secrets out of logs. Handle 401 as configuration failure and 429/5xx with bounded exponential backoff. Store retryable jobs on disk.

## Supported actions (actual website contract)

1. ping
Request: {"action":"ping"}
Response: {"ok":true,"service":"NE S27 bridge"}
Send every 60 seconds. Successful signed requests update the site heartbeat.

2. guild_stats
Request: {"action":"guild_stats","memberCount":847}
847 is an example, not a real member count. Read the actual target guild.memberCount and send every 60 seconds and after join/leave with debounce. The site marks data older than 3 minutes stale.

3. sync_member
Request: {"action":"sync_member","discordId":"123456789012345678","username":"user","displayName":"Member","avatarUrl":"https://cdn.discordapp.com/..."}
Send complete identity on profile changes and /profile or /connect. Use displayAvatarURL with a Discord CDN URL. Do not overwrite cosmetics, cards or balances. Never invent identity values. No third-party avatar tracking URLs.

4. create_link
Same identity fields as sync_member, action create_link. Returns {code,expiresInSeconds:600,connectUrl}. Code is 8 uppercase characters, valid for 10 minutes, consumed once on the WEBSITE via POST /api/auth/connect {code}. A new code invalidates earlier unused codes. One Discord ID is the canonical site account; it cannot create multiple separate identities. Do not implement the earlier site-to-bot /connect CODE design against this API. /connect without arguments issues the private link. After sign-in the session is HttpOnly, Secure and SameSite=Lax.

5. profile
Request: {"action":"profile","discordId":"123456789012345678"}
Response: {profile}; includes tokens (cache coupons), fragments (Zone Tokens), pack_count, cards, referrals, is_admin and is_manager. 404 means no profile yet. Never expose other people's private mythic cards.

6. register_invite
Request: {"action":"register_invite","discordId":"123456789012345678","inviteCode":"actualDiscordInvite","username":"user","displayName":"Member","avatarUrl":null}
The bot creates a unique invite for /invite and saves its ownership. Do not use the general server invite as a tracked personal link.

7. referral_join
Request: {"action":"referral_join","joinedDiscordId":"223456789012345678","inviteCode":"actualDiscordInvite","username":"newuser","displayName":"New member","avatarUrl":null}
Track only known invite increments. When simultaneous joins make attribution ambiguous, queue for review and do not invent a referrer. Exclude bots and self-referrals. The site deduplicates referred Discord IDs and checks account age from the Discord snowflake: at least 30 days. There is no hold period. Eligible joins are verified immediately. Existing server members may confirm a referrer once on the site. Every two verified referrals earn one coupon.

8. pending_referrals
Request: {"action":"pending_referrals"}; returns {pending:[{referred_user_id}]}, up to 100 eligible entries. Check actual membership with Discord for any legacy pending referral.
9. verify_member
Request: {"action":"verify_member","joinedDiscordId":"223456789012345678"}; site awards one coupon for each pair of verified referrals, atomically. Safe to repeat.
10. referral_leave
Request: {"action":"referral_leave","joinedDiscordId":"223456789012345678"}; rejects pending referral. Discord API failures must NOT be treated as a member leaving.

## Codes

/codes create, /codes disable, /codes list: manager-only, private replies. Site checks actorDiscordId independently.

11. reward_code
Create request:
{"action":"reward_code","actorDiscordId":"123456789012345678","command":{"action":"create","kind":"prize","rewardType":"coupons","coupons":3,"count":1,"maxUses":1,"code":"","note":"Competition winner","requestId":"a-valid-random-uuid"}}
The example requestId must be replaced by a real UUID. Preserve the SAME requestId on transport retries. Returns {ok,codes:[{id,code}]}.
- kind prize: one total redemption. kind community: maxUses distinct members, once each (1–10000, typical 100).
- rewardType coupons: coupons integer 1–15.
- rewardType tokens: rewardAmount integer 1–100000; coupons can be 0.
- rewardType cosmetic: rewardItem is an exact catalogue ID; coupons can be 0. Includes frames, banners, cursors, sounds, click effects, themes and reveal styles. Use the accompanying cosmetics-catalog.json for IDs.
- count 1–15 independent codes. Custom nonempty code requires count=1.
- code: trim whitespace, preserve letter case, Unicode NFC, max 128 characters. Even one letter is allowed. Empty means generate 16 case-sensitive alphanumeric characters in XXXX-XXXX-XXXX-XXXX format.
- note max 300 characters. A code already granting an owned cosmetic is rejected WITHOUT consuming an activation; no currency compensation.
Disable: {"action":"reward_code","actorDiscordId":"...","command":{"action":"disable","id":"exact-code-id"}}
12. code_list
{"action":"code_list","actorDiscordId":"123456789012345678"} → {codes:[...]}, latest 100 live codes. Includes reward type, amount/item, uses/max_uses and active.

Members redeem codes on the WEBSITE, at Home → Redeem Code or near Caches/Profile/Invite. Do not call browser /api/reward-codes with bot HMAC: it uses website sessions. Do not automatically DM winners; generate/copy codes privately for a manager to distribute.

## Prize tickets

The site creates shop_orders for purchases and zero-price bonus certificates. Claim on the website creates prize_claims. Never promise immediate automated cash transfers.
13. pending_claims
{"action":"pending_claims"} → {claims:[{order_id,user_id,ticket_id,product_id,name,price}]}, at most 50 pending LIVE claims. Poll every 15–30 seconds. Test orders are excluded.
For each order, create a PRIVATE ticket visible only to the claimant, manager role and bot. Use a persistent local job keyed by order_id. Put the order ID in the channel topic. After crashes, look up that topic before creating another channel. Record a Discord channel ID immediately; one worker per guild. Mention only the claimant and the manager role using allowedMentions. Never post keys, codes or personal delivery details publicly.
14. claim_ticket
{"action":"claim_ticket","orderId":"exact-order-uuid","ticketId":"323456789012345678"}
Same ticket acknowledged twice succeeds. Different ticket for an already linked order returns 409 with canonical ticketId; clean up any duplicate created by your worker only when safe. Closed/cancelled requests must not get new tickets.
15. claim_status
{"action":"claim_status","orderId":"exact-order-uuid"} → {order:{id,status,ticket_id,claim_status}}. Use before ticket creation and before any delivery. Also sync website cancellations to existing tickets.
16. claim_fulfilled
{"action":"claim_fulfilled","actorDiscordId":"123456789012345678","orderId":"exact-order-uuid"}
Manager-only. After real delivery is confirmed, marks the order and claim fulfilled. Repeated completion returns 409, with no extra reward. Keep a transcript and delivery audit. Refunds/cancellations can be handled in the website manager desk; bonus certificates have price=0 and therefore refund zero tokens.

## Safety and acceptance tests

Test the real API contract locally using a mock Discord guild: signatures, wrong/expired key, single-use link, profile/avatar refresh without losing inventory, two verified referrals per coupon, duplicate joins, ambiguous invites, restart recovery, code limits, repeated code redemption, cosmetic ownership, role checks, ticket creation crash recovery, duplicate acknowledgement, website cancellation and repeated fulfillment. Keep test and live accounts separate.
Do not calculate card odds or change prices in the bot. The website controls its economy. Mythic dossiers remain owner-only. Collection-set rewards that are undecided stay disabled.
The website bridge is implemented, but live end-to-end synchronization only starts AFTER this bot is deployed, configured and successfully sends signed requests. Do not claim it is connected before checking the heartbeat.


## Registration update
On first authenticated site visit, a Discord member receives 2 starter coupons exactly once. The first 30 site registrations receive a numbered FIRST AT THE CAMPFIRE profile badge. Bot sync alone does not count as a site registration. The site resolves @username for member search.
