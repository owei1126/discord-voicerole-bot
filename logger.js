import fs from 'fs';
const logFilePath = './voicelog.json';

if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, JSON.stringify({}));
}

const loadLogs = () => JSON.parse(fs.readFileSync(logFilePath));
const saveLogs = (logs) => fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));

const getLogChannel = (guild, settings) => {
  const guildId = guild.id;
  const logChannelId = settings[guildId]?.logChannel;
  return logChannelId ? guild.channels.cache.get(logChannelId) : null;
};

const formatLog = (logArray) => {
  if (!logArray || logArray.length === 0) return '⚠️ 找不到紀錄。';
  return logArray.map((e, i) => `${i + 1}. ${e}`).join('\n');
};

export default {
  handleVoiceUpdate(oldState, newState, settings) {
    const guildId = newState.guild.id;
    const logs = loadLogs();
    logs[guildId] ||= {
      joinLeave: [],
      selfMute: [],
      modMute: []
    };

    const userTag = newState.member.user.tag;
    const now = new Date().toLocaleString('zh-TW');

    if (!oldState.channel && newState.channel) {
      logs[guildId].joinLeave.push(`[${now}] 🔊 ${userTag} 加入 ${newState.channel.name}`);
      if (newState.channel.id === settings[guildId]?.voiceChannel) {
        newState.member.roles.add(settings[guildId].role).catch(() => {});
      }
    } else if (oldState.channel && !newState.channel) {
      logs[guildId].joinLeave.push(`[${now}] 🔇 ${userTag} 離開 ${oldState.channel.name}`);
      if (oldState.channel.id === settings[guildId]?.voiceChannel) {
        newState.member.roles.remove(settings[guildId].role).catch(() => {});
      }
    }

    if (oldState.selfMute !== newState.selfMute) {
      const status = newState.selfMute ? '關麥' : '開麥';
      logs[guildId].selfMute.push(`[${now}] 🎙️ ${userTag} ${status}`);
    }

    if (oldState.mute !== newState.mute) {
      const status = newState.mute ? '被管理員靜音' : '被取消靜音';
      logs[guildId].modMute.push(`[${now}] 🚫 ${userTag} ${status}`);
    }

    if (oldState.deaf !== newState.deaf) {
      const status = newState.deaf ? '被拒聽' : '被解除拒聽';
      logs[guildId].modMute.push(`[${now}] 🚫 ${userTag} ${status}`);
    }

    saveLogs(logs);
  },

  handleMessageDelete(message, settings) {
    if (!message.guild || !message.channel || message.author?.bot) return;

    const guildId = message.guild.id;
    const logChannel = getLogChannel(message.guild, settings);

    let content = message.content || '(空訊息)';
    if (message.attachments.size > 0) {
      content += '\n📎 附件：' + message.attachments.map(a => a.url).join('\n');
    }

    const logMsg = `🗑️ ${message.author?.tag || '未知使用者'} 在 <#${message.channel.id}> 刪除訊息：\n${content}`;
    logChannel?.send(logMsg);
  },

  sendVoiceLog(channel, guildId) {
    const logs = loadLogs();
    return channel.send('📋 語音進出紀錄：\n' + formatLog(logs[guildId]?.joinLeave));
  },

  sendSelfMuteLog(channel, guildId) {
    const logs = loadLogs();
    return channel.send('🎙️ 使用者開關麥紀錄：\n' + formatLog(logs[guildId]?.selfMute));
  },

  sendModMuteLog(channel, guildId) {
    const logs = loadLogs();
    return channel.send('🚫 被靜音/拒聽紀錄：\n' + formatLog(logs[guildId]?.modMute));
  },

  sendDeleteLog(channel, guildId) {
    const logData = loadLogs();
    const guildLogs = logData[guildId];
    if (!guildLogs) return channel.send('⚠️ 沒有紀錄可查詢。');

    return channel.send(
      '📊 所有紀錄查詢請用：\n' +
      '`/voicelog` `/selfmute` `/modmute` 查看詳細紀錄\n' +
      '訊息刪除紀錄請看紀錄頻道的通知（含圖片與附件網址）'
    );
  }
};
