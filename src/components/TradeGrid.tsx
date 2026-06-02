/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { TradeEntry, AssetClassType, SideType, StatusType, EmotionType } from '../types';
import { EMOTIONS_METADATA } from '../lib/emotions';
import DatePicker from './DatePicker';
import {
  Search,
  Calendar,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Award,
  Layers,
  Percent,
  Bookmark,
  Compass
} from 'lucide-react';

interface TradeGridProps {
  entries: TradeEntry[];
  onSelect: (entry: TradeEntry) => void;
  onEdit: (entry: TradeEntry) => void;
  onDelete: (entry: TradeEntry) => void;
}

const formatUSD = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

export default function TradeGrid({ entries, onSelect, onEdit, onDelete }: TradeGridProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assetFilter, setAssetFilter] = useState<string>('all');
  const [sideFilter, setSideFilter] = useState<string>('all');
  const [setupFilter, setSetupFilter] = useState<string>('all');
  const [emotionFilter, setEmotionFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date-desc'); // date-desc, date-asc, pnl-desc, pnl-asc
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  // Derive unique playbook setups for filter dropdown
  const uniqueSetups = useMemo(() => {
    const list = new Set<string>();
    entries.forEach((e) => {
      if (e.setup) list.add(e.setup);
    });
    return Array.from(list).sort();
  }, [entries]);

  // Apply filters and sort
  const filteredAndSorted = useMemo(() => {
    return [...entries]
      .filter((e) => {
        const query = search.toLowerCase().trim();
        const matchesSearch =
          !query ||
          e.symbol.toLowerCase().includes(query) ||
          e.setup.toLowerCase().includes(query) ||
          e.notes.toLowerCase().includes(query) ||
          e.assetClass.toLowerCase().includes(query);

        const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
        const matchesAsset = assetFilter === 'all' || e.assetClass === assetFilter;
        const matchesSide = sideFilter === 'all' || e.side === sideFilter;
        const matchesSetup = setupFilter === 'all' || e.setup === setupFilter;
        const matchesEmotion = emotionFilter === 'all' || e.emotion === emotionFilter;
        const matchesStartDate = !startDateFilter || e.entryDate >= startDateFilter;
        const matchesEndDate = !endDateFilter || e.entryDate <= endDateFilter;

        return matchesSearch && matchesStatus && matchesAsset && matchesSide && matchesSetup && matchesEmotion && matchesStartDate && matchesEndDate;
      })
      .sort((a, b) => {
        const aNet = (a.pnl || 0) - (a.fees || 0);
        const bNet = (b.pnl || 0) - (b.fees || 0);

        if (sortBy === 'date-desc') {
          return new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime();
        } else if (sortBy === 'date-asc') {
          return new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
        } else if (sortBy === 'pnl-desc') {
          return bNet - aNet;
        } else if (sortBy === 'pnl-asc') {
          return aNet - bNet;
        }
        return 0;
      });
  }, [entries, search, statusFilter, assetFilter, sideFilter, setupFilter, emotionFilter, startDateFilter, endDateFilter, sortBy]);

  return (
    <div className="space-y-4" id="trading-positions-hub">
      {/* Search & Refining suite */}
      <div className="bg-geo-panel border border-geo-border p-4 rounded-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative h-9 bg-geo-bg border border-geo-border flex items-center px-3 focus-within:border-blue-500/50">
            <Search size={14} className="text-slate-500 mr-2 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Symbol, playbook strategy setup, notes reflections..."
              className="bg-transparent text-slate-200 w-full outline-none font-mono text-[11px]"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className="h-9 px-4 border border-geo-border hover:border-slate-650 hover:border-slate-600 bg-geo-bg text-slate-400 hover:text-slate-200 text-[10px] font-mono uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
          >
            <SlidersHorizontal size={12} />
            <span>Refine Criteria</span>
            {isFilterExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>

        {/* Expandable detailed Filters */}
        {isFilterExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 border-t border-geo-border pt-3.5 text-left text-[10.5px] font-mono animate-fade-in">
            <div>
              <label className="block text-slate-550 text-slate-500 mb-1 uppercase text-[8.5px] tracking-wider">Asset Class</label>
              <select
                value={assetFilter}
                onChange={(e) => setAssetFilter(e.target.value)}
                className="w-full h-8 bg-geo-bg border border-geo-border px-2 text-slate-300 text-[10px] outline-none"
              >
                <option value="all">All Sectors</option>
                <option value="Crypto">Crypto</option>
                <option value="Forex">Forex</option>
                <option value="Stocks">Stocks</option>
                <option value="Commodities">Commodities</option>
                <option value="Options">Options</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-550 text-slate-500 mb-1 uppercase text-[8.5px] tracking-wider">Direction</label>
              <select
                value={sideFilter}
                onChange={(e) => setSideFilter(e.target.value)}
                className="w-full h-8 bg-geo-bg border border-geo-border px-2 text-slate-300 text-[10px] outline-none"
              >
                <option value="all">All Biases</option>
                <option value="long">Long Trades</option>
                <option value="short">Short Trades</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-550 text-slate-500 mb-1 uppercase text-[8.5px] tracking-wider">Position Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-8 bg-geo-bg border border-geo-border px-2 text-slate-300 text-[10px] outline-none"
              >
                <option value="all">All Outcomes</option>
                <option value="open">Active Open</option>
                <option value="win">Win ✅</option>
                <option value="loss">Loss ❌</option>
                <option value="breakeven">Breakeven 🤝</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-550 text-slate-500 mb-1 uppercase text-[8.5px] tracking-wider">Psychology</label>
              <select
                value={emotionFilter}
                onChange={(e) => setEmotionFilter(e.target.value)}
                className="w-full h-8 bg-geo-bg border border-geo-border px-2 text-slate-300 text-[10px] outline-none"
              >
                <option value="all">All Mindsets</option>
                <option value="Disciplined">🧘 Disciplined</option>
                <option value="Patient">⏳ Patient</option>
                <option value="FOMO">🏃‍♂️ FOMO</option>
                <option value="Greed">🤑 Greed</option>
                <option value="Fear">😨 Fear</option>
                <option value="Anxious">😰 Anxious</option>
                <option value="Revenge">😡 Revenge</option>
                <option value="Overconfident">🏆 Overconfident</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-550 text-slate-500 mb-1 uppercase text-[8.5px] tracking-wider">Playbook Setup</label>
              <select
                value={setupFilter}
                onChange={(e) => setSetupFilter(e.target.value)}
                className="w-full h-8 bg-geo-bg border border-geo-border px-2 text-slate-300 text-[10px] outline-none"
              >
                <option value="all">All Playbooks</option>
                {uniqueSetups.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-550 text-slate-500 mb-1 uppercase text-[8.5px] tracking-wider">From Date</label>
              <DatePicker
                value={startDateFilter}
                onChange={setStartDateFilter}
                placeholder="Start Date"
                className="w-full h-8"
              />
            </div>

            <div>
              <label className="block text-slate-550 text-slate-500 mb-1 uppercase text-[8.5px] tracking-wider">To Date</label>
              <DatePicker
                value={endDateFilter}
                onChange={setEndDateFilter}
                placeholder="End Date"
                className="w-full h-8"
              />
            </div>

            <div>
              <label className="block text-slate-550 text-slate-500 mb-1 uppercase text-[8.5px] tracking-wider">Sort Ledger</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full h-8 bg-geo-bg border border-geo-border px-2 text-slate-300 text-[10px] outline-none font-bold"
              >
                <option value="date-desc">Chronological (New)</option>
                <option value="date-asc">Chronological (Old)</option>
                <option value="pnl-desc">Yield Pnl (Excessive)</option>
                <option value="pnl-asc">Yield Pnl (Drawdowns)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Trade Grid Container */}
      <div className="space-y-3" id="positions-timeline-list">
        {filteredAndSorted.length === 0 ? (
          <div className="text-center py-12 border border-geo-border bg-geo-panel/40 p-6 rounded-sm">
            <span className="text-slate-550 text-slate-400 font-mono text-xs">No strategy coordinates located in matching queries</span>
            <p className="text-[10px] text-slate-550 text-slate-500 font-mono mt-1">Refine metrics configuration parameters or deploy a fresh position log</p>
          </div>
        ) : (
          filteredAndSorted.map((e) => {
            const netVal = (e.pnl || 0) - (e.fees || 0);
            const isGain = e.status === 'win';
            const isLoss = e.status === 'loss';
            const isOpen = e.status === 'open';

            return (
              <div
                key={e.id}
                className="group bg-geo-panel border border-geo-border hover:border-slate-700 p-4 rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all relative overflow-hidden text-left"
              >
                {/* Horizontal side indicator based on profit return status */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300 ${
                    isOpen ? 'bg-blue-500/50' : 
                    isGain ? 'bg-emerald-500/60' :
                    isLoss ? 'bg-rose-500/60' :
                    'bg-slate-550'
                  }`}
                />

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Row A: Chronology date, biased Side direction, and Asset category */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[10px] font-mono font-bold text-blue-400 flex items-center gap-1 shrink-0">
                      <Calendar size={13} className="text-blue-500/80" />
                      {new Date(e.entryDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>

                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[9px] font-mono font-bold tracking-wider uppercase rounded-sm ${
                      e.side === 'long' ? 'bg-emerald-500/5 text-emerald-450 text-emerald-400 border-emerald-500/15' : 'bg-rose-500/5 text-rose-455 text-rose-400 border-rose-500/15'
                    }`}>
                      {e.side === 'long' ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                      {e.side}
                    </span>

                    <span className="text-[9px] font-mono text-slate-400 bg-slate-950/65 px-2 py-0.5 border border-slate-900 rounded-sm">
                      {e.assetClass}
                    </span>
                    
                    <span className="text-[9px] font-mono text-slate-450 text-slate-400 bg-slate-950/30 px-2 py-0.5 border border-slate-900 rounded-sm">
                      Setup: {e.setup}
                    </span>

                    {e.emotion && EMOTIONS_METADATA[e.emotion] && (() => {
                      const emo = EMOTIONS_METADATA[e.emotion];
                      return (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 border text-[9px] font-mono font-bold tracking-wider uppercase rounded-sm ${emo.bgClass} ${emo.textClass} ${emo.borderClass}`}>
                          <span>{emo.emoji}</span>
                          <span>{emo.label}</span>
                        </span>
                      );
                    })()}
                  </div>

                  {/* Row B: Symbol major heading */}
                  <h4 className="text-xs font-bold text-slate-200 tracking-tight leading-snug hover:text-blue-400 cursor-pointer pr-4" onClick={() => onSelect(e)}>
                    Position &bull; <span className="text-slate-100 font-mono text-[13px]">{e.symbol}</span>
                  </h4>

                  {/* Row C: Target price or status details */}
                  {e.notes && (
                    <p className="hidden sm:block text-[10px] text-slate-400 font-mono truncate max-w-lg">
                      {e.notes}
                    </p>
                  )}
                </div>

                {/* Right Area: Yield Statistics & Actions triggers */}
                <div className="flex md:flex-col items-end justify-between md:justify-center w-full md:w-auto border-t md:border-t-0 border-geo-border/50 pt-2.5 md:pt-0 shrink-0 gap-3 font-mono">
                  <div className="text-left md:text-right">
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-bold">Yield return</span>
                    <span className={`text-[13px] font-bold block ${
                      isOpen ? 'text-blue-450 text-blue-400 animate-pulse' : 
                      netVal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {isOpen ? 'Active Open' : `${netVal >= 0 ? '+' : ''}${formatUSD(netVal)}`}
                    </span>
                    <span className="text-[8px] text-slate-550 text-slate-500 block">
                      Qty size: {e.quantity} &bull; Entry: {formatUSD(e.entryPrice)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelect(e)}
                      className="px-2.5 h-7 text-[9.5px] font-bold text-slate-350 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-sm cursor-pointer hover:bg-slate-900/60 flex items-center gap-1"
                      title="Inspect technical specifications"
                    >
                      Read
                    </button>
                    <button
                      onClick={() => onEdit(e)}
                      className="p-1 px-1.5 text-slate-400 hover:text-blue-400 border border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-sm cursor-pointer hover:bg-slate-900/60 transition-all h-7 flex items-center"
                      title="Modify specifications"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      onClick={() => onDelete(e)}
                      className="p-1 px-1.5 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-slate-700 bg-slate-950/40 rounded-sm cursor-pointer hover:bg-slate-900/60 transition-all h-7 flex items-center"
                      title="Erase chronicle"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
