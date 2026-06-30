const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const BlockedSchedule = require('../models/BlockedSchedule');
const OfflineIncome = require('../models/OfflineIncome');
const Notification = require('../models/Notification');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

// Helper to normalize phone
function formatUzbekPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/[^\d]/g, '');
  let cleanDigits = digits;
  if (digits.length === 9) {
    cleanDigits = '998' + digits;
  }
  if (cleanDigits.length === 12 && cleanDigits.startsWith('998')) {
    return `+998 ${cleanDigits.slice(3, 5)} ${cleanDigits.slice(5, 8)} ${cleanDigits.slice(8, 10)} ${cleanDigits.slice(10, 12)}`;
  }
  return phone;
}

// 1. GET /api/superadmin/barbers (List all barbers)
router.get('/barbers', async (req, res) => {
  try {
    const barbers = await User.find({ role: 'admin' }).select('-password');
    return res.json(barbers);
  } catch (error) {
    console.error('List barbers error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 2. POST /api/superadmin/barbers (Register new barber)
router.post('/barbers', async (req, res) => {
  try {
    const { name, phone, password, slug, shopName, description, telegram } = req.body;

    if (!name || !phone || !password || !slug || !shopName) {
      return res.status(400).json({ error: 'Ism, telefon, parol, slug va salon nomi kiritilishi majburiy' });
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (!cleanSlug) {
      return res.status(400).json({ error: 'Slug yaroqsiz' });
    }

    const formattedPhone = formatUzbekPhone(phone);

    // Check unique phone
    const phoneExists = await User.findOne({ phone: formattedPhone });
    if (phoneExists) {
      return res.status(400).json({ error: 'Ushbu telefon raqamli foydalanuvchi allaqachon ro\'yxatdan o\'tgan' });
    }

    // Check unique slug
    const slugExists = await User.findOne({ slug: cleanSlug });
    if (slugExists) {
      return res.status(400).json({ error: 'Ushbu URL manzili (slug) allaqachon band qilingan' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let cleanTelegram = telegram || '';
    if (cleanTelegram.startsWith('@')) {
      cleanTelegram = cleanTelegram.substring(1);
    }
    cleanTelegram = cleanTelegram.trim();

    const newBarber = new User({
      name: name.trim(),
      phone: formattedPhone,
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      slug: cleanSlug,
      shopName: shopName.trim(),
      description: (description || '').trim(),
      telegram: cleanTelegram
    });

    await newBarber.save();

    // Auto-seed default services for this barber so they don't start empty!
    const defaultServices = [
      { id: 1, name: 'Soch olish', name_en: 'Haircut', price: 100000, duration: 30, image_url: '/styles/1.png', barberId: newBarber._id },
      { id: 2, name: 'Soqol olish', name_en: 'Beard Trim', price: 70000, duration: 20, image_url: '/styles/2.png', barberId: newBarber._id },
      { id: 3, name: 'Soch + Soqol', name_en: 'Haircut + Beard', price: 150000, duration: 45, image_url: '/styles/3.png', barberId: newBarber._id }
    ];
    await Service.insertMany(defaultServices);

    return res.status(201).json({
      id: newBarber._id,
      name: newBarber.name,
      phone: newBarber.phone,
      slug: newBarber.slug,
      shopName: newBarber.shopName,
      description: newBarber.description,
      telegram: newBarber.telegram,
      status: newBarber.status
    });

  } catch (error) {
    console.error('Create barber error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 3. PUT /api/superadmin/barbers/:id (Update barber)
router.put('/barbers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, password, slug, shopName, description, telegram, status } = req.body;

    const barber = await User.findById(id);
    if (!barber || barber.role !== 'admin') {
      return res.status(404).json({ error: 'Sartarosh topilmadi' });
    }

    if (phone && phone !== barber.phone) {
      const formattedPhone = formatUzbekPhone(phone);
      const phoneExists = await User.findOne({ phone: formattedPhone });
      if (phoneExists) {
        return res.status(400).json({ error: 'Ushbu telefon raqami allaqachon ro\'yxatdan o\'tgan' });
      }
      barber.phone = formattedPhone;
    }

    if (slug && slug !== barber.slug) {
      const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
      const slugExists = await User.findOne({ slug: cleanSlug });
      if (slugExists) {
        return res.status(400).json({ error: 'Ushbu URL manzili (slug) allaqachon band qilingan' });
      }
      barber.slug = cleanSlug;
    }

    if (name !== undefined) barber.name = name.trim();
    if (shopName !== undefined) barber.shopName = shopName.trim();
    if (description !== undefined) barber.description = description.trim();
    if (status !== undefined) barber.status = status;

    if (telegram !== undefined) {
      let cleanTelegram = telegram.trim();
      if (cleanTelegram.startsWith('@')) {
        cleanTelegram = cleanTelegram.substring(1);
      }
      barber.telegram = cleanTelegram;
    }

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      barber.password = await bcrypt.hash(password, salt);
    }

    await barber.save();

    return res.json({
      id: barber._id,
      name: barber.name,
      phone: barber.phone,
      slug: barber.slug,
      shopName: barber.shopName,
      description: barber.description,
      telegram: barber.telegram,
      status: barber.status
    });

  } catch (error) {
    console.error('Update barber error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 4. DELETE /api/superadmin/barbers/:id (Delete barber)
router.delete('/barbers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const barber = await User.findById(id);
    if (!barber || barber.role !== 'admin') {
      return res.status(404).json({ error: 'Sartarosh topilmadi' });
    }

    await User.findByIdAndDelete(id);

    // Cleanup associated data
    await Service.deleteMany({ barberId: id });
    await Appointment.deleteMany({ barberId: id });
    await BlockedSchedule.deleteMany({ barberId: id });
    await OfflineIncome.deleteMany({ barberId: id });
    await Notification.deleteMany({ barberId: id });

    return res.json({ message: 'Sartarosh va unga tegishli barcha ma\'lumotlar muvaffaqiyatli o\'chirildi' });

  } catch (error) {
    console.error('Delete barber error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 5. GET /api/superadmin/stats (Platform global stats)
router.get('/stats', async (req, res) => {
  try {
    const barbersCount = await User.countDocuments({ role: 'admin' });
    const clientsCount = await User.countDocuments({ role: 'user' });
    const appointmentsCount = await Appointment.countDocuments();

    // Get total revenue (completed card payments)
    const appointments = await Appointment.find({ status: 'confirmed' });
    const revenue = appointments.reduce((sum, app) => sum + (app.servicePrice || 0), 0);

    return res.json({
      barbersCount,
      clientsCount,
      appointmentsCount,
      revenue
    });
  } catch (error) {
    console.error('Superadmin stats error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

module.exports = router;
