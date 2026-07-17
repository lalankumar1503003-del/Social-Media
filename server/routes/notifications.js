import express from 'express';
import Notification from '../models/Notification.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get list of notifications for user
router.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'username avatar role')
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json(notifications);
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ error: 'Failed to retrieve notifications' });
  }
});

// Mark notification(s) as read
router.put('/read', requireAuth, async (req, res) => {
  try {
    const { notificationId } = req.body;
    if (notificationId) {
      await Notification.updateOne(
        { _id: notificationId, recipient: req.user._id },
        { $set: { isRead: true } }
      );
    } else {
      // Mark all as read
      await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { $set: { isRead: true } }
      );
    }

    return res.json({ success: true, message: 'Notifications marked as read' });
  } catch (err) {
    console.error('Mark read notifications error:', err);
    return res.status(500).json({ error: 'Failed to update notification status' });
  }
});

// Delete notifications (clear list)
router.delete('/', requireAuth, async (req, res) => {
  try {
    await Notification.deleteMany({ recipient: req.user._id });
    return res.json({ success: true, message: 'All notifications cleared' });
  } catch (err) {
    console.error('Clear notifications error:', err);
    return res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

export default router;
