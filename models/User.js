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
  title: { type: String, default: 'Professional Barber' },
  description: { type: String, default: '' },
  avatar: { type: String, default: '/avatar/men.png' },
  instagram: { type: String, default: '' },
  facebook: { type: String, default: '' },
  youtube: { type: String, default: '' },
  experienceStartYear: { type: Number, default: 2011 },
  experienceYears: { type: Number, default: 15 },
  subscriptionExpiresAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
