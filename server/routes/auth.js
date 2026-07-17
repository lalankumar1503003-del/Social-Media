import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AdminAction from '../models/AdminAction.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'lalan_connect_secret_key_12345';

// Register User
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, location, interests, bio, avatar } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or Email is already registered' });
    }

    // Determine role (e.g. founder, admin, or user)
    // If username is "lalan" or email matches a specific profile, or if it is the first user
    let role = 'user';
    const totalUsers = await User.countDocuments();
    if (totalUsers === 0) {
      // First registered user becomes Founder "Mr. Lalan Kumar"
      role = 'founder';
    } else if (username.toLowerCase() === 'lalan' || username.toLowerCase() === 'lalankumar') {
      role = 'founder';
    } else if (username.toLowerCase() === 'admin') {
      role = 'admin';
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      username,
      email,
      passwordHash,
      location: location || '',
      interests: interests || [],
      bio: bio || '',
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      role,
      status: 'active'
    });

    await user.save();

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        interests: user.interests
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Credentials and password are required' });
    }

    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
    });

    if (!user) {
      // Log failed login
      await new AdminAction({
        actionType: 'failed_login',
        target: emailOrUsername,
        targetModel: 'Auth',
        reason: 'User not found',
        ipAddress: req.ip || ''
      }).save();
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'banned') {
      await new AdminAction({
        actionType: 'suspicious_activity',
        target: user.username,
        targetModel: 'Auth',
        reason: 'Banned user attempted login',
        ipAddress: req.ip || ''
      }).save();
      return res.status(403).json({ error: 'Your account is banned' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      // Log failed login
      await new AdminAction({
        actionType: 'failed_login',
        target: user.username,
        targetModel: 'Auth',
        reason: 'Incorrect password',
        ipAddress: req.ip || ''
      }).save();
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        interests: user.interests
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// Admin Login Route
router.post('/admin-login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
    });

    if (!user) {
      await new AdminAction({
        actionType: 'failed_login',
        target: `Admin attempt: ${emailOrUsername}`,
        targetModel: 'Auth',
        reason: 'Admin user not found',
        ipAddress: req.ip || ''
      }).save();
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await new AdminAction({
        actionType: 'failed_login',
        target: `Admin attempt: ${user.username}`,
        targetModel: 'Auth',
        reason: 'Admin incorrect password',
        ipAddress: req.ip || ''
      }).save();
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Verify role permissions
    if (user.role !== 'admin' && user.role !== 'founder' && user.role !== 'moderator') {
      await new AdminAction({
        actionType: 'suspicious_activity',
        target: user.username,
        targetModel: 'Auth',
        reason: 'Non-admin attempted admin panel login',
        ipAddress: req.ip || ''
      }).save();
      return res.status(403).json({ error: 'Access denied: Admin/Moderator credentials required' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Access denied: Admin is banned' });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    // Success log
    await new AdminAction({
      admin: user._id,
      actionType: 'toggle_setting',
      target: user.username,
      targetModel: 'User',
      reason: 'Admin logged into management panel',
      ipAddress: req.ip || ''
    }).save();

    return res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        interests: user.interests
      }
    });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Server error during admin login' });
  }
});

export default router;
