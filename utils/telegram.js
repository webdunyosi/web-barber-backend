const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

let bot = null;
const token = process.env.TELEGRAM_BOT_TOKEN || '8598199374:AAEQ98hlQkG3IPtntC5LkqeQ5Pv2h27Yr_U';
const chatId = process.env.TELEGRAM_CHAT_ID || '-1004413936957';

if (token) {
  try {
    bot = new TelegramBot(token, { polling: true });
    console.log('🤖 Telegram Bot: Initialized successfully.');

    // Listen for /start command
    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const firstName = msg.from?.first_name || 'Mijoz';
      try {
        await bot.sendMessage(chatId, `Assalomu alaykum, ${firstName}! **Web Barber** salonining rasmiy botiga xush kelibsiz.\n\nSalon xizmatlaridan foydalanish va navbatga yozilish uchun quyidagi tugmani bosing:`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Salonni ochish 💈", url: "https://t.me/webdunyosi_barbershop_bot/barber" }
              ]
            ]
          }
        });
      } catch (error) {
        console.error('❌ Failed to send start message:', error.message);
      }
    });

    // Listen for /open command
    bot.onText(/\/open/, async (msg) => {
      const chatId = msg.chat.id;
      try {
        await bot.sendMessage(chatId, `**Web Barber** salonini ochish uchun quyidagi tugmani bosing:`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: "Salonni ochish 💈", url: "https://t.me/webdunyosi_barbershop_bot/barber" }
              ]
            ]
          }
        });
      } catch (error) {
        console.error('❌ Failed to send open message:', error.message);
      }
    });

  } catch (error) {
    console.error('❌ Telegram Bot initialization error:', error.message);
  }
} else {
  console.log('⚠️ Telegram Bot: Token missing in env. Notifications disabled.');
}

const sendTelegramMessage = async (text) => {
  if (!bot || !chatId) {
    console.log('⚠️ Telegram message not sent (bot or chat ID not configured).');
    return;
  }
  try {
    await bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    console.log('📬 Telegram message sent successfully.');
  } catch (error) {
    console.error('❌ Failed to send Telegram message:', error.message);
  }
};

const sendTelegramPhoto = async (photoSource, caption) => {
  if (!bot || !chatId) {
    console.log('⚠️ Telegram photo not sent (bot or chat ID not configured).');
    return;
  }
  try {
    let source = photoSource;
    if (typeof photoSource === 'string' && !photoSource.startsWith('http')) {
      const absolutePath = path.isAbsolute(photoSource) ? photoSource : path.resolve(photoSource);
      if (fs.existsSync(absolutePath)) {
        source = fs.createReadStream(absolutePath);
        console.log(`📂 Telegram: Loading local file stream from: ${absolutePath}`);
      } else {
        console.warn(`⚠️ Telegram photo file does not exist: ${absolutePath}`);
      }
    }
    await bot.sendPhoto(chatId, source, {
      caption: caption,
      parse_mode: 'Markdown'
    });
    console.log('📸 Telegram photo sent successfully.');
  } catch (error) {
    console.error('❌ Failed to send Telegram photo:', error.message);
  }
};

module.exports = {
  bot,
  sendTelegramMessage,
  sendTelegramPhoto
};
// Trigger nodemon reload for new .env variables

