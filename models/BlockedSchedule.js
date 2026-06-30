const mongoose = require('mongoose');

const BlockedScheduleSchema = new mongoose.Schema({
  date: { type: String, required: true }, // Format: "DD.MM.YYYY" (e.g. "06.06.2026")
  blockedTimes: [{ type: String }], // Array of blocked times, e.g. ["09:00", "09:30"]. If it contains "ALL", the entire day is blocked.
  reason: { type: String, default: '' },
  barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Compound index for uniqueness per barber per date
BlockedScheduleSchema.index({ date: 1, barberId: 1 }, { unique: true });

module.exports = mongoose.model('BlockedSchedule', BlockedScheduleSchema);
