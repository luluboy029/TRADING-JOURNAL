/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from 'react';
import { Trade, TradingStats } from '../types';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Percent,
  Layers,
  Scale,
  Award,
  CircleAlert,
  Zap,
  Activity,
  DollarSign
} from 'lucide-react';

interface StatsDashboardProps {
  trades: Trade[];
}

const formatUSD = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

export default function StatsDashboard({ trades }: StatsDashboardProps) {
  const stats = useMemo(() => {
    const closedTrades = trades.filter((t) => t.status !== 'open');
    const openTrades = trades.filter((t) => t.status === 'open');

    const totalTrades = closedTrades.length;
    const wins = closedTrades.filter((t) => t.status === 'win');
    const losses = closedTrades.filter((t) => t.status === 'loss');
    const breakevens = closedTrades.filter((t) => t.status === 'breakeven');

    const totalFees = trades.reduce((acc, t) => acc + (t.fees || 0), 0);

    let netPnL = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let bestTrade = 0;
    let worstTrade = 0;

    closedTrades.forEach((t) => {
      const netTradePnL = (t.pnl ?? 0) - (t.fees ?? 0);
      netPnL += netTradePnL;

      if (netTradePnL > 0) {
        grossProfit += netTradePnL;
        if (netTradePnL > bestTrade) bestTrade = netTradePnL;
      } else if (netTradePnL < 0) {
        grossLoss += Math.abs(netTradePnL);
        if (netTradePnL < worstTrade) worstTrade = netTradePnL;
      }
    });

    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 1;

    const avgWin = wins.length > 0 ? wins.reduce((acc, t) => acc + ((t.pnl ?? 0) - (t.fees ?? 0)), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((acc, t) => acc + Math.abs((t.pnl ?? 0) - (t.fees ?? 0)), 0) / losses.length : 0;

    // Calculate expectations (average win/loss per closed trade)
    const averageTradePnL = totalTrades > 0 ? netPnL / totalTrades : 0;

    // Current Active streak calculation
    let currentStreakCount = 0;
    let currentStreakType: 'win' | 'loss' | null = null;

    const sortedClosed = [...closedTrades].sort(
      (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );

    // Track active runs
    let tempStreakCount = 0;
    let tempStreakType: 'win' | 'loss' | null = null;
    let maxWinStreak = 0;
    let maxLossStreak = 0;

    sortedClosed.forEach((t) => {
      if (t.status === 'win') {
        if (tempStreakType === 'win') {
          tempStreakCount++;
        } else {
          tempStreakType = 'win';
          tempStreakCount = 1;
        }
        if (tempStreakCount > maxWinStreak) maxWinStreak = tempStreakCount;
      } else if (t.status === 'loss') {
        if (tempStreakType === 'loss') {
          tempStreakCount++;
        } else {
          tempStreakType = 'loss';
          tempStreakCount = 1;
        }
        if (tempStreakCount > maxLossStreak) maxLossStreak = tempStreakCount;
      } else {
        // Breakeven breaks streak
        tempStreakCount = 0;
        tempStreakType = null;
      }
    });

    // Extract the final, latest streak from the end
    if (sortedClosed.length > 0) {
      let streakClass = sortedClosed[sortedClosed.length - 1].status;
      if (streakClass === 'win' || streakClass === 'loss') {
        currentStreakType = streakClass;
        for (let i = sortedClosed.length - 1; i >= 0; i--) {
          if (sortedClosed[i].status === streakClass) {
            currentStreakCount++;
          } else if (sortedClosed[i].status === 'breakeven') {
            continue; // ignore breakeven or stop streak? usually breakevens can pause or end. We end here.
          } else {
            break;
          }
        }
      }
    }

    return {
      totalTrades,
      openTradesCount: openTrades.length,
      winRate,
      profitFactor,
      netPnL,
      totalFees,
      avgWin,
      avgLoss,
      bestTrade,
      worstTrade,
      averageTradePnL,
      maxWinStreak,
      maxLossStreak,
      currentStreakCount,
      currentStreakType,
    };
  }, [trades]);

  const pnlColorClass = stats.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400';
  const pnlBgClass = stats.netPnL >= 0 ? 'border-l-4 border-l-emerald-500 bg-geo-panel border-geo-border' : 'border-l-4 border-l-rose-500 bg-geo-panel border-geo-border';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in" id="stats-dashboard">
      {/* Principal Net PnL Card */}
      <div className={`md:col-span-2 p-5 rounded-sm border ${pnlBgClass} relative overflow-hidden`} id="pnl-summary-card">
        <div className="absolute right-3 bottom-0 opacity-5 pointer-events-none">
          <DollarSign size={120} className="text-white" />
        </div>
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-widest font-mono block">Total Net Realized PnL</span>
            <h2 className={`text-4xl font-bold mt-2.5 ${pnlColorClass} font-mono tracking-tight`}>
              {stats.netPnL >= 0 ? '+' : ''}
              {formatUSD(stats.netPnL)}
            </h2>
          </div>
          <span className={`p-2 rounded-sm ${stats.netPnL >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
            {stats.netPnL >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-geo-border pt-4 text-xs">
          <div>
            <span className="text-slate-400 font-mono text-[10px] uppercase">Total Accrued Fees</span>
            <span className="text-slate-200 font-mono font-bold mt-0.5 block">{formatUSD(stats.totalFees)}</span>
          </div>
          <div>
            <span className="text-slate-400 font-mono text-[10px] uppercase">Avg Income Per Pos</span>
            <span className={`font-mono font-bold mt-0.5 block ${stats.averageTradePnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.averageTradePnL >= 0 ? '+' : ''}
              {formatUSD(stats.averageTradePnL)}
            </span>
          </div>
        </div>
      </div>

      {/* Win Rate Stats Card */}
      <div className="bg-geo-panel border border-geo-border p-5 rounded-sm flex flex-col justify-between" id="winrate-stat-card">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-widest font-mono block">Success Rate</span>
            <span className="text-3xl font-bold text-slate-100 mt-2 block font-mono">
              {stats.winRate.toFixed(1)}%
            </span>
          </div>
          <span className="p-2 bg-geo-bg text-blue-400 border border-geo-border rounded-sm">
            <Percent size={18} />
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-geo-border pt-3.5 text-xs w-full font-mono text-slate-400">
          <div>
            <span>Total Closed</span>
            <span className="text-slate-200 mt-0.5 font-bold block">{stats.totalTrades}</span>
          </div>
          <div className="text-right">
            <span>Active Open</span>
            <span className="text-blue-400 mt-0.5 font-bold block">{stats.openTradesCount}</span>
          </div>
        </div>
      </div>

      {/* Profit Factor Card */}
      <div className="bg-geo-panel border border-geo-border p-5 rounded-sm flex flex-col justify-between" id="profitfactor-stat-card">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-widest font-mono block">Profit Factor</span>
            <span className="text-3xl font-bold text-slate-100 mt-2 block font-mono">
              {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
            </span>
          </div>
          <span className="p-2 bg-geo-bg text-amber-500 border border-geo-border rounded-sm">
            <Scale size={18} />
          </span>
        </div>
        <div className="mt-4 border-t border-geo-border pt-3.5 text-xs w-full">
          <span className="text-[10px] uppercase font-mono text-slate-400 block">Setup Reliability</span>
          <span className="text-amber-500 font-bold block mt-0.5 font-mono">
            {stats.profitFactor >= 2.0 ? 'EXCEPTIONAL' : stats.profitFactor >= 1.4 ? 'PROFITABLE' : stats.totalTrades === 0 ? 'INSUFFICIENT' : 'SUB-OPTIMAL'}
          </span>
        </div>
      </div>

      {/* Extreme trades detail list (Best / Worst / Streaks) - Columns underneath or responsive blocks */}
      <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-geo-border pt-2" id="detailed-performance-metrics">
        {/* Metric block A */}
        <div className="bg-geo-panel border border-geo-border rounded-sm p-4 flex items-center gap-3.5">
          <div className="p-2 bg-geo-bg text-emerald-400 border border-geo-border rounded-sm">
            <TrendingUp size={16} />
          </div>
          <div className="flex-1">
            <span className="text-slate-440 font-mono text-[9px] uppercase tracking-wider block">Best Trade</span>
            <span className="text-xs font-bold text-emerald-400 font-mono block mt-0.5">
              +{formatUSD(stats.bestTrade)}
            </span>
          </div>
          <div className="text-right border-l border-geo-border pl-3.5">
            <span className="text-[9px] font-mono text-slate-440 uppercase block">Worst Trade</span>
            <span className="text-xs font-bold text-rose-450 text-rose-400 font-mono block mt-0.5">
              {formatUSD(stats.worstTrade)}
            </span>
          </div>
        </div>

        {/* Metric block B */}
        <div className="bg-geo-panel border border-geo-border rounded-sm p-4 flex items-center gap-3.5">
          <div className="p-2 bg-geo-bg text-blue-400 border border-geo-border rounded-sm">
            <Target size={16} />
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1">
            <div>
              <span className="text-[9px] font-mono text-slate-440 uppercase block">Avg Win</span>
              <span className="text-xs font-bold text-emerald-400 font-mono block mt-0.5">
                +{formatUSD(stats.avgWin)}
              </span>
            </div>
            <div className="border-l border-geo-border pl-2">
              <span className="text-[9px] font-mono text-slate-440 uppercase block">Avg Loss</span>
              <span className="text-xs font-bold text-rose-400 font-mono block mt-0.5">
                -{formatUSD(stats.avgLoss)}
              </span>
            </div>
          </div>
        </div>

        {/* Metric block C - Performance Streaks */}
        <div className="bg-geo-panel border border-geo-border rounded-sm p-4 flex items-center gap-2">
          <div className="p-2 bg-geo-bg text-amber-500 border border-geo-border rounded-sm">
            <Zap size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[9px] font-mono text-slate-440 uppercase block">Streak Records</span>
            <span className="text-[11px] font-bold text-slate-200 block mt-0.5 font-mono truncate">
              W: {stats.maxWinStreak} | L: {stats.maxLossStreak}
            </span>
          </div>
          {stats.currentStreakCount > 0 && stats.currentStreakType && (
            <div className={`px-2 py-0.5 rounded-sm text-[10px] font-bold font-mono border ${
              stats.currentStreakType === 'win'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {stats.currentStreakCount}{stats.currentStreakType === 'win' ? 'W' : 'L'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
