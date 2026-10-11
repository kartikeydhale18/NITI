import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HeroMetrics from './components/HeroMetrics';
import PortfolioMatrix from './components/PortfolioMatrix';
import VisualizerDonut from './components/VisualizerDonut';
import SimulationLab from './components/SimulationLab';
import AuditLedger from './components/AuditLedger';
import { AlertTriangle, CheckCircle, Database, Cpu, ShieldCheck } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000/api');

/**
 * Main Application Component (App.jsx)
 * -------------------------------------
 * Coordinates live state synchronization between the React frontend
 * and the Python FastAPI / SQLite backend:
 * - Supports tabbed navigation: [portfolio] | [simulation] | [audit]
 * - Fetches portfolio holdings & summary statistics
 * - Fetches trade audit logs
 * - Dispatches simulated news rebalances to the dual-model pipeline
 * - Triggers portfolio resets
 */
export default function App() {
  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio' | 'simulation' | 'audit'
  const [portfolioData, setPortfolioData] = useState({ holdings: [], summary: {} });
  const [history, setHistory] = useState([]);
  const [sampleScenarios, setSampleScenarios] = useState([]);
  const [latestResult, setLatestResult] = useState(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // 1. Fetch Portfolio Data from FastAPI
  const fetchPortfolio = async () => {
    try {
      const res = await fetch(`${API_BASE}/portfolio`);
      if (!res.ok) throw new Error('Failed to fetch portfolio');
      const data = await res.json();
      setPortfolioData(data);
      setIsConnected(true);
    } catch (err) {
      console.error('API Error:', err);
      setIsConnected(false);
    }
  };

  // 2. Fetch History Audit Logs
  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/history?limit=50`);
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error('History fetch error:', err);
    }
  };

  // 3. Fetch Sample Scenarios for 1-click test chips
  const fetchScenarios = async () => {
    try {
      const res = await fetch(`${API_BASE}/sample-scenarios`);
      if (!res.ok) return;
      const data = await res.json();
      setSampleScenarios(data || []);
    } catch (err) {
      console.error('Scenarios fetch error:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPortfolio();
    fetchHistory();
    fetchScenarios();

    // Auto-poll every 10 seconds for seamless sync
    const timer = setInterval(() => {
      fetchPortfolio();
      fetchHistory();
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  // Manual Refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchPortfolio(), fetchHistory()]);
    setIsRefreshing(false);
    showToast('Portfolio synced with SQLite database!', 'success');
  };

  // Reset Portfolio to Initial Weights
  const handleReset = async () => {
    if (!window.confirm('Reset portfolio to the baseline $100k starting allocation?')) return;
    setIsResetting(true);
    try {
      const res = await fetch(`${API_BASE}/reset`, { method: 'POST' });
      if (!res.ok) throw new Error('Reset failed');
      await Promise.all([fetchPortfolio(), fetchHistory()]);
      setLatestResult(null);
      showToast('Portfolio successfully reset to baseline!', 'success');
    } catch (err) {
      showToast('Error resetting portfolio: ' + err.message, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Execute Rebalance Analysis on Headline
  const handleExecuteRebalance = async (payload) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/rebalance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Rebalance failed');
      }
      const data = await res.json();
      setLatestResult(data);

      if (data.already_analyzed) {
        showToast('Duplicate Guard: Article already analyzed! Double-rebalancing blocked.', 'error');
      } else {
        showToast(`Analyzed ${data.resolved_company || data.resolved_ticker}: Multiplier ${data.final_multiplier > 0 ? '+' : ''}${data.final_multiplier}`, 'success');
      }

      // Immediately refresh portfolio and ledger to reflect live trade
      await Promise.all([fetchPortfolio(), fetchHistory()]);
      return data;
    } catch (err) {
      showToast('Error executing rebalance: ' + err.message, 'error');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 100,
          background: notification.type === 'error' ? 'rgba(255, 51, 102, 0.95)' : 'rgba(247, 147, 26, 0.95)',
          color: notification.type === 'error' ? '#fff' : '#000',
          fontWeight: 700,
          fontSize: '0.85rem',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.25s ease'
        }}>
          {notification.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Top Navigation with Segmented Tabs */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        historyCount={history.length}
        onReset={handleReset}
        isResetting={isResetting}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        isConnected={isConnected}
      />

      {/* Disconnection Warning Banner if API is offline */}
      {!isConnected && (
        <div style={{
          margin: '0 24px 20px 24px',
          padding: '14px 20px',
          borderRadius: '12px',
          background: 'rgba(255, 51, 102, 0.1)',
          border: '1px solid rgba(255, 51, 102, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#ff6b8b',
          fontSize: '0.85rem'
        }}>
          <AlertTriangle size={18} />
          <span>
            <strong>FastAPI Backend Offline:</strong> Please launch the Python API server with <code>uvicorn backend.api:app --reload</code> on port 8000.
          </span>
        </div>
      )}

      {/* Hero Metrics (Persistent 4 KPI Telemetry Cards) */}
      <HeroMetrics
        summary={portfolioData.summary}
        historyCount={history.length}
      />

      {/* TAB CONTENT 1: PORTFOLIO & ALLOCATION */}
      {activeTab === 'portfolio' && (
        <main className="animate-fade-in" style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
          gap: '24px',
          margin: '0 24px 24px 24px'
        }}>
          <div>
            <PortfolioMatrix holdings={portfolioData.holdings} />
          </div>
          <div>
            <VisualizerDonut holdings={portfolioData.holdings} summary={portfolioData.summary} />
          </div>
        </main>
      )}

      {/* TAB CONTENT 2: "WHAT-IF" SIMULATION SANDBOX */}
      {activeTab === 'simulation' && (
        <main className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <SimulationLab
            onExecuteRebalance={handleExecuteRebalance}
            isAnalyzing={isAnalyzing}
            latestResult={latestResult}
            sampleScenarios={sampleScenarios}
          />
        </main>
      )}

      {/* TAB CONTENT 3: REBALANCE AUDIT LEDGER */}
      {activeTab === 'audit' && (
        <main className="animate-fade-in">
          <AuditLedger history={history} />
        </main>
      )}

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        padding: '24px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        fontSize: '0.78rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--accent-amber)', fontWeight: 700 }}>NITI RiskEngine</span>
          <span>•</span>
          <span>Dual-Model Tactical Portfolio Rebalancing</span>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Cpu size={12} /> ProsusAI FinBERT + Qwen2.5-1.5B
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Database size={12} /> SQLite Engine
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={12} /> 100% Capital Conservation
          </span>
        </div>
      </footer>
    </div>
  );
}
