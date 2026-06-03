/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AssetClassType = 'Crypto' | 'Forex' | 'Stocks' | 'Commodities' | 'Options';
export type SideType = 'long' | 'short';
export type StatusType = 'win' | 'loss' | 'breakeven' | 'open';
export type EmotionType = 'Disciplined' | 'FOMO' | 'Greed' | 'Fear' | 'Patient' | 'Anxious' | 'Revenge' | 'Overconfident';

export interface TradeEntry {
  id: string;
  ownerId?: string;
  symbol: string;
  assetClass: AssetClassType;
  side: SideType;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  pnl?: number;
  fees: number;
  setup: string;
  entryDate: string; // YYYY-MM-DD
  exitDate?: string;  // YYYY-MM-DD
  status: StatusType;
  screenshot?: string;
  screenshots?: string[];
  notes: string;
  riskAmount?: number;
  targetPrice?: number;
  stopLoss?: number;
  emotion?: EmotionType;
  closedPrice?: number;
}

export interface TradeStats {
  netProfit: number;
  grossProfit: number;
  grossLoss: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  openTrades: number;
  totalFees: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
}
