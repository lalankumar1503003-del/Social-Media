import React from 'react';
import { Target, Shield, Users, Radio, Globe, Milestone } from 'lucide-react';

export default function About() {
  return (
    <div className="about-page-container animate-fade-in">
      {/* Brand Hero */}
      <div className="about-hero glass-panel">
        <div className="hero-text-content">
          <span className="founder-tag">FOUNDED BY MR. LALAN KUMAR</span>
          <h1>Lalan Connect</h1>
          <p className="hero-sub">A Real-Time Social Hub designed to foster instantaneous digital relationships.</p>
        </div>
        <div className="founder-visual">
          <img 
            src="https://api.dicebear.com/7.x/bottts/svg?seed=lalan" 
            alt="Founder Mr. Lalan Kumar" 
            className="founder-photo-avatar" 
          />
          <div className="founder-label">
            <h4>Mr. Lalan Kumar</h4>
            <span>Founder & CEO</span>
          </div>
        </div>
      </div>

      {/* Mission & Purpose */}
      <div className="about-grid">
        <div className="mission-card glass-panel">
          <Target size={24} className="card-icon" />
          <h3>Our Core Mission</h3>
          <p>
            Lalan Connect was founded in 2026 by Mr. Lalan Kumar with a singular vision: to create a secure, high-performance, real-time social ecosystem. We believe that networking should be instantaneous, and social interactions should reflect the velocity of modern ideas.
          </p>
        </div>

        <div className="mission-card glass-panel">
          <Milestone size={24} className="card-icon" />
          <h3>Interactive Integrity</h3>
          <p>
            By combining high-speed WebSocket messaging with automated admin content moderation and auditing logs, we ensure a clean, spam-free environment where authentic user updates can flourish without malicious disruptions.
          </p>
        </div>
      </div>

      {/* Technology Stack Details */}
      <div className="tech-stack-details glass-panel">
        <h3>Powering Live Interactions</h3>
        <p className="tech-intro">Lalan Connect relies on cutting-edge real-time technologies to deliver millisecond-range synchronization:</p>
        
        <div className="features-highlight-grid">
          <div className="feature-item">
            <Radio size={20} className="feature-icon" />
            <div className="feat-desc">
              <h4>Socket.io Streams</h4>
              <p>Online status presence detection, message rooms, and instant post reflections are piped through low-latency full-duplex TCP streams.</p>
            </div>
          </div>

          <div className="feature-item">
            <Users size={20} className="feature-icon" />
            <div className="feat-desc">
              <h4>Collaborative Rooms</h4>
              <p>Supports direct 1-to-1 secure private channels alongside multi-peer group chat lobbies with responsive typing indicator loops.</p>
            </div>
          </div>

          <div className="feature-item">
            <Shield size={20} className="feature-icon" />
            <div className="feat-desc">
              <h4>Security Sandbox</h4>
              <p>Robust JWT validation blocks malicious requests, while advanced administrative rules control access parameters dynamically.</p>
            </div>
          </div>

          <div className="feature-item">
            <Globe size={20} className="feature-icon" />
            <div className="feat-desc">
              <h4>Gujarat Social Hub</h4>
              <p>Headquartered in Gujarat, India, connecting regional developer collectives and creative minds under a single real-time sky.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer copyright with Founder mention */}
      <footer className="about-footer-banner">
        <p>© 2026 Lalan Connect Social Hub. Designed and Founded by Mr. Lalan Kumar. All rights reserved.</p>
      </footer>

      <style>{`
        .about-page-container {
          max-width: 760px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .about-hero {
          padding: 2.5rem;
          display: grid;
          grid-template-columns: 1fr 200px;
          gap: 2rem;
          align-items: center;
        }
        @media (max-width: 600px) {
          .about-hero {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .founder-visual {
            margin: 0 auto;
          }
        }
        .founder-tag {
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--accent-primary);
          letter-spacing: 1px;
          border: 1px solid rgba(0, 240, 255, 0.25);
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-sm);
          display: inline-block;
          margin-bottom: 0.75rem;
          text-shadow: 0 0 8px rgba(0, 240, 255, 0.2);
        }
        .about-hero h1 {
          font-size: 2.2rem;
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 0.5rem;
        }
        .hero-sub {
          color: var(--text-secondary);
          font-size: 1rem;
          line-height: 1.5;
        }
        
        .founder-visual {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }
        .founder-photo-avatar {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          border: 3px solid var(--accent-primary);
          background: var(--bg-secondary);
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.2);
        }
        .founder-label h4 {
          font-size: 0.9rem;
          color: #fff;
          font-weight: 600;
        }
        .founder-label span {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .about-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        @media (max-width: 600px) {
          .about-grid {
            grid-template-columns: 1fr;
          }
        }
        .mission-card {
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .card-icon {
          color: var(--accent-primary);
          margin-bottom: 0.25rem;
        }
        .mission-card h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #fff;
        }
        .mission-card p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .tech-stack-details {
          padding: 2rem;
        }
        .tech-stack-details h3 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .tech-intro {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
        }
        .features-highlight-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        @media (max-width: 600px) {
          .features-highlight-grid {
            grid-template-columns: 1fr;
          }
        }
        .feature-item {
          display: flex;
          gap: 0.75rem;
        }
        .feature-icon {
          color: var(--accent-secondary);
          flex-shrink: 0;
          margin-top: 0.15rem;
        }
        .feat-desc h4 {
          font-size: 0.9rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 0.2rem;
        }
        .feat-desc p {
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .about-footer-banner {
          text-align: center;
          padding: 1.5rem;
          color: var(--text-muted);
          font-size: 0.75rem;
          border-top: 1px solid var(--border-glass);
        }
      `}</style>
    </div>
  );
}
