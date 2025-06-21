import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, TrendingUp, Shield, Eye, Fingerprint } from 'lucide-react';
import toast from 'react-hot-toast';

interface MasterLockScreenProps {
  onUnlock: () => void;
}

const MasterLockScreen: React.FC<MasterLockScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'whyareyougay') {
      onUnlock();
      toast.success('Access granted');
    } else {
      setIsShaking(true);
      toast.error('Invalid master key');
      setTimeout(() => setIsShaking(false), 500);
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-6 relative"
          >
            <TrendingUp className="w-10 h-10 text-white" />
            
            {/* Animated security rings */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-blue-400/30 rounded-full"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 border border-blue-300/20 rounded-full"
            />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-bold text-white mb-2"
          >
            Laxmi Chit Fund
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-slate-400 mb-4"
          >
            Authorized personnel only
          </motion.p>

          {/* Cool Security Graphics */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="flex justify-center items-center space-x-4 mb-6"
          >
            {/* Security Icons with Animations */}
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                delay: 0 
              }}
              className="p-2 bg-slate-700/50 rounded-full border border-slate-600/50"
            >
              <Shield className="w-4 h-4 text-blue-400" />
            </motion.div>
            
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                delay: 0.3 
              }}
              className="p-2 bg-slate-700/50 rounded-full border border-slate-600/50"
            >
              <Eye className="w-4 h-4 text-green-400" />
            </motion.div>
            
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                delay: 0.6 
              }}
              className="p-2 bg-slate-700/50 rounded-full border border-slate-600/50"
            >
              <Fingerprint className="w-4 h-4 text-purple-400" />
            </motion.div>
          </motion.div>

          {/* Security Grid Pattern */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 1 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className={`bg-slate-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-slate-700/50 relative overflow-hidden ${
            isShaking ? 'animate-pulse' : ''
          }`}
        >
          {/* Subtle animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-purple-600/5" />
          
          <div className="relative">
            <div className="text-center mb-6">
              <motion.div
                animate={{ 
                  boxShadow: [
                    '0 0 20px rgba(59, 130, 246, 0.3)',
                    '0 0 30px rgba(59, 130, 246, 0.5)',
                    '0 0 20px rgba(59, 130, 246, 0.3)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-block p-3 bg-slate-700/50 rounded-full mb-3"
              >
                <Lock className="w-8 h-8 text-slate-400" />
              </motion.div>
              <h2 className="text-xl font-semibold text-white mb-2">Master Key Required</h2>
              <p className="text-slate-400 text-sm">Enter your master key to access the platform</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter master key"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all backdrop-blur-sm"
                  autoFocus
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 shadow-lg"
              >
                Unlock Platform
              </motion.button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default MasterLockScreen;