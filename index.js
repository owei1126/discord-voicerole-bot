import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, REST, Routes, Events, SlashCommandBuilder } from 'discord.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

const prefix = 'w!';
const commands = [
  new SlashCommandBuilder().setName('help').setDescription('查看可用指令'),
  new SlashCommandBuilder().setName('reset').setDescription('清除目前的設定'),
];
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once(Events.ClientReady, async () => {
  console.log(`🤖 已登入：${client.user.tag}`);

  try {
    if (process.env.TEST_GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.TEST_GUILD_ID), { body: commands });
      console.log('✅ 測試伺服器 Slash 指令註冊完成！');
    }

    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('🌐 全域 Slash 指令註冊完成（可能需要等待幾分鐘～1小時）');
  } catch (error) {
    console.error('❌ 註冊 Slash 指令時發生錯誤：', error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'help') {
    await interaction.reply({
      content: `🛠️ 可用指令如下：\n\n` +
        `**Slash 指令：**\n` +
        `• \`/help\`：查看可用指令\n` +
        `• \`/reset\`：清除目前的設定\n\n` +
        `**前綴指令（大小寫皆可）：**\n` +
        `• \`${prefix}help\`\n` +
        `• \`${prefix}reset\``,
      ephemeral: true,
    });
  }

  if (commandName === 'reset') {
    // 這裡放你要清除的資料，例如從資料庫清空設定
    await interaction.reply('✅ 已清除目前的設定！');
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim();
  if (!content.toLowerCase().startsWith(prefix.toLowerCase())) return;

  const args = content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'help') {
    message.reply(
      `🛠️ 可用指令如下：\n\n` +
      `**Slash 指令：**\n` +
      `• \`/help\`：查看可用指令\n` +
      `• \`/reset\`：清除目前的設定\n\n` +
      `**前綴指令（大小寫皆可）：**\n` +
      `• \`${prefix}help\`\n` +
      `• \`${prefix}reset\``
    );
  }

  if (command === 'reset') {
    // 這裡放你要清除的資料，例如從資料庫清空設定
    message.reply('✅ 已清除目前的設定！');
  }

  if (command === 'setvoice') {
    const channelId = args[0];
    const channel = message.guild.channels.cache.get(channelId);
    if (!channel || channel.type !== 2) {
      return message.reply('❌ 請提供有效的語音頻道 ID。');
    }
    // 這裡記錄設定
    message.reply(`✅ 已設定語音頻道為 <#${channelId}>`);
  }
});

client.login(process.env.DISCORD_TOKEN);
