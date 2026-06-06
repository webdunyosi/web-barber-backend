const express = require('express');
const Appointment = require('../models/Appointment');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../config/storage');
const { sendTelegramPhoto } = require('../utils/telegram');

const router = express.Router();

// 1. GET /api/appointments/booked (Get booked slots for a specific date)
router.get('/booked', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Sana kiritilishi shart (sana formati: DD.MM.YYYY)' });
    }

    // Query appointments where date matches and status is NOT 'rejected'
    const appointments = await Appointment.find({
      date: date,
      status: { $ne: 'rejected' }
    });

    const bookedTimes = appointments.map(app => app.time);
    return res.json(bookedTimes);

  } catch (error) {
    console.error('Get booked slots error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 2. POST /api/appointments (Create Booking)
router.post('/', requireAuth, upload.single('receipt'), async (req, res) => {
  try {
    const { name, phone, telegram_user, serviceName, servicePrice, date, time } = req.body;
    const file = req.file;

    if (!name || !phone || !serviceName || !servicePrice || !date || !time) {
      return res.status(400).json({ error: 'Barcha maydonlar to\'ldirilishi shart' });
    }

    if (!file) {
      return res.status(400).json({ error: 'To\'lov cheki yuklanishi shart' });
    }

    // Determine the photo URL to save and send
    const receiptUrl = file.path.startsWith('http')
      ? file.path
      : `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

    // Create and save new Appointment linked to user ID
    const newAppointment = new Appointment({
      name,
      phone,
      telegram_user: telegram_user ? telegram_user.replace(/^@/, '') : '',
      serviceName,
      servicePrice: Number(servicePrice),
      date,
      time,
      receipt: receiptUrl,
      userId: req.user._id
    });

    await newAppointment.save();

    // Prepare message caption for Telegram notification
    const priceFormatted = Number(servicePrice).toLocaleString('uz-UZ');
    const cleanTelegram = telegram_user ? telegram_user.replace(/^@/, '') : '';
    const telegramDisplay = cleanTelegram ? `@${cleanTelegram}` : 'mavjud emas';

    const caption = `🧾 *Yangi To'lov & Buyurtma!*\n\n👤 *Mijoz:* ${name}\n📱 *Telefon:* ${phone}\n📱 *Telegram:* ${telegramDisplay}\n\n💈 *Xizmat:* ${serviceName}\n💰 *Narx:* ${priceFormatted} so'm\n📅 *Sana:* ${date}\n🕐 *Vaqt:* ${time}\n\n⚠️ _To'lov chekini tasdiqlash uchun admin panelga kiring!_`;

    // Send Telegram photo (using local file path if local fallback, URL if Cloudinary)
    // Note: bot.sendPhoto supports file path stream for local files and URL strings for remote files.
    const photoSource = file.path.startsWith('http') ? file.path : file.path;
    await sendTelegramPhoto(photoSource, caption);

    return res.status(201).json({
      message: 'Buyurtma muvaffaqiyatli yaratildi va tasdiqlashga yuborildi',
      appointment: newAppointment
    });

  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 3. GET /api/appointments/my (Get logged-in user's appointments)
router.get('/my', requireAuth, async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.json(appointments);
  } catch (error) {
    console.error('Get my appointments error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

module.exports = router;
