/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { TradeEntry } from '../types';
import { Calendar, ChevronLeft, ChevronRight, TrendingUp, Award, Layers, BarChart3, PieChart } from 'lucide-react';
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
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => {
    if (entries.length > 0) {
      const sorted = [...entries].sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
      // Safeguard date parsing
      const latestDateStr = sorted[0].entryDate;
      if (latestDateStr && latestDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(latestDateStr + 'T00:00:00');
      }
    }
    return new Date();
  });

  const handlePrevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
  };

  const formatCalendarUSD = (val: number) => {
    const absVal = Math.round(Math.abs(val));
    const sign = val < 0 ? '-' : val > 0 ? '+' : '';
    if (absVal >= 1000) {
      return `${sign}$${(absVal / 1000).toFixed(1)}K`;
    }
    return `${sign}$${absVal}`;
  };

  const monthlyStats = useMemo(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    // Filter trades that occurred within the selected month
    const monthTrades = entries.filter(e => e.entryDate.startsWith(monthPrefix));
    const closedTrades = monthTrades.filter(e => e.status !== 'open');
    
    let totalNet = 0;
    let wins = 0;
    let losses = 0;
    let totalFees = 0;
    
    monthTrades.forEach(e => {
      totalFees += e.fees || 0;
      if (e.status !== 'open') {
        const net = (e.pnl || 0) - (e.fees || 0);
        totalNet += net;
        if (e.status === 'win') wins++;
        else if (e.status === 'loss') losses++;
      }
    });
    
    const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;
    
    return {
      totalNet,
      tradeCount: monthTrades.length,
      closedCount: closedTrades.length,
      winRate,
      totalFees
    };
  }, [entries, selectedMonth]);

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

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="analytics-charts-row">
      
      {/* Chart 1: Trading Calendar Grid */}
      <div className="lg:col-span-2 bg-geo-panel border border-geo-border p-4 rounded-sm flex flex-col justify-between text-left relative overflow-hidden">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-geo-border/40 pb-3 mb-3.5">
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-500" /> Trading Performance Calendar
              </span>
              <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">Real-time daily net trading profit and loss ledger grid</p>
            </div>

            <div className="flex items-center gap-2 bg-slate-950/45 p-1 border border-slate-900 rounded-sm self-start sm:self-auto">
              <button 
                onClick={handlePrevMonth}
                className="p-1 hover:text-white text-slate-400 hover:bg-slate-900 border border-transparent rounded-sm cursor-pointer transition-colors"
                title="Previous Month"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="font-display text-[11px] font-bold text-slate-200 uppercase tracking-widest px-2 min-w-[110px] text-center select-none">
                {selectedMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
              <button 
                onClick={handleNextMonth}
                className="p-1 hover:text-white text-slate-400 hover:bg-slate-900 border border-transparent rounded-sm cursor-pointer transition-colors"
                title="Next Month"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid wrapper */}
        <div className="flex-1 w-full bg-slate-950/20 border border-slate-900/60 p-2.5 rounded-sm relative mb-4">
          {/* Week headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <span key={d} className="text-[9px] font-mono font-bold text-slate-600 uppercase tracking-wider select-none">{d}</span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {/* Blank spacer cells for offset */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div 
                key={`blank-${idx}`} 
                className="bg-slate-950/5 border border-transparent min-h-[46px] sm:min-h-[50px]" 
              />
            ))}

            {/* Actual day cells */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const d = idx + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              
              // Filter closed trades logged on this exact calendar day
              const dayTrades = entries.filter(e => e.entryDate === dateStr);
              const totalNetPnl = dayTrades.reduce((sum, e) => {
                if (e.status === 'open') return sum;
                return sum + (e.pnl || 0) - (e.fees || 0);
              }, 0);
              const tradeCount = dayTrades.length;
              const hasTrades = tradeCount > 0;
              
              let bgClass = "bg-slate-950/25 border-slate-900/40 text-slate-500";
              if (hasTrades) {
                if (totalNetPnl > 0) {
                  bgClass = "bg-emerald-950/25 border-emerald-500/25 text-emerald-300 hover:bg-emerald-900/30";
                } else if (totalNetPnl < 0) {
                  bgClass = "bg-rose-950/25 border-rose-500/25 text-rose-300 hover:bg-rose-900/30";
                } else {
                  bgClass = "bg-slate-900 border-slate-700/60 text-slate-200 hover:bg-slate-800";
                }
              }

              return (
                <div 
                  key={`day-${d}`}
                  className={`min-h-[46px] sm:min-h-[50px] p-1 border rounded-xs flex flex-col justify-between text-left transition-all ${bgClass}`}
                  title={hasTrades ? `${dateStr}: ${formatUSD(totalNetPnl)} (${tradeCount} trade${tradeCount === 1 ? '' : 's'})` : dateStr}
                >
                  <span className={`text-[8.5px] font-bold font-mono leading-none ${hasTrades ? 'text-slate-100' : 'text-slate-500'}`}>
                    {d}
                  </span>
                  {hasTrades && (
                    <div className="flex flex-col text-center w-full mt-0.5 select-none font-mono">
                      <span className="text-[9px] font-extrabold leading-none tracking-tighter truncate">
                        {formatCalendarUSD(totalNetPnl)}
                      </span>
                      <span className="text-[6.5px] leading-none opacity-70 mt-0.5 font-bold tracking-tight truncate">
                        {tradeCount} T
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Ledger Summary indicators at the base */}
        <div className="grid grid-cols-3 gap-2.5 border-t border-geo-border/40 pt-3">
          <div className="bg-slate-950/30 py-1.5 px-2.5 border border-slate-900 rounded-sm text-left font-mono">
            <span className="text-[7.5px] text-slate-500 uppercase tracking-wider block font-bold">Month yield</span>
            <span className={`text-[11px] font-extrabold block mt-0.5 leading-none ${monthlyStats.totalNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {monthlyStats.totalNet >= 0 ? '+' : ''}{formatUSD(monthlyStats.totalNet)}
            </span>
          </div>

          <div className="bg-slate-950/30 py-1.5 px-2.5 border border-slate-900 rounded-sm text-left font-mono">
            <span className="text-[7.5px] text-slate-500 uppercase tracking-wider block font-bold">Total execution</span>
            <span className="text-[11.5px] font-extrabold text-slate-300 block mt-0.5 leading-none">
              {monthlyStats.tradeCount} trades
            </span>
          </div>

          <div className="bg-slate-950/30 py-1.5 px-2.5 border border-slate-900 rounded-sm text-left font-mono">
            <span className="text-[7.5px] text-slate-500 uppercase tracking-wider block font-bold">Accuracy rate</span>
            <span className="text-[11.5px] font-extrabold text-slate-300 block mt-0.5 leading-none">
              {monthlyStats.winRate.toFixed(0)}%
            </span>
          </div>
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
