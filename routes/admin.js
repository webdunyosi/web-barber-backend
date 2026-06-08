const express = require('express');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { sendTelegramMessage } = require('../utils/telegram');

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

    // Send Telegram Notification
    const telegramMsg = `🗑 *Foydalanuvchi o'chirildi!*\n\n👤 *Ismi:* ${user.name}\n📱 *Telefon:* ${user.phone}`;
    await sendTelegramMessage(telegramMsg);

    return res.json({ message: 'Foydalanuvchi muvaffaqiyatli o\'chirildi' });

  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 4. GET /api/admin/bookings (List Bookings)
router.get('/bookings', async (req, res) => {
  try {
    const bookings = await Appointment.find()
      .populate('userId', 'name phone telegram role status')
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

    const booking = await Appointment.findByIdAndUpdate(id, { status }, { new: true });

    if (!booking) {
      return res.status(404).json({ error: 'Buyurtma topilmadi' });
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

// 6. GET /api/admin/statistics (Financial & Business Stats)
router.get('/statistics', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' });
    const totalUsers = users.length;
    const blockedUsers = users.filter(u => u.status === 'blocked').length;

    const bookings = await Appointment.find();
    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
    const confirmedBookingsCount = confirmedBookings.length;

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

    // Revenue calculations (confirmed bookings only) based on booking date
    const dailyRevenue = confirmedBookings
      .filter(b => {
        const bDate = parseBookingDate(b.date);
        return bDate.toDateString() === today.toDateString();
      })
      .reduce((sum, b) => sum + b.servicePrice, 0);

    const weeklyRevenue = confirmedBookings
      .filter(b => {
        const bDate = parseBookingDate(b.date);
        // Include bookings from 7 days ago until today
        return bDate >= sevenDaysAgo && bDate <= today;
      })
      .reduce((sum, b) => sum + b.servicePrice, 0);

    const monthlyRevenue = confirmedBookings
      .filter(b => {
        const bDate = parseBookingDate(b.date);
        // Include bookings from 30 days ago until today
        return bDate >= thirtyDaysAgo && bDate <= today;
      })
      .reduce((sum, b) => sum + b.servicePrice, 0);

    const totalRevenue = confirmedBookings
      .reduce((sum, b) => sum + b.servicePrice, 0);

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

      // Sum confirmed revenue for this date string
      const value = confirmedBookings
        .filter(b => b.date === dbDateString)
        .reduce((sum, b) => sum + b.servicePrice, 0);

      chartData.push({
        label: dayLabel,
        value: value
      });
    }

    return res.json({
      revenues: {
        daily: dailyRevenue,
        weekly: weeklyRevenue,
        monthly: monthlyRevenue,
        total: totalRevenue
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

module.exports = router;
