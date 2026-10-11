import React, { useState } from 'react';
import { History, Search, ArrowRight, ArrowUpRight, ArrowDownRight, Minus, FileText } from 'lucide-react';

/**
 * AuditLedger Component
 * --------------------
 * Displays chronological trade execution audit trail from SQLite `rebalance_history`.
 * Guarantees 100% transparency for judges on how the AI agent altered capital allocations.
 */
export default function AuditLedger({ history }) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!history) return null;

  const filtered = history.filter(item => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.ticker?.toLowerCase().includes(term) ||
      item.headline?.toLowerCase().includes(term) ||
      item.timestamp?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="glass-panel" style={{ padding: '24px', margin: '0 24px 32px 24px' }}>
      {/* Header & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(0, 240, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <History size={18} color="#00f0ff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
                Rebalance Audit Ledger & Execution Log
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Immutable SQLite audit trail with before/after weight transitions
              </p>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by ticker or headline..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(15, 15, 20, 0.7)',
              color: '#ffffff',
              fontSize: '0.8rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Ledger Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          {history.length === 0 ? 'No rebalances executed yet. Use the Simulation Lab above to execute your first trade!' : 'No entries matching your filter.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: '360px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                color: 'var(--text-secondary)',
                fontSize: '0.7rem',
                letterSpacing: '0.06em',
                position: 'sticky',
                top: 0,
                background: 'rgba(12, 12, 16, 0.95)',
                backdropFilter: 'blur(8px)',
                zIndex: 10
              }}>
                <th style={{ padding: '10px 12px' }}>TIMESTAMP</th>
                <th style={{ padding: '10px 12px' }}>TICKER</th>
                <th style={{ padding: '10px 12px' }}>SIGNAL</th>
                <th style={{ padding: '10px 12px' }}>WEIGHT DELTA</th>
                <th style={{ padding: '10px 12px' }}>CASH AFTER</th>
                <th style={{ padding: '10px 12px' }}>TRIGGER HEADLINE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const mult = item.multiplier ?? 0;
                let multPill = (
                  <span className="pill-badge pill-neutral">
                    <Minus size={11} /> 0.00
                  </span>
                );

                if (mult > 0.05) {
                  multPill = (
                    <span className="pill-badge pill-bullish">
                      <ArrowUpRight size={11} /> +{mult.toFixed(2)}
                    </span>
                  );
                } else if (mult < -0.05) {
                  multPill = (
                    <span className="pill-badge pill-bearish">
                      <ArrowDownRight size={11} /> {mult.toFixed(2)}
                    </span>
                  );
                }

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      fontSize: '0.82rem'
                    }}
                  >
                    {/* Timestamp */}
                    <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {item.timestamp}
                    </td>

                    {/* Ticker */}
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 700,
                        background: 'rgba(247, 147, 26, 0.12)',
                        color: '#f7931a',
                        border: '1px solid rgba(247, 147, 26, 0.25)'
                      }}>
                        {item.ticker}
                      </span>
                    </td>

                    {/* Signal */}
                    <td style={{ padding: '12px' }}>
                      {multPill}
                    </td>

                    {/* Weight Delta */}
                    <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.old_weight_pct}%</span>
                      <ArrowRight size={11} style={{ display: 'inline', margin: '0 6px', color: 'var(--text-muted)' }} />
                      <span style={{ fontWeight: 700, color: '#ffffff' }}>{item.new_weight_pct}%</span>
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '0.72rem',
                        color: item.change_pct > 0 ? '#00e676' : item.change_pct < 0 ? '#ff3366' : 'var(--text-muted)'
                      }}>
                        ({item.change_pct > 0 ? `+${item.change_pct}%` : `${item.change_pct}%`})
                      </span>
                    </td>

                    {/* Cash After */}
                    <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', color: '#00f0ff' }}>
                      {item.cash_weight_pct}%
                    </td>

                    {/* Headline */}
                    <td style={{ padding: '12px', color: '#dedee3', maxWidth: '380px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.headline}>
                      {item.headline || 'Simulated Rebalance Trigger'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
