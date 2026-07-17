import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('Gujarat');
  const [bio, setBio] = useState('');
  const [interestsInput, setInterestsInput] = useState('Coding, Design, Networking');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const interests = interestsInput
      .split(',')
      .map(item => item.trim())
      .filter(item => item !== '');

    try {
      await register({
        username,
        email,
        password,
        location,
        bio,
        interests
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card glass-panel animate-fade-in" style={{ maxWidth: '480px' }}>
        <div className="auth-header">
          <div className="auth-logo">LC</div>
          <h2>Join Lalan Connect</h2>
          <p>Create an account to start interacting in real time</p>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-row-2">
            <div className="form-group">
              <label>Username</label>
              <input 
                type="text" 
                required 
                className="glass-input" 
                placeholder="e.g. jigar12"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                required 
                className="glass-input" 
                placeholder="e.g. jigar@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              required 
              className="glass-input" 
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Location</label>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="e.g. Gujarat, India"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Interests (comma separated)</label>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="e.g. Coding, Music, Sports"
                value={interestsInput}
                onChange={(e) => setInterestsInput(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Bio (Short description)</label>
            <textarea 
              className="glass-input" 
              rows={2}
              placeholder="Tell other members about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
            <UserPlus size={18} />
            <span>{loading ? 'Creating Account...' : 'Sign Up'}</span>
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login" className="auth-link">Log In</Link></p>
        </div>
      </div>

      <style>{`
        .form-row-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        @media (max-width: 500px) {
          .form-row-2 {
            grid-template-columns: 1fr;
            gap: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}
