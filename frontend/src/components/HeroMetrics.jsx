import React from 'react';
import { DollarSign, Landmark, PieChart, Layers } from 'lucide-react';

/**
 * HeroMetrics Component
 * ---------------------
 * Displays 4 high-level telemetry cards with glowing amber & glassmorphic accents:
 * 1. Total Fund Value ($100,000 USD)
 * 2. Tactical Cash Reserve (Current capital waiting for opportunities)
 * 3. Total Invested Capital (Equities actively exposed to the market)
 * 4. Active Portfolio Universe (Monitored tradable equity positions)
 */
export default function HeroMetrics({ summary, historyCount }) {
  const cashPct = summary?.cash_pct ?? 2.0;
  const cashUsd = summary?.cash_usd ?? 2000;
  const investedPct = summary?.invested_pct ?? 98.0;
  const investedUsd = summary?.invested_usd ?? 98000;
  const holdingsCount = summary?.holdings_count ?? 15;

  const metrics = [
    {
      title: 'TOTAL PORTFOLIO FUND',
      value: '$100,000.00',
      badge: 'FIXED CONSERVATION',
      badgeType: 'pill-amber',
      subtext: 'Hard ceiling capital constraint',
      icon: DollarSign,
      iconColor: '#f7931a'
    },
    {
      title: 'CURRENT CASH RESERVE',
      value: `$${cashUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      badge: `${cashPct.toFixed(2)}% LIQUID CASH`,
      badgeType: cashPct < 5.0 ? 'pill-amber' : 'pill-cyan',
      subtext: 'Uninvested cash buffer (Min 2.0% floor enforced)',
      icon: Landmark,
      iconColor: '#00f0ff'
    },
    {
      title: 'EQUITY EXPOSURE',
      value: `$${investedUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      badge: `${investedPct.toFixed(2)}% INVESTED`,
      badgeType: 'pill-bullish',
      subtext: 'Tactically hedged across stocks',
      icon: PieChart,
      iconColor: '#00e676'
    },
    {
      title: 'ACTIVE POSITIONS',
      value: `${holdingsCount} ASSETS`,
      badge: `${historyCount} REBALANCES`,
      badgeType: 'pill-neutral',
      subtext: '2% Min to 15% Max per-stock cap',
      icon: Layers,
      iconColor: '#e0e0e0'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      gap: '20px',
      margin: '0 24px 24px 24px'
    }}>
      {metrics.map((m, idx) => {
        const IconComponent = m.icon;
        return (
          <div
            key={idx}
            className="glass-panel"
            style={{
              padding: '22px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}
          >
            {/* Top row: Label & Icon */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{
                fontSize: '0.72rem',
                letterSpacing: '0.08em',
                fontWeight: 600,
                color: 'var(--text-secondary)'
              }}>
                {m.title}
              </span>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconComponent size={18} color={m.iconColor} />
              </div>
            </div>

            {/* Middle row: Large Value & Pill */}
            <div style={{ margin: '14px 0 10px 0' }}>
              <div style={{
                fontSize: '1.75rem',
                fontWeight: 800,
                fontFamily: 'var(--font-heading)',
                letterSpacing: '-0.02em',
                color: '#ffffff'
              }}>
                {m.value}
              </div>
              <div style={{ marginTop: '6px' }}>
                <span className={`pill-badge ${m.badgeType}`}>
                  {m.badge}
                </span>
              </div>
            </div>

            {/* Bottom row: Subtext caption */}
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              borderTop: '1px solid rgba(255, 255, 255, 0.04)',
              paddingTop: '10px',
              marginTop: '4px'
            }}>
              {m.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
}
