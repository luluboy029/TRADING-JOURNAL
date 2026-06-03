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
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);
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

  // 5. Daily Net Trade P&L Trend over time
  const dailyTrendData = useMemo(() => {
    const dailyMap: Record<string, { date: string; pnl: number; count: number; wins: number }> = {};
    
    entries.forEach((e) => {
      if (e.status === 'open') return;
      const date = e.entryDate;
      if (!date) return;
      const net = (e.pnl || 0) - (e.fees || 0);

      if (!dailyMap[date]) {
        dailyMap[date] = { date, pnl: 0, count: 0, wins: 0 };
      }
      const dayData = dailyMap[date];
      dayData.pnl += net;
      dayData.count++;
      if (e.status === 'win') {
        dayData.wins++;
      }
    });

    const sortedDays = Object.values(dailyMap).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sortedDays;
  }, [entries]);

  const trendMetrics = useMemo(() => {
    if (dailyTrendData.length === 0) {
      return { minPnl: 0, maxPnl: 100, points: [], zeroY: 75, yTicks: [0] };
    }
    const values = dailyTrendData.map((d) => d.pnl);
    let minVal = Math.min(0, ...values);
    let maxVal = Math.max(100, ...values);
    
    // Add 15% padding at top and bottom
    const range = maxVal - minVal || 100;
    const minPnl = minVal - range * 0.15;
    const maxPnl = maxVal + range * 0.15;
    const pnlRange = maxPnl - minPnl;

    const paddingX = 35;
    const paddingY = 20;
    const chartW = 500;
    const chartH = 150;

    const zeroY = chartH - paddingY - ((0 - minPnl) / pnlRange) * (chartH - 2 * paddingY);
    
    const points = dailyTrendData.map((d, index) => {
      const xRange = dailyTrendData.length > 1 ? dailyTrendData.length - 1 : 1;
      const x = paddingX + (index / xRange) * (chartW - 2 * paddingX);
      const y = chartH - paddingY - ((d.pnl - minPnl) / pnlRange) * (chartH - 2 * paddingY);
      return { x, y, ...d };
    });

    // Make neat Y ticks
    const yTicks = [minVal, 0, maxVal];

    return { minPnl, maxPnl, points, zeroY, yTicks };
  }, [dailyTrendData]);

  const trendStats = useMemo(() => {
    if (dailyTrendData.length === 0) {
      return { avgPnl: 0, profitableDays: 0, totalDays: 0, winDayRate: 0, bestDay: 0, worstDay: 0 };
    }
    const profits = dailyTrendData.map(d => d.pnl);
    const totalPnl = profits.reduce((sum, p) => sum + p, 0);
    const avgPnl = totalPnl / dailyTrendData.length;
    const greenDays = dailyTrendData.filter(d => d.pnl > 0).length;
    const winDayRate = (greenDays / dailyTrendData.length) * 100;
    const bestDay = Math.max(...profits);
    const worstDay = Math.min(...profits);

    return {
      avgPnl,
      profitableDays: greenDays,
      totalDays: dailyTrendData.length,
      winDayRate,
      bestDay,
      worstDay
    };
  }, [dailyTrendData]);

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

      {/* Chart 2: Daily P&L Trend Performance Chart */}
      <div className="bg-geo-panel border border-geo-border p-4 rounded-sm flex flex-col justify-between text-left">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
            <TrendingUp size={12} className="text-blue-500" /> Daily Trade P&amp;L Trend
          </span>
          <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">Chronological ledger trend of daily net profit and loss</p>
        </div>

        {/* The Graphic Element */}
        <div className="my-3 flex-1 flex flex-col justify-center min-h-[170px] relative">
          {dailyTrendData.length === 0 ? (
            <div className="text-center font-mono py-12 text-slate-500 text-[10px]">
              No closed trade history logs.
            </div>
          ) : (
            <div className="space-y-3">
              {/* SVG Trend Graph */}
              <div className="relative bg-slate-950/40 border border-slate-900 rounded-sm p-1">
                <svg viewBox="0 0 500 150" className="w-full h-auto overflow-visible select-none">
                  {/* Grid Lines */}
                  <line 
                    x1="35" 
                    y1={trendMetrics.zeroY} 
                    x2="465" 
                    y2={trendMetrics.zeroY} 
                    className="stroke-slate-800" 
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  
                  {/* Zero Line Marker Label */}
                  <text 
                    x="24" 
                    y={trendMetrics.zeroY + 3} 
                    className="fill-slate-650 font-mono text-[8px] text-slate-500 text-right font-semibold"
                    textAnchor="end"
                  >
                    $0
                  </text>

                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="pnlGlowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="50%" stopColor="#10b981" stopOpacity="0.0" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.15" />
                    </linearGradient>
                  </defs>

                  {/* Shaded Area fill under the curve */}
                  {trendMetrics.points.length > 1 && (
                    <path
                      d={`
                        M ${trendMetrics.points[0].x} ${trendMetrics.zeroY}
                        ${trendMetrics.points.map(p => `L ${p.x} ${p.y}`).join(' ')}
                        L ${trendMetrics.points[trendMetrics.points.length - 1].x} ${trendMetrics.zeroY}
                        Z
                      `}
                      fill="url(#pnlGlowGrad)"
                      className="opacity-40"
                    />
                  )}

                  {/* Connecting Line */}
                  {trendMetrics.points.length > 1 && (
                    <path
                      d={trendMetrics.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                      fill="none"
                      className="stroke-blue-500/70"
                      strokeWidth="1.5"
                    />
                  )}

                  {/* Zero Line horizontal dotted */}
                  <line 
                    x1="35" 
                    y1="20" 
                    x2="35" 
                    y2="130" 
                    className="stroke-slate-900" 
                    strokeWidth="1"
                  />

                  {/* Bars at each point for Daily columns */}
                  {trendMetrics.points.map((p, idx) => {
                    const isHovered = hoveredTrendIndex === idx;
                    const isPositive = p.pnl >= 0;
                    
                    // Draw columns
                    const barW = Math.max(3, Math.min(14, (435 / dailyTrendData.length) * 0.4));
                    const barH = Math.abs(p.y - trendMetrics.zeroY);
                    const barY = isPositive ? p.y : trendMetrics.zeroY;

                    return (
                      <g key={`bar-gr-${idx}`}>
                        <rect
                          x={p.x - barW / 2}
                          y={barY}
                          width={barW}
                          height={Math.max(2, barH)}
                          className={`cursor-pointer transition-all ${
                            isPositive 
                              ? isHovered ? 'fill-emerald-400 stroke-emerald-300' : 'fill-emerald-500/35 stroke-emerald-500/70'
                              : isHovered ? 'fill-rose-400 stroke-rose-300' : 'fill-rose-500/35 stroke-rose-500/70'
                          }`}
                          strokeWidth={isHovered ? 1.5 : 0.8}
                          onMouseEnter={() => setHoveredTrendIndex(idx)}
                          onMouseLeave={() => setHoveredTrendIndex(null)}
                        />
                        {/* Interactive Dot Anchors */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 4.5 : 2.5}
                          className={`cursor-pointer transition-all ${
                            isPositive 
                              ? 'fill-emerald-400 stroke-slate-950 stroke-2' 
                              : 'fill-rose-400 stroke-slate-950 stroke-2'
                          }`}
                          onMouseEnter={() => setHoveredTrendIndex(idx)}
                          onMouseLeave={() => setHoveredTrendIndex(null)}
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Floating tooltips inside coordinates */}
                {hoveredTrendIndex !== null && trendMetrics.points[hoveredTrendIndex] && (
                  <div className="absolute top-1.5 right-1.5 bg-slate-950/95 border border-slate-800/80 px-2 py-1 rounded-sm text-[8px] font-mono leading-tight shadow-md z-10">
                    <span className="text-slate-450 block font-bold text-slate-400 uppercase">
                      {new Date(trendMetrics.points[hoveredTrendIndex].date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <div className="flex gap-2 justify-between mt-1 text-slate-200">
                      <span>Profit:</span>
                      <span className={`font-bold ${trendMetrics.points[hoveredTrendIndex].pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trendMetrics.points[hoveredTrendIndex].pnl >= 0 ? '+' : ''}
                        {formatUSD(trendMetrics.points[hoveredTrendIndex].pnl)}
                      </span>
                    </div>
                    <div className="flex gap-2 justify-between text-slate-400 mt-0.5">
                      <span>Trades:</span>
                      <span className="font-bold text-slate-200">{trendMetrics.points[hoveredTrendIndex].count}</span>
                    </div>
                    <div className="flex gap-2 justify-between text-slate-400 mt-0.5">
                      <span>Win Rate:</span>
                      <span className="font-bold text-slate-200">
                        {((trendMetrics.points[hoveredTrendIndex].wins / trendMetrics.points[hoveredTrendIndex].count) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Day stats indicators or Hover info */}
              <div className="bg-slate-950/30 border border-slate-900 rounded p-2 text-left space-y-1">
                {hoveredTrendIndex === null ? (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[9px]">
                    <div className="flex justify-between border-b border-slate-900/60 pb-1">
                      <span className="text-slate-500 uppercase">Daily Average:</span>
                      <span className={`font-bold ${trendStats.avgPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trendStats.avgPnl >= 0 ? '+' : ''}{formatUSD(trendStats.avgPnl)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-900/60 pb-1">
                      <span className="text-slate-500 uppercase">Profitable Days:</span>
                      <span className="font-bold text-emerald-400">
                        {trendStats.profitableDays} / {trendStats.totalDays} ({trendStats.winDayRate.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 uppercase">Best Day Yield:</span>
                      <span className="font-bold text-emerald-400">+{formatUSD(trendStats.bestDay)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 uppercase">Worst Day Yield:</span>
                      <span className="font-bold text-rose-400">{formatUSD(trendStats.worstDay)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="font-mono text-[9px] flex justify-between items-center h-[29.5px]">
                    <div className="space-x-1 flex items-center">
                      <span className="text-slate-400 font-bold bg-slate-900 px-1.5 py-0.5 border border-slate-950 rounded-sm">
                        {trendMetrics.points[hoveredTrendIndex].date}
                      </span>
                      <span className="text-slate-550 text-slate-500">&bull; {trendMetrics.points[hoveredTrendIndex].count} trades</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase mr-1">Daily Yield:</span>
                      <span className={`font-bold text-[10px] ${trendMetrics.points[hoveredTrendIndex].pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trendMetrics.points[hoveredTrendIndex].pnl >= 0 ? '+' : ''}
                        {formatUSD(trendMetrics.points[hoveredTrendIndex].pnl)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest flex justify-between border-t border-geo-border/40 pt-2 shrink-0">
          <span>Active Trading Sessions</span>
          <span>{dailyTrendData.length} active days</span>
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
