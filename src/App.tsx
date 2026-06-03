/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TradeEntry } from './types';
import StatsDashboard from './components/StatsDashboard';
import AnalyticsCharts from './components/AnalyticsCharts';
import TradeForm from './components/TradeForm';
import TradeGrid from './components/TradeGrid';
import TradeDetailModal from './components/TradeDetailModal';
import {
  TrendingUp,
  TrendingDown,
  BookMarked,
  Plus,
  Clock,
  Sparkles,
  Database,
  AlertCircle,
  CheckSquare
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'trades_desk_db_v2';

const SEED_ENTRIES: TradeEntry[] = [
  {
    id: 'seed-trade-1',
    entryDate: new Date(Date.now() - 0 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    symbol: 'BTCUSDT',
    assetClass: 'Crypto',
    side: 'long',
    entryPrice: 94600.00,
    exitPrice: 98150.00,
    quantity: 0.15,
    pnl: 532.50,
    fees: 12.50,
    status: 'win',
    setup: 'Breakout Accumulation',
    notes: 'Captured a clean breakout of the multi-day horizontal accumulation zone above $94.5K. Momentum was supported by strong institutional volume and short liquidations. Trailed stop efficiently to lock in max premium. Executed flawlessly.',
    riskAmount: 150.00,
    targetPrice: 98500.00,
    stopLoss: 93500.00,
    emotion: 'Disciplined',
    screenshot: 'https://images.unsplash.com/photo-1642104704074-907c0698cbd9?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'seed-trade-2',
    entryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    symbol: 'EURUSD',
    assetClass: 'Forex',
    side: 'short',
    entryPrice: 1.0850,
    exitPrice: 1.0790,
    quantity: 100000,
    pnl: 600.00,
    fees: 15.00,
    status: 'win',
    setup: 'VWAP Mean Reversion',
    notes: 'Identified an overextended rally near the upper daily average envelope. Entered short in batches near the horizontal standard deviation block. Profit target met preceding high-impact economic announcement. Fees were standard.',
    riskAmount: 200.00,
    targetPrice: 1.0780,
    stopLoss: 1.0875,
    emotion: 'Patient'
  },
  {
    id: 'seed-trade-3',
    entryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    symbol: 'AAPL',
    assetClass: 'Stocks',
    side: 'long',
    entryPrice: 224.50,
    exitPrice: 221.20,
    quantity: 60,
    pnl: -198.00,
    fees: 8.00,
    status: 'loss',
    setup: 'Golden Cross Bounce',
    notes: 'Attempted to position long on the golden cross pullback near the moving averages block. Volume was disappointing, prompting an early stop deviation. Discipline was steady; loss was controlled under my portfolio risk tolerance limits.',
    riskAmount: 220.00,
    targetPrice: 232.00,
    stopLoss: 221.00,
    emotion: 'Anxious'
  },
  {
    id: 'seed-trade-4',
    entryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    symbol: 'SOLUSDT',
    assetClass: 'Crypto',
    side: 'long',
    entryPrice: 185.00,
    quantity: 30,
    fees: 4.50,
    status: 'open',
    setup: 'Support Accumulation',
    notes: 'Opened a swing position on lateral horizontal support. Price has entered accumulation near the range bounds. Holding position, stop is initialized safely under support.',
    riskAmount: 100.00,
    targetPrice: 210.00,
    stopLoss: 180.00,
    emotion: 'Patient'
  }
];

export default function App() {
  const [entries, setEntries] = useState<TradeEntry[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TradeEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<TradeEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<TradeEntry | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const ticker = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }));
    }, 1000);

    return () => clearInterval(ticker);
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Load initially from full-stack Express API
  const fetchEntries = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await fetch('/api/logs');
      if (!res.ok) throw new Error('API server returned response error');
      const data = await res.json();
      setEntries(data);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch (e: any) {
      console.warn('Backend connection unavailable, falling back to local storage cache', e);
      setApiError('Connected in Offline Mode');
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          setEntries(JSON.parse(stored));
        } catch {
          setEntries(SEED_ENTRIES);
        }
      } else {
        setEntries(SEED_ENTRIES);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleSaveEntry = async (entryData: Omit<TradeEntry, 'id'> & { id?: string }) => {
    const isEditing = !!entryData.id;
    const targetId = entryData.id;

    try {
      if (isEditing) {
        const res = await fetch(`/api/logs/${targetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryData)
        });
        if (!res.ok) throw new Error('Failed updating log on server');
        const updatedDoc = await res.json();
        const updatedList = entries.map((e) => (e.id === targetId ? updatedDoc : e));
        setEntries(updatedList);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
      } else {
        const res = await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryData)
        });
        if (!res.ok) throw new Error('Failed saving log to server');
        const savedDoc = await res.json();
        const updatedList = [savedDoc, ...entries];
        setEntries(updatedList);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
      }
    } catch (e) {
      console.error('Save API sync failed, falling back to localized container state', e);
      const nextId = targetId || `trade-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const savedEntry: TradeEntry = {
        ...entryData,
        id: nextId
      } as TradeEntry;

      const updatedList = isEditing 
        ? entries.map((e) => (e.id === targetId ? savedEntry : e))
        : [savedEntry, ...entries];

      setEntries(updatedList);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    }

    setIsFormOpen(false);
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/logs/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed deleting log from server');
    } catch (e) {
      console.error('Delete API sync failed, falling back to local delete update', e);
    }

    const updated = entries.filter((e) => e.id !== id);
    setEntries(updated);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

    if (selectedEntry?.id === id) {
      setSelectedEntry(null);
    }
  };

  const handleEditInit = (entry: TradeEntry) => {
    setEditingEntry(entry);
    setIsFormOpen(true);
    setSelectedEntry(null);
  };

  const handleAddInit = () => {
    setEditingEntry(null);
    setIsFormOpen(true);
  };

  const handleClearAllJournal = () => {
    setIsClearingAll(true);
  };

  const executeClearDatabase = async () => {
    try {
      const res = await fetch('/api/logs/reset', {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed clearing database from server');
    } catch (e) {
      console.error('Reset database API error', e);
    }
    setEntries([]);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
    setIsClearingAll(false);
  };

  return (
    <div className="min-h-screen bg-geo-bg text-slate-100 flex flex-col font-sans" id="trading-journal-app">
      
      {/* Navigation Header */}
      <header className="border-b border-geo-border bg-geo-header sticky top-0 backdrop-blur z-40 px-5 h-16 flex items-center justify-between" id="app-nav-header">
        <div className="flex items-center gap-3 text-left">
          <BookMarked className="text-blue-500 stroke-[2.5]" size={18} />
          <div>
            <h1 className="text-sm font-bold tracking-wider text-slate-100 uppercase font-display flex items-center gap-1.5 leading-none">
              LACC JOURNAL <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-sm bg-blue-600/10 text-blue-400 border border-blue-500/15 ml-1">TRADING DESK</span>
            </h1>
            <span className="text-[9px] font-mono text-slate-550 text-slate-500 uppercase tracking-wider block mt-0.5">Professional Portfolio &amp; Playbook Analytics</span>
          </div>
        </div>

        {/* Navigation CTAs */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-400 bg-geo-panel border border-geo-border px-3 py-1 rounded-sm font-mono uppercase tracking-wide">
            <span className="w-1.5 h-1.5 bg-blue-500 animate-pulse" />
            <Clock size={11} className="ml-1 text-slate-500" />
            <span>Clock: {currentTime}</span>
          </div>

          <button
            onClick={handleAddInit}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold font-mono uppercase tracking-wider px-4 h-9 rounded-sm transition-colors text-xs cursor-pointer"
            id="header-cta-add"
          >
            <Plus size={14} className="stroke-[3]" />
            New log
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-5 space-y-6 z-10">

        {/* SECTION 1: Summary Stats Analytics */}
        <section className="space-y-4" id="stats-summary-section">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h2 className="text-xs font-bold text-slate-202 text-slate-200 uppercase tracking-widest font-display flex items-center gap-2">
                <Sparkles size={14} className="text-blue-400" /> Strategy Desk
              </h2>
              <p className="text-[11px] text-slate-400 font-mono mt-1">Real-time yields, win rates, playbook strategy efficacy, and cumulative asset curve graphics</p>
            </div>
            {entries.length > 0 && (
              <button
                onClick={handleClearAllJournal}
                className="text-[9px] font-bold font-mono text-slate-500 hover:text-rose-400 hover:border-geo-border border border-transparent py-1 px-2.5 rounded-sm transition-all uppercase cursor-pointer"
              >
                Reset Database
              </button>
            )}
          </div>

          <StatsDashboard entries={entries} />

          {/* Graphical Analytics Layout */}
          <AnalyticsCharts entries={entries} />
        </section>

        {/* SECTION 2: Chronicle Positions Grid Ledger */}
        <section className="space-y-4 border-t border-geo-border pt-6" id="journal-timeline-section">
          <div className="text-left">
            <h2 className="text-xs font-bold text-slate-202 text-slate-200 uppercase tracking-widest font-display flex items-center gap-2">
              <Database size={14} className="text-blue-400" /> Playbook Strategy Ledger Feed
            </h2>
            <p className="text-[11px] text-slate-400 font-mono mt-1">Deep search, filter, read, and maintain your comprehensive active and closed setups</p>
          </div>

          <TradeGrid
            entries={entries}
            onSelect={setSelectedEntry}
            onEdit={handleEditInit}
            onDelete={(entry) => setEntryToDelete(entry)}
          />
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-geo-border py-6 px-5 mt-12 bg-geo-header text-[11px] text-slate-500 font-mono flex flex-col md:flex-row justify-between items-center gap-4 max-w-7xl w-full mx-auto" id="app-footer">
        <p>LACC Trading Journal Desk &bull; Built under Geometric Balance architectural principles</p>
        <p className="text-slate-550 text-slate-500 uppercase tracking-wider text-[10px]">
          {apiError ? 'FALLBACK: LOCAL CACHE PERSISTENCE ENGINE ACTIVE' : 'PERSISTENCE: REAL-TIME FULL-STACK JSON STORAGE SYNCED'}
        </p>
      </footer>

      {/* Write / Edit Trade Entry Drawer Modal overlay */}
      <AnimatePresence>
        {isFormOpen && (
          <TradeForm
            isOpen={isFormOpen}
            onClose={() => {
              setIsFormOpen(false);
              setEditingEntry(null);
            }}
            onSave={handleSaveEntry}
            initialEntry={editingEntry}
          />
        )}
      </AnimatePresence>

      {/* Detailed Entry Viewer Overlay */}
      <AnimatePresence>
        {selectedEntry && (
          <TradeDetailModal
            entry={selectedEntry}
            onClose={() => setSelectedEntry(null)}
            onEdit={handleEditInit}
            onDelete={(entry) => setEntryToDelete(entry)}
          />
        )}
      </AnimatePresence>

      {/* Confirm deletion dialog */}
      <AnimatePresence>
        {entryToDelete && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-geo-panel border border-geo-border p-6 max-w-md w-full text-center space-y-4"
              id="delete-confirmation-modal"
            >
              <div className="mx-auto w-12 h-12 rounded-sm bg-rose-500/10 flex items-center justify-center border border-rose-500/25">
                <AlertCircle className="text-rose-455 text-rose-400" size={22} />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold font-display uppercase tracking-wider text-slate-100 font-mono">
                  Confirm Trade Delete
                </h3>
                <p className="text-[11px] text-slate-400 font-mono leading-normal">
                  Are you absolutely certain you want to permanently erase the position entry for <span className="text-rose-400 font-bold font-mono">{entryToDelete.symbol}</span> on <span className="font-mono text-slate-200">{entryToDelete.entryDate}</span>? This action is irreversible.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEntryToDelete(null)}
                  className="w-1/2 h-9 bg-geo-bg hover:bg-geo-header border border-geo-border text-slate-450 text-slate-400 text-[10.5px] font-bold font-mono rounded-none transition-colors uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteEntry(entryToDelete.id);
                    setEntryToDelete(null);
                  }}
                  className="w-1/2 h-9 bg-rose-600 hover:bg-rose-700 text-white text-[10.5px] font-bold font-mono rounded-none transition-colors uppercase cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm database reset dialog */}
      <AnimatePresence>
        {isClearingAll && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-geo-panel border border-geo-border p-6 max-w-md w-full text-center space-y-4"
              id="clear-all-confirmation-modal"
            >
              <div className="mx-auto w-12 h-12 rounded-sm bg-rose-500/10 flex items-center justify-center border border-rose-500/25">
                <AlertCircle className="text-rose-400" size={22} />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold font-display uppercase tracking-wider text-slate-100 font-mono">
                  Reset Trading Database
                </h3>
                <p className="text-[11px] text-slate-400 font-mono leading-normal">
                  Are you completely positive you want to reset your local trading profile? This action will restore standard initial template seed values and scrub all current changes.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsClearingAll(false)}
                  className="w-1/2 h-9 bg-geo-bg hover:bg-geo-header border border-geo-border text-slate-450 text-slate-400 text-[10.5px] font-bold font-mono rounded-none transition-colors uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeClearDatabase}
                  className="w-1/2 h-9 bg-rose-600 hover:bg-rose-700 text-white text-[10.5px] font-bold font-mono rounded-none transition-colors uppercase cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
