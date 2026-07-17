import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, MessageSquare, User, Info, ShieldAlert, Radio } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, isModerator } = useAuth();

  if (!user) return null;

  return (
    <aside className="sidebar-container glass-panel">
      <div className="sidebar-menu">
        <NavLink 
          to="/" 
          className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
        >
          <Home size={18} />
          <span>Home Feed</span>
        </NavLink>

        <NavLink 
          to="/chat" 
          className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
        >
          <MessageSquare size={18} />
          <span>Live Chat</span>
        </NavLink>

        <NavLink 
          to="/profile" 
          className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
        >
          <User size={18} />
          <span>My Profile</span>
        </NavLink>

        <NavLink 
          to="/about" 
          className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
        >
          <Info size={18} />
          <span>About Founder</span>
        </NavLink>

        {isModerator && (
          <NavLink 
            to="/admin" 
            className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}
          >
            <ShieldAlert size={18} />
            <span>Admin Portal</span>
          </NavLink>
        )}
      </div>

      {/* Account status alerts */}
      <div className="status-footer">
        {user.status === 'muted' && (
          <div className="status-alert alert-muted">
            <Radio size={14} className="pulse-alert" />
            <span>You are Muted (Read-Only)</span>
          </div>
        )}
        {user.status === 'shadowbanned' && (
          <div className="status-alert alert-shadow">
            <ShieldAlert size={14} />
            <span>Shadowbanned Mode</span>
          </div>
        )}
        <div className="user-card-brief">
          <img src={user.avatar} alt={user.username} className="avatar-brief" />
          <div className="brief-info">
            <span className="brief-name">@{user.username}</span>
            <span className={`badge badge-${user.role}`}>{user.role}</span>
          </div>
        </div>
      </div>

      <style>{`
        .sidebar-container {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1.5rem 1rem;
          border-radius: 0;
          border-left: none;
          border-top: none;
          border-bottom: none;
          height: calc(100vh - 70px);
          position: sticky;
          top: 70px;
        }
        .sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .menu-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          text-decoration: none;
          font-weight: 500;
          font-size: 0.95rem;
          transition: var(--transition-smooth);
        }
        .menu-item:hover {
          color: #fff;
          background: var(--bg-glass-hover);
          transform: translateX(3px);
        }
        .menu-item.active {
          color: var(--accent-primary);
          background: rgba(0, 240, 255, 0.08);
          border: 1px solid rgba(0, 240, 255, 0.15);
        }
        .status-footer {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          border-top: 1px solid var(--border-glass);
          padding-top: 1rem;
        }
        .status-alert {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
        }
        .alert-muted {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }
        .alert-shadow {
          background: rgba(100, 116, 139, 0.1);
          color: #94a3b8;
          border: 1px solid rgba(100, 116, 139, 0.2);
        }
        .pulse-alert {
          animation: blink 1.5s infinite;
        }
        .user-card-brief {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.25rem;
        }
        .avatar-brief {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--bg-secondary);
        }
        .brief-info {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .brief-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        @keyframes blink {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </aside>
  );
}
