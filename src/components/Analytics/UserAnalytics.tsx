import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign, 
  Activity,
  AlertTriangle,
  BarChart3,
  PieChart,
  Clock,
  Shield
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { tradingService } from '../../services/tradingService';
import { Trade, TradingSession, UserAnalytics } from '../../types';
import { formatCurrency, formatPercentage } from '../../utils/calculations';
import StatsCard from '../Dashboard/StatsCard';
import EnhancedPerformanceChart from '../Dashboard/EnhancedPerformanceChart';

const UserAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TradingSession[]>([]);
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      // Load all sessions
      const sessionsData = await tradingService.getSessions(user!.id);
      setSessions(sessionsData);

      // Load all trades across all sessions
      const allTradesPromises = sessionsData.map(session => 
        tradingService.getTrades(session.id)
      );
      const tradesArrays = await Promise.all(allTradesPromises);
      const allTradesData = tradesArrays.flat();
      setAllTrades(allTradesData);

      // Calculate analytics
      const calculatedAnalytics = calculateUserAnalytics(sessionsData, allTradesData);
      setAnalytics(calculatedAnalytics);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateUserAnalytics = (sessions: TradingSession[], trades: Trade[]): UserAnalytics => {
    if (trades.length === 0) {
      return {
        sharpeRatio: 0,
        maxDrawdown: { percentage: 0, amount: 0 },
        profitFactor: 0,
        averageRMultiple: 0,
        activeCapital: sessions.reduce((sum, s) => sum + s.current_capital, 0),
        tradeDistribution: { longTrades: 0, shortTrades: 0, longPercentage: 0, shortPercentage: 0 },
        timeAnalysis: { avgHoldTime: 0, bestTime: 'N/A' },
        riskMetrics: { avgRiskPerTrade: 0, maxRisk: 0 },
        streaks: { bestStreak: 0, worstStreak: 0 },
        overallPerformance: 0,
        successRate: 0,
        riskLevel: 'Low'
      };
    }

    // Basic calculations
    const totalProfit = trades.reduce((sum, trade) => sum + trade.profit_loss, 0);
    const winningTrades = trades.filter(trade => trade.profit_loss > 0);
    const losingTrades = trades.filter(trade => trade.profit_loss < 0);
    const successRate = (winningTrades.length / trades.length) * 100;

    // Trade distribution
    const longTrades = trades.filter(trade => trade.entry_side === 'Long').length;
    const shortTrades = trades.filter(trade => trade.entry_side === 'Short').length;

    // Profit factor
    const totalWins = winningTrades.reduce((sum, trade) => sum + trade.profit_loss, 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, trade) => sum + trade.profit_loss, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

    // Calculate R-Multiple for trades with SL data
    const rMultiples: number[] = [];
    trades.forEach(trade => {
      if (trade.sl && trade.open_price && trade.profit_loss !== undefined) {
        let risk: number;
        if (trade.entry_side === 'Long') {
          risk = trade.open_price - trade.sl;
        } else {
          risk = trade.sl - trade.open_price;
        }
        
        if (risk > 0) {
          const rMultiple = trade.profit_loss / risk;
          rMultiples.push(rMultiple);
        }
      }
    });

    const averageRMultiple = rMultiples.length > 0 
      ? rMultiples.reduce((sum, r) => sum + r, 0) / rMultiples.length 
      : 0;

    // Calculate streaks
    let currentStreak = 0;
    let bestStreak = 0;
    let worstStreak = 0;
    let tempWorstStreak = 0;

    trades.forEach(trade => {
      if (trade.profit_loss > 0) {
        currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
        bestStreak = Math.max(bestStreak, currentStreak);
        tempWorstStreak = 0;
      } else {
        currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
        tempWorstStreak = tempWorstStreak < 0 ? tempWorstStreak - 1 : -1;
        worstStreak = Math.min(worstStreak, tempWorstStreak);
      }
    });

    // Calculate max drawdown
    let peak = 0;
    let maxDrawdownAmount = 0;
    let runningTotal = 0;

    trades.forEach(trade => {
      runningTotal += trade.profit_loss;
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdownAmount) {
        maxDrawdownAmount = drawdown;
      }
    });

    const maxDrawdownPercentage = peak > 0 ? (maxDrawdownAmount / peak) * 100 : 0;

    // Calculate Sharpe ratio (simplified)
    const returns = trades.map(trade => trade.roi);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnStdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;

    // Risk level assessment
    let riskLevel: 'Low' | 'Moderate' | 'High' = 'Low';
    if (maxDrawdownPercentage > 20 || averageRMultiple < -1) {
      riskLevel = 'High';
    } else if (maxDrawdownPercentage > 10 || averageRMultiple < 0) {
      riskLevel = 'Moderate';
    }

    // Calculate average hold time for trades with time data
    const tradesWithTime = trades.filter(trade => trade.open_time && trade.close_time);
    let avgHoldTime = 0;
    if (tradesWithTime.length > 0) {
      const totalHoldTime = tradesWithTime.reduce((sum, trade) => {
        const openTime = new Date(trade.open_time!).getTime();
        const closeTime = new Date(trade.close_time!).getTime();
        return sum + (closeTime - openTime);
      }, 0);
      avgHoldTime = totalHoldTime / tradesWithTime.length / (1000 * 60 * 60); // Convert to hours
    }

    return {
      sharpeRatio,
      maxDrawdown: {
        percentage: maxDrawdownPercentage,
        amount: maxDrawdownAmount
      },
      profitFactor,
      averageRMultiple,
      activeCapital: sessions.reduce((sum, s) => sum + s.current_capital, 0),
      tradeDistribution: {
        longTrades,
        shortTrades,
        longPercentage: (longTrades / trades.length) * 100,
        shortPercentage: (shortTrades / trades.length) * 100
      },
      timeAnalysis: {
        avgHoldTime,
        bestTime: avgHoldTime > 0 ? `${avgHoldTime.toFixed(1)} hours` : 'N/A'
      },
      riskMetrics: {
        avgRiskPerTrade: trades.reduce((sum, t) => sum + t.margin, 0) / trades.length,
        maxRisk: Math.max(...trades.map(t => t.margin))
      },
      streaks: {
        bestStreak,
        worstStreak: Math.abs(worstStreak)
      },
      overallPerformance: totalProfit,
      successRate,
      riskLevel
    };
  };

  const getUserDisplayName = () => {
    if (user?.user_metadata?.username) {
      return user.user_metadata.username;
    }
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">No Analytics Available</h2>
          <p className="text-slate-400">Start trading to see your analytics</p>
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
              <div className="bg-purple-600 rounded-full p-2 mr-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{getUserDisplayName()}'s Analytics</h1>
                <p className="text-slate-400 text-sm">Comprehensive trading performance analysis</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Overall Performance"
            value={formatCurrency(analytics.overallPerformance)}
            change={`${analytics.successRate.toFixed(1)}% Success Rate`}
            changeColor={analytics.overallPerformance >= 0 ? 'text-green-400' : 'text-red-400'}
            icon={DollarSign}
            iconColor="text-green-400"
            bgColor="bg-green-500/10"
          />
          
          <StatsCard
            title="Sharpe Ratio"
            value={analytics.sharpeRatio.toFixed(2)}
            change="Risk-adjusted returns"
            icon={TrendingUp}
            iconColor="text-blue-400"
            bgColor="bg-blue-500/10"
          />
          
          <StatsCard
            title="Max Drawdown"
            value={`-${analytics.maxDrawdown.percentage.toFixed(1)}%`}
            change={formatCurrency(analytics.maxDrawdown.amount)}
            changeColor="text-red-400"
            icon={TrendingDown}
            iconColor="text-red-400"
            bgColor="bg-red-500/10"
          />
          
          <StatsCard
            title="Profit Factor"
            value={analytics.profitFactor.toFixed(2)}
            change="Strong performance"
            icon={Target}
            iconColor="text-purple-400"
            bgColor="bg-purple-500/10"
          />
        </div>

        {/* Advanced Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Active Capital"
            value={formatCurrency(analytics.activeCapital)}
            change="Across all sessions"
            icon={Activity}
            iconColor="text-yellow-400"
            bgColor="bg-yellow-500/10"
          />
          
          <StatsCard
            title="Average R Multiple"
            value={analytics.averageRMultiple.toFixed(2)}
            change="Risk/reward ratio"
            icon={Shield}
            iconColor="text-indigo-400"
            bgColor="bg-indigo-500/10"
          />
          
          <StatsCard
            title="Risk Level"
            value={analytics.riskLevel}
            change={`Max risk: ${formatCurrency(analytics.riskMetrics.maxRisk)}`}
            changeColor={
              analytics.riskLevel === 'High' ? 'text-red-400' :
              analytics.riskLevel === 'Moderate' ? 'text-yellow-400' : 'text-green-400'
            }
            icon={AlertTriangle}
            iconColor={
              analytics.riskLevel === 'High' ? 'text-red-400' :
              analytics.riskLevel === 'Moderate' ? 'text-yellow-400' : 'text-green-400'
            }
            bgColor={
              analytics.riskLevel === 'High' ? 'bg-red-500/10' :
              analytics.riskLevel === 'Moderate' ? 'bg-yellow-500/10' : 'bg-green-500/10'
            }
          />
          
          <StatsCard
            title="Best Streak"
            value={`${analytics.streaks.bestStreak} wins`}
            change={`Worst: ${analytics.streaks.worstStreak} losses`}
            changeColor="text-red-400"
            icon={Clock}
            iconColor="text-emerald-400"
            bgColor="bg-emerald-500/10"
          />
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Trade Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <PieChart className="w-5 h-5 mr-2" />
              Trade Distribution
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Long Trades</span>
                <div className="flex items-center">
                  <span className="text-white font-medium mr-2">{analytics.tradeDistribution.longTrades}</span>
                  <span className="text-green-400">({analytics.tradeDistribution.longPercentage.toFixed(1)}%)</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Short Trades</span>
                <div className="flex items-center">
                  <span className="text-white font-medium mr-2">{analytics.tradeDistribution.shortTrades}</span>
                  <span className="text-red-400">({analytics.tradeDistribution.shortPercentage.toFixed(1)}%)</span>
                </div>
              </div>
              
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-l-full"
                  style={{ width: `${analytics.tradeDistribution.longPercentage}%` }}
                />
              </div>
            </div>
          </motion.div>

          {/* Time Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-800 rounded-xl p-6 border border-slate-700"
          >
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Time Analysis
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Avg Hold Time</span>
                <span className="text-white font-medium">{analytics.timeAnalysis.bestTime}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Total Sessions</span>
                <span className="text-white font-medium">{sessions.length}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Total Trades</span>
                <span className="text-white font-medium">{allTrades.length}</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Performance Charts */}
        <EnhancedPerformanceChart 
          trades={allTrades} 
          initialCapital={sessions.reduce((sum, s) => sum + s.initial_capital, 0)} 
        />
      </div>
    </div>
  );
};

export default UserAnalyticsPage;