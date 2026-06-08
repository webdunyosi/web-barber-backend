const mongoose = require('mongoose');
require('dotenv').config();

const Appointment = require('../models/Appointment');

async function cleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Find appointments that have missing serviceName or name
    const query = {
      $or: [
        { name: { $exists: false } },
        { name: null },
        { name: '' },
        { serviceName: { $exists: false } },
        { serviceName: null },
        { serviceName: '' },
        { servicePrice: { $exists: false } },
        { servicePrice: null }
      ]
    };

    const countBefore = await Appointment.countDocuments(query);
    console.log(`🔍 Found ${countBefore} corrupted / empty appointments to delete.`);

    if (countBefore > 0) {
      const result = await Appointment.deleteMany(query);
      console.log(`🗑️ Successfully deleted ${result.deletedCount} corrupted appointments.`);
    } else {
      console.log('✨ No corrupted appointments found.');
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected');
  } catch (err) {
    console.error(err);
  }
}

cleanup();
