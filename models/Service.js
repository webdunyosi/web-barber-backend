const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  id: { type: Number },
  name: { type: String, required: true },
  name_en: { type: String },
  price: { type: Number, required: true },
  duration: { type: Number, required: true },
  image_url: { type: String }
});

module.exports = mongoose.model('Service', serviceSchema);