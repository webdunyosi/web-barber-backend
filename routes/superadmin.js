const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const BlockedSchedule = require('../models/BlockedSchedule');
const OfflineIncome = require('../models/OfflineIncome');
const Notification = require('../models/Notification');
const SubscriptionPayment = require('../models/SubscriptionPayment');
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
    const barbers = await User.find({ role: 'barber' }).select('-password');
    return res.json(barbers);
  } catch (error) {
    console.error('List barbers error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 2. POST /api/superadmin/barbers (Register new barber)
router.post('/barbers', async (req, res) => {
  try {
    const { name, phone, password, slug, shopName, title, description, telegram, instagram, facebook, youtube, experienceStartYear, experienceYears } = req.body;

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
      role: 'barber',
      status: 'active',
      slug: cleanSlug,
      shopName: shopName.trim(),
      title: (title || 'Professional Barber').trim(),
      description: (description || '').trim(),
      telegram: cleanTelegram,
      instagram: (instagram || '').trim(),
      facebook: (facebook || '').trim(),
      youtube: (youtube || '').trim(),
      experienceStartYear: Number(experienceStartYear) || 2011,
      experienceYears: Number(experienceYears) || 15
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
      title: newBarber.title,
      description: newBarber.description,
      telegram: newBarber.telegram,
      instagram: newBarber.instagram,
      facebook: newBarber.facebook,
      youtube: newBarber.youtube,
      experienceStartYear: newBarber.experienceStartYear,
      experienceYears: newBarber.experienceYears,
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
    const { name, phone, password, slug, shopName, title, description, telegram, instagram, facebook, youtube, experienceStartYear, experienceYears, status } = req.body;

    const barber = await User.findById(id);
    if (!barber || barber.role !== 'barber') {
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
    if (title !== undefined) barber.title = title.trim();
    if (description !== undefined) barber.description = description.trim();
    if (status !== undefined) barber.status = status;

    if (telegram !== undefined) {
      let cleanTelegram = telegram.trim();
      if (cleanTelegram.startsWith('@')) {
        cleanTelegram = cleanTelegram.substring(1);
      }
      barber.telegram = cleanTelegram;
    }

    if (instagram !== undefined) barber.instagram = instagram.trim();
    if (facebook !== undefined) barber.facebook = facebook.trim();
    if (youtube !== undefined) barber.youtube = youtube.trim();
    if (experienceStartYear !== undefined) barber.experienceStartYear = Number(experienceStartYear) || 2011;
    if (experienceYears !== undefined) barber.experienceYears = Number(experienceYears) || 15;

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
      title: barber.title,
      description: barber.description,
      telegram: barber.telegram,
      instagram: barber.instagram,
      facebook: barber.facebook,
      youtube: barber.youtube,
      experienceStartYear: barber.experienceStartYear,
      experienceYears: barber.experienceYears,
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

// Recalculate barber's subscription expires at based on payments
async function updateBarberSubscriptionStatus(barberId) {
  const payments = await SubscriptionPayment.find({ barberId });
  if (payments.length === 0) {
    await User.findByIdAndUpdate(barberId, { subscriptionExpiresAt: null });
    return;
  }
  const maxToDate = new Date(Math.max(...payments.map(p => new Date(p.toDate).getTime())));
  await User.findByIdAndUpdate(barberId, { subscriptionExpiresAt: maxToDate });
}

// 6. GET /api/superadmin/payments (List all subscription payments)
router.get('/payments', async (req, res) => {
  try {
    const payments = await SubscriptionPayment.find()
      .populate('barberId', 'name phone slug shopName')
      .sort({ createdAt: -1 });
    return res.json(payments);
  } catch (error) {
    console.error('List payments error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 7. POST /api/superadmin/payments (Create a new payment record)
router.post('/payments', async (req, res) => {
  try {
    const { barberId, amount, monthsCount, fromDate, toDate, receiptUrl, notes } = req.body;

    if (!barberId || !amount || !monthsCount || !fromDate || !toDate) {
      return res.status(400).json({ error: 'Barcha majburiy maydonlarni to\'ldiring' });
    }

    const newPayment = new SubscriptionPayment({
      barberId,
      amount,
      monthsCount,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      receiptUrl,
      notes
    });

    await newPayment.save();
    await updateBarberSubscriptionStatus(barberId);

    return res.status(201).json(newPayment);
  } catch (error) {
    console.error('Create payment error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 8. PUT /api/superadmin/payments/:id (Update a payment record)
router.put('/payments/:id', async (req, res) => {
  try {
    const { amount, monthsCount, fromDate, toDate, receiptUrl, notes } = req.body;
    const payment = await SubscriptionPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'To\'lov topilmadi' });
    }

    payment.amount = amount ?? payment.amount;
    payment.monthsCount = monthsCount ?? payment.monthsCount;
    payment.fromDate = fromDate ? new Date(fromDate) : payment.fromDate;
    payment.toDate = toDate ? new Date(toDate) : payment.toDate;
    payment.receiptUrl = receiptUrl ?? payment.receiptUrl;
    payment.notes = notes ?? payment.notes;

    await payment.save();
    await updateBarberSubscriptionStatus(payment.barberId);

    return res.json(payment);
  } catch (error) {
    console.error('Update payment error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 9. DELETE /api/superadmin/payments/:id (Delete a payment record)
router.delete('/payments/:id', async (req, res) => {
  try {
    const payment = await SubscriptionPayment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ error: 'To\'lov topilmadi' });
    }

    const barberId = payment.barberId;
    await SubscriptionPayment.findByIdAndDelete(req.params.id);
    await updateBarberSubscriptionStatus(barberId);

    return res.json({ message: 'To\'lov o\'chirildi' });
  } catch (error) {
    console.error('Delete payment error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

module.exports = router;
