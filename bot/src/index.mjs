import { createHmac } from "node:crypto";
import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
} from "discord.js";

const required = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_GUILD_ID",
  "SITE_BASE_URL",
  "BOT_WEBHOOK_SECRET",
];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
}

const siteBaseUrl = process.env.SITE_BASE_URL.replace(/\/$/, "");
const adminRoleIds = new Set(
  (process.env.ADMIN_ROLE_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const defaultNewsChannels = [
  "1013194498211315773","1013180975158673503","1387765118053519400","1013194830656061610",
  "1236414155532275864","1501973321783316540","1236414278936826011","1236414391826518157",
  "1013195137901412423","1470163629893488853","1013205729378836480","1449896290325631171",
];
const newsChannelIds = new Set(
  (process.env.NEWS_CHANNEL_IDS || defaultNewsChannels.join(","))
    .split(",").map((value) => value.trim()).filter(Boolean),
);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let inviteUses = new Map();

function memberIdentity(member) {
  return {
    discordId: member.id,
    username: member.user.username,
    displayName: member.displayName,
    avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 256 }),
  };
}

async function bridge(action, payload = {}) {
  const body = JSON.stringify({ action, ...payload });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", process.env.BOT_WEBHOOK_SECRET)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  const response = await fetch(`${siteBaseUrl}/api/bot`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-s27-timestamp": timestamp,
      "x-s27-signature": signature,
    },
    body,
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || `Bridge error ${response.status}`);
  }
  return result;
}

async function refreshInvites(guild) {
  const invites = await guild.invites.fetch();
  inviteUses = new Map(invites.map((invite) => [invite.code, invite.uses ?? 0]));
  return invites;
}

async function ensurePersonalInvite(guild, member, channelId) {
  const existing = await bridge("get_referral_invite", { discordId: member.id });
  if (existing.status === "ready") return existing;
  const invite = await guild.invites.create(channelId, {
    maxAge: 0,
    maxUses: 0,
    unique: true,
    reason: `NE S27 permanent referral for ${member.id}`,
  });
  inviteUses.set(invite.code, invite.uses ?? 0);
  const registered = await bridge("register_invite", {
    ...memberIdentity(member),
    inviteCode: invite.code,
  });
  if (registered.inviteCode !== invite.code) {
    await invite.delete("Duplicate NE S27 personal invite").catch(() => {});
    inviteUses.delete(invite.code);
  }
  return registered;
}

let provisioningInvites = false;
async function provisionRequestedInvites() {
  if (provisioningInvites) return;
  provisioningInvites = true;
  try {
    const channelId = process.env.INVITE_CHANNEL_ID;
    if (!channelId) throw new Error("INVITE_CHANNEL_ID is not configured");
    const guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
    const {requests} = await bridge("pending_invite_requests");
    for (const row of requests) {
      try {
        const member = await guild.members.fetch(row.user_id);
        if (!member.user.bot) await ensurePersonalInvite(guild, member, channelId);
      } catch (error) {
        console.error(`Personal invite failed for ${row.user_id}:`, error);
      }
    }
  } catch (error) {
    console.error("Personal invite provisioning unavailable:", error);
  } finally {
    provisioningInvites = false;
  }
}

async function publishNews(message) {
  if (!message.guildId || !newsChannelIds.has(message.channelId)) return;
  if (message.partial) message = await message.fetch();
  let content = message.content || "";
  const images = [...message.attachments.values()]
    .filter((attachment) => (attachment.contentType || "").startsWith("image/"))
    .map((attachment) => attachment.url);
  for (const embed of message.embeds) {
    content += `\n${[embed.title, embed.description].filter(Boolean).join("\n")}`;
    for (const field of embed.fields || []) content += `\n${field.name}\n${field.value}`;
    if (embed.image?.url) images.push(embed.image.url);
  }
  if (!content.trim() && images.length === 0) return;
  await bridge("news_upsert", {
    messageId: message.id,
    channelId: message.channelId,
    guildId: message.guildId,
    channelName: message.channel?.name || "news",
    content: content.trim().slice(0, 12000),
    images: images.slice(0, 8),
    createdAt: message.createdTimestamp,
    version: message.editedTimestamp || message.createdTimestamp,
  });
}

