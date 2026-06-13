const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const OfflineIncome = require('../models/OfflineIncome');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const result = await OfflineIncome.deleteMany({});
    console.log(`🗑️ Deleted ${result.deletedCount} offline income records.`);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected');
  } catch (err) {
    console.error('❌ Error clearing offline incomes:', err.message);
  }
}

run();
