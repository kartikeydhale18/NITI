import React, { useState } from 'react';
import { PieChart, Info } from 'lucide-react';

/**
 * VisualizerDonut Component
 * -------------------------
 * Renders a custom glowing SVG Donut chart showing asset distribution.
 * - Interactive hover shows asset weight, dollar value, and asset name
 * - Center hub displays $100,000 Portfolio baseline
 * - Amber glowing stroke highlights the hovered segment
 */
export default function VisualizerDonut({ holdings, summary }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (!holdings || holdings.length === 0) return null;

  // Curated aesthetic palette matching the Web3 dark theme
  const PALETTE = [
    '#00f0ff', // Cyan for CASH
    '#f7931a', // Amber for Top Stock 1 (SPY)
    '#ffaa3b', // Amber light
    '#00e676', // Emerald
    '#9d4edd', // Purple
    '#3a86ff', // Electric Blue
    '#ff006e', // Magenta
    '#fb5607', // Orange
    '#8338ec', // Violet
    '#06d6a0', // Mint
    '#118ab2', // Ocean
    '#ffd166', // Gold
    '#ef476f', // Coral
    '#4cc9f0', // Sky
    '#70e000', // Lime
    '#9e0059'  // Berry
  ];

  // Prepare segments
  let cumulativeAngle = 0;
  const radius = 80;
  const strokeWidth = 24;
  const center = 110;
  const circumference = 2 * Math.PI * radius;

  const segments = holdings.map((h, i) => {
    const weight = h.weight || 0.0;
    const strokeDasharray = `${weight * circumference} ${circumference}`;
    const strokeDashoffset = -cumulativeAngle * circumference;
    cumulativeAngle += weight;
    const color = h.ticker === 'CASH' ? '#00f0ff' : PALETTE[i % PALETTE.length];

    return {
      ...h,
      color,
      strokeDasharray,
      strokeDashoffset,
      index: i
    };
  });

  const activeItem = hoveredIndex !== null ? segments[hoveredIndex] : null;

  return (
    <div className="glass-panel" style={{ padding: '24px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff' }}>
            Capital Allocation Wheel
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            100% Capital Conservation Topology
          </p>
        </div>
        <div className="pill-badge pill-cyan">
          <PieChart size={12} />
          TOPOLOGY
        </div>
      </div>

      {/* SVG Donut Visualizer */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '16px 0' }}>
        <div style={{ position: 'relative', width: '220px', height: '220px' }}>
          <svg width="220" height="220" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background Ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth={strokeWidth}
            />

            {/* Colored Segments */}
            {segments.map((seg) => {
              const isHovered = hoveredIndex === seg.index;
              return (
                <circle
                  key={seg.ticker}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  style={{
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    opacity: hoveredIndex !== null && !isHovered ? 0.35 : 1.0,
                    filter: isHovered ? `drop-shadow(0 0 10px ${seg.color})` : 'none'
                  }}
                  onMouseEnter={() => setHoveredIndex(seg.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
          </svg>

          {/* Center Hub Overlay */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            {activeItem ? (
              <div>
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: activeItem.color,
                  letterSpacing: '0.05em'
                }}>
                  {activeItem.ticker}
                </div>
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  fontFamily: 'var(--font-heading)'
                }}>
                  {(activeItem.weight * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  ${Number(activeItem.allocated_usd).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                  CONSERVED
                </div>
                <div style={{
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: '#ffffff',
                  fontFamily: 'var(--font-heading)'
                }}>
                  $100,000
                </div>
                <div style={{ fontSize: '0.65rem', color: '#f7931a' }}>
                  100.00%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mini Legend */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px 12px',
        marginTop: '12px',
        maxHeight: '130px',
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {segments.slice(0, 10).map((seg) => (
          <div
            key={seg.ticker}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 8px',
              borderRadius: '6px',
              background: hoveredIndex === seg.index ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={() => setHoveredIndex(seg.index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: seg.color,
                boxShadow: `0 0 6px ${seg.color}`
              }}></span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f5f5f7' }}>
                {seg.ticker}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {(seg.weight * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
