import express from 'express';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import Setting from '../models/Setting.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// List user chats
router.get('/', requireAuth, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate('participants', 'username avatar location online status')
      .populate('creator', 'username')
      .sort({ updatedAt: -1 });

    return res.json(chats);
  } catch (err) {
    console.error('Fetch chats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
});

// Create/Get chat room
router.post('/', requireAuth, async (req, res) => {
  try {
    const { participantId, isGroup, name, avatar } = req.body;

    if (isGroup) {
      // Check if group chat is globally disabled
      const disableGroups = await Setting.findOne({ key: 'disableGroupChat' });
      if (disableGroups && disableGroups.value === true) {
        return res.status(400).json({ error: 'Group chats are currently disabled by the administrator.' });
      }

      if (!name) {
        return res.status(400).json({ error: 'Group name is required' });
      }

      // Group chat
      const chat = new Chat({
        name,
        isGroup: true,
        participants: [req.user._id], // creator starts as sole participant, can add others
        creator: req.user._id,
        avatar: avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`
      });

      await chat.save();
      const populatedGroup = await Chat.findById(chat._id).populate('participants', 'username avatar online status');
      return res.status(201).json(populatedGroup);
    } else {
      // 1-to-1 chat
      if (!participantId) {
        return res.status(400).json({ error: 'Participant ID is required for direct message' });
      }

      // Check if existing 1-to-1 chat already exists between these two
      let chat = await Chat.findOne({
        isGroup: false,
        participants: { $all: [req.user._id, participantId] }
      }).populate('participants', 'username avatar location online status');

      if (!chat) {
        chat = new Chat({
          isGroup: false,
          participants: [req.user._id, participantId]
        });
        await chat.save();
        chat = await Chat.findById(chat._id).populate('participants', 'username avatar location online status');
      }

      return res.json(chat);
    }
  } catch (err) {
    console.error('Create chat error:', err);
    return res.status(500).json({ error: 'Failed to create chat' });
  }
});

// Join group chat (add user to participants)
router.post('/:chatId/join', requireAuth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (!chat.isGroup) return res.status(400).json({ error: 'Cannot join 1-to-1 chat' });

    if (chat.participants.includes(req.user._id)) {
      return res.status(400).json({ error: 'You are already in this group' });
    }

    chat.participants.push(req.user._id);
    await chat.save();

    const populated = await Chat.findById(chat._id)
      .populate('participants', 'username avatar online status');
    
    return res.json(populated);
  } catch (err) {
    console.error('Join chat error:', err);
    return res.status(500).json({ error: 'Failed to join group chat' });
  }
});

// Get message history for chat
router.get('/:chatId/messages', requireAuth, async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Conversation not found' });

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ error: 'Access denied: not a participant' });
    }

    const messages = await Message.find({ chatId })
      .populate('sender', 'username avatar')
      .sort({ createdAt: 1 });

    return res.json(messages);
  } catch (err) {
    console.error('Fetch messages error:', err);
    return res.status(500).json({ error: 'Failed to load messages' });
  }
});

export default router;
