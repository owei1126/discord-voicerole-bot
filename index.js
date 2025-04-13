require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Events, Collection, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel]
});

const PREFIX = 'w!';
const commands = new Collection();
const settings = new Map(); // guildId -> { voiceChannelId, roleId }

// ========== Slash 指令 ==========
const slashCommands = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('查看可用指令'),
  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('清除目前的設定')
].map(command => command.toJSON());

client.once(Events.ClientReady, async () => {
  console.log(`🤖 已登入：${client.user.tag}`);

  // Slash 指令註冊（TEST GUILD 與全域）
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    if (process.env.TEST_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.TEST_GUILD_ID),
        { body: slashCommands }
      );
      console.log('✅ 測試伺服器 Slash 指令註冊完成！');
    }

    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: slashCommands }
    );
    console.log('🌐 全域 Slash 指令註冊完成（可能需要等待幾分鐘～1小時）');
  } catch (err) {
    console.error('❌ Slash 指令註冊失敗：', err);
  }
});

// ========== 前綴指令處理 ==========
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content.toLowerCase().startsWith(PREFIX.toLowerCase())) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (command === 'help') {
    message.reply(
      `📘 **可用指令**：\n` +
      `🔹 \`w!setvoice <語音頻道ID>\` - 設定語音頻道\n` +
      `🔹 \`w!setrole <身分組ID>\` - 設定要自動套用的身分組\n` +
      `🔹 \`w!reset\` - 清除目前設定\n` +
      `🆘 Slash 指令也支援：\`/help\`、\`/reset\`\n` +
      `📌 前綴指令大小寫皆可（例如 \`W!HELP\` 也可以）`
    );
  } else if (command === 'reset') {
    settings.delete(message.guild.id);
    message.reply('✅ 設定已清除！');
  } else if (command === 'setvoice') {
    const channelId = args[0];
    const channel = message.guild.channels.cache.get(channelId);
    if (!channel || channel.type !== 2) {
      return message.reply('❌ 請提供有效的語音頻道 ID。');
    }

    const current = settings.get(message.guild.id) || {};
    settings.set(message.guild.id, { ...current, voiceChannelId: channelId });
    message.reply(`✅ 已設定語音頻道：<#${channelId}>`);
  } else if (command === 'setrole') {
    const roleId = args[0];
    const role = message.guild.roles.cache.get(roleId);
    if (!role) return message.reply('❌ 請提供有效的身分組 ID。');

    const current = settings.get(message.guild.id) || {};
    settings.set(message.guild.id, { ...current, roleId });
    message.reply(`✅ 已設定身分組：<@&${roleId}>`);
  }
});

// ========== Slash 指令處理 ==========
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const guildId = interaction.guildId;

  if (interaction.commandName === 'help') {
    await interaction.reply({
      content:
        `📘 **可用指令**：\n` +
        `🔹 \`w!setvoice <語音頻道ID>\` - 設定語音頻道\n` +
        `🔹 \`w!setrole <身分組ID>\` - 設定要自動套用的身分組\n` +
        `🔹 \`w!reset\` - 清除目前設定\n` +
        `🆘 Slash 指令也支援：\`/help\`、\`/reset\`\n` +
        `📌 前綴指令大小寫皆可（例如 \`W!HELP\` 也可以）`,
      ephemeral: true
    });
  }

  if (interaction.commandName === 'reset') {
    settings.delete(guildId);
    await interaction.reply({ content: '✅ 設定已清除！', ephemeral: true });
  }
});

// ========== 語音狀態變更處理 ==========
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  const setting = settings.get(newState.guild.id);
  if (!setting) return;

  const member = newState.member;
  const joinedTarget = newState.channelId === setting.voiceChannelId;
  const leftTarget = oldState.channelId === setting.voiceChannelId && newState.channelId !== setting.voiceChannelId;

  if (joinedTarget) {
    member.roles.add(setting.roleId).catch(console.error);
  } else if (leftTarget) {
    member.roles.remove(setting.roleId).catch(console.error);
  }
});

client.login(process.env.DISCORD_TOKEN);
