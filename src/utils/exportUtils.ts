import * as XLSX from 'xlsx';
import { Trade, TradingSession, SessionStats } from '../types';

export const exportToJSON = (session: TradingSession, trades: Trade[], stats: SessionStats) => {
  const exportData = {
    session: {
      name: session.name,
      initial_capital: session.initial_capital,
      current_capital: session.current_capital,
      created_at: session.created_at,
    },
    trades: trades.map(trade => ({
      margin: trade.margin,
      roi: trade.roi,
      entry_side: trade.entry_side,
      profit_loss: trade.profit_loss,
      comments: trade.comments,
      created_at: trade.created_at,
    })),
    statistics: stats,
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `${session.name.replace(/\s+/g, '_')}_trading_session.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

export const exportToExcel = (session: TradingSession, trades: Trade[], stats: SessionStats) => {
  const wb = XLSX.utils.book_new();
  
  // Session Summary Sheet
  const summaryData = [
    ['Session Name', session.name],
    ['Initial Capital', session.initial_capital],
    ['Current Capital', session.current_capital],
    ['Net P/L', stats.netProfitLoss],
    ['Net P/L %', stats.netProfitLossPercentage],
    ['Total Trades', stats.totalTrades],
    ['Win Rate %', stats.winRate],
    ['Winning Trades', stats.winningTrades],
    ['Losing Trades', stats.losingTrades],
    ['Total Margin Used', stats.totalMarginUsed],
    ['Average ROI %', stats.averageROI],
  ];
  
  const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
  
  // Trades Sheet
  const tradesData = [
    ['Date', 'Margin', 'ROI %', 'Entry Side', 'P/L', 'Comments']
  ];
  
  trades.forEach(trade => {
    tradesData.push([
      new Date(trade.created_at).toLocaleDateString(),
      trade.margin,
      trade.roi,
      trade.entry_side,
      trade.profit_loss,
      trade.comments || ''
    ]);
  });
  
  const tradesWS = XLSX.utils.aoa_to_sheet(tradesData);
  XLSX.utils.book_append_sheet(wb, tradesWS, 'Trades');
  
  XLSX.writeFile(wb, `${session.name.replace(/\s+/g, '_')}_trading_session.xlsx`);
};

export const importFromJSON = (file: File): Promise<any> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        resolve(json);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};