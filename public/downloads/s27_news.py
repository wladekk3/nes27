"""NE S27 news extension for discord.py 2.x. No bot token is sent to the site."""
import asyncio
import hashlib
import hmac
import json
import logging
import os
import time
import aiohttp
from discord.ext import commands

CHANNELS = {1013194498211315773,1013180975158673503,1387765118053519400,1013194830656061610,1236414155532275864,1501973321783316540,1236414278936826011,1236414391826518157,1013195137901412423,1470163629893488853,1013205729378836480,1449896290325631171}
log = logging.getLogger('ne_s27.news')

class S27News(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.session = None
        self.backfill = None
        self.started = False

    async def cog_load(self):
        self.session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=25))

    async def cog_unload(self):
        if self.backfill:
            self.backfill.cancel()
        if self.session:
            await self.session.close()

    async def send(self, payload):
        base = os.environ['SITE_BASE_URL'].rstrip('/')
        secret = os.environ['BOT_WEBHOOK_SECRET']
        body = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode()
        for attempt in range(4):
            stamp = str(int(time.time()))
            signature = hmac.new(secret.encode(), stamp.encode()+b'.'+body, hashlib.sha256).hexdigest()
            try:
                async with self.session.post(base+'/api/bot', data=body, headers={'Content-Type':'application/json','x-s27-timestamp':stamp,'x-s27-signature':signature}) as response:
                    if response.status < 300:
                        return
                    if response.status < 500 and response.status != 429:
                        raise ValueError(f'News bridge rejected request: HTTP {response.status}')
                    delay = min(60, float(response.headers.get('Retry-After', 2**attempt)))
            except (aiohttp.ClientError, asyncio.TimeoutError):
                delay = 2**attempt
            await asyncio.sleep(delay)
        raise RuntimeError('News bridge unavailable; history sync will retry on restart')

    async def publish(self, message):
        if message.channel.id not in CHANNELS or not message.guild:
            return
        content = message.content or ''
        images = [a.url for a in message.attachments if (a.content_type or '').startswith('image/')]
        for embed in message.embeds:
            content += '\n' + '\n'.join(filter(None, [embed.title, embed.description]))
            for field in embed.fields:
                content += '\n'+field.name+'\n'+field.value
            if embed.image and embed.image.url:
                images.append(embed.image.url)
        if not content.strip() and not images:
            return
        await self.send({'action':'news_upsert','messageId':str(message.id),'channelId':str(message.channel.id),'guildId':str(message.guild.id),'channelName':message.channel.name,'content':content[:12000],'images':images[:8],'createdAt':int(message.created_at.timestamp()*1000),'version':int((message.edited_at or message.created_at).timestamp()*1000)})

    async def sync_history(self):
        # Idempotent full backfill; Discord.py handles Discord rate limits.
        for channel_id in CHANNELS:
            try:
                channel = self.bot.get_channel(channel_id) or await self.bot.fetch_channel(channel_id)
                async for message in channel.history(limit=None, oldest_first=True):
                    await self.publish(message)
                    await asyncio.sleep(.15)
            except Exception:
                log.exception('News history failed for channel %s', channel_id)

    @commands.Cog.listener()
    async def on_ready(self):
        if not self.started:
            self.started = True
            self.backfill = asyncio.create_task(self.sync_history())

    @commands.Cog.listener()
    async def on_message(self, message):
        try:
            await self.publish(message)
        except Exception:
            log.exception('News publish failed')

    @commands.Cog.listener()
    async def on_raw_message_edit(self, payload):
        if payload.channel_id not in CHANNELS:
            return
        try:
            channel = self.bot.get_channel(payload.channel_id) or await self.bot.fetch_channel(payload.channel_id)
            await self.publish(await channel.fetch_message(payload.message_id))
        except Exception:
            log.exception('News edit failed')

    @commands.Cog.listener()
    async def on_raw_message_delete(self, payload):
        if payload.channel_id in CHANNELS and payload.guild_id:
            try:
                await self.send({'action':'news_delete','channelId':str(payload.channel_id),'guildId':str(payload.guild_id),'messageId':str(payload.message_id),'version':int(time.time()*1000)})
            except Exception:
                log.exception('News deletion failed')

async def setup(bot):
    await bot.add_cog(S27News(bot))
