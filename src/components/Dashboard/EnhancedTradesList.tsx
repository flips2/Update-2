import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  MessageSquare, 
  Calendar, 
  Edit3,
  ChevronDown,
  ChevronUp,
  Save,
  X
} from 'lucide-react';
import { Trade } from '../../types';
import { formatCurrency, formatPercentage } from '../../utils/calculations';
import toast from 'react-hot-toast';

interface EnhancedTradesListProps {
  trades: Trade[];
  onDeleteTrade: (tradeId: string) => void;
  onUpdateTrade: (tradeId: string, updatedTrade: Partial<Trade>) => void;
  sessionType: 'Forex' | 'Crypto';
}

const EnhancedTradesList: React.FC<EnhancedTradesListProps> = ({ 
  trades, 
  onDeleteTrade, 
  onUpdateTrade,
  sessionType 
}) => {
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Trade>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const startEditing = (trade: Trade) => {
    setEditingTradeId(trade.id);
    setEditFormData({
      margin: trade.margin,
      roi: trade.roi,
      entry_side: trade.entry_side,
      profit_loss: trade.profit_loss,
      comments: trade.comments,
      // Include session-type specific fields
      ...(sessionType === 'Forex' ? {
        symbol: trade.symbol,
        volume_lot: trade.volume_lot,
        open_price: trade.open_price,
        close_price: trade.close_price,
        tp: trade.tp,
        sl: trade.sl,
        leverage: trade.leverage,
        contract_size: trade.contract_size,
      } : {
        futures_symbol: trade.futures_symbol,
        avg_entry_price: trade.avg_entry_price,
        avg_close_price: trade.avg_close_price,
        direction: trade.direction,
        closing_quantity: trade.closing_quantity,
        realized_pnl: trade.realized_pnl,
        margin_mode: trade.margin_mode,
      })
    });
  };

  const cancelEditing = () => {
    setEditingTradeId(null);
    setEditFormData({});
  };

  const saveEdit = async () => {
    if (!editingTradeId) return;

    try {
      await onUpdateTrade(editingTradeId, editFormData);
      setEditingTradeId(null);
      setEditFormData({});
      toast.success('Trade updated successfully');
    } catch (error) {
      toast.error('Failed to update trade');
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCommentExpansion = (tradeId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(tradeId)) {
        newSet.delete(tradeId);
      } else {
        newSet.add(tradeId);
      }
      return newSet;
    });
  };

  const isCommentLong = (comment: string) => {
    if (!comment) return false;
    // Check if comment has more than 2 lines OR is longer than 100 characters
    return comment.split('\n').length > 2 || comment.length > 100;
  };

  const getTruncatedComment = (comment: string) => {
    if (!comment) return '';
    
    const lines = comment.split('\n');
    
    // If it has multiple lines and more than 3, truncate by lines
    if (lines.length > 2) {
      return lines.slice(0, 3).join('\n') + '...';
    }
    
    // If it's a single long line, truncate by character count
    if (comment.length > 100) {
      return comment.substring(0, 100) + '...';
    }
    
    return comment;
  };

  if (trades.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 text-center h-full">
        <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-400 mb-2">No trades yet</h3>
        <p className="text-slate-500">Add your first trade to start tracking your performance</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col max-h-[1400px]">
      <div className="p-6 border-b border-slate-700 flex-shrink-0">
        <h3 className="text-lg font-semibold text-white">Recent Trades</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-glow min-h-0">
        <div className="space-y-0">
          {trades.map((trade, index) => (
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 border-b border-slate-700 hover:bg-slate-750 transition-colors group last:border-b-0"
            >
              {editingTradeId === trade.id ? (
                // Edit Mode
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        {sessionType === 'Forex' ? 'Symbol' : 'Futures Symbol'}
                      </label>
                      <input
                        type="text"
                        value={sessionType === 'Forex' ? editFormData.symbol || '' : editFormData.futures_symbol || ''}
                        onChange={(e) => handleInputChange(
                          sessionType === 'Forex' ? 'symbol' : 'futures_symbol', 
                          e.target.value
                        )}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        {sessionType === 'Forex' ? 'Volume (Lot)' : 'Closing Quantity'}
                      </label>
                      <input
                        type="number"
                        value={sessionType === 'Forex' ? editFormData.volume_lot || '' : editFormData.closing_quantity || ''}
                        onChange={(e) => handleInputChange(
                          sessionType === 'Forex' ? 'volume_lot' : 'closing_quantity', 
                          parseFloat(e.target.value) || 0
                        )}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        {sessionType === 'Forex' ? 'Open Price' : 'Avg Entry Price'}
                      </label>
                      <input
                        type="number"
                        value={sessionType === 'Forex' ? editFormData.open_price || '' : editFormData.avg_entry_price || ''}
                        onChange={(e) => handleInputChange(
                          sessionType === 'Forex' ? 'open_price' : 'avg_entry_price', 
                          parseFloat(e.target.value) || 0
                        )}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        step="0.00001"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        {sessionType === 'Forex' ? 'Close Price' : 'Avg Close Price'}
                      </label>
                      <input
                        type="number"
                        value={sessionType === 'Forex' ? editFormData.close_price || '' : editFormData.avg_close_price || ''}
                        onChange={(e) => handleInputChange(
                          sessionType === 'Forex' ? 'close_price' : 'avg_close_price', 
                          parseFloat(e.target.value) || 0
                        )}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        step="0.00001"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Margin</label>
                      <input
                        type="number"
                        value={editFormData.margin || ''}
                        onChange={(e) => handleInputChange('margin', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">P/L</label>
                      <input
                        type="number"
                        value={editFormData.profit_loss || ''}
                        onChange={(e) => handleInputChange('profit_loss', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Side</label>
                      <select
                        value={editFormData.entry_side || editFormData.direction || ''}
                        onChange={(e) => handleInputChange(
                          sessionType === 'Forex' ? 'entry_side' : 'direction', 
                          e.target.value
                        )}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      >
                        <option value="Long">Long</option>
                        <option value="Short">Short</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Comments</label>
                    <textarea
                      value={editFormData.comments || ''}
                      onChange={(e) => handleInputChange('comments', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={saveEdit}
                      className="flex items-center px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="flex items-center px-3 py-2 bg-slate-600 text-white rounded text-sm hover:bg-slate-500 transition-colors"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                // View Mode
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className={`p-2 rounded-lg ${
                      trade.profit_loss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                    }`}>
                      {trade.profit_loss >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-white font-medium">
                          {sessionType === 'Forex' ? trade.symbol : trade.futures_symbol || 'N/A'}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-white font-medium">
                          {formatCurrency(trade.margin)}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-300">
                          {formatPercentage(trade.roi)}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          (trade.entry_side || trade.direction) === 'Long' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.entry_side || trade.direction}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-slate-400 mt-1">
                        <Calendar className="w-3 h-3 mr-1" />
                        {new Date(trade.created_at).toLocaleDateString()} at {new Date(trade.created_at).toLocaleTimeString()}
                      </div>
                      
                      {trade.comments && (
                        <div className="mt-2">
                          <div className="flex items-start space-x-2">
                            <MessageSquare className="w-3 h-3 text-slate-400 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <div className="text-sm text-slate-400 whitespace-pre-wrap">
                                {expandedComments.has(trade.id) || !isCommentLong(trade.comments)
                                  ? trade.comments
                                  : getTruncatedComment(trade.comments)
                                }
                              </div>
                              {isCommentLong(trade.comments) && (
                                <button
                                  onClick={() => toggleCommentExpansion(trade.id)}
                                  className="flex items-center text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors"
                                >
                                  {expandedComments.has(trade.id) ? (
                                    <>
                                      <ChevronUp className="w-3 h-3 mr-1" />
                                      Show less
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="w-3 h-3 mr-1" />
                                      Show more
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
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
                    
                    <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditing(trade)}
                        className="p-2 text-slate-400 hover:text-blue-400 transition-colors"
                        title="Edit trade"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteTrade(trade.id)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete trade"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnhancedTradesList;