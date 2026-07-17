import mongoose from 'mongoose';

const adminActionSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Can be null for system-logged security items like failed login attempts
  actionType: { 
    type: String, 
    required: true,
    enum: [
      'ban', 'unban', 'mute', 'unmute', 
      'delete_post', 'feature_post', 'hide_post', 
      'toggle_setting', 'update_setting', 'promote',
      'failed_login', 'suspicious_activity'
    ]
  },
  target: { type: String, default: '' }, // Username, post ID or configuration key name
  targetModel: { type: String, enum: ['User', 'Post', 'Setting', 'Auth'], default: 'User' },
  reason: { type: String, default: '' },
  ipAddress: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('AdminAction', adminActionSchema);
