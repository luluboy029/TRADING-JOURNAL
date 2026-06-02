/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Trade, AssetClass, TradeSide, TradeStatus } from '../types';
import { Upload, X, HelpCircle, Calculator, Percent, Sparkles, AlertCircle } from 'lucide-react';

interface TradeFormProps {
  initialTrade?: Trade | null;
  onSave: (trade: Omit<Trade, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

const STRATEGY_PRESETS = [
  'Support/Resistance Bounce',
  'Breakout Pullback',
  'EMA Exponential Trend Ribbon',
  'Mean Reversion Core',
  'Volume Spread Analysis',
  'Fibo Retracement Golden Mean',
];

const ASSET_CLASSES: AssetClass[] = ['Crypto', 'Forex', 'Stocks', 'Commodities', 'Options'];

export default function TradeForm({ initialTrade, onSave, onCancel }: TradeFormProps) {
  const [symbol, setSymbol] = useState('');
  const [assetClass, setAssetClass] = useState<AssetClass>('Crypto');
  const [side, setSide] = useState<TradeSide>('long');
  const [status, setStatus] = useState<TradeStatus>('open');
  const [entryPrice, setEntryPrice] = useState<number | ''>('');
  const [exitPrice, setExitPrice] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [pnl, setPnl] = useState<number | ''>('');
  const [fees, setFees] = useState<number>(0);
  const [setup, setSetup] = useState('');
  const [entryDate, setEntryDate] = useState(() => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [exitDate, setExitDate] = useState<string>('');
  const [riskAmount, setRiskAmount] = useState<number | ''>('');
  const [targetPrice, setTargetPrice] = useState<number | ''>('');
  const [stopLoss, setStopLoss] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTrade) {
      setSymbol(initialTrade.symbol);
      setAssetClass(initialTrade.assetClass);
      setSide(initialTrade.side);
      setStatus(initialTrade.status);
      setEntryPrice(initialTrade.entryPrice);
      setExitPrice(initialTrade.exitPrice ?? '');
      setQuantity(initialTrade.quantity);
      setPnl(initialTrade.pnl ?? '');
      setFees(initialTrade.fees);
      setSetup(initialTrade.setup);
      if (initialTrade.entryDate) {
        const d = new Date(initialTrade.entryDate);
        setEntryDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      }
      if (initialTrade.exitDate) {
        const d = new Date(initialTrade.exitDate);
        setExitDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      } else {
        setExitDate('');
      }
      setRiskAmount(initialTrade.riskAmount ?? '');
      setTargetPrice(initialTrade.targetPrice ?? '');
      setStopLoss(initialTrade.stopLoss ?? '');
      setNotes(initialTrade.notes);
      
      if (initialTrade.screenshots && initialTrade.screenshots.length > 0) {
        setScreenshots(initialTrade.screenshots);
      } else if (initialTrade.screenshot) {
        setScreenshots([initialTrade.screenshot]);
      } else {
        setScreenshots([]);
      }
    }
  }, [initialTrade]);

  useEffect(() => {
    if (status === 'open') {
      setExitPrice('');
      setPnl('');
      setExitDate('');
    } else {
      if (!exitDate) {
        const d = new Date();
        setExitDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      }
    }
  }, [status]);

  const handleAutoCalcPnL = () => {
    if (entryPrice === '' || quantity === '') {
      alert('Requires Entry Price and Position Size/Quantity to estimate yields.');
      return;
    }

    const currentExit = exitPrice !== '' ? Number(exitPrice) : Number(entryPrice);
    const entry = Number(entryPrice);
    const qty = Number(quantity);
    const isLong = side === 'long';

    let rawPnL = 0;
    if (isLong) {
      rawPnL = (currentExit - entry) * qty;
    } else {
      rawPnL = (entry - currentExit) * qty;
    }

    const calculatedPnL = Math.round((rawPnL - fees) * 100) / 100;
    setPnl(calculatedPnL);

    if (status === 'open' || status === 'breakeven') {
      if (calculatedPnL > 1) {
        setStatus('win');
      } else if (calculatedPnL < -1) {
        setStatus('loss');
      } else {
        setStatus('breakeven');
      }
    }
  };

