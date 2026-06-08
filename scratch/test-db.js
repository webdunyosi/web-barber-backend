const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const User = require('../models/User');

mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://AlimardonToshpulatov:*alimardoncoder001*@cluster0.6ujxznx.mongodb.net/barber?retryWrites=true&w=majority&appName=Cluster0')
  .then(async () => {
    console.log('Connected to DB');
    const users = await User.find({});
    console.log('All Users:', users.map(u => ({ id: u._id, name: u.name, phone: u.phone, role: u.role, status: u.status, passwordHash: u.password })));
    process.exit(0);
  })
  .catch(err => {
    console.error('Error connecting to DB:', err);
    process.exit(1);
  });
