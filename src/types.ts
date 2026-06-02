/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AssetClass = 'Crypto' | 'Forex' | 'Stocks' | 'Commodities' | 'Options';

export type TradeStatus = 'win' | 'loss' | 'breakeven' | 'open';

export type TradeSide = 'long' | 'short';

export interface Trade {
  id: string;
  symbol: string;
  assetClass: AssetClass;
  side: TradeSide;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number; // Manual or auto-estimated net profit/loss
  fees: number;
  setup: string;
  entryDate: string; // ISO DateTime
  exitDate?: string; // ISO DateTime
  status: TradeStatus;
  screenshot?: string; // base64 Data URL (legacy)
  screenshots?: string[]; // Multiple base64 Data URLs
  notes: string;
  riskAmount?: number; // USD amount risked
  targetPrice?: number; // Target price
  stopLoss?: number; // Absolute stop loss
}

export interface DayPnL {
  date: string;
  pnl: number;
  tradeCount: number;
}

export interface SetupStats {
  setup: string;
  winRate: number;
  pnl: number;
  totalTrades: number;
}

export interface TradingStats {
  totalTrades: number;
  openTrades: number;
  winRate: number; // percentage
  profitFactor: number; // gross profits / gross losses
  netPnL: number;
  totalFees: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  avgHoldingTime: string; // string-formatted info
}
