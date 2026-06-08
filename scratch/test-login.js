const User = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

function formatUzbekPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/[^\d]/g, '');
  let cleanDigits = digits;
  if (digits.length === 9) {
    cleanDigits = '998' + digits;
  }
  if (cleanDigits.length === 12 && cleanDigits.startsWith('998')) {
    return `+998 ${cleanDigits.slice(3, 5)} ${cleanDigits.slice(5, 8)} ${cleanDigits.slice(8, 10)} ${cleanDigits.slice(10, 12)}`;
  }
  return phone;
}

const phoneInput = '+998 99 999 99 99';
const passwordInput = 'admin';

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('DB connected');
    const formattedPhone = formatUzbekPhone(phoneInput);
    console.log('Formatted phone:', JSON.stringify(formattedPhone));

    const user = await User.findOne({ phone: formattedPhone });
    if (!user) {
      console.log('User not found in DB!');
      process.exit(1);
    }
    
    console.log('User found:', user.name, user.phone);
    const isMatch = await bcrypt.compare(passwordInput, user.password);
    console.log('Password match:', isMatch);
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
