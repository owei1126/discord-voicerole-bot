// ✅ logger.js：處理語音事件與訊息刪除紀錄的邏輯模組
import { EmbedBuilder, ChannelType } from 'discord.js';

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
    logs[guildId].joinLeave.push(`[${now}] 🔁 ${userTag} 從 ${oldState.channel.name} 轉到 ${newState.channel.name}`);
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

// ✅ 訊息刪除事件處理
async function handleMessageDelete(message, settings) {
  const guildId = message.guild?.id;
  if (!guildId || !settings[guildId]) return;

  const logChannelId = settings[guildId].messageLogChannel || settings[guildId].logChannel;
  const logChannel = message.guild.channels.cache.get(logChannelId);
  if (!logChannel || logChannel.type !== ChannelType.GuildText) return;

  // ✅ 準備 Embed
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setAuthor({ name: message.author?.tag || '未知使用者', iconURL: message.author?.displayAvatarURL() })
    .setDescription(`🗑️ <@${message.author?.id}> 在 <#${message.channel.id}> 刪除了訊息：\n\`\`\`\n${message.content || '（無文字內容）'}\n\`\`\``)
    .setTimestamp();

  // ✅ 附件處理（顯示網址）
  if (message.attachments.size > 0) {
    if (message.attachments.size > 0) {
      const fields = [];
      message.attachments.forEach(a => {
        let field = `🔗 [點我開啟](${a.url})`;
        if (a.contentType?.startsWith('image/')) {
          field += `\n👉 [預覽縮圖](${a.proxyURL})`;
        }
        fields.push(field);
      });
    
      embed.addFields({ name: '🖼️ 附件', value: fields.join('\n\n') });
    }
    
  }

  logChannel.send({ embeds: [embed] }).catch(console.error);
}

// ✅ 匯出模組函式
export default {
  handleVoiceUpdate,
  handleMessageDelete
};
