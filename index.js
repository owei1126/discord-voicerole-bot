import { Client, GatewayIntentBits, Partials, EmbedBuilder, Events } from 'discord.js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// === 設定檔案讀取與初始化 ===
const settingsPath = './settings.json';
const userSettingsPath = './userSettings.json';
const settings = fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath)) : {};
const userSettings = fs.existsSync(userSettingsPath) ? JSON.parse(fs.readFileSync(userSettingsPath)) : {};
const userPreferences = new Map();

function saveSettings() {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}
function saveUserSettings() {
  fs.writeFileSync(userSettingsPath, JSON.stringify(userSettings, null, 2));
}

// === Slash 指令回覆偏好設定 ===
function getUserReplyOption(userId) {
  const pref = userPreferences.get(userId);
  return pref?.ephemeral ? { ephemeral: true } : {};
}
function setUserReplyOption(userId, prefs) {
  userPreferences.set(userId, prefs);
  userSettings[userId] = prefs;
  saveUserSettings();
}

// === Bot 啟動後顯示提示訊息 ===
client.once(Events.ClientReady, () => {
  console.log(`✅ Bot 已上線：${client.user.tag}`);

  for (const [userId, prefs] of Object.entries(userSettings)) {
    userPreferences.set(userId, prefs);
  }
});

// === 使用者加入/離開語音頻道時自動加上/移除身分組與記錄 ===
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const guildId = newState.guild.id;
  const config = settings[guildId];
  if (!config?.voiceChannel || !config?.role) return;

  const logChannelId = config.voiceLogChannel;
  const logChannel = newState.guild.channels.cache.get(logChannelId);

  const member = newState.member;
  const joined = newState.channelId === config.voiceChannel;
  const left = oldState.channelId === config.voiceChannel && !joined;
  const moved = oldState.channelId !== newState.channelId && oldState.channelId && newState.channelId;

  if (joined) {
    await member.roles.add(config.role).catch(console.error);
    if (logChannel) {
      logChannel.send({
        embeds: [new EmbedBuilder()
          .setColor(0x00d26a)
          .setDescription(`📥 ${member} 加入語音頻道 <#${newState.channelId}>`)
          .setTimestamp()]
      });
    }
  } else if (left) {
    await member.roles.remove(config.role).catch(console.error);
    if (logChannel) {
      logChannel.send({
        embeds: [new EmbedBuilder()
          .setColor(0xd00000)
          .setDescription(`📤 ${member} 離開語音頻道 <#${oldState.channelId}>`)
          .setTimestamp()]
      });
    }
  } else if (moved) {
    if (logChannel) {
      logChannel.send({
        embeds: [new EmbedBuilder()
          .setColor(0xff9f1c)
          .setDescription(`🔀 ${member} 語音轉移：<#${oldState.channelId}> ➜ <#${newState.channelId}>`)
          .setTimestamp()]
      });
    }
  }
});

