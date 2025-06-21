import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Trash2 } from 'lucide-react';
import { TradingSession } from '../../types';
import { formatCurrency, formatPercentage } from '../../utils/calculations';

interface SessionCardProps {
  session: TradingSession;
  stats: {
    totalTrades: number;
    winRate: number;
    netProfitLoss: number;
    netProfitLossPercentage: number;
  };
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  stats,
  isActive,
  onClick,
  onDelete,
}) => {
  const profitColor = stats.netProfitLoss >= 0 ? 'text-green-400' : 'text-red-400';
  const profitBg = stats.netProfitLoss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`bg-slate-800 rounded-xl p-6 border transition-all cursor-pointer group ${
        isActive 
          ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
          : 'border-slate-700 hover:border-slate-600'
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">{session.name}</h3>
          <p className="text-slate-400 text-sm flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            {new Date(session.created_at).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-400 transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-slate-400 text-sm">Initial Capital</p>
          <p className="text-white font-medium">{formatCurrency(session.initial_capital)}</p>
        </div>
        <div>
          <p className="text-slate-400 text-sm">Current Capital</p>
          <p className="text-white font-medium">{formatCurrency(session.current_capital)}</p>
        </div>
      </div>

      <div className={`${profitBg} rounded-lg p-3 mb-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {stats.netProfitLoss >= 0 ? (
              <TrendingUp className="w-5 h-5 text-green-400 mr-2" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400 mr-2" />
            )}
            <span className="text-slate-300 text-sm">Net P/L</span>
          </div>
          <div className="text-right">
            <p className={`font-semibold ${profitColor}`}>
              {formatCurrency(stats.netProfitLoss)}
            </p>
            <p className={`text-sm ${profitColor}`}>
              {formatPercentage(stats.netProfitLossPercentage)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Trades: {stats.totalTrades}</span>
        <span className="text-slate-400">Win Rate: {stats.winRate.toFixed(1)}%</span>
      </div>
    </motion.div>
  );
};

export default SessionCard;