const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Service = require('../models/Service');
const Appointment = require('../models/Appointment');

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

    // 1. Update the Service collections
    const services = await Service.find({});
    console.log('Current Services in DB:');
    services.forEach(s => console.log(`- ID: ${s.id}, Name: "${s.name}", Name EN: "${s.name_en}"`));

    const result = await Service.updateMany(
      { name: 'Klassik soch olish' },
      { $set: { name: 'Soch olish', name_en: 'Haircut' } }
    );
    console.log(`Updated services count: ${result.modifiedCount}`);

    // If "Soch kesish (Classic)" also exists as a service, let's update that too
    const result2 = await Service.updateMany(
      { name: 'Soch kesish (Classic)' },
      { $set: { name: 'Soch olish', name_en: 'Haircut' } }
    );
    console.log(`Updated services (classic variant) count: ${result2.modifiedCount}`);

    // 2. Update the Appointments collection
    const appointmentsResult = await Appointment.updateMany(
      { serviceName: 'Klassik soch olish' },
      { $set: { serviceName: 'Soch olish' } }
    );
    console.log(`Updated appointments (Klassik soch olish) count: ${appointmentsResult.modifiedCount}`);

    const appointmentsResult2 = await Appointment.updateMany(
      { serviceName: 'Soch kesish (Classic)' },
      { $set: { serviceName: 'Soch olish' } }
    );
    console.log(`Updated appointments (Soch kesish (Classic)) count: ${appointmentsResult2.modifiedCount}`);

    console.log('Verification:');
    const updatedServices = await Service.find({});
    updatedServices.forEach(s => console.log(`- ID: ${s.id}, Name: "${s.name}", Name EN: "${s.name_en}"`));

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error running script:', error);
    process.exit(1);
  }
}

run();
