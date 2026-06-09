require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Service = require('./models/Service');

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads/ folder if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('📂 Local storage directory "uploads/" created.');
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

// Preserve original Service list endpoint
app.get('/api/services', async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin User Seeding
async function seedAdminUser() {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin', salt);
      const adminUser = new User({
        name: 'Alimardon (Admin)',
        phone: '+998 99 999 99 99',
        telegram: '',
        password: hashedPassword,
        role: 'admin',
        status: 'active'
      });
      await adminUser.save();
      console.log('👑 Admin user seeded successfully: +998 99 999 99 99 / admin');
    } else {
      console.log('👑 Admin user already exists.');
    }
  } catch (error) {
    console.error('❌ Error seeding admin user:', error.message);
  }
}

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB muvaffaqiyatli ulandi');
    await seedAdminUser();
  })
  .catch(err => console.error('❌ MongoDB ulanishda xato:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server ${PORT}-portda ishlamoqda`));