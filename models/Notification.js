const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  content: { 
    type: String 
  }, // Detailed markdown/html/text content for the individual detail page view
  type: { 
    type: String, 
    default: 'system',
    enum: ['system', 'welcome', 'loyalty', 'appointment']
  },
  linkType: { 
    type: String, 
    default: 'none',
    enum: ['none', 'booking', 'styles', 'loyalty', 'external']
  },
  linkUrl: { 
    type: String 
  }, // URL or route path (e.g. /stillar, /loyalty, etc.)
  imageUrl: { 
    type: String 
  }, // Optional banner image URL
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  barberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model('Notification', NotificationSchema);
