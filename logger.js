// ✅ logger.js：處理語音事件與訊息刪除紀錄的邏輯模組
import { EmbedBuilder, ChannelType,AuditLogEvent } from 'discord.js';

// ✅ 語音事件處理（加入/離開/靜音/被強制靜音等）
function handleVoiceUpdate(oldState, newState, settings) {
  const guildId = newState.guild.id;
  const guildSettings = settings[guildId] || {};
  const targetChannelId = guildSettings.voiceChannel;
  const targetRoleId = guildSettings.role;

  const wasInChannel = oldState.channelId === targetChannelId;
  const isInChannel = newState.channelId === targetChannelId;

  // ✅ 自動加身分組（加入目標語音頻道）
  if (!wasInChannel && isInChannel && targetRoleId) {
    newState.member.roles.add(targetRoleId).catch(console.error);
  }

  // ✅ 自動移除身分組（離開目標語音頻道）
  if (wasInChannel && !isInChannel && targetRoleId) {
    oldState.member.roles.remove(targetRoleId).catch(console.error);
  }

  // ✅ 建立 Embed 作為語音紀錄訊息
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setAuthor({ name: newState.member.user.tag, iconURL: newState.member.user.displayAvatarURL() })
    .setTimestamp();

  let description = '';
  if (!oldState.channelId && newState.channelId) {
    description = `🔊 <@${newState.id}> 加入了語音頻道 <#${newState.channelId}>`;
  } 
  else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
    description = `🔁 <@${newState.id}> 從語音頻道 <#${oldState.channelId}> 移動到 <#${newState.channelId}>`;
  }
  

    else if (oldState.channelId && !newState.channelId) {
    description = `📤 <@${newState.id}> 離開了語音頻道 <#${oldState.channelId}>`;
  } else if (oldState.selfMute !== newState.selfMute) {
    description = newState.selfMute
      ? `🤐 <@${newState.id}> 關閉了自己的麥克風`
      : `🎙️ <@${newState.id}> 開啟了自己的麥克風`;
  } else if (oldState.selfDeaf !== newState.selfDeaf) {
    description = newState.selfDeaf
      ? `🙉 <@${newState.id}> 關閉了自己的耳機`
      : `👂 <@${newState.id}> 開啟了自己的耳機`;
  } else if (oldState.serverMute !== newState.serverMute) {
    description = newState.serverMute
      ? `🔇 <@${newState.id}> 被伺服器靜音`
      : `🔊 <@${newState.id}> 被解除靜音`;
  } else if (oldState.serverDeaf !== newState.serverDeaf) {
    description = newState.serverDeaf
      ? `🚫🎧 <@${newState.id}> 被伺服器拒聽`
      : `✅🎧 <@${newState.id}> 被解除拒聽`;
  }

  if (!description) return;

  embed.setDescription(description);

  // ✅ 發送 Embed 到語音紀錄頻道
  const logChannelId = guildSettings.voiceLogChannel || guildSettings.logChannel;
  const logChannel = newState.guild.channels.cache.get(logChannelId);
  if (logChannel?.type === ChannelType.GuildText) {
    logChannel.send({ embeds: [embed] }).catch(console.error);
  }
}

// ✅ 訊息刪除事件處理（含抓取審核日誌）


async function handleMessageDelete(message, settings) {
  const guild = message.guild;
  const guildId = guild?.id;
  if (!guild || !settings[guildId]) return;

  const logChannelId = settings[guildId].messageLogChannel || settings[guildId].logChannel;
  const logChannel = guild.channels.cache.get(logChannelId);
  if (!logChannel || logChannel.type !== ChannelType.GuildText) return;

  // ✅ 預設訊息
  let deleterText = `🗑️ <@${message.author?.id}> 在 <#${message.channel.id}> 刪除了訊息：`;

  // ✅ 嘗試從 Audit Log 取得「是誰刪的」
  try {
    const fetchedLogs = await guild.fetchAuditLogs({
      type: AuditLogEvent.MessageDelete,
      limit: 1,
    });
    const deletionLog = fetchedLogs.entries.first();

    if (
      deletionLog &&
      deletionLog.target?.id === message.author?.id &&
      Date.now() - deletionLog.createdTimestamp < 5000
    ) {
      const executor = deletionLog.executor;
      if (executor && executor.id !== message.author?.id) {
        deleterText = `🗑️ <@${executor.id}> 刪除了 <@${message.author?.id}> 在 <#${message.channel.id}> 發送的訊息：`;
      }
    }
  } catch (err) {
    console.error('⚠️ 取得 Audit Log 時出錯：', err);
  }

  // ✅ 建立 Embed
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setAuthor({ name: message.author?.tag || '未知使用者', iconURL: message.author?.displayAvatarURL() })
    .setDescription(`${deleterText}\n\`\`\`\n${message.content || '（無文字內容）'}\n\`\`\``)
    .setTimestamp();

  // ✅ 附件處理（自動預覽圖片）
  if (message.attachments.size > 0) {
    const firstAttachment = message.attachments.first();
    if (firstAttachment?.contentType?.startsWith('image/')) {
      embed.setImage(firstAttachment.url);
    }

    const others = [];
    message.attachments.forEach(a => {
      let field = `🔗 [點我開啟](${a.url})`;
      if (a.contentType?.startsWith('image/')) {
        field += `（圖片預覽上方已顯示）`;
      } else if (a.contentType?.startsWith('video/')) {
        field += `（影片可點開播放）`;
      }
      others.push(field);
    });

    if (others.length > 0) {
      embed.addFields({ name: '📎 附件', value: others.join('\n\n') });
    }
  }

  logChannel.send({ embeds: [embed] }).catch(console.error);
}


// ✅ 匯出模組函式
export default {
  handleVoiceUpdate,
  handleMessageDelete
};
