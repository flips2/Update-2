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
  Image as ImageIcon
} from 'lucide-react';
import { aiService, ChatMessage } from '../../services/aiService';
import { useAuth } from '../../hooks/useAuth';
import DragDropUpload from '../UI/DragDropUpload';
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

interface ChatInterfaceProps {
  currentSessionId?: string;
  onSessionSwitch?: (sessionId: string) => void;
  onTradeDataExtracted?: (tradeData: any) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  currentSessionId, 
  onSessionSwitch,
  onTradeDataExtracted 
}) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
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
    }
  }, [isOpen, isMinimized]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !user || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Check if user wants to switch sessions
      const sessionSwitchPatterns = [
        /load\s+(?:the\s+)?(.+?)\s+session/i,
        /switch\s+to\s+(.+)/i,
        /open\s+(.+?)\s+session/i
      ];

      let sessionSwitched = false;
      for (const pattern of sessionSwitchPatterns) {
        const match = currentInput.match(pattern);
        if (match) {
          const sessionName = match[1];
          const sessionId = await aiService.switchToSession(sessionName, user.id);
          if (sessionId && onSessionSwitch) {
            onSessionSwitch(sessionId);
            const assistantMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `✅ Switched to "${sessionName}" session! You can now view and analyze the trades from this session.`,
              timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMessage]);
            sessionSwitched = true;
            break;
          }
        }
      }

      if (!sessionSwitched) {
        const aiResponse = await aiService.sendChatMessage(
          currentInput,
          user.id,
          currentSessionId
        );

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      toast.error('Failed to get Sydney\'s response');
      console.error('Chat error:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I\'m having trouble right now. Please try again in a moment! 🤖',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setIsLoading(true);
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `📷 Uploaded trading screenshot: ${file.name}`,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const analysisResult = await aiService.analyzeTradeScreenshot(file);
      
      let responseContent = '📊 **Trade Screenshot Analysis:**\n\n';
      
      if (analysisResult.trades && analysisResult.trades.length > 0) {
        analysisResult.trades.forEach((trade: any, index: number) => {
          responseContent += `**Trade ${index + 1}:**\n`;
          responseContent += `• Symbol: ${trade.symbol || 'Not detected'}\n`;
          responseContent += `• Side: ${trade.side || 'Not detected'}\n`;
          responseContent += `• Volume: ${trade.volume || 'Not detected'}\n`;
          responseContent += `• Entry: ${trade.entryPrice || 'Not detected'}\n`;
          responseContent += `• Exit: ${trade.exitPrice || 'Not detected'}\n`;
          responseContent += `• P/L: ${trade.profit || 'Not detected'}\n\n`;
        });
        
        responseContent += '💡 I can help you add these trades to your session! Would you like me to auto-fill the trade form with this data?';
        
        // Notify parent component about extracted trade data
        if (onTradeDataExtracted && analysisResult.trades.length > 0) {
          onTradeDataExtracted(analysisResult.trades[0]);
        }
      } else {
        responseContent += '❌ I couldn\'t extract clear trade data from this screenshot. Here are some tips for better results:\n\n';
        responseContent += '• Ensure the screenshot shows clear profit/loss numbers\n';
        responseContent += '• Make sure currency pairs or symbols are visible\n';
        responseContent += '• Check that entry/exit prices are readable\n';
        responseContent += '• Try cropping to focus on the trade details\n\n';
        responseContent += 'Feel free to try again with a clearer image! 📸';
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      toast.success('Screenshot analyzed successfully!');
    } catch (error) {
      toast.error('Failed to analyze screenshot');
      console.error('Screenshot analysis error:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ I had trouble analyzing that screenshot. Please make sure the image shows clear trading information and try again! The image should contain visible:\n\n• Currency pairs or symbols\n• Entry and exit prices\n• Profit/loss amounts\n• Position sizes\n\nTry uploading a clearer screenshot! 📷',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setShowImageUpload(false);
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
            <p className="text-slate-400 text-xs">Your AI Trading Assistant</p>
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
            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto max-h-96 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 py-8">
                  <SydneyAvatar className="w-12 h-12 mx-auto mb-3" />
                  <p className="text-sm">Hi! I'm Sydney, your AI trading assistant.</p>
                  <p className="text-xs mt-1">Ask me anything about your trades!</p>
                  <div className="mt-4 space-y-2 text-xs">
                    <p className="text-slate-500">Try asking:</p>
                    <div className="space-y-1">
                      <p>"What's Bitcoin price today?"</p>
                      <p>"Tell me a trading joke"</p>
                      <p>"Load the BTC session"</p>
                      <p>"Analyze my performance"</p>
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

            {/* Image Upload Section */}
            {showImageUpload && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 border-t border-slate-700"
              >
                <DragDropUpload
                  onFileUpload={handleImageUpload}
                  accept="image/*"
                  maxSize={10}
                  className="mb-2"
                />
                <button
                  onClick={() => setShowImageUpload(false)}
                  className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
                >
                  Cancel upload
                </button>
              </motion.div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex items-center space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask Sydney anything..."
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  disabled={isLoading}
                />
                <button
                  onClick={() => setShowImageUpload(!showImageUpload)}
                  className={`p-2 rounded-lg transition-colors ${
                    showImageUpload 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                  title="Upload trading screenshot"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="text-xs text-slate-400 hover:text-slate-300 mt-2 transition-colors"
                >
                  Clear chat
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ChatInterface;