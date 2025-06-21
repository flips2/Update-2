import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  X, 
  User, 
  Loader2,
  Minimize2,
  Maximize2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { enhancedAiService } from '../../services/enhancedAiService';
import { useAuth } from '../../hooks/useAuth';
import { ChatMessage } from '../../types';
import toast from 'react-hot-toast';

// Sydney Avatar Component
const SydneyAvatar = ({ className = "w-4 h-4" }: { className?: string }) => (
  <div className={`${className} bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center`}>
    <svg viewBox="0 0 24 24" fill="none" className="w-3/4 h-3/4 text-white">
      <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2Z" fill="currentColor"/>
      <path d="M21 9V7L15 1H5C3.89 1 3 1.89 3 3V7H1V9H3V15C3 16.1 3.9 17 5 17V19C5 20.1 5.9 21 7 21H9C10.1 21 11 20.1 11 19V17H13V19C13 20.1 13.9 21 15 21H17C18.1 21 19 20.1 19 19V17C20.1 17 21 16.1 21 15V9H21ZM7 3H15L19 7V15H5V3H7Z" fill="currentColor"/>
    </svg>
  </div>
);

interface EnhancedChatInterfaceProps {
  currentSessionId?: string;
}

const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = ({ currentSessionId }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'limited' | 'offline'>('connected');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
      if (messages.length === 0) {
        loadChatHistory();
      }
    }
  }, [isOpen, isMinimized]);

  const loadChatHistory = async () => {
    if (!user) return;
    
    setLoadingHistory(true);
    try {
      const history = await enhancedAiService.getChatHistory(user.id, 20);
      // Convert to display format
      const displayMessages = history.map(msg => ({
        id: msg.id,
        role: msg.message_type as 'user' | 'ai',
        content: msg.message,
        timestamp: new Date(msg.created_at),
      }));
      setMessages(displayMessages.reverse()); // Reverse to show oldest first
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Failed to load chat history:', error);
      setConnectionStatus('limited');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      const aiResponse = await enhancedAiService.processMessage(currentInput, user.id);

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'ai' as const,
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Save to database (don't block UI if this fails)
      try {
        await enhancedAiService.saveChatMessage(user.id, currentInput, aiResponse);
        setConnectionStatus('connected');
      } catch (saveError) {
        console.warn('Failed to save chat message:', saveError);
        setConnectionStatus('limited');
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      
      let errorMessage = 'Sorry, I\'m having trouble right now. Please try again in a moment! 🤖';
      
      if (error.message?.includes('quota') || error.message?.includes('429')) {
        errorMessage = 'I\'m experiencing high demand right now. Please try again in a few minutes! ⏰';
        setConnectionStatus('limited');
      } else {
        setConnectionStatus('offline');
      }
      
      const errorResponse = {
        id: (Date.now() + 1).toString(),
        role: 'ai' as const,
        content: errorMessage,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
      
      toast.error('Sydney is temporarily busy. Try again in a moment!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-400';
      case 'limited': return 'text-yellow-400';
      case 'offline': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Online';
      case 'limited': return 'Limited';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all z-50"
      >
        <MessageCircle className="w-6 h-6" />
        {connectionStatus !== 'connected' && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
        )}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        height: isMinimized ? 'auto' : '600px'
      }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-6 right-6 w-96 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center">
          <SydneyAvatar className="w-8 h-8 mr-3" />
          <div>
            <h3 className="text-white font-medium">Sydney</h3>
            <div className="flex items-center space-x-2">
              <p className="text-slate-400 text-xs">Your AI Trading Assistant</p>
              <div className={`w-2 h-2 rounded-full ${getStatusColor().replace('text-', 'bg-')}`} />
              <span className={`text-xs ${getStatusColor()}`}>{getStatusText()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex flex-col flex-1"
          >
            {/* Connection Status Banner */}
            {connectionStatus !== 'connected' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-yellow-900/20 border-b border-yellow-700/50 p-2"
              >
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-300 text-xs">
                    {connectionStatus === 'limited' 
                      ? 'Sydney is experiencing high demand. Some features may be limited.'
                      : 'Sydney is temporarily offline. Please try again later.'
                    }
                  </span>
                </div>
              </motion.div>
            )}

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto max-h-96 space-y-4">
              {loadingHistory && (
                <div className="text-center text-slate-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                  <p className="text-xs">Loading chat history...</p>
                </div>
              )}

              {messages.length === 0 && !loadingHistory && (
                <div className="text-center text-slate-400 py-8">
                  <SydneyAvatar className="w-12 h-12 mx-auto mb-3" />
                  <p className="text-sm">Hi! I'm Sydney, your AI trading assistant.</p>
                  <p className="text-xs mt-1">Ask me anything about your trades!</p>
                  <div className="mt-4 space-y-2 text-xs">
                    <p className="text-slate-500">Try asking:</p>
                    <div className="space-y-1">
                      <p>"How's my trading performance?"</p>
                      <p>"Tell me a trading joke"</p>
                      <p>"What's Bitcoin doing today?"</p>
                      <p>"Help me with risk management"</p>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-2 max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}>
                    <div className={`p-2 rounded-full ${
                      message.role === 'user' 
                        ? 'bg-blue-600' 
                        : 'bg-gradient-to-br from-purple-500 to-pink-500'
                    }`}>
                      {message.role === 'user' ? (
                        <User className="w-3 h-3 text-white" />
                      ) : (
                        <SydneyAvatar className="w-3 h-3" />
                      )}
                    </div>
                    <div className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-100'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex items-start space-x-2">
                    <SydneyAvatar className="w-8 h-8" />
                    <div className="p-3 rounded-lg bg-slate-700 text-slate-100">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Sydney is thinking...</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={connectionStatus === 'connected' ? "Ask Sydney anything..." : "Limited functionality..."}
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  disabled={isLoading || connectionStatus === 'offline'}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading || connectionStatus === 'offline'}
                  className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              
              {messages.length > 0 && (
                <div className="flex items-center justify-between mt-2">
                  <button
                    onClick={clearChat}
                    className="text-xs text-slate-400 hover:text-slate-300 transition-colors flex items-center"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clear chat
                  </button>
                  <span className="text-xs text-slate-500">
                    {messages.length} messages
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EnhancedChatInterface;