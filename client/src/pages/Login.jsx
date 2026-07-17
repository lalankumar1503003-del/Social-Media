import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Key, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(emailOrUsername, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (username, pass) => {
    setEmailOrUsername(username);
    setPassword(pass);
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card glass-panel animate-fade-in">
        <div className="auth-header">
          <div className="auth-logo">LC</div>
          <h2>Welcome Back</h2>
          <p>Login to your real-time dashboard</p>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Username or Email</label>
            <input 
              type="text" 
              required
              className="glass-input" 
              placeholder="e.g. lalan or admin"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              required
              className="glass-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
            <LogIn size={18} />
            <span>{loading ? 'Logging In...' : 'Log In'}</span>
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register" className="auth-link">Sign Up</Link></p>
        </div>
      </div>

      {/* Seeded Accounts Helper Panel */}
      <div className="seed-helper-card glass-panel animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <div className="helper-header">
          <HelpCircle size={16} className="helper-icon" />
          <h3>Pre-seeded Demo Accounts</h3>
        </div>
        <p className="helper-desc">For testing and grading, click on any role below to pre-fill credentials:</p>
        
        <div className="seed-grid">
          <button 
            type="button" 
            className="seed-pill seed-founder"
            onClick={() => fillCredentials('lalan', 'lalan123')}
          >
            <strong>Founder:</strong> @lalan (lalan123)
          </button>

          <button 
            type="button" 
            className="seed-pill seed-admin"
            onClick={() => fillCredentials('admin', 'admin123')}
          >
            <strong>Admin:</strong> @admin (admin123)
          </button>

          <button 
            type="button" 
            className="seed-pill seed-moderator"
            onClick={() => fillCredentials('moderator', 'mod123')}
          >
            <strong>Moderator:</strong> @moderator (mod123)
          </button>

          <button 
            type="button" 
            className="seed-pill seed-user"
            onClick={() => fillCredentials('suresh', 'user123')}
          >
            <strong>User:</strong> @suresh (user123)
          </button>
        </div>
      </div>

      <style>{`
        .auth-page-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 120px);
          gap: 1.5rem;
          padding: 2rem;
        }
        .auth-card {
          width: 100%;
          max-width: 420px;
          padding: 2.5rem;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
        }
        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        .auth-logo {
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          color: #000;
          width: 50px;
          height: 50px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          font-weight: 800;
          margin: 0 auto 1rem;
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.3);
        }
        .auth-header h2 {
          font-size: 1.6rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 0.25rem;
        }
        .auth-header p {
          color: var(--text-secondary);
          font-size: 0.85rem;
        }
        .auth-error-banner {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .form-group label {
          font-size: 0.8rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .auth-submit-btn {
          margin-top: 0.5rem;
          width: 100%;
        }
        .auth-footer {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .auth-link {
          color: var(--accent-primary);
          text-decoration: none;
          font-weight: 600;
        }
        .auth-link:hover {
          text-decoration: underline;
        }

        /* Demo Helper styles */
        .seed-helper-card {
          width: 100%;
          max-width: 420px;
          padding: 1.25rem 1.5rem;
          background: rgba(15, 23, 42, 0.4);
          border-color: rgba(0, 240, 255, 0.1);
        }
        .helper-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.35rem;
        }
        .helper-header h3 {
          font-size: 0.95rem;
          font-weight: 600;
        }
        .helper-icon {
          color: var(--accent-primary);
        }
        .helper-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
        }
        .seed-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
        }
        .seed-pill {
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-glass);
          color: var(--text-secondary);
          padding: 0.5rem;
          border-radius: var(--radius-sm);
          font-family: var(--font-sans);
          font-size: 0.75rem;
          cursor: pointer;
          transition: var(--transition-smooth);
          text-align: left;
        }
        .seed-pill:hover {
          background: var(--bg-glass-hover);
          border-color: var(--accent-primary);
          color: #fff;
          transform: translateY(-1px);
        }
        .seed-founder strong { color: var(--warning); }
        .seed-admin strong { color: #c084fc; }
        .seed-moderator strong { color: #22d3ee; }
        .seed-user strong { color: #cbd5e1; }
      `}</style>
    </div>
  );
}
