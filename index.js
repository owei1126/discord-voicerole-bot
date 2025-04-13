import { Client, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

// 初始化 Discord 客戶端
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildVoiceStates],
  partials: [Partials.Channel],
});

let voiceChannelID = null;
let roleID = null;

client.once('ready', () => {
  console.log('機器人已成功啟動！');
});

// 前綴指令處理
client.on('messageCreate', async (message) => {
  if (message.author.bot) return; // 防止機器人回應自己

  const args = message.content.slice(2).split(/ +/);
  const command = args.shift().toLowerCase();

  // 設定語音頻道
  if (command === 'setvoice') {
    if (!args.length) return message.reply('請提供有效的語音頻道 ID。');
    voiceChannelID = args[0];
    message.reply(`成功設定語音頻道為 ID: ${voiceChannelID}`);
  }

  // 設定身分組
  if (command === 'setrole') {
    if (!args.length) return message.reply('請提供有效的身分組 ID。');
    roleID = args[0];
    message.reply(`成功設定身分組為 ID: ${roleID}`);
  }

  // 查看目前設定
  if (command === 'status') {
    if (!voiceChannelID || !roleID) return message.reply('尚未設定語音頻道或身分組。');
    message.reply(`目前的語音頻道 ID: ${voiceChannelID}，身分組 ID: ${roleID}`);
  }

  // 重設設定
  if (command === 'reset') {
    voiceChannelID = null;
    roleID = null;
    message.reply('已清除目前的設定。');
  }

  // 顯示幫助
  if (command === 'help') {
    message.reply(`
      **可用指令：**
      **前綴指令：**
      w!setvoice [頻道ID] - 設定語音頻道
      w!setrole [身分組ID] - 設定自動加上的身分組
      w!status - 查看目前的設定狀態
      w!reset - 清除目前的設定
      w!help - 查看可用指令
      
      **Slash 指令：**
      /setvoice [語音頻道] - 設定語音頻道
      /setrole [身分組] - 設定自動加上的身分組
      /status - 查看目前的設定狀態
      /reset - 清除目前的設定
      /help - 查看可用指令
    `);
  }
});

// Slash 指令處理
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  // 設定語音頻道
  if (commandName === 'setvoice') {
    const channel = interaction.options.getChannel('channel');
    if (channel.type !== 'GUILD_VOICE') {
      return interaction.reply('請提供有效的語音頻道。');
    }
    voiceChannelID = channel.id;
    return interaction.reply(`成功設定語音頻道為 ID: ${voiceChannelID}`);
  }

  // 設定身分組
  if (commandName === 'setrole') {
    const role = interaction.options.getRole('role');
    roleID = role.id;
    return interaction.reply(`成功設定身分組為 ID: ${roleID}`);
  }

  // 查看目前設定
  if (commandName === 'status') {
    if (!voiceChannelID || !roleID) return interaction.reply('尚未設定語音頻道或身分組。');
    return interaction.reply(`目前的語音頻道 ID: ${voiceChannelID}，身分組 ID: ${roleID}`);
  }

  // 重設設定
  if (commandName === 'reset') {
    voiceChannelID = null;
    roleID = null;
    return interaction.reply('已清除目前的設定。');
  }

  // 顯示幫助
  if (commandName === 'help') {
    return interaction.reply(`
      **可用指令：**
      **前綴指令：**
      w!setvoice [頻道ID] - 設定語音頻道
      w!setrole [身分組ID] - 設定自動加上的身分組
      w!status - 查看目前的設定狀態
      w!reset - 清除目前的設定
      w!help - 查看可用指令
      
      **Slash 指令：**
      /setvoice [語音頻道] - 設定語音頻道
      /setrole [身分組] - 設定自動加上的身分組
      /status - 查看目前的設定狀態
      /reset - 清除目前的設定
      /help - 查看可用指令
    `);
  }
});

// 登入 Discord
client.login(process.env.DISCORD_TOKEN);
