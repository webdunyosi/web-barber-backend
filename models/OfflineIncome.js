const mongoose = require('mongoose');

const OfflineIncomeSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true }, // Format: "DD.MM.YYYY" (e.g. "06.06.2026")
  amount: { type: Number, required: true, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('OfflineIncome', OfflineIncomeSchema);
