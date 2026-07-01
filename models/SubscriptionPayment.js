const mongoose = require('mongoose');

const SubscriptionPaymentSchema = new mongoose.Schema({
  barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true, default: 200000 },
  monthsCount: { type: Number, required: true, default: 1 },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  receiptUrl: { type: String, default: '' }, // Google Photos or other link
  notes: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('SubscriptionPayment', SubscriptionPaymentSchema);
