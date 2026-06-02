/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trade, AssetClass, TradeStatus } from './types';
import StatsDashboard from './components/StatsDashboard';
import { EquityCurveChart, WinLossDonutChart, SetupBreakdownBarChart } from './components/AnalyticsCharts';
import TradeForm from './components/TradeForm';
import TradeGrid from './components/TradeGrid';
import TradeDetailModal from './components/TradeDetailModal';
import {
  TrendingUp,
  TrendingDown,
  BookMarked,
  Plus,
  HelpCircle,
  Clock,
  Sparkles,
  Info,
  Layers,
  Search,
  CheckCircle,
  Database,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'trading_journal_positions_db';

const SEED_TRADES: Trade[] = [
  {
    id: 'seed-trade-1',
    symbol: 'BTC/USDT',
    assetClass: 'Crypto',
    side: 'long',
    entryPrice: 61850,
    exitPrice: 64200,
    quantity: 0.5,
    pnl: 1175.00,
    fees: 35.00,
    setup: 'EMA Exponential Trend Ribbon',
    entryDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    exitDate: new Date(Date.now() - 3.8 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'win',
    targetPrice: 65000,
    stopLoss: 60500,
    riskAmount: 675,
    notes: 'Classic trend continuation pullback to the 20 EMA on the 4-hour chart. Entry confirmed by a strong bullish engulfing candle. Squeezed out nice momentum on the breakout. Exited slightly below major resistance to play it safe.',
  },
  {
    id: 'seed-trade-2',
    symbol: 'EUR/USD',
    assetClass: 'Forex',
    side: 'short',
    entryPrice: 1.0925,
    exitPrice: 1.0840,
    quantity: 100000,
    pnl: 850.00,
    fees: 15.00,
    setup: 'Support/Resistance Bounce',
    entryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    exitDate: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'win',
    targetPrice: 1.0820,
    stopLoss: 1.0955,
    riskAmount: 300,
    notes: 'Rejection of the range-high resistance zone on the daily timeframe. Clear double top formation on the 1-hour chart with bearish divergence on the RSI. Trail stopped exited near target bottom. Clean execution.',
  },
  {
    id: 'seed-trade-3',
    symbol: 'TSLA',
    assetClass: 'Stocks',
    side: 'long',
    entryPrice: 182.50,
    exitPrice: 174.20,
    quantity: 100,
    pnl: -830.00,
    fees: 10.00,
    setup: 'Breakout Pullback',
    entryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    exitDate: new Date(Date.now() - 1.8 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'loss',
    targetPrice: 205.00,
    stopLoss: 175.00,
    riskAmount: 750,
    notes: 'Formed a clean cup and handle pattern. Attempted breakout on high volume, but macro news caused a broader market pullback. SL hit in pre-market. Lesson: Set wider stops when trading highly volatile tickers around earnings days.',
  },
  {
    id: 'seed-trade-4',
    symbol: 'SOL/USDT',
    assetClass: 'Crypto',
    side: 'long',
    entryPrice: 134.80,
    quantity: 150,
    fees: 12.50,
    setup: 'Volume Spread Analysis',
    entryDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    status: 'open',
    targetPrice: 152.00,
    stopLoss: 127.50,
    riskAmount: 1095,
    notes: 'Institutional absorption candle on high volume. Rebounding off key psychological support at 130. Looking content to let it run overnight.',
  }
];

export default function App() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null);
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

    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      try {
        setTrades(JSON.parse(stored));
      } catch (e) {
        console.error('Failed reading trades from database, falling back to seed.', e);
        setTrades(SEED_TRADES);
      }
    } else {
      setTrades(SEED_TRADES);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_TRADES));
    }

    return () => clearInterval(ticker);
  }, []);

  const saveToDB = (updatedTrades: Trade[]) => {
    setTrades(updatedTrades);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedTrades));
  };

  const handleSaveTrade = (tradeData: Omit<Trade, 'id'> & { id?: string }) => {
    if (tradeData.id) {
      const updated = trades.map((t) => (t.id === tradeData.id ? { ...t, ...tradeData } as Trade : t));
      saveToDB(updated);
    } else {
      const newTrade: Trade = {
        ...tradeData,
        id: `trade-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      };
      saveToDB([newTrade, ...trades]);
    }
    setIsFormOpen(false);
    setEditingTrade(null);
  };

  const handleDeleteTrade = (id: string) => {
    const updated = trades.filter((t) => t.id !== id);
    saveToDB(updated);
    if (selectedTrade?.id === id) {
      setSelectedTrade(null);
    }
  };

  const handleEditInit = (trade: Trade) => {
    setEditingTrade(trade);
    setIsFormOpen(true);
    setSelectedTrade(null);
  };

  const handleAddInit = () => {
    setEditingTrade(null);
    setIsFormOpen(true);
  };

  const handleClearAllJournal = () => {
    setIsClearingAll(true);
  };

  return (
    <div className="min-h-screen bg-geo-bg text-slate-100 flex flex-col font-sans" id="trading-journal-app">
      
      {/* Main Navigation Header */}
      <header className="border-b border-geo-border bg-geo-header sticky top-0 backdrop-blur z-40 px-5 h-16 flex items-center justify-between animate-fade-in" id="app-nav-header">
        <div className="flex items-center gap-3">
          <BookMarked className="text-blue-500 stroke-[2]" size={18} />
          <div>
            <h1 className="text-sm font-bold tracking-wider text-slate-100 uppercase font-display flex items-center gap-1.5">
              LACC TRADING JOURNAL <span className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-sm bg-blue-600/10 text-blue-400 border border-blue-500/20 ml-1">PRO</span>
            </h1>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-400 bg-geo-panel border border-geo-border px-3 py-1 rounded-sm font-mono uppercase tracking-wide">
            <span className="w-1.5 h-1.5 rounded-none bg-blue-500 animate-pulse" />
            <Clock size={11} className="ml-1" />
            <span>Market Time: {currentTime}</span>
          </div>

          <button
            onClick={handleAddInit}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold font-mono uppercase tracking-wider px-4 h-9 rounded-sm transition-colors text-xs cursor-pointer shadow-none"
            id="header-cta-add"
          >
            <Plus size={14} className="stroke-[3]" />
            Record Trade
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-5 space-y-6 z-10">

        {/* Section 1: Dashboard Analytics Desk */}
        <section className="space-y-4" id="analytics-desk">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-display flex items-center gap-2">
                <Sparkles size={14} className="text-blue-400" /> Executive Performance Analytics
              </h2>
              <p className="text-[11px] text-slate-400 font-mono mt-1">Real-time stats, equity gains progression, and systematic setups analysis</p>
            </div>
            {trades.length > 0 && (
              <button
                onClick={handleClearAllJournal}
                className="text-[9px] font-bold font-mono text-slate-500 hover:text-rose-400 hover:border-geo-border border border-transparent py-1 px-2.5 rounded-sm transition-all uppercase"
              >
                Clear Database Cache
              </button>
            )}
          </div>

          {/* Detailed Statistics summary cards */}
          <StatsDashboard trades={trades} />

          {/* Interactive visual charts layout block */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" id="analytic-charts-row">
            {/* Equity progression line plot */}
            <div className="lg:col-span-2">
              <EquityCurveChart trades={trades} />
            </div>
            {/* Outcome distribution radial donut */}
            <div className="grid grid-cols-1 gap-4">
              <WinLossDonutChart trades={trades} />
            </div>
            {/* Setup Efficiency breakdown bar chart */}
            <div className="lg:col-span-3">
              <SetupBreakdownBarChart trades={trades} />
            </div>
          </div>
        </section>

        {/* Section 2: Position Journal Database registry */}
        <section className="space-y-4 border-t border-geo-border pt-6" id="journal-db">
          <div>
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-widest font-display flex items-center gap-2">
              <Database size={14} className="text-blue-400" /> Executive Journal Registry
            </h2>
            <p className="text-[11px] text-slate-400 font-mono mt-1">Search, filter, and inspect detailed trade logs, screenshots, and setup parameters</p>
          </div>

          <TradeGrid
            trades={trades}
            onEdit={handleEditInit}
            onDelete={(id) => {
              const tr = trades.find((t) => t.id === id);
              if (tr) setTradeToDelete(tr);
            }}
            onSelect={setSelectedTrade}
          />
        </section>

      </main>

      {/* Footer bar */}
      <footer className="border-t border-geo-border py-6 px-5 mt-12 bg-geo-header text-[11px] text-slate-500 font-mono flex flex-col md:flex-row justify-between items-center gap-4 max-w-7xl w-full mx-auto" id="app-footer">
        <p>LACC Trading Journal &bull; Built under Geometric Balance architectural principles</p>
        <p className="text-slate-600 uppercase tracking-wider text-[10px]">Secure offline local storage database active</p>
      </footer>

      {/* Slide-over Form Overlay Drawer */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-geo-bg/85 backdrop-blur-md z-50 overflow-y-auto p-4 md:p-6 flex justify-center items-start"
            id="modal-form-drawer"
          >
            <motion.div
              initial={{ scale: 0.98, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, y: 10 }}
              className="w-full max-w-4xl"
            >
              <TradeForm
                initialTrade={editingTrade}
                onSave={handleSaveTrade}
                onCancel={() => {
                  setIsFormOpen(false);
                  setEditingTrade(null);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single Trade Inspection detail overlay */}
      <AnimatePresence>
        {selectedTrade && (
          <TradeDetailModal
            trade={selectedTrade}
            onClose={() => setSelectedTrade(null)}
            onEdit={handleEditInit}
            onDelete={(id) => {
              const tr = trades.find((t) => t.id === id);
              if (tr) setTradeToDelete(tr);
            }}
          />
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal for Single Trade Delete */}
      <AnimatePresence>
        {tradeToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-geo-bg/90 backdrop-blur-md z-50 flex items-center justify-center p-4 shadow-2xl"
            id="delete-confirmation-modal"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-geo-panel border border-geo-border p-6 rounded-sm max-w-md w-full shadow-2xl"
            >
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-sm bg-rose-500/10 flex items-center justify-center border border-rose-500/25">
                  <AlertCircle className="text-rose-400" size={22} />
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold font-display uppercase tracking-wider text-slate-100">
                    Confirm Record Deletion
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono leading-normal">
                    Are you certain you want to permanently delete the <span className="text-rose-400 font-bold font-sans">{tradeToDelete.symbol}</span> trade log? This action is irreversible and will remove all corresponding analytics metrics.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setTradeToDelete(null)}
                    className="w-1/2 h-9 bg-geo-bg hover:bg-geo-header border border-geo-border text-slate-400 hover:text-slate-200 text-[11px] font-bold font-mono rounded-sm transition-colors uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteTrade(tradeToDelete.id);
                      setTradeToDelete(null);
                    }}
                    className="w-1/2 h-9 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold font-mono rounded-sm transition-colors uppercase"
                  >
                    Delete Record
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal for Cleared DB */}
      <AnimatePresence>
        {isClearingAll && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-geo-bg/90 backdrop-blur-md z-50 flex items-center justify-center p-4 shadow-2xl"
            id="clear-all-confirmation-modal"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-geo-panel border border-geo-border p-6 rounded-sm max-w-md w-full shadow-2xl"
            >
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-sm bg-rose-500/10 flex items-center justify-center border border-rose-500/25">
                  <AlertCircle className="text-rose-400" size={22} />
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold font-display uppercase tracking-wider text-slate-100">
                    Reset Journal Database
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono leading-normal">
                    Are you absolutely certain you want to clear your entire trading journal history? This deletes all trade logs and clears interactive equity analytics permanently.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsClearingAll(false)}
                    className="w-1/2 h-9 bg-geo-bg hover:bg-geo-header border border-geo-border text-slate-400 hover:text-slate-205 text-[11px] font-bold font-mono rounded-sm transition-colors uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      saveToDB([]);
                      setIsClearingAll(false);
                    }}
                    className="w-1/2 h-9 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold font-mono rounded-sm transition-colors uppercase"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
