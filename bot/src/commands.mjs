import {
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

export const commands = [
  new SlashCommandBuilder()
    .setName("connect")
    .setDescription("Securely connect Discord to your NE S27 profile"),
  new SlashCommandBuilder()
    .setName("подключить")
    .setDescription("Безопасно подключить Discord к профилю NE S27"),
  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Показать баланс, карточки и приглашения"),
  new SlashCommandBuilder()
    .setName("collection")
    .setDescription("Показать краткую сводку коллекции"),
  new SlashCommandBuilder()
    .setName("invite")
    .setDescription("Получить постоянное личное приглашение"),
  new SlashCommandBuilder()
    .setName("s27-help")
    .setDescription("Показать команды и правила системы"),
  new SlashCommandBuilder()
    .setName("s27-admin")
    .setDescription("Администрирование экономики NE S27")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("tokens")
        .setDescription("Изменить баланс токенов участника")
        .addUserOption((option) =>
          option.setName("user").setDescription("Участник").setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("От -1000 до 1000, кроме нуля")
            .setMinValue(-1000)
            .setMaxValue(1000)
            .setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("reason").setDescription("Причина для журнала"),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("verify")
        .setDescription("Досрочно подтвердить приглашённого участника")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("Приглашённый участник")
            .setRequired(true),
        ),
    ),
].map((command) => command.toJSON());
