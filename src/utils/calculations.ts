import { Trade, SessionStats } from '../types';

export const calculateProfitLoss = (margin: number, roi: number): number => {
  return (margin * roi) / 100;
};

export const calculateSessionStats = (trades: Trade[], initialCapital: number): SessionStats => {
  const totalTrades = trades.length;
  
  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      currentCapital: initialCapital,
      netProfitLoss: 0,
      netProfitLossPercentage: 0,
      totalMarginUsed: 0,
      averageROI: 0,
      winningTrades: 0,
      losingTrades: 0,
    };
  }

  const winningTrades = trades.filter(trade => trade.profit_loss > 0).length;
  const losingTrades = trades.filter(trade => trade.profit_loss < 0).length;
  const winRate = (winningTrades / totalTrades) * 100;
  
  const netProfitLoss = trades.reduce((sum, trade) => sum + trade.profit_loss, 0);
  const currentCapital = initialCapital + netProfitLoss;
  const netProfitLossPercentage = ((currentCapital - initialCapital) / initialCapital) * 100;
  
  const totalMarginUsed = trades.reduce((sum, trade) => sum + trade.margin, 0);
  const averageROI = trades.reduce((sum, trade) => sum + trade.roi, 0) / totalTrades;

  return {
    totalTrades,
    winRate,
    currentCapital,
    netProfitLoss,
    netProfitLossPercentage,
    totalMarginUsed,
    averageROI,
    winningTrades,
    losingTrades,
  };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
};