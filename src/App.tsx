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
  LogIn,
  LogOut,
  Cloud,
  CloudOff,
  RefreshCw,
  User as UserIcon,
  CheckSquare,
  Flame,
  HelpCircle
} from 'lucide-react';

import { auth, db, handleFirestoreError, OperationType, firebaseConfig } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

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

  // Firebase Auth & Cloud Sync States
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasOfflineUnsynced, setHasOfflineUnsynced] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);

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

  // Sync Auth State & Firestore snapshoting
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      
      if (u) {
        // Authenticated user: subscribe to 'trades'
        const q = query(
          collection(db, 'trades'),
          where('ownerId', '==', u.uid)
        );
        
        const unsubscribeSnapshot = onSnapshot(
          q,
          (snapshot) => {
            const cloudEntries: TradeEntry[] = [];
            snapshot.forEach((docSnap) => {
              cloudEntries.push(docSnap.data() as TradeEntry);
            });
            // Sort standard descending by date YYYY-MM-DD
            cloudEntries.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
            setEntries(cloudEntries);
            setAuthLoading(false);
          },
          (error) => {
            console.error("Firestore onSnapshot error:", error);
            handleFirestoreError(error, OperationType.LIST, 'trades');
            setAuthLoading(false);
          }
        );

        return () => unsubscribeSnapshot();
      } else {
        // Offline/Unauthenticated: Read records from local storage
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setEntries(parsed);
          } catch (e) {
            console.error('Failed reading entries from local cache, falling back to seed.', e);
            setEntries(SEED_ENTRIES);
          }
        } else {
          setEntries(SEED_ENTRIES);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_ENTRIES));
        }
        setAuthLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Compute offline data backlog size
  useEffect(() => {
    if (user && entries.length >= 0) {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        try {
          const localEntries: TradeEntry[] = JSON.parse(stored);
          const unsynced = localEntries.filter(
            (le) => !entries.some((ce) => ce.id === le.id)
          );
          setHasOfflineUnsynced(unsynced.length);
        } catch (e) {
          console.error(e);
        }
      }
    } else {
      setHasOfflineUnsynced(0);
    }
  }, [user, entries]);

  const saveToDB = (updatedEntries: TradeEntry[]) => {
    setEntries(updatedEntries);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedEntries));
  };

  const handleSignIn = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e: any) {
      console.error("Sign-in failed:", e);
      setAuthError(e.message || String(e));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setEntries([]);
    } catch (e) {
      console.error("Sign-out failed:", e);
    }
  };

  const handleSyncOfflineData = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) {
        setIsSyncing(false);
        return;
      }
      const localList: TradeEntry[] = JSON.parse(stored);
      
      const unsyncedList = localList.filter(
        (ll) => !entries.some((cl) => cl.id === ll.id)
      );

      if (unsyncedList.length > 0) {
        const batch = writeBatch(db);
        unsyncedList.forEach((item) => {
          const docRef = doc(db, 'trades', item.id);
          const securedItem = {
            ...item,
            ownerId: user.uid
          };
          batch.set(docRef, securedItem);
        });
        await batch.commit();
      }
      
      // Clean up local cache once synced
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setHasOfflineUnsynced(0);
    } catch (error) {
      console.error("Sync error:", error);
      alert("Firestore secure sync failed. Verify security rules or connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveEntry = async (entryData: Omit<TradeEntry, 'id'> & { id?: string }) => {
    const isEditing = !!entryData.id;
    const targetId = entryData.id || `trade-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const savedEntry: TradeEntry = {
      ...entryData,
      id: targetId,
      ...(user ? { ownerId: user.uid } : {})
    } as TradeEntry;

    if (user) {
      try {
        const docRef = doc(db, 'trades', targetId);
        await setDoc(docRef, savedEntry);
      } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `trades/${targetId}`);
      }
    } else {
      let updated: TradeEntry[];
      if (isEditing) {
        updated = entries.map((e) => (e.id === targetId ? savedEntry : e));
      } else {
        updated = [savedEntry, ...entries];
      }
      saveToDB(updated);
    }

    setIsFormOpen(false);
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (id: string) => {
    if (user) {
      try {
        const docRef = doc(db, 'trades', id);
        await deleteDoc(docRef);
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `trades/${id}`);
      }
    } else {
      const updated = entries.filter((e) => e.id !== id);
      saveToDB(updated);
    }

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

        {/* Sync panel indicators & CTAs */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1.5 text-[10px] text-slate-400 bg-geo-panel border border-geo-border px-3 py-1 rounded-sm font-mono uppercase tracking-wide">
            <span className="w-1.5 h-1.5 bg-blue-500 animate-pulse" />
            <Clock size={11} className="ml-1 text-slate-500" />
            <span>Clock: {currentTime}</span>
          </div>

          {!firebaseConfig.apiKey ? (
            <div className="flex items-center gap-1.5 text-[10px] text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-sm font-mono uppercase tracking-wide">
              <CloudOff size={11} className="text-yellow-500" />
              <span>Offline Database</span>
            </div>
          ) : !user ? (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-slate-405 text-slate-450 bg-geo-panel border border-geo-border px-2.5 py-1 rounded-sm font-mono uppercase">
                <CloudOff size={11} className="text-slate-500" />
                <span>Locally Stored</span>
              </div>
              <button 
                onClick={handleSignIn}
                className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold font-mono uppercase tracking-wide px-3 h-9 rounded-sm transition-all cursor-pointer"
              >
                <LogIn size={13} />
                Connect Cloud
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-sm font-mono uppercase">
                <Cloud size={11} className="text-emerald-400 animate-pulse" />
                <span>Cloud Synced</span>
              </div>
              <div className="flex items-center gap-2 border border-geo-border bg-geo-panel px-2.5 py-1 rounded-sm">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || "User"} className="w-5 h-5 rounded-full border border-blue-500/30" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <UserIcon size={12} className="text-blue-400" />
                  </div>
                )}
                <span className="text-[10px] text-slate-300 font-semibold max-w-[100px] truncate">{user.displayName || "Trader"}</span>
                <button onClick={handleSignOut} title="Disconnect" className="text-slate-400 hover:text-red-400 p-0.5 rounded-sm transition-all ml-1 cursor-pointer">
                  <LogOut size={13} />
                </button>
              </div>
            </div>
          )}

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

        {/* Global Alert Notification Banner */}
        {authError && (
          <div className="p-3.5 border border-rose-500/20 bg-rose-500/5 rounded-sm flex items-center justify-between gap-3" id="auth-error-banner">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="text-rose-455 text-rose-400 stroke-[2] shrink-0" size={15} />
              <p className="text-[11px] text-slate-300 font-mono leading-relaxed text-left">
                Connection alert: {authError}
              </p>
            </div>
            <button 
              onClick={() => setAuthError(null)}
              className="text-slate-400 hover:text-slate-205 text-[10px] font-bold font-mono uppercase bg-transparent px-2 py-1 border border-slate-700 hover:border-slate-600 rounded-sm cursor-pointer transition-colors shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Sync Offline Backlog Notification */}
        {user && hasOfflineUnsynced > 0 && (
          <div className="p-3 border border-blue-500/20 bg-blue-500/5 rounded-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-left" id="sync-migration-banner">
            <div className="flex items-start gap-2.5">
              <CheckSquare className="text-blue-400 stroke-[2] mt-0.5" size={16} />
              <div>
                <h4 className="text-xs font-bold text-slate-202 text-slate-200 uppercase tracking-widest font-mono">Unsynced offline positions detected</h4>
                <p className="text-[11px] text-slate-450 text-slate-400 font-mono mt-0.5">
                  You have {hasOfflineUnsynced} position {hasOfflineUnsynced === 1 ? 'record' : 'records'} logged locally. Sync them to your secure cloud database?
                </p>
              </div>
            </div>
            <button
              onClick={handleSyncOfflineData}
              disabled={isSyncing}
              className="flex items-center justify-center gap-1.5 self-start sm:self-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-800/40 text-white font-bold font-mono uppercase tracking-wider px-3.5 py-1.5 rounded-sm transition-colors text-xs cursor-pointer shadow-none relative h-8"
            >
              {isSyncing ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Cloud size={12} />
                  Sync to Cloud
                </>
              )}
            </button>
          </div>
        )}

        {/* SECTION 1: Summary Stats Analytics */}
        <section className="space-y-4" id="stats-summary-section">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <h2 className="text-xs font-bold text-slate-202 text-slate-200 uppercase tracking-widest font-display flex items-center gap-2">
                <Sparkles size={14} className="text-blue-400" /> Executive Financial &amp; Strategy Desk
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
        <p className="text-slate-650 text-slate-550 text-slate-500 uppercase tracking-wider text-[10px]">
          {user ? `SECURE STORAGE: CLOUD FIRESTORE SYNC ACTIVE` : `LOCAL STORAGE: OFFLINE PERSISTENCE KEY-VALUE ACTIVE`}
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
                  onClick={async () => {
                    if (user) {
                      try {
                        const batch = writeBatch(db);
                        entries.forEach((item) => {
                          batch.delete(doc(db, 'trades', item.id));
                        });
                        await batch.commit();
                      } catch (e) {
                        handleFirestoreError(e, OperationType.DELETE, 'trades');
                      }
                    } else {
                      saveToDB([]);
                    }
                    setIsClearingAll(false);
                  }}
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
