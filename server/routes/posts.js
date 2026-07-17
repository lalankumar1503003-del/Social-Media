import express from 'express';
import Post from '../models/Post.js';
import User from '../models/User.js';
import Setting from '../models/Setting.js';
import AdminAction from '../models/AdminAction.js';
import { requireAuth, requireModerator } from '../middleware/auth.js';

const router = express.Router();

// Get Post Feed
router.get('/', requireAuth, async (req, res) => {
  try {
    const isPrivileged = ['admin', 'founder', 'moderator'].includes(req.user.role);
    let query = {};

    if (!isPrivileged) {
      // 1. Regular users cannot see hidden posts
      query.hidden = false;

      // 2. Regular users cannot see shadowbanned users' posts unless they are the author themselves
      const shadowbannedUsers = await User.find({ status: 'shadowbanned' }).select('_id');
      const sbIds = shadowbannedUsers.map(u => u._id);

      if (sbIds.length > 0) {
        query.$or = [
          { author: { $nin: sbIds } },
          { author: req.user._id }
        ];
      }
    }

    const posts = await Post.find(query)
      .populate('author', 'username avatar role status')
      .populate('comments.author', 'username avatar')
      .sort({ featured: -1, createdAt: -1 });

    return res.json(posts);
  } catch (err) {
    console.error('Fetch posts error:', err);
    return res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Get Reported Posts (Admin/Moderator dashboard)
router.get('/reported', requireAuth, requireModerator, async (req, res) => {
  try {
    const posts = await Post.find({ 'reports.0': { $exists: true } })
      .populate('author', 'username avatar status')
      .populate('reports.reporter', 'username')
      .sort({ updatedAt: -1 });

    return res.json(posts);
  } catch (err) {
    console.error('Fetch reported posts error:', err);
    return res.status(500).json({ error: 'Failed to fetch reported posts' });
  }
});

// Create Post
router.post('/', requireAuth, async (req, res) => {
  try {
    const { text, mediaUrl } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Post text is required' });
    }

    if (req.user.status === 'muted') {
      return res.status(403).json({ error: 'You are muted and cannot post.' });
    }

    // Check if media uploads are globally disabled
    if (mediaUrl) {
      const disableUploads = await Setting.findOne({ key: 'disableImageUpload' });
      if (disableUploads && disableUploads.value === true) {
        return res.status(400).json({ error: 'Image uploads are currently disabled by the administrator.' });
      }
    }

    const newPost = new Post({
      author: req.user._id,
      text,
      mediaUrl: mediaUrl || '',
      likes: [],
      comments: [],
      reports: []
    });

    await newPost.save();

    // Populate user info for emission and response
    const populatedPost = await Post.findById(newPost._id)
      .populate('author', 'username avatar role status');

    return res.status(201).json(populatedPost);
  } catch (err) {
    console.error('Create post error:', err);
    return res.status(500).json({ error: 'Failed to create post' });
  }
});

// Like/Unlike Post
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const likeIdx = post.likes.indexOf(req.user._id);
    let liked = false;
    if (likeIdx > -1) {
      post.likes.splice(likeIdx, 1);
    } else {
      post.likes.push(req.user._id);
      liked = true;
    }

    await post.save();
    return res.json({ likes: post.likes, liked });
  } catch (err) {
    console.error('Like post error:', err);
    return res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// Add Comment
router.post('/:id/comment', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Comment text is required' });

    if (req.user.status === 'muted') {
      return res.status(403).json({ error: 'You are muted and cannot comment.' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = {
      author: req.user._id,
      text,
      createdAt: new Date()
    };

    post.comments.push(comment);
    await post.save();

    // Find the comment we just added with populated author details
    const updatedPost = await Post.findById(post._id)
      .populate('comments.author', 'username avatar');
    
    const addedComment = updatedPost.comments[updatedPost.comments.length - 1];

    return res.json({ comment: addedComment, totalComments: post.comments.length });
  } catch (err) {
    console.error('Comment post error:', err);
    return res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Report Post
router.post('/:id/report', requireAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Reason for report is required' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Check if already reported by this user
    const alreadyReported = post.reports.some(r => r.reporter.toString() === req.user._id.toString());
    if (alreadyReported) {
      return res.status(400).json({ error: 'You have already reported this post' });
    }

    post.reports.push({
      reporter: req.user._id,
      reason,
      createdAt: new Date()
    });

    await post.save();
    return res.json({ message: 'Post reported successfully', reportsCount: post.reports.length });
  } catch (err) {
    console.error('Report post error:', err);
    return res.status(500).json({ error: 'Failed to report post' });
  }
});

// Admin/Moderator: Moderate Post (Hide, Feature, Resolve Reports, Delete)
router.put('/:id/moderate', requireAuth, requireModerator, async (req, res) => {
  try {
    const { action, reason } = req.body; // action: 'hide' | 'unhide' | 'feature' | 'unfeature' | 'safe' | 'delete'
    if (!action) return res.status(400).json({ error: 'Moderation action is required' });

    const post = await Post.findById(req.params.id).populate('author');
    if (!post) return res.status(404).json({ error: 'Post not found' });

    let actionName = '';

    if (action === 'hide') {
      post.hidden = true;
      actionName = 'hide_post';
      await post.save();
    } else if (action === 'unhide') {
      post.hidden = false;
      actionName = 'hide_post'; // reuse target action
      await post.save();
    } else if (action === 'feature') {
      post.featured = true;
      actionName = 'feature_post';
      await post.save();
    } else if (action === 'unfeature') {
      post.featured = false;
      actionName = 'feature_post';
      await post.save();
    } else if (action === 'safe') {
      // Clear reports, keep post visible
      post.reports = [];
      actionName = 'hide_post'; // Clear status
      await post.save();
    } else if (action === 'delete') {
      await Post.deleteOne({ _id: post._id });
      actionName = 'delete_post';
    } else {
      return res.status(400).json({ error: 'Invalid moderation action' });
    }

    // Log admin action
    await new AdminAction({
      admin: req.user._id,
      actionType: actionName,
      target: post._id.toString(),
      targetModel: 'Post',
      reason: reason || `Action: ${action} on post by ${post.author.username}`,
      ipAddress: req.ip || ''
    }).save();

    return res.json({ message: `Post moderation action '${action}' completed successfully` });
  } catch (err) {
    console.error('Post moderation error:', err);
    return res.status(500).json({ error: 'Moderation action failed' });
  }
});

export default router;
