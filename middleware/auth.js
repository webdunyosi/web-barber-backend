const jwt = require('jsonwebtoken');
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Avtorizatsiyadan o\'tilmagan' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token topilmadi' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Sizning profilingiz bloklangan! Sartarosh bilan bog\'laning.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Yaroqsiz token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Avtorizatsiyadan o\'tilmagan' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Sizda ushbu amalni bajarish uchun ruxsat yo\'q' });
  }

  next();
};

module.exports = {
  requireAuth,
  requireAdmin
};
