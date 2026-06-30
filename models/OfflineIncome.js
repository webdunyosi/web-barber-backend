const mongoose = require('mongoose');

const OfflineIncomeSchema = new mongoose.Schema({
  date: { type: String, required: true }, // Format: "DD.MM.YYYY" (e.g. "06.06.2026")
  amount: { type: Number, required: true, default: 0 },
  barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Compound index for uniqueness per barber per date
OfflineIncomeSchema.index({ date: 1, barberId: 1 }, { unique: true });

module.exports = mongoose.model('OfflineIncome', OfflineIncomeSchema);
