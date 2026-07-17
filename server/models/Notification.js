import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional, can be null for system announcements
  type: { 
    type: String, 
    enum: ['message', 'follow', 'like', 'comment', 'announcement', 'mute_unmute', 'ban_unban'], 
    required: true 
  },
  data: {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    text: { type: String, default: '' },
    announcementTitle: { type: String, default: '' }
  },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
