/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TradeEntry, AssetClassType, SideType, StatusType, EmotionType } from '../types';
import { EMOTIONS_LIST, EMOTIONS_METADATA } from '../lib/emotions';
import DatePicker from './DatePicker';
import {
  X,
  Upload,
  Image as ImageIcon,
  DollarSign,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  HelpCircle,
  FileImage,
  AlertCircle
} from 'lucide-react';

interface TradeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: Omit<TradeEntry, 'id'> & { id?: string }) => void;
  initialEntry: TradeEntry | null;
}

export default function TradeForm({ isOpen, onClose, onSave, initialEntry }: TradeFormProps) {
  const [symbol, setSymbol] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClassType>('Crypto');
  const [side, setSide] = useState<SideType>('long');
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [exitPrice, setExitPrice] = useState<number | undefined>(undefined);
  const [closedPrice, setClosedPrice] = useState<number | undefined>(undefined);
  const [quantity, setQuantity] = useState<number>(0);
  const [fees, setFees] = useState<number>(0);
  const [setup, setSetup] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [exitDate, setExitDate] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<StatusType>('open');
  const [notes, setNotes] = useState('');
  const [riskAmount, setRiskAmount] = useState<number | undefined>(undefined);
  const [targetPrice, setTargetPrice] = useState<number | undefined>(undefined);
  const [stopLoss, setStopLoss] = useState<number | undefined>(undefined);
  const [emotion, setEmotion] = useState<EmotionType | undefined>(undefined);
  const [screenshotInput, setScreenshotInput] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Populate form if we are editing
  useEffect(() => {
    if (initialEntry) {
      setSymbol(initialEntry.symbol);
      setAssetClass(initialEntry.assetClass);
      setSide(initialEntry.side);
      setEntryPrice(initialEntry.entryPrice);
      setExitPrice(initialEntry.exitPrice);
      setClosedPrice(initialEntry.closedPrice || initialEntry.exitPrice);
      setQuantity(initialEntry.quantity);
      setFees(initialEntry.fees);
      setSetup(initialEntry.setup);
      setEntryDate(initialEntry.entryDate);
      setExitDate(initialEntry.exitDate);
      setStatus(initialEntry.status);
      setNotes(initialEntry.notes);
      setRiskAmount(initialEntry.riskAmount);
      setTargetPrice(initialEntry.targetPrice);
      setStopLoss(initialEntry.stopLoss);
      setEmotion(initialEntry.emotion);
      setScreenshotInput(initialEntry.screenshot || '');
      setScreenshots(initialEntry.screenshots || []);
    } else {
      // Default initial states
      setSymbol('');
      setAssetClass('Crypto');
      setSide('long');
      setEntryPrice(0);
      setExitPrice(undefined);
      setClosedPrice(undefined);
      setQuantity(0);
      setFees(0);
      setSetup('');
      setEntryDate(new Date().toISOString().split('T')[0]);
      setExitDate(undefined);
      setStatus('open');
      setNotes('');
      setRiskAmount(undefined);
      setTargetPrice(undefined);
      setStopLoss(undefined);
      setEmotion(undefined);
      setScreenshotInput('');
      setScreenshots([]);
    }
    setFormError(null);
  }, [initialEntry, isOpen]);

  // Adjust status based on exit details
  useEffect(() => {
    if (status === 'open') {
      // if exitPrice or closedPrice is defined, default to a closed status
      if ((exitPrice !== undefined && exitPrice > 0) || (closedPrice !== undefined && closedPrice > 0)) {
        setStatus('win');
      }
    } else {
      // if closed status, ensure we have exit price or default
      if (exitPrice === undefined || exitPrice === 0) {
        setExitPrice(closedPrice || entryPrice);
      }
      if (closedPrice === undefined || closedPrice === 0) {
        setClosedPrice(exitPrice || entryPrice);
      }
    }
  }, [exitPrice, closedPrice]);

  // File parsing to base64 DataURL
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Please upload image formatted files only (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFormError('File size is too extensive (maximum limit 2MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setScreenshotInput(base64);
      if (!screenshots.includes(base64)) {
        setScreenshots((prev) => [...prev, base64]);
      }
    };
    reader.readAsDataURL(file);
    setFormError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Basic Validations
    if (!symbol.trim()) {
      setFormError('Position Symbol is a mandatory parameter (e.g. AAPL, BTC, SOL).');
      return;
    }
    if (!setup.trim()) {
      setFormError('Strategy Playbook is a mandatory parameter (e.g. Breakout, VWAP).');
      return;
    }
    if (entryPrice <= 0) {
      setFormError('Price must represent a positive real number.');
      return;
    }
    if (quantity <= 0) {
      setFormError('Quantity size must exceed zero.');
      return;
    }
    if (fees < 0) {
      setFormError('Brokerage transaction fees cannot represent a negative value.');
      return;
    }

    // Dynamic P&L Calculation
    let calculatedPnl = 0;
    if (status !== 'open') {
      const ep = entryPrice;
      const xp = closedPrice || exitPrice || entryPrice;
      const qty = quantity;
      
      if (side === 'long') {
        calculatedPnl = (xp - ep) * qty;
      } else {
        calculatedPnl = (ep - xp) * qty;
      }
    }

    // Payload Assembly
    const payload: Omit<TradeEntry, 'id'> & { id?: string } = {
      ...(initialEntry ? { id: initialEntry.id } : {}),
      symbol: symbol.toUpperCase().trim(),
      assetClass,
      side,
      entryPrice,
      exitPrice: status === 'open' ? undefined : (exitPrice || closedPrice || entryPrice),
      closedPrice: status === 'open' ? undefined : (closedPrice || exitPrice),
      quantity,
      fees,
      pnl: status === 'open' ? 0 : calculatedPnl,
      setup: setup.trim(),
      entryDate,
      exitDate: status === 'open' ? undefined : (exitDate || entryDate),
      status,
      notes: notes.trim(),
      riskAmount: riskAmount || undefined,
      targetPrice: targetPrice || undefined,
      stopLoss: stopLoss || undefined,
      emotion: emotion || undefined,
      screenshot: screenshotInput || undefined,
      screenshots: screenshots.length > 0 ? screenshots : undefined,
    };

    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-xs select-none" id="trade-form-overlay">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 220 }}
        className="w-full max-w-lg h-full bg-geo-bg border-l border-geo-border flex flex-col shadow-2xl relative overflow-hidden"
        id="trade-form-drawer"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-geo-border bg-geo-header flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-left">
            <Settings className="text-blue-500 animate-spin" style={{ animationDuration: '6s' }} size={16} />
            <div>
              <span className="text-[9px] font-mono font-bold tracking-widest text-slate-500 uppercase block">Log Configuration Panel</span>
              <h3 className="text-xs font-bold font-mono tracking-wider text-slate-100 uppercase mt-0.5">
                {initialEntry ? 'Modify Position Parameters' : 'Deploy Fresh Strategy position'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 px-1.5 border border-geo-border hover:border-slate-600 bg-geo-bg rounded-sm text-slate-400 hover:text-slate-200 cursor-pointer"
            id="close-trade-form"
          >
            <X size={15} />
          </button>
        </div>

        {/* Major Error Notification Banner */}
        {formError && (
          <div className="p-3 border-b border-rose-500/15 bg-rose-500/5 flex items-center gap-2 text-left animate-fade-in">
            <AlertCircle className="text-rose-455 text-rose-400 shrink-0" size={14} />
            <span className="text-[10px] font-mono text-slate-300">{formError}</span>
          </div>
        )}

        {/* Interactive Input Board */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-left text-xs text-slate-300">
          
          {/* Row A: Symbol & Status */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[9.5px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-1">
                Security Symbol *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. BTCUSDT, EURUSD, INTC"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full h-9 bg-geo-bg border border-geo-border hover:border-slate-800 focus:border-blue-505/60 focus:border-blue-500 px-3 text-[11px] font-mono text-slate-200 outline-none uppercase transition-colors"
              />
            </div>

            <div>
              <label className="block text-[9.5px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-1">
                Position State
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusType)}
                className="w-full h-9 bg-geo-bg border border-geo-border hover:border-slate-800 px-2.5 text-[11px] font-mono text-slate-300 outline-none transition-colors"
              >
                <option value="open">Active Open</option>
                <option value="win">Win Profit ✅</option>
                <option value="loss">Loss Loss ❌</option>
                <option value="breakeven">Breakeven 🤝</option>
              </select>
            </div>
          </div>

          {/* Row B: Sector & Side */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[9.5px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-1">
                Asset Class
              </label>
              <select
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value as AssetClassType)}
                className="w-full h-9 bg-geo-bg border border-geo-border hover:border-slate-800 px-2.5 text-[11px] font-mono text-slate-300 outline-none transition-colors"
              >
                <option value="Crypto">Crypto</option>
                <option value="Forex">Forex</option>
                <option value="Stocks">Stocks</option>
                <option value="Commodities">Commodities</option>
                <option value="Options">Options</option>
              </select>
            </div>

            <div>
              <label className="block text-[9.5px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-1">
                Execution Bias
              </label>
              <div className="flex h-9 border border-geo-border p-0.5 bg-geo-panel/50">
                <button
                  type="button"
                  onClick={() => setSide('long')}
                  className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-mono uppercase font-bold cursor-pointer transition-colors ${
                    side === 'long'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <ArrowUpRight size={12} />
                  Long
                </button>
                <button
                  type="button"
                  onClick={() => setSide('short')}
                  className={`flex-1 flex items-center justify-center gap-1 text-[10px] font-mono uppercase font-bold cursor-pointer transition-colors ${
                    side === 'short'
                      ? 'bg-rose-500/10 text-rose-455 text-rose-400 border border-rose-500/20 shadow-inner'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <ArrowDownLeft size={12} />
                  Short
                </button>
              </div>
            </div>
          </div>

          {/* Row C: Setup & Execution Date */}
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[9.5px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-1">
                Strategy Playbook *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. VWAP Bounce, Flag Break"
                value={setup}
                onChange={(e) => setSetup(e.target.value)}
                className="w-full h-9 bg-geo-bg border border-geo-border hover:border-slate-800 focus:border-blue-500 px-3 text-[11px] font-mono text-slate-205 text-slate-200 outline-none transition-colors"
                id="setup-playbook-field"
              />
            </div>

            <div>
              <label className="block text-[9.5px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-1">
                Execution Entry Date
              </label>
              <DatePicker
                value={entryDate}
                onChange={(val) => setEntryDate(val)}
                placeholder="Execution Date"
                isClearable={false}
                className="w-full h-9"
              />
            </div>
          </div>

          {/* Row D: Closed Position Exit parameters */}
          {status !== 'open' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 overflow-hidden border-t border-geo-border/50 pt-3.5"
            >
              <div>
                <label className="block text-[9.5px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-1">
                  Closed Price
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Exit price level"
                  value={closedPrice || ''}
                  onChange={(e) => setClosedPrice(Number(e.target.value) || undefined)}
                  className="w-full h-9 bg-geo-bg border border-geo-border hover:border-slate-800 focus:border-blue-500 px-3 text-[11px] font-mono text-slate-200 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-1">
                  Closed Exit Price
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Exit absolute level"
                  value={exitPrice || ''}
                  onChange={(e) => setExitPrice(Number(e.target.value) || undefined)}
                  className="w-full h-9 bg-geo-bg border border-geo-border hover:border-slate-800 focus:border-blue-500 px-3 text-[11px] font-mono text-slate-200 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[9.5px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-1">
                  Closed Exit Date
                </label>
                <DatePicker
                  value={exitDate || ''}
                  onChange={(val) => setExitDate(val || undefined)}
                  placeholder="Exit Date"
                  isClearable={true}
                  className="w-full h-9"
                />
              </div>
            </motion.div>
          )}

          {/* Row E: Core Math metrics */}
          <div className="grid grid-cols-3 gap-3 border-y border-geo-border/60 py-3.5">
            <div>
              <label className="block text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-1">
                Entry Price *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="Rate value"
                value={entryPrice || ''}
                onChange={(e) => setEntryPrice(Number(e.target.value) || 0)}
                className="w-full h-8 bg-geo-bg border border-geo-border hover:border-slate-800 focus:border-blue-500 px-2 text-[10.5px] font-mono text-slate-200 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-1">
                Qty *
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="Unit volume"
                value={quantity || ''}
                onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                className="w-full h-8 bg-geo-bg border border-geo-border hover:border-slate-800 focus:border-blue-500 px-2 text-[10.5px] font-mono text-slate-200 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-1">
                Brokerage Fees
              </label>
              <input
                type="number"
                step="any"
                placeholder="$0.00"
                value={fees || ''}
                onChange={(e) => setFees(Number(e.target.value) || 0)}
                className="w-full h-8 bg-geo-bg border border-geo-border hover:border-slate-800 focus:border-blue-500 px-2 text-[10.5px] font-mono text-slate-200 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Row F: Planifications (SL, Target, Risk Amount) */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-0.5">
                Stop Loss ($)
              </label>
              <input
                type="number"
                step="any"
                placeholder="Limit"
                value={stopLoss || ''}
                onChange={(e) => setStopLoss(Number(e.target.value) || undefined)}
                className="w-full h-8 bg-slate-950/20 border border-geo-border hover:border-slate-800 px-2 text-[10.5px] font-mono text-slate-200 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-0.5">
                Take Target ($)
              </label>
              <input
                type="number"
                step="any"
                placeholder="Goal"
                value={targetPrice || ''}
                onChange={(e) => setTargetPrice(Number(e.target.value) || undefined)}
                className="w-full h-8 bg-slate-950/20 border border-geo-border hover:border-slate-800 px-2 text-[10.5px] font-mono text-slate-202 text-slate-200 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-0.5">
                Conviction Risk ($)
              </label>
              <input
                type="number"
                step="any"
                placeholder="R size"
                value={riskAmount || ''}
                onChange={(e) => setRiskAmount(Number(e.target.value) || undefined)}
                className="w-full h-8 bg-slate-950/20 border border-geo-border hover:border-slate-800 px-2 text-[10.5px] font-mono text-slate-200 outline-none transition-colors"
              />
            </div>
          </div>

          {/* Row F.5: Psychological State / Emotion tagging */}
          <div className="space-y-1.5 border-t border-geo-border/40 pt-3.5">
            <label className="block text-[9.5px] font-mono font-bold tracking-wider text-slate-500 uppercase">
              Psychological / Emotional State tagging
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {EMOTIONS_LIST.map((emo) => {
                const isSelected = emotion === emo.label;
                return (
                  <button
                    key={emo.label}
                    type="button"
                    onClick={() => setEmotion(isSelected ? undefined : emo.label)}
                    className={`p-2 border text-center transition-all cursor-pointer rounded-sm flex flex-col items-center justify-center gap-1 group ${
                      isSelected
                        ? `${emo.bgClass} ${emo.borderClass} ${emo.textClass} scale-102 ring-1 ring-blue-500/10`
                        : 'border-geo-border bg-slate-950/15 text-slate-400 opacity-60 hover:opacity-100 hover:border-slate-800'
                    }`}
                  >
                    <span className="text-sm select-none transition-transform group-hover:scale-110">{emo.emoji}</span>
                    <span className="text-[8.5px] font-mono font-bold truncate max-w-full">{emo.label}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Display active emotion help description */}
            {emotion && (
              <p className="text-[9px] font-mono font-semibold text-slate-400 italic pl-1 leading-relaxed">
                {EMOTIONS_METADATA[emotion].emoji} {EMOTIONS_METADATA[emotion].label}: {EMOTIONS_METADATA[emotion].description}
              </p>
            )}
          </div>

          {/* Row G: Written Reflections */}
          <div>
            <label className="block text-[9.5px] font-mono font-bold tracking-wider text-slate-500 uppercase mb-1">
              Reflections &amp; Setup Context Notes
            </label>
            <textarea
              placeholder="Provide emotional variables, market context, order book observations, execution gaps, etc."
              rows={3}
              maxLength={8192}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-geo-bg border border-geo-border hover:border-slate-800 focus:border-blue-500 p-2.5 text-[11px] font-mono text-slate-200 outline-none resize-y transition-colors min-h-[70px]"
            />
          </div>

          {/* Row H: Interactive File Drag Drop Upload Proofs */}
          <div className="space-y-1.5">
            <label className="block text-[9.5px] font-mono font-bold tracking-wider text-slate-500 uppercase">
              Chart Screenshots Evidence
            </label>
            
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border border-dashed p-4 rounded-sm transition-colors text-center cursor-pointer ${
                isDragOver ? 'border-blue-500 bg-blue-500/5' : 'border-geo-border bg-slate-950/20 hover:border-slate-700'
              }`}
              onClick={() => document.getElementById('screenshot-file-upload')?.click()}
            >
              <Upload size={20} className="mx-auto text-slate-500 mb-1" />
              <p className="text-[10px] font-mono text-slate-300">Drag &amp; Drop Chart Screenshot proof here</p>
              <p className="text-[8px] font-mono text-slate-500 mt-0.5">Or tap to select file manually (under 2MB)</p>
              <input
                id="screenshot-file-upload"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Manual URL entry fallback */}
            <div className="pt-2">
              <span className="text-[8.5px] text-slate-550 text-slate-500 font-mono uppercase block mb-1">Or input custom Image proof URL online:</span>
              <input
                type="url"
                placeholder="https://example.com/chart-blueprint.png"
                value={screenshotInput}
                onChange={(e) => {
                  setScreenshotInput(e.target.value);
                  if (e.target.value && !screenshots.includes(e.target.value)) {
                    setScreenshots((prev) => [...prev, e.target.value]);
                  }
                }}
                className="w-full h-8 bg-geo-bg border border-geo-border hover:border-slate-800 focus:border-blue-505/60 focus:border-blue-500 px-3 text-[10.5px] font-mono text-slate-350 outline-none transition-colors"
              />
            </div>

            {/* Proofs thumbnails preview rail */}
            {screenshots.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-geo-border/40">
                {screenshots.map((url, idx) => (
                  <div key={idx} className="relative w-12 h-12 border border-geo-border bg-slate-950/80 p-0.5">
                    <img src={url} alt="Uploaded thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const next = screenshots.filter((_, i) => i !== idx);
                        setScreenshots(next);
                        if (screenshotInput === url) {
                          setScreenshotInput(next[0] || '');
                        }
                      }}
                      className="absolute -top-1 -right-1 bg-rose-500 hover:bg-rose-600 rounded-full text-white p-0.5 shadow-md cursor-pointer"
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </form>

        {/* Action controls footer */}
        <div className="p-4 border-t border-geo-border bg-slate-950/50 flex items-center justify-end gap-3 font-mono">
          <button
            type="button"
            onClick={onClose}
            className="h-9 border border-slate-800 hover:border-slate-700 hover:text-white px-5 text-[10.5px] uppercase font-bold cursor-pointer rounded-sm bg-slate-950/20 text-slate-400 transition-colors"
          >
            Cancel configuration
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            className="h-9 bg-blue-600 hover:bg-blue-700 active:bg-blue-850 text-white px-6 text-[10.5px] uppercase font-bold cursor-pointer rounded-sm transition-colors"
          >
            Deploy specifications
          </button>
        </div>

      </motion.div>
    </div>
  );
}
