import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Models
import User from './models/User.js';
import Message from './models/Message.js';
import Chat from './models/Chat.js';
import Post from './models/Post.js';
import Notification from './models/Notification.js';

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import postRoutes from './routes/posts.js';
import chatRoutes from './routes/chats.js';
import notificationRoutes from './routes/notifications.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // For local dev, allow any origin
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'lalan_connect_secret_key_12345';

// Middlewares
app.use(cors());
app.use(express.json());

// Routes Mount
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Socket.io Middleware for Auth
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: Token required'));
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

// Real-time connections mapping
const activeConnections = new Map(); // userId -> socketId

io.on('connection', async (socket) => {
  const userId = socket.userId;
  activeConnections.set(userId, socket.id);
  console.log(`User connected to socket: ${userId} (${socket.id})`);

  // Update presence status in DB
  try {
    const user = await User.findByIdAndUpdate(
      userId, 
      { online: true, lastSeen: new Date() }, 
      { new: true }
    );
    if (user) {
      // Broadcast online status to everyone
      socket.broadcast.emit('presence_update', {
        userId: user._id,
        username: user.username,
        online: true,
        lastSeen: user.lastSeen
      });
    }
  } catch (err) {
    console.error('Socket presence connect error:', err);
  }

  // Join a private room for direct notifications
  socket.join(`user_${userId}`);

  // Event: Join chat room (for both direct and group chats)
  socket.on('join_chat', (chatId) => {
    socket.join(chatId);
    console.log(`Socket ${socket.id} joined chat room: ${chatId}`);
  });

  // Event: Leave chat room
  socket.on('leave_chat', (chatId) => {
    socket.leave(chatId);
    console.log(`Socket ${socket.id} left chat room: ${chatId}`);
  });

  // Event: Send chat message
  socket.on('send_message', async ({ chatId, text, mediaUrl }) => {
    try {
      const sender = await User.findById(userId);
      if (!sender || sender.status === 'muted') {
        socket.emit('error_message', { error: 'You are muted and cannot send messages.' });
        return;
      }

      // Check if chat room exists and sender is participant
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.participants.includes(userId)) {
        socket.emit('error_message', { error: 'Conversation room not found or unauthorized' });
        return;
      }

      const message = new Message({
        chatId,
        sender: userId,
        text,
        mediaUrl: mediaUrl || '',
        readBy: [userId]
      });

      await message.save();
      
      // Update chat's updatedAt field
      await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });

      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'username avatar');

      // Emit message to everyone in the chat room (including sender)
      io.to(chatId).emit('message_received', populatedMessage);

      // Create live notifications for other participants who might not be looking at this chat
      chat.participants.forEach(async (participantId) => {
        if (participantId.toString() !== userId.toString()) {
          // Add notification in DB
          const newNotif = new Notification({
            recipient: participantId,
            sender: userId,
            type: 'message',
            data: {
              chatId,
              text: text.length > 50 ? text.substring(0, 47) + '...' : text
            }
          });
          await newNotif.save();

          const populatedNotif = await Notification.findById(newNotif._id)
            .populate('sender', 'username avatar role');

          // Send real-time notification to individual user if they are online
          io.to(`user_${participantId}`).emit('notification_received', populatedNotif);
        }
      });

    } catch (err) {
      console.error('Socket send message error:', err);
      socket.emit('error_message', { error: 'Failed to send message' });
    }
  });

  // Event: Typing status
  socket.on('typing', ({ chatId, isTyping }) => {
    socket.to(chatId).emit('typing_status', {
      chatId,
      userId,
      isTyping
    });
  });

  // Event: New post broadcast
  socket.on('new_post', (post) => {
    // Broadcast to everyone
    socket.broadcast.emit('post_created', post);
  });

  // Event: Post updated (likes / comments count)
  socket.on('update_post', ({ postId, type, count, payload }) => {
    // type: 'like' or 'comment'
    socket.broadcast.emit('post_updated', { postId, type, count, payload });
  });

  // Event: Follow interaction
  socket.on('user_followed', async ({ targetId }) => {
    try {
      const followerUser = await User.findById(userId);
      const newNotif = new Notification({
        recipient: targetId,
        sender: userId,
        type: 'follow',
        data: {
          text: `${followerUser.username} started following you.`
        }
      });
      await newNotif.save();

      const populatedNotif = await Notification.findById(newNotif._id)
        .populate('sender', 'username avatar role');

      io.to(`user_${targetId}`).emit('notification_received', populatedNotif);
    } catch (err) {
      console.error('Follow socket notify error:', err);
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    activeConnections.delete(userId);
    console.log(`User disconnected from socket: ${userId}`);
    
    try {
      const user = await User.findByIdAndUpdate(
        userId, 
        { online: false, lastSeen: new Date() }, 
        { new: true }
      );
      if (user) {
        socket.broadcast.emit('presence_update', {
          userId: user._id,
          username: user.username,
          online: false,
          lastSeen: user.lastSeen
        });
      }
    } catch (err) {
      console.error('Socket presence disconnect error:', err);
    }
  });
});

