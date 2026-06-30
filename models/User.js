const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true }, // Format stored: "+998 90 123 45 67" (normalized)
  telegram: { type: String, default: '' }, // e.g. "jasur_ali" without '@'
  password: { type: String, required: true }, // Hashed using bcrypt
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  status: { type: String, enum: ['active', 'blocked'], default: 'active' },
  loyaltyStamps: { type: Number, default: 0, min: 0, max: 9 },
  loyaltyStampsMap: {
    type: Map,
    of: Number,
    default: {}
  },
  // SaaS fields for Barbers
  slug: { type: String, unique: true, sparse: true },
  shopName: { type: String, default: '' },
  description: { type: String, default: '' },
  avatar: { type: String, default: '/avatar/men.png' }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
