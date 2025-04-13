import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config } from 'dotenv';
import fs from 'fs';

config(); // 設定 dotenv 來讀取 .env 檔案

// 每個伺服器的設定
const guildSettings = new Map();

// 設定前綴
const prefix = 'w!';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages, // 收到文字訊息（必要）
    GatewayIntentBits.MessageContent // 能讀文字內容（必要）
  ]
});

// 當機器人啟動時
client.once('ready', async () => {
  console.log(`🤖 已登入：${client.user.tag}`);

  // 註冊 Slash 指令
  const commands = [
    new SlashCommandBuilder()
      .setName('setvoice')
      .setDescription('設定指定語音頻道')
      .addChannelOption(option =>
        option.setName('channel').setDescription('語音頻道').setRequired(true)),
    new SlashCommandBuilder()
      .setName('setrole')
      .setDescription('設定自動加上的身分組')
      .addRoleOption(option =>
        option.setName('role').setDescription('要加上的身分組').setRequired(true)),
    new SlashCommandBuilder()
      .setName('status')
      .setDescription('查看目前的設定狀態'),
    new SlashCommandBuilder()
      .setName('reset')
      .setDescription('清除目前的設定'),
    new SlashCommandBuilder()
      .setName('help')
      .setDescription('查看可用指令')
  ].map(command => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    // 測試伺服器註冊（立即生效）
    if (process.env.TEST_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.TEST_GUILD_ID),
        { body: commands }
      );
      console.log('✅ 測試伺服器 Slash 指令註冊完成！');
    }

    // 全域註冊（部署到正式環境時用）
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('🌐 全域 Slash 指令註冊完成（可能需要等待幾分鐘～1小時）');
  } catch (error) {
    console.error('❌ 指令註冊失敗：', error);
  }
});

// 處理 Slash 指令
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const guildId = interaction.guildId;

  if (interaction.commandName === 'setvoice') {
    const channel = interaction.options.getChannel('channel');
    if (!channel || channel.type !== 2) { // type: 2 = voice
      return await interaction.reply('❌ 請選擇有效的語音頻道。');
    }
    guildSettings.set(guildId, {
      ...guildSettings.get(guildId),
      voiceChannelId: channel.id
    });
    await interaction.reply(`✅ 已設定語音頻道為：${channel.name}`);
  }

  if (interaction.commandName === 'setrole') {
    const role = interaction.options.getRole('role');
    guildSettings.set(guildId, {
      ...guildSettings.get(guildId),
      roleId: role.id
    });
    await interaction.reply(`✅ 已設定自動身分組為：${role.name}`);
  }

  if (interaction.commandName === 'status') {
    const setting = guildSettings.get(guildId);
    if (!setting) {
      return await interaction.reply('⚠️ 尚未設定語音頻道與身分組。');
    }
    await interaction.reply(`📌 當前設定：\n- 語音頻道 <#${setting.voiceChannelId}>\n- 身分組 <@&${setting.roleId}>`);
  }

  if (interaction.commandName === 'reset') {
    guildSettings.delete(guildId);
    await interaction.reply('✅ 已清除目前的設定。');
  }

  if (interaction.commandName === 'help') {
    await interaction.reply(`
      📝 可用指令：
      /setvoice [語音頻道] - 設定語音頻道
      /setrole [身分組] - 設定自動加上的身分組
      /status - 查看目前的設定狀態
      /reset - 清除目前的設定
      /help - 查看可用指令
    `);
  }
});

// 處理訊息前綴指令
client.on('messageCreate', async message => {
  if (message.author.bot) return; // 忽略機器人訊息
  if (!message.content.toLowerCase().startsWith(prefix.toLowerCase())) return; // 忽略不符合前綴的訊息

  const args = message.content.slice(prefix.length).trim().split(/ +/); // 取得指令和參數
  const command = args.shift().toLowerCase(); // 指令名稱

  const guildId = message.guild.id;
  const setting = guildSettings.get(guildId);

  // 前綴指令處理
  if (command === 'setvoice') {
    const channelId = args[0];
    const channel = message.guild.channels.cache.get(channelId);
    if (!channel || channel.type !== 'GUILD_VOICE') {
      return message.reply('❌ 請提供有效的語音頻道 ID。');
    }
    guildSettings.set(guildId, {
      ...setting,
      voiceChannelId: channel.id
    });
    message.reply(`✅ 已設定語音頻道為：${channel.name}`);
  }

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

  if (command === 'status') {
    if (!setting) {
      return message.reply('⚠️ 尚未設定語音頻道與身分組。');
    }
    message.reply(`📌 當前設定：\n- 語音頻道 <#${setting.voiceChannelId}>\n- 身分組 <@&${setting.roleId}>`);
  }

  if (command === 'reset') {
    guildSettings.delete(guildId);
    message.reply('✅ 已清除目前的設定。');
  }

  if (command === 'help') {
    message.reply(`
      📝 可用指令：
      w!setvoice [頻道ID] - 設定語音頻道
      w!setrole [身分組ID] - 設定自動加上的身分組
      w!status - 查看目前的設定狀態
      w!reset - 清除目前的設定
      w!help - 查看可用指令
    `);
  }
});

// 語音狀態變更事件
client.on('voiceStateUpdate', async (oldState, newState) => {
  const guildId = newState.guild.id;
  const setting = guildSettings.get(guildId);
  if (!setting) return;

  const member = newState.member;

  // 加入指定語音頻道 ➜ 加上身分組
  if (newState.channelId === setting.voiceChannelId) {
    await member.roles.add(setting.roleId).catch(console.error);
  }

  // 離開指定語音頻道 ➜ 移除身分組
  if (oldState.channelId === setting.voiceChannelId && newState.channelId !== setting.voiceChannelId) {
    await member.roles.remove(setting.roleId).catch(console.error);
  }
});

client.login(process.env.DISCORD_TOKEN);