// Database Start and Server Listen
async function startServer() {
  let mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.log('No MONGODB_URI in environment. Starting MongoDB Memory Server...');
    try {
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      console.log(`MongoDB Memory Server started at: ${mongoUri}`);
    } catch (err) {
      console.error('Failed to spin up MongoDB Memory Server:', err);
      process.exit(1);
    }
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB database successfully.');

    // Seed default configurations and user profiles if empty
    await seedDatabase();

    httpServer.listen(PORT, () => {
      console.log(`Lalan Connect Backend listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}

// Database Seeding
async function seedDatabase() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Database empty. Seeding initial accounts and default founder: Mr. Lalan Kumar...');
      
      const salt = await bcrypt.genSalt(10);
      
      // 1. Create Founder: Mr. Lalan Kumar
      const lalanPassHash = await bcrypt.hash('lalan123', salt);
      const lalanUser = new User({
        username: 'lalan',
        email: 'founder@lalanconnect.com',
        passwordHash: lalanPassHash,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=lalan',
        bio: 'Founder of Lalan Connect. Passionate about real-time technology and human relationships.',
        location: 'Gujarat',
        interests: ['Social Tech', 'Networking', 'WebSockets', 'Gujarat Development'],
        role: 'founder',
        status: 'active'
      });
      await lalanUser.save();
      console.log('Founder "Mr. Lalan Kumar" user account seeded successfully (username: lalan, password: lalan123)');

      // 2. Create Admin user
      const adminPassHash = await bcrypt.hash('admin123', salt);
      const adminUser = new User({
        username: 'admin',
        email: 'admin@lalanconnect.com',
        passwordHash: adminPassHash,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin',
        bio: 'System Administrator for content moderation and safety controls.',
        location: 'Mumbai, India',
        interests: ['Security', 'Server Management', 'Content Moderation'],
        role: 'admin',
        status: 'active'
      });
      await adminUser.save();
      console.log('Admin account seeded successfully (username: admin, password: admin123)');

      // 3. Create Moderator user
      const modPassHash = await bcrypt.hash('mod123', salt);
      const modUser = new User({
        username: 'moderator',
        email: 'moderator@lalanconnect.com',
        passwordHash: modPassHash,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=moderator',
        bio: 'Community Moderator keeping interactions friendly and spam-free.',
        location: 'Delhi, India',
        interests: ['Ethics', 'Social Psychology', 'Community Building'],
        role: 'moderator',
        status: 'active'
      });
      await modUser.save();
      console.log('Moderator account seeded successfully (username: moderator, password: mod123)');

      // 4. Create some test normal users
      const user1PassHash = await bcrypt.hash('user123', salt);
      const user1 = new User({
        username: 'suresh',
        email: 'suresh@gmail.com',
        passwordHash: user1PassHash,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=suresh',
        bio: 'Coding enthusiast from Ahmedabad.',
        location: 'Gujarat',
        interests: ['React', 'JavaScript', 'Anime'],
        role: 'user',
        status: 'active'
      });
      await user1.save();

      const user2 = new User({
        username: 'priya',
        email: 'priya@gmail.com',
        passwordHash: user1PassHash,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=priya',
        bio: 'UI designer sharing layouts and gradients.',
        location: 'Gujarat',
        interests: ['Design', 'UX', 'CSS'],
        role: 'user',
        status: 'active'
      });
      await user2.save();

      const user3 = new User({
        username: 'spammer_bob',
        email: 'bob@gmail.com',
        passwordHash: user1PassHash,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=bob',
        bio: 'Hello. I like spamming advertisements.',
        location: 'Unknown',
        interests: ['Ads', 'Clickbait'],
        role: 'user',
        status: 'active'
      });
      await user3.save();

      console.log('Test users seeded (suresh, priya, spammer_bob; password for all is user123)');

      // 5. Seed some initial posts
      const post1 = new Post({
        author: lalanUser._id,
        text: 'Welcome to the grand opening of Lalan Connect! Connect, converse, and build communities in real-time. Feel free to explore our chat, custom groups, and security controls.',
        featured: true,
        likes: [user1._id, user2._id],
        comments: [
          { author: user1._id, text: 'Congratulations Mr. Lalan Kumar! Fantastic hub.', createdAt: new Date() },
          { author: user2._id, text: 'The interface is lightning fast!', createdAt: new Date() }
        ]
      });
      await post1.save();

      const post2 = new Post({
        author: user1._id,
        text: 'Hello world! Just signed up from Ahmedabad. Anyone here interested in React development?',
        likes: [lalanUser._id],
        comments: []
      });
      await post2.save();

      const post3 = new Post({
        author: user3._id,
        text: 'CLICK HERE TO WIN A FREE IPHONE! 100% REAL NO VIRUS ACCURATE NOW!!! LINK IN BIO.',
        likes: [],
        comments: [],
        reports: [
          { reporter: user1._id, reason: 'Obvious spam advertisements', createdAt: new Date() },
          { reporter: user2._id, reason: 'Spreading clickbait', createdAt: new Date() }
        ]
      });
      await post3.save();

      console.log('Seeded initial feed posts (including a reported post for moderation testing).');

      // Create a default announcement setting in settings collection
      const setting = new Setting({
        key: 'announcementBanner',
        value: 'Welcome to Lalan Connect – Created by Mr. Lalan Kumar to bridge real-time connections!'
      });
      await setting.save();
    }
  } catch (err) {
    console.error('Error seeding database:', err);
  }
}

// Start executing
import bcrypt from 'bcryptjs';
startServer();
