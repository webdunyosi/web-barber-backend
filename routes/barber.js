const express = require('express');
const User = require('../models/User');

const router = express.Router();

// 1. GET /api/barbers (List all active barbers)
router.get('/', async (req, res) => {
  try {
    const barbers = await User.find({ role: 'admin', status: 'active' })
      .select('_id name slug shopName description avatar');
    return res.json(barbers);
  } catch (error) {
    console.error('Get public barbers error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// 2. GET /api/barbers/info/:slug (Get barber metadata by slug)
router.get('/info/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const barber = await User.findOne({ role: 'admin', slug: slug.toLowerCase(), status: 'active' })
      .select('_id name slug shopName description avatar phone telegram');

    if (!barber) {
      return res.status(404).json({ error: 'Sartarosh topilmadi' });
    }

    return res.json(barber);
  } catch (error) {
    console.error('Get barber by slug error:', error);
    return res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

module.exports = router;
