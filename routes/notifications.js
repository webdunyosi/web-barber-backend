const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// @route   GET /api/notifications
// @desc    Get all notifications (Public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/notifications
// @desc    Create a new notification (Admin only)
// @access  Private/Admin
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, description, content, type, linkType, linkUrl, imageUrl } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Sarlavha va matn kiritilishi majburiy!' });
    }

    const newNotification = new Notification({
      title,
      description,
      content: content || description, // fallback to description if content is empty
      type: type || 'system',
      linkType: linkType || 'none',
      linkUrl: linkUrl || '',
      imageUrl: imageUrl || ''
    });

    await newNotification.save();
    res.status(201).json({ success: true, notification: newNotification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/notifications/:id
// @desc    Update a notification (Admin only)
// @access  Private/Admin
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, description, content, type, linkType, linkUrl, imageUrl } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Sarlavha va matn kiritilishi majburiy!' });
    }

    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Bildirishnoma topilmadi' });
    }

    notification.title = title;
    notification.description = description;
    notification.content = content || description;
    notification.type = type || 'system';
    notification.linkType = linkType || 'none';
    notification.linkUrl = linkUrl || '';
    notification.imageUrl = imageUrl || '';

    await notification.save();
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification (Admin only)
// @access  Private/Admin
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ error: 'Bildirishnoma topilmadi' });
    }
    
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Bildirishnoma o\'chirildi' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
