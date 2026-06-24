require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const User = require('../models/User');

async function testPost() {
  try {
    // Connect to MongoDB to get a user
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get any active user
    const user = await User.findOne({ status: 'active' });
    if (!user) {
      console.error('No active user found in DB');
      process.exit(1);
    }
    console.log('Found user:', user.name, user._id);

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret');
    console.log('Generated token:', token);

    // Create form data using native FormData
    const form = new FormData();
    form.append('name', 'Diagnostic Test');
    form.append('phone', '+998 90 123 45 67');
    form.append('telegram_user', 'diagnostic_test');
    form.append('serviceName', 'Soqol olish');
    form.append('servicePrice', '50000');
    form.append('date', '24.06.2026');
    form.append('time', '09:00');
    form.append('paymentMethod', 'card');
    
    // Add dummy receipt photo
    const dummyPhoto = 'uploads/receipt-1780656569355-503118378.png';
    if (fs.existsSync(dummyPhoto)) {
      const fileBuffer = fs.readFileSync(dummyPhoto);
      const fileBlob = new Blob([fileBuffer], { type: 'image/png' });
      form.append('receipt', fileBlob, 'receipt.png');
    } else {
      console.error('Dummy receipt photo not found at:', dummyPhoto);
      process.exit(1);
    }

    console.log('Sending POST request...');
    const response = await fetch('https://web-barber-backend.onrender.com/api/appointments', {
      method: 'POST',
      body: form,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const resData = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', resData);
  } catch (error) {
    console.error('Error occurred:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testPost();
