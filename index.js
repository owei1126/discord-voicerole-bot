// =============================
// 🔧 模組引入與初始化
// =============================
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import * as logger from './logger.js';


dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const guildSettings = new Map();
const prefix = 'w!';

// =============================
// 🟢 Bot 啟動與 Slash 指令註冊
// =============================
client.once('ready', async () => {
  console.log(`🤖 已登入：${client.user.tag}`);

  const commands = [
    // 管理用指令
    {
      name: 'setvoice',
      description: '設定指定語音頻道',
      options: [{
        name: 'channel',
        type: 7, // CHANNEL
        description: '語音頻道',
        required: true
      }]
    },
    {
      name: 'setrole',
      description: '設定自動加上的身分組',
      options: [{
        name: 'role',
        type: 8, // ROLE
        description: '要加上的身分組',
        required: true
      }]
    },
    { name: 'status', description: '查看目前的設定狀態' },
    { name: 'reset', description: '清除目前的設定' },
    { name: 'help', description: '查看可用指令' },

    // 📋 日誌相關 Slash 指令
    ...loggerSlashCommands.map(cmd => cmd.data.toJSON())
  ];
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    // 測試伺服器指令註冊（若有）
    if (process.env.TEST_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.TEST_GUILD_ID),
        { body: commands }
      );
      console.log('✅ 測試伺服器 Slash 指令註冊完成！');
    }

    // 全域 Slash 指令註冊
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('🌐 全域 Slash 指令註冊完成');
  } catch (error) {
    console.error('❌ 指令註冊失敗：', error);
  }
});

// =============================
// 💬 Slash 指令邏輯處理
// =============================
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, guildId } = interaction;
  const setting = guildSettings.get(guildId);

  switch (commandName) {
    // 🔧 語音與身分組設定
    case 'setvoice':
    case 'setrole':
    case 'status':
    case 'reset': {
      return handleConfigCommands(interaction, commandName, setting, guildSettings);
    }

    // 📖 help 說明
    case 'help': {
      return interaction.reply(getHelpText());
    }

    // 📋 日誌查詢指令
    case 'voicelog':
    case 'selfmute':
    case 'modmute':
    case 'deletelog': {
      const result = handleLoggerCommand(commandName, guildId);
      return interaction.reply(result || '⚠️ 沒有紀錄。');
    }
  }
});

// =============================
// ⌨️ 前綴指令邏輯處理
// =============================
client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.toLowerCase().startsWith(prefix.toLowerCase())) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const guildId = message.guild.id;
  const setting = guildSettings.get(guildId);

  switch (command) {
    // 🔧 語音與身分組設定
    case 'setvoice':
    case 'setrole':
    case 'status':
    case 'reset': {
      return handlePrefixConfigCommands(message, command, args, setting, guildSettings);
    }

    // 📖 help 說明
    case 'help': {
      return message.reply(getHelpText());
    }

    // 📋 日誌查詢指令
    case 'voicelog':
    case 'selfmute':
    case 'modmute':
    case 'deletelog': {
      const result = handleLoggerCommand(command, guildId);
      return message.reply(result || '⚠️ 沒有紀錄。');
    }
  }
});

// =============================
// 🔄 語音與訊息刪除事件監聽
// =============================
client.on('voiceStateUpdate', (oldState, newState) => {
  logger.handleVoiceStateUpdate(oldState, newState, guildSettings);
});
client.on('messageDelete', (message) => {
  logger.handleMessageDelete(message, guildSettings);
});

// =============================
// 🚪 登入機器人
// =============================
client.login(process.env.DISCORD_TOKEN);

// =============================
// 🧩 共用方法區塊
// =============================

function getHelpText() {
  return `📝 可用指令列表：

**🔹 Slash 指令：**
/setvoice [語音頻道]        → 設定語音頻道。  
/setrole [身分組]            → 設定進語音時自動加上的身分組。  
/setlogchannel [文字頻道]    → 設定紀錄頻道，所有語音與刪除事件都會自動發送紀錄。  
/status                     → 查看目前語音與身分組設定狀態。  
/reset                      → 清除目前的語音與身分組設定。  
/help                       → 顯示此幫助指令清單與說明。  
/voicelog                   → 查詢最近的語音進出紀錄。  
/selfmute                   → 查詢使用者開/關麥克風紀錄。  
/modmute                    → 查詢被管理員靜音/拒聽的紀錄。  
/deletelog                  → 查詢訊息與圖片刪除紀錄。

**🔸 前綴指令（${prefix}）：**
${prefix}setvoice [語音頻道ID]   → 設定語音頻道。  
${prefix}setrole [身分組ID]       → 設定進語音時自動加上的身分組。  
${prefix}status                  → 查看目前設定狀態。  
${prefix}reset                   → 清除目前的語音與身分組設定。  
${prefix}help                    → 顯示此幫助指令清單與說明。  
${prefix}voicelog                → 查詢最近的語音進出紀錄。  
${prefix}selfmute                → 查詢使用者開/關麥克風紀錄。  
${prefix}modmute                 → 查詢被管理員靜音/拒聽的紀錄。  
${prefix}deletelog               → 查詢訊息與圖片刪除紀錄。`;
}

/*
==========================
📘 Help 指令說明對照表
==========================
/setvoice     → 用於設定指定語音頻道。  
/setrole      → 設定當有人進語音頻道時，自動加上的身分組。  
/status       → 查看目前設定的語音頻道與身分組。  
/reset        → 清除目前的設定（語音頻道與身分組）。  
/help         → 顯示可用的指令清單與說明。  
/voicelog     → 查詢最近的語音進出記錄。  
/selfmute     → 查詢使用者是否有自己靜音或解除靜音的紀錄。  
/modmute      → 查詢是否被管理員靜音或拒聽的紀錄。  
/deletelog    → 查詢伺服器中訊息刪除與圖片刪除的紀錄。
*/

// 🔧 Slash 指令處理函數
async function handleConfigCommands(interaction, command, setting, guildSettings) {
  const guildId = interaction.guildId;

  switch (command) {
    case 'setvoice': {
      const channel = interaction.options.getChannel('channel');
      if (!channel || channel.type !== 2)
        return interaction.reply('❌ 請選擇有效的語音頻道。');
      guildSettings.set(guildId, { ...setting, voiceChannelId: channel.id });
      return interaction.reply(`✅ 已設定語音頻道為：${channel.name}`);
    }

    case 'setrole': {
      const role = interaction.options.getRole('role');
      guildSettings.set(guildId, { ...setting, roleId: role.id });
      return interaction.reply(`✅ 已設定自動身分組為：${role.name}`);
    }

    case 'status': {
      if (!setting)
        return interaction.reply('⚠️ 尚未設定語音頻道與身分組。');
      return interaction.reply(`📌 當前設定：\n- 語音頻道 <#${setting.voiceChannelId}>\n- 身分組 <@&${setting.roleId}>`);
    }

    case 'reset': {
      guildSettings.delete(guildId);
      return interaction.reply('✅ 已清除目前的設定。');
    }
  }
}

// 🔧 前綴指令處理函數
async function handlePrefixConfigCommands(message, command, args, setting, guildSettings) {
  const guild = message.guild;
  const guildId = guild.id;

  switch (command) {
    case 'setvoice': {
      const channelId = args[0];
      const channel = guild.channels.cache.get(channelId);
      if (!channel || channel.type !== 2)
        return message.reply('❌ 請提供有效的語音頻道 ID。');
      guildSettings.set(guildId, { ...setting, voiceChannelId: channel.id });
      return message.reply(`✅ 已設定語音頻道為：${channel.name}`);
    }

    case 'setrole': {
      const roleId = args[0];
      const role = guild.roles.cache.get(roleId);
      if (!role)
        return message.reply('❌ 請提供有效的身分組 ID。');
      guildSettings.set(guildId, { ...setting, roleId: role.id });
      return message.reply(`✅ 已設定自動加上的身分組為：${role.name}`);
    }

    case 'status': {
      if (!setting)
        return message.reply('⚠️ 尚未設定語音頻道與身分組。');
      return message.reply(`📌 當前設定：\n- 語音頻道 <#${setting.voiceChannelId}>\n- 身分組 <@&${setting.roleId}>`);
    }

    case 'reset': {
      guildSettings.delete(guildId);
      return message.reply('✅ 已清除目前的設定。');
    }
  }
}
