import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Shield } from 'lucide-react';

/**
 * PortfolioMatrix Component
 * -------------------------
 * Displays the complete asset allocation table with:
 * - Live weight percentage & allocated USD value
 * - Visual bar indicator showing progress towards the 15% maximum cap
 * - Last signal direction pill (+ Bullish / - Bearish / 0 Neutral)
 * - PRD rule indicators (Min 2% floor, Max 15% ceiling)
 */
export default function PortfolioMatrix({ holdings }) {
  if (!holdings || holdings.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading portfolio holdings from SQLite...</p>
      </div>
    );
  }

  // Sort cash to top, then stocks by weight descending
  const sortedHoldings = [...holdings].sort((a, b) => {
    if (a.ticker === 'CASH') return -1;
    if (b.ticker === 'CASH') return 1;
    return b.weight - a.weight;
  });

  return (
    <div className="glass-panel" style={{ padding: '24px', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
            Tactical Asset Allocation Matrix
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Live weights synchronized with SQLite database & current_portfolio.csv
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="pill-badge pill-neutral" style={{ fontSize: '0.68rem' }}>
            <Shield size={11} color="#f7931a" />
            2% FLOOR • 15% CEILING
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'var(--text-secondary)',
              fontSize: '0.72rem',
              letterSpacing: '0.06em'
            }}>
              <th style={{ padding: '12px 14px' }}>ASSET / TICKER</th>
              <th style={{ padding: '12px 14px' }}>WEIGHT</th>
              <th style={{ padding: '12px 14px' }}>CAP ALLOCATION</th>
              <th style={{ padding: '12px 14px' }}>VALUE (USD)</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>LAST SIGNAL</th>
            </tr>
          </thead>
          <tbody>
            {sortedHoldings.map((item) => {
              const isCash = item.ticker === 'CASH';
              const weightPct = item.weight_pct ?? (item.weight * 100);
              const maxScale = 15.0; // 15% max cap
              const barFillWidth = Math.min(100, Math.round((weightPct / maxScale) * 100));
              const isAtMax = weightPct >= 14.9;
              const isAtMin = !isCash && weightPct <= 2.1;

              // Signal formatting
              const signal = item.last_signal ?? 0.0;
              let signalPill = (
                <span className="pill-badge pill-neutral">
                  <Minus size={11} /> 0.00
                </span>
              );

              if (signal > 0.05) {
                signalPill = (
                  <span className="pill-badge pill-bullish">
                    <ArrowUpRight size={12} /> +{signal.toFixed(2)}
                  </span>
                );
              } else if (signal < -0.05) {
                signalPill = (
                  <span className="pill-badge pill-bearish">
                    <ArrowDownRight size={12} /> {signal.toFixed(2)}
                  </span>
                );
              }

              return (
                <tr
                  key={item.ticker}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Asset / Ticker */}
                  <td style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        background: isCash ? 'rgba(0, 240, 255, 0.12)' : 'rgba(247, 147, 26, 0.12)',
                        color: isCash ? '#00f0ff' : '#f7931a',
                        border: isCash ? '1px solid rgba(0, 240, 255, 0.25)' : '1px solid rgba(247, 147, 26, 0.25)'
                      }}>
                        {item.ticker}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f5f5f7' }}>
                          {item.asset_name || item.ticker}
                        </div>
                        {isAtMax && (
                          <span style={{ fontSize: '0.68rem', color: '#f7931a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={10} /> Max Cap Reached (15%)
                          </span>
                        )}
                        {isAtMin && (
                          <span style={{ fontSize: '0.68rem', color: '#ff3366', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={10} /> Min Floor (2%)
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Weight */}
                  <td style={{ padding: '14px', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.9rem' }}>
                    {weightPct.toFixed(2)}%
                  </td>

                  {/* Visual Bar towards 15% Cap */}
                  <td style={{ padding: '14px', width: '28%' }}>
                    <div style={{
                      width: '100%',
                      height: '7px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      borderRadius: '999px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: isCash ? `${Math.min(100, (weightPct / 25) * 100)}%` : `${barFillWidth}%`,
                        height: '100%',
                        background: isCash
                          ? 'linear-gradient(90deg, #00f0ff, #00b4d8)'
                          : isAtMax
                          ? 'linear-gradient(90deg, #ffaa3b, #f7931a)'
                          : 'linear-gradient(90deg, #f7931a, #ffbe5b)',
                        borderRadius: '999px',
                        boxShadow: isCash ? '0 0 8px rgba(0, 240, 255, 0.4)' : '0 0 8px rgba(247, 147, 26, 0.4)',
                        transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span>{isCash ? 'Floor 2%' : 'Floor 2%'}</span>
                      <span>{isCash ? 'Flexible' : 'Cap 15%'}</span>
                    </div>
                  </td>

                  {/* Allocated USD */}
                  <td style={{ padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: '#e0e0e0' }}>
                    ${Number(item.allocated_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Last Signal */}
                  <td style={{ padding: '14px', textAlign: 'right' }}>
                    {signalPill}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
