// ✅ 載入環境變數與必要模組
import { config } from 'dotenv';
config(); // ⚠️ 一定要放在最上面
import { Client, GatewayIntentBits, Partials, Collection, Events, PermissionsBitField, ChannelType, Routes } from 'discord.js';
import { REST } from '@discordjs/rest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

// ✅ 初始化設定與 Discord Bot 基本資訊
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const prefix = 'w!';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// ✅ 載入與儲存伺服器設定
const settingsPath = path.join(__dirname, 'settings.json');
const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath)) : {};
const saveSettings = () => fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

// ✅ Bot 啟動後顯示提示訊息
client.once(Events.ClientReady, () => {
  console.log(`✅ Bot 已上線：${client.user.tag}`);
});

// ✅ 處理語音狀態更新（加入/離開、靜音等）
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  logger.handleVoiceUpdate(oldState, newState, settings);
});

// ✅ 處理訊息刪除事件（包含圖片）
client.on(Events.MessageDelete, async (message) => {
  logger.handleMessageDelete(message, settings);
});

// ✅ 前綴指令邏輯區塊（w! 開頭）
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
        `語音紀錄頻道：<#${settings[guildId].voiceLogChannel || settings[guildId].logChannel || '未設定'}>\n` +
        `訊息紀錄頻道：<#${settings[guildId].messageLogChannel || settings[guildId].logChannel || '未設定'}>`
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
• \`/setlogchannel [文字頻道]\` - 同時設定語音與訊息紀錄
• \`/setvoicelogchannel [頻道]\` - 單獨設定語音紀錄頻道
• \`/setmessagelogchannel [頻道]\` - 單獨設定訊息紀錄頻道
• \`/status\` - 查看目前設定
• \`/reset\` - 重置本伺服器設定

🔸 前綴指令（大小寫不分，預設 \`w!\`）：
• \`w!setvoice [語音頻道ID]\`
• \`w!setrole [身分組ID]\`
• \`w!status\`、\`w!reset\``);
  }
});

// ✅ Slash 指令註冊與處理邏輯
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
    description: '設定通用紀錄頻道',
    options: [{ name: 'channel', description: '文字頻道', type: 7, required: true }]
  },
  {
    name: 'setvoicelogchannel',
    description: '設定語音紀錄頻道',
    options: [{ name: 'channel', description: '語音紀錄的頻道', type: 7, required: true }]
  },
  {
    name: 'setmessagelogchannel',
    description: '設定訊息刪除紀錄頻道',
    options: [{ name: 'channel', description: '訊息紀錄的頻道', type: 7, required: true }]
  },
  { name: 'status', description: '查看目前設定' },
  { name: 'reset', description: '重置本伺服器設定' },
  { name: 'help', description: '顯示指令列表' }
];

// ✅ 處理 Slash 指令互動事件
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guildId } = interaction;
  settings[guildId] ||= {};

  try {
    switch (commandName) {
      case 'setvoice':
        settings[guildId].voiceChannel = options.getChannel('channel').id;
        saveSettings();
        return await interaction.reply('✅ 語音頻道已設定。');
      case 'setrole':
        settings[guildId].role = options.getRole('role').id;
        saveSettings();
        return await interaction.reply('✅ 身分組已設定。');
      case 'setlogchannel':
        const commonLogChannel = options.getChannel('channel').id;
        settings[guildId].logChannel = commonLogChannel;
        settings[guildId].voiceLogChannel = commonLogChannel;
        settings[guildId].messageLogChannel = commonLogChannel;
        saveSettings();
        return await interaction.reply('✅ 通用紀錄頻道已設定（語音 + 訊息）');
      case 'setvoicelogchannel':
        settings[guildId].voiceLogChannel = options.getChannel('channel').id;
        saveSettings();
        return await interaction.reply('✅ 語音紀錄頻道已設定。');
      case 'setmessagelogchannel':
        settings[guildId].messageLogChannel = options.getChannel('channel').id;
        saveSettings();
        return await interaction.reply('✅ 訊息紀錄頻道已設定。');
      case 'status':
        return await interaction.reply(
          `📌 當前設定：\n語音頻道：<#${settings[guildId].voiceChannel || '未設定'}>\n` +
          `身分組：<@&${settings[guildId].role || '未設定'}>\n` +
          `語音紀錄頻道：<#${settings[guildId].voiceLogChannel || settings[guildId].logChannel || '未設定'}>\n` +
          `訊息紀錄頻道：<#${settings[guildId].messageLogChannel || settings[guildId].logChannel || '未設定'}>`
        );
      case 'reset':
        delete settings[guildId];
        saveSettings();
        return await interaction.reply('🧹 已重置本伺服器的設定。');
      case 'help':
        return await interaction.reply('📖 請使用 `/help` 或 `w!help` 查看完整指令列表');
    }
  } catch (err) {
    console.error(`❌ 執行指令時發生錯誤：`, err);
    if (!interaction.replied) {
      await interaction.reply({ content: '❌ 執行指令時發生錯誤。', ephemeral: true });
    }
  }
});


const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
// ✅ 註冊 Slash 指令並啟動 Bot
(async () => {
  try {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('✅ Slash 指令已註冊');
    client.login(token);
  } catch (error) {
    console.error('❌ 指令註冊失敗', error);
  }
})();
