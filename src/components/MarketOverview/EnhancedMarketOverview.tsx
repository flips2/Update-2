import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Newspaper,
  Eye
} from 'lucide-react';
import { enhancedMarketDataService, MarketData, NewsItem } from '../../services/enhancedMarketDataService';
import { formatCurrency } from '../../utils/calculations';

const EnhancedMarketOverview: React.FC = () => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadMarketData();
    
    // Refresh data every 5 minutes
    const interval = setInterval(loadMarketData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadMarketData = async () => {
    try {
      setError(null);
      const data = await enhancedMarketDataService.getAllMarketData();
      setMarketData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load market data:', error);
      setError('Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

  const refreshNews = async () => {
    if (!marketData) return;
    
    setNewsLoading(true);
    try {
      const freshNews = await enhancedMarketDataService.refreshNews();
      setMarketData({
        ...marketData,
        news: freshNews
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh news:', error);
    } finally {
      setNewsLoading(false);
    }
  };

  const refreshData = () => {
    setLoading(true);
    loadMarketData();
  };

  const formatChange = (change: number, isPercentage: boolean = false) => {
    const sign = change >= 0 ? '+' : '';
    const value = isPercentage ? `${change.toFixed(2)}%` : formatCurrency(change);
    return `${sign}${value}`;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? TrendingUp : TrendingDown;
  };

  const getFearGreedColor = (value: number) => {
    if (value <= 25) return 'text-red-400';
    if (value <= 45) return 'text-orange-400';
    if (value <= 55) return 'text-yellow-400';
    if (value <= 75) return 'text-green-400';
    return 'text-emerald-400';
  };

  const getFearGreedGradient = (value: number) => {
    if (value <= 25) return 'from-red-500 to-red-600';
    if (value <= 45) return 'from-orange-500 to-red-500';
    if (value <= 55) return 'from-yellow-500 to-orange-500';
    if (value <= 75) return 'from-green-500 to-yellow-500';
    return 'from-emerald-500 to-green-500';
  };

  if (loading && !marketData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading market data...</p>
        </div>
      </div>
    );
  }

  if (error && !marketData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Failed to Load Market Data</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <button
            onClick={refreshData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-green-600 rounded-full p-2 mr-4">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Market Overview</h1>
                <p className="text-slate-400 text-sm">Real-time market data and insights</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-slate-400 text-sm">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
              <button
                onClick={refreshData}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {marketData && (
          <>
            {/* Price Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Bitcoin */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-orange-500/10 p-2 rounded-lg mr-3">
                      <DollarSign className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Bitcoin</h3>
                      <p className="text-slate-400 text-sm">BTC/USD</p>
                    </div>
                  </div>
                  {React.createElement(getChangeIcon(marketData.crypto.btc.changePercent24h), {
                    className: `w-5 h-5 ${getChangeColor(marketData.crypto.btc.changePercent24h)}`
                  })}
                </div>
                
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(marketData.crypto.btc.price)}
                  </p>
                  <p className={`text-sm ${getChangeColor(marketData.crypto.btc.changePercent24h)}`}>
                    {formatChange(marketData.crypto.btc.changePercent24h, true)} (24h)
                  </p>
                  <p className={`text-xs ${getChangeColor(marketData.crypto.btc.change24h)}`}>
                    {formatChange(marketData.crypto.btc.change24h)}
                  </p>
                </div>
              </motion.div>

              {/* Ethereum */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-blue-500/10 p-2 rounded-lg mr-3">
                      <DollarSign className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Ethereum</h3>
                      <p className="text-slate-400 text-sm">ETH/USD</p>
                    </div>
                  </div>
                  {React.createElement(getChangeIcon(marketData.crypto.eth.changePercent24h), {
                    className: `w-5 h-5 ${getChangeColor(marketData.crypto.eth.changePercent24h)}`
                  })}
                </div>
                
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(marketData.crypto.eth.price)}
                  </p>
                  <p className={`text-sm ${getChangeColor(marketData.crypto.eth.changePercent24h)}`}>
                    {formatChange(marketData.crypto.eth.changePercent24h, true)} (24h)
                  </p>
                  <p className={`text-xs ${getChangeColor(marketData.crypto.eth.change24h)}`}>
                    {formatChange(marketData.crypto.eth.change24h)}
                  </p>
                </div>
              </motion.div>

              {/* Gold */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-yellow-500/10 p-2 rounded-lg mr-3">
                      <DollarSign className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">Gold</h3>
                      <p className="text-slate-400 text-sm">XAU/USD</p>
                    </div>
                  </div>
                  {React.createElement(getChangeIcon(marketData.gold.changePercent24h), {
                    className: `w-5 h-5 ${getChangeColor(marketData.gold.changePercent24h)}`
                  })}
                </div>
                
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(marketData.gold.price)}
                  </p>
                  <p className={`text-sm ${getChangeColor(marketData.gold.changePercent24h)}`}>
                    {formatChange(marketData.gold.changePercent24h, true)} (24h)
                  </p>
                  <p className={`text-xs ${getChangeColor(marketData.gold.change24h)}`}>
                    {formatChange(marketData.gold.change24h)}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Fear & Greed Index and News */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Enhanced Fear & Greed Index */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-slate-800 rounded-xl p-6 border border-slate-700"
              >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Fear & Greed Index
                </h3>
                
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto mb-4">
                    <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#374151"
                        strokeWidth="3"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke={getFearGreedColor(marketData.fearGreed.value).replace('text-', '')}
                        strokeWidth="3"
                        strokeDasharray={`${marketData.fearGreed.value}, 100`}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">{marketData.fearGreed.value}</span>
                    </div>
                  </div>
                  
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold bg-gradient-to-r ${getFearGreedGradient(marketData.fearGreed.value)} text-white mb-2`}>
                    {marketData.fearGreed.classification}
                  </div>
                  <p className="text-slate-400 text-sm">
                    Crypto Market Sentiment
                  </p>
                  <p className="text-slate-500 text-xs mt-2">
                    Updated: {new Date(marketData.fearGreed.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </motion.div>

              {/* Enhanced Market News */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <Newspaper className="w-5 h-5 mr-2" />
                    Financial News
                  </h3>
                  <button
                    onClick={refreshNews}
                    disabled={newsLoading}
                    className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${newsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                
                <div className="space-y-4 max-h-80 overflow-y-auto scrollbar-glow">
                  {marketData.news.map((article, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + (index * 0.1) }}
                      className="border-b border-slate-700 pb-4 last:border-b-0 hover:bg-slate-700/30 rounded-lg p-3 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-2 line-clamp-2 hover:text-blue-400 transition-colors">
                            {article.title}
                          </h4>
                          <p className="text-slate-400 text-sm mb-2 line-clamp-2">
                            {article.summary}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-slate-500 text-xs">
                                {article.source}
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-500 text-xs">
                                {new Date(article.publishedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                        {article.imageUrl && (
                          <div className="ml-4 flex-shrink-0">
                            <img
                              src={article.imageUrl}
                              alt={article.title}
                              className="w-16 h-16 object-cover rounded-lg"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EnhancedMarketOverview;