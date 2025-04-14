// =============================
// 📦 模組與儲存初始化
// =============================
const voiceLogs = new Map();      // 使用者進出語音的紀錄
const selfMuteLogs = new Map();   // 使用者自己開關麥克風的紀錄
const modMuteLogs = new Map();    // 被管理員靜音或拒聽的紀錄
const deleteLogs = new Map();     // 訊息與附件刪除紀錄

// =============================
// 🎙️ 語音狀態變更事件處理
// =============================
export function handleVoiceStateUpdate(oldState, newState) {
  const guildId = newState.guild.id;
  const userTag = newState.member.user.tag;

  // 📌 語音頻道加入/離開
  if (oldState.channelId !== newState.channelId) {
    const time = new Date().toLocaleString();
    const action = newState.channelId
      ? `🔊 加入語音：${newState.channel.name}`
      : `📤 離開語音：${oldState.channel?.name}`;
    const entry = `[${time}] ${userTag} ${action}`;

    if (!voiceLogs.has(guildId)) voiceLogs.set(guildId, []);
    voiceLogs.get(guildId).push(entry);
  }

  // 🤐 自己靜音/解除靜音
  if (oldState.selfMute !== newState.selfMute) {
    const time = new Date().toLocaleString();
    const action = newState.selfMute ? '🔇 自己靜音' : '🔊 自己解除靜音';
    const entry = `[${time}] ${userTag} ${action}`;

    if (!selfMuteLogs.has(guildId)) selfMuteLogs.set(guildId, []);
    selfMuteLogs.get(guildId).push(entry);
  }

  // 🔇 被強制靜音/拒聽
  if (oldState.serverMute !== newState.serverMute || oldState.serverDeaf !== newState.serverDeaf) {
    const time = new Date().toLocaleString();
    let actions = [];
    if (oldState.serverMute !== newState.serverMute) {
      actions.push(newState.serverMute ? '被靜音' : '解除靜音');
    }
    if (oldState.serverDeaf !== newState.serverDeaf) {
      actions.push(newState.serverDeaf ? '被拒聽' : '解除拒聽');
    }

    const entry = `[${time}] ${userTag} 被管理員：${actions.join('、')}`;
    if (!modMuteLogs.has(guildId)) modMuteLogs.set(guildId, []);
    modMuteLogs.get(guildId).push(entry);
  }
}

// =============================
// 🗑️ 訊息刪除事件處理
// =============================
export function handleMessageDelete(message) {
  if (!message.guild) return;

  const guildId = message.guild.id;
  const userTag = message.author?.tag || '未知使用者';
  const time = new Date().toLocaleString();
  const content = message.content || '[無文字內容]';
  const attachments = message.attachments.map(att => att.url);

  const entry = `[${time}] ❌ ${userTag} 刪除訊息：${content}` + 
                (attachments.length ? `\n附件：${attachments.join('\n')}` : '');

  if (!deleteLogs.has(guildId)) deleteLogs.set(guildId, []);
  deleteLogs.get(guildId).push(entry);
}

// =============================
// 🧾 指令邏輯：根據類型傳回日誌
// =============================
export function handleLoggerCommand(command, guildId) {
  const map = {
    voicelog: voiceLogs,
    selfmute: selfMuteLogs,
    modmute: modMuteLogs,
    deletelog: deleteLogs
  }[command];

  const logs = map?.get(guildId);
  if (!logs || logs.length === 0) return null;

  return `📋 最近的 ${command} 記錄：\n` + logs.slice(-10).join('\n');
}

// =============================
// 📂 Slash 指令定義列表
// =============================
export const loggerSlashCommands = [
  {
    name: 'voicelog',
    description: '查詢語音進出紀錄'
  },
  {
    name: 'selfmute',
    description: '查詢使用者自己靜音紀錄'
  },
  {
    name: 'modmute',
    description: '查詢被管理員靜音/拒聽紀錄'
  },
  {
    name: 'deletelog',
    description: '查詢訊息與附件刪除紀錄'
  }
];
