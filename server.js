require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const TelegramBot = require('node-telegram-bot-api');

const Service = require('./models/Service');
const Appointment = require('./models/Appointment');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

// MongoDB ga ulanish
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB muvaffaqiyatli ulandi'))
  .catch(err => console.error('❌ MongoDB ulanishda xato:', err));

// Cloudinary sozlamalari
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'barber_receipts',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
  }
});
const upload = multer({ storage: storage });

// --- API ROUTELAR ---

// 1. Barcha xizmatlarni olish
app.get('/api/services', async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Band qilingan vaqtlarni olish (frontendda vaqtlarni o'chirib qo'yish uchun)
app.get('/api/appointments/booked', async (req, res) => {
  try {
    const { date } = req.query;
    const appointments = await Appointment.find({ date });
    const bookedTimes = appointments.map(app => app.time);
    res.json(bookedTimes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Yangi buyurtma yaratish (Rasmni qabul qilish)
app.post('/api/appointments', upload.single('receipt'), async (req, res) => {
  try {
    const { name, phone, telegram_user, serviceName, servicePrice, date, time } = req.body;
    
    // Cloudinary'dan qaytgan rasm manzili
    const receipt_url = req.file ? req.file.path : null;

    if (!receipt_url) {
      return res.status(400).json({ error: "To'lov cheki yuklanmadi" });
    }

    // Bazaga saqlash
    const newAppointment = new Appointment({
      name,
      phone,
      telegram_user,
      service: { name: serviceName, price: servicePrice },
      date,
      time,
      receipt_url
    });

    await newAppointment.save();

    // Telegram adminga xabar va rasmni yuborish
    const message = `
🎉 *Yangi buyurtma va to'lov!*

👤 *Mijoz:* ${name}
📱 *Tel:* ${phone}
✈️ *Tg user:* ${telegram_user || "Kiritilmagan"}

💈 *Xizmat:* ${serviceName}
💰 *Narxi:* ${servicePrice} so'm
📅 *Sana:* ${date}
🕐 *Vaqt:* ${time}
    `;

    // Telegramga rasmni va textni yuboramiz
    await bot.sendPhoto(process.env.TELEGRAM_CHAT_ID, receipt_url, { 
      caption: message, 
      parse_mode: 'Markdown' 
    });

    res.status(201).json({ message: 'Buyurtma muvaffaqiyatli qabul qilindi', appointment: newAppointment });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server ${PORT}-portda ishlamoqda`));