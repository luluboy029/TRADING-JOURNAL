/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { TradeEntry } from '../types';
import { EMOTIONS_METADATA } from '../lib/emotions';
import {
  X,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Briefcase,
  ExternalLink,
  Edit2,
  Trash2,
  Eye,
  Percent,
  FileText
} from 'lucide-react';

interface TradeDetailModalProps {
  entry: TradeEntry | null;
  onClose: () => void;
  onEdit: (entry: TradeEntry) => void;
  onDelete: (entry: TradeEntry) => void;
}

const formatUSD = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

export default function TradeDetailModal({ entry, onClose, onEdit, onDelete }: TradeDetailModalProps) {
  if (!entry) return null;

  const netPnl = (entry.pnl || 0) - (entry.fees || 0);
  const isGain = entry.status === 'win';
  const isLoss = entry.status === 'loss';
  const isBE = entry.status === 'breakeven';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none" id="trade-details-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        className="w-full max-w-2xl bg-geo-bg border border-geo-border rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        id="trade-detail-container"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-geo-border bg-geo-header flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-left">
            <Briefcase className="text-blue-400" size={16} />
            <div>
              <span className="text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase block">Trade Position Vault</span>
              <h3 className="text-xs font-bold font-mono tracking-wider text-slate-205 text-slate-200 mt-0.5 uppercase">
                {entry.symbol} Position Specifications
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 px-1.5 border border-geo-border hover:border-slate-600 bg-geo-bg rounded-sm text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
            id="close-trade-modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-left text-slate-300 text-xs">
          
          {/* Row A: Headline and Category Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-blue-400 flex items-center gap-1">
              <Calendar size={13} />
              {new Date(entry.entryDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>

            <span className={`px-2 py-0.5 border text-[9px] font-mono font-bold tracking-wider uppercase rounded-sm flex items-center gap-1 ${
              entry.side === 'long' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {entry.side === 'long' ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
              {entry.side}
            </span>

            <span className="bg-slate-950/60 border border-slate-900 px-2.5 py-0.5 text-[9px] font-mono font-semibold uppercase text-slate-400 rounded-sm">
              {entry.assetClass}
            </span>

            <span className={`px-2 py-0.5 border text-[9px] font-mono font-bold tracking-wider uppercase rounded-sm ${
              isGain ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
              isLoss ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
              isBE ? 'bg-slate-500/15 text-slate-450 border-slate-500/30' : 
              'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
              {entry.status}
            </span>

            {entry.emotion && EMOTIONS_METADATA[entry.emotion] && (() => {
              const emo = EMOTIONS_METADATA[entry.emotion];
              return (
                <span className={`px-2 py-0.5 border text-[9px] font-mono font-bold tracking-wider uppercase rounded-sm flex items-center gap-1 ${emo.bgClass} ${emo.textClass} ${emo.borderClass}`}>
                  <span>{emo.emoji}</span>
                  <span>{emo.label}</span>
                </span>
              );
            })()}
          </div>

          {/* Row B: Symbol Header details */}
          <div>
            <h2 className="text-sm font-bold text-slate-100 tracking-tight flex items-center gap-2">
              Position: <span className="text-blue-400">{entry.symbol}</span>
              <span className="text-xs text-slate-550 font-normal font-mono">&bull; Setup Playbook: &ldquo;{entry.setup}&rdquo;</span>
            </h2>
          </div>

          {/* Row C: Main Financial metrics metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-y border-geo-border py-4 font-mono">
            <div>
              <span className="text-[9px] text-slate-500 uppercase block">Entry Price</span>
              <span className="text-xs font-bold text-slate-205 text-slate-100 block mt-0.5">
                {formatUSD(entry.entryPrice)}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase block">Exit Price</span>
              <span className="text-xs font-bold text-slate-205 text-slate-100 block mt-0.5">
                {entry.exitPrice ? formatUSD(entry.exitPrice) : 'Position Open'}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase block">Quantity</span>
              <span className="text-xs font-bold text-slate-205 text-slate-100 block mt-0.5">
                {entry.quantity}
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase block">Brokerage Fees</span>
              <span className="text-xs font-bold text-rose-455 text-rose-400 block mt-0.5">
                {formatUSD(entry.fees)}
              </span>
            </div>
          </div>

          {/* Row D: Secondary Metrics & R:R details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/30 p-3 border border-geo-border rounded-none relative">
              <span className="text-[9px] text-slate-500 font-mono uppercase block">Stop Loss Level</span>
              <span className="text-[11px] font-mono font-bold text-rose-400 block mt-1">
                {entry.stopLoss ? formatUSD(entry.stopLoss) : 'Not defined'}
              </span>
            </div>

            <div className="bg-slate-950/30 p-3 border border-geo-border rounded-none relative">
              <span className="text-[9px] text-slate-500 font-mono uppercase block">Target Goal Level</span>
              <span className="text-[11px] font-mono font-bold text-emerald-400 block mt-1">
                {entry.targetPrice ? formatUSD(entry.targetPrice) : 'Not defined'}
              </span>
            </div>

            <div className="bg-slate-950/30 p-3 border border-geo-border rounded-none relative">
              <span className="text-[9px] text-slate-500 font-mono uppercase block">Conviction / Risk-Amount</span>
              <span className="text-[11px] font-mono font-bold text-blue-400 block mt-1 animate-pulse">
                {entry.riskAmount ? formatUSD(entry.riskAmount) : 'Not assigned'}
              </span>
            </div>
          </div>

          {/* Row E: Net Realized Profit panel */}
          <div className={`p-4 border rounded-none relative text-left flex justify-between items-center ${
            netPnl >= 0 ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-rose-500/5 border-rose-500/15'
          }`}>
            <div className="font-mono">
              <span className="text-[9px] text-slate-500 uppercase block">Net Position Return (P&amp;L After Fees)</span>
              <span className={`text-[15px] font-bold block mt-0.5 ${netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {netPnl >= 0 ? '+' : ''}
                {formatUSD(netPnl)}
              </span>
            </div>
            
            <div className="font-mono text-right">
              <span className="text-[9px] text-slate-500 uppercase block">Gross Position Return</span>
              <span className="text-[11px] text-slate-300 block mt-0.5">
                {formatUSD(entry.pnl || 0)}
              </span>
            </div>
          </div>

          {/* Psychological Audit Feedback card */}
          {entry.emotion && EMOTIONS_METADATA[entry.emotion] && (() => {
            const emo = EMOTIONS_METADATA[entry.emotion];
            let analysis = '';
            let analysisColor = 'text-slate-350';
            let analysisBg = 'bg-slate-950/20 border-geo-border/50';

            if (entry.status === 'win') {
              if (['Disciplined', 'Patient'].includes(emo.label)) {
                analysis = 'Pristine Execution: Following playbooks patiently led to a profitable result. This is high-impact trade execution!';
                analysisBg = 'bg-emerald-500/5 border-emerald-500/15';
                analysisColor = 'text-emerald-400';
              } else if (['FOMO', 'Greed', 'Revenge', 'Overconfident'].includes(emo.label)) {
                analysis = 'Lucky Break (Flawed Process): A profitable trade executed with poor emotional hygiene (FOMO, Greed, or Anger) reinforces bad habits. Review setup quality.';
                analysisBg = 'bg-amber-500/5 border-amber-500/15';
                analysisColor = 'text-amber-400';
              } else {
                analysis = 'Profitable outcome with active anxiety. Working on trust in your strategy will reduce stress.';
                analysisBg = 'bg-blue-505/5 border-blue-500/15';
                analysisColor = 'text-blue-400';
              }
            } else if (entry.status === 'loss') {
              if (['Disciplined', 'Patient'].includes(emo.label)) {
                analysis = 'Excellent Process (Good Drawdown): A disciplined trade resulting in a loss is just a normal cost of doing business. Continue taking high-probability setups.';
                analysisBg = 'bg-blue-500/5 border-blue-500/15';
                analysisColor = 'text-slate-300';
              } else if (['FOMO', 'Greed', 'Revenge', 'Overconfident'].includes(emo.label)) {
                analysis = 'Self-Sabotage Warning: This loss was heavily amplified or caused by emotional trading. Pause execution, restore psychological balance, and review your playbook.';
                analysisBg = 'bg-rose-500/5 border-rose-500/15';
                analysisColor = 'text-rose-455 text-rose-400';
              } else {
                analysis = 'Stressed Loss: Anxiety or fear influenced exit timing. Focus on pre-defining exits and leaving trades alone to hit stops or targets.';
                analysisBg = 'bg-slate-950/40 border-geo-border/50';
                analysisColor = 'text-slate-400';
              }
            } else if (entry.status === 'open') {
              analysis = `Active Hold: Retaining a ${emo.label.toLowerCase()} mindset. Monitor price action objectively according to plan.`;
              analysisBg = 'bg-slate-950/15 border-geo-border/50';
              analysisColor = 'text-slate-300';
            } else {
              analysis = 'Trade resolved at breakeven. Controlled risk exposure.';
              analysisBg = 'bg-slate-950/20 border-geo-border/50';
            }

            return (
              <div className={`p-4 border font-mono rounded-none ${analysisBg}`} id="psychological-audit-box">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base select-none">{emo.emoji}</span>
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-200">Psychology Audit feedback</span>
                  <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 border rounded-sm ml-auto ${emo.bgClass} ${emo.textClass} ${emo.borderClass}`}>
                    {emo.label} State
                  </span>
                </div>
                <p className={`text-[10.5px] leading-relaxed font-light ${analysisColor}`}>
                  {analysis}
                </p>
              </div>
            );
          })()}

          {/* Row F: Technical Reflections and Playbook Analysis details */}
          <div className="space-y-1.5 text-left">
            <span className="text-[9px] font-mono tracking-widest text-slate-450 text-slate-400 uppercase font-bold flex items-center gap-1">
              <FileText size={11} /> Strategy conviction notes
            </span>
            <div className="p-4 bg-geo-panel border border-geo-border font-mono text-[11px] leading-relaxed text-slate-200 select-all whitespace-pre-wrap break-words min-h-[100px] font-light shadow-inner">
              {entry.notes || 'No reflections logged for this position.'}
            </div>
          </div>

          {/* Row G: Uploaded Position Screenshots */}
          {(entry.screenshot || (entry.screenshots && entry.screenshots.length > 0)) && (
            <div className="space-y-2 text-left">
              <span className="text-[9px] font-mono tracking-widest text-slate-400 uppercase font-bold flex items-center gap-1">
                <Eye size={11} className="text-blue-400" /> Position Screenshots Proofs ({entry.screenshots ? entry.screenshots.length : 1})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {entry.screenshot && (
                  <div className="border border-geo-border overflow-hidden bg-slate-950/80 p-1 rounded-sm flex flex-col justify-between">
                    <img
                      src={entry.screenshot}
                      alt="Primary position blueprint screenshot"
                      className="w-full h-auto max-h-[180px] object-cover hover:scale-[1.02] transition-transform duration-200"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <a
                      href={entry.screenshot}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[8px] font-mono text-blue-400 hover:underline flex items-center gap-1.5 justify-center mt-2"
                    >
                      <span>Open image in new Tab</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}
                {entry.screenshots && entry.screenshots.map((s, idx) => {
                  if (s === entry.screenshot) return null; // Avoid duplicating primary screenshot
                  return (
                    <div key={idx} className="border border-geo-border overflow-hidden bg-slate-950/80 p-1 rounded-sm flex flex-col justify-between">
                      <img
                        src={s}
                        alt={`Supporting screenshot #${idx + 1}`}
                        className="w-full h-auto max-h-[180px] object-cover hover:scale-[1.02] transition-transform duration-200"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <a
                        href={s}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[8px] font-mono text-blue-400 hover:underline flex items-center gap-1.5 justify-center mt-2"
                      >
                        <span>Open image #{idx + 1} in new Tab</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Action trigger controls */}
        <div className="p-4 border-t border-geo-border bg-slate-950/50 flex flex-col sm:flex-row justify-between gap-3 font-mono">
          <div className="flex gap-2">
            <button
              onClick={() => {
                onEdit(entry);
                onClose();
              }}
              className="h-9 bg-slate-900 border border-slate-700 hover:border-slate-550 text-slate-300 hover:text-white px-4 flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold cursor-pointer rounded-sm transition-all"
            >
              <Edit2 size={11} className="text-slate-400" />
              Edit chronicle
            </button>
            <button
              onClick={() => {
                onDelete(entry);
                onClose();
              }}
              className="h-9 bg-transparent border border-rose-500/20 hover:border-rose-500/40 text-rose-455 text-rose-450 text-rose-400 px-4 flex items-center justify-center gap-1.5 text-[10px] uppercase font-bold cursor-pointer rounded-sm transition-all hover:bg-rose-500/5"
            >
              <Trash2 size={11} />
              Delete log
            </button>
          </div>

          <button
            onClick={onClose}
            className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 text-[10.5px] uppercase rounded-sm cursor-pointer transition-colors self-end sm:self-auto"
          >
            Close Position
          </button>
        </div>

      </motion.div>
    </div>
  );
}
