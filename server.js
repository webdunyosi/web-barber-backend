require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const Service = require('./models/Service');
const Appointment = require('./models/Appointment');

const app = express();
app.use(cors());
app.use(express.json());

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB muvaffaqiyatli ulandi'))
  .catch(err => console.error('❌ MongoDB ulanishda xato:', err));

// Rasmni vaqtinchalik server (Render) xotirasida saqlab turish uchun multer sozlamasi
const upload = multer({ dest: 'uploads/' }); 

// --- API ROUTELAR ---

app.get('/api/services', async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ma'lum sanadagi band qilingan vaqtlarni olish (Frontendda vaqtlarni o'chirish uchun)
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

// Yangi buyurtma yaratish
app.post('/api/appointments', upload.single('receipt'), async (req, res) => {
  try {
    const { name, phone, telegram_user, serviceName, servicePrice, date, time } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "To'lov cheki yuklanmadi" });
    }

    // 1. Bazaga F AQAT sana va vaqtni saqlaymiz (Vaqtni band qilish uchun)
    const newAppointment = new Appointment({ date, time });
    await newAppointment.save();

    // 2. Telegramga xabar va rasmni yuboramiz
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

    // Multer rasmni uploads/ papkasiga saqlagan, uni bot orqali jo'natamiz
    await bot.sendPhoto(process.env.TELEGRAM_CHAT_ID, file.path, { 
      caption: message, 
      parse_mode: 'Markdown' 
    });

    // 3. Telegramga jo'natib bo'lgach, joyni band qilmasligi uchun rasmni serverdan o'chirib yuboramiz
    fs.unlinkSync(file.path); 

    res.status(201).json({ message: 'Buyurtma qabul qilindi va vaqt band qilindi' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Xatolik yuz berdi' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server ${PORT}-portda ishlamoqda`));