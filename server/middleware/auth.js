import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'lalan_connect_secret_key_12345';

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found or deleted' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Your account has been banned by an administrator.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ error: 'Invalid or expired authorization token' });
  }
};

export const requireModerator = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const allowedRoles = ['moderator', 'admin', 'founder'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Moderator access required' });
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const allowedRoles = ['admin', 'founder'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};

export const requireFounder = (req, res, next) => {
  if (!req.user || req.user.role !== 'founder') {
    return res.status(403).json({ error: 'Forbidden: Founder access required' });
  }
  next();
};
