/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TradeEntry, TradeStats } from '../types';
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Calculator,
  DollarSign,
  Activity,
  Award,
  Clock
} from 'lucide-react';

interface StatsDashboardProps {
  entries: TradeEntry[];
}

const formatUSD = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

export default function StatsDashboard({ entries }: StatsDashboardProps) {
  // Calculate stats
  const stats = React.useMemo<TradeStats>(() => {
    let netProfit = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let totalFees = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    let breakevenTrades = 0;
    let openTrades = 0;
    let winSum = 0;
    let lossSum = 0;

    entries.forEach((e) => {
      const fees = e.fees || 0;
      totalFees += fees;

      if (e.status === 'open') {
        openTrades++;
        return;
      }

      const pnl = e.pnl || 0;
      const netPnl = pnl - fees;
      netProfit += netPnl;

      if (e.status === 'win') {
        winningTrades++;
        grossProfit += pnl;
        winSum += netPnl;
      } else if (e.status === 'loss') {
        losingTrades++;
        grossLoss += Math.abs(pnl);
        lossSum += netPnl;
      } else if (e.status === 'breakeven') {
        breakevenTrades++;
      }
    });

    const closedTrades = winningTrades + losingTrades + breakevenTrades;
    const winRate = closedTrades > 0 ? (winningTrades / closedTrades) * 100 : 0;
    const averageWin = winningTrades > 0 ? winSum / winningTrades : 0;
    const averageLoss = losingTrades > 0 ? lossSum / losingTrades : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

    return {
      netProfit,
      grossProfit,
      grossLoss,
      winRate,
      totalTrades: entries.length,
      winningTrades,
      losingTrades,
      breakevenTrades,
      openTrades,
      totalFees,
      averageWin,
      averageLoss,
      profitFactor,
    };
  }, [entries]);

  const bestTrade = React.useMemo(() => {
    const closed = entries.filter((e) => e.status !== 'open');
    if (closed.length === 0) return null;
    return closed.reduce((best, curr) => {
      const bestNet = (best.pnl || 0) - (best.fees || 0);
      const currNet = (curr.pnl || 0) - (curr.fees || 0);
      return currNet > bestNet ? curr : best;
    }, closed[0]);
  }, [entries]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="stats-dashboard-grid">
      {/* Tile 1: Net PnL */}
      <div className="bg-geo-panel border border-geo-border p-4 rounded-sm flex flex-col justify-between relative overflow-hidden text-left shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">Net P&amp;L (Realized)</span>
          <div className={`p-1.5 rounded-sm ${stats.netProfit >= 0 ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
            {stats.netProfit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          </div>
        </div>
        <div className="mt-4">
          <span className={`text-xl font-bold font-mono tracking-tight block ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.netProfit >= 0 ? '+' : ''}
            {formatUSD(stats.netProfit)}
          </span>
          <p className="text-[10px] text-slate-500 font-mono mt-1">
            Gross: {formatUSD(stats.grossProfit - stats.grossLoss)} &bull; Fees: {formatUSD(stats.totalFees)}
          </p>
        </div>
        <div className={`absolute top-0 right-0 h-[4px] w-full ${stats.netProfit >= 0 ? 'bg-emerald-500/40' : 'bg-rose-500/40'}`} />
      </div>

      {/* Tile 2: Win Rate */}
      <div className="bg-geo-panel border border-geo-border p-4 rounded-sm flex flex-col justify-between relative overflow-hidden text-left shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">Win Rate</span>
          <div className="p-1.5 rounded-sm bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Percent size={14} />
          </div>
        </div>
        <div className="mt-4">
          <span className="text-xl font-bold font-mono tracking-tight text-slate-150 block">
            {stats.winRate.toFixed(1)}%
          </span>
          <p className="text-[10px] text-slate-500 font-mono mt-1">
            {stats.winningTrades} Wins / {stats.losingTrades} Losses ({stats.breakevenTrades} BE)
          </p>
        </div>
        <div className="absolute top-0 right-0 h-[4px] w-full bg-blue-500/40" />
      </div>

      {/* Tile 3: Profit Factor */}
      <div className="bg-geo-panel border border-geo-border p-4 rounded-sm flex flex-col justify-between relative overflow-hidden text-left shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">Profit Factor</span>
          <div className="p-1.5 rounded-sm bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <Activity size={14} />
          </div>
        </div>
        <div className="mt-4">
          <span className={`text-xl font-bold font-mono tracking-tight block ${stats.profitFactor >= 1.5 ? 'text-emerald-400' : stats.profitFactor >= 1.0 ? 'text-slate-250' : 'text-rose-400'}`}>
            {stats.profitFactor.toFixed(2)}
          </span>
          <p className="text-[10px] text-slate-500 font-mono mt-1">
            Goal: &gt; 1.50 &bull; Total trades: {stats.totalTrades}
          </p>
        </div>
        <div className="absolute top-0 right-0 h-[4px] w-full bg-violet-500/40" />
      </div>

      {/* Tile 4: Average trades & peaks */}
      <div className="bg-geo-panel border border-geo-border p-4 rounded-sm flex flex-col justify-between relative overflow-hidden text-left shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">Averages &amp; Peaks</span>
          <div className="p-1.5 rounded-sm bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Award size={14} />
          </div>
        </div>
        <div className="mt-4">
          <span className="text-xs font-bold font-mono tracking-tight text-slate-150 block truncate">
            Best: <span className="text-emerald-400">{bestTrade ? formatUSD((bestTrade.pnl || 0) - (bestTrade.fees || 0)) : '$0.00'}</span>
          </span>
          <p className="text-[10px] text-slate-500 font-mono mt-1 flex justify-between">
            <span>Avg Win: <span className="text-emerald-400">{formatUSD(stats.averageWin)}</span></span>
            <span>Avg Loss: <span className="text-rose-400">{formatUSD(stats.averageLoss)}</span></span>
          </p>
        </div>
        <div className="absolute top-0 right-0 h-[4px] w-full bg-amber-500/40" />
      </div>
    </div>
  );
}
