import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Users as UsersIcon, ShieldAlert, Settings as SettingsIcon, ScrollText, 
  TrendingUp, CircleAlert, Check, Ban, VolumeX, Volume2, ShieldCheck, 
  Trash2, ToggleLeft, ToggleRight, Radio, RefreshCw, Key, Edit, AlertTriangle 
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, token, isFounder } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');

  // Core Data States
  const [stats, setStats] = useState({
    onlineUsers: 0,
    totalUsers: 0,
    activeChats: 0,
    totalPosts: 0,
    reportedPosts: 0,
    messagesPerMinute: []
  });
  const [usersList, setUsersList] = useState([]);
  const [reportsList, setReportsList] = useState([]);
  const [logsList, setLogsList] = useState([]);
  const [settings, setSettings] = useState({
    disableImageUpload: false,
    disableGroupChat: false,
    announcementBanner: '',
    announcementActive: false
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [userFilter, setUserFilter] = useState('all'); // all, active, muted, banned, shadowbanned
  const [userSearch, setUserSearch] = useState('');

  // Editing forms
  const [editingUser, setEditingUser] = useState(null); // holds user object being edited
  const [resetPassUser, setResetPassUser] = useState(null); // user ID for password reset
  const [newPassword, setNewPassword] = useState('');
  const [actionReason, setActionReason] = useState('');

  const fetchAllAdminData = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch Stats
      const statsRes = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Fetch Users
      const usersRes = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsersList(usersData);
      }

      // 3. Fetch Reports
      const reportsRes = await fetch('/api/posts/reported', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setReportsList(reportsData);
      }

      // 4. Fetch Logs
      const logsRes = await fetch('/api/admin/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogsList(logsData);
      }

      // 5. Fetch Settings
      const settingsRes = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllAdminData();
  }, [token]);

  // Periodic stats polling (every 8 seconds to update live meters & charts)
  useEffect(() => {
    const statsInterval = setInterval(async () => {
      try {
        const statsRes = await fetch('/api/admin/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        console.error('Polling stats failed:', err);
      }
    }, 8000);

    return () => clearInterval(statsInterval);
  }, [token]);

  // Handle User Status Modification (ban, mute, activate)
  const handleUpdateUserStatus = async (targetUserId, newStatus) => {
    const reason = window.prompt(`Enter reason for changing status to ${newStatus}:`);
    if (reason === null) return; // user cancelled

    try {
      const res = await fetch(`/api/users/${targetUserId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus, reason })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchAllAdminData();
      } else {
        alert(data.error || 'Failed to update user status');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Role Promotion (Moderator/Admin)
  const handleUserRolePromotion = async (targetUserId, role) => {
    if (role === 'admin' && !isFounder) {
      return alert('Only Founder (Mr. Lalan Kumar) is authorized to appoint administrators.');
    }
    const reason = window.prompt(`Enter reason for promotion to ${role}:`);
    if (reason === null) return;

    try {
      const res = await fetch(`/api/users/${targetUserId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role, reason })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchAllAdminData();
      } else {
        alert(data.error || 'Promotion failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Direct Profile Updates (Admin level edit)
  const handleAdminEditProfile = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/users/${editingUser._id}/edit-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          username: editingUser.username,
          email: editingUser.email,
          location: editingUser.location,
          bio: editingUser.bio
        })
      });
      if (res.ok) {
        alert('User profile details updated successfully.');
        setEditingUser(null);
        fetchAllAdminData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update details');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Direct Password Reset
  const handleAdminResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPassUser || !newPassword.trim()) return;
    try {
      const res = await fetch(`/api/users/${resetPassUser}/reset-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword, reason: 'Admin forced security reset' })
      });
      if (res.ok) {
        alert('Password has been successfully updated.');
        setResetPassUser(null);
        setNewPassword('');
        fetchAllAdminData();
      } else {
        const data = await res.json();
        alert(data.error || 'Password reset failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Moderate Post (approve/remove/shadow-ban)
  const handleModeratePost = async (postId, action) => {
    if (!window.confirm(`Confirm moderation action: ${action}`)) return;
    try {
      const res = await fetch(`/api/posts/${postId}/moderate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, reason: `Dashboard action: ${action}` })
      });
      if (res.ok) {
        alert('Moderation action saved.');
        fetchAllAdminData();
      } else {
        const data = await res.json();
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle Global System Settings
  const handleToggleSetting = async (key, currentValue) => {
    const newValue = !currentValue;
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key, value: newValue })
      });
      if (res.ok) {
        setSettings(prev => ({ ...prev, [key]: newValue }));
        fetchAllAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Announcement Banner Text
  const handleUpdateAnnouncementText = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key: 'announcementBanner', value: settings.announcementBanner })
      });
      if (res.ok) {
        alert('Announcement banner message updated globally.');
        fetchAllAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Clear Audit Log
  const handleClearLogs = async () => {
    if (!window.confirm('Delete entire audit log trails? This action is logged.')) return;
    try {
      const res = await fetch('/api/admin/logs', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Logs database successfully cleared.');
        fetchAllAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter users list in memory
  const filteredUsers = usersList.filter(u => {
    const matchFilter = 
      userFilter === 'all' || 
      u.status === userFilter || 
      (userFilter === 'verified' && ['admin', 'founder', 'moderator'].includes(u.role));
    
    const matchSearch = 
      u.username.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.email.toLowerCase().includes(userSearch.toLowerCase());

    return matchFilter && matchSearch;
  });

  if (loading) {
    return (
      <div className="admin-loading animate-fade-in">
        <div className="spinner"></div>
        <p>Opening Secure Administrative Panel...</p>
      </div>
    );
  }

  return (
    <div className="admin-layout animate-fade-in">
      {/* Dashboard Sub Header */}
      <div className="admin-subheader glass-panel">
        <div className="subheader-title">
          <h2>Admin Control Panel</h2>
          <p>Security and content coordination center</p>
        </div>
        <button className="refresh-data-btn" onClick={fetchAllAdminData} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Reload Data'}</span>
        </button>
      </div>

      {/* Admin Tabbed Navigation */}
      <div className="admin-body-grid">
        <div className="admin-tabs-sidebar glass-panel">
          <button 
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <TrendingUp size={16} />
            <span>Live Analytics</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <UsersIcon size={16} />
            <span>User Accounts</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            <CircleAlert size={16} />
            <span>Moderation {reportsList.length > 0 && <span className="tab-alert-badge">{reportsList.length}</span>}</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={16} />
            <span>System Settings</span>
          </button>

          <button 
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <ScrollText size={16} />
            <span>Audit & Security Logs</span>
          </button>
        </div>

        {/* Tab details box */}
        <div className="admin-tab-details-box">
          {/* TAB 1: ANALYTICS & MONITORING */}
          {activeTab === 'analytics' && (
            <div className="tab-pane animate-fade-in">
              <div className="analytics-metrics-grid">
                <div className="metric-card glass-panel">
                  <span className="metric-label">Online Users</span>
                  <div className="metric-row">
                    <span className="metric-val text-success">{stats.onlineUsers}</span>
                    <span className="presence-dot pulse-online" style={{ width: '12px', height: '12px' }}></span>
                  </div>
                  <p className="metric-desc">WebSockets streams connected</p>
                </div>

                <div className="metric-card glass-panel">
                  <span className="metric-label">Total Registered</span>
                  <span className="metric-val">{stats.totalUsers}</span>
                  <p className="metric-desc">Total user database records</p>
                </div>

                <div className="metric-card glass-panel">
                  <span className="metric-label">Active Chat Rooms</span>
                  <span className="metric-val text-accent">{stats.activeChats}</span>
                  <p className="metric-desc">One-to-one & Group rooms</p>
                </div>

                <div className="metric-card glass-panel">
                  <span className="metric-label">Content Reports</span>
                  <span className={`metric-val ${stats.reportedPosts > 0 ? 'text-danger' : 'text-muted'}`}>
                    {stats.reportedPosts}
                  </span>
                  <p className="metric-desc">Flagged items pending review</p>
                </div>
              </div>

              {/* Messages per minute plotting chart (SVG-based) */}
              <div className="analytics-chart-card glass-panel" style={{ marginTop: '1.5rem' }}>
                <h3>Live Messaging Intensity</h3>
                <p className="chart-subtitle">Simulated message flow counts over the past 10 minutes</p>

                {stats.messagesPerMinute?.length > 0 ? (
                  <div className="chart-canvas-wrapper" style={{ marginTop: '1.5rem', height: '180px' }}>
                    <svg viewBox="0 0 500 150" className="chart-svg" style={{ width: '100%', height: '100%' }}>
                      <defs>
                        <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.4"/>
                          <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0"/>
                        </linearGradient>
                      </defs>
                      
                      {/* Grid Lines */}
                      <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="0" y1="75" x2="500" y2="75" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="0" y1="120" x2="500" y2="120" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

                      {/* Area graph */}
                      <path
                        d={`M 0,150 ${stats.messagesPerMinute.map((d, i) => `L ${i * 55},${130 - d.count * 12}`).join(' ')} L 495,150 Z`}
                        fill="url(#chartGlow)"
                      />

                      {/* Line graph */}
                      <path
                        d={stats.messagesPerMinute.map((d, i) => `${i === 0 ? 'M' : 'L'} ${i * 55},${130 - d.count * 12}`).join(' ')}
                        fill="none"
                        stroke="var(--accent-primary)"
                        strokeWidth="3"
                      />

                      {/* Data Dots and text labels */}
                      {stats.messagesPerMinute.map((d, i) => (
                        <g key={i}>
                          <circle 
                            cx={i * 55} 
                            cy={130 - d.count * 12} 
                            r="4" 
                            fill="var(--accent-secondary)" 
                            stroke="var(--accent-primary)"
                            strokeWidth="1.5"
                          />
                          <text 
                            x={i * 55} 
                            y={145} 
                            fill="var(--text-muted)" 
                            fontSize="8" 
                            textAnchor="middle"
                          >
                            {d.time.split(':').slice(0, 2).join(':')}
                          </text>
                          <text 
                            x={i * 55} 
                            y={118 - d.count * 12} 
                            fill="#fff" 
                            fontSize="8" 
                            fontWeight="700"
                            textAnchor="middle"
                          >
                            {d.count}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                ) : (
                  <p className="empty-chart-msg">No active conversations currently stream logs.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="tab-pane animate-fade-in">
              <div className="filter-search-row">
                <div className="filter-pills">
                  {['all', 'active', 'muted', 'banned', 'shadowbanned', 'verified'].map(filter => (
                    <button
                      key={filter}
                      className={`filter-tab-btn ${userFilter === filter ? 'active' : ''}`}
                      onClick={() => setUserFilter(filter)}
                    >
                      {filter.toUpperCase()}
                    </button>
                  ))}
                </div>
                
                <input
                  type="text"
                  placeholder="Search user email or tag..."
                  className="glass-input user-search-input"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>

              {/* Users Table */}
              <div className="admin-table-wrapper glass-panel">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Profile</th>
                      <th>Location</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u._id}>
                        <td>
                          <div className="td-user-info">
                            <img src={u.avatar} alt={u.username} className="table-avatar" />
                            <div className="avatar-meta-stack">
                              <span className="td-uname">@{u.username}</span>
                              <span className="td-email">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>{u.location || 'Gujarat'}</td>
                        <td>
                          <span className={`badge badge-${u.role}`}>{u.role}</span>
                        </td>
                        <td>
                          <span className={`badge badge-${u.status}`}>{u.status}</span>
                        </td>
                        <td>
                          <div className="action-buttons-flex">
                            {/* Ban / Unban toggler */}
                            {u.status === 'banned' ? (
                              <button 
                                className="action-icon-btn btn-green"
                                onClick={() => handleUpdateUserStatus(u._id, 'active')}
                                title="Unban user"
                              >
                                <Check size={14} />
                              </button>
                            ) : (
                              <button 
                                className="action-icon-btn btn-red"
                                onClick={() => handleUpdateUserStatus(u._id, 'banned')}
                                title="Ban user"
                              >
                                <Ban size={14} />
                              </button>
                            )}

                            {/* Mute / Unmute toggler */}
                            {u.status === 'muted' ? (
                              <button 
                                className="action-icon-btn btn-green"
                                onClick={() => handleUpdateUserStatus(u._id, 'active')}
                                title="Unmute user"
                              >
                                <Volume2 size={14} />
                              </button>
                            ) : (
                              <button 
                                className="action-icon-btn btn-yellow"
                                onClick={() => handleUpdateUserStatus(u._id, 'muted')}
                                title="Mute user"
                              >
                                <VolumeX size={14} />
                              </button>
                            )}

                            {/* Promotions */}
                            {u.role === 'user' && (
                              <button 
                                className="action-icon-btn btn-purple"
                                onClick={() => handleUserRolePromotion(u._id, 'moderator')}
                                title="Promote to Moderator"
                              >
                                <ShieldCheck size={14} />
                              </button>
                            )}

                            {u.role === 'moderator' && isFounder && (
                              <button 
                                className="action-icon-btn btn-purple"
                                onClick={() => handleUserRolePromotion(u._id, 'admin')}
                                title="Promote to Administrator"
                              >
                                <ShieldCheck size={14} fill="currentColor" />
                              </button>
                            )}

                            {/* Password reset */}
                            <button 
                              className="action-icon-btn btn-blue"
                              onClick={() => setResetPassUser(u._id)}
                              title="Reset Password"
                            >
                              <Key size={14} />
                            </button>

                            {/* Edit Details */}
                            <button 
                              className="action-icon-btn btn-blue"
                              onClick={() => setEditingUser(u)}
                              title="Edit profile"
                            >
                              <Edit size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Password Reset Modal */}
              {resetPassUser && (
                <div className="modal-overlay">
                  <form onSubmit={handleAdminResetPassword} className="modal-content glass-panel">
                    <h3>Administrative Password Reset</h3>
                    <p className="modal-desc">Forces password update on target user account. Minimum 6 characters.</p>
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label>New User Password</label>
                      <input
                        type="password"
                        required
                        className="glass-input"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div className="modal-actions">
                      <button type="button" className="btn-secondary" onClick={() => { setResetPassUser(null); setNewPassword(''); }}>Cancel</button>
                      <button type="submit" className="btn-primary" disabled={newPassword.length < 6}>Apply Update</button>
                    </div>
                  </form>
                </div>
              )}

              {/* User Profile Edit Modal */}
              {editingUser && (
                <div className="modal-overlay">
                  <form onSubmit={handleAdminEditProfile} className="modal-content glass-panel">
                    <h3>Edit User Profile details</h3>
                    <p className="modal-desc">Modify basic profile field tokens directly.</p>
                    
                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label>Username</label>
                      <input 
                        type="text" 
                        className="glass-input" 
                        value={editingUser.username}
                        onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label>Email Address</label>
                      <input 
                        type="email" 
                        className="glass-input" 
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                      <label>Location</label>
                      <input 
                        type="text" 
                        className="glass-input" 
                        value={editingUser.location}
                        onChange={(e) => setEditingUser({ ...editingUser, location: e.target.value })}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label>Bio Summary</label>
                      <textarea 
                        className="glass-input" 
                        rows={2}
                        value={editingUser.bio}
                        onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })}
                      />
                    </div>

                    <div className="modal-actions">
                      <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
                      <button type="submit" className="btn-primary">Save Info</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONTENT MODERATION */}
          {activeTab === 'content' && (
            <div className="tab-pane animate-fade-in">
              <h3>Reported Content Reviews</h3>
              <p className="tab-section-desc">Manage posts and messages flagged for review by community members.</p>

              <div className="reports-flex-stack">
                {reportsList.length === 0 ? (
                  <div className="empty-reports-banner glass-panel">
                    <ShieldCheck size={36} className="text-success" />
                    <h4>All posts are clear</h4>
                    <p>No reported items in the review queue.</p>
                  </div>
                ) : (
                  reportsList.map(post => (
                    <div key={post._id} className="reported-post-item glass-panel">
                      <div className="reported-meta-row">
                        <div className="author-brief">
                          <img src={post.author.avatar} alt="Author" className="avatar-mini" />
                          <span>@{post.author.username}</span>
                          <span className={`badge badge-${post.author.status}`}>{post.author.status}</span>
                        </div>
                        <div className="reported-tag-box">
                          <AlertTriangle size={12} className="text-danger" />
                          <span>Flagged {post.reports.length} times</span>
                        </div>
                      </div>

                      <div className="reported-reasons-list">
                        <strong>Reporter Reasons:</strong>
                        <ul>
                          {post.reports.map((r, i) => (
                            <li key={i}>
                              @{r.reporter?.username || 'user'}: <em>"{r.reason}"</em>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="reported-body-preview">
                        <p>{post.text}</p>
                        {post.mediaUrl && <img src={post.mediaUrl} alt="Reported Media" className="reports-media-preview" />}
                      </div>

                      <div className="reported-actions">
                        <button 
                          className="btn-secondary"
                          onClick={() => handleModeratePost(post._id, 'safe')}
                          title="Approve post and dismiss reports"
                        >
                          <Check size={14} className="text-success" />
                          <span>Approve & Clear</span>
                        </button>

                        <button 
                          className="btn-danger"
                          onClick={() => handleModeratePost(post._id, 'delete')}
                        >
                          <Trash2 size={14} />
                          <span>Remove Post</span>
                        </button>

                        <button 
                          className="btn-secondary"
                          style={{ borderColor: 'rgba(245, 158, 11, 0.3)', color: '#fbbf24' }}
                          onClick={() => handleUpdateUserStatus(post.author._id, 'shadowbanned')}
                          title="Shadow-ban spammers"
                        >
                          <Ban size={14} />
                          <span>Shadow-Ban Author</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM SETTINGS */}
          {activeTab === 'settings' && (
            <div className="tab-pane animate-fade-in">
              <h3>System Configurations</h3>
              <p className="tab-section-desc">Global switches toggling web socket modules and post upload mechanics.</p>

              <div className="settings-toggles-card glass-panel">
                <div className="setting-toggle-row">
                  <div className="toggle-label-column">
                    <h4>Disable Media Attachments</h4>
                    <p>When checked, users cannot upload images or links inside posts.</p>
                  </div>
                  <button 
                    className="toggle-icon-trigger"
                    onClick={() => handleToggleSetting('disableImageUpload', settings.disableImageUpload)}
                  >
                    {settings.disableImageUpload ? (
                      <ToggleRight size={38} className="text-accent" />
                    ) : (
                      <ToggleLeft size={38} className="text-muted" />
                    )}
                  </button>
                </div>

                <div className="setting-toggle-row">
                  <div className="toggle-label-column">
                    <h4>Turn off Group Chat Lobbies</h4>
                    <p>When checked, creation of group chat rooms is globally locked.</p>
                  </div>
                  <button 
                    className="toggle-icon-trigger"
                    onClick={() => handleToggleSetting('disableGroupChat', settings.disableGroupChat)}
                  >
                    {settings.disableGroupChat ? (
                      <ToggleRight size={38} className="text-accent" />
                    ) : (
                      <ToggleLeft size={38} className="text-muted" />
                    )}
                  </button>
                </div>

                <div className="setting-toggle-row">
                  <div className="toggle-label-column">
                    <h4>Announcement Banner</h4>
                    <p>Toggle display status of the global announcement message at the top of the interface.</p>
                  </div>
                  <button 
                    className="toggle-icon-trigger"
                    onClick={() => handleToggleSetting('announcementActive', settings.announcementActive)}
                  >
                    {settings.announcementActive ? (
                      <ToggleRight size={38} className="text-accent" />
                    ) : (
                      <ToggleLeft size={38} className="text-muted" />
                    )}
                  </button>
                </div>
              </div>

              {/* Edit Banner announcement */}
              <div className="announcement-edit-card glass-panel" style={{ marginTop: '1.5rem' }}>
                <h3>Founder's Broadcast Message</h3>
                <p className="chart-subtitle" style={{ marginBottom: '1rem' }}>Updating this updates the alert notification on all active screens instantaneously.</p>

                <form onSubmit={handleUpdateAnnouncementText} className="announcement-form-box">
                  <textarea
                    className="glass-input announcement-text-area"
                    value={settings.announcementBanner}
                    onChange={(e) => setSettings({ ...settings, announcementBanner: e.target.value })}
                    required
                    rows={3}
                  />
                  <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-end', marginTop: '0.75rem' }}>
                    <Radio size={14} className="pulse-alert" />
                    <span>Publish Announcement</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS & SECURITY */}
          {activeTab === 'logs' && (
            <div className="tab-pane animate-fade-in">
              <div className="logs-header-row">
                <div className="logs-header-meta">
                  <h3>Audit Trails & Security Registry</h3>
                  <p className="tab-section-desc">A chronological capture of administrative bans, parameter edits, and failed login attempts.</p>
                </div>
                {isFounder && (
                  <button className="btn-danger" onClick={handleClearLogs} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                    Clear Registry
                  </button>
                )}
              </div>

              <div className="logs-scroller glass-panel" style={{ marginTop: '1.5rem' }}>
                {logsList.length === 0 ? (
                  <p className="empty-logs-msg">No actions logged in database.</p>
                ) : (
                  logsList.map(log => {
                    const isSecurityFailure = ['failed_login', 'suspicious_activity'].includes(log.actionType);
                    return (
                      <div key={log._id} className={`log-row-item ${isSecurityFailure ? 'security-fail' : ''}`}>
                        <span className="log-time">
                          {new Date(log.timestamp).toLocaleDateString()}{' '}
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        
                        <div className="log-details-block">
                          <p className="log-summary">
                            {log.admin ? (
                              <strong>@{log.admin.username} ({log.admin.role}): </strong>
                            ) : (
                              <strong>[SYSTEM INTERNAL]: </strong>
                            )}
                            <span className={`log-type-tag type-${log.actionType}`}>{log.actionType.toUpperCase()}</span>{' '}
                            on target: <strong>{log.target} ({log.targetModel})</strong>
                          </p>
                          {log.reason && <p className="log-reason-note">Reason: <em>"{log.reason}"</em></p>}
                          {log.ipAddress && <span className="log-ip">IP Address: {log.ipAddress}</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Panel Footer with Founder MR. LALAN KUMAR mention */}
      <footer className="admin-footer-copyright glass-panel">
        <p>Lalan Connect Moderation Engine. Designed & Founded by Mr. Lalan Kumar. System Role: Admin Console</p>
      </footer>

      <style>{`
        .admin-layout {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .admin-subheader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
        }
        .subheader-title h2 {
          font-size: 1.4rem;
          font-weight: 800;
          color: #fff;
        }
        .subheader-title p {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .refresh-data-btn {
          background: rgba(0, 240, 255, 0.1);
          border: 1px solid rgba(0, 240, 255, 0.2);
          color: var(--accent-primary);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          transition: var(--transition-smooth);
        }
        .refresh-data-btn:hover {
          background: var(--accent-primary);
          color: #000;
        }

        .admin-body-grid {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 1.5rem;
          align-items: start;
        }
        @media (max-width: 800px) {
          .admin-body-grid {
            grid-template-columns: 1fr;
          }
        }
        .admin-tabs-sidebar {
          display: flex;
          flex-direction: column;
          padding: 0.75rem;
          gap: 0.35rem;
        }
        .tab-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          font-family: var(--font-sans);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          transition: var(--transition-smooth);
          text-align: left;
        }
        .tab-btn:hover {
          background: var(--bg-glass-hover);
          color: #fff;
        }
        .tab-btn.active {
          color: var(--accent-primary);
          background: rgba(0, 240, 255, 0.08);
          border: 1px solid rgba(0, 240, 255, 0.15);
        }
        .tab-alert-badge {
          background: var(--danger);
          color: #fff;
          font-size: 0.6rem;
          padding: 0.1rem 0.35rem;
          border-radius: var(--radius-full);
          margin-left: auto;
        }

        .admin-tab-details-box {
          min-height: 400px;
        }
        .tab-pane h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #fff;
        }
        .tab-section-desc {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 1.25rem;
        }

        /* Analytics Tab */
        .analytics-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }
        .metric-card {
          padding: 1.25rem;
        }
        .metric-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .metric-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .metric-val {
          font-size: 1.8rem;
          font-weight: 800;
          color: #fff;
          line-height: 1.2;
          margin-top: 0.25rem;
        }
        .metric-desc {
          font-size: 0.7rem;
          color: var(--text-muted);
          margin-top: 0.15rem;
        }
        .analytics-chart-card {
          padding: 1.5rem;
        }
        .chart-subtitle {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
        .empty-chart-msg {
          text-align: center;
          padding: 2rem;
          color: var(--text-muted);
          font-size: 0.8rem;
        }
        .text-success { color: var(--success); }
        .text-danger { color: var(--danger); }
        .text-accent { color: var(--accent-primary); }

        /* Users management Tab */
        .filter-search-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .filter-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem;
        }
        .filter-tab-btn {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-glass);
          color: var(--text-secondary);
          padding: 0.3rem 0.6rem;
          font-size: 0.65rem;
          font-weight: 700;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .filter-tab-btn:hover {
          background: rgba(255,255,255,0.05);
          color: #fff;
        }
        .filter-tab-btn.active {
          background: var(--accent-secondary);
          border-color: var(--accent-secondary);
          color: #fff;
        }
        .user-search-input {
          max-width: 250px;
          padding: 0.4rem 0.75rem;
          font-size: 0.8rem;
        }
        .admin-table-wrapper {
          overflow-x: auto;
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.85rem;
        }
        .admin-table th {
          padding: 1rem;
          border-bottom: 1px solid var(--border-glass);
          color: var(--text-secondary);
          font-weight: 600;
        }
        .admin-table td {
          padding: 0.85rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.02);
          color: #e2e8f0;
        }
        .td-user-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .table-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
        }
        .avatar-meta-stack {
          display: flex;
          flex-direction: column;
        }
        .td-uname {
          font-weight: 600;
          color: #fff;
        }
        .td-email {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .action-buttons-flex {
          display: flex;
          gap: 0.35rem;
        }
        .action-icon-btn {
          background: transparent;
          border: 1px solid transparent;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-smooth);
        }
        .action-icon-btn.btn-red { color: #fca5a5; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); }
        .action-icon-btn.btn-red:hover { background: var(--danger); color: #fff; }
        
        .action-icon-btn.btn-green { color: #a7f3d0; background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); }
        .action-icon-btn.btn-green:hover { background: var(--success); color: #fff; }
        
        .action-icon-btn.btn-yellow { color: #fde68a; background: rgba(245, 158, 11, 0.1); border-color: rgba(245, 158, 11, 0.2); }
        .action-icon-btn.btn-yellow:hover { background: var(--warning); color: #000; }

        .action-icon-btn.btn-purple { color: #c084fc; background: rgba(139, 92, 246, 0.1); border-color: rgba(139, 92, 246, 0.2); }
        .action-icon-btn.btn-purple:hover { background: var(--accent-secondary); color: #fff; }

        .action-icon-btn.btn-blue { color: #93c5fd; background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.2); }
        .action-icon-btn.btn-blue:hover { background: #3b82f6; color: #fff; }

        /* Moderation tab reported posts lists */
        .reports-flex-stack {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .reported-post-item {
          padding: 1.25rem;
        }
        .reported-meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-glass);
          padding-bottom: 0.5rem;
        }
        .reported-tag-box {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm);
        }
        .reported-reasons-list {
          background: rgba(255,255,255,0.01);
          border: 1px solid var(--border-glass);
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          margin-bottom: 0.75rem;
          color: var(--text-secondary);
        }
        .reported-reasons-list ul {
          padding-left: 1.25rem;
          margin-top: 0.25rem;
        }
        .reported-body-preview p {
          font-size: 0.85rem;
          line-height: 1.4;
          color: #e2e8f0;
        }
        .reports-media-preview {
          max-height: 150px;
          object-fit: cover;
          border-radius: var(--radius-sm);
          margin-top: 0.5rem;
        }
        .reported-actions {
          display: flex;
          gap: 0.5rem;
          margin-top: 1rem;
          border-top: 1px dashed var(--border-glass);
          padding-top: 0.75rem;
        }
        .reported-actions button {
          padding: 0.4rem 0.8rem;
          font-size: 0.75rem;
        }
        .empty-reports-banner {
          padding: 3rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        /* Settings configuration Tab */
        .settings-toggles-card {
          padding: 0.5rem 1.5rem;
          display: flex;
          flex-direction: column;
        }
        .setting-toggle-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 0;
          border-bottom: 1px solid var(--border-glass);
        }
        .setting-toggle-row:last-child {
          border-bottom: none;
        }
        .toggle-label-column h4 {
          font-size: 0.9rem;
          font-weight: 600;
          color: #fff;
        }
        .toggle-label-column p {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .toggle-icon-trigger {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--accent-primary);
        }
        .announcement-edit-card {
          padding: 1.5rem;
        }
        .announcement-form-box {
          display: flex;
          flex-direction: column;
        }
        .announcement-text-area {
          font-size: 0.85rem;
        }

        /* Audit Logs Tab */
        .logs-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }
        .logs-scroller {
          max-height: 450px;
          overflow-y: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .log-row-item {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 1rem;
          font-size: 0.75rem;
          border-bottom: 1px solid rgba(255,255,255,0.01);
          padding: 0.5rem 0;
        }
        .log-row-item.security-fail {
          background: rgba(239, 68, 68, 0.05);
          border-left: 2px solid var(--danger);
          padding-left: 0.5rem;
        }
        .log-time {
          color: var(--text-muted);
          font-family: monospace;
        }
        .log-details-block {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .log-summary {
          color: #cbd5e1;
        }
        .log-type-tag {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.1rem 0.35rem;
          border-radius: var(--radius-sm);
        }
        .log-type-tag.type-ban, .log-type-tag.type-failed_login { background: rgba(239, 68, 68, 0.15); color: #fca5a5; }
        .log-type-tag.type-unban, .log-type-tag.type-unmute { background: rgba(16, 185, 129, 0.15); color: #a7f3d0; }
        .log-type-tag.type-mute { background: rgba(245, 158, 11, 0.15); color: #fde68a; }
        .log-type-tag.type-promote { background: rgba(139, 92, 246, 0.15); color: #c084fc; }
        .log-reason-note {
          color: var(--text-secondary);
        }
        .log-ip {
          font-size: 0.65rem;
          color: var(--text-muted);
        }
        .empty-logs-msg {
          text-align: center;
          padding: 2rem;
          color: var(--text-muted);
        }

        /* Admin Footer copyright with Founder Mr. Lalan Kumar */
        .admin-footer-copyright {
          text-align: center;
          padding: 1rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          border-radius: var(--radius-sm);
          margin-top: 1rem;
        }

        .admin-loading {
          max-width: 600px;
          margin: 6rem auto;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
      `}</style>
    </div>
  );
}
