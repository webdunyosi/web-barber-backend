// models/Appointment.js
const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  date: { type: String, required: true }, // "YYYY-MM-DD" yoki "DD.MM.YYYY" formatida
  time: { type: String, required: true }, // "10:30" formatida
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', appointmentSchema);