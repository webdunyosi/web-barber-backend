const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

let bot = null;
const token = process.env.TELEGRAM_BOT_TOKEN || '8598199374:AAEQ98hlQkG3IPtntC5LkqeQ5Pv2h27Yr_U';
const channelId = process.env.TELEGRAM_CHAT_ID || '-1004413936957';

if (token) {
  try {
    // polling: false — kanal ga faqat xabar yuborish uchun polling kerak emas
    bot = new TelegramBot(token, { polling: false });
    console.log('🤖 Telegram Bot: Initialized successfully (channel mode).');
  } catch (error) {
    console.error('❌ Telegram Bot initialization error:', error.message);
  }
} else {
  console.log('⚠️ Telegram Bot: Token missing in env. Notifications disabled.');
}

const sendTelegramMessage = async (text) => {
  if (!bot || !channelId) {
    console.log('⚠️ Telegram message not sent (bot or channel ID not configured).');
    return;
  }
  try {
    await bot.sendMessage(channelId, text, { parse_mode: 'Markdown' });
    console.log('📬 Telegram message sent to channel successfully.');
  } catch (error) {
    console.error('❌ Failed to send Telegram message:', error.message);
  }
};

const sendTelegramPhoto = async (photoSource, caption) => {
  if (!bot || !channelId) {
    console.log('⚠️ Telegram photo not sent (bot or channel ID not configured).');
    return;
  }
  try {
    let source = photoSource;

    if (typeof photoSource === 'string' && !photoSource.startsWith('http')) {
      // Local fayl — absolute path ga o'tkazamiz
      const absolutePath = path.isAbsolute(photoSource)
        ? photoSource
        : path.resolve(process.cwd(), photoSource);

      console.log(`📂 Telegram: Local file absolute path: ${absolutePath}`);

      if (fs.existsSync(absolutePath)) {
        source = fs.createReadStream(absolutePath);
      } else {
        console.warn(`⚠️ Telegram photo file does not exist: ${absolutePath}`);
        // Rasm topilmasa matn sifatida yuboramiz
        await bot.sendMessage(channelId, caption + '\n\n⚠️ _(Chek rasmi yuklanmadi)_', { parse_mode: 'Markdown' });
        return;
      }
    }

    await bot.sendPhoto(channelId, source, {
      caption: caption,
      parse_mode: 'Markdown'
    });
    console.log('📸 Telegram photo sent to channel successfully.');
  } catch (error) {
    console.error('❌ Failed to send Telegram photo:', error.message);
    // Rasm xato bo'lsa, matn sifatida yuboramiz (kanal doim xabar oladi)
    try {
      await bot.sendMessage(channelId, caption + '\n\n⚠️ _(Chek rasmi yuborishda xatolik)_', { parse_mode: 'Markdown' });
      console.log('📬 Fallback text message sent to channel.');
    } catch (fallbackErr) {
      console.error('❌ Fallback message also failed:', fallbackErr.message);
    }
  }
};

module.exports = {
  bot,
  sendTelegramMessage,
  sendTelegramPhoto
};
// Trigger nodemon reload for new .env variables

