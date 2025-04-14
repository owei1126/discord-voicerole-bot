# Discord Voice Role Bot
這個專案是用來管理 Discord 伺服器中語音頻道身分組的機器人。

## 功能
- 當使用者進入指定語音頻道時，自動分配身分組。
- 當使用者離開語音頻道時，移除身分組。
- 支援 Slash 指令。

🛠️ 機器人可用指令列表
🔹 Slash 指令
指令	說明
/setvoice [語音頻道]	設定語音監控頻道（當成員加入此頻道會自動加上身分組）
/setrole [身分組]	設定進語音時自動加上的身分組
/setlogchannel [文字頻道]	設定語音與刪除紀錄自動發送的頻道
/status	查看目前語音頻道與身分組設定狀態
/reset	清除目前的語音與身分組設定
/help	顯示所有 Slash 指令與說明
/voicelog	查詢最近的語音進出紀錄
/selfmute	查詢使用者開/關麥克風的紀錄
/modmute	查詢是否被管理員靜音或拒聽的紀錄
/deletelog	查詢訊息與圖片刪除的紀錄（含附件）
🔸 前綴指令（${prefix}）
這些指令以你設定的前綴（預設為 w!）開頭，大小寫皆可，例如 w!help 或 W!HELP 都有效。

指令	說明
w!setvoice [語音頻道ID]	設定語音監控頻道
w!setrole [身分組ID]	設定進語音時自動加上的身分組
w!status	查看目前設定狀態
w!reset	清除目前的語音與身分組設定
w!help	顯示所有指令與說明
w!voicelog	查詢最近的語音進出紀錄
w!selfmute	查詢使用者開/關麥克風的紀錄
w!modmute	查詢是否被管理員靜音或拒聽的紀錄
w!deletelog	查詢訊息與圖片刪除的紀錄（含附件）
