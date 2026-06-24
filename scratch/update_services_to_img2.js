const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Service = require('../models/Service');

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI is not set in environment variables.');
      process.exit(1);
    }
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');

    const targetServices = [
      { id: 1, name: 'Soch olish', name_en: 'Haircut', price: 100000, duration: 30, image_url: '/styles/1.png' },
      { id: 2, name: 'Soqol olish', name_en: 'Beard Trim', price: 70000, duration: 20, image_url: '/styles/2.png' },
      { id: 3, name: 'Soch + Soqol', name_en: 'Haircut + Beard', price: 150000, duration: 45, image_url: '/styles/3.png' },
      { id: 4, name: 'Yuz tozalash', name_en: 'Face Massage', price: 150000, duration: 30, image_url: '/styles/4.png' },
      { id: 5, name: 'Massaj', name_en: 'Massage', price: 100000, duration: 30, image_url: '/styles/4.png' }
    ];

    for (const ts of targetServices) {
      const res = await Service.findOneAndUpdate(
        { id: ts.id },
        { $set: ts },
        { upsert: true, new: true }
      );
      console.log(`Updated/inserted service ID ${ts.id}: ${res.name}`);
    }

    // Delete any service that has an id not in 1, 2, 3, 4, 5
    const deleteResult = await Service.deleteMany({ id: { $nin: [1, 2, 3, 4, 5] } });
    console.log(`Deleted ${deleteResult.deletedCount} obsolete services from database.`);

    console.log('💈 Database services successfully synced with Image 2.');
    
    // Print current state
    const currentServices = await Service.find().sort({ id: 1 });
    currentServices.forEach(s => {
      console.log(`- ID: ${s.id}, Name: "${s.name}" (${s.name_en}), Price: ${s.price} UZS, Duration: ${s.duration} min, Image: "${s.image_url}"`);
    });

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error running script:', error);
    process.exit(1);
  }
}

run();
