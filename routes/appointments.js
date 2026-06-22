const express = require('express');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const BlockedSchedule = require('../models/BlockedSchedule');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../config/storage');
const { sendTelegramPhoto, sendTelegramMessage } = require('../utils/telegram');

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

    // Fetch blocked times for this date from BlockedSchedule
    const blockedDoc = await BlockedSchedule.findOne({ date });
    if (blockedDoc) {
      if (blockedDoc.blockedTimes.includes('ALL')) {
        // If ALL slots are blocked, return all possible slots as booked
        const allPossibleSlots = [
          "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
          "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", 
          "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", 
          "18:00", "18:30"
        ];
        return res.json(allPossibleSlots);
      } else {
        // Merge specific blocked slots
        blockedDoc.blockedTimes.forEach(time => {
          if (!bookedTimes.includes(time)) {
            bookedTimes.push(time);
          }
        });
      }
    }

    return res.json(bookedTimes);

  } catch (error) {
    console.error('Get booked slots error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 1b. GET /api/appointments/blocked-days (Get all dates where the entire day is blocked)
router.get('/blocked-days', async (req, res) => {
  try {
    const blockedDocs = await BlockedSchedule.find({ blockedTimes: 'ALL' });
    const blockedDates = blockedDocs.map(doc => doc.date);
    return res.json(blockedDates);
  } catch (error) {
    console.error('Get blocked days error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 2. POST /api/appointments (Create Booking)
router.post('/', requireAuth, upload.single('receipt'), async (req, res) => {
  try {
    const { name, phone, telegram_user, serviceName, servicePrice, date, time, paymentMethod } = req.body;
    const file = req.file;

    if (!name || !phone || !serviceName || !servicePrice || !date || !time) {
      return res.status(400).json({ error: 'Barcha maydonlar to\'ldirilishi shart' });
    }

    const user = await User.findById(req.user._id);
    const isFree = user && user.loyaltyStamps === 9;
    const isCash = paymentMethod === 'cash' || isFree;

    if (!isCash && !file) {
      return res.status(400).json({ error: 'To\'lov cheki yuklanishi shart' });
    }

    // Determine the photo URL to save and send if card payment
    let receiptUrl = '';
    if (file) {
      receiptUrl = file.path.startsWith('http')
        ? file.path
        : `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    }

    // Create and save new Appointment linked to user ID
    const newAppointment = new Appointment({
      name,
      phone,
      telegram_user: telegram_user ? telegram_user.replace(/^@/, '') : '',
      serviceName,
      servicePrice: isFree ? 0 : Number(servicePrice),
      date,
      time,
      paymentMethod: isFree ? 'cash' : (paymentMethod || 'card'),
      receipt: receiptUrl || undefined,
      userId: req.user._id,
      isFree: isFree
    });

    await newAppointment.save();

    // Prepare message caption for Telegram notification
    const finalPrice = isFree ? 0 : Number(servicePrice);
    const priceFormatted = finalPrice.toLocaleString('uz-UZ');
    const cleanTelegram = telegram_user ? telegram_user.replace(/^@/, '') : '';
    const telegramDisplay = cleanTelegram ? `@${cleanTelegram}` : 'mavjud emas';
    
    let methodDisplay = isCash ? '💵 Sartaroshga (Joyida)' : '💳 Karta orqali (Online)';
    if (isFree) {
      methodDisplay = '🎁 Bepul (Loyalty Card)';
    }

    const caption = `🧾 *Yangi Buyurtma & To'lov!*\n\n👤 *Mijoz:* ${name}\n📱 *Telefon:* ${phone}\n📱 *Telegram:* ${telegramDisplay}\n💳 *To'lov usuli:* ${methodDisplay}\n\n💈 *Xizmat:* ${serviceName}\n💰 *Narx:* ${isFree ? 'BEPUL 🎁' : priceFormatted + ' so\'m'}\n📅 *Sana:* ${date}\n🕐 *Vaqt:* ${time}\n\n` + 
      (isFree
        ? `✅ _Loyalty Card orqali 10-bepul xizmat! Tasdiqlash uchun admin panelga kiring!_`
        : (isCash 
            ? `✅ _Joyida to'lash tanlandi. Tasdiqlash uchun admin panelga kiring!_`
            : `⚠️ _To'lov chekini tasdiqlash uchun admin panelga kiring!_`));

    if (isCash || !file) {
      // Send plain text message if cash payment (no receipt photo)
      await sendTelegramMessage(caption);
    } else {
      // Send Telegram photo
      const photoSource = file.path.startsWith('http') ? file.path : file.path;
      await sendTelegramPhoto(photoSource, caption);

      // Delete local receipt file after sending to Telegram to save server space
      if (file.path && !file.path.startsWith('http')) {
        const fs = require('fs');
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            console.log('🗑️ Local receipt file deleted successfully after Telegram dispatch.');
          }
        } catch (err) {
          console.error('Failed to delete local receipt file:', err);
        }
      }
    }

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
