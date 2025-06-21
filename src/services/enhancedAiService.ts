import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';
import { ExtractedTradeData, ChatMessage } from '../types';

const genAI = new GoogleGenerativeAI('AIzaSyDQVkAyAqPuonnplLxqEhhGyW_FqjteaVw');

export class EnhancedAIService {
  private model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Switch to Flash model for better quota
  private fallbackResponses = [
    "I'm experiencing high demand right now. Let me help you with your trading analysis in a moment! 📊",
    "My systems are busy processing other requests. Meanwhile, feel free to add your trades manually! 💪",
    "I'm temporarily unavailable, but your trading data is safe. Try again in a few moments! 🔄",
    "High traffic detected! While I recover, you can still use all other features of the platform! ⚡"
  ];

  private getRandomFallback(): string {
    return this.fallbackResponses[Math.floor(Math.random() * this.fallbackResponses.length)];
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Check if it's a quota error
        if (error.message?.includes('429') || error.message?.includes('quota')) {
          const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error; // Re-throw non-quota errors immediately
      }
    }
    throw new Error('Max retries exceeded');
  }

  async analyzeScreenshot(imageFile: File): Promise<ExtractedTradeData> {
    try {
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:image/... prefix
        };
        reader.readAsDataURL(imageFile);
      });

      // Simplified prompt for better quota efficiency
      const prompt = `Extract trading data from this screenshot. Return only valid JSON:

{
  "symbol": "string or null",
  "type": "Buy or Sell or null", 
  "volumeLot": "number or null",
  "openPrice": "number or null",
  "closePrice": "number or null",
  "tp": "number or null",
  "sl": "number or null",
  "position": "Open or Closed or null",
  "openTime": "datetime string or null",
  "closeTime": "datetime string or null", 
  "reason": "TP or SL or Early Close or Other or null",
  "pnlUsd": "number or null"
}

Extract only visible numbers. Use null if not clear.`;

      const result = await this.retryWithBackoff(async () => {
        return await this.model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: imageFile.type
            }
          }
        ]);
      });

      const response = await result.response;
      const text = response.text();
      
      try {
        // Try to parse the response as JSON
        return JSON.parse(text);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }
        
        // If still no valid JSON, try to find JSON-like content
        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonStr = text.substring(jsonStart, jsonEnd + 1);
          return JSON.parse(jsonStr);
        }
        
        throw new Error('Could not extract valid JSON from AI response');
      }
    } catch (error: any) {
      console.error('Screenshot analysis error:', error);
      
      // Return a helpful fallback response for quota errors
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        throw new Error('AI analysis is temporarily unavailable due to high demand. Please try again in a few minutes, or enter your trade data manually.');
      }
      
      throw new Error('Failed to analyze screenshot. Please ensure the image shows clear trading information.');
    }
  }

  async processMessage(message: string, userId: string): Promise<string> {
    try {
      // Get user's trading context with simplified query
      const { data: sessions } = await supabase
        .from('trading_sessions')
        .select('id, name, current_capital, initial_capital')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: trades } = await supabase
        .from('trades')
        .select('profit_loss, entry_side, created_at')
        .eq('session_id', sessions?.[0]?.id || '')
        .order('created_at', { ascending: false })
        .limit(10);

      // Calculate basic stats for context
      const totalProfit = trades?.reduce((sum, trade) => sum + trade.profit_loss, 0) || 0;
      const winningTrades = trades?.filter(trade => trade.profit_loss > 0).length || 0;
      const totalTrades = trades?.length || 0;
      const winRate = totalTrades ? (winningTrades / totalTrades) * 100 : 0;

      // Simplified system prompt to reduce token usage
      const systemPrompt = `You are Sydney, a friendly AI trading assistant. Be conversational and helpful.

User Stats: ${totalTrades} trades, ${winRate.toFixed(1)}% win rate, $${totalProfit.toFixed(2)} total P/L

Respond naturally to: "${message}"

Keep responses under 150 words. Use emojis sparingly.`;

      const result = await this.retryWithBackoff(async () => {
        return await this.model.generateContent(systemPrompt);
      });

      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error('AI message processing error:', error);
      
      // Return helpful fallback for quota errors
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        return this.getRandomFallback();
      }
      
      return "I'm having trouble processing your message right now. Please try again in a moment! 🤖";
    }
  }

  async saveChatMessage(userId: string, message: string, response: string): Promise<void> {
    try {
      // Save user message
      await supabase.from('chat_messages').insert({
        user_id: userId,
        message,
        message_type: 'user'
      });

      // Save AI response
      await supabase.from('chat_messages').insert({
        user_id: userId,
        message: response,
        message_type: 'ai'
      });
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  }

  async getChatHistory(userId: string, limit: number = 20): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }
  }

  getGreeting(userName?: string): string {
    const now = new Date();
    const hour = now.getHours();
    
    let timeGreeting = '';
    if (hour >= 5 && hour < 12) {
      timeGreeting = 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon';
    } else if (hour >= 17 && hour < 22) {
      timeGreeting = 'Good evening';
    } else {
      timeGreeting = 'Good evening';
    }

    const name = userName ? ` ${userName}` : '';
    const greetings = [
      `${timeGreeting}${name}! How's your trading going today?`,
      `${timeGreeting}${name}! Ready to analyze some trades?`,
      `${timeGreeting}${name}! What's on your trading radar today?`,
      `${timeGreeting}${name}! Any exciting market moves catching your eye?`,
      `${timeGreeting}${name}! I'm here to help with your trading analysis!`
    ];
    
    // Use a simple rotation based on the day
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return greetings[dayOfYear % greetings.length];
  }
}

export const enhancedAiService = new EnhancedAIService();