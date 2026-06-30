const express = require('express');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const OfflineIncome = require('../models/OfflineIncome');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sendTelegramMessage } = require('../utils/telegram');
const bcrypt = require('bcryptjs');
const BlockedSchedule = require('../models/BlockedSchedule');
const Service = require('../models/Service');
const { upload } = require('../config/storage');
const { autoRejectPastAppointments } = require('../utils/appointmentHelper');

const router = express.Router();

// Apply auth and admin check middlewares to all endpoints in this router
router.use(requireAuth, requireAdmin);

// 1. GET /api/admin/users (List Users)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password');
    return res.json(users);
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 1b. POST /api/admin/users (Create a new user/client)
router.post('/users', async (req, res) => {
  try {
    const { name, phone, telegram, loyaltyStamps, status, role, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Ism, telefon raqami va parol majburiy' });
    }

    // Normalize Uzbek phone number
    const digits = phone.replace(/[^\d]/g, '');
    let cleanDigits = digits;
    if (digits.length === 9) {
      cleanDigits = '998' + digits;
    }
    let formattedPhone = phone;
    if (cleanDigits.length === 12 && cleanDigits.startsWith('998')) {
      formattedPhone = `+998 ${cleanDigits.slice(3, 5)} ${cleanDigits.slice(5, 8)} ${cleanDigits.slice(8, 10)} ${cleanDigits.slice(10, 12)}`;
    }

    // Verify unique phone
    const existingUser = await User.findOne({ phone: formattedPhone });
    if (existingUser) {
      return res.status(400).json({ error: 'Bu telefon raqami allaqachon ro\'yxatdan o\'tgan' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Normalize telegram name
    let cleanTelegram = telegram || '';
    if (cleanTelegram.startsWith('@')) {
      cleanTelegram = cleanTelegram.substring(1);
    }
    cleanTelegram = cleanTelegram.trim();

    // Create user
    const newUser = new User({
      name: name.trim(),
      phone: formattedPhone,
      telegram: cleanTelegram,
      loyaltyStamps: loyaltyStamps || 0,
      status: status || 'active',
      role: role || 'user',
      password: hashedPassword
    });

    await newUser.save();

    return res.status(201).json({
      id: newUser._id,
      name: newUser.name,
      phone: newUser.phone,
      telegram: newUser.telegram,
      role: newUser.role,
      status: newUser.status,
      loyaltyStamps: newUser.loyaltyStamps
    });

  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 2. PUT /api/admin/users/:id/block (Block/Unblock User)
router.put('/users/:id/block', async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    if (isBlocked === undefined) {
      return res.status(400).json({ error: 'isBlocked maydoni majburiy' });
    }

    const newStatus = isBlocked ? 'blocked' : 'active';
    const user = await User.findByIdAndUpdate(id, { status: newStatus }, { new: true });

    if (!user) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    }

    // Send Telegram Notification
    const telegramMsg = `🔒 *Foydalanuvchi holati o'zgardi!*\n\n👤 *Foydalanuvchi:* ${user.name}\n📱 *Telefon:* ${user.phone}\n🛑 *Holati:* ${isBlocked ? 'BLOKLANDI 🚫' : 'FAOL QILINDI ✅'}`;
    await sendTelegramMessage(telegramMsg);

    return res.json({ message: `Foydalanuvchi holati o'zgartirildi: ${newStatus}`, user });

  } catch (error) {
    console.error('Block user error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 3. DELETE /api/admin/users/:id (Delete User)
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    }

    // Delete all bookings associated with this user
    await Appointment.deleteMany({ userId: id });

    // Send Telegram Notification
    const telegramMsg = `🗑 *Foydalanuvchi o'chirildi!*\n\n👤 *Ismi:* ${user.name}\n📱 *Telefon:* ${user.phone}\n📅 *Status:* Barcha buyurtmalari ham o'chirildi`;
    await sendTelegramMessage(telegramMsg);

    return res.json({ message: 'Foydalanuvchi va uning buyurtmalari muvaffaqiyatli o\'chirildi' });

  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// PUT /api/admin/users/:id (Update/Edit User details)
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, telegram, loyaltyStamps, role, status, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    }

    // Check phone number uniqueness if it's changing
    if (phone && phone !== user.phone) {
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({ error: 'Bu telefon raqamli foydalanuvchi allaqachon mavjud' });
      }
      user.phone = phone;
    }

    if (name !== undefined) user.name = name;
    
    if (telegram !== undefined) {
      // Strip @ if present
      let cleanTelegram = telegram.trim();
      if (cleanTelegram.startsWith('@')) {
        cleanTelegram = cleanTelegram.substring(1);
      }
      user.telegram = cleanTelegram;
    }
    
    if (loyaltyStamps !== undefined) {
      const stamps = Number(loyaltyStamps);
      if (!isNaN(stamps) && stamps >= 0 && stamps <= 9) {
        user.loyaltyStamps = stamps;
      } else {
        return res.status(400).json({ error: 'Loyalty markalari 0 va 9 oralig\'ida bo\'lishi lozim' });
      }
    }

    if (role !== undefined && ['user', 'admin'].includes(role)) {
      user.role = role;
    }

    if (status !== undefined && ['active', 'blocked'].includes(status)) {
      user.status = status;
    }

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    // Send Telegram Notification
    const telegramMsg = `📝 *Foydalanuvchi ma'lumotlari tahrirlandi!*\n\n👤 *Foydalanuvchi:* ${user.name}\n📱 *Telefon:* ${user.phone}\n✈️ *Telegram:* @${user.telegram || '-'}\n🏅 *Sodiqlik markalari:* ${user.loyaltyStamps || 0}\n🛑 *Holati:* ${user.status === 'blocked' ? 'Bloklangan 🚫' : 'Faol ✅'}\n🔑 *Roli:* ${user.role}`;
    await sendTelegramMessage(telegramMsg);

    return res.json({ message: 'Foydalanuvchi muvaffaqiyatli tahrirlandi', user });

  } catch (error) {
    console.error('Edit user error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 4. GET /api/admin/bookings (List Bookings)
router.get('/bookings', async (req, res) => {
  try {
    // Auto-reject past pending appointments first
    await autoRejectPastAppointments();

    const bookings = await Appointment.find({ barberId: req.user._id })
      .populate('userId', 'name phone telegram role status loyaltyStamps loyaltyStampsMap')
      .sort({ createdAt: -1 });
    return res.json(bookings);
  } catch (error) {
    console.error('List bookings error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 5. PUT /api/admin/bookings/:id (Confirm/Reject Booking)
router.put('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['confirmed', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Yaroqsiz holat. Faqat "confirmed" yoki "rejected" bo\'lishi mumkin' });
    }

    const booking = await Appointment.findOne({ _id: id, barberId: req.user._id });

    if (!booking) {
      return res.status(404).json({ error: 'Buyurtma topilmadi' });
    }

    const previousStatus = booking.status;
    booking.status = status;
    await booking.save();

    // Loyalty program stamp management (scoped by barberId)
    const barberIdStr = req.user._id.toString();
    if (status === 'confirmed' && previousStatus !== 'confirmed') {
      const user = await User.findById(booking.userId);
      if (user && user.role === 'user') {
        const currentStamps = user.loyaltyStampsMap.get(barberIdStr) || 0;
        let newStamps = 0;
        if (booking.isFree) {
          newStamps = 0; // 10th free visit completed, reset to 0
        } else {
          newStamps = Math.min(currentStamps + 1, 9);
        }
        user.loyaltyStampsMap.set(barberIdStr, newStamps);
        user.loyaltyStamps = newStamps;
        await user.save();
      }
    } else if (status !== 'confirmed' && previousStatus === 'confirmed') {
      const user = await User.findById(booking.userId);
      if (user && user.role === 'user') {
        const currentStamps = user.loyaltyStampsMap.get(barberIdStr) || 0;
        let newStamps = 0;
        if (booking.isFree) {
          newStamps = 9; // free visit cancelled/rejected, restore to 9 stamps
        } else {
          newStamps = Math.max(currentStamps - 1, 0);
        }
        user.loyaltyStampsMap.set(barberIdStr, newStamps);
        user.loyaltyStamps = newStamps;
        await user.save();
      }
    }

    // Send Telegram Notification
    const telegramMsg = `📢 *Buyurtma holati o'zgardi!*\n\n👤 *Mijoz:* ${booking.name}\n📱 *Telefon:* ${booking.phone}\n💈 *Xizmat:* ${booking.serviceName}\n📅 *Sana/Vaqt:* ${booking.date} soat ${booking.time}\n🛑 *Holat:* *${status === 'confirmed' ? 'TASDIQLANDI ✅' : 'RAD ETILDI ❌'}*`;
    await sendTelegramMessage(telegramMsg);

    return res.json({ message: `Buyurtma holati o'zgartirildi: ${status}`, booking });

  } catch (error) {
    console.error('Update booking status error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// DELETE /api/admin/bookings/:id (Delete Booking)
router.delete('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Appointment.findOne({ _id: id, barberId: req.user._id });

    if (!booking) {
      return res.status(404).json({ error: 'Buyurtma topilmadi' });
    }

    // If deleting a confirmed booking, revert the stamp/points (scoped by barberId)
    if (booking.status === 'confirmed') {
      const user = await User.findById(booking.userId);
      if (user && user.role === 'user') {
        const barberIdStr = req.user._id.toString();
        const currentStamps = user.loyaltyStampsMap.get(barberIdStr) || 0;
        let newStamps = 0;
        if (booking.isFree) {
          newStamps = 9;
        } else {
          newStamps = Math.max(currentStamps - 1, 0);
        }
        user.loyaltyStampsMap.set(barberIdStr, newStamps);
        user.loyaltyStamps = newStamps;
        await user.save();
      }
    }

    await Appointment.findByIdAndDelete(id);

    // Send Telegram Notification
    const telegramMsg = `🗑 *Buyurtma o'chirildi!*\n\n👤 *Mijoz:* ${booking.name}\n📱 *Telefon:* ${booking.phone}\n💈 *Xizmat:* ${booking.serviceName}\n📅 *Sana/Vaqt:* ${booking.date} soat ${booking.time}`;
    await sendTelegramMessage(telegramMsg);

    return res.json({ message: 'Buyurtma muvaffaqiyatli o\'chirildi' });

  } catch (error) {
    console.error('Delete booking error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// GET /api/admin/offline-income/:date (Get offline income for a date)
router.get('/offline-income/:date', async (req, res) => {
  try {
    const { date } = req.params; // Format: "DD.MM.YYYY"
    const doc = await OfflineIncome.findOne({ date, barberId: req.user._id });
    return res.json({ date, amount: doc ? doc.amount : 0 });
  } catch (error) {
    console.error('Get offline income error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// POST /api/admin/offline-income (Set/Update offline income for a date)
router.post('/offline-income', async (req, res) => {
  try {
    const { date, amount } = req.body; // e.g. date: "06.06.2026", amount: 150000
    if (!date || amount === undefined) {
      return res.status(400).json({ error: 'Sana va miqdor majburiy' });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ error: 'Noto\'g\'ri miqdor kiritildi' });
    }

    const doc = await OfflineIncome.findOneAndUpdate(
      { date, barberId: req.user._id },
      { amount: numericAmount, barberId: req.user._id },
      { new: true, upsert: true }
    );

    return res.json({ message: 'Kassa muvaffaqiyatli saqlandi', offlineIncome: doc });
  } catch (error) {
    console.error('Set offline income error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 6. GET /api/admin/statistics (Financial & Business Stats)
router.get('/statistics', async (req, res) => {
  try {
    const bookings = await Appointment.find({ barberId: req.user._id });
    const clientIds = [...new Set(bookings.map(b => b.userId.toString()))];
    const users = await User.find({ _id: { $in: clientIds }, role: 'user' });
    
    const totalUsers = users.length;
    const blockedUsers = users.filter(u => u.status === 'blocked').length;

    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const confirmedBookingsCount = confirmedBookings.length;

    const offlineIncomes = await OfflineIncome.find({ barberId: req.user._id });

    // Helper to parse "DD.MM.YYYY" to Date object
    const parseBookingDate = (dateStr) => {
      if (!dateStr) return new Date(0);
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-based month
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
      return new Date(0);
    };

    // Calculate dates normalized to midnight (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Online Revenue calculations (confirmed bookings only) based on booking date
    const onlineDailyRevenue = confirmedBookings
      .filter(b => {
        const bDate = parseBookingDate(b.date);
        return bDate.toDateString() === today.toDateString();
      })
      .reduce((sum, b) => sum + b.servicePrice, 0);

    const onlineWeeklyRevenue = confirmedBookings
      .filter(b => {
        const bDate = parseBookingDate(b.date);
        // Include bookings from 7 days ago until today
        return bDate >= sevenDaysAgo && bDate <= today;
      })
      .reduce((sum, b) => sum + b.servicePrice, 0);

    const onlineMonthlyRevenue = confirmedBookings
      .filter(b => {
        const bDate = parseBookingDate(b.date);
        // Include bookings from 30 days ago until today
        return bDate >= thirtyDaysAgo && bDate <= today;
      })
      .reduce((sum, b) => sum + b.servicePrice, 0);

    const onlineTotalRevenue = confirmedBookings
      .reduce((sum, b) => sum + b.servicePrice, 0);

    // Offline Revenue calculations
    const offlineDailyRevenue = offlineIncomes
      .filter(o => {
        const oDate = parseBookingDate(o.date);
        return oDate.toDateString() === today.toDateString();
      })
      .reduce((sum, o) => sum + o.amount, 0);

    const offlineWeeklyRevenue = offlineIncomes
      .filter(o => {
        const oDate = parseBookingDate(o.date);
        return oDate >= sevenDaysAgo && oDate <= today;
      })
      .reduce((sum, o) => sum + o.amount, 0);

    const offlineMonthlyRevenue = offlineIncomes
      .filter(o => {
        const oDate = parseBookingDate(o.date);
        return oDate >= thirtyDaysAgo && oDate <= today;
      })
      .reduce((sum, o) => sum + o.amount, 0);

    const offlineTotalRevenue = offlineIncomes
      .reduce((sum, o) => sum + o.amount, 0);

    // Popular services: group, count, aggregate confirmed revenue, sort descending by count
    const serviceMap = {};
    bookings.forEach(b => {
      const sName = b.serviceName;
      if (!serviceMap[sName]) {
        serviceMap[sName] = { serviceName: sName, bookingCount: 0, totalConfirmedRevenue: 0 };
      }
      serviceMap[sName].bookingCount += 1;
      if (b.status === 'confirmed') {
        serviceMap[sName].totalConfirmedRevenue += b.servicePrice;
      }
    });
    const popularServices = Object.values(serviceMap)
      .sort((a, b) => b.bookingCount - a.bookingCount);

    // 7-day chart data: last 7 dates from today (chronological order)
    const chartData = [];
    const dayNamesUz = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);

      // format to DD.MM.YYYY matching database values
      const dayStr = String(d.getDate()).padStart(2, '0');
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      const yearStr = d.getFullYear();
      const dbDateString = `${dayStr}.${monthStr}.${yearStr}`;

      // label: e.g. "Jum 05.06"
      const dayLabel = `${dayNamesUz[d.getDay()]} ${dayStr}.${monthStr}`;

      // Sum confirmed online revenue for this date string
      const onlineValue = confirmedBookings
        .filter(b => b.date === dbDateString)
        .reduce((sum, b) => sum + b.servicePrice, 0);

      // Sum offline revenue for this date string
      const offlineDoc = offlineIncomes.find(o => o.date === dbDateString);
      const offlineValue = offlineDoc ? offlineDoc.amount : 0;

      chartData.push({
        label: dayLabel,
        value: onlineValue + offlineValue,
        onlineValue: onlineValue,
        offlineValue: offlineValue
      });
    }

    return res.json({
      revenues: {
        daily: onlineDailyRevenue + offlineDailyRevenue,
        weekly: onlineWeeklyRevenue + offlineWeeklyRevenue,
        monthly: onlineMonthlyRevenue + offlineMonthlyRevenue,
        total: onlineTotalRevenue + offlineTotalRevenue
      },
      onlineRevenues: {
        daily: onlineDailyRevenue,
        weekly: onlineWeeklyRevenue,
        monthly: onlineMonthlyRevenue,
        total: onlineTotalRevenue
      },
      offlineRevenues: {
        daily: offlineDailyRevenue,
        weekly: offlineWeeklyRevenue,
        monthly: offlineMonthlyRevenue,
        total: offlineTotalRevenue
      },
      counts: {
        totalUsers,
        blockedUsers,
        totalBookings,
        pendingBookings,
        confirmedBookings: confirmedBookingsCount
      },
      popularServices,
      chartData
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// GET /api/admin/blocked-schedules (List all blocked dates/slots)
router.get('/blocked-schedules', async (req, res) => {
  try {
    const schedules = await BlockedSchedule.find({ barberId: req.user._id }).sort({ createdAt: -1 });
    return res.json(schedules);
  } catch (error) {
    console.error('List blocked schedules error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// POST /api/admin/blocked-schedules (Create or update blocked times for a date)
router.post('/blocked-schedules', async (req, res) => {
  try {
    const { date, blockedTimes, reason } = req.body;
    if (!date || !blockedTimes) {
      return res.status(400).json({ error: 'Sana va blocklangan vaqtlar majburiy' });
    }

    const schedule = await BlockedSchedule.findOneAndUpdate(
      { date, barberId: req.user._id },
      { blockedTimes, reason: reason || '', barberId: req.user._id },
      { new: true, upsert: true }
    );

    return res.json({ message: 'Ish grafigi muvaffaqiyatli saqlandi', schedule });
  } catch (error) {
    console.error('Save blocked schedule error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// DELETE /api/admin/blocked-schedules/by-date/:date (Remove blocking for a date)
router.delete('/blocked-schedules/by-date/:date', async (req, res) => {
  try {
    const { date } = req.params; // e.g. "06.06.2026"
    await BlockedSchedule.findOneAndDelete({ date, barberId: req.user._id });
    return res.json({ message: 'Sana blokdan chiqarildi' });
  } catch (error) {
    console.error('Delete blocked schedule error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 7. GET /api/admin/services (List all services - admin endpoint)
router.get('/services', async (req, res) => {
  try {
    const services = await Service.find({ barberId: req.user._id }).sort({ id: 1 });
    return res.json(services);
  } catch (error) {
    console.error('List services error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 8. POST /api/admin/services (Create a new service)
router.post('/services', upload.single('image'), async (req, res) => {
  try {
    const { name, name_en, price, duration, image_url } = req.body;
    const file = req.file;

    if (!name || !price || !duration) {
      return res.status(400).json({ error: 'Nomi, narxi va davomiyligi majburiy' });
    }

    let finalImageUrl = image_url || '/styles/1.png';
    if (file) {
      finalImageUrl = file.path.startsWith('http')
        ? file.path
        : `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    }

    // Auto-generate numeric id (scoped by barberId)
    const maxService = await Service.findOne({ barberId: req.user._id }).sort({ id: -1 });
    const nextId = maxService && maxService.id ? maxService.id + 1 : 1;

    const newService = new Service({
      id: nextId,
      name: name.trim(),
      name_en: name_en ? name_en.trim() : '',
      price: Number(price),
      duration: Number(duration),
      image_url: finalImageUrl,
      barberId: req.user._id
    });

    await newService.save();

    // Send Telegram Notification
    const telegramMsg = `💈 *Yangi xizmat qo'shildi!*\n\n Nomi: ${newService.name}\n Narxi: ${newService.price.toLocaleString()} so'm\n Davomiyligi: ${newService.duration} daqiqa`;
    await sendTelegramMessage(telegramMsg);

    return res.status(201).json(newService);
  } catch (error) {
    console.error('Create service error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 9. PUT /api/admin/services/:id (Update service by Mongoose ID)
router.put('/services/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, name_en, price, duration, image_url } = req.body;
    const file = req.file;

    const service = await Service.findOne({ _id: id, barberId: req.user._id });
    if (!service) {
      return res.status(404).json({ error: 'Xizmat topilmadi' });
    }

    if (name !== undefined) service.name = name.trim();
    if (name_en !== undefined) service.name_en = name_en.trim();
    if (price !== undefined) service.price = Number(price);
    if (duration !== undefined) service.duration = Number(duration);

    if (file) {
      service.image_url = file.path.startsWith('http')
        ? file.path
        : `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    } else if (image_url !== undefined) {
      service.image_url = image_url;
    }

    await service.save();

    // Send Telegram Notification
    const telegramMsg = `💈 *Xizmat ma'lumotlari tahrirlandi!*\n\n Nomi: ${service.name}\n Narxi: ${service.price.toLocaleString()} so'm\n Davomiyligi: ${service.duration} daqiqa`;
    await sendTelegramMessage(telegramMsg);

    return res.json(service);
  } catch (error) {
    console.error('Update service error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 10. DELETE /api/admin/services/:id (Delete service by Mongoose ID)
router.delete('/services/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findOneAndDelete({ _id: id, barberId: req.user._id });

    if (!service) {
      return res.status(404).json({ error: 'Xizmat topilmadi' });
    }

    // Send Telegram Notification
    const telegramMsg = `🗑 *Xizmat o'chirildi!*\n\n Nomi: ${service.name}`;
    await sendTelegramMessage(telegramMsg);

    return res.json({ message: 'Xizmat muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    console.error('Delete service error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

module.exports = router;
