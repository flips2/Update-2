import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import MasterLockScreen from './components/MasterLockScreen';
import AuthScreen from './components/AuthScreen';
import TradingDashboard from './components/TradingDashboard';

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const { user, loading } = useAuth();

  if (!isUnlocked) {
    return <MasterLockScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {user ? <TradingDashboard /> : <AuthScreen />}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1F2937',
            color: '#F9FAFB',
            border: '1px solid #374151',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#F9FAFB',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#F9FAFB',
            },
          },
        }}
      />
    </>
  );
}

export default App;