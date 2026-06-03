/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CapitalEntry } from '../types';
import { X, Plus, Trash2, Edit, Coins, DollarSign, Calendar, FileText, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CapitalManagerProps {
  isOpen: boolean;
  onClose: () => void;
  capitalEntries: CapitalEntry[];
  onSaveCapital: (entry: Omit<CapitalEntry, 'id'> & { id?: string }) => void;
  onDeleteCapital: (id: string) => void;
}

const formatUSD = (val: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

export default function CapitalManager({
  isOpen,
  onClose,
  capitalEntries,
  onSaveCapital,
  onDeleteCapital
}: CapitalManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<'starting' | 'deposit' | 'withdrawal'>('deposit');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [errorObj, setErrorObj] = useState<string | null>(null);

  // Focus and populate fields when entering edit mode
  const handleEditInit = (entry: CapitalEntry) => {
    setEditingId(entry.id);
    setType(entry.type);
    setAmount(entry.amount.toString());
    setDate(entry.date);
    setNotes(entry.notes);
    setErrorObj(null);
  };

  const resetFormState = () => {
    setEditingId(null);
    setType('deposit');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setErrorObj(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorObj(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorObj('Please enter a valid amount greater than zero');
      return;
    }

    if (!date) {
      setErrorObj('Please select a valid date');
      return;
    }

    onSaveCapital({
      id: editingId || undefined,
      amount: parsedAmount,
      type,
      date,
      notes: notes.trim()
    });

    resetFormState();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto" id="capital-mgmt-backdrop">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-geo-panel border border-geo-border rounded-sm shadow-2xl relative overflow-hidden text-left"
        id="capital-mgmt-dialog"
      >
        {/* Upper Visual Accent Accent */}
        <div className="absolute top-0 right-0 h-[3px] w-full bg-blue-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-geo-border/60 p-5 bg-geo-header/30">
          <div className="flex items-center gap-2">
            <Coins size={16} className="text-blue-500" />
            <div>
              <h2 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-display font-mono">
                Capital Ledger Desk
              </h2>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Manage starting bankroll, deposits, and account actions</p>
            </div>
          </div>
          <button
            onClick={() => {
              resetFormState();
              onClose();
            }}
            className="p-1 px-1.5 border border-geo-border hover:border-slate-500 text-slate-400 hover:text-slate-150 cursor-pointer h-7 rounded-sm flex items-center justify-center transition-all bg-slate-950/20"
            id="capital-mgmt-close"
          >
            <X size={13} />
          </button>
        </div>

        {/* Modal content body */}
        <div className="p-5 space-y-6">
          {/* Dynamic input/edit form */}
          <form onSubmit={handleSubmit} className="bg-slate-950/30 border border-geo-border p-4 rounded-sm space-y-3" id="capital-transaction-form">
            <span className="text-[8.5px] font-mono font-bold tracking-wider text-slate-500 uppercase block">
              {editingId ? 'Edit Capital Entry' : 'Add New Capital Transaction'}
            </span>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Type selector */}
              <div className="space-y-1">
                <label className="block text-[8.5px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                  Flow Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full h-9 bg-geo-bg border border-geo-border text-xs px-2 cursor-pointer focus:border-blue-500 outline-none font-mono"
                  id="capital-flow-type-select"
                >
                  <option value="starting">Starting Capital</option>
                  <option value="deposit">Deposit Funding</option>
                  <option value="withdrawal">Withdrawal Account</option>
                </select>
              </div>

              {/* Amount input */}
              <div className="space-y-1">
                <label className="block text-[8.5px] font-mono font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1">
                  Amount <span className="text-slate-600">(USD)</span>
                </label>
                <div className="relative">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">
                    <DollarSign size={11} />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="25000.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-9 bg-geo-bg border border-geo-border text-xs pl-6 pr-2.5 outline-none focus:border-blue-500 font-mono"
                    id="capital-amount-input"
                    required
                  />
                </div>
              </div>

              {/* Date Input */}
              <div className="space-y-1">
                <label className="block text-[8.5px] font-mono font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1">
                  Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-9 bg-geo-bg border border-geo-border text-xs px-2.5 outline-none focus:border-blue-500 font-mono"
                    id="capital-date-input"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-1">
              <label className="block text-[8.5px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                Notes &bull; Memo
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., initial funding, monthly deposit, option broker transfer..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex-1 h-9 bg-geo-bg border border-geo-border text-xs px-3 outline-none focus:border-blue-500 font-mono"
                  id="capital-notes-input"
                />
                
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="submit"
                    className="h-9 px-4 bg-blue-600 hover:bg-blue-500 text-white font-mono text-[10.5px] uppercase font-bold rounded-sm border border-transparent hover:border-blue-400/25 transition-all flex items-center gap-1.5 cursor-pointer"
                    id="capital-save-btn"
                  >
                    {editingId ? <Check size={12} /> : <Plus size={12} />}
                    <span>{editingId ? 'Update' : 'Record'}</span>
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      onClick={resetFormState}
                      className="h-9 px-2 border border-geo-border text-[10px] uppercase font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-900 cursor-pointer rounded-sm"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {errorObj && (
              <span className="text-[10px] text-rose-400 font-mono block mt-1">*{errorObj}</span>
            )}
          </form>

          {/* Capital ledger table list */}
          <div className="space-y-2">
            <span className="text-[8.5px] font-mono font-bold tracking-wider text-slate-500 uppercase block">
              Logged Transactions &bull; Records ({capitalEntries.length})
            </span>
            
            <div className="border border-geo-border rounded-sm overflow-hidden bg-slate-950/20 max-h-[220px] overflow-y-auto">
              <table className="w-full text-left text-[10px] font-mono border-collapse" id="capital-entries-table">
                <thead>
                  <tr className="bg-slate-950/45 border-b border-geo-border/60 text-slate-500 text-[8.5px] uppercase tracking-wider select-none">
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                    <th className="py-2.5 px-3 hidden sm:table-cell">Notes Map</th>
                    <th className="py-2.5 px-3 text-center w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-geo-border/50">
                  {capitalEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No financial logs. Complete the inputs above to index account funding.
                      </td>
                    </tr>
                  ) : (
                    capitalEntries.map((e) => {
                      let typeLabel = 'Deposit';
                      let typeColor = 'text-emerald-400';
                      let typeBg = 'bg-emerald-500/10 border-emerald-500/20';
                      
                      if (e.type === 'starting') {
                        typeLabel = 'Starting';
                        typeColor = 'text-blue-400';
                        typeBg = 'bg-blue-500/10 border-blue-500/20';
                      } else if (e.type === 'withdrawal') {
                        typeLabel = 'Withdraw';
                        typeColor = 'text-rose-400';
                        typeBg = 'bg-rose-500/10 border-rose-500/20';
                      }

                      return (
                        <tr key={e.id} className="hover:bg-slate-900/10 text-slate-300">
                          <td className="py-2 px-3">
                            <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-sm border ${typeBg} ${typeColor} uppercase`}>
                              {typeLabel}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-400">
                            {e.date}
                          </td>
                          <td className={`py-2 px-3 text-right font-extrabold ${typeColor}`}>
                            {e.type === 'withdrawal' ? '-' : '+'}
                            {formatUSD(e.amount)}
                          </td>
                          <td className="py-2 px-3 text-slate-400 hidden sm:table-cell max-w-[200px] truncate" title={e.notes}>
                            {e.notes || <span className="text-slate-600 italic">No notes</span>}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditInit(e)}
                                className="p-1 hover:text-blue-400 border border-geo-border hover:border-blue-500/30 rounded-sm bg-slate-950/25 transition-all text-slate-500 cursor-pointer"
                                title="Edit Transaction"
                              >
                                <Edit size={10} />
                              </button>
                              <button
                                onClick={() => onDeleteCapital(e.id)}
                                className="p-1 hover:text-rose-400 border border-geo-border hover:border-rose-500/30 rounded-sm bg-slate-950/25 transition-all text-slate-500 cursor-pointer"
                                title="Delete Transaction"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer Summary block */}
        <div className="border-t border-geo-border/60 p-4 bg-geo-header/35 flex items-center justify-between text-[10px] font-mono text-slate-400 font-medium">
          <div className="flex gap-4">
            <div>
              <span className="text-slate-500 uppercase text-[8px] tracking-wider block">Total Deposits</span>
              <span className="font-bold text-slate-300">
                {formatUSD(
                  capitalEntries
                    .filter(e => e.type === 'starting' || e.type === 'deposit')
                    .reduce((sum, e) => sum + e.amount, 0)
                )}
              </span>
            </div>
            <div>
              <span className="text-slate-500 uppercase text-[8px] tracking-wider block">Total Withdrawals</span>
              <span className="font-bold text-slate-300">
                {formatUSD(
                  capitalEntries
                    .filter(e => e.type === 'withdrawal')
                    .reduce((sum, e) => sum + e.amount, 0)
                )}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              resetFormState();
              onClose();
            }}
            className="px-4 h-8 bg-geo-bg hover:bg-slate-900 border border-geo-border hover:border-slate-500 text-slate-300 text-[10px] font-bold font-mono rounded-sm transition-all uppercase cursor-pointer"
            id="capital-ledger-close-footer"
          >
            Close Desk
          </button>
        </div>
      </motion.div>
    </div>
  );
}
