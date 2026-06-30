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
  paymentMethod: { type: String, enum: ['card', 'cash'], default: 'card' },
  receipt: { type: String, required: false }, // Cloudinary URL to payment check image (optional for cash)
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isFree: { type: Boolean, default: false },
  barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);