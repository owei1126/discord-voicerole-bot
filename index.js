// 引入需要的模組
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

// 設定前綴
const prefix = 'w!';

// 初始化 client
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// 設定儲存 Guild 配置的資料結構
const guildSettings = new Map();

// 機器人準備好時觸發
client.once('ready', () => {
  console.log(`🤖 已登入：${client.user.tag}`);
});

// 處理訊息前綴指令
client.on('messageCreate', async message => {
  if (message.author.bot) return; // 忽略機器人訊息
  if (!message.content.startsWith(prefix)) return; // 忽略不符合前綴的訊息

  const args = message.content.slice(prefix.length).trim().split(/ +/); // 取得指令和參數
  const command = args.shift().toLowerCase(); // 指令名稱

  const guildId = message.guild.id;
  let setting = guildSettings.get(guildId) || {};

  // /help 指令
  if (command === 'help') {
    const helpMessage = `
    **可用指令：**
    - \`w!help\`：查看可用指令
    - \`w!setvoice <語音頻道ID>\`：設定語音頻道
    - \`w!setrole <身分組ID>\`：設定自動加上的身分組
    - \`w!reset\`：重設所有設定
    **前綴：** \`w!\`（大小寫不敏感）
    `;
    return message.reply(helpMessage);
  }

  // /reset 指令
  if (command === 'reset') {
    guildSettings.delete(guildId);
    return message.reply('✅ 已重設所有設定。');
  }

  // 設定語音頻道指令
  if (command === 'setvoice') {
    const channelId = args[0]; // 頻道ID應該是args[0]（字符串形式）
    const channel = message.guild.channels.cache.get(channelId); // 直接根據ID抓取頻道

    if (!channel || channel.type !== 'GUILD_VOICE') {
      return message.reply('❌ 請提供有效的語音頻道 ID。');
    }

    guildSettings.set(guildId, {
      ...setting,
      voiceChannelId: channel.id
    });

    message.reply(`✅ 已設定語音頻道為：${channel.name}`);
  }

  // 設定身分組指令
  if (command === 'setrole') {
    const roleId = args[0];
    const role = message.guild.roles.cache.get(roleId);
    if (!role) {
      return message.reply('❌ 請提供有效的身分組 ID。');
    }
    guildSettings.set(guildId, {
      ...setting,
      roleId: role.id
    });
    message.reply(`✅ 已設定自動加上的身分組為：${role.name}`);
  }
});

// 登入 Discord
client.login(process.env.DISCORD_TOKEN);
