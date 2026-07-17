import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  name: { type: String, default: '' }, // For group chats
  isGroup: { type: Boolean, default: false },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }],
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Group owner
  avatar: { type: String, default: '' } // Optional group icon
}, { timestamps: true });

export default mongoose.model('Chat', chatSchema);
