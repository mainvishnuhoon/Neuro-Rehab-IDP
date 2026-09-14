import { Activity, User } from 'lucide-react';

export function Header({ onNavigateHome }) {
  return (
    <header className="app-header">
      <div className="header-container">
        {/* Left: Brand / IDP info */}
        <div className="brand-group" onClick={onNavigateHome} role="button" tabIndex={0}>
          <div className="brand-icon-wrapper">
            <Activity className="brand-icon" size={24} />
          </div>
          <div>
            <div className="brand-title">
              <span className="brand-name">NeuroRehab</span>
              <span className="brand-tag">IDP Prototype</span>
            </div>
            <p className="brand-subtitle">Innovative Design Project · Biomedical Motion AI</p>
          </div>
        </div>

        {/* Right: Patient & System status badge */}
        <div className="header-meta">
          <div className="system-pill">
            <span className="status-dot"></span>
            <span className="system-text">Vision Engine Ready</span>
          </div>

          <div className="patient-badge">
            <div className="avatar-circle">
              <User size={16} />
            </div>
            <div className="patient-info">
              <span className="patient-name">Alex Morgan</span>
              <span className="patient-id">ID: #NR-8421</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
