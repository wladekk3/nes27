import { REST, Routes } from "discord.js";
import { commands } from "./commands.mjs";

const required = ["DISCORD_BOT_TOKEN", "DISCORD_CLIENT_ID", "DISCORD_GUILD_ID"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
}

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN);
await rest.put(
  Routes.applicationGuildCommands(
    process.env.DISCORD_CLIENT_ID,
    process.env.DISCORD_GUILD_ID,
  ),
  { body: commands },
);

console.log(`Registered ${commands.length} NE S27 guild commands.`);
