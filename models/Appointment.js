const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  telegram_user: { type: String, default: '' },
  serviceName: { type: String, required: true },
  servicePrice: { type: Number, required: true },
  date: { type: String, required: true }, // Format: "DD.MM.YYYY" (e.g. "06.06.2026")
  time: { type: String, required: true }, // Format: "HH:MM" (e.g. "11:30")
  status: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: 'pending' },
  receipt: { type: String, required: true }, // Cloudinary URL to payment check image
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);