import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Collection, Events } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import registerSlashCommands from './register-commands.js';

// 定義常數
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});
const PREFIX = 'w!';
const configPath = path.join(__dirname, 'config.json');

// 載入或初始化設定檔
let config = {};
if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

// 登入
client.once('ready', async () => {
  console.log(`🤖 已登入：${client.user.tag}`);
  await registerSlashCommands(client);
});

// 監聽語音狀態變更
client.on('voiceStateUpdate', (oldState, newState) => {
  const guildId = newState.guild.id;
  const settings = config[guildId];
  if (!settings) return;

  const member = newState.member || oldState.member;
  if (!member) return;

  const joined = newState.channelId === settings.voiceChannel;
  const left = oldState.channelId === settings.voiceChannel && newState.channelId !== settings.voiceChannel;

  if (joined) {
    member.roles.add(settings.roleId).catch(console.error);
  } else if (left) {
    member.roles.remove(settings.roleId).catch(console.error);
  }
});

// 處理訊息指令（支援大小寫前綴）
client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;
  const content = message.content.trim();
  if (!content.toLowerCase().startsWith(PREFIX.toLowerCase())) return;

  const args = content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (command === 'setvoice') {
    const voiceChannel = args[0];
    if (!voiceChannel || isNaN(voiceChannel)) return message.reply('❌ 請提供有效的語音頻道 ID。');

    config[message.guild.id] = config[message.guild.id] || {};
    config[message.guild.id].voiceChannel = voiceChannel;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    message.reply(`✅ 語音頻道已設定為 <#${voiceChannel}>`);
  }

  if (command === 'setrole') {
    const roleId = args[0];
    if (!roleId || isNaN(roleId)) return message.reply('❌ 請提供有效的身分組 ID。');

    config[message.guild.id] = config[message.guild.id] || {};
    config[message.guild.id].roleId = roleId;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    message.reply(`✅ 身分組已設定為 <@&${roleId}>`);
  }

  if (command === 'reset') {
    delete config[message.guild.id];
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    message.reply('✅ 設定已清除。');
  }

  if (command === 'help') {
    message.reply(`📖 可用指令：
\`${PREFIX}setvoice <語音頻道ID>\` - 設定語音頻道
\`${PREFIX}setrole <身分組ID>\` - 設定身分組
\`${PREFIX}reset\` - 清除設定
\`${PREFIX}help\` - 顯示這個說明
（前綴不分大小寫，像是 \`W!HELP\` 也可以喔！）
`);
  }
});

// Slash 指令處理
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'reset') {
    delete config[interaction.guild.id];
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    await interaction.reply('✅ 設定已清除。');
  }

  if (commandName === 'help') {
    await interaction.reply(`📖 可用指令：
\`${PREFIX}setvoice <語音頻道ID>\` - 設定語音頻道
\`${PREFIX}setrole <身分組ID>\` - 設定身分組
\`${PREFIX}reset\` 或 \`/reset\` - 清除設定
\`${PREFIX}help\` 或 \`/help\` - 顯示說明`);
  }
});

// 登入
client.login(process.env.DISCORD_TOKEN);
