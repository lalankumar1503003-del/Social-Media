import React, { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Banner() {
  const { token } = useAuth();
  const [bannerText, setBannerText] = useState('');
  const [active, setActive] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const config = await response.json();
          if (config.announcementActive) {
            setBannerText(config.announcementBanner);
            setActive(true);
          } else {
            setActive(false);
          }
        }
      } catch (err) {
        console.error('Fetch settings for banner failed:', err);
      }
    };

    fetchSettings();
    // Poll settings every 30 seconds for dynamic live announcement updates
    const interval = setInterval(fetchSettings, 30000);
    return () => clearInterval(interval);
  }, [token]);

  if (!active || dismissed || !bannerText) return null;

  return (
    <div className="banner-container">
      <div className="banner-content">
        <Megaphone size={18} className="banner-icon" />
        <span className="banner-text">
          <strong>Message from Founder, Mr. Lalan Kumar:</strong> {bannerText}
        </span>
      </div>
      <button className="banner-close" onClick={() => setDismissed(true)}>
        <X size={16} />
      </button>
      <style>{`
        .banner-container {
          background: linear-gradient(90deg, rgba(139, 92, 246, 0.25) 0%, rgba(0, 240, 255, 0.25) 100%);
          border-bottom: 1px solid rgba(0, 240, 255, 0.2);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          padding: 0.75rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #fff;
          font-size: 0.9rem;
          position: sticky;
          top: 0;
          z-index: 1000;
          box-shadow: 0 4px 15px rgba(0, 240, 255, 0.1);
          animation: slideDown 0.4s ease;
        }
        .banner-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0 auto;
          text-align: center;
        }
        .banner-icon {
          color: var(--accent-primary);
          animation: wiggle 2s infinite;
          flex-shrink: 0;
        }
        .banner-text {
          letter-spacing: 0.5px;
          line-height: 1.4;
        }
        .banner-text strong {
          color: var(--accent-primary);
          text-shadow: 0 0 10px rgba(0, 240, 255, 0.4);
        }
        .banner-close {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: var(--transition-smooth);
          padding: 2px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .banner-close:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0); }
          15% { transform: rotate(-10deg); }
          30% { transform: rotate(10deg); }
          45% { transform: rotate(-5deg); }
          60% { transform: rotate(5deg); }
        }
      `}</style>
    </div>
  );
}
