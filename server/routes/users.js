import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AdminAction from '../models/AdminAction.js';
import { requireAuth, requireAdmin, requireModerator } from '../middleware/auth.js';

const router = express.Router();

// Search/Get users (supports query for search page, and filter/role parameters for admin panel)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search, role, status } = req.query;
    let query = {};

    // Standard user can only search active users, whereas moderators/admins see all
    const isPrivileged = ['admin', 'founder', 'moderator'].includes(req.user.role);
    if (!isPrivileged) {
      query.status = { $ne: 'banned' };
    } else {
      if (status) query.status = status;
      if (role) query.role = role;
    }

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    return res.json(users);
  } catch (err) {
    console.error('Fetch users error:', err);
    return res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Get self profile
router.get('/me', requireAuth, async (req, res) => {
  return res.json(req.user);
});

// Get specific user profile
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash')
      .populate('followers', 'username avatar location')
      .populate('following', 'username avatar location');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Shadowban logic: If user is banned or shadowbanned, standard users might see a specific state
    if (user.status === 'banned' && !['admin', 'founder', 'moderator'].includes(req.user.role)) {
      return res.status(404).json({ error: 'User account suspended' });
    }

    return res.json(user);
  } catch (err) {
    console.error('Fetch profile error:', err);
    return res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

// Update own profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { bio, location, interests, avatar } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (interests !== undefined) user.interests = interests;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();
    return res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      bio: user.bio,
      location: user.location,
      interests: user.interests
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Follow/Unfollow user
router.post('/:id/follow', requireAuth, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const currentUser = await User.findById(req.user._id);

    const isFollowing = currentUser.following.includes(targetId);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(id => id.toString() !== targetId);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUser._id.toString());
    } else {
      // Follow
      currentUser.following.push(targetId);
      targetUser.followers.push(currentUser._id);
    }

    await currentUser.save();
    await targetUser.save();

    return res.json({
      following: currentUser.following,
      followersCount: targetUser.followers.length,
      isFollowing: !isFollowing
    });
  } catch (err) {
    console.error('Follow error:', err);
    return res.status(500).json({ error: 'Follow operation failed' });
  }
});

// Admin/Moderator: Moderate status (mute/unmute, ban/unban, shadowban)
router.put('/:id/status', requireAuth, requireModerator, async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!status || !['active', 'muted', 'banned', 'shadowbanned'].includes(status)) {
      return res.status(400).json({ error: 'Invalid or missing status' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // Hierarchy check: Moderator cannot ban Admin/Founder; Admin cannot ban Founder
    if (targetUser.role === 'founder') {
      return res.status(403).json({ error: 'Founder account cannot be modified' });
    }
    if (targetUser.role === 'admin' && req.user.role === 'moderator') {
      return res.status(403).json({ error: 'Moderators cannot modify administrator statuses' });
    }

    const oldStatus = targetUser.status;
    targetUser.status = status;
    await targetUser.save();

    // Map audit action types
    let actionType = 'ban';
    if (status === 'active') {
      actionType = oldStatus === 'banned' ? 'unban' : 'unmute';
    } else if (status === 'muted') {
      actionType = 'mute';
    } else if (status === 'shadowbanned') {
      actionType = 'ban'; // treat shadowban under audit as similar suspension
    }

    // Log the administrative action
    await new AdminAction({
      admin: req.user._id,
      actionType,
      target: targetUser.username,
      targetModel: 'User',
      reason: reason || `Status changed from ${oldStatus} to ${status}`,
      ipAddress: req.ip || ''
    }).save();

    return res.json({
      message: `User status successfully updated to ${status}`,
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        role: targetUser.role,
        status: targetUser.status
      }
    });
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Admin/Founder only: Promote user to Moderator / Admin
router.put('/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role, reason } = req.body;
    if (!role || !['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role selection' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (targetUser.role === 'founder') {
      return res.status(403).json({ error: 'Founder role cannot be demoted or changed' });
    }

    // Only Founder can promote to Admin
    if (role === 'admin' && req.user.role !== 'founder') {
      return res.status(403).json({ error: 'Only the Founder (Mr. Lalan Kumar) can promote users to Admin' });
    }

    const oldRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    await new AdminAction({
      admin: req.user._id,
      actionType: 'promote',
      target: targetUser.username,
      targetModel: 'User',
      reason: reason || `Role updated from ${oldRole} to ${role}`,
      ipAddress: req.ip || ''
    }).save();

    return res.json({
      message: `User role promoted to ${role}`,
      user: {
        _id: targetUser._id,
        username: targetUser.username,
        role: targetUser.role,
        status: targetUser.status
      }
    });
  } catch (err) {
    console.error('Role promotion error:', err);
    return res.status(500).json({ error: 'Failed to promote user role' });
  }
});

// Admin/Founder: Edit basic user profile fields directly
router.put('/:id/edit-profile', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, email, location, bio } = req.body;
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (targetUser.role === 'founder' && req.user.role !== 'founder') {
      return res.status(403).json({ error: 'Cannot modify founder profile' });
    }

    if (username) targetUser.username = username;
    if (email) targetUser.email = email;
    if (location !== undefined) targetUser.location = location;
    if (bio !== undefined) targetUser.bio = bio;

    await targetUser.save();

    await new AdminAction({
      admin: req.user._id,
      actionType: 'update_setting',
      target: targetUser.username,
      targetModel: 'User',
      reason: 'Admin updated user profile details',
      ipAddress: req.ip || ''
    }).save();

    return res.json({ message: 'User profile updated successfully', user: targetUser });
  } catch (err) {
    console.error('Admin edit user profile error:', err);
    return res.status(500).json({ error: 'Failed to edit user profile' });
  }
});

// Admin/Founder: Reset password directly
router.put('/:id/reset-password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { newPassword, reason } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (targetUser.role === 'founder' && req.user.role !== 'founder') {
      return res.status(403).json({ error: 'Cannot reset founder password' });
    }

    const salt = await bcrypt.genSalt(10);
    targetUser.passwordHash = await bcrypt.hash(newPassword, salt);
    await targetUser.save();

    await new AdminAction({
      admin: req.user._id,
      actionType: 'update_setting',
      target: targetUser.username,
      targetModel: 'User',
      reason: reason || 'Admin forced password reset',
      ipAddress: req.ip || ''
    }).save();

    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Password reset error:', err);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
