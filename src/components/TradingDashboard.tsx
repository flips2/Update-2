import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  LogOut, 
  Download, 
  Upload, 
  Activity,
  DollarSign,
  TrendingUp,
  Target,
  BarChart3,
  PieChart,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  User,
  TrendingDown
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { tradingService } from '../services/tradingService';
import { TradingSession, Trade, SessionStats } from '../types';
import { calculateSessionStats, formatCurrency, formatPercentage } from '../utils/calculations';
import { exportToJSON, exportToExcel, importFromJSON } from '../utils/exportUtils';
import SessionCard from './Dashboard/SessionCard';
import StatsCard from './Dashboard/StatsCard';
import EnhancedTradesList from './Dashboard/EnhancedTradesList';
import EnhancedPerformanceChart from './Dashboard/EnhancedPerformanceChart';
import EnhancedChatInterface from './AI/EnhancedChatInterface';
import SessionSummaryModal from './Dashboard/SessionSummaryModal';
import SydneyGreeting from './Dashboard/SydneyGreeting';
import ForexTradeForm from './Dashboard/ForexTradeForm';
import CryptoTradeForm from './Dashboard/CryptoTradeForm';
import UserAnalyticsPage from './Analytics/UserAnalytics';
import EnhancedMarketOverview from './MarketOverview/EnhancedMarketOverview';
import toast from 'react-hot-toast';

const TradingDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'analytics' | 'market'>('dashboard');
  const [sessions, setSessions] = useState<TradingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<TradingSession | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<SessionStats>({
    totalTrades: 0,
    winRate: 0,
    currentCapital: 0,
    netProfitLoss: 0,
    netProfitLossPercentage: 0,
    totalMarginUsed: 0,
    averageROI: 0,
    winningTrades: 0,
    losingTrades: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionCapital, setNewSessionCapital] = useState('');
  const [newSessionType, setNewSessionType] = useState<'Forex' | 'Crypto'>('Forex');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [sessionsCollapsed, setSessionsCollapsed] = useState(false);

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  useEffect(() => {
    if (currentSession) {
      loadTrades();
    }
  }, [currentSession]);

  useEffect(() => {
    if (currentSession) {
      const newStats = calculateSessionStats(trades, currentSession.initial_capital);
      setStats(newStats);
      
      // Update session capital if it differs
      if (newStats.currentCapital !== currentSession.current_capital) {
        updateSessionCapital(newStats.currentCapital);
      }
    }
  }, [trades, currentSession]);

  const loadSessions = async () => {
    try {
      const sessionsData = await tradingService.getSessions(user!.id);
      setSessions(sessionsData);
      if (sessionsData.length > 0 && !currentSession) {
        setCurrentSession(sessionsData[0]);
      }
    } catch (error) {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadTrades = async () => {
    if (!currentSession) return;
    
    try {
      const tradesData = await tradingService.getTrades(currentSession.id);
      setTrades(tradesData);
    } catch (error) {
      toast.error('Failed to load trades');
    }
  };

  const updateSessionCapital = async (newCapital: number) => {
    if (!currentSession) return;
    
    try {
      await tradingService.updateSessionCapital(currentSession.id, newCapital);
      setCurrentSession({ ...currentSession, current_capital: newCapital });
      
      // Update sessions list
      setSessions(sessions.map(session => 
        session.id === currentSession.id 
          ? { ...session, current_capital: newCapital }
          : session
      ));
    } catch (error) {
      console.error('Failed to update session capital:', error);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const newSession = await tradingService.createSession(
        user!.id,
        newSessionName,
        Number(newSessionCapital),
        newSessionType
      );
      
      setSessions([newSession, ...sessions]);
      setCurrentSession(newSession);
      setNewSessionName('');
      setNewSessionCapital('');
      setNewSessionType('Forex');
      setShowNewSessionForm(false);
      
      toast.success(`${newSessionType} session created successfully`);
    } catch (error) {
      toast.error('Failed to create session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }
    
    if (!confirm('This will permanently delete all trades in this session. Are you absolutely sure?')) {
      return;
    }
    
    if (!confirm('Final confirmation: This action is irreversible. Delete session?')) {
      return;
    }

    try {
      await tradingService.deleteSession(sessionId);
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);
      
      if (currentSession?.id === sessionId) {
        setCurrentSession(updatedSessions.length > 0 ? updatedSessions[0] : null);
        setTrades([]);
      }
      
      toast.success('Session deleted successfully');
    } catch (error) {
      toast.error('Failed to delete session');
    }
  };

  const handleAddTrade = async (trade: Omit<Trade, 'id' | 'created_at'>) => {
    try {
      const newTrade = await tradingService.addTrade(trade);
      setTrades([newTrade, ...trades]);
    } catch (error) {
      toast.error('Failed to add trade');
    }
  };

  const handleUpdateTrade = async (tradeId: string, updates: Partial<Trade>) => {
    try {
      const updatedTrade = await tradingService.updateTrade(tradeId, updates);
      setTrades(trades.map(t => t.id === tradeId ? updatedTrade : t));
      toast.success('Trade updated successfully');
    } catch (error) {
      toast.error('Failed to update trade');
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    if (!confirm('Are you sure you want to delete this trade?')) {
      return;
    }

    try {
      await tradingService.deleteTrade(tradeId);
      setTrades(trades.filter(t => t.id !== tradeId));
      toast.success('Trade deleted successfully');
    } catch (error) {
      toast.error('Failed to delete trade');
    }
  };

  const handleExportJSON = () => {
    if (!currentSession) return;
    exportToJSON(currentSession, trades, stats);
    toast.success('Session exported to JSON');
  };

  const handleExportExcel = () => {
    if (!currentSession) return;
    exportToExcel(currentSession, trades, stats);
    toast.success('Session exported to Excel');
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importData = await importFromJSON(file);
      
      // Create new session from imported data
      const newSession = await tradingService.createSession(
        user!.id,
        `${importData.session.name} (Imported)`,
        importData.session.initial_capital,
        'Forex' // Default to Forex for imported sessions
      );

      // Add all trades
      for (const tradeData of importData.trades) {
        await tradingService.addTrade({
          session_id: newSession.id,
          margin: tradeData.margin,
          roi: tradeData.roi,
          entry_side: tradeData.entry_side,
          profit_loss: tradeData.profit_loss,
          comments: tradeData.comments,
        });
      }

      // Refresh sessions
      await loadSessions();
      setCurrentSession(newSession);
      
      toast.success('Session imported successfully');
    } catch (error) {
      toast.error('Failed to import session');
    }

    // Reset file input
    event.target.value = '';
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Failed to sign out');
    }
  };

  // Extract username from user metadata or fallback to email
  const getUserDisplayName = () => {
    if (user?.user_metadata?.username) {
      return user.user_metadata.username;
    }
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name;
    }
    // Fallback to email prefix if no username
    return user?.email?.split('@')[0] || 'User';
  };

  const userName = getUserDisplayName();

  // Get sessions to display based on collapse state
  const getDisplayedSessions = () => {
    if (sessionsCollapsed) {
      return currentSession ? [currentSession] : [];
    }
    return sessions;
  };

  const shouldShowScrollbar = sessions.length > 3 && !sessionsCollapsed;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Render different views
  if (currentView === 'analytics') {
    return (
      <div>
        <UserAnalyticsPage />
        {/* Fixed Navigation */}
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-slate-800 rounded-lg p-2 border border-slate-700">
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-3 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('analytics')}
                className="px-3 py-2 bg-purple-600 text-white rounded transition-colors"
              >
                Analytics
              </button>
              <button
                onClick={() => setCurrentView('market')}
                className="px-3 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Market
              </button>
            </div>
          </div>
        </div>
        <EnhancedChatInterface currentSessionId={currentSession?.id} />
      </div>
    );
  }

  if (currentView === 'market') {
    return (
      <div>
        <EnhancedMarketOverview />
        {/* Fixed Navigation */}
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-slate-800 rounded-lg p-2 border border-slate-700">
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="px-3 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('analytics')}
                className="px-3 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Analytics
              </button>
              <button
                onClick={() => setCurrentView('market')}
                className="px-3 py-2 bg-green-600 text-white rounded transition-colors"
              >
                Market
              </button>
            </div>
          </div>
        </div>
        <EnhancedChatInterface currentSessionId={currentSession?.id} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-blue-600 rounded-full p-2 mr-4">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Laxmi Chit Fund</h1>
                <p className="text-slate-400 text-sm">Analytics Dashboard</p>
              </div>
            </div>
            
            {/* Centered Navigation */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <div className="bg-slate-700 rounded-lg p-1">
                <div className="flex space-x-1">
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className={`px-3 py-2 rounded transition-colors ${
                      currentView === 'dashboard' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => setCurrentView('analytics')}
                    className={`px-3 py-2 rounded transition-colors ${
                      currentView === 'analytics' 
                        ? 'bg-purple-600 text-white' 
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Analytics
                  </button>
                  <button
                    onClick={() => setCurrentView('market')}
                    className={`px-3 py-2 rounded transition-colors ${
                      currentView === 'market' 
                        ? 'bg-green-600 text-white' 
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Market
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-slate-300">Welcome back, {userName}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Sydney Greeting - Fixed to prevent changes */}
        <SydneyGreeting userName={userName} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Enhanced Session Controls */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white">Sessions</h2>
                <div className="flex items-center space-x-2">
                  {sessions.length > 0 && (
                    <button
                      onClick={() => setSessionsCollapsed(!sessionsCollapsed)}
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                      title={sessionsCollapsed ? 'Expand sessions' : 'Collapse sessions'}
                    >
                      {sessionsCollapsed ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronUp className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setShowNewSessionForm(true)}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {showNewSessionForm && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    onSubmit={handleCreateSession}
                    className="mb-4 space-y-3"
                  >
                    <input
                      type="text"
                      value={newSessionName}
                      onChange={(e) => setNewSessionName(e.target.value)}
                      placeholder="Session name"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="number"
                      value={newSessionCapital}
                      onChange={(e) => setNewSessionCapital(e.target.value)}
                      placeholder="Initial capital"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                      required
                    />
                    <select
                      value={newSessionType}
                      onChange={(e) => setNewSessionType(e.target.value as 'Forex' | 'Crypto')}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Forex">Forex</option>
                      <option value="Crypto">Crypto</option>
                    </select>
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewSessionForm(false)}
                        className="flex-1 bg-slate-600 text-white py-2 rounded-lg text-sm hover:bg-slate-500 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.form>
                )}

                {/* Sessions List with Conditional Scrollbar */}
                <div 
                  className={`space-y-3 ${
                    shouldShowScrollbar 
                      ? 'max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800' 
                      : ''
                  }`}
                >
                  {getDisplayedSessions().map((session) => {
                    const sessionStats = calculateSessionStats(
                      currentSession?.id === session.id ? trades : [], 
                      session.initial_capital
                    );
                    
                    return (
                      <SessionCard
                        key={session.id}
                        session={session}
                        stats={sessionStats}
                        isActive={currentSession?.id === session.id}
                        onClick={() => setCurrentSession(session)}
                        onDelete={() => handleDeleteSession(session.id)}
                      />
                    );
                  })}
                </div>

                {/* Collapsed State Info */}
                {sessionsCollapsed && sessions.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 text-center text-slate-400 text-sm"
                  >
                    {sessions.length - 1} more session{sessions.length > 2 ? 's' : ''} hidden
                  </motion.div>
                )}
              </div>
            </div>

            {/* AI Summary */}
            {currentSession && (
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Sydney Insights</h3>
                <button
                  onClick={() => setShowSummaryModal(true)}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Session Summary
                </button>
              </div>
            )}

            {/* Export/Import */}
            {currentSession && (
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Data Management</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleExportJSON}
                    className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export JSON
                  </button>
                  <button
                    onClick={handleExportExcel}
                    className="w-full flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Excel
                  </button>
                  <label className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    Import JSON
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJSON}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {currentSession ? (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatsCard
                    title="Total Trades"
                    value={stats.totalTrades.toString()}
                    icon={BarChart3}
                    iconColor="text-blue-400"
                    bgColor="bg-blue-500/10"
                  />
                  <StatsCard
                    title="Win Rate"
                    value={`${stats.winRate.toFixed(1)}%`}
                    change={`${stats.winningTrades}W / ${stats.losingTrades}L`}
                    icon={Target}
                    iconColor="text-green-400"
                    bgColor="bg-green-500/10"
                  />
                  <StatsCard
                    title="Current Capital"
                    value={formatCurrency(stats.currentCapital)}
                    change={formatPercentage(stats.netProfitLossPercentage)}
                    changeColor={stats.netProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}
                    icon={DollarSign}
                    iconColor="text-yellow-400"
                    bgColor="bg-yellow-500/10"
                  />
                  <StatsCard
                    title="Average ROI"
                    value={`${stats.averageROI.toFixed(2)}%`}
                    change={formatCurrency(stats.totalMarginUsed)}
                    icon={TrendingUp}
                    iconColor="text-purple-400"
                    bgColor="bg-purple-500/10"
                  />
                </div>

                {/* Enhanced Charts */}
                <EnhancedPerformanceChart trades={trades} initialCapital={currentSession.initial_capital} />

                {/* Trade Form and List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Conditional Trade Form based on session type */}
                  {currentSession.session_type === 'Forex' ? (
                    <ForexTradeForm
                      onAddTrade={handleAddTrade}
                      sessionId={currentSession.id}
                    />
                  ) : (
                    <CryptoTradeForm
                      onAddTrade={handleAddTrade}
                      sessionId={currentSession.id}
                    />
                  )}
                  
                  <div className="lg:col-span-1">
                    <EnhancedTradesList
                      trades={trades}
                      onDeleteTrade={handleDeleteTrade}
                      onUpdateTrade={handleUpdateTrade}
                      sessionType={currentSession.session_type}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <PieChart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-400 mb-2">No Trading Session Selected</h3>
                <p className="text-slate-500 mb-6">Create a new session to start tracking your trades</p>
                <button
                  onClick={() => setShowNewSessionForm(true)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create First Session
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced AI Chat Interface */}
      <EnhancedChatInterface currentSessionId={currentSession?.id} />

      {/* Session Summary Modal */}
      {currentSession && (
        <SessionSummaryModal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          sessionId={currentSession.id}
          sessionName={currentSession.name}
        />
      )}
    </div>
  );
};

export default TradingDashboard;