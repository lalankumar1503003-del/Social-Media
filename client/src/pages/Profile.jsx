import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { User, MapPin, Tag, Edit3, MessageSquare, Shield, CheckCircle } from 'lucide-react';
import PostCard from '../components/PostCard';

export default function Profile() {
  const { id } = useParams(); // For viewing other users
  const { user: currentUser, token, updateProfile } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [interestsText, setInterestsText] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [userPosts, setUserPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  const isSelf = !id || id === currentUser?._id;

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const targetId = isSelf ? currentUser._id : id;
      const res = await fetch(`/api/users/${targetId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfileUser(data);
        setBio(data.bio || '');
        setLocation(data.location || '');
        setInterestsText(data.interests ? data.interests.join(', ') : '');
        setAvatar(data.avatar || '');
        setFollowersCount(data.followers?.length || 0);

        if (!isSelf) {
          const followingList = currentUser.following || [];
          setIsFollowing(followingList.includes(targetId));
        }

        // Fetch this user's posts
        const postsRes = await fetch(`/api/posts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (postsRes.ok) {
          const postsData = await postsRes.json();
          // Filter posts written by this author
          const filtered = postsData.filter(p => p.author._id === targetId);
          setUserPosts(filtered);
        }
      }
    } catch (err) {
      console.error('Fetch profile details failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchProfile();
    }
  }, [id, currentUser, token]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    const interests = interestsText
      .split(',')
      .map(i => i.trim())
      .filter(i => i !== '');

    try {
      const updated = await updateProfile({ bio, location, interests, avatar });
      setProfileUser(updated);
      setIsEditing(false);
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleFollowToggle = async () => {
    if (isSelf) return;
    try {
      const res = await fetch(`/api/users/${profileUser._id}/follow`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
        setFollowersCount(data.followersCount);

        // Notify over socket
        if (socket && data.isFollowing) {
          socket.emit('user_followed', { targetId: profileUser._id });
        }
      }
    } catch (err) {
      console.error('Follow toggle request failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading animate-fade-in">
        <div className="spinner"></div>
        <p>Retrieving profile logs...</p>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="profile-not-found glass-panel animate-fade-in">
        <h3>User Profile Suspended</h3>
        <p>This profile is either private, banned, or does not exist.</p>
      </div>
    );
  }

  const isOnline = onlineUsers[profileUser._id]?.online;

  return (
    <div className="profile-page-wrapper animate-fade-in">
      {/* Profile Card Header */}
      <div className="profile-header-card glass-panel">
        <div className="profile-banner-color"></div>
        
        <div className="profile-details-row">
          <div className="avatar-section">
            <img src={avatar || profileUser.avatar} alt={profileUser.username} className="main-profile-avatar" />
            {isOnline && <span className="profile-online-badge"></span>}
          </div>

          <div className="profile-identity">
            <div className="profile-name-badge">
              <h2>@{profileUser.username}</h2>
              <span className={`badge badge-${profileUser.role}`}>
                <Shield size={10} />
                {profileUser.role}
              </span>
              {profileUser.status !== 'active' && (
                <span className={`badge badge-${profileUser.status}`}>{profileUser.status}</span>
              )}
            </div>

            <div className="profile-stats">
              <span><strong>{userPosts.length}</strong> updates</span>
              <span><strong>{followersCount}</strong> followers</span>
              <span><strong>{profileUser.following?.length || 0}</strong> following</span>
            </div>

            <div className="profile-meta-chips">
              {location && (
                <span className="meta-chip">
                  <MapPin size={12} />
                  {location}
                </span>
              )}
              <span className="meta-chip">
                Joined {new Date(profileUser.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long' })}
              </span>
            </div>
          </div>

          <div className="profile-header-actions">
            {isSelf ? (
              <button className="btn-secondary" onClick={() => setIsEditing(!isEditing)}>
                <Edit3 size={14} />
                <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
              </button>
            ) : (
              <div className="peer-actions">
                <button 
                  className={`btn-primary ${isFollowing ? 'unfollow-style' : ''}`}
                  onClick={handleFollowToggle}
                >
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bio Text */}
        {!isEditing && profileUser.bio && (
          <div className="profile-bio-section">
            <p>{profileUser.bio}</p>
          </div>
        )}

        {/* Interests */}
        {!isEditing && profileUser.interests?.length > 0 && (
          <div className="profile-interests-section">
            <h4>Interests & Keywords</h4>
            <div className="interests-flex">
              {profileUser.interests.map((interest, index) => (
                <span key={index} className="interest-tag">
                  <Tag size={10} />
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Edit Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="profile-edit-form">
            <h3>Update Profile Information</h3>
            <div className="form-group">
              <label>Profile Bio</label>
              <textarea
                className="glass-input"
                rows={3}
                placeholder="Write something interesting..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>

            <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="e.g. Gujarat"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Avatar URL (Image link)</label>
                <input
                  type="text"
                  className="glass-input"
                  placeholder="Dicebear or custom image URL"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1rem', marginBottom: '1.25rem' }}>
              <label>Interests (comma separated)</label>
              <input
                type="text"
                className="glass-input"
                placeholder="Coding, Design, WebSockets"
                value={interestsText}
                onChange={(e) => setInterestsText(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={saving}>
              <CheckCircle size={16} />
              <span>{saving ? 'Saving changes...' : 'Save Profile'}</span>
            </button>
          </form>
        )}
      </div>

      {/* User's Posts Feed */}
      <div className="user-posts-section">
        <h3>Recent Updates from @{profileUser.username}</h3>
        <div className="profile-posts-list" style={{ marginTop: '1rem' }}>
          {userPosts.length === 0 ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No updates shared by this profile yet.
            </div>
          ) : (
            userPosts.map(post => (
              <PostCard 
                key={post._id} 
                post={post} 
                onPostAction={() => fetchProfile()} // Reload profile metrics on action
              />
            ))
          )}
        </div>
      </div>

      <style>{`
        .profile-page-wrapper {
          max-width: 680px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .profile-header-card {
          overflow: hidden;
          position: relative;
          padding-bottom: 1.5rem;
        }
        .profile-banner-color {
          height: 100px;
          background: linear-gradient(135deg, var(--accent-secondary) 0%, rgba(0, 240, 255, 0.4) 100%);
          opacity: 0.7;
        }
        .profile-details-row {
          display: flex;
          align-items: flex-end;
          gap: 1.5rem;
          padding: 0 1.5rem;
          margin-top: -50px;
          margin-bottom: 1rem;
        }
        .avatar-section {
          position: relative;
          width: 90px;
          height: 90px;
        }
        .main-profile-avatar {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          border: 4px solid var(--bg-secondary);
          background: var(--bg-secondary);
          object-fit: cover;
        }
        .profile-online-badge {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 16px;
          height: 16px;
          background: var(--success);
          border-radius: 50%;
          border: 3px solid var(--bg-secondary);
          box-shadow: 0 0 10px var(--success);
        }
        .profile-identity {
          flex-grow: 1;
        }
        .profile-name-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .profile-name-badge h2 {
          font-size: 1.4rem;
          font-weight: 700;
          color: #fff;
        }
        .profile-stats {
          display: flex;
          gap: 1rem;
          margin-top: 0.25rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .profile-stats strong {
          color: #fff;
        }
        .profile-meta-chips {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .meta-chip {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .profile-header-actions {
          align-self: center;
        }
        .profile-bio-section {
          padding: 0 1.5rem;
          margin-top: 0.75rem;
          font-size: 0.9rem;
          color: #e2e8f0;
          line-height: 1.5;
        }
        .profile-interests-section {
          padding: 0 1.5rem;
          margin-top: 1rem;
          border-top: 1px solid var(--border-glass);
          padding-top: 1rem;
        }
        .profile-interests-section h4 {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 0.5rem;
        }
        .interests-flex {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .interest-tag {
          font-size: 0.7rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          color: var(--accent-primary);
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .profile-edit-form {
          margin: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px dashed var(--border-glass);
        }
        .profile-edit-form h3 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }
        .profile-edit-form label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
          display: block;
        }
        .profile-loading, .profile-not-found {
          max-width: 600px;
          margin: 4rem auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }
        .unfollow-style {
          background: var(--bg-glass-hover);
          border: 1px solid var(--border-glass);
          color: var(--text-primary);
          box-shadow: none;
        }
        .unfollow-style:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          box-shadow: none;
        }
      `}</style>
    </div>
  );
}