  const handleFiles = (filesList: FileList | File[]) => {
    const files = Array.from(filesList);
    const validImageFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`File "${file.name}" is not an image. Only image uploads (.png, .jpg, .jpeg, .webp) are supported.`);
        return false;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert(`Image "${file.name}" should be under 2MB to optimize visual cache thresholds.`);
        return false;
      }
      return true;
    });

    if (validImageFiles.length === 0) return;

    const readPromises = validImageFiles.map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          resolve(base64);
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises)
      .then(base64Images => {
        setScreenshots(prev => [...prev, ...base64Images]);
      })
      .catch(err => {
        console.error(err);
        alert('Error processing one or more uploaded images.');
      });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!symbol.trim()) {
      alert('Trade symbol parameter is required.');
      return;
    }
    if (entryPrice === '' || Number(entryPrice) <= 0) {
      alert('A valid entry price is required.');
      return;
    }
    if (quantity === '' || Number(quantity) <= 0) {
      alert('A valid position quantity/size is required.');
      return;
    }

    const tradeToSave: Omit<Trade, 'id'> & { id?: string } = {
      symbol: symbol.toUpperCase().trim(),
      assetClass,
      side,
      status,
      entryPrice: Number(entryPrice),
      exitPrice: exitPrice !== '' ? Number(exitPrice) : undefined,
      quantity: Number(quantity),
      pnl: pnl !== '' ? Number(pnl) : undefined,
      fees: Number(fees),
      setup: setup.trim(),
      entryDate: new Date(entryDate).toISOString(),
      exitDate: exitDate ? new Date(exitDate).toISOString() : undefined,
      riskAmount: riskAmount !== '' ? Number(riskAmount) : undefined,
      targetPrice: targetPrice !== '' ? Number(targetPrice) : undefined,
      stopLoss: stopLoss !== '' ? Number(stopLoss) : undefined,
      notes: notes.trim(),
      screenshot: screenshots[0] || undefined,
      screenshots: screenshots,
    };

    if (initialTrade?.id) {
      tradeToSave.id = initialTrade.id;
    }

    onSave(tradeToSave);
  };

  const rewardToRiskRatio = (() => {
    if (entryPrice === '' || targetPrice === '' || stopLoss === '') return null;
    const entry = Number(entryPrice);
    const target = Number(targetPrice);
    const sl = Number(stopLoss);

    if (side === 'long') {
      const risk = entry - sl;
      const reward = target - entry;
      if (risk <= 0 || reward <= 0) return null;
      return (reward / risk).toFixed(2);
    } else {
      const risk = sl - entry;
      const reward = entry - target;
      if (risk <= 0 || reward <= 0) return null;
      return (reward / risk).toFixed(2);
    }
  })();

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-slate-100 bg-geo-panel border border-geo-border p-6 rounded-sm shadow-none max-w-4xl mx-auto" id="trade-form">
      <div>
        <h2 className="text-lg font-bold text-slate-100 font-display uppercase tracking-wider border-b border-geo-border pb-2.5">
          {initialTrade ? 'Update Journal Log' : 'Record New Position'}
        </h2>
        <p className="text-[11px] text-slate-500 font-mono mt-1">Populate trade mechanics, strategies, outcomes, and attach graph screenshot proof</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Symbol and Asset Class Group */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div id="form-symbol">
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1.5">Symbol / Asset</label>
              <input
                type="text"
                placeholder="e.g. BTC/USDT"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
                className="w-full h-10 bg-geo-bg border border-geo-border rounded-sm px-3 text-xs font-mono tracking-wide text-white placeholder-slate-700 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div id="form-asset-class">
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1.5">Asset Class</label>
              <select
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value as AssetClass)}
                className="w-full h-10 bg-geo-bg border border-geo-border rounded-sm px-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500/50"
              >
                {ASSET_CLASSES.map((ac) => (
                  <option key={ac} value={ac}>
                    {ac}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Side / Type Segmented Button */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1.5">Execution Side</label>
            <div className="grid grid-cols-2 gap-1.5 bg-geo-bg border border-geo-border p-1 rounded-sm" id="side-toggle font-mono">
              <button
                type="button"
                onClick={() => setSide('long')}
                className={`py-1.5 text-xs font-bold rounded-sm uppercase tracking-wider font-mono ${
                  side === 'long'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                    : 'text-slate-500 border border-transparent hover:text-slate-350'
                }`}
              >
                BUY / LONG
              </button>
              <button
                type="button"
                onClick={() => setSide('short')}
                className={`py-1.5 text-xs font-bold rounded-sm uppercase tracking-wider font-mono ${
                  side === 'short'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25'
                    : 'text-slate-500 border border-transparent hover:text-slate-350'
                }`}
              >
                SELL / SHORT
              </button>
            </div>
          </div>

          {/* Status Segmented Buttons */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1.5">Outcome Status</label>
            <div className="grid grid-cols-4 gap-1 bg-geo-bg border border-geo-border p-1 rounded-sm" id="status-toggle font-mono">
              {(['open', 'win', 'loss', 'breakeven'] as TradeStatus[]).map((st) => {
                const isActive = status === st;
                let activeStyle = '';
                if (st === 'open') activeStyle = 'bg-blue-500/10 text-blue-400 border border-blue-400/25';
                else if (st === 'win') activeStyle = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25';
                else if (st === 'loss') activeStyle = 'bg-rose-500/10 text-rose-455 text-rose-400 border border-rose-500/25';
                else activeStyle = 'bg-slate-800 text-slate-200 border border-geo-border';

                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatus(st)}
                    className={`py-1.5 text-[9px] font-bold font-mono rounded-sm uppercase border transition-colors ${
                      isActive ? activeStyle : 'text-slate-550 border-transparent hover:text-slate-300'
                    }`}
                  >
                    {st === 'open' ? 'active' : st === 'breakeven' ? 'even' : st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pricing parameters and quantitative variables */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1.5">Entry Price ($)</label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value === '' ? '' : Number(e.target.value))}
                required
                placeholder="0.00"
                className="w-full h-10 bg-geo-bg border border-geo-border rounded-sm px-3 text-xs font-mono text-white placeholder-slate-800 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1.5">
                Exit Price ($) {status === 'open' && <span className="text-slate-600 font-normal italic">(Active)</span>}
              </label>
              <input
                type="number"
                step="any"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                disabled={status === 'open'}
                placeholder={status === 'open' ? 'Active open chart' : '0.00'}
                className="w-full h-10 bg-geo-bg border border-geo-border rounded-sm px-3 text-xs font-mono text-white placeholder-slate-800 focus:outline-none focus:border-blue-500/50 disabled:opacity-30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1.5">Quantity / Size</label>
              <input
                type="number"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                required
                placeholder="e.g. 100 or 0.25"
                className="w-full h-10 bg-geo-bg border border-geo-border rounded-sm px-3 text-xs font-mono text-white placeholder-slate-800 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1.5">Commissions &amp; Fees ($)</label>
              <input
                type="number"
                step="any"
                value={fees === 0 ? '' : fees}
                onChange={(e) => setFees(e.target.value === '' ? 0 : Number(e.target.value))}
                placeholder="0.00"
                className="w-full h-10 bg-geo-bg border border-geo-border rounded-sm px-3 text-xs font-mono text-white placeholder-slate-800 focus:outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          {/* manual yield calculation or auto estimate picker */}
          <div className="bg-geo-bg border border-geo-border p-3.5 rounded-sm space-y-3" id="pnl-calculator-box">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase">Net Trade Yield / PNL ($)</label>
              {status !== 'open' && (
                <button
                  type="button"
                  onClick={handleAutoCalcPnL}
                  className="flex items-center gap-1.5 py-1 px-2.5 bg-geo-panel border border-geo-border hover:border-blue-500/50 text-[9px] font-bold font-mono text-blue-400 rounded-sm transition-colors"
                >
                  <Calculator size={11} /> Recalculate
                </button>
              )}
            </div>
            <input
              type="number"
              step="any"
              value={pnl}
              onChange={(e) => setPnl(e.target.value === '' ? '' : Number(e.target.value))}
              disabled={status === 'open'}
              placeholder={status === 'open' ? 'Calculated on close' : 'Enter value or trigger autocalc'}
              className="w-full h-10 bg-geo-bg border border-geo-border rounded-sm px-3 text-xs font-mono text-white placeholder-slate-800 focus:outline-none focus:border-blue-500/50 disabled:opacity-30"
            />
          </div>
        </div>

        {/* Preset strategies chip suggestions */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1.5">Entry Timestamp</label>
              <input
                type="datetime-local"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
                className="w-full h-10 bg-geo-bg border border-geo-border rounded-sm px-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1.5">Exit Timestamp</label>
              <input
                type="datetime-local"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                disabled={status === 'open'}
                className="w-full h-10 bg-geo-bg border border-geo-border rounded-sm px-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500/50 disabled:opacity-30"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1.5">Trading Strategy / Setup</label>
            <input
              type="text"
              placeholder="Select preset suggestion or record custom label"
              value={setup}
              onChange={(e) => setSetup(e.target.value)}
              className="w-full h-10 bg-geo-bg border border-geo-border rounded-sm px-3 text-xs font-mono text-slate-200 placeholder-slate-700 focus:outline-none focus:border-blue-500/50"
            />
            {/* Strategy Presets suggestions row */}
            <div className="flex flex-wrap gap-1.5 mt-2" id="strategy-chips">
              {STRATEGY_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSetup(preset)}
                  className={`text-[9px] font-mono px-2 py-1 rounded-sm border transition-colors ${
                    setup === preset
                      ? 'bg-blue-600/10 text-blue-400 border-blue-500/30 font-bold'
                      : 'bg-geo-bg text-slate-400 border-geo-border hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Risk calculations */}
          <div className="grid grid-cols-3 gap-3 bg-geo-bg p-3.5 rounded-sm border border-geo-border" id="risk-parameter-panel font-mono">
            <div>
              <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block mb-1">Max Risk ($)</label>
              <input
                type="number"
                step="any"
                value={riskAmount}
                onChange={(e) => setRiskAmount(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="USD"
                className="w-full h-8 bg-geo-panel border border-geo-border rounded-sm px-2 text-xs font-mono text-white placeholder-slate-800 focus:outline-none focus:border-blue-500/30"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block mb-1">Target TP ($)</label>
              <input
                type="number"
                step="any"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Target"
                className="w-full h-8 bg-geo-panel border border-geo-border rounded-sm px-2 text-xs font-mono text-white placeholder-slate-800 focus:outline-none focus:border-blue-500/30"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold text-slate-500 font-mono uppercase block mb-1">Stop Loss ($)</label>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Stop"
                className="w-full h-8 bg-geo-panel border border-geo-border rounded-sm px-2 text-xs font-mono text-white placeholder-slate-800 focus:outline-none focus:border-blue-500/30"
              />
            </div>
            {rewardToRiskRatio && (
              <div className="col-span-3 flex items-center justify-between border-t border-geo-border pt-2.5 mt-1 text-[9px] font-mono uppercase tracking-wider">
                <span className="text-slate-500 flex items-center gap-1">Risk Multiplier Reward :</span>
                <span className="text-blue-400 font-bold">{rewardToRiskRatio}:1 ratio</span>
              </div>
            )}
          </div>

          {/* Screenshot proof drag block (Drag and drop layout supported) */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1.5">
              Trade Chart Screenshot Attachments ({screenshots.length})
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
            {screenshots.length === 0 ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-sm p-5 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-geo-border bg-geo-bg hover:border-slate-750 hover:bg-geo-bg/85'
                }`}
                id="screenshot-dropzone"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload size={18} className={isDragging ? 'text-blue-400 animate-pulse' : 'text-slate-500'} />
                  <span className="text-xs font-bold text-slate-300 font-mono uppercase">Upload Screenshot Proofs</span>
                  <span className="text-[9px] text-slate-500 font-mono">Drag graph image files here, or tap to browse folders (multiple allowed)</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" id="screenshots-grid-container">
                  {screenshots.map((src, index) => (
                    <div key={index} className="relative group border border-geo-border bg-geo-bg rounded-sm overflow-hidden aspect-[4/3] flex items-center justify-center">
                      <img
                        src={src}
                        alt={`Trade screenshot proof ${index + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setScreenshots(prev => prev.filter((_, idx) => idx !== index))}
                        className="absolute top-1.5 right-1.5 p-1 bg-geo-header/90 text-rose-400 hover:text-rose-300 rounded-sm border border-geo-border/50 shadow-md transition-all opacity-100 sm:opacity-0 group-hover:opacity-100"
                      >
                        <X size={10} />
                      </button>
                      <div className="absolute bottom-1 left-1.5 px-1.5 py-0.5 bg-black/60 rounded-[2px] text-[8px] font-mono text-slate-300">
                        #{index + 1}
                      </div>
                    </div>
                  ))}

                  {/* Tiny dropzone placeholder inside grid */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-dashed rounded-sm flex flex-col items-center justify-center cursor-pointer aspect-[4/3] transition-colors ${
                      isDragging
                        ? 'border-blue-500 bg-blue-500/5'
                        : 'border-geo-border bg-geo-bg/50 hover:border-slate-705 hover:bg-geo-bg/85'
                    }`}
                  >
                    <Upload size={14} className="text-slate-500 mb-1" />
                    <span className="text-[9px] font-bold text-slate-400 font-mono uppercase">Add Image</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setScreenshots([])}
                  className="text-[9px] font-mono text-rose-450 text-rose-400 hover:underline uppercase block tracking-wider text-left"
                >
                  Clear All Screenshots
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Observational notes */}
      <div id="form-notes-field">
        <label className="text-[10px] font-bold text-slate-400 font-mono uppercase block mb-1.5">Performance Notes &amp; Rules Compliance</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What observations led to trade placement? Detail any psychological triggers, criteria follow-throughs, errors, or long term takeaways."
          className="w-full bg-geo-bg border border-geo-border rounded-sm p-3 text-xs font-mono text-slate-200 placeholder-slate-700 focus:outline-none focus:border-blue-500/50"
        />
      </div>

      {/* Footer controls */}
      <div className="flex items-center justify-end gap-3 border-t border-geo-border pt-4" id="form-footer-buttons">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-geo-bg hover:bg-geo-header border border-geo-border text-slate-400 hover:text-slate-250 text-xs font-bold font-mono rounded-sm transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold font-mono rounded-sm transition-colors"
        >
          {initialTrade ? 'Save Changes' : 'Record Trade'}
        </button>
      </div>
    </form>
  );
}
