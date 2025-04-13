import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import { SlashCommandBuilder } from '@discordjs/builders';

// 載入環境變數
config();

// 創建 Discord 客戶端
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// 設定指令
const commands = [
    new SlashCommandBuilder().setName('setvoice').setDescription('設定語音頻道').addStringOption(option =>
        option.setName('channelid').setDescription('請提供語音頻道的 ID').setRequired(true)),
    new SlashCommandBuilder().setName('setrole').setDescription('設定自動加上的身分組').addStringOption(option =>
        option.setName('roleid').setDescription('請提供身分組的 ID').setRequired(true)),
    new SlashCommandBuilder().setName('status').setDescription('查看目前的設定狀態'),
    new SlashCommandBuilder().setName('reset').setDescription('清除目前的設定'),
    new SlashCommandBuilder().setName('help').setDescription('查看可用指令')
];

// 當機器人登入成功
client.once('ready', () => {
    console.log('已登入：', client.user.tag);

    // 註冊指令
    client.application.commands.set(commands)
        .then(() => console.log('指令註冊成功！'))
        .catch((error) => console.error('指令註冊失敗:', error));
});

// 處理 Slash 指令
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'setvoice') {
        const channelID = interaction.options.getString('channelid');
        // 處理語音頻道設定
        interaction.reply(`已設定語音頻道為: ${channelID}`);
    } else if (commandName === 'setrole') {
        const roleID = interaction.options.getString('roleid');
        // 處理身分組設定
        interaction.reply(`已設定身分組為: ${roleID}`);
    } else if (commandName === 'status') {
        // 顯示目前的設定狀態
        interaction.reply('這是目前的設定狀態。');
    } else if (commandName === 'reset') {
        // 清除設定
        interaction.reply('已清除設定。');
    } else if (commandName === 'help') {
        // 顯示可用指令
        interaction.reply(`
可用指令：
  w!setvoice [頻道ID] - 設定語音頻道
  w!setrole [身分組ID] - 設定自動加上的身分組
  w!status - 查看目前的設定狀態
  w!reset - 清除目前的設定
  w!help - 查看可用指令

  /setvoice [語音頻道] - 設定語音頻道
  /setrole [身分組] - 設定自動加上的身分組
  /status - 查看目前的設定狀態
  /reset - 清除目前的設定
  /help - 查看可用指令
        `);
    }
});

// 登入 Discord
client.login(process.env.DISCORD_TOKEN);