// === 記錄訊息刪除事件（含圖片縮圖）===
client.on(Events.MessageDelete, async message => {
  if (!message.guild || message.author?.bot) return;

  const logChannelId = settings[message.guild.id]?.messageLogChannel;
  if (!logChannelId) return;

  const logChannel = message.guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor(0xf98404)
    .setAuthor({ name: `${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
    .setDescription(`🗑️ **訊息已被刪除**\n📍 頻道：${message.channel}\n💬 內容：${message.content || '[無文字]'}`)
    .setTimestamp();

  if (message.attachments.size > 0) {
    const image = message.attachments.find(att => att.contentType?.startsWith('image/'));
    if (image) {
      embed.setImage(image.url);
      embed.addFields({ name: '📎 附件連結', value: image.url });
    }
  }

  logChannel.send({ embeds: [embed] });
});

// === 指令處理區塊 ===
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, guildId } = interaction;

  switch (commandName) {
    case 'help': {
      const embed = new EmbedBuilder()
        .setColor(0x4fc3f7)
        .setTitle('📖 指令清單')
        .setDescription([
          '⚙️ **設定指令**',
          '• `/set-voicechannel` ➜ 設定觸發語音頻道',
          '• `/set-role` ➜ 設定自動身分組',
          '• `/set-voicelog` ➜ 設定語音紀錄頻道',
          '• `/set-messagelog` ➜ 設定訊息紀錄頻道',
          '• `/clear-setting` ➜ 清除指定設定',
          '',
          '👤 **使用者指令**',
          '• `/setreplyprivacy` ➜ 設定 Slash 回覆是否僅自己可見'
        ].join('\n'));
      return await interaction.reply({ embeds: [embed], ...getUserReplyOption(interaction.user.id) });
    }

    case 'set-voicechannel': {
      settings[guildId] ??= {};
      settings[guildId].voiceChannel = options.getChannel('channel').id;
      saveSettings();
      return await interaction.reply({ content: '✅ 已設定語音頻道', ...getUserReplyOption(interaction.user.id) });
    }

    case 'set-role': {
      settings[guildId] ??= {};
      settings[guildId].role = options.getRole('role').id;
      saveSettings();
      return await interaction.reply({ content: '✅ 已設定身分組', ...getUserReplyOption(interaction.user.id) });
    }

    case 'set-voicelog': {
      settings[guildId] ??= {};
      settings[guildId].voiceLogChannel = options.getChannel('channel').id;
      saveSettings();
      return await interaction.reply({ content: '✅ 已設定語音紀錄頻道', ...getUserReplyOption(interaction.user.id) });
    }

    case 'set-messagelog': {
      settings[guildId] ??= {};
      settings[guildId].messageLogChannel = options.getChannel('channel').id;
      saveSettings();
      return await interaction.reply({ content: '✅ 已設定訊息紀錄頻道', ...getUserReplyOption(interaction.user.id) });
    }

    case 'clear-setting': {
      const type = options.getString('type');
      delete settings[guildId]?.[type];
      saveSettings();
      return await interaction.reply({ content: `🗑️ 已清除設定：\`${type}\``, ...getUserReplyOption(interaction.user.id) });
    }

    case 'setreplyprivacy': {
      const ephemeral = options.getBoolean('ephemeral');
      setUserReplyOption(interaction.user.id, { ephemeral });
      return await interaction.reply({
        content: `✅ Slash 指令回覆將${ephemeral ? '僅自己可見' : '公開可見'}`,
        ephemeral: true
      });
    }
  }
});

// === 前綴指令（大小寫皆可）===
client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.content.toLowerCase().startsWith('w!')) return;

  const args = message.content.slice(2).trim().split(/\s+/);
  const cmd = args.shift()?.toLowerCase();
  const guildId = message.guild.id;

  switch (cmd) {
    case 'setvc':
      settings[guildId] ??= {};
      settings[guildId].voiceChannel = message.mentions.channels.first()?.id;
      saveSettings();
      return message.reply('✅ 已設定語音頻道');

    case 'setrole':
      settings[guildId] ??= {};
      settings[guildId].role = message.mentions.roles.first()?.id;
      saveSettings();
      return message.reply('✅ 已設定身分組');

    case 'setvoicelog':
      settings[guildId] ??= {};
      settings[guildId].voiceLogChannel = message.mentions.channels.first()?.id;
      saveSettings();
      return message.reply('✅ 已設定語音紀錄頻道');

    case 'setmsglog':
      settings[guildId] ??= {};
      settings[guildId].messageLogChannel = message.mentions.channels.first()?.id;
      saveSettings();
      return message.reply('✅ 已設定訊息紀錄頻道');

    case 'clear':
      const type = args[0];
      delete settings[guildId]?.[type];
      saveSettings();
      return message.reply(`🗑️ 已清除設定：\`${type}\``);

    case 'help':
      return message.reply([
        '📖 **指令列表**',
        '⚙️ 設定：`w!setvc #語音`、`w!setrole @身分組`、`w!setvoicelog #頻道`、`w!setmsglog #頻道`',
        '🧹 清除：`w!clear 語音類型（voiceChannel / role / voiceLogChannel / messageLogChannel）`',
        '❓ 查詢這個說明：`w!help`'
      ].join('\n'));
  }
});

// === 啟動 Bot ===
client.login(process.env.TOKEN);
