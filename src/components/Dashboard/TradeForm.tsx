import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Calculator, Sparkles, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';
import { Trade } from '../../types';
import { formatCurrency } from '../../utils/calculations';
import toast from 'react-hot-toast';

interface TradeFormProps {
  onAddTrade: (trade: Omit<Trade, 'id' | 'created_at'>) => void;
  sessionId: string;
  extractedTradeData?: any;
}

const TradeForm: React.FC<TradeFormProps> = ({ onAddTrade, sessionId, extractedTradeData }) => {
  const [margin, setMargin] = useState('');
  const [roiAmount, setRoiAmount] = useState('');
  const [entrySide, setEntrySide] = useState<'Long' | 'Short'>('Long');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-populate form when trade data is extracted from image
  useEffect(() => {
    if (extractedTradeData) {
      // Calculate margin from entry price and volume if available
      if (extractedTradeData.entryPrice && extractedTradeData.volume) {
        const calculatedMargin = extractedTradeData.entryPrice * extractedTradeData.volume;
        setMargin(calculatedMargin.toString());
      }
      
      // Set profit/loss amount
      if (extractedTradeData.profit) {
        setRoiAmount(extractedTradeData.profit.toString());
      }
      
      // Set entry side
      if (extractedTradeData.side) {
        setEntrySide(extractedTradeData.side);
      }
      
      // Set comments with extracted data
      let autoComments = `Auto-extracted from screenshot:\n`;
      if (extractedTradeData.symbol) {
        autoComments += `Symbol: ${extractedTradeData.symbol}\n`;
      }
      if (extractedTradeData.entryPrice) {
        autoComments += `Entry: ${extractedTradeData.entryPrice}\n`;
      }
      if (extractedTradeData.exitPrice) {
        autoComments += `Exit: ${extractedTradeData.exitPrice}\n`;
      }
      if (extractedTradeData.openTime) {
        autoComments += `Open Time: ${extractedTradeData.openTime}\n`;
      }
      if (extractedTradeData.closeTime) {
        autoComments += `Close Time: ${extractedTradeData.closeTime}`;
      }
      
      setComments(autoComments);
      
      toast.success('Trade form auto-populated with extracted data!');
    }
  }, [extractedTradeData]);

  // Calculate ROI percentage from dollar amount
  const roiPercentage = margin && roiAmount ? (Number(roiAmount) / Number(margin)) * 100 : 0;
  const profitLoss = roiAmount ? Number(roiAmount) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!margin || !roiAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const trade: Omit<Trade, 'id' | 'created_at'> = {
        session_id: sessionId,
        margin: Number(margin),
        roi: roiPercentage, // Store calculated percentage for consistency
        entry_side: entrySide,
        profit_loss: profitLoss, // Use the dollar amount directly
        comments: comments.trim() || undefined,
      };

      await onAddTrade(trade);
      
      // Reset form
      setMargin('');
      setRoiAmount('');
      setEntrySide('Long');
      setComments('');
      
      toast.success('Trade added successfully');
    } catch (error) {
      toast.error('Failed to add trade');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setMargin('');
    setRoiAmount('');
    setEntrySide('Long');
    setComments('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800 rounded-xl p-6 border border-slate-700"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Add New Trade
        </h3>
        
        {extractedTradeData && (
          <div className="flex items-center text-purple-400 text-sm">
            <Sparkles className="w-4 h-4 mr-1" />
            AI Extracted
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Margin (USD)
            </label>
            <input
              type="number"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
              className="no-spinner w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter margin amount"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              ROI Amount (USD)
            </label>
            <input
              type="number"
              value={roiAmount}
              onChange={(e) => setRoiAmount(e.target.value)}
              className="no-spinner w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="Enter profit/loss amount"
              step="0.01"
              required
            />
          </div>
        </div>

        {/* Compact Long/Short Toggle Buttons */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Entry Side
          </label>
          <div className="grid grid-cols-2 gap-2">
            {/* Long Button - Compact */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setEntrySide('Long')}
              className={`relative group overflow-hidden rounded-lg px-3 py-2 transition-all duration-300 ${
                entrySide === 'Long'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-400/50 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-700/50 border border-slate-600/30 hover:border-slate-500/50'
              }`}
            >
              {/* Content */}
              <div className="relative flex items-center justify-center space-x-2">
                <div className={`p-1 rounded-full transition-all duration-300 ${
                  entrySide === 'Long'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-600/50 text-slate-400 group-hover:text-slate-300'
                }`}>
                  <TrendingUp className="w-3 h-3" />
                </div>
                
                <span className={`font-medium text-sm transition-colors duration-300 ${
                  entrySide === 'Long' ? 'text-white' : 'text-slate-300 group-hover:text-white'
                }`}>
                  Long
                </span>
                
                {/* Selection indicator */}
                {entrySide === 'Long' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                  </motion.div>
                )}
              </div>
            </motion.button>
            
            {/* Short Button - Compact */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setEntrySide('Short')}
              className={`relative group overflow-hidden rounded-lg px-3 py-2 transition-all duration-300 ${
                entrySide === 'Short'
                  ? 'bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-400/50 shadow-md shadow-red-500/20'
                  : 'bg-slate-700/50 border border-slate-600/30 hover:border-slate-500/50'
              }`}
            >
              {/* Content */}
              <div className="relative flex items-center justify-center space-x-2">
                <div className={`p-1 rounded-full transition-all duration-300 ${
                  entrySide === 'Short'
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-slate-600/50 text-slate-400 group-hover:text-slate-300'
                }`}>
                  <TrendingDown className="w-3 h-3" />
                </div>
                
                <span className={`font-medium text-sm transition-colors duration-300 ${
                  entrySide === 'Short' ? 'text-white' : 'text-slate-300 group-hover:text-white'
                }`}>
                  Short
                </span>
                
                {/* Selection indicator */}
                {entrySide === 'Short' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <CheckCircle className="w-3 h-3 text-red-400" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          </div>
        </div>

        {margin && roiAmount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-700 rounded-lg p-4 border border-slate-600"
          >
            <div className="flex items-center text-slate-300 mb-2">
              <Calculator className="w-4 h-4 mr-2" />
              Calculated Metrics
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">ROI Percentage</p>
                <p className="text-lg font-bold text-blue-400">
                  {roiPercentage.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">P/L Amount</p>
                <p className={`text-lg font-bold ${profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(profitLoss)}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Comments (Optional)
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
            placeholder="Add notes about this trade..."
            rows={extractedTradeData ? 6 : 3}
          />
        </div>

        <div className="flex space-x-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Add Trade
              </>
            )}
          </motion.button>
          
          {extractedTradeData && (
            <button
              type="button"
              onClick={clearForm}
              className="px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>
    </motion.div>
  );
};

export default TradeForm;