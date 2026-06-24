require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

console.log('Token:', process.env.TELEGRAM_BOT_TOKEN);
console.log('Chat ID:', process.env.TELEGRAM_CHAT_ID);

if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
  console.error('Error: Token or Chat ID is missing in .env');
  process.exit(1);
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

async function test() {
  try {
    console.log('Sending test message to channel...');
    const result = await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, '🧪 Test message from Web Barber backend diagnostic script!', { parse_mode: 'Markdown' });
    console.log('Success! Message sent:', result.message_id);

    console.log('Sending test photo...');
    const photoPath = 'uploads/receipt-1780656569355-503118378.png';
    const photoResult = await bot.sendPhoto(process.env.TELEGRAM_CHAT_ID, photoPath, {
      caption: '🧪 Test receipt upload from backend!',
      parse_mode: 'Markdown'
    });
    console.log('Success! Photo sent:', photoResult.message_id);
  } catch (error) {
    console.error('Failed to send:', error);
  }
}

test();
