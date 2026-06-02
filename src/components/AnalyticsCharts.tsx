/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trade } from '../types';

interface ChartProps {
  trades: Trade[];
}

// Helper: Formatter for currency
const formatUSD = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
};

export function EquityCurveChart({ trades }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 280 });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Resize listener
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({
        width: Math.max(width, 300),
        height: Math.max(height || 280, 200),
      });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const closedTrades = useMemo(() => {
    return [...trades]
      .filter((t) => t.status !== 'open')
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
  }, [trades]);

  const pnlData = useMemo(() => {
    let cumulative = 0;
    const points = [{ balance: 0, trade: null as Trade | null, date: 'Start' }];
    closedTrades.forEach((t) => {
      cumulative += (t.pnl ?? 0) - (t.fees ?? 0);
      points.push({
        balance: cumulative,
        trade: t,
        date: new Date(t.entryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      });
    });
    return points;
  }, [closedTrades]);

  // Dimensions of graph padding
  const padding = { top: 30, right: 20, bottom: 40, left: 60 };
  const graphWidth = dimensions.width - padding.left - padding.right;
  const graphHeight = dimensions.height - padding.top - padding.bottom;

  // Min and Max values for scale
  const { minVal, maxVal } = useMemo(() => {
    if (pnlData.length === 0) return { minVal: -100, maxVal: 100 };
    const balances = pnlData.map((d) => d.balance);
    const min = Math.min(...balances, 0);
    const max = Math.max(...balances, 0);
    const paddingVal = Math.max((max - min) * 0.15, 100);
    return {
      minVal: min - paddingVal,
      maxVal: max + paddingVal,
    };
  }, [pnlData]);

  // Coordinate conversion helper
  const getX = (index: number) => {
    if (pnlData.length <= 1) return padding.left;
    return padding.left + (index / (pnlData.length - 1)) * graphWidth;
  };

  const getY = (val: number) => {
    const range = maxVal - minVal;
    if (range === 0) return padding.top + graphHeight / 2;
    return padding.top + graphHeight - ((val - minVal) / range) * graphHeight;
  };

  // Generate path string
  const pathString = useMemo(() => {
    if (pnlData.length === 0) return '';
    return pnlData
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.balance)}`)
      .join(' ');
  }, [pnlData, dimensions, minVal, maxVal]);

  // Generate closed area string for visual fill
  const areaString = useMemo(() => {
    if (pnlData.length === 0) return '';
    const linePath = pathString;
    return `${linePath} L ${getX(pnlData.length - 1)} ${getY(minVal)} L ${getX(0)} ${getY(minVal)} Z`;
  }, [pnlData, pathString, dimensions, minVal, maxVal]);

  // Zero-line Y coordinate
  const zeroY = getY(0);

  // Mouse interactivity triggers
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (pnlData.length === 0) return;
    const svgRect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - svgRect.left;

    // Find nearest point
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < pnlData.length; i++) {
      const ptX = getX(i);
      const dist = Math.abs(ptX - mouseX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    setHoverIndex(closestIndex);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  if (trades.filter((t) => t.status !== 'open').length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-geo-panel border border-geo-border rounded-sm px-4 text-center">
        <p className="text-sm text-slate-400 font-mono">No transactions completed yet</p>
        <span className="text-xs text-slate-500 mt-2 font-mono">Complete closed trades in journal to construct your equity growth progression</span>
      </div>
    );
  }

  // Hover data point info
  const hoverPoint = hoverIndex !== null ? pnlData[hoverIndex] : null;

  return (
    <div className="w-full bg-geo-panel border border-geo-border rounded-sm p-5 relative flex flex-col justify-between" id="equity-curve-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-display">Equity Growth Profile</h3>
          <p className="text-[11px] text-slate-400 font-mono">Net cumulative yield progression over closed positions</p>
        </div>
        {hoverPoint && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-right"
          >
            <span className="text-[10px] text-slate-400 block font-mono">{hoverPoint.date}</span>
            <span className={`text-sm font-bold font-mono ${hoverPoint.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatUSD(hoverPoint.balance)}
            </span>
          </motion.div>
        )}
      </div>

      <div ref={containerRef} className="w-full h-64 relative select-none">
        <svg
          width={dimensions.width}
          height={dimensions.height}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="overflow-visible cursor-crosshair"
          id="equity-svg"
        >
          <defs>
            <linearGradient id="equity-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const tempVal = minVal + ratio * (maxVal - minVal);
            const yCoord = getY(tempVal);
            return (
              <g key={i} className="opacity-100">
                <line
                  x1={padding.left}
                  y1={yCoord}
                  x2={dimensions.width - padding.right}
                  y2={yCoord}
                  stroke="#23272F"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                <text
                  x={padding.left - 8}
                  y={yCoord + 3}
                  textAnchor="end"
                  fill="#64748b"
                  className="font-mono text-[9px]"
                >
                  {formatUSD(tempVal)}
                </text>
              </g>
            );
          })}

          {/* Horizontal Axis Zero Reference Line */}
          {zeroY >= padding.top && zeroY <= padding.top + graphHeight && (
            <line
              x1={padding.left}
              y1={zeroY}
              x2={dimensions.width - padding.right}
              y2={zeroY}
              stroke="#475569"
              strokeWidth="1.2"
              strokeOpacity="0.6"
            />
          )}

          {/* Shaded Area under the Line */}
          <path d={areaString} fill="url(#equity-gradient)" />

          {/* Main Line Plot (Blue for Geo Balance Theme) */}
          <motion.path
            d={pathString}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />

          {/* Dots on hover */}
          {hoverIndex !== null && (
            <>
              {/* Vertical indicator line */}
              <line
                x1={getX(hoverIndex)}
                y1={padding.top}
                x2={getX(hoverIndex)}
                y2={dimensions.height - padding.bottom}
                stroke="#475569"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* Active Point Circle */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(pnlData[hoverIndex].balance)}
                r="4"
                fill="#3b82f6"
                stroke="#0A0C10"
                strokeWidth="2"
                className="transition-all duration-100"
              />
            </>
          )}

          {/* Bottom X-Axis Date markers */}
          {pnlData.length > 1 &&
            [0, Math.floor(pnlData.length / 2), pnlData.length - 1].map((idx) => {
              if (idx < 0 || idx >= pnlData.length) return null;
              return (
                <text
                  key={idx}
                  x={getX(idx)}
                  y={dimensions.height - padding.bottom + 16}
                  className="fill-slate-500 font-mono text-[9px]"
                  textAnchor="middle"
                >
                  {pnlData[idx].date}
                </text>
              );
            })}
        </svg>

        {/* Dynamic Tooltip on Hover */}
        <AnimatePresence>
          {hoverIndex !== null && hoverPoint && hoverPoint.trade && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                left: `${Math.min(
                  Math.max(getX(hoverIndex) - 75, 10),
                  dimensions.width - 160
                )}px`,
                top: `${Math.max(getY(hoverPoint.balance) - 95, 10)}px`,
              }}
              className="pointer-events-none bg-geo-header border border-geo-border text-slate-200 p-2 text-[10px] rounded-sm font-mono shadow-xl z-20 min-w-[130px]"
              id="equity-tooltip"
            >
              <div className="flex justify-between items-center mb-1 font-bold border-b border-geo-border pb-1">
                <span>{hoverPoint.trade.symbol}</span>
                <span className={`uppercase text-[8px] px-1 rounded-sm ${hoverPoint.trade.side === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  {hoverPoint.trade.side}
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 text-[9px]">PNL:</span>
                  <span className={(hoverPoint.trade.pnl ?? 0) >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {(hoverPoint.trade.pnl ?? 0) >= 0 ? '+' : ''}
                    {formatUSD(hoverPoint.trade.pnl ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 text-[9px]">TOTAL:</span>
                  <span className="text-slate-300 font-bold">{formatUSD(hoverPoint.balance)}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function WinLossDonutChart({ trades }: ChartProps) {
  const [activeSegment, setActiveSegment] = useState<string | null>(null);

  const { wins, losses, breakevens, total, winRate } = useMemo(() => {
    const closed = trades.filter((t) => t.status !== 'open');
    const totalCount = closed.length;
    if (totalCount === 0) {
      return { wins: 0, losses: 0, breakevens: 0, total: 0, winRate: 0 };
    }
    const w = closed.filter((t) => t.status === 'win').length;
    const l = closed.filter((t) => t.status === 'loss').length;
    const b = closed.filter((t) => t.status === 'breakeven').length;
    return {
      wins: w,
      losses: l,
      breakevens: b,
      total: totalCount,
      winRate: Math.round((w / totalCount) * 100),
    };
  }, [trades]);

  // Radius specs
  const size = 180;
  const radius = 64;
  const strokeWidth = 14;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  const data = useMemo(() => {
    if (total === 0) return [];
    return [
      { name: 'Wins', value: wins, color: '#10b981', hoverColor: '#34d399' },
      { name: 'Losses', value: losses, color: '#ef4444', hoverColor: '#f87171' },
      { name: 'Breakeven', value: breakevens, color: '#64748b', hoverColor: '#94a3b8' },
    ].filter((d) => d.value > 0);
  }, [wins, losses, breakevens, total]);

  // Compute values for standard layout circle dash arrays
  let accumulatedPercent = 0;
  const segments = data.map((d) => {
    const percentage = d.value / total;
    const offset = accumulatedPercent * circumference;
    accumulatedPercent += percentage;

    return {
      ...d,
      strokeDasharray: `${percentage * circumference} ${circumference}`,
      strokeDashoffset: -offset,
      percentage: Math.round(percentage * 100),
    };
  });

  return (
    <div className="bg-geo-panel border border-geo-border rounded-sm p-5 flex flex-col justify-between" id="distribution-chart-card">
      <div>
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-display">Outcome Matrix</h3>
        <p className="text-[11px] text-slate-400 font-mono">Relative allocation of trade results</p>
      </div>

      {total === 0 ? (
        <div className="flex items-center justify-center h-48 text-center text-slate-500 text-xs font-mono">
          No outcome stats available
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-around py-4 gap-4">
          <div className="relative w-44 h-44 flex items-center justify-center">
            <svg width={size} height={size} className="-rotate-90">
              {segments.map((seg, i) => (
                <circle
                  key={i}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={activeSegment === seg.name ? seg.hoverColor : seg.color}
                  strokeWidth={activeSegment === seg.name ? strokeWidth + 2 : strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  strokeLinecap="square"
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setActiveSegment(seg.name)}
                  onMouseLeave={() => setActiveSegment(null)}
                />
              ))}
            </svg>

            {/* Inner text metric display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center select-none" id="donut-center-metric">
              <span className="text-slate-400 text-[9px] font-bold uppercase font-mono tracking-wider">Win Rate</span>
              <span className="text-3xl font-bold text-emerald-400 leading-none font-mono">{winRate}%</span>
              <span className="text-[9px] text-slate-500 mt-1 font-mono">{total} total</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-auto min-w-[124px]" id="donut-legend">
            {segments.map((seg, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-1.5 rounded-sm border transition-colors cursor-pointer ${
                  activeSegment === seg.name ? 'bg-geo-header border-geo-border' : 'border-transparent hover:bg-geo-header/50'
                }`}
                onMouseEnter={() => setActiveSegment(seg.name)}
                onMouseLeave={() => setActiveSegment(null)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-none" style={{ backgroundColor: seg.color }} />
                  <span className="text-xs text-slate-300 font-mono font-medium">{seg.name}</span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500 pl-4">{seg.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SetupBreakdownBarChart({ trades }: ChartProps) {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // Group by setup
  const setupData = useMemo(() => {
    const closed = trades.filter((t) => t.status !== 'open');
    const setupsMap: Record<string, { pnl: number; count: number; name: string }> = {};

    closed.forEach((t) => {
      const setupName = t.setup?.trim() || 'Undefined';
      if (!setupsMap[setupName]) {
        setupsMap[setupName] = { pnl: 0, count: 0, name: setupName };
      }
      setupsMap[setupName].pnl += (t.pnl ?? 0) - (t.fees ?? 0);
      setupsMap[setupName].count += 1;
    });

    return Object.values(setupsMap).sort((a, b) => b.pnl - a.pnl);
  }, [trades]);

  const maxAbsolutePnL = useMemo(() => {
    if (setupData.length === 0) return 100;
    const maxVal = Math.max(...setupData.map((d) => Math.abs(d.pnl)), 10);
    return maxVal * 1.1; // pad slightly
  }, [setupData]);

  if (setupData.length === 0) {
    return (
      <div className="bg-geo-panel border border-geo-border rounded-sm p-5 flex flex-col justify-between" id="setup-performance-empty">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-display">Strategy Diagnostics</h3>
        <p className="text-[11px] text-slate-400 mb-4 font-mono">PnL breakdown categorized by strategy identifiers</p>
        <div className="text-center text-slate-500 text-xs py-8 font-mono">
          Add closed trades with associated strategies to generate metric diagnostics.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-geo-panel border border-geo-border rounded-sm p-5 flex flex-col justify-between" id="setup-bar-chart-card">
      <div className="mb-4">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-display">Strategy &amp; Rule Effectiveness</h3>
        <p className="text-[11px] text-slate-400 font-mono">Total net revenue contribution mapped across different trading setups</p>
      </div>

      <div className="space-y-4 py-1" id="bar-chart-rows">
        {setupData.map((d) => {
          const isPositive = d.pnl >= 0;
          const percentageOfMax = Math.min((Math.abs(d.pnl) / maxAbsolutePnL) * 50, 50);

          return (
            <div
              key={d.name}
              className={`group flex items-center justify-between p-2 rounded-sm transition-colors border ${
                hoveredBar === d.name ? 'bg-geo-header border-geo-border' : 'border-transparent hover:bg-geo-header/40'
              }`}
              onMouseEnter={() => setHoveredBar(d.name)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {/* Setup Title */}
              <div className="w-[110px] sm:w-[160px] truncate pr-2">
                <span className="text-xs font-bold text-slate-300 block font-mono" title={d.name}>
                  {d.name}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {d.count} {d.count === 1 ? 'trade' : 'trades'}
                </span>
              </div>

              {/* Centered Comparative Bar */}
              <div className="flex-1 h-6 bg-geo-bg border border-geo-border rounded-none relative flex items-center px-0.5 overflow-hidden">
                {/* Midline baseline indicator */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-geo-border z-10" />

                {/* Left Offset or Right Offset active bar fill */}
                <div
                  className="absolute h-[12px] rounded-none transition-all duration-300"
                  style={{
                    left: isPositive ? '50%' : `calc(50% - ${percentageOfMax}%)`,
                    width: `${percentageOfMax}%`,
                    backgroundColor: isPositive ? '#10b981' : '#ef4444',
                    opacity: hoveredBar === d.name ? 1 : 0.85,
                  }}
                />
              </div>

              {/* Balance Yield value labels */}
              <div className="w-[90px] text-right pl-3 font-mono">
                <span className={`text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? '+' : ''}
                  {formatUSD(d.pnl)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
