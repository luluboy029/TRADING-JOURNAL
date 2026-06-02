/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { Trade, AssetClass, TradeStatus, TradeSide } from '../types';
import {
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Grid,
  List,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  Tag,
  CircleCheck,
  CircleX,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldPlus,
  Scale
} from 'lucide-react';

interface TradeGridProps {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  onSelect: (trade: Trade) => void;
}

const formatUSD = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

export default function TradeGrid({ trades, onEdit, onDelete, onSelect }: TradeGridProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [assetFilter, setAssetFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sideFilter, setSideFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'pnl-desc' | 'pnl-asc' | 'size-desc'>('date-desc');

  // Filter and sort computation
  const processedTrades = useMemo(() => {
    let result = [...trades];

    // Search query match
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          t.setup.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q)
      );
    }

    // Asset filter
    if (assetFilter !== 'all') {
      result = result.filter((t) => t.assetClass === assetFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Side filter
    if (sideFilter !== 'all') {
      result = result.filter((t) => t.side === sideFilter);
    }

    // Advanced sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime();
        case 'date-asc':
          return new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
        case 'pnl-desc':
          return ((b.pnl ?? 0) - (b.fees ?? 0)) - ((a.pnl ?? 0) - (a.fees ?? 0));
        case 'pnl-asc':
          return ((a.pnl ?? 0) - (a.fees ?? 0)) - ((b.pnl ?? 0) - (b.fees ?? 0));
        case 'size-desc':
          return b.quantity - a.quantity;
        default:
          return 0;
      }
    });

    return result;
  }, [trades, search, assetFilter, statusFilter, sideFilter, sortBy]);

  const formatTradeDate = (isoString: string) => {
    return new Date(isoString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: TradeStatus) => {
    switch (status) {
      case 'win':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            WIN
          </span>
        );
      case 'loss':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm bg-rose-500/10 text-rose-450 text-rose-400 border border-rose-500/20 font-mono">
            LOSS
          </span>
        );
      case 'breakeven':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm bg-slate-800 text-slate-300 border border-geo-border font-mono">
            EVEN
          </span>
        );
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm bg-blue-500/10 text-blue-400 border border-blue-400/20 font-mono">
            ACTIVE
          </span>
        );
    }
  };

  return (
    <div className="space-y-4" id="trade-grid-container">
      {/* Filtering Toolbar */}
      <div className="bg-geo-panel border border-geo-border p-4 rounded-sm flex flex-col xl:flex-row gap-4 justify-between items-stretch text-slate-100" id="filter-toolbar">
        {/* Search input field */}
        <div className="relative flex-1" id="toolbar-search-input">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by asset, setup strategy, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-geo-bg border border-geo-border rounded-sm text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {/* Dropdowns panel group */}
        <div className="grid grid-cols-2 sm:flex flex-wrap gap-2 items-center" id="filter-dropdowns">
          {/* Asset Class Filter */}
          <div className="flex items-center gap-1 bg-geo-bg border border-geo-border rounded-sm px-2.5 h-10">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono hidden sm:inline">Class:</span>
            <select
              value={assetFilter}
              onChange={(e) => setAssetFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none pr-2 py-1 cursor-pointer font-mono font-medium"
            >
              <option value="all">All Asset Classes</option>
              <option value="Crypto">Crypto</option>
              <option value="Forex">Forex</option>
              <option value="Stocks">Stocks</option>
              <option value="Commodities">Commodities</option>
              <option value="Options">Options</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-geo-bg border border-geo-border rounded-sm px-2.5 h-10">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none pr-2 py-1 cursor-pointer font-mono font-medium"
            >
              <option value="all">All Outcomes</option>
              <option value="open">Active Open</option>
              <option value="win">Profitable Wins</option>
              <option value="loss">Losing Hits</option>
              <option value="breakeven">Breakeven</option>
            </select>
          </div>

          {/* Side Filter */}
          <div className="flex items-center gap-1 bg-geo-bg border border-geo-border rounded-sm px-2.5 h-10">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono hidden sm:inline font-medium">Side:</span>
            <select
              value={sideFilter}
              onChange={(e) => setSideFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none pr-2 py-1 cursor-pointer font-mono font-medium"
            >
              <option value="all">Long &amp; Short</option>
              <option value="long">Long (Buy)</option>
              <option value="short">Short (Sell)</option>
            </select>
          </div>

          {/* Sorter Selector */}
          <div className="flex items-center gap-1 bg-geo-bg border border-geo-border rounded-sm px-2.5 h-10 col-span-2">
            <ArrowUpDown size={12} className="text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none pr-2 py-1 cursor-pointer font-mono font-medium"
            >
              <option value="date-desc">Newest Entry First</option>
              <option value="date-asc">Oldest Entry First</option>
              <option value="pnl-desc">Yield: Descending</option>
              <option value="pnl-asc">Yield: Ascending</option>
              <option value="size-desc">Largest Quantity</option>
            </select>
          </div>

          {/* Grid/Table switch layout */}
          <div className="flex items-center bg-geo-bg border border-geo-border p-1 rounded-sm h-10 col-span-2 sm:col-span-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-sm transition-colors ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Grid Layout"
            >
              <Grid size={13} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-sm transition-colors ${
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Table Layout"
            >
              <List size={13} />
            </button>
          </div>
        </div>
      </div>

      {processedTrades.length === 0 ? (
        <div className="bg-geo-panel border border-geo-border p-12 text-center rounded-sm flex flex-col items-center justify-center text-slate-400" id="empty-results-fallback">
          <Filter size={28} className="text-slate-600 mb-3" />
          <h3 className="font-bold text-slate-200 font-display">No matching journal logs</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs font-mono">Adjust filters or record a new position to continue journaling.</p>
        </div>
      ) : viewMode === 'grid' ? (
        // Trade Position Cards Layout Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="cards-grid-render">
          {processedTrades.map((t) => {
            const netTradePnL = (t.pnl ?? 0) - (t.fees ?? 0);

            return (
              <div
                key={t.id}
                className="group relative bg-geo-panel border border-geo-border hover:border-blue-500/50 rounded-sm overflow-hidden transition-all flex flex-col justify-between"
                id={`trade-card-${t.id}`}
              >
                {/* Visual side marker band */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${t.side === 'long' ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                {/* Card Title Header */}
                <div className="p-4 pt-5 pb-3 border-b border-geo-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">{t.assetClass}</span>
                    <span className="flex items-center gap-1">{getStatusBadge(t.status)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-200 uppercase tracking-tight flex items-center gap-2 font-display">
                        {t.symbol}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase font-mono ${
                          t.side === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-455 text-rose-400'
                        }`}>
                          {t.side}
                        </span>
                      </h4>
                    </div>
                    {/* Trade Yield */}
                    {t.status !== 'open' ? (
                      <span className={`text-sm font-bold font-mono ${netTradePnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {netTradePnL >= 0 ? '+' : ''}
                        {formatUSD(netTradePnL)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-blue-400 font-mono tracking-wider font-bold">OPENING</span>
                    )}
                  </div>
                </div>

                {/* Thumbnail Screenshot if available */}
                {t.screenshot && (
                  <div className="w-full h-32 overflow-hidden bg-geo-bg relative group-hover:opacity-90 transition cursor-pointer" onClick={() => onSelect(t)}>
                    <img src={t.screenshot} alt="Visual trade screenshot attachment" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    {t.screenshots && t.screenshots.length > 1 && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/75 rounded-[2px] text-[8px] font-mono font-bold text-slate-300 border border-slate-500/20 shadow-md">
                        {t.screenshots.length} IMAGES
                      </div>
                    )}
                    <div className="absolute inset-0 bg-geo-bg/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="px-2.5 py-1.5 bg-geo-header text-blue-400 text-[10px] font-mono font-bold rounded-sm border border-geo-border flex items-center gap-1.5">
                        <Eye size={12} /> Inspect Graphs
                      </span>
                    </div>
                  </div>
                )}

                {/* Specific parameter stats list */}
                <div className="p-4 py-3 flex-1 space-y-2 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-2 text-slate-400">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Entry</span>
                      <span className="text-slate-200 mt-0.5 block">{formatUSD(t.entryPrice)}</span>
                    </div>
                    {t.exitPrice && (
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase block">Exit</span>
                        <span className="text-slate-200 mt-0.5 block">{formatUSD(t.exitPrice)}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block">Quantity</span>
                      <span className="text-slate-300 mt-0.5 block">{t.quantity}</span>
                    </div>
                    <div className="truncate">
                      <span className="text-[9px] text-slate-500 uppercase block">Timestamp</span>
                      <span className="text-slate-300 text-[10px] block truncate">{formatTradeDate(t.entryDate).split(',')[0]}</span>
                    </div>
                  </div>

                  {/* Setup strategic tags */}
                  {t.setup && (
                    <div className="flex items-center gap-1.5 bg-geo-bg border border-geo-border px-2 py-1.5 rounded-sm text-[11px] text-slate-300 truncate" title={t.setup}>
                      <Tag size={11} className="text-slate-500 flex-shrink-0" />
                      <span className="truncate font-bold tracking-tight text-slate-300">{t.setup}</span>
                    </div>
                  )}

                  {/* Highlight text snippet from notes */}
                  {t.notes && (
                    <p className="text-[11px] text-slate-500 italic line-clamp-2 mt-2 leading-relaxed">
                      &ldquo;{t.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Card item Action Footers bar wrapper */}
                <div className="p-3 bg-geo-header border-t border-geo-border flex items-center justify-between mt-auto">
                  <button
                    onClick={() => onSelect(t)}
                    className="text-[10px] font-bold font-mono text-blue-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    Details <ChevronRight size={11} />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(t)}
                      className="p-1.5 bg-geo-bg border border-geo-border text-slate-400 hover:text-slate-200 hover:border-blue-500/50 rounded-sm transition-colors"
                      title="Edit journal record"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      onClick={() => onDelete(t.id)}
                      className="p-1.5 bg-geo-bg border border-geo-border hover:border-red-500/30 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-sm transition-colors"
                      title="Delete trade"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Spreadsheet Density Tabular View (Responsive overflow handling)
        <div className="bg-geo-panel border border-geo-border rounded-sm overflow-hidden" id="table-view-render">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead>
                <tr className="bg-geo-header text-slate-400 border-b border-geo-border uppercase text-[9px] font-bold tracking-widest font-mono">
                  <th className="py-3 px-4">Side/Asset</th>
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-4">Date Added</th>
                  <th className="py-3 px-4">Entry</th>
                  <th className="py-3 px-4">Exit</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4 text-right">Net Yield</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-geo-border text-slate-300 font-mono">
                {processedTrades.map((t) => {
                  const netPnL = (t.pnl ?? 0) - (t.fees ?? 0);
                  return (
                    <tr key={t.id} className="hover:bg-geo-header/40 transition-colors">
                      {/* Execution Side */}
                      <td className="py-3 px-4 font-semibold">
                        <span className={`inline-flex px-1.5 py-0.5 rounded-sm uppercase text-[9px] font-bold ${
                          t.side === 'long' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {t.side}
                        </span>
                        <span className="text-slate-500 text-[9px] block mt-1 uppercase tracking-tight">{t.assetClass}</span>
                      </td>

                      {/* Symbol */}
                      <td className="py-3 px-4 font-bold text-slate-100 uppercase tracking-tight text-xs font-display">
                        {t.symbol}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {formatTradeDate(t.entryDate).split(',')[0]}
                      </td>

                      {/* Entry Price */}
                      <td className="py-3 px-4 text-slate-200">
                        {formatUSD(t.entryPrice)}
                      </td>

                      {/* Exit Price */}
                      <td className="py-3 px-4 text-slate-200">
                        {t.exitPrice ? formatUSD(t.exitPrice) : <span className="text-slate-600">-</span>}
                      </td>

                      {/* Size */}
                      <td className="py-3 px-4 text-slate-300">
                        {t.quantity}
                      </td>

                      {/* Outcome */}
                      <td className="py-3 px-4">
                        {getStatusBadge(t.status)}
                      </td>

                      {/* Realized Net Yield */}
                      <td className="py-3 px-4 text-right font-bold">
                        {t.status === 'open' ? (
                          <span className="text-blue-400 text-[9px] uppercase font-bold tracking-wider">Active</span>
                        ) : (
                          <span className={netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {netPnL >= 0 ? '+' : ''}
                            {formatUSD(netPnL)}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelect(t)}
                            className="p-1.5 hover:bg-geo-bg hover:text-blue-400 text-slate-400 rounded-sm transition-colors border border-transparent hover:border-geo-border"
                            title="Review trade details"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => onEdit(t)}
                            className="p-1.5 hover:bg-geo-bg hover:text-slate-100 text-slate-400 rounded-sm transition-colors border border-transparent hover:border-geo-border"
                            title="Edit"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => onDelete(t.id)}
                            className="p-1.5 hover:bg-geo-bg hover:text-rose-400 text-slate-400 rounded-sm transition-colors border border-transparent hover:border-geo-border"
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
