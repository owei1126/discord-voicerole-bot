require('dotenv').config();
const { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const testGuildId = process.env.TEST_GUILD_ID;
const prefix = 'w!'; // 指令前綴

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

const settingsPath = './settings.json';
let settings = {};
if (fs.existsSync(settingsPath)) {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
}

// Slash 指令註冊
const commands = [
  new SlashCommandBuilder().setName('help').setDescription('查看可用指令'),
  new SlashCommandBuilder().setName('reset').setDescription('清除目前所有語音頻道身分組設定'),
  new SlashCommandBuilder().setName('cute').setDescription('給你一點可愛的能量 ✨'),
].map(cmd => cmd.toJSON());

client.once('ready', async () => {
  console.log(`🤖 已登入：${client.user.tag}`);

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    // 測試伺服器
    if (testGuildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, testGuildId), { body: commands });
      console.log('✅ 測試伺服器 Slash 指令註冊完成！');
    }

    // 全域指令
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('🌐 全域 Slash 指令註冊完成（可能需要等待幾分鐘～1小時）');
  } catch (error) {
    console.error('❌ 註冊指令時發生錯誤：', error);
  }
});

// 處理 Slash 指令
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'help') {
    await interaction.reply({
      content:
        '📘 **可用指令：**\n' +
        '🔹 `/help`：查看可用指令\n' +
        '🔹 `/reset`：清除目前所有語音頻道設定\n' +
        `🔹 \`${prefix}help\` / \`${prefix}reset\`：也可使用前綴指令（不分大小寫）\n` +
        '🔹 `/cute`：給你一點可愛的能量 ✨',
      ephemeral: true,
    });
  }

  if (interaction.commandName === 'reset') {
    settings = {};
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    await interaction.reply('✅ 所有語音頻道設定已清除！');
  }

  if (interaction.commandName === 'cute') {
    await interaction.reply('(ฅ´ω`ฅ)♡ 你超級可愛唷～要繼續加油嘿！✨');
  }
});

// 處理前綴指令（支援大小寫）
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (!message.content.toLowerCase().startsWith(prefix.toLowerCase())) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'help') {
    message.reply(
      '📘 **可用指令：**\n' +
      '🔹 `/help`：查看可用指令\n' +
      '🔹 `/reset`：清除目前所有語音頻道設定\n' +
      `🔹 \`${prefix}help\` / \`${prefix}reset\`：也可使用前綴指令（不分大小寫）\n` +
      '🔹 `/cute`：給你一點可愛的能量 ✨'
    );
  }

  if (command === 'reset') {
    settings = {};
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    message.reply('✅ 所有語音頻道設定已清除！');
  }

  if (command === 'cute') {
    message.reply('(｡♥‿♥｡) 啾啾～給你一點可愛的魔法 ✨');
  }
});

client.login(token);
