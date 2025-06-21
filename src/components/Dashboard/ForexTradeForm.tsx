import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Image as ImageIcon, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Plus,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Clock,
  Calculator
} from 'lucide-react';
import { Trade, ExtractedTradeData } from '../../types';
import { enhancedAiService } from '../../services/enhancedAiService';
import { formatCurrency } from '../../utils/calculations';
import toast from 'react-hot-toast';

interface ForexTradeFormProps {
  onAddTrade: (trade: Omit<Trade, 'id' | 'created_at'>) => void;
  sessionId: string;
}

const ForexTradeForm: React.FC<ForexTradeFormProps> = ({ onAddTrade, sessionId }) => {
  // Form state
  const [formData, setFormData] = useState({
    symbol: '',
    type: 'Buy',
    volumeLot: '',
    openPrice: '',
    closePrice: '',
    tp: '',
    sl: '',
    position: 'Closed',
    openTime: '',
    closeTime: '',
    reason: 'Other',
    pnlUsd: '',
    margin: '1000',
    leverage: '1000',
    contractSize: '100',
    roi: '',
    entrySide: 'Long' as 'Long' | 'Short',
    comments: ''
  });

  // Image upload state
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'success' | 'error' | 'quota_exceeded'>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Calculate margin automatically when relevant fields change
  useEffect(() => {
    if (formData.volumeLot && formData.openPrice && formData.leverage && formData.contractSize) {
      const lotSize = parseFloat(formData.volumeLot);
      const openPrice = parseFloat(formData.openPrice);
      const leverage = parseFloat(formData.leverage);
      const contractSize = parseFloat(formData.contractSize);
      
      if (lotSize > 0 && openPrice > 0 && leverage > 0 && contractSize > 0) {
        const calculatedMargin = (lotSize * contractSize * openPrice) / leverage;
        setFormData(prev => ({ ...prev, margin: calculatedMargin.toFixed(2) }));
      }
    }
  }, [formData.volumeLot, formData.openPrice, formData.leverage, formData.contractSize]);

  const validateFile = (file: File): string | null => {
    if (!file.type.startsWith('image/')) {
      return 'Please select an image file (PNG, JPG, JPEG)';
    }
    
    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB';
    }
    
    return null;
  };

  const handleFile = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setExtractionStatus('error');
      return;
    }

    setError('');
    setFileName(file.name);
    setExtractionStatus('idle');
    setRetryCount(0);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const extractTradeData = async () => {
    if (!preview) return;

    setIsExtracting(true);
    setExtractionStatus('idle');

    try {
      // Convert preview back to file for analysis
      const response = await fetch(preview);
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: blob.type });

      const extractedData = await enhancedAiService.analyzeScreenshot(file);
      
      // Helper function to convert ISO string to datetime-local format
      const formatForDateTimeLocal = (isoString: string | undefined): string => {
        if (!isoString) {
          return new Date().toISOString().slice(0, 16);
        }
        // Convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
        return new Date(isoString).toISOString().slice(0, 16);
      };
      
      // Populate form with extracted data including dates
      const openTime = formatForDateTimeLocal(extractedData.openTime);
      const closeTime = formatForDateTimeLocal(extractedData.closeTime);
      
      // Add debug logging to verify time conversion
      console.log('Raw extracted times:', {
        openTime: extractedData.openTime,
        closeTime: extractedData.closeTime
      });
      console.log('Converted for form:', {
        openTime,
        closeTime
      });
      
      setFormData(prev => ({
        ...prev,
        symbol: extractedData.symbol || '',
        type: extractedData.type || 'Buy',
        volumeLot: extractedData.volumeLot?.toString() || '',
        openPrice: extractedData.openPrice?.toString() || '',
        closePrice: extractedData.closePrice?.toString() || '',
        tp: extractedData.tp?.toString() || '',
        sl: extractedData.sl?.toString() || '',
        position: extractedData.position || 'Closed',
        openTime: openTime,
        closeTime: closeTime,
        reason: extractedData.reason || 'Other',
        pnlUsd: extractedData.pnlUsd?.toString() || '',
        leverage: extractedData.leverage?.toString() || prev.leverage,
        contractSize: extractedData.contractSize?.toString() || prev.contractSize,
        entrySide: extractedData.type === 'Buy' ? 'Long' : 'Short',
        comments: `Auto-extracted from ${fileName}`
      }));

      setExtractionStatus('success');
      toast.success('Trade data extracted successfully!');
    } catch (error: any) {
      console.error('Extraction error:', error);
      
      if (error.message?.includes('quota') || error.message?.includes('429')) {
        setExtractionStatus('quota_exceeded');
        setError('AI analysis is temporarily unavailable due to high demand. Please try again in a few minutes or enter data manually.');
        toast.error('AI service is busy. Try again in a few minutes!');
      } else {
        setExtractionStatus('error');
        setError('Failed to extract trade data. Please try again or enter data manually.');
        toast.error('Failed to extract trade data');
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const retryExtraction = async () => {
    if (retryCount >= 3) {
      toast.error('Maximum retry attempts reached. Please try again later.');
      return;
    }
    
    setRetryCount(prev => prev + 1);
    
    // Wait before retrying (exponential backoff)
    const delay = Math.pow(2, retryCount) * 1000;
    toast.loading(`Retrying in ${delay / 1000} seconds...`, { duration: delay });
    
    setTimeout(() => {
      extractTradeData();
    }, delay);
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
      e.dataTransfer.clearData();
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const clearUpload = () => {
    setPreview(null);
    setFileName('');
    setExtractionStatus('idle');
    setError('');
    setRetryCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Clipboard paste handler
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              handleFile(blob);
            }
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handleFile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const calculateROI = () => {
    const margin = parseFloat(formData.margin);
    const pnl = parseFloat(formData.pnlUsd);
    if (margin && pnl) {
      return ((pnl / margin) * 100).toFixed(2);
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.margin || !formData.pnlUsd) {
      toast.error('Please fill in margin and P/L fields');
      return;
    }

    setLoading(true);

    try {
      const trade: Omit<Trade, 'id' | 'created_at'> = {
        session_id: sessionId,
        margin: parseFloat(formData.margin),
        roi: parseFloat(calculateROI() || '0'),
        entry_side: formData.entrySide,
        profit_loss: parseFloat(formData.pnlUsd),
        comments: formData.comments || undefined,
        // Enhanced fields
        symbol: formData.symbol || undefined,
        volume_lot: formData.volumeLot ? parseFloat(formData.volumeLot) : undefined,
        open_price: formData.openPrice ? parseFloat(formData.openPrice) : undefined,
        close_price: formData.closePrice ? parseFloat(formData.closePrice) : undefined,
        tp: formData.tp ? parseFloat(formData.tp) : undefined,
        sl: formData.sl ? parseFloat(formData.sl) : undefined,
        position: formData.position as 'Open' | 'Closed' || undefined,
        open_time: formData.openTime || undefined,
        close_time: formData.closeTime || undefined,
        reason: formData.reason as 'TP' | 'SL' | 'Early Close' | 'Other' || undefined,
        // Forex specific
        leverage: formData.leverage ? parseFloat(formData.leverage) : undefined,
        contract_size: formData.contractSize ? parseFloat(formData.contractSize) : undefined,
      };

      await onAddTrade(trade);
      
      // Reset form
      setFormData({
        symbol: '',
        type: 'Buy',
        volumeLot: '',
        openPrice: '',
        closePrice: '',
        tp: '',
        sl: '',
        position: 'Closed',
        openTime: '',
        closeTime: '',
        reason: 'Other',
        pnlUsd: '',
        margin: '1000',
        leverage: '1000',
        contractSize: '100',
        roi: '',
        entrySide: 'Long',
        comments: ''
      });
      
      clearUpload();
      toast.success('Forex trade added successfully');
    } catch (error) {
      toast.error('Failed to add trade');
    } finally {
      setLoading(false);
    }
  };

  const getExtractionStatusColor = () => {
    switch (extractionStatus) {
      case 'success': return 'border-green-500 bg-green-500/10';
      case 'error': return 'border-red-500 bg-red-500/10';
      case 'quota_exceeded': return 'border-yellow-500 bg-yellow-500/10';
      default: return isDragOver ? 'border-purple-500 bg-purple-500/10' : 'border-slate-600 bg-slate-700/50 hover:border-slate-500';
    }
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
          Add New Forex Trade
        </h3>
      </div>

      {/* Image Upload Section */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-white mb-3 flex items-center">
          <Sparkles className="w-4 h-4 mr-2 text-purple-400" />
          AI Trade Extraction
        </h4>
        
        <motion.div
          className={`relative border-2 border-dashed rounded-lg transition-all duration-200 ${getExtractionStatusColor()}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id="forexTradeImageUpload"
          />

          <AnimatePresence mode="wait">
            {preview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4"
              >
                <div className="relative">
                  <img
                    src={preview}
                    alt="Upload preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={clearUpload}
                    className="absolute top-2 right-2 p-1 bg-slate-800/80 text-white rounded-full hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300 truncate">{fileName}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isExtracting && (
                      <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    )}
                    {extractionStatus === 'success' && (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                    {(extractionStatus === 'error' || extractionStatus === 'quota_exceeded') && (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                </div>
                
                {!isExtracting && extractionStatus === 'idle' && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={extractTradeData}
                    className="w-full mt-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center justify-center"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Extract Trade Information
                  </motion.button>
                )}

                {extractionStatus === 'quota_exceeded' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 space-y-2"
                  >
                    <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <Clock className="w-4 h-4 text-yellow-400 mt-0.5" />
                        <div className="text-sm text-yellow-200">
                          <p className="font-medium">AI Service Busy</p>
                          <p className="text-yellow-300 mt-1">High demand detected. You can:</p>
                          <ul className="list-disc list-inside mt-1 space-y-1 text-yellow-300">
                            <li>Wait a few minutes and try again</li>
                            <li>Enter trade data manually below</li>
                            <li>Try with a simpler screenshot</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    {retryCount < 3 && (
                      <button
                        onClick={retryExtraction}
                        className="w-full bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 transition-all flex items-center justify-center"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Retry Extraction ({3 - retryCount} attempts left)
                      </button>
                    )}
                  </motion.div>
                )}
                
                {error && extractionStatus !== 'quota_exceeded' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 text-sm text-red-400"
                  >
                    {error}
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 text-center cursor-pointer"
                onClick={openFileDialog}
              >
                <motion.div
                  animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
                  className="mb-4"
                >
                  <Upload className={`w-12 h-12 mx-auto ${
                    isDragOver ? 'text-purple-400' : 'text-slate-400'
                  }`} />
                </motion.div>
                
                <h3 className="text-lg font-medium text-white mb-2">
                  {isDragOver ? 'Drop your image here' : 'Upload Trading Screenshot'}
                </h3>
                
                <p className="text-slate-400 text-sm mb-4">
                  Drag and drop, paste from clipboard, or click to browse
                </p>
                
                <div className="text-xs text-slate-500">
                  Supports PNG, JPG, JPEG • Max 10MB
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Enhanced Forex Trade Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Trade Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Symbol
            </label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => handleInputChange('symbol', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="e.g., EURUSD, GBPJPY"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="Buy">Buy</option>
              <option value="Sell">Sell</option>
            </select>
          </div>
        </div>

        {/* Volume, Prices, and Leverage */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Volume (Lot)
            </label>
            <input
              type="number"
              value={formData.volumeLot}
              onChange={(e) => handleInputChange('volumeLot', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="0.01"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Open Price
            </label>
            <input
              type="number"
              value={formData.openPrice}
              onChange={(e) => handleInputChange('openPrice', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="1.1234"
              step="0.00001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Close Price
            </label>
            <input
              type="number"
              value={formData.closePrice}
              onChange={(e) => handleInputChange('closePrice', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="1.1250"
              step="0.00001"
            />
          </div>
        </div>

        {/* Leverage and Contract Size */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Leverage
            </label>
            <input
              type="number"
              value={formData.leverage}
              onChange={(e) => handleInputChange('leverage', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="100"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Contract Size
            </label>
            <input
              type="number"
              value={formData.contractSize}
              onChange={(e) => handleInputChange('contractSize', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="100000"
              min="1"
            />
          </div>
        </div>

        {/* TP and SL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Take Profit (TP)
            </label>
            <input
              type="number"
              value={formData.tp}
              onChange={(e) => handleInputChange('tp', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="1.1300"
              step="0.00001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Stop Loss (SL)
            </label>
            <input
              type="number"
              value={formData.sl}
              onChange={(e) => handleInputChange('sl', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="1.1200"
              step="0.00001"
            />
          </div>
        </div>

        {/* Position Status and Reason */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Position
            </label>
            <select
              value={formData.position}
              onChange={(e) => handleInputChange('position', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Close Reason
            </label>
            <select
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="TP">Take Profit</option>
              <option value="SL">Stop Loss</option>
              <option value="Early Close">Early Close</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Time Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Open Time
            </label>
            <input
              type="datetime-local"
              value={formData.openTime}
              onChange={(e) => handleInputChange('openTime', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Close Time
            </label>
            <input
              type="datetime-local"
              value={formData.closeTime}
              onChange={(e) => handleInputChange('closeTime', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>
        </div>

        {/* P&L and Margin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              P&L (USD) *
            </label>
            <input
              type="number"
              value={formData.pnlUsd}
              onChange={(e) => handleInputChange('pnlUsd', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="10.21 or -5.50"
              step="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center">
              Margin (USD) *
              <Calculator className="w-4 h-4 ml-2 text-blue-400" />
            </label>
            <input
              type="number"
              value={formData.margin}
              onChange={(e) => handleInputChange('margin', e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="1000.00"
              step="0.01"
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              Auto-calculated from lot size, price, and leverage
            </p>
          </div>
        </div>

        {/* Entry Side Toggle */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Entry Side
          </label>
          <div className="grid grid-cols-2 gap-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleInputChange('entrySide', 'Long')}
              className={`relative group overflow-hidden rounded-lg px-3 py-2 transition-all duration-300 ${
                formData.entrySide === 'Long'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-400/50 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-700/50 border border-slate-600/30 hover:border-slate-500/50'
              }`}
            >
              <div className="relative flex items-center justify-center space-x-2">
                <div className={`p-1 rounded-full transition-all duration-300 ${
                  formData.entrySide === 'Long'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-slate-600/50 text-slate-400 group-hover:text-slate-300'
                }`}>
                  <TrendingUp className="w-3 h-3" />
                </div>
                <span className={`font-medium text-sm transition-colors duration-300 ${
                  formData.entrySide === 'Long' ? 'text-white' : 'text-slate-300 group-hover:text-white'
                }`}>
                  Long
                </span>
              </div>
            </motion.button>
            
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleInputChange('entrySide', 'Short')}
              className={`relative group overflow-hidden rounded-lg px-3 py-2 transition-all duration-300 ${
                formData.entrySide === 'Short'
                  ? 'bg-gradient-to-r from-red-500/20 to-rose-500/20 border border-red-400/50 shadow-md shadow-red-500/20'
                  : 'bg-slate-700/50 border border-slate-600/30 hover:border-slate-500/50'
              }`}
            >
              <div className="relative flex items-center justify-center space-x-2">
                <div className={`p-1 rounded-full transition-all duration-300 ${
                  formData.entrySide === 'Short'
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-slate-600/50 text-slate-400 group-hover:text-slate-300'
                }`}>
                  <TrendingDown className="w-3 h-3" />
                </div>
                <span className={`font-medium text-sm transition-colors duration-300 ${
                  formData.entrySide === 'Short' ? 'text-white' : 'text-slate-300 group-hover:text-white'
                }`}>
                  Short
                </span>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Comments */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Comments
          </label>
          <textarea
            value={formData.comments}
            onChange={(e) => handleInputChange('comments', e.target.value)}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
            placeholder="Add notes about this trade..."
            rows={3}
          />
        </div>

        {/* Calculated ROI Display */}
        {formData.margin && formData.pnlUsd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-700 rounded-lg p-4 border border-slate-600"
          >
            <div className="flex items-center text-slate-300 mb-2">
              <span className="text-sm">Calculated ROI: </span>
              <span className="text-lg font-bold text-blue-400 ml-2">
                {calculateROI()}%
              </span>
            </div>
          </motion.div>
        )}

        {/* Submit Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 flex items-center justify-center"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Plus className="w-5 h-5 mr-2" />
              Add Forex Trade
            </>
          )}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default ForexTradeForm;