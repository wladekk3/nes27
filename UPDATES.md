# Обновления NE S27

Сохранять тот же проект Sites и его адрес. Домен относится к проекту, а не к дизайну или сезону. Профили, купоны, жетоны, коллекции, заявки и настройки находятся в постоянной базе D1, отдельно от файлов интерфейса. Не создавать новый проект для следующего сезона и не менять привязку DB.

Перед обновлением: резервная копия базы средствами хостинга, проверка миграций на копии и сохранение текущей публикации. Применять добавочные миграции, без удаления таблиц пользователей. Новую версию интерфейса публиковать в тот же проект. Для отката интерфейса сохранять совместимость с новой схемой; откат кода не откатывает покупки и балансы.

Админка меняет название, сезон, акцент, части сезона и новости. Полная смена структуры/функций делается новой версией кода в том же проекте. Товары и утверждённые правила экономики сейчас фиксированы в lib/economy.ts. Администраторы видят заявки магазина и отмечают выдачу либо возврат. Возврат выполняется один раз.

Рулетка: 1 купон = 1 карта. Шансы редкостей 55 / 38 / 5 / 1,8 / 0,2%, внутри редкости карты равновероятны. Без гарантированных повышений. Серверный криптографический выбор без modulo bias; анимация не влияет на результат. Реальные операции сохраняются атомарно и защищены идентификатором запроса.

Мифические изображения и сведения выдаются отдельными авторизованными маршрутами только владельцам. Уже ранее опубликованные изображения нельзя отозвать из чужих сохранений; новый сайт не раздаёт их публично. В локальной демоверсии секрет остаётся заглушкой.

Приглашения: три новых подтверждённых участника дают купон. Бот проверяет присутствие после срока ожидания; повторный вход и подтверждение не дают повторную награду. Старые выплаченные награды сохраняются и не засчитываются повторно. Discord invite attribution имеет ограничения при одновременных входах, удалённых ссылках и простое бота; неоднозначные входы требуют проверки администрацией. Изменённый бот нужно отдельно перезапустить на его хостинге; публикация сайта этого не делает.

Сохранены карты 1–8, 10, 11, 12, 15, 24 и ненумерованная MANAGER. Удалённые номера не перенумерованы. Старый сюжет убран из разделов; текст внутри ранее созданных иллюстраций остаётся частью исходных изображений и потребует отдельной перерисовки после утверждения лора.

Магазин создаёт заявки на ручную выдачу. До реальных выдач администрация уточняет срок Nitro, регион, платформу и точное издание. «Предзаказ» не используется как обещание наличия. Оплата реальных товаров и их автоматическая закупка не реализованы. Тестовые браузерные жетоны не принимаются магазином.

## Persisted test accounts, profiles and cosmetics — September 2026

Two reserved account IDs, `lab:admin` and `lab:member`, authenticate through `/api/auth/test-login`. Passwords use salted PBKDF2 hashes in the server bundle. Plaintext access details are delivered privately outside the repository. Login creates initial balances only once, uses a rate limit, and issues a 24-hour HttpOnly session. The account is a site test identity, not a Discord identity. Existing Discord identity data is unchanged.

The test administrator can issue cards, coupons and Zone tokens only to `lab:*` accounts. Grants require a reason and unique request ID and enter the audit log. Test settings use `lab_site_config`, separate from the real site configuration. Test prize orders are separate by user ID. These are persistent tests, not entitlement to real prizes.

Profiles support nickname, status, bio, built-in avatars, up to three owned showcase cards, and a wardrobe. Cosmetics cost 800/650/950/1200/1400 tokens for cursor/frame/banner/profile aura/reveal theme. Purchase is atomic and one-time; equipping requires ownership. Cosmetics never affect rarity odds. Opening still grants exactly one card per cache, with one to three caches in a batch.

### Future Discord prize handoff

`POST /api/prize-claim` authenticates the member and records one durable `prize_claims` row per pending owned order. `GET /api/orders?admin=1` exposes the claim status to authorized administrators. No Discord ticket is currently created. Existing order fulfillment/refund endpoints are administrator-only and refunds are idempotent.

When the bot is connected, add an authenticated bot-only outbox claim/ack API. Never connect the browser directly to a bot token. Exclude `lab:*` identities from Discord dispatch. Only dispatch a still-pending, paid order with a real linked Discord ID and `waiting_bot` status. Use the order ID as the deduplication key, persist the created ticket ID, and retry without creating duplicate channels. A ticket should be private to the requesting member, configured manager role and bot; deny the guild everyone role. Do not place passwords, session cookies or bot secrets in tickets. Exact bot endpoint and Discord channel/role IDs remain to be configured in that integration task.

### Checks

The production Worker is exercised against SQLite with the D1 transaction contract: both role logins, server access boundaries, grant replay, cosmetic purchase replay and rollback, ownership before equip, saved profile data, mythic visibility, three-cache draws, claim ownership, and one-time refunds. Probability tests cover all 10,000 weight buckets; SQL tests cover migrations, last-copy protection and referral rewards. These checks do not replace later live Discord integration testing.

## Illustrated workshop and collection navigation

The primary cards screen and home shelf now show owned cards. The complete catalog is available by an explicit secondary link, retaining owner-only mythic dossiers. Reward-summary images share one 2:3 rendering box so source aspect ratios do not produce uneven heights. Profile editing uses a scrollable modal; decorative overlays do not intercept buttons. Linked profiles render `account.avatar_url` from the bot-synchronized user record; test identities alone retain a built-in avatar selector.

The workshop includes 22 items, preserving existing item IDs and prices. Four generated transparent frame assets, four generated banners and a workshop illustration are integrated. New affordable presentation modes are scanner 350, case reel 400 and wheel 500. Their input is the server-awarded card; they never call the draw function. Wheel sectors match 55/38/5/1.8/0.2 percent. Equipping themes, click effects and reveal modes requires server-verified purchase ownership. All items can be removed through the wardrobe. Reduced-motion preferences suppress extra effects.

The classic-cursor item is an original geometric field crosshair, styled for the old Zone rather than a ripped original game cursor file. It works only on fine-pointer devices. Exact reproduction of a specific game-menu cursor still requires that reference asset.

`docs/card-collection-50.md` contains 14 existing cards plus 36 proposals, not new active drops. Historical proposals are based on the existing website archive and need source-message verification before card production. No Discord channels were read in this change. The active pool and probability code are unchanged; any three identical cards in a three-cache batch have approximately 2.4597% probability with the current pool.

Production build, existing economy/transaction/privacy tests and extended purchase/equip tests pass. Browser interaction testing was not requested or run. Discord bot connection and prize fulfillment remain separate future integration work.

## Supplied classic cursor

Replaced the geometric crosshair with the user-supplied transparent STALKER arrow. The 40px cursor uses nearest-neighbor downsampling to preserve the source pixel grid; hotspot (2,1) aligns with its tip. Store ownership and the existing classic-cursor ID/200-token price are preserved. The supplied artwork is also used in the shop preview.
