import { Client, GatewayIntentBits, Partials, Collection, Events, PermissionsBitField, ChannelType, Routes } from 'discord.js';
import { config } from 'dotenv';
config(); // ⚠️ 這一行是必要的！

import { REST } from '@discordjs/rest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

config();
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const prefix = 'w!';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

const settingsPath = path.join(__dirname, 'settings.json');
const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath)) : {};

const saveSettings = () => fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot 已上線：${client.user.tag}`);
});

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  logger.handleVoiceUpdate(oldState, newState, settings);
});

client.on(Events.MessageDelete, async (message) => {
  logger.handleMessageDelete(message, settings);
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.guild) return;
  if (!message.content.toLowerCase().startsWith(prefix.toLowerCase())) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  const guildId = message.guild.id;
  settings[guildId] ||= {};

  switch (command) {
    case 'setvoice':
      settings[guildId].voiceChannel = args[0];
      saveSettings();
      return message.reply('✅ 語音頻道已設定。');
    case 'setrole':
      settings[guildId].role = args[0];
      saveSettings();
      return message.reply('✅ 身分組已設定。');
    case 'status':
      return message.reply(
        `📌 當前設定：\n語音頻道：<#${settings[guildId].voiceChannel || '未設定'}>\n` +
        `身分組：<@&${settings[guildId].role || '未設定'}>\n` +
        `紀錄頻道：<#${settings[guildId].logChannel || '未設定'}>`
      );
    case 'reset':
      delete settings[guildId];
      saveSettings();
      return message.reply('🧹 已重置本伺服器的設定。');
    case 'help':
      return message.reply(`📝 **可用指令列表**

🔹 Slash 指令（可用 / 開頭輸入）：
• \`/setvoice [語音頻道]\` - 設定語音頻道
• \`/setrole [身分組]\` - 設定自動身分組
• \`/setlogchannel [文字頻道]\` - 記錄傳送頻道
• \`/status\` - 查看目前設定
• \`/reset\` - 重置本伺服器設定
• \`/voicelog\` - 查詢語音進出紀錄
• \`/selfmute\` - 查詢使用者開/關麥
• \`/modmute\` - 查詢被靜音/拒聽紀錄
• \`/deletelog\` - 查詢訊息刪除紀錄

🔸 前綴指令（大小寫不分，預設 \`w!\`）：
• \`w!setvoice [語音頻道ID]\`
• \`w!setrole [身分組ID]\`
• \`w!status\`、\`w!reset\`
• \`w!voicelog\`、\`w!selfmute\`、\`w!modmute\`、\`w!deletelog\``);
    case 'voicelog':
      return logger.sendVoiceLog(message.channel, message.guild.id);
    case 'selfmute':
      return logger.sendSelfMuteLog(message.channel, message.guild.id);
    case 'modmute':
      return logger.sendModMuteLog(message.channel, message.guild.id);
    case 'deletelog':
      return logger.sendDeleteLog(message.channel, message.guild.id);
  }
});

const commands = [
  {
    name: 'setvoice',
    description: '設定語音監控頻道',
    options: [{ name: 'channel', description: '語音頻道', type: 7, required: true }]
  },
  {
    name: 'setrole',
    description: '設定自動身分組',
    options: [{ name: 'role', description: '身分組', type: 8, required: true }]
  },
  {
    name: 'setlogchannel',
    description: '設定紀錄發送頻道',
    options: [{ name: 'channel', description: '文字頻道', type: 7, required: true }]
  },
  { name: 'status', description: '查看目前設定' },
  { name: 'reset', description: '重置本伺服器設定' },
  { name: 'help', description: '顯示指令列表' },
  { name: 'voicelog', description: '查詢語音進出紀錄' },
  { name: 'selfmute', description: '查詢使用者開關麥紀錄' },
  { name: 'modmute', description: '查詢被靜音/拒聽紀錄' },
  { name: 'deletelog', description: '查詢訊息與圖片刪除紀錄' },
];

const rest = new REST({ version: '10' }).setToken(token);

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guildId, channel, reply } = interaction;
  settings[guildId] ||= {};

  switch (commandName) {
    case 'setvoice':
      settings[guildId].voiceChannel = options.getChannel('channel').id;
      saveSettings();
      return reply('✅ 語音頻道已設定。');
    case 'setrole':
      settings[guildId].role = options.getRole('role').id;
      saveSettings();
      return reply('✅ 身分組已設定。');
    case 'setlogchannel':
      settings[guildId].logChannel = options.getChannel('channel').id;
      saveSettings();
      return reply('✅ 紀錄頻道已設定。');
    case 'status':
      return reply(
        `📌 當前設定：\n語音頻道：<#${settings[guildId].voiceChannel || '未設定'}>\n` +
        `身分組：<@&${settings[guildId].role || '未設定'}>\n` +
        `紀錄頻道：<#${settings[guildId].logChannel || '未設定'}>`
      );
    case 'reset':
      delete settings[guildId];
      saveSettings();
      return reply('🧹 已重置本伺服器的設定。');
    case 'help':
      return reply(`📝 **可用指令列表**

🔹 Slash 指令（可用 / 開頭輸入）：
• \`/setvoice [語音頻道]\` - 設定語音頻道
• \`/setrole [身分組]\` - 設定自動身分組
• \`/setlogchannel [文字頻道]\` - 記錄傳送頻道
• \`/status\` - 查看目前設定
• \`/reset\` - 重置本伺服器設定
• \`/voicelog\` - 查詢語音進出紀錄
• \`/selfmute\` - 查詢使用者開/關麥
• \`/modmute\` - 查詢被靜音/拒聽紀錄
• \`/deletelog\` - 查詢訊息刪除紀錄`);
    case 'voicelog':
      return logger.sendVoiceLog(channel, guildId);
    case 'selfmute':
      return logger.sendSelfMuteLog(channel, guildId);
    case 'modmute':
      return logger.sendModMuteLog(channel, guildId);
    case 'deletelog':
      return logger.sendDeleteLog(channel, guildId);
  }
});

(async () => {
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✅ Slash 指令已註冊');
    client.login(token);
  } catch (error) {
    console.error('❌ 指令註冊失敗', error);
  }
})();
