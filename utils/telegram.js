const TelegramBot = require('node-telegram-bot-api');

let bot = null;

if (process.env.TELEGRAM_BOT_TOKEN) {
  try {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
    console.log('🤖 Telegram Bot: Initialized successfully with polling.');

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
  if (!bot || !process.env.TELEGRAM_CHAT_ID) {
    console.log('⚠️ Telegram message not sent (bot or chat ID not configured).');
    return;
  }
  try {
    await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, text, { parse_mode: 'Markdown' });
    console.log('📬 Telegram message sent successfully.');
  } catch (error) {
    console.error('❌ Failed to send Telegram message:', error.message);
  }
};

const sendTelegramPhoto = async (photoSource, caption) => {
  if (!bot || !process.env.TELEGRAM_CHAT_ID) {
    console.log('⚠️ Telegram photo not sent (bot or chat ID not configured).');
    return;
  }
  try {
    await bot.sendPhoto(process.env.TELEGRAM_CHAT_ID, photoSource, {
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