async function backfillNews(client) {
  for (const channelId of newsChannelIds) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel?.isTextBased() || !channel.messages) continue;
      const messages = await channel.messages.fetch({ limit: 50 });
      for (const message of [...messages.values()].reverse()) await publishNews(message);
    } catch (error) {
      console.error(`News history failed for ${channelId}:`, error);
    }
  }
}

function hasAdminRole(interaction) {
  if (!interaction.inCachedGuild()) return false;
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  return interaction.member.roles.cache.some((role) => adminRoleIds.has(role.id));
}

function profileText(profile) {
  const uniqueCards = profile.cards.filter((card) => card.count > 0).length;
  const totalCards = profile.cards.reduce((sum, card) => sum + card.count, 0);
  return [
    `**${profile.display_name}** // личное дело NE S27`,
    `🎟 Токены: **${profile.tokens}**`,
    `💠 Осколки: **${profile.fragments}**`,
    `🗃 Тайники: **${profile.pack_count}**`,
    `🪪 Карточки: **${uniqueCards} уникальных / ${totalCards} всего**`,
    `👥 Приглашения: **${profile.referrals.verified} подтверждено**, ${profile.referrals.pending} ожидают`,
  ].join("\n");
}

client.once(Events.ClientReady, async (readyClient) => {
  const guild = await readyClient.guilds.fetch(process.env.DISCORD_GUILD_ID);
  await refreshInvites(guild);
  readyClient.user.setActivity("NE S27 // ЗОНА", { type: ActivityType.Watching });
  console.log(`NE S27 bot online as ${readyClient.user.tag}`);
  void backfillNews(readyClient);
  void provisionRequestedInvites();
});

client.on(Events.MessageCreate, (message) => publishNews(message).catch((error) => console.error("News publish failed:", error)));
client.on(Events.MessageUpdate, (_oldMessage, newMessage) => publishNews(newMessage).catch((error) => console.error("News update failed:", error)));
client.on(Events.MessageDelete, (message) => {
  if (!message.guildId || !newsChannelIds.has(message.channelId)) return;
  bridge("news_delete", {messageId:message.id,channelId:message.channelId,guildId:message.guildId,version:Date.now()}).catch((error) => console.error("News deletion failed:", error));
});

client.on(Events.InviteCreate, (invite) => {
  inviteUses.set(invite.code, invite.uses ?? 0);
});

client.on(Events.InviteDelete, (invite) => {
  inviteUses.delete(invite.code);
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const currentInvites = await member.guild.invites.fetch();
    const usedInvite = currentInvites.find(
      (invite) => (invite.uses ?? 0) > (inviteUses.get(invite.code) ?? 0),
    );
    inviteUses = new Map(
      currentInvites.map((invite) => [invite.code, invite.uses ?? 0]),
    );
    await bridge("sync_member", memberIdentity(member));
    if (usedInvite) {
      await bridge("referral_join", {
        joinedDiscordId: member.id,
        username: member.user.username,
        displayName: member.displayName,
        avatarUrl: member.user.displayAvatarURL({ extension: "png", size: 256 }),
        inviteCode: usedInvite.code,
      });
    }
  } catch (error) {
    console.error("GuildMemberAdd processing failed:", error);
  }
});

