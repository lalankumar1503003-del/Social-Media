import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import PostCard from '../components/PostCard';
import { Send, Image, Search, ShieldAlert, Sparkles } from 'lucide-react';

export default function Feed() {
  const { user, token } = useAuth();
  const { socket } = useSocket();
  const [posts, setPosts] = useState([]);
  const [postText, setPostText] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imageDisabled, setImageDisabled] = useState(false);

  // Load feed settings & posts
  const fetchPostsAndSettings = async () => {
    try {
      // Fetch system settings
      const settingsRes = await fetch('/api/admin/settings');
      if (settingsRes.ok) {
        const config = await settingsRes.json();
        setImageDisabled(!!config.disableImageUpload);
      }

      // Fetch posts
      const postsRes = await fetch('/api/posts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (postsRes.ok) {
        const data = await postsRes.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Fetch feed data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostsAndSettings();
  }, [token]);

  // Hook up live socket listeners for new posts and updates
  useEffect(() => {
    if (!socket) return;

    socket.on('post_created', (newPost) => {
      // Only prepend if it is not already in the list
      setPosts(prev => {
        if (prev.some(p => p._id === newPost._id)) return prev;
        return [newPost, ...prev];
      });
    });

    socket.on('post_updated', ({ postId, type, count, payload }) => {
      setPosts(prev => prev.map(p => {
        if (p._id === postId) {
          if (type === 'like') {
            return { ...p, likes: payload.likes };
          }
          if (type === 'comment') {
            return { ...p, comments: payload.comments };
          }
        }
        return p;
      }));
    });

    return () => {
      socket.off('post_created');
      socket.off('post_updated');
    };
  }, [socket]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postText.trim()) return;
    if (user.status === 'muted') return alert('You are muted and cannot create posts.');
    if (mediaUrl && imageDisabled) return alert('Image uploads are disabled by administrative settings.');

    setSubmitting(true);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: postText, mediaUrl })
      });

      if (response.ok) {
        const newPost = await response.json();
        setPosts(prev => [newPost, ...prev]);
        setPostText('');
        setMediaUrl('');
        
        // Emit Socket event to notify other clients
        if (socket) {
          socket.emit('new_post', newPost);
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create post');
      }
    } catch (err) {
      console.error('Create post request failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostAction = (action, targetId) => {
    if (action === 'delete') {
      setPosts(prev => prev.filter(p => p._id !== targetId));
    } else if (action === 'hide') {
      // If hiding post and we are normal user, filter out. If admin, keep state.
      // We will re-fetch or toggle hidden parameter
      setPosts(prev => prev.map(p => p._id === targetId ? { ...p, hidden: true } : p));
    } else if (action === 'unhide') {
      setPosts(prev => prev.map(p => p._id === targetId ? { ...p, hidden: false } : p));
    } else if (action === 'shadowban') {
      // Remove posts from user who was shadowbanned
      setPosts(prev => prev.filter(p => p.author._id !== targetId));
    }
  };

  // Filter posts based on search query
  const filteredPosts = posts.filter(post => {
    const textMatch = post.text.toLowerCase().includes(searchQuery.toLowerCase());
    const authorMatch = post.author.username.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Support hashtag search
    const hasHashtag = searchQuery.startsWith('#');
    if (hasHashtag) {
      return post.text.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return textMatch || authorMatch;
  });

  return (
    <div className="feed-container animate-fade-in">
      <div className="feed-header-section">
        <h1>Connect & Interact</h1>
        <p className="feed-subtitle">See updates, chat with colleagues, share ideas in real-time</p>
      </div>

      {/* Post Creator Box */}
      {user && (
        <form onSubmit={handleCreatePost} className="post-creator-box glass-panel">
          <div className="creator-input-row">
            <img src={user.avatar} alt="Profile" className="creator-avatar" />
            <textarea
              className="glass-input creator-textarea"
              placeholder={user.status === 'muted' ? 'You are muted by administration and cannot write updates.' : "What's on your mind? Share updates..."}
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              disabled={user.status === 'muted'}
              required
              rows={3}
            />
          </div>

          <div className="creator-actions-row">
            <div className="image-input-container">
              <Image size={18} className={`image-input-icon ${imageDisabled ? 'disabled' : ''}`} />
              <input
                type="text"
                placeholder={imageDisabled ? "Image uploads disabled by Admin" : "Paste image URL (optional)"}
                className="glass-input image-url-input"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                disabled={imageDisabled || user.status === 'muted'}
              />
              {imageDisabled && (
                <span className="image-disabled-tooltip">
                  <ShieldAlert size={12} />
                  Settings Lock
                </span>
              )}
            </div>

            <button 
              type="submit" 
              className="btn-primary submit-post-btn"
              disabled={submitting || !postText.trim() || user.status === 'muted'}
            >
              <Send size={16} />
              <span>{submitting ? 'Sharing...' : 'Post'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Search and Discovery */}
      <div className="search-discovery-bar glass-panel">
        <Search size={18} className="search-bar-icon" />
        <input
          type="text"
          placeholder="Search updates, users, hashtags (e.g. #React)..."
          className="glass-input search-input-field"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="clear-search-btn" onClick={() => setSearchQuery('')}>Clear</button>
        )}
      </div>

      {/* Posts List */}
      <div className="posts-feed-list">
        {loading ? (
          <div className="feed-loading-state">
            <div className="spinner"></div>
            <p>Loading real-time updates...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="feed-empty-state glass-panel">
            <Sparkles size={36} className="empty-icon" />
            <h3>No posts found</h3>
            <p>Be the first to share an update or try adjusting your search terms!</p>
          </div>
        ) : (
          filteredPosts.map(post => (
            <PostCard 
              key={post._id} 
              post={post} 
              onPostAction={handlePostAction} 
            />
          ))
        )}
      </div>

      <style>{`
        .feed-container {
          max-width: 680px;
          margin: 0 auto;
        }
        .feed-header-section {
          margin-bottom: 1.5rem;
        }
        .feed-header-section h1 {
          font-size: 1.8rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #fff 30%, var(--text-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .feed-subtitle {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-top: 0.25rem;
        }
        
        /* Creator Box */
        .post-creator-box {
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          border-color: rgba(255,255,255,0.05);
        }
        .creator-input-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .creator-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 1px solid var(--border-glass);
        }
        .creator-textarea {
          flex-grow: 1;
          background: rgba(255, 255, 255, 0.02);
          resize: none;
          font-size: 0.95rem;
        }
        .creator-actions-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          border-top: 1px solid var(--border-glass);
          padding-top: 1rem;
        }
        .image-input-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-grow: 1;
          position: relative;
        }
        .image-input-icon {
          color: var(--accent-primary);
        }
        .image-input-icon.disabled {
          color: var(--text-muted);
        }
        .image-url-input {
          padding: 0.4rem 0.75rem;
          font-size: 0.8rem;
          max-width: 280px;
        }
        .image-disabled-tooltip {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.65rem;
          color: var(--warning);
          background: rgba(245, 158, 11, 0.15);
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm);
        }
        .submit-post-btn {
          padding: 0.5rem 1.25rem;
          font-size: 0.85rem;
        }

        /* Search Bar */
        .search-discovery-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.6rem 1rem;
          margin-bottom: 1.5rem;
          background: rgba(15, 23, 42, 0.3);
          border-color: rgba(255, 255, 255, 0.03);
        }
        .search-bar-icon {
          color: var(--text-muted);
        }
        .search-input-field {
          background: transparent;
          border: none;
          padding: 0;
          font-size: 0.85rem;
        }
        .search-input-field:focus {
          border: none;
          box-shadow: none;
          background: transparent;
        }
        .clear-search-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 0.75rem;
        }
        .clear-search-btn:hover {
          color: #fff;
          text-decoration: underline;
        }

        /* Feed list */
        .feed-loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          padding: 3rem;
          color: var(--text-secondary);
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(0, 240, 255, 0.15);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .feed-empty-state {
          padding: 3rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .empty-icon {
          color: var(--accent-secondary);
          opacity: 0.8;
          margin-bottom: 0.5rem;
        }
        .feed-empty-state h3 {
          font-weight: 600;
          color: #fff;
        }
        .feed-empty-state p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          max-width: 320px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
