// index.js
import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
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

client.once('ready', async () => {
  console.log(`🤖 已登入：${client.user.tag}`);

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
    if (process.env.TEST_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.TEST_GUILD_ID),
        { body: commands }
      );
      console.log('✅ 測試伺服器 Slash 指令註冊完成！');
    }

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('🌐 全域 Slash 指令註冊完成（可能需要等待幾分鐘～1小時）');

  } catch (error) {
    console.error('❌ 指令註冊失敗：', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const guildId = interaction.guildId;

  switch (interaction.commandName) {
    case 'setvoice': {
      const channel = interaction.options.getChannel('channel');
      if (!channel || channel.type !== 2) {
        return await interaction.reply('❌ 請選擇有效的語音頻道。');
      }
      guildSettings.set(guildId, {
        ...guildSettings.get(guildId),
        voiceChannelId: channel.id
      });
      return await interaction.reply(`✅ 已設定語音頻道為：${channel.name}`);
    }

    case 'setrole': {
      const role = interaction.options.getRole('role');
      guildSettings.set(guildId, {
        ...guildSettings.get(guildId),
        roleId: role.id
      });
      return await interaction.reply(`✅ 已設定自動身分組為：${role.name}`);
    }

    case 'status': {
      const setting = guildSettings.get(guildId);
      if (!setting) {
        return await interaction.reply('⚠️ 尚未設定語音頻道與身分組。');
      }
      return await interaction.reply(`📌 當前設定：\n- 語音頻道 <#${setting.voiceChannelId}>\n- 身分組 <@&${setting.roleId}>`);
    }

    case 'reset': {
      guildSettings.delete(guildId);
      return await interaction.reply('✅ 已清除目前的設定。');
    }

    case 'help': {
      return await interaction.reply(`📝 可用指令列表：

**🔹 Slash 指令：**
/setvoice [語音頻道] - 設定語音頻道  
/setrole [身分組] - 設定自動加上的身分組  
/status - 查看目前的設定狀態  
/reset - 清除設定  
/help - 顯示這份說明  

**🔸 前綴指令（${prefix}）：**
${prefix}setvoice [語音頻道ID]  
${prefix}setrole [身分組ID]  
${prefix}status  
${prefix}reset  
${prefix}help`);
    }
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const guildId = message.guild.id;
  const setting = guildSettings.get(guildId);

  switch (command) {
    case 'setvoice': {
      const channelId = args[0];
      const channel = message.guild.channels.cache.get(channelId);
      if (!channel || channel.type !== 'GUILD_VOICE') {
        return message.reply('❌ 請提供有效的語音頻道 ID。');
      }
      guildSettings.set(guildId, {
        ...setting,
        voiceChannelId: channel.id
      });
      return message.reply(`✅ 已設定語音頻道為：${channel.name}`);
    }

    case 'setrole': {
      const roleId = args[0];
      const role = message.guild.roles.cache.get(roleId);
      if (!role) {
        return message.reply('❌ 請提供有效的身分組 ID。');
      }
      guildSettings.set(guildId, {
        ...setting,
        roleId: role.id
      });
      return message.reply(`✅ 已設定自動加上的身分組為：${role.name}`);
    }

    case 'status': {
      if (!setting) {
        return message.reply('⚠️ 尚未設定語音頻道與身分組。');
      }
      return message.reply(`📌 當前設定：\n- 語音頻道 <#${setting.voiceChannelId}>\n- 身分組 <@&${setting.roleId}>`);
    }

    case 'reset': {
      guildSettings.delete(guildId);
      return message.reply('✅ 已清除目前的設定。');
    }

    case 'help': {
      return message.reply(`📝 可用指令列表：

**🔹 Slash 指令：**
/setvoice [語音頻道] - 設定語音頻道  
/setrole [身分組] - 設定自動加上的身分組  
/status - 查看目前的設定狀態  
/reset - 清除設定  
/help - 顯示這份說明  

**🔸 前綴指令（${prefix}）：**
${prefix}setvoice [語音頻道ID]  
${prefix}setrole [身分組ID]  
${prefix}status  
${prefix}reset  
${prefix}help`);
    }
  }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
  const guildId = newState.guild.id;
  const setting = guildSettings.get(guildId);
  if (!setting) return;

  const member = newState.member;

  if (newState.channelId === setting.voiceChannelId) {
    await member.roles.add(setting.roleId).catch(console.error);
  }

  if (oldState.channelId === setting.voiceChannelId && newState.channelId !== setting.voiceChannelId) {
    await member.roles.remove(setting.roleId).catch(console.error);
  }
});

client.login(process.env.DISCORD_TOKEN);
