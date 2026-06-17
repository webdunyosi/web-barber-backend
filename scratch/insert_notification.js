const mongoose = require('mongoose');
const Notification = require('../models/Notification');
require('dotenv').config({ path: '../.env' });

mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://AlimardonToshpulatov:*alimardoncoder001*@cluster0.6ujxznx.mongodb.net/barber?retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    console.log('Connected to DB');
    
    // Clear old test notifications if any
    await Notification.deleteMany({ title: /Tanlovda/ });

    const newNotif = new Notification({
      title: "⚽ Tanlovda ishtirok eting va sovrinlar yutib oling!",
      description: "Ucell ilovasidagi «OVVA FIFA 2026!» tanlovida ishtirok eting va iPhone 17 Pro Max yutib oling.",
      content: "Ucell ilovasidagi «OVVA FIFA 2026!» tanlovida ishtirok eting: JCH-2026 o'yinlari natijalarini tanlang, ballar to'plang va iPhone 17 Pro Max hamda boshqa sovrinlarni yutib oling. Siz qanchalik to'g'ri taxmin qilsangiz, g'alaba qozonish imkoniyatingiz shunchalik yuqori bo'ladi!",
      type: "system",
      linkType: "external",
      linkUrl: "https://ucell.uz",
      imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80"
    });

    const saved = await newNotif.save();
    console.log('Test notification saved successfully:', saved);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error seeding database:', err);
    process.exit(1);
  });
