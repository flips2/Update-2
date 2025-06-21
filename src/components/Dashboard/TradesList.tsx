import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Trash2, MessageSquare, Calendar } from 'lucide-react';
import { Trade } from '../../types';
import { formatCurrency, formatPercentage } from '../../utils/calculations';

interface TradesListProps {
  trades: Trade[];
  onDeleteTrade: (tradeId: string) => void;
}

const TradesList: React.FC<TradesListProps> = ({ trades, onDeleteTrade }) => {
  if (trades.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center">
        <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-400 mb-2">No trades yet</h3>
        <p className="text-slate-500">Add your first trade to start tracking your performance</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-6 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white">Recent Trades</h3>
      </div>
      
      <div className="max-h-96 overflow-y-auto scrollbar-glow">
        <div className="space-y-0">
          {trades.map((trade, index) => (
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 border-b border-slate-700 hover:bg-slate-750 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    trade.profit_loss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}>
                    {trade.profit_loss >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="text-white font-medium">
                        {formatCurrency(trade.margin)}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-300">
                        {formatPercentage(trade.roi)}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.entry_side === 'Long' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.entry_side}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm text-slate-400 mt-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(trade.created_at).toLocaleDateString()} at {new Date(trade.created_at).toLocaleTimeString()}
                    </div>
                    
                    {trade.comments && (
                      <div className="flex items-center text-sm text-slate-400 mt-1">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        {trade.comments}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className={`font-semibold ${
                      trade.profit_loss >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatCurrency(trade.profit_loss)}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => onDeleteTrade(trade.id)}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TradesList;