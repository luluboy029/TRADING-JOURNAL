/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Calendar, Clock, DollarSign, Tag, Scale, TrendingUp, Sparkles, BookOpen } from 'lucide-react';
import { Trade } from '../types';

interface TradeDetailModalProps {
  trade: Trade;
  onClose: () => void;
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
}

const formatUSD = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

export default function TradeDetailModal({ trade, onClose, onEdit, onDelete }: TradeDetailModalProps) {
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const netPnL = (trade.pnl ?? 0) - (trade.fees ?? 0);

  // Compute holding duration in human readable hours/days
  const holdingDuration = (() => {
    if (!trade.entryDate || !trade.exitDate) return null;
    const entry = new Date(trade.entryDate).getTime();
    const exit = new Date(trade.exitDate).getTime();
    const diffMs = exit - entry;
    if (diffMs <= 0) return 'Instantaneous';

    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffDays > 0) {
      const remainingHrs = diffHrs % 24;
      return `${diffDays} Day${diffDays !== 1 ? 's' : ''}${remainingHrs > 0 ? `, ${remainingHrs} hr${remainingHrs !== 1 ? 's' : ''}` : ''}`;
    }
    if (diffHrs > 0) {
      const remainingMins = diffMins % 60;
      return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''}${remainingMins > 0 ? `, ${remainingMins} min${remainingMins !== 1 ? 's' : ''}` : ''}`;
    }
    return `${diffMins} min${diffMins !== 1 ? 's' : ''}`;
  })();

  // Multiplier for Risk-Reward
  const rrRatio = (() => {
    if (!trade.entryPrice || !trade.targetPrice || !trade.stopLoss) return null;
    const isLong = trade.side === 'long';
    const risk = isLong ? trade.entryPrice - trade.stopLoss : trade.stopLoss - trade.entryPrice;
    const reward = isLong ? trade.targetPrice - trade.entryPrice : trade.entryPrice - trade.targetPrice;
    if (risk <= 0 || reward <= 0) return null;
    return (reward / risk).toFixed(2);
  })();

  // Render risk bar
  const riskBarPercentage = (() => {
    if (!trade.entryPrice || !trade.targetPrice || !trade.stopLoss) return null;
    const entry = trade.entryPrice;
    const sl = trade.stopLoss;
    const tp = trade.targetPrice;

    const totalSpan = Math.abs(tp - sl);
    if (totalSpan <= 0) return null;

    const isLong = trade.side === 'long';
    let entryPercent = 0;

    if (isLong) {
      entryPercent = ((entry - sl) / totalSpan) * 100;
    } else {
      entryPercent = ((sl - entry) / totalSpan) * 100;
    }

    return Math.min(Math.max(entryPercent, 5), 95);
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-geo-bg/85 backdrop-blur-md overflow-y-auto" id="trade-detail-modal">
      <div className="bg-geo-panel border border-geo-border rounded-sm shadow-none max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header toolbar */}
        <div className="p-5 border-b border-geo-border flex items-center justify-between bg-geo-header">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase font-mono tracking-wider border ${
              trade.side === 'long'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                : 'bg-rose-500/10 text-rose-455 text-rose-400 border-rose-500/25'
            }`}>
              {trade.side}
            </span>
            <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider font-display flex items-center gap-2">
              {trade.symbol}
              <span className="text-xs text-slate-500 font-mono">({trade.assetClass})</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-geo-bg text-slate-500 hover:text-white rounded-sm border border-transparent hover:border-geo-border transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* Top Banner metrics overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="detail-banner-metrics">
            {/* Realized yield */}
            <div className="bg-geo-bg border border-geo-border rounded-sm p-4 flex flex-col justify-between">
              <span className="text-[9px] text-slate-500 font-bold font-mono uppercase tracking-wider">Realized Net Yield</span>
              {trade.status === 'open' ? (
                <span className="text-base font-bold text-blue-400 font-mono tracking-tight mt-2.5 block uppercase">Active Open</span>
              ) : (
                <span className={`text-xl font-bold font-mono tracking-tight mt-1.5 block ${netPnL >= 0 ? 'text-emerald-400' : 'text-rose-450 text-rose-400'}`}>
                  {netPnL >= 0 ? '+' : ''}
                  {formatUSD(netPnL)}
                </span>
              )}
            </div>

            {/* Hold times duration */}
            <div className="bg-geo-bg border border-geo-border rounded-sm p-4 flex flex-col justify-between">
              <span className="text-[9px] text-slate-500 font-bold font-mono uppercase tracking-wider">Total Duration Held</span>
              <span className="text-xs font-bold text-slate-250 font-mono mt-2.5 flex items-center gap-2">
                <Clock size={14} className="text-slate-500" />
                {holdingDuration ? holdingDuration.toUpperCase() : 'POSITION OPEN'}
              </span>
            </div>

            {/* Win Loss status */}
            <div className="bg-geo-bg border border-geo-border rounded-sm p-4 flex flex-col justify-between">
              <span className="text-[9px] text-slate-500 font-bold font-mono uppercase tracking-wider">Plan Conclusion</span>
              <div className="mt-2 text-xs font-mono">
                {trade.status === 'win' && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-450 text-emerald-400 border border-emerald-500/25">
                    WIN ACCUMULATION
                  </span>
                )}
                {trade.status === 'loss' && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm bg-rose-500/10 text-rose-450 text-rose-400 border border-rose-500/25">
                    LOSS HIT LIMIT
                  </span>
                )}
                {trade.status === 'breakeven' && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm bg-slate-800 text-slate-350 border border-geo-border">
                    BREAKEVEN BALANCE
                  </span>
                )}
                {trade.status === 'open' && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm bg-blue-500/10 text-blue-400 border border-blue-400/20 animate-pulse">
                    ACTIVE MONITOR
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quantitative Price Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-geo-bg p-4 rounded-sm border border-geo-border text-xs font-mono" id="detail-parameters-grid">
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase">Entry Value</span>
              <span className="text-xs font-bold text-slate-350 mt-1 block">{formatUSD(trade.entryPrice)}</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase">Exit Value</span>
              <span className="text-xs font-bold text-slate-350 mt-1 block">
                {trade.exitPrice ? formatUSD(trade.exitPrice) : <span className="text-slate-650 italic">Position open</span>}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase">Quantity Size</span>
              <span className="text-xs font-bold text-slate-350 mt-1 block">{trade.quantity} units</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase">Commissions</span>
              <span className="text-xs font-bold text-slate-350 mt-1 block">{formatUSD(trade.fees)}</span>
            </div>
          </div>

          {/* Risk-Reward Bracket Section */}
          {riskBarPercentage !== null && trade.stopLoss && trade.targetPrice && (
            <div className="bg-geo-bg p-5 rounded-sm border border-geo-border space-y-4 font-mono" id="risk-reward-visual-bar">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Scale size={13} className="text-blue-400" /> Target Plan Matrix Bracket
                </span>
                {rrRatio && (
                  <span className="text-[11px] text-blue-400">
                    Ratio: <span className="font-bold text-white bg-blue-600/10 border border-blue-500/20 px-2 py-0.5 rounded-sm">{rrRatio}:1 R:R</span>
                  </span>
                )}
              </div>

              {/* Progress Bar representational bracket */}
              <div className="relative pt-1 font-mono">
                <div className="h-2.5 w-full bg-geo-panel border border-geo-border rounded-none overflow-hidden flex">
                  {/* Left (Stop Loss segment) */}
                  <div className="w-1/2 h-full bg-rose-500/10 border-r border-geo-border" />
                  {/* Right (Take Profit segment) */}
                  <div className="w-1/2 h-full bg-emerald-500/10" />
                </div>

                <div className="flex justify-between text-[10px] mt-2.5">
                  <div className="text-left">
                    <span className="block text-[8px] text-slate-500 uppercase font-bold">Stop Loss SL</span>
                    <span className="font-bold text-rose-455 text-rose-450">{formatUSD(trade.stopLoss)}</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[8px] text-slate-500 uppercase font-bold">Entry Point</span>
                    <span className="font-bold text-slate-300">{formatUSD(trade.entryPrice)}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[8px] text-slate-500 uppercase font-bold">Take Profit TP</span>
                    <span className="font-bold text-emerald-450 text-emerald-400">{formatUSD(trade.targetPrice)}</span>
                  </div>
                </div>

                {trade.riskAmount && (
                  <div className="pt-2 border-t border-geo-border flex items-center justify-between text-[10px] mt-2.5">
                    <span className="text-slate-500">Capital At Risk Down On Stop:</span>
                    <span className="font-bold text-rose-450 font-mono">{formatUSD(trade.riskAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Setup Strategy identifier block */}
          {trade.setup && (
            <div className="flex items-center gap-2 bg-geo-bg px-4 py-2.5 rounded-sm border border-geo-border font-mono text-xs" id="detail-setup-strip pb-1">
              <Tag size={13} className="text-blue-500" />
              <span className="text-[10px] font-bold text-slate-500 uppercase">Strategic setup:</span>
              <span className="text-[11px] text-blue-400 font-bold bg-geo-panel px-2.5 py-0.5 rounded-sm border border-geo-border ml-1">
                {trade.setup}
              </span>
            </div>
          )}

          {/* Attached screenshot proof container */}
          {(() => {
            const listPics = trade.screenshots && trade.screenshots.length > 0
              ? trade.screenshots
              : (trade.screenshot ? [trade.screenshot] : []);

            if (listPics.length === 0) return null;

            const resolvedIndex = Math.min(activeImgIndex, listPics.length - 1);

            return (
              <div className="space-y-2.5" id="detail-screenshot-viewer">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block font-mono">
                    Chart Screenshot Proofs ({listPics.length})
                  </label>
                  {listPics.length > 1 && (
                    <span className="text-[9px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded-sm">
                      Image {resolvedIndex + 1} of {listPics.length}
                    </span>
                  )}
                </div>

                <div className="border border-geo-border bg-geo-bg rounded-sm overflow-hidden p-2 flex flex-col items-center">
                  <img
                    src={listPics[resolvedIndex]}
                    alt={`Executed chart proof magnification ${resolvedIndex + 1}`}
                    className="w-full max-h-[320px] object-contain transition-all duration-200"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Grid of clickable thumbnail selectors if there are multiple pictures */}
                {listPics.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 pt-1" id="detail-screenshots-selector-grid">
                    {listPics.map((picUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImgIndex(idx)}
                        className={`relative w-12 h-10 rounded-sm overflow-hidden border transition-all ${
                          idx === resolvedIndex
                            ? 'border-blue-500 ring-1 ring-blue-500/50 opacity-100 scale-105'
                            : 'border-geo-border opacity-60 hover:opacity-100 hover:scale-102'
                        }`}
                      >
                        <img
                          src={picUrl}
                          className="w-full h-full object-cover"
                          alt={`Thumbnail ${idx + 1}`}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/35">
                          <span className="text-[8px] font-mono font-bold text-white">#{idx + 1}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Multi-line Notes observations */}
          {trade.notes && (
            <div className="bg-geo-bg p-5 rounded-sm border border-geo-border space-y-2 font-mono" id="detail-notes-card">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <BookOpen size={13} className="text-blue-400" /> Takeaways &amp; Execution Notes
              </span>
              <p className="text-[11px] text-slate-350 leading-relaxed whitespace-pre-wrap pl-1 italic">
                &ldquo;{trade.notes}&rdquo;
              </p>
            </div>
          )}

          {/* Logger Timestamps */}
          <div className="grid grid-cols-2 gap-4 border-t border-geo-border pt-4 text-[10px] font-mono text-slate-550" id="detail-dates-footer">
            <div className="flex items-center gap-1.5">
              <Calendar size={11} />
              <span>ENTRY: {new Date(trade.entryDate).toLocaleString()}</span>
            </div>
            {trade.exitDate && (
              <div className="flex items-center gap-1.5 justify-end">
                <Calendar size={11} />
                <span>EXIT: {new Date(trade.exitDate).toLocaleString()}</span>
              </div>
            )}
          </div>

        </div>

        {/* Modal edit and close footer */}
        <div className="p-4 border-t border-geo-border bg-geo-header flex items-center justify-between" id="detail-footer-toolbar">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(trade)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold font-mono rounded-sm transition-colors uppercase tracking-wider"
            >
              Edit Parameters
            </button>
            <button
              onClick={() => onDelete(trade.id)}
              className="px-4 py-2 bg-rose-950/20 hover:bg-rose-900/30 text-rose-450 border border-rose-500/20 hover:border-rose-500/30 text-[11px] font-bold font-mono rounded-sm transition-colors uppercase"
            >
              Delete Position
            </button>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-geo-bg hover:bg-geo-header border border-geo-border text-slate-400 hover:text-slate-200 text-[11px] font-bold font-mono rounded-sm transition-colors uppercase"
          >
            Close Viewer
          </button>
        </div>

      </div>
    </div>
  );
}
