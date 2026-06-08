const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Appointment = require('../models/Appointment');

async function dump() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    const users = await User.find();
    console.log(`\n--- USERS (${users.length}) ---`);
    users.forEach(u => {
      console.log(`- ${u.name} (${u.phone}), Role: ${u.role}, Status: ${u.status}, CreatedAt: ${u.createdAt}`);
    });

    const appointments = await Appointment.find();
    console.log(`\n--- APPOINTMENTS (${appointments.length}) ---`);
    appointments.forEach(a => {
      console.log(`- Client: ${a.name}, Service: ${a.serviceName}, Price: ${a.servicePrice}, Date: ${a.date}, Time: ${a.time}, Status: ${a.status}, CreatedAt: ${a.createdAt}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  } catch (err) {
    console.error(err);
  }
}

dump();
