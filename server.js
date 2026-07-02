const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Service = require('./models/Service');
const { startAutoCancelJob } = require('./utils/autoCancelAppointments');

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const notificationsRoutes = require('./routes/notifications');
const superadminRoutes = require('./routes/superadmin');
const barberRoutes = require('./routes/barber');

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
app.use('/api/notifications', notificationsRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/barbers', barberRoutes);

// Preserve original Service list endpoint, scoped by barberId if provided
app.get('/api/services', async (req, res) => {
  try {
    const { barberId } = req.query;
    const filter = barberId ? { barberId } : {};
    const services = await Service.find(filter);
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Super Admin User Seeding
async function seedSuperAdminUser() {
  try {
    const superAdminExists = await User.findOne({ role: 'admin' });
    if (!superAdminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('superadmin', salt);
      const superAdminUser = new User({
        name: 'Tizim Super Admini',
        phone: '+998 99 888 88 88',
        telegram: '',
        password: hashedPassword,
        role: 'admin',
        status: 'active'
      });
      await superAdminUser.save();
      console.log('👑 Super Admin user seeded successfully: +998 99 888 88 88 / superadmin');
    } else {
      console.log('👑 Super Admin user already exists.');
    }
  } catch (error) {
    console.error('❌ Error seeding super admin user:', error.message);
  }
}

// Admin User Seeding
async function seedAdminUser() {
  try {
    const adminExists = await User.findOne({ role: 'barber' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin', salt);
      const adminUser = new User({
        name: 'Behruz',
        phone: '+998 99 999 99 99',
        telegram: 'webbarber',
        instagram: 'webbarber',
        facebook: 'webbarber',
        youtube: 'webbarber',
        password: hashedPassword,
        role: 'barber',
        status: 'active',
        slug: 'alimardon',
        shopName: 'Alimardon Barber Shop',
        avatar: '/barber/1.png',
        description: "Men 15 yildan beri sartaroshlik sohasida faoliyat yuritaman. Har bir mijozga professional yondashuv va sifatli xizmat ko'rsatish mening asosiy maqsadim. Zamonaviy va klassik stillarni birlashtirish orqali har bir mijozga o'ziga mos bo'lgan uslubni topib beraman.",
        experienceStartYear: 2011,
        experienceYears: 15
      });
      await adminUser.save();
      console.log('👑 Admin user seeded successfully: +998 99 999 99 99 / admin (slug: alimardon)');
    } else {
      let modified = false;
      if (!adminExists.instagram) { adminExists.instagram = 'webbarber'; modified = true; }
      if (!adminExists.facebook) { adminExists.facebook = 'webbarber'; modified = true; }
      if (!adminExists.youtube) { adminExists.youtube = 'webbarber'; modified = true; }
      if (!adminExists.telegram) { adminExists.telegram = 'webbarber'; modified = true; }
      if (adminExists.experienceStartYear !== 2011) { adminExists.experienceStartYear = 2011; modified = true; }
      if (adminExists.experienceYears !== 15) { adminExists.experienceYears = 15; modified = true; }
      if (adminExists.avatar === '/avatar/men.png') { adminExists.avatar = '/barber/1.png'; modified = true; }
      if (adminExists.name === 'Alimardon (Admin)') { adminExists.name = 'Behruz'; modified = true; }
      if (adminExists.description === 'Toshkentdagi eng sifatli sartaroshxona') {
        adminExists.description = "Men 15 yildan beri sartaroshlik sohasida faoliyat yuritaman. Har bir mijozga professional yondashuv va sifatli xizmat ko'rsatish mening asosiy maqsadim. Zamonaviy va klassik stillarni birlashtirish orqali har bir mijozga o'ziga mos bo'lgan uslubni topib beraman.";
        modified = true;
      }
      if (modified) {
        await adminExists.save();
        console.log('👑 Admin user fields updated successfully.');
      } else {
        console.log('👑 Admin user already exists.');
      }
    }
  } catch (error) {
    console.error('❌ Error seeding admin user:', error.message);
  }
}

// Service Seeding
async function seedServices() {
  try {
    const adminUser = await User.findOne({ role: 'admin', slug: 'alimardon' });
    if (!adminUser) return;

    const serviceCount = await Service.countDocuments();
    if (serviceCount === 0) {
      const defaultServices = [
        { id: 1, name: 'Soch olish', name_en: 'Haircut', price: 100000, duration: 30, image_url: '/styles/1.png', barberId: adminUser._id },
        { id: 2, name: 'Soqol olish', name_en: 'Beard Trim', price: 70000, duration: 20, image_url: '/styles/2.png', barberId: adminUser._id },
        { id: 3, name: 'Soch + Soqol', name_en: 'Haircut + Beard', price: 150000, duration: 45, image_url: '/styles/3.png', barberId: adminUser._id },
        { id: 4, name: 'Yuz tozalash', name_en: 'Face Massage', price: 150000, duration: 30, image_url: '/styles/4.png', barberId: adminUser._id },
        { id: 5, name: 'Massaj', name_en: 'Massage', price: 100000, duration: 30, image_url: '/styles/4.png', barberId: adminUser._id }
      ];
      await Service.insertMany(defaultServices);
      console.log('💈 Default services seeded successfully for Alimardon.');
    } else {
      console.log('💈 Services already exist in DB.');
    }
  } catch (error) {
    console.error('❌ Error seeding services:', error.message);
  }
}

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ MongoDB muvaffaqiyatli ulandi');
    await seedSuperAdminUser();
    await seedAdminUser();
    await seedServices();
    startAutoCancelJob(); // O'tib ketgan buyurtmalarni avtomatik bekor qilish
  })
  .catch(err => console.error('❌ MongoDB ulanishda xato:', err));

// App listen port configuration
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server ${PORT}-portda ishlamoqda`));