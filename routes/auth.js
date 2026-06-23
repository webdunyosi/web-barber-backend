const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { sendTelegramMessage } = require('../utils/telegram');

const router = express.Router();

// Helper to normalize and format Uzbek phone numbers to "+998 XX XXX XX XX"
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

// Generates JWT Token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'fallback_secret', {
    expiresIn: '30d'
  });
};

// 1. POST /api/auth/register (Register User)
router.post('/register', async (req, res) => {
  try {
    const { name, phone, telegram, password } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Ism, telefon raqami va parol majburiy' });
    }

    const formattedPhone = formatUzbekPhone(phone);

    // Verify unique phone
    const existingUser = await User.findOne({ phone: formattedPhone });
    if (existingUser) {
      return res.status(400).json({ error: 'Bu telefon raqami allaqachon ro\'yxatdan o\'tgan' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Normalize telegram name (strip @ if present)
    let cleanTelegram = telegram || '';
    if (cleanTelegram.startsWith('@')) {
      cleanTelegram = cleanTelegram.substring(1);
    }

    // Save user
    const newUser = new User({
      name,
      phone: formattedPhone,
      telegram: cleanTelegram,
      password: hashedPassword
    });

    await newUser.save();

    // Send Telegram Notification
    const telegramMsg = `👤 *Yangi Mijoz Ro'yxatdan O'tdi!*\n\n📝 *Ismi:* ${newUser.name}\n📱 *Telefon:* ${newUser.phone}\n✈️ *Telegram:* @${newUser.telegram || 'kiritilmagan'}\n📅 *Sana:* ${new Date().toLocaleDateString('uz-UZ')}`;
    await sendTelegramMessage(telegramMsg);

    const token = generateToken(newUser._id);

    return res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        phone: newUser.phone,
        telegram: newUser.telegram,
        role: newUser.role,
        status: newUser.status,
        loyaltyStamps: newUser.loyaltyStamps
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 2. POST /api/auth/login (Login User)
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Telefon raqam va parol majburiy' });
    }

    const formattedPhone = formatUzbekPhone(phone);

    // Find user by phone
    const user = await User.findOne({ phone: formattedPhone });
    if (!user) {
      return res.status(401).json({ error: 'Telefon raqami yoki parol noto\'g\'ri' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Telefon raqami yoki parol noto\'g\'ri' });
    }

    // Check user status
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Sizning profilingiz bloklangan! Sartarosh bilan bog\'laning.' });
    }

    const token = generateToken(user._id);

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        telegram: user.telegram,
        role: user.role,
        status: user.status,
        loyaltyStamps: user.loyaltyStamps
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 3. GET /api/auth/me (Get Profile)
router.get('/me', requireAuth, async (req, res) => {
  try {
    // req.user is populated by requireAuth middleware
    return res.json({
      id: req.user._id,
      name: req.user.name,
      phone: req.user.phone,
      telegram: req.user.telegram,
      role: req.user.role,
      status: req.user.status,
      loyaltyStamps: req.user.loyaltyStamps
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 4. PUT /api/auth/profile (Update Profile)
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, phone, telegram, password } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Ism kiritilishi majburiy' });
    }

    // Normalize telegram name (strip @ if present)
    let cleanTelegram = telegram || '';
    if (cleanTelegram.startsWith('@')) {
      cleanTelegram = cleanTelegram.substring(1);
    }
    cleanTelegram = cleanTelegram.trim();

    // Find and update user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    }

    // Update phone if provided
    if (phone !== undefined) {
      const trimmedPhone = phone.trim();
      if (trimmedPhone === '') {
        return res.status(400).json({ error: 'Telefon raqami bo\'sh bo\'lishi mumkin emas' });
      }
      const formattedPhone = formatUzbekPhone(trimmedPhone);
      if (formattedPhone !== user.phone) {
        // Verify unique phone
        const existingUser = await User.findOne({ phone: formattedPhone });
        if (existingUser) {
          return res.status(400).json({ error: 'Bu telefon raqami allaqachon ro\'yxatdan o\'tgan' });
        }
        user.phone = formattedPhone;
      }
    }

    user.name = name.trim();
    user.telegram = cleanTelegram;

    // Update password if provided
    if (password && password.trim() !== '') {
      if (password.length < 4) {
        return res.status(400).json({ error: 'Parol uzunligi kamida 4 ta belgidan iborat bo\'lishi kerak' });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }
    
    await user.save();

    return res.json({
      id: user._id,
      name: user.name,
      phone: user.phone,
      telegram: user.telegram,
      role: user.role,
      status: user.status,
      loyaltyStamps: user.loyaltyStamps
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

module.exports = router;

