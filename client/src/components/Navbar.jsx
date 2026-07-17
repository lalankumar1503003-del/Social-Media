import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Shield, User as UserIcon, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export default function Navbar() {
  const { user, logout, isModerator } = useAuth();
  const { notifications, markAllNotificationsRead, clearAllNotifications } = useSocket();
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotificationClick = (notif) => {
    if (notif.data?.chatId) {
      navigate('/chat');
    } else if (notif.data?.postId) {
      navigate('/feed');
    }
  };

  return (
    <nav className="navbar-container glass-panel">
      <Link to="/" className="navbar-logo">
        <span className="logo-icon">LC</span>
        <span className="logo-text">Lalan <span className="highlight">Connect</span></span>
      </Link>

      <div className="navbar-actions">
        {user ? (
          <>
            {isModerator && (
              <Link to="/admin" className="admin-pill" title="Go to Admin Panel">
                <Shield size={14} />
                <span>Admin</span>
              </Link>
            )}

            {/* Notifications Dropdown */}
            <div className="notification-bell-container">
              <button 
                className="action-btn notifications-bell" 
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </button>

              {showDropdown && (
                <div className="notifications-dropdown glass-panel">
                  <div className="dropdown-header">
                    <h4>Notifications</h4>
                    <div className="dropdown-actions">
                      <button onClick={markAllNotificationsRead}>Mark read</button>
                      <span>|</span>
                      <button onClick={clearAllNotifications}>Clear all</button>
                    </div>
                  </div>

                  <div className="notifications-list">
                    {notifications.length === 0 ? (
                      <div className="empty-notifications">
                        No new updates. Keep engaging!
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n._id} 
                          className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                          onClick={() => handleNotificationClick(n)}
                        >
                          <div className="notif-avatar-container">
                            <img 
                              src={n.sender?.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=system'} 
                              alt="Sender avatar" 
                              className="notif-avatar" 
                            />
                            {n.sender?.role === 'founder' && <span className="notif-founder-dot">F</span>}
                          </div>
                          <div className="notif-body">
                            <p className="notif-text">
                              {n.type === 'announcement' ? (
                                <strong>Broadcast: </strong>
                              ) : (
                                <strong>@{n.sender?.username || 'System'}: </strong>
                              )}
                              {n.data?.text || n.data?.announcementTitle}
                            </p>
                            <span className="notif-time">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile pill */}
            <Link to={`/profile`} className="user-profile-pill">
              <img src={user.avatar} alt={user.username} className="navbar-avatar" />
              <span className="navbar-username">@{user.username}</span>
            </Link>

            <button onClick={handleLogout} className="logout-btn" title="Sign Out">
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <div className="auth-links">
            <Link to="/login" className="btn-secondary">Log In</Link>
            <Link to="/register" className="btn-primary">Sign Up</Link>
          </div>
        )}
      </div>

      <style>{`
        .navbar-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 2rem;
          border-radius: 0;
          border-left: none;
          border-right: none;
          border-top: none;
          height: 70px;
          position: sticky;
          top: 0;
          z-index: 999;
        }
        .navbar-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: #fff;
          font-weight: 700;
          font-size: 1.3rem;
        }
        .logo-icon {
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          color: #000;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          font-weight: 800;
          box-shadow: 0 0 10px rgba(0, 240, 255, 0.4);
        }
        .logo-text .highlight {
          color: var(--accent-primary);
          text-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
        }
        .navbar-actions {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }
        .action-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          transition: var(--transition-smooth);
          padding: 0.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }
        .admin-pill {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
          color: #c084fc;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-full);
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 600;
          transition: var(--transition-smooth);
        }
        .admin-pill:hover {
          background: rgba(139, 92, 246, 0.3);
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.2);
        }
        .notification-bell-container {
          position: relative;
        }
        .notification-badge {
          background-color: var(--danger);
          color: white;
          font-size: 0.65rem;
          font-weight: 700;
          border-radius: 50%;
          position: absolute;
          top: 0px;
          right: 0px;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--bg-secondary);
          box-shadow: 0 0 6px var(--danger);
        }
        .notifications-dropdown {
          position: absolute;
          right: 0;
          top: 45px;
          width: 320px;
          max-height: 400px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1010;
          animation: fadeIn 0.2s ease forwards;
        }
        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border-bottom: 1px solid var(--border-glass);
        }
        .dropdown-header h4 {
          font-size: 0.95rem;
          font-weight: 600;
        }
        .dropdown-actions {
          display: flex;
          gap: 0.35rem;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .dropdown-actions button {
          background: transparent;
          border: none;
          color: var(--accent-primary);
          cursor: pointer;
        }
        .dropdown-actions button:hover {
          text-decoration: underline;
        }
        .notifications-list {
          overflow-y: auto;
          flex-grow: 1;
        }
        .empty-notifications {
          padding: 2rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.85rem;
        }
        .notification-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .notification-item:hover {
          background: var(--bg-glass-hover);
        }
        .notification-item.unread {
          background: rgba(0, 240, 255, 0.03);
          border-left: 2px solid var(--accent-primary);
        }
        .notif-avatar-container {
          position: relative;
        }
        .notif-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid var(--border-glass);
        }
        .notif-founder-dot {
          position: absolute;
          bottom: -2px;
          right: -2px;
          background: var(--warning);
          color: #000;
          font-size: 0.6rem;
          font-weight: 900;
          border-radius: 50%;
          width: 14px;
          height: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #000;
        }
        .notif-body {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .notif-text {
          font-size: 0.8rem;
          color: var(--text-primary);
          line-height: 1.3;
        }
        .notif-time {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        .user-profile-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          padding: 0.35rem 0.8rem;
          border-radius: var(--radius-full);
          text-decoration: none;
          color: var(--text-secondary);
          transition: var(--transition-smooth);
        }
        .user-profile-pill:hover {
          border-color: var(--accent-primary);
          color: #fff;
          background: var(--bg-glass-hover);
        }
        .navbar-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
        }
        .navbar-username {
          font-size: 0.8rem;
          font-weight: 500;
        }
        .logout-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: var(--transition-smooth);
          display: flex;
          align-items: center;
          padding: 0.4rem;
          border-radius: 50%;
        }
        .logout-btn:hover {
          color: var(--danger);
          background: rgba(239, 68, 68, 0.1);
        }
        .auth-links {
          display: flex;
          gap: 0.75rem;
        }
      `}</style>
    </nav>
  );
}
