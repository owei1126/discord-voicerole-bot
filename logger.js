// 📌 logger.js - 整合語音紀錄、身分組、自動日誌通知功能

const { Client, GatewayIntentBits, Partials, EmbedBuilder, Events, PermissionsBitField, SlashCommandBuilder, Collection } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User]
});

const configFile = './config.json';
let config = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile)) : {};

client.commands = new Collection();
const prefix = '!';

// =============================
// 🧩 共用方法區塊
// =============================

function getHelpText() {
  return `📝 可用指令列表：

**🔹 Slash 指令：**
/setvoice [語音頻道] → 設定語音監控頻道（當成員加入此頻道會加上身分組）
/setrole [身分組] → 設定自動指派的身分組
/setlogchannel [頻道] → 設定紀錄日誌的頻道（所有通知將發送到此）
/help → 顯示幫助清單

**🔸 前綴指令（${prefix}）：**
${prefix}setvoice [語音頻道ID]  
${prefix}setrole [身分組ID]  
${prefix}setlogchannel [頻道ID]  
${prefix}help`;
}

function saveConfig() {
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

function createLogEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0x00bfff)
    .setTimestamp();
}

function getMention(item) {
  return item ? `<#${item.id || item}>` : '未設定';
}

// =============================
// ⚙️ 指令處理區塊
// =============================

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName, options, guildId } = interaction;

  if (!config[guildId]) config[guildId] = {};

  if (commandName === 'setvoice') {
    const channel = options.getChannel('channel');
    config[guildId].voiceChannel = channel.id;
    saveConfig();
    return interaction.reply({ content: `✅ 已設定語音頻道為：${channel}`, ephemeral: true });
  }

  if (commandName === 'setrole') {
    const role = options.getRole('role');
    config[guildId].autoRole = role.id;
    saveConfig();
    return interaction.reply({ content: `✅ 已設定自動指派身分組為：${role}`, ephemeral: true });
  }

  if (commandName === 'setlogchannel') {
    const channel = options.getChannel('channel');
    config[guildId].logChannel = channel.id;
    saveConfig();
    return interaction.reply({ content: `📘 已設定紀錄頻道為：${channel}`, ephemeral: true });
  }

  if (commandName === 'help') {
    return interaction.reply({ content: getHelpText(), ephemeral: true });
  }
});

// =============================
// 🎙️ 語音監聽區塊
// =============================

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const guildId = newState.guild.id;
  const settings = config[guildId];
  if (!settings || !settings.logChannel) return;
  const logChannel = await newState.guild.channels.fetch(settings.logChannel);

  const user = newState.member;
  const mentionUser = `<@${user.id}>`;

  // 加入語音頻道
  if (!oldState.channelId && newState.channelId) {
    if (newState.channelId === settings.voiceChannel && settings.autoRole) {
      const role = newState.guild.roles.cache.get(settings.autoRole);
      if (role) await user.roles.add(role).catch(() => {});
    }
    const embed = createLogEmbed('📥 使用者加入語音頻道', `${mentionUser} 加入了 ${getMention(newState.channel)}。`);
    logChannel.send({ embeds: [embed] });
  }

  // 離開語音頻道
  if (oldState.channelId && !newState.channelId) {
    if (oldState.channelId === settings.voiceChannel && settings.autoRole) {
      const role = newState.guild.roles.cache.get(settings.autoRole);
      if (role) await user.roles.remove(role).catch(() => {});
    }
    const embed = createLogEmbed('📤 使用者離開語音頻道', `${mentionUser} 離開了 ${getMention(oldState.channel)}。`);
    logChannel.send({ embeds: [embed] });
  }

  // 頻道移動
  if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    const embed = createLogEmbed('🔁 使用者移動語音頻道', `${mentionUser} 從 ${getMention(oldState.channel)} 移動到 ${getMention(newState.channel)}。`);
    logChannel.send({ embeds: [embed] });
  }

  // 自我靜音 / 拒聽
  if (oldState.selfMute !== newState.selfMute) {
    const embed = createLogEmbed(newState.selfMute ? '🔇 自我靜音' : '🔊 取消自我靜音', `${mentionUser} ${newState.selfMute ? '啟用了' : '取消了'} 自我靜音。`);
    logChannel.send({ embeds: [embed] });
  }
  if (oldState.selfDeaf !== newState.selfDeaf) {
    const embed = createLogEmbed(newState.selfDeaf ? '🙉 自我拒聽' : '👂 取消自我拒聽', `${mentionUser} ${newState.selfDeaf ? '啟用了' : '取消了'} 自我拒聽。`);
    logChannel.send({ embeds: [embed] });
  }

  // 被管理者靜音 / 拒聽
  if (oldState.serverMute !== newState.serverMute) {
    const embed = createLogEmbed(newState.serverMute ? '🔇 被靜音' : '🔊 被解除靜音', `${mentionUser} ${newState.serverMute ? '被伺服器靜音。' : '被解除伺服器靜音。'}`);
    logChannel.send({ embeds: [embed] });
  }
  if (oldState.serverDeaf !== newState.serverDeaf) {
    const embed = createLogEmbed(newState.serverDeaf ? '🙉 被拒聽' : '👂 被解除拒聽', `${mentionUser} ${newState.serverDeaf ? '被伺服器拒聽。' : '被解除伺服器拒聽。'}`);
    logChannel.send({ embeds: [embed] });
  }
});

// =============================
// 🗑️ 訊息刪除紀錄
// =============================

client.on(Events.MessageDelete, async message => {
  const guildId = message.guild?.id;
  const settings = config[guildId];
  if (!settings || !settings.logChannel || message.partial) return;

  const logChannel = await message.guild.channels.fetch(settings.logChannel);
  const embed = new EmbedBuilder()
    .setTitle('🗑️ 訊息被刪除')
    .addFields(
      { name: '👤 發送者', value: `${message.author}`, inline: true },
      { name: '📍 頻道', value: `${message.channel}`, inline: true },
      { name: '💬 原始訊息', value: message.content || '（可能為圖片、嵌入或其他非文字內容）' }
    )
    .setColor(0xff4d4d)
    .setTimestamp();

  if (message.attachments.size > 0) {
    embed.setImage(message.attachments.first().url);
  }

  logChannel.send({ embeds: [embed] });
});

// =============================
// ✅ Bot 啟動 & 指令註冊（初始）
// =============================

client.once(Events.ClientReady, async () => {
  console.log(`🤖 已登入 ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('setvoice')
      .setDescription('設定語音監控頻道')
      .addChannelOption(opt => opt.setName('channel').setDescription('選擇語音頻道').setRequired(true)),
    new SlashCommandBuilder()
      .setName('setrole')
      .setDescription('設定自動指派身分組')
      .addRoleOption(opt => opt.setName('role').setDescription('選擇身分組').setRequired(true)),
    new SlashCommandBuilder()
      .setName('setlogchannel')
      .setDescription('設定紀錄用的頻道')
      .addChannelOption(opt => opt.setName('channel').setDescription('選擇紀錄頻道').setRequired(true)),
    new SlashCommandBuilder()
      .setName('help')
      .setDescription('顯示所有指令與用法')
  ];

  const guilds = client.guilds.cache.map(guild => guild.id);
  for (const id of guilds) {
    await client.application.commands.set(commands, id);
  }
});

module.exports = { client };
