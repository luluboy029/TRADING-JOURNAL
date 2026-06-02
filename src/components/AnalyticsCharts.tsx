/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { TradeEntry } from '../types';
import { TrendingUp, Award, Layers, BarChart3, PieChart } from 'lucide-react';
import { EMOTIONS_METADATA } from '../lib/emotions';

interface AnalyticsChartsProps {
  entries: TradeEntry[];
}

const formatUSD = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val);
};

export default function AnalyticsCharts({ entries }: AnalyticsChartsProps) {
  // 1. Cumulative Equity Curve Data
  const equityData = useMemo(() => {
    const sorted = [...entries]
      .filter((e) => e.status !== 'open')
      .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

    let runningSum = 0;
    return sorted.map((e) => {
      const pnl = e.pnl || 0;
      const fees = e.fees || 0;
      runningSum += pnl - fees;
      return {
        date: e.entryDate,
        pnl: pnl - fees,
        cumulative: runningSum,
        symbol: e.symbol,
      };
    });
  }, [entries]);

  // 2. Breakdown by Asset Class
  const assetBreakdown = useMemo(() => {
    const map: Record<string, { grossProfit: number; grossLoss: number; totalTrades: number; winning: number }> = {};
    
    entries.forEach((e) => {
      if (!map[e.assetClass]) {
        map[e.assetClass] = { grossProfit: 0, grossLoss: 0, totalTrades: 0, winning: 0 };
      }
      const data = map[e.assetClass];
      data.totalTrades++;
      
      if (e.status === 'win') {
        data.winning++;
        data.grossProfit += (e.pnl || 0) - (e.fees || 0);
      } else if (e.status === 'loss') {
        data.grossLoss += Math.abs((e.pnl || 0) + (e.fees || 0));
      } else if (e.status === 'breakeven') {
        data.grossLoss += e.fees || 0;
      }
    });

    return Object.keys(map).map((key) => {
      const val = map[key];
      const net = val.grossProfit - val.grossLoss;
      const winRate = val.totalTrades > 0 ? (val.winning / val.totalTrades) * 100 : 0;
      return {
        assetClass: key,
        net,
        winRate,
        total: val.totalTrades,
      };
    }).sort((a, b) => b.net - a.net);
  }, [entries]);

  // 3. Setup Strategy performance list
  const setupBreakdown = useMemo(() => {
    const map: Record<string, { net: number; win: number; total: number }> = {};
    entries.forEach((e) => {
      const setup = e.setup || 'Unspecified';
      if (!map[setup]) {
        map[setup] = { net: 0, win: 0, total: 0 };
      }
      const data = map[setup];
      data.total++;
      if (e.status === 'win') {
        data.win++;
        data.net += (e.pnl || 0) - (e.fees || 0);
      } else if (e.status === 'loss') {
        data.net += (e.pnl || 0) - (e.fees || 0);
      } else if (e.status === 'breakeven') {
        data.net -= e.fees || 0;
      }
    });

    return Object.keys(map).map((key) => {
      const val = map[key];
      const wr = val.total > 0 ? (val.win / val.total) * 100 : 0;
      return {
        setup: key,
        net: val.net,
        winRate: wr,
        total: val.total,
      };
    }).sort((a, b) => b.net - a.net);
  }, [entries]);

  // 4. Breakdown by Psychological Emotion
  const emotionBreakdown = useMemo(() => {
    const map: Record<string, { net: number; win: number; total: number }> = {};
    entries.forEach((e) => {
      if (!e.emotion) return; // Ignore un-tagged trades
      const emo = e.emotion;
      if (!map[emo]) {
        map[emo] = { net: 0, win: 0, total: 0 };
      }
      const data = map[emo];
      data.total++;
      if (e.status === 'win') {
        data.win++;
        data.net += (e.pnl || 0) - (e.fees || 0);
      } else if (e.status === 'loss') {
        data.net += (e.pnl || 0) - (e.fees || 0);
      } else if (e.status === 'breakeven') {
        data.net -= e.fees || 0;
      }
    });

    return Object.keys(map).map((key) => {
      const val = map[key];
      const wr = val.total > 0 ? (val.win / val.total) * 100 : 0;
      return {
        emotion: key,
        net: val.net,
        winRate: wr,
        total: val.total,
      };
    }).sort((a, b) => b.net - a.net);
  }, [entries]);

  // SVG dimensions for equity curve
  const width = 500;
  const height = 180;
  const padding = 25;

  const svgPoints = useMemo(() => {
    if (equityData.length === 0) return '';
    const values = equityData.map((d) => d.cumulative);
    const minVal = Math.min(0, ...values);
    const maxVal = Math.max(100, ...values);

    const xRange = equityData.length > 1 ? equityData.length - 1 : 1;
    const yRange = maxVal - minVal || 1;

    return equityData
      .map((d, index) => {
        const x = padding + (index / xRange) * (width - 2 * padding);
        const y = height - padding - ((d.cumulative - minVal) / yRange) * (height - 2 * padding);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [equityData]);

  // Generate ticks for equity Y-axis
  const equityYTicks = useMemo(() => {
    if (equityData.length === 0) return [0];
    const values = equityData.map((d) => d.cumulative);
    const minVal = Math.min(0, ...values);
    const maxVal = Math.max(100, ...values);
    const midVal = (minVal + maxVal) / 2;
    return [minVal, midVal, maxVal];
  }, [equityData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="analytics-charts-row">
      
      {/* Chart 1: Equity Curve (Pure responsive Custom SVG representation) */}
      <div className="lg:col-span-2 bg-geo-panel border border-geo-border p-4 rounded-sm flex flex-col justify-between text-left">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
            <TrendingUp size={12} className="text-blue-500" /> Real-time Equity Curve (Cumulative P&amp;L)
          </span>
          <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">Chronological trade performance ledger including brokerage transaction fees</p>
        </div>

        <div className="my-3 flex-1 flex items-center justify-center min-h-[180px] w-full bg-slate-950/40 border border-slate-900/60 p-2 relative overflow-hidden">
          {equityData.length === 0 ? (
            <div className="text-center font-mono py-12 text-slate-550 text-[10px]">
              No closed trade records logged for equity visualization.
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-full text-slate-400 overflow-visible"
              aria-label="Cumulative Net PnL Curve"
            >
              {/* horizontal guides */}
              {equityYTicks.map((tick, i) => {
                const values = equityData.map((d) => d.cumulative);
                const minVal = Math.min(0, ...values);
                const maxVal = Math.max(100, ...values);
                const yRange = maxVal - minVal || 1;
                const y = height - padding - ((tick - minVal) / yRange) * (height - 2 * padding);
                return (
                  <g key={i} className="opacity-40">
                    <line
                      x1={padding}
                      y1={y}
                      x2={width - padding}
                      y2={y}
                      stroke="#1e293b"
                      strokeWidth={1}
                      strokeDasharray="2 3"
                    />
                    <text
                      x={padding - 5}
                      y={y + 3}
                      fill="#64748b"
                      fontSize="8px"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {formatUSD(tick)}
                    </text>
                  </g>
                );
              })}

              {/* Zero line reference */}
              {(() => {
                const values = equityData.map((d) => d.cumulative);
                const minVal = Math.min(0, ...values);
                const maxVal = Math.max(100, ...values);
                const yRange = maxVal - minVal || 1;
                const zeroY = height - padding - ((0 - minVal) / yRange) * (height - 2 * padding);
                if (zeroY >= padding && zeroY <= height - padding) {
                  return (
                    <line
                      x1={padding}
                      y1={zeroY}
                      x2={width - padding}
                      y2={zeroY}
                      stroke="#ef4444"
                      strokeWidth={1}
                      className="opacity-25"
                    />
                  );
                }
                return null;
              })()}

              {/* The Line Curve */}
              {svgPoints && (
                <>
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    points={svgPoints}
                    className="drop-shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
                  />
                  {/* Scatter plot nodes on hover or highlights */}
                  {equityData.map((d, idx) => {
                    const values = equityData.map((item) => item.cumulative);
                    const minVal = Math.min(0, ...values);
                    const maxVal = Math.max(100, ...values);
                    const xRange = equityData.length > 1 ? equityData.length - 1 : 1;
                    const yRange = maxVal - minVal || 1;

                    const x = padding + (idx / xRange) * (width - 2 * padding);
                    const y = height - padding - ((d.cumulative - minVal) / yRange) * (height - 2 * padding);

                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r="3.5"
                        className="fill-slate-950 stroke-blue-400 hover:r-5 cursor-pointer transition-all duration-150"
                        strokeWidth="1.5"
                        id={`node-${idx}`}
                      >
                        <title>{`${d.date}: ${formatUSD(d.cumulative)} (Net: ${formatUSD(d.pnl)}) [${d.symbol}]`}</title>
                      </circle>
                    );
                  })}
                </>
              )}
            </svg>
          )}

          {/* Quick info badges inside SVG */}
          {equityData.length > 0 && (
            <div className="absolute bottom-2.5 right-3 bg-geo-bg border border-geo-border py-0.5 px-2 rounded-sm text-[8px] font-mono text-slate-500 flex gap-2">
              <span>{equityData[0].date}</span>
              <span>&mdash;</span>
              <span>{equityData[equityData.length - 1].date}</span>
            </div>
          )}
        </div>

        <div className="text-[9px] font-mono text-slate-550 text-slate-500 uppercase tracking-widest flex justify-between">
          <span>Timeline Ledger</span>
          <span>Sample Size: {equityData.length} realized positions</span>
        </div>
      </div>

      {/* Chart 2: Asset Class Net Performance */}
      <div className="bg-geo-panel border border-geo-border p-4 rounded-sm flex flex-col justify-between text-left">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
            <Layers size={12} className="text-blue-500" /> Sector Volume &amp; P&amp;L
          </span>
          <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">Asset class allocation performance metric ledger</p>
        </div>

        <div className="my-4 space-y-2.5 overflow-y-auto max-h-[180px] flex-1">
          {assetBreakdown.length === 0 ? (
            <div className="text-center font-mono py-12 text-slate-550 text-[10px]">
              No ledger points.
            </div>
          ) : (
            assetBreakdown.map((row) => (
              <div key={row.assetClass} className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-355 text-slate-300 font-bold bg-slate-950/40 px-1.5 py-0.5 border border-slate-900 rounded-sm">
                    {row.assetClass}
                  </span>
                  <span className={`font-bold ${row.net >= 0 ? 'text-emerald-400' : 'text-rose-455 text-rose-400'}`}>
                    {row.net >= 0 ? '+' : ''}
                    {formatUSD(row.net)}
                  </span>
                </div>
                
                {/* Custom layout progress bars */}
                <div className="h-2 bg-slate-950/60 border border-slate-900 overflow-hidden relative">
                  <div
                    className={`h-full ${row.net >= 0 ? 'bg-emerald-500/30' : 'bg-rose-500/30'}`}
                    style={{ width: `${Math.min(100, Math.max(10, (row.total / entries.length) * 100))}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-end pr-1.5 text-[7px] text-slate-550 font-mono">
                    {row.total} trades &bull; {row.winRate.toFixed(0)}% Win
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-[9px] font-mono text-slate-550 text-slate-500 uppercase tracking-widest flex justify-between border-t border-geo-border/40 pt-2 shrink-0">
          <span>Active Asset Categories</span>
          <span>{assetBreakdown.length} unique sectors</span>
        </div>
      </div>

      {/* Chart 3: Setup Playbook Efficiency (Full Width below Row) */}
      <div className="lg:col-span-3 bg-geo-panel border border-geo-border p-4 rounded-sm text-left">
        <div className="mb-3">
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
            <BarChart3 size={12} className="text-blue-500" /> Playbook Strategy Performance Analysis
          </span>
          <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">Tracking Setup profitability, conviction, and hit-rates</p>
        </div>

        {setupBreakdown.length === 0 ? (
          <div className="text-center font-mono py-6 text-slate-550 text-[10px]">
            No strategy logs recorded. Assign setups to start tracking metrics.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {setupBreakdown.map((row) => (
              <div 
                key={row.setup} 
                className="bg-slate-950/30 border border-geo-border/60 p-3 flex flex-col justify-between hover:border-slate-800 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-mono text-[11px] font-bold text-slate-205 text-slate-357 truncate max-w-[140px]" title={row.setup}>
                      {row.setup}
                    </h5>
                    <span className="font-mono text-[8.5px] text-slate-500 block">
                      Playbook Hit Rate: {row.winRate.toFixed(1)}% ({row.total} sample)
                    </span>
                  </div>

                  <span className={`font-mono text-[11px] font-bold ${row.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {row.net >= 0 ? '+' : ''}
                    {formatUSD(row.net)}
                  </span>
                </div>

                {/* Progress bar represent hit rate visually */}
                <div className="mt-2 text-right">
                  <div className="h-1 w-full bg-slate-900 border border-slate-950/80 rounded-none overflow-hidden">
                    <div
                      className={`h-full ${row.winRate >= 50 ? 'bg-emerald-500/50' : 'bg-red-500/50'}`}
                      style={{ width: `${row.winRate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chart 4: Psychological State & Emotional Discipline Performance */}
      <div className="lg:col-span-3 bg-geo-panel border border-geo-border p-4 rounded-sm text-left">
        <div className="mb-3 flex justify-between items-center flex-wrap gap-2">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
              <PieChart size={12} className="text-violet-400 animate-pulse" /> Psychology &amp; Mindset Efficiency Analytics
            </span>
            <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">Assesses how emotional states impact financial yield and win probability rates</p>
          </div>
          
          <span className="text-[9px] font-mono font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-sm uppercase tracking-wider">
            Mindset yield tracker
          </span>
        </div>

        {emotionBreakdown.length === 0 ? (
          <div className="text-center font-mono py-8 bg-slate-950/20 border border-dashed border-geo-border/50 rounded-sm text-slate-500 text-[10px]">
            No psychological states recorded yet. Log trades with emotional tags to map mindset efficiency analytics.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
            {emotionBreakdown.map((row) => {
              const emo = EMOTIONS_METADATA[row.emotion as any];
              if (!emo) return null;
              return (
                <div 
                  key={row.emotion} 
                  className={`bg-slate-950/35 border ${emo.borderClass} p-3.5 flex flex-col justify-between hover:scale-101 transition-all duration-200 relative overflow-hidden`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-mono text-[11px] font-bold text-slate-105 text-slate-200 flex items-center gap-1.5">
                        <span className="text-sm select-none">{emo.emoji}</span>
                        <span>{emo.label}</span>
                      </h5>
                      <span className="font-mono text-[8.5px] text-slate-500 block mt-0.5">
                        Win Rate: {row.winRate.toFixed(1)}% ({row.total} sample)
                      </span>
                    </div>

                    <span className={`font-mono text-[11.5px] font-bold ${row.net >= 0 ? 'text-emerald-400' : 'text-rose-455 text-rose-450 text-rose-400'}`}>
                      {row.net >= 0 ? '+' : ''}
                      {formatUSD(row.net)}
                    </span>
                  </div>

                  {/* Micro bar representing win rate color coded */}
                  <div className="mt-3.5">
                    <div className="h-1.5 w-full bg-slate-950 border border-slate-900 rounded-none overflow-hidden relative">
                      <div
                        className={`h-full ${row.net >= 0 ? 'bg-emerald-500/60' : 'bg-rose-500/60'}`}
                        style={{ width: `${row.winRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