client.on(Events.GuildMemberUpdate, async (_oldMember, newMember) => {
  try {
    await bridge("sync_member", memberIdentity(newMember));
  } catch (error) {
    console.error("Member sync failed:", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    if (interaction.commandName === "connect") {
      const usedInGuild = interaction.inGuild();
      await interaction.deferReply({ ephemeral: usedInGuild });
      const guild = usedInGuild
        ? interaction.guild
        : await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
      let member;
      try {
        member = await guild.members.fetch(interaction.user.id);
      } catch {
        await interaction.editReply("Команда доступна участникам сервера NE S27. Сначала вступите на сервер.");
        return;
      }
      const result = await bridge("create_link", memberIdentity(member));
      const privateMessage = [
          "🔐 **Безопасное подключение аккаунта NE S27**",
          `Код: **${result.code}**`,
          `Откройте ссылку: ${result.connectUrl}`,
          "Код действует 10 минут и используется один раз. Пароль Discord нигде не вводится.",
        ].join("\n");
      if (!usedInGuild) {
        await interaction.editReply(privateMessage);
        return;
      }
      try {
        await interaction.user.send({content:privateMessage});
        await interaction.editReply("✅ Код и ссылка отправлены тебе в личные сообщения.");
      } catch {
        await interaction.editReply(`${privateMessage}\n\n⚠️ Личные сообщения закрыты, поэтому код показан только здесь.`);
      }
      return;
    }

    if (interaction.commandName === "profile") {
      await interaction.deferReply({ ephemeral: true });
      const result = await bridge("profile", { discordId: interaction.user.id });
      await interaction.editReply(profileText(result.profile));
      return;
    }

    if (interaction.commandName === "collection") {
      await interaction.deferReply({ ephemeral: true });
      const result = await bridge("profile", { discordId: interaction.user.id });
      const owned = result.profile.cards
        .filter((card) => card.count > 0)
        .map((card) => `• ${card.card_slug.toUpperCase()} ×${card.count}`);
      await interaction.editReply(
        owned.length
          ? `**Коллекция NE S27**\n${owned.join("\n")}`
          : "Коллекция пока пуста. Откройте тайник на сайте.",
      );
      return;
    }

    if (interaction.commandName === "invite") {
      if (!interaction.inGuild()) {
        await interaction.reply({ content: "Команда работает только на сервере.", ephemeral: true });
        return;
      }
      await interaction.deferReply({ ephemeral: true });
      const member = await interaction.guild.members.fetch(interaction.user.id);
      await bridge("sync_member", memberIdentity(member));
      const channelId = process.env.INVITE_CHANNEL_ID || interaction.channelId;
      const invite = await ensurePersonalInvite(interaction.guild, member, channelId);
      await interaction.editReply(
        [
          "📡 **Личное приглашение NE S27**",
          invite.inviteUrl,
          "После вступления нового участника начнётся проверка. Боты, повторные входы и самоприглашения награду не дают.",
        ].join("\n"),
      );
      return;
    }

    if (interaction.commandName === "s27-help") {
      await interaction.reply({
        ephemeral: true,
        content: [
          "**Команды NE S27**",
          "/connect — подключить профиль через одноразовый код",
          "/profile — баланс и статистика",
          "/collection — список найденных карточек",
          "/invite — личная ссылка для приглашений",
          "",
          "Бот не читает сообщения, не отслеживает бусты и не просит пароль.",
        ].join("\n"),
      });
      return;
    }

    if (interaction.commandName === "s27-admin") {
      if (!hasAdminRole(interaction)) {
        await interaction.reply({ content: "Недостаточно прав.", ephemeral: true });
        return;
      }
      await interaction.deferReply({ ephemeral: true });
      const subcommand = interaction.options.getSubcommand();
      const target = interaction.options.getUser("user", true);
      if (subcommand === "tokens") {
        const amount = interaction.options.getInteger("amount", true);
        const reason = interaction.options.getString("reason") ?? "";
        const result = await bridge("admin_adjust_tokens", {
          actorDiscordId: interaction.user.id,
          discordId: target.id,
          amount,
          reason,
        });
        await interaction.editReply(
          `Баланс <@${target.id}> обновлён: **${result.profile.tokens} купонов**.`,
        );
      } else {
        await bridge("admin_verify_referral", {
          actorDiscordId: interaction.user.id,
          joinedDiscordId: target.id,
        });
        await interaction.editReply(`Приглашение <@${target.id}> подтверждено.`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Неизвестная ошибка.";
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(`Ошибка: ${message}`).catch(() => {});
    } else {
      await interaction.reply({ content: `Ошибка: ${message}`, ephemeral: true }).catch(() => {});
    }
  }
});

let verifying=false;
setInterval(()=>void provisionRequestedInvites(),5000).unref();
setInterval(async () => {
 if(verifying)return;verifying=true;
 try {
 const guild=await client.guilds.fetch(process.env.DISCORD_GUILD_ID);
 const {pending}=await bridge('pending_referrals');
 for(const row of pending){
  try{const member=await guild.members.fetch({user:row.referred_user_id,force:true});if(!member.user.bot)await bridge('verify_member',{joinedDiscordId:member.id});}
  catch(error){if(error.code===10007)await bridge('referral_leave',{joinedDiscordId:row.referred_user_id});else console.error('Membership check failed');}
 }
 }catch(error){console.error('Referral verification unavailable');}finally{verifying=false;}
},15*60*1000).unref();
client.on('guildMemberRemove',member=>{if(member.guild.id===process.env.DISCORD_GUILD_ID)bridge('referral_leave',{joinedDiscordId:member.id}).catch(()=>{});});

await client.login(process.env.DISCORD_BOT_TOKEN);
