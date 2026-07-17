import React, { useState } from 'react';
import { Heart, MessageCircle, AlertTriangle, ShieldCheck, ShieldAlert, Star, Trash2, EyeOff, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function PostCard({ post, onPostAction }) {
  const { user, token, isModerator } = useAuth();
  const { socket } = useSocket();
  const [likes, setLikes] = useState(post.likes || []);
  const [comments, setComments] = useState(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportsCount, setReportsCount] = useState(post.reports?.length || 0);
  const [postState, setPostState] = useState(post);

  const isLiked = user ? likes.includes(user._id) : false;

  const handleLike = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/posts/${post._id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLikes(data.likes);
        // Socket broadcast
        if (socket) {
          socket.emit('update_post', {
            postId: post._id,
            type: 'like',
            count: data.likes.length,
            payload: { likes: data.likes }
          });
        }
      }
    } catch (err) {
      console.error('Like request failed:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    if (user.status === 'muted') return alert('You are muted and cannot comment.');

    try {
      const response = await fetch(`/api/posts/${post._id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: newComment })
      });
      if (response.ok) {
        const data = await response.json();
        const updatedComments = [...comments, data.comment];
        setComments(updatedComments);
        setNewComment('');
        
        // Socket broadcast
        if (socket) {
          socket.emit('update_post', {
            postId: post._id,
            type: 'comment',
            count: updatedComments.length,
            payload: { comments: updatedComments }
          });
        }
      }
    } catch (err) {
      console.error('Add comment failed:', err);
    }
  };

  const submitReport = async () => {
    if (!reportReason.trim()) return;
    setReporting(true);
    try {
      const response = await fetch(`/api/posts/${post._id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reportReason })
      });
      if (response.ok) {
        const data = await response.json();
        setReportsCount(data.reportsCount);
        setShowReportModal(false);
        setReportReason('');
        alert('Post reported to moderators.');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to file report');
      }
    } catch (err) {
      console.error('Report submission failed:', err);
    } finally {
      setReporting(false);
    }
  };

  const handleModerate = async (action) => {
    if (!window.confirm(`Are you sure you want to perform '${action}' on this post?`)) return;

    try {
      const response = await fetch(`/api/posts/${post._id}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, reason: `Admin direct action: ${action}` })
      });
      if (response.ok) {
        if (action === 'delete') {
          if (onPostAction) onPostAction('delete', post._id);
        } else if (action === 'hide') {
          setPostState(prev => ({ ...prev, hidden: true }));
          if (onPostAction) onPostAction('hide', post._id);
        } else if (action === 'unhide') {
          setPostState(prev => ({ ...prev, hidden: false }));
          if (onPostAction) onPostAction('unhide', post._id);
        } else if (action === 'feature') {
          setPostState(prev => ({ ...prev, featured: true }));
        } else if (action === 'unfeature') {
          setPostState(prev => ({ ...prev, featured: false }));
        } else if (action === 'safe') {
          setReportsCount(0);
          alert('Cleared all reports on this post.');
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to moderate');
      }
    } catch (err) {
      console.error('Moderation action failed:', err);
    }
  };

  const handleShadowbanUser = async () => {
    if (!window.confirm(`Are you sure you want to shadow-ban @${post.author.username}? Their future posts will only be visible to themselves.`)) return;

    try {
      const response = await fetch(`/api/users/${post.author._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'shadowbanned', reason: 'Shadowbanned via feed post moderation' })
      });
      if (response.ok) {
        alert(`@${post.author.username} is now shadow-banned.`);
        if (onPostAction) onPostAction('shadowban', post.author._id);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to shadow-ban');
      }
    } catch (err) {
      console.error('Shadow-ban request failed:', err);
    }
  };

  return (
    <div className={`post-card glass-panel ${postState.featured ? 'featured-border' : ''} animate-fade-in`}>
      {postState.featured && (
        <div className="featured-tag">
          <Star size={12} fill="var(--accent-primary)" />
          <span>FEATURED UPDATE</span>
        </div>
      )}

      <div className="post-header">
        <div className="post-author-info">
          <img src={post.author.avatar} alt={post.author.username} className="post-avatar" />
          <div className="author-meta">
            <div className="author-name-row">
              <span className="author-name">@{post.author.username}</span>
              <span className={`badge badge-${post.author.role}`}>{post.author.role}</span>
              {post.author.status !== 'active' && (
                <span className={`badge badge-${post.author.status}`}>{post.author.status}</span>
              )}
            </div>
            <span className="post-time">
              {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
              {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        <div className="post-actions-right">
          {user && (
            <button className="report-btn" onClick={() => setShowReportModal(true)} title="Report Post">
              <AlertTriangle size={16} />
              {reportsCount > 0 && <span className="report-badge-count">{reportsCount}</span>}
            </button>
          )}
        </div>
      </div>

      <div className="post-body">
        <p>{postState.text}</p>
        {postState.mediaUrl && (
          <img src={postState.mediaUrl} alt="Post Attachment" className="post-media-img" />
        )}
      </div>

      <div className="post-interactions">
        <button 
          className={`interaction-btn like-btn ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          <Heart size={18} fill={isLiked ? 'var(--danger)' : 'transparent'} />
          <span>{likes.length} Likes</span>
        </button>

        <button 
          className="interaction-btn comment-trigger-btn"
          onClick={() => setShowComments(!showComments)}
        >
          <MessageCircle size={18} />
          <span>{comments.length} Comments</span>
        </button>
      </div>

      {/* Moderation Panel (Admins & Moderators) */}
      {isModerator && (
        <div className="post-moderation-panel">
          <div className="mod-panel-header">
            <ShieldCheck size={14} />
            <span>MODERATION TOOLS</span>
          </div>
          <div className="mod-actions-grid">
            <button 
              onClick={() => handleModerate(postState.hidden ? 'unhide' : 'hide')}
              className="mod-btn"
              title={postState.hidden ? 'Show Post' : 'Hide Post'}
            >
              {postState.hidden ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>{postState.hidden ? 'Unhide' : 'Hide'}</span>
            </button>

            <button 
              onClick={() => handleModerate(postState.featured ? 'unfeature' : 'feature')}
              className="mod-btn"
            >
              <Star size={14} fill={postState.featured ? 'var(--warning)' : 'transparent'} />
              <span>{postState.featured ? 'Unfeature' : 'Feature'}</span>
            </button>

            {reportsCount > 0 && (
              <button 
                onClick={() => handleModerate('safe')}
                className="mod-btn btn-safe"
              >
                <ShieldCheck size={14} />
                <span>Mark Safe</span>
              </button>
            )}

            <button 
              onClick={handleShadowbanUser}
              className="mod-btn btn-ban"
              title="Shadow-ban this user"
            >
              <ShieldAlert size={14} />
              <span>Shadow-Ban</span>
            </button>

            <button 
              onClick={() => handleModerate('delete')}
              className="mod-btn btn-delete"
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Comment Section */}
      {showComments && (
        <div className="post-comments-section">
          <div className="comments-list">
            {comments.length === 0 ? (
              <p className="no-comments-msg">No comments yet. Write one below!</p>
            ) : (
              comments.map((c, i) => (
                <div key={c._id || i} className="comment-item">
                  <img src={c.author?.avatar} alt={c.author?.username} className="comment-avatar" />
                  <div className="comment-content">
                    <div className="comment-author-row">
                      <span className="comment-author">@{c.author?.username}</span>
                      <span className="comment-time">
                        {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="comment-text">{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {user && (
            <form onSubmit={handleAddComment} className="comment-form">
              <input 
                type="text" 
                placeholder={user.status === 'muted' ? 'You are muted and cannot comment' : 'Add a public comment...'}
                className="glass-input comment-input"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={user.status === 'muted'}
              />
              <button 
                type="submit" 
                className="btn-primary comment-submit-btn"
                disabled={!newComment.trim() || user.status === 'muted'}
              >
                Send
              </button>
            </form>
          )}
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <h3>Report Post</h3>
            <p className="modal-desc">Help us maintain a safe community. Why are you reporting this content?</p>
            <textarea
              className="glass-input report-text-area"
              placeholder="e.g. Offensive language, harassment, spam link..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={3}
            />
            <div className="modal-actions">
              <button 
                className="btn-secondary" 
                onClick={() => { setShowReportModal(false); setReportReason(''); }}
                disabled={reporting}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={submitReport}
                disabled={reporting || !reportReason.trim()}
              >
                {reporting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .post-card {
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          position: relative;
        }
        .featured-border {
          border-color: rgba(0, 240, 255, 0.4);
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.1);
        }
        .featured-tag {
          position: absolute;
          top: -11px;
          left: 20px;
          background: #000;
          border: 1px solid var(--accent-primary);
          color: var(--accent-primary);
          font-size: 0.65rem;
          font-weight: 800;
          padding: 0.2rem 0.6rem;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          gap: 0.25rem;
          letter-spacing: 0.5px;
          box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
        }
        .post-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }
        .post-author-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .post-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1px solid var(--border-glass);
        }
        .author-meta {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .author-name-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .author-name {
          font-weight: 600;
          color: #fff;
        }
        .post-time {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .report-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: var(--transition-smooth);
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.4rem;
          border-radius: var(--radius-sm);
        }
        .report-btn:hover {
          color: var(--warning);
          background: rgba(245, 158, 11, 0.1);
        }
        .report-badge-count {
          background: var(--warning);
          color: #000;
          font-size: 0.65rem;
          font-weight: 700;
          border-radius: 50%;
          width: 14px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .post-body {
          margin-bottom: 1.25rem;
        }
        .post-body p {
          white-space: pre-wrap;
          font-size: 0.95rem;
          color: #e2e8f0;
          line-height: 1.5;
        }
        .post-media-img {
          width: 100%;
          max-height: 350px;
          object-fit: cover;
          border-radius: var(--radius-sm);
          margin-top: 0.75rem;
          border: 1px solid var(--border-glass);
        }
        .post-interactions {
          display: flex;
          gap: 1.5rem;
          border-top: 1px solid var(--border-glass);
          padding-top: 1rem;
        }
        .interaction-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          transition: var(--transition-smooth);
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-sm);
        }
        .interaction-btn:hover {
          background: var(--bg-glass-hover);
          color: #fff;
        }
        .like-btn.liked {
          color: var(--danger);
        }
        .like-btn.liked:hover {
          background: rgba(239, 68, 68, 0.05);
        }
        
        /* Inline Moderation Styles */
        .post-moderation-panel {
          margin-top: 1rem;
          background: rgba(139, 92, 246, 0.04);
          border: 1px dashed rgba(139, 92, 246, 0.25);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
        }
        .mod-panel-header {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.7rem;
          color: var(--accent-secondary);
          font-weight: 700;
          margin-bottom: 0.5rem;
          letter-spacing: 0.5px;
        }
        .mod-actions-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .mod-btn {
          background: var(--bg-secondary);
          border: 1px solid var(--border-glass);
          color: var(--text-secondary);
          padding: 0.35rem 0.6rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          transition: var(--transition-smooth);
        }
        .mod-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
        }
        .mod-btn.btn-safe {
          border-color: rgba(16, 185, 129, 0.3);
          color: #a7f3d0;
          background: rgba(16, 185, 129, 0.08);
        }
        .mod-btn.btn-safe:hover {
          background: var(--success);
          color: #fff;
        }
        .mod-btn.btn-ban {
          border-color: rgba(245, 158, 11, 0.3);
          color: #fde68a;
          background: rgba(245, 158, 11, 0.08);
        }
        .mod-btn.btn-ban:hover {
          background: var(--warning);
          color: #000;
        }
        .mod-btn.btn-delete {
          border-color: rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.08);
        }
        .mod-btn.btn-delete:hover {
          background: var(--danger);
          color: #fff;
        }

        /* Comments List */
        .post-comments-section {
          border-top: 1px solid var(--border-glass);
          margin-top: 1rem;
          padding-top: 1rem;
          animation: fadeIn 0.2s ease;
        }
        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
          max-height: 250px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }
        .no-comments-msg {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-align: center;
          padding: 1rem;
        }
        .comment-item {
          display: flex;
          gap: 0.5rem;
        }
        .comment-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
        }
        .comment-content {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          border-radius: var(--radius-sm);
          padding: 0.5rem 0.75rem;
          flex-grow: 1;
        }
        .comment-author-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.2rem;
        }
        .comment-author {
          font-size: 0.75rem;
          font-weight: 600;
          color: #fff;
        }
        .comment-time {
          font-size: 0.65rem;
          color: var(--text-muted);
        }
        .comment-text {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .comment-form {
          display: flex;
          gap: 0.5rem;
        }
        .comment-input {
          flex-grow: 1;
          padding: 0.5rem 0.75rem;
          font-size: 0.8rem;
        }
        .comment-submit-btn {
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
        }

        /* Report Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .modal-content {
          width: 90%;
          max-width: 450px;
          padding: 1.75rem;
        }
        .modal-content h3 {
          margin-bottom: 0.5rem;
          font-size: 1.2rem;
        }
        .modal-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: 1rem;
        }
        .report-text-area {
          margin-bottom: 1.25rem;
          resize: none;
          font-size: 0.85rem;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }
      `}</style>
    </div>
  );
}
