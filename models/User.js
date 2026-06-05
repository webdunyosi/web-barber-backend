const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true }, // Format stored: "+998 90 123 45 67" (normalized)
  telegram: { type: String, default: '' }, // e.g. "jasur_ali" without '@'
  password: { type: String, required: true }, // Hashed using bcrypt
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'blocked'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
