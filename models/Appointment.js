const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  telegram_user: { type: String },
  service: { 
    name: { type: String },
    price: { type: Number },
  },
  date: { type: String, required: true },
  time: { type: String, required: true },
  receipt_url: { type: String, required: true }, // Cloudinary rasmining manzili
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', appointmentSchema);