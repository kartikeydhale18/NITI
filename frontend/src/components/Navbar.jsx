import React from 'react';
import { Zap, RotateCcw, Activity, PieChart, Sparkles, History } from 'lucide-react';

/**
 * Navbar Component
 * ----------------
 * Provides the primary header navigation with:
 * - Brand logo featuring the signature glowing Amber lightning bolt
 * - Segmented Navigation Tabs: [Portfolio & Holdings] | [Simulation Lab] | [Audit Ledger]
 * - Real-time backend connectivity status badge
 * - Instant portfolio reset button
 */
export default function Navbar({
  activeTab,
  setActiveTab,
  historyCount,
  onReset,
  isResetting,
  onRefresh,
  isRefreshing,
  isConnected
}) {
  return (
    <header className="glass-panel" style={{
      margin: '20px 24px',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: '16px',
      zIndex: 50,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      {/* Brand & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(247, 147, 26, 0.2), rgba(247, 147, 26, 0.05))',
          border: '1px solid rgba(247, 147, 26, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px -2px rgba(247, 147, 26, 0.4)'
        }}>
          <Zap size={20} color="#f7931a" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.2rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              background: 'linear-gradient(90deg, #ffffff 40%, #f7931a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              NITI
            </span>
            <span className="pill-badge pill-amber" style={{ fontSize: '0.65rem', padding: '2px 7px' }}>
              v2.5
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Tactical Portfolio Rebalancing
          </p>
        </div>
      </div>

      {/* Center Segmented Navigation Tabs */}
      <nav className="nav-tab-container">
        <button
          id="tab-btn-portfolio"
          type="button"
          onClick={() => setActiveTab('portfolio')}
          className={`nav-tab-btn ${activeTab === 'portfolio' ? 'active' : ''}`}
        >
          <PieChart size={15} />
          <span>Portfolio & Allocation</span>
        </button>

        <button
          id="tab-btn-simulation"
          type="button"
          onClick={() => setActiveTab('simulation')}
          className={`nav-tab-btn ${activeTab === 'simulation' ? 'active' : ''}`}
        >
          <Sparkles size={15} />
          <span>News Feed & Simulation</span>
        </button>

        <button
          id="tab-btn-audit"
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`nav-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
        >
          <History size={15} />
          <span>Audit Ledger</span>
          {historyCount > 0 && <span className="tab-badge">{historyCount}</span>}
        </button>
      </nav>

      {/* Status Badges & Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Connection Status Pill */}
        <div className={`pill-badge ${isConnected ? 'pill-bullish' : 'pill-bearish'}`} style={{ padding: '4px 10px' }}>
          <span className={`pulse-dot ${isConnected ? 'green' : 'amber'}`}></span>
          {isConnected ? 'API LIVE' : 'OFFLINE'}
        </div>

        {/* Sync Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="btn-secondary"
          title="Refresh live portfolio data from SQLite"
          style={{ padding: '7px 12px', fontSize: '0.8rem' }}
        >
          <Activity size={14} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Sync</span>
        </button>

        {/* Reset Portfolio Button */}
        <button
          onClick={onReset}
          disabled={isResetting}
          className="btn-secondary"
          title="Reset portfolio to baseline $100k starting weights"
          style={{
            borderColor: 'rgba(255, 51, 102, 0.3)',
            color: '#ff6b8b',
            background: 'rgba(255, 51, 102, 0.06)',
            padding: '7px 12px',
            fontSize: '0.8rem'
          }}
        >
          <RotateCcw size={14} />
          <span>{isResetting ? 'Resetting...' : 'Reset'}</span>
        </button>
      </div>
    </header>
  );
}
