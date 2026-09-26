# NE S27 — модуль новостей для существующего Python-бота

Сайт готов принимать новости через подписанный POST /api/bot. Это не означает, что модуль уже установлен на bot-hosting.net.

1. Скачайте `/downloads/s27_news.py` с сайта и положите рядом с основным файлом бота.
2. Используются существующие `SITE_BASE_URL` и `BOT_WEBHOOK_SECRET`. Не передавайте Discord-токен сайту.
3. В Discord Developer Portal включите Message Content Intent. В коде бота до создания клиента включите `intents.message_content = True` и `intents.guild_messages = True`.
4. Для бота на `commands.Bot` добавьте `await bot.load_extension("s27_news")` в существующий `setup_hook`. Не создавайте второй экземпляр бота и не заменяйте работающие обработчики.
5. Если ваш бот использует обычный `discord.Client`, этот Cog нельзя подключить напрямую: передайте файл разработчику бота для интеграции обработчиков в существующую архитектуру.
6. У бота должны быть View Channel и Read Message History для нужных каналов. Administrator не требуется. Список 12 разрешённых каналов уже встроен в модуль и проверяется сайтом.
7. Перезапустите бота. Модуль перенесёт доступную историю каналов, затем будет публиковать новые сообщения и изменения. Повторная отправка не создаёт дубль. Удаления, замеченные работающим ботом, скрывают запись на сайте.

Текст сохраняется на языке оригинала. Картинки — ссылки на Discord CDN; старые ссылки Discord могут истекать. Повторная синхронизация обновляет их. Вложения, не являющиеся картинками, не переносятся. Удаления за время, когда бот был выключен, требуют отдельной сверки истории.

## Награды за коллекции

Кнопка «Забрать» начисляет купоны один раз и создаёт заявку `shop_orders` + `prize_claims`. Существующий бот должен опрашивать `pending_claims`, создавать закрытый тикет, подтверждать `claim_ticket`, а после ручной выдачи отправлять `claim_fulfilled` с ID уполномоченного менеджера. Сайт проверяет права менеджера. Редактор — только подпись, не роль доступа.

## English

Download `s27_news.py`, place it beside the existing Python bot, and load it from `commands.Bot.setup_hook` using `await bot.load_extension("s27_news")`. Enable Message Content Intent in both the Developer Portal and the bot, plus Guild Messages. Grant View Channel and Read Message History for the approved channels. Reuse SITE_BASE_URL and BOT_WEBHOOK_SECRET. Restart the bot. Do not replace your login, invite, or prize handlers.

The module backfills accessible messages and mirrors new messages, edits, and observed deletions. Text stays in its original language. Discord image URLs can expire; another sync refreshes them. No Discord token is sent to the site.
