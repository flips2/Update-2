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
      const prompt = `Analyze this trading table screenshot and extract ALL visible data. This is a trading history table with the following structure:

**TABLE FORMAT (left to right columns):**
1. Symbol (e.g., XAU/USD, EUR/USD)
2. Type (Buy/Sell with colored indicators)
3. Volume/Lot size (decimal numbers like 0.01, 0.1)
4. Open Price (entry price)
5. Close Price (exit price) 
6. **T/P (Take Profit)** - CRITICAL: This is column 6, always extract this number
7. **S/L (Stop Loss)** - CRITICAL: This is column 7, always extract this number
8. Position ID or status
9. Open Time (format: "Jun 16, 8:50:55 PM")
10. Close Time (format: "Jun 16, 11:41:00 PM")
11. Additional columns (Swap, Reason, P/L)

**CRITICAL EXTRACTION RULES:**
- T/P and S/L are ALWAYS in columns 6 and 7 - extract these numbers even if they look like prices
- Times are in format "Jun 16, 8:50:55 PM" - convert to ISO format "2024-06-16T20:50:55Z"
- Numbers may have commas (3,401.188) - extract as numbers without commas
- Look for +/- in P/L column for profit/loss values
- The table has NO headers - identify columns by position from left to right

**DATETIME CONVERSION:**
- "Jun 16, 8:50:55 PM" → "2024-06-16T20:50:55Z"
- "Jun 16, 11:41:00 PM" → "2024-06-16T23:41:00Z"
- Convert AM/PM to 24-hour format
- Assume current year (2024) if not specified

Return ONLY this JSON structure:

{
  "symbol": "extracted symbol",
  "type": "Buy or Sell",
  "volumeLot": extracted_lot_size_number,
  "openPrice": open_price_number,
  "closePrice": close_price_number,
  "tp": take_profit_from_column_6,
  "sl": stop_loss_from_column_7,
  "position": "Open or Closed",
  "openTime": "ISO_datetime_string",
  "closeTime": "ISO_datetime_string",
  "reason": "reason_if_visible",
  "pnlUsd": profit_loss_number
}

MANDATORY: Extract T/P and S/L from columns 6 and 7. Do NOT return null for these if numbers are visible in those positions.`;

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
      
      // Add debug logging to help troubleshoot extraction issues
      console.log('AI Response:', text);
      
      try {
        // Clean the response text first
        let cleanText = text.trim();
        
        // Remove any markdown formatting
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        // Try to parse the response as JSON
        let parsedData = JSON.parse(cleanText);
        
        // Validate and clean the data
        parsedData = this.validateAndCleanExtractedData(parsedData);
        
        // Log the final extracted data for debugging
        console.log('Extracted Data:', parsedData);
        
        return parsedData;
      } catch (parseError) {
        // Try to extract JSON from various formats
        const patterns = [
          /```json\n([\s\S]*?)\n```/,
          /```\n([\s\S]*?)\n```/,
          /\{[\s\S]*\}/
        ];
        
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            try {
              let jsonStr = match[1] || match[0];
              jsonStr = jsonStr.trim();
              
              let parsedData = JSON.parse(jsonStr);
              parsedData = this.validateAndCleanExtractedData(parsedData);
              return parsedData;
            } catch (e) {
              continue;
            }
          }
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

  private validateAndCleanExtractedData(data: any): ExtractedTradeData {
    // Ensure all expected fields exist and have proper types
    const cleanData: ExtractedTradeData = {
      symbol: data.symbol || undefined,
      type: data.type || undefined,
      volumeLot: this.parseNumber(data.volumeLot),
      openPrice: this.parseNumber(data.openPrice),
      closePrice: this.parseNumber(data.closePrice),
      tp: this.parseNumber(data.tp),
      sl: this.parseNumber(data.sl),
      position: data.position || undefined,
      openTime: this.parseDateTime(data.openTime),
      closeTime: this.parseDateTime(data.closeTime),
      reason: data.reason || undefined,
      pnlUsd: this.parseNumber(data.pnlUsd)
    };

    return cleanData;
  }

  private parseNumber(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    
    // Convert to string and clean up
    let numStr = value.toString().trim();
    
    // Remove commas (for numbers like "3,401.188")
    numStr = numStr.replace(/,/g, '');
    
    // Remove any currency symbols or extra characters
    numStr = numStr.replace(/[$€£¥+\s]/g, '');
    
    // Handle negative numbers with parentheses or minus sign
    if (numStr.includes('(') && numStr.includes(')')) {
      numStr = '-' + numStr.replace(/[()]/g, '');
    }
    
    const parsed = parseFloat(numStr);
    return isNaN(parsed) ? undefined : parsed;
  }

  private parseDateTime(value: any): string | undefined {
    if (!value || value === null || value === undefined) return undefined;
    
    try {
      // Handle the specific format from the trading screenshots: "Jun 16, 8:50:55 PM"
      const dateStr = value.toString().trim();
      
      // If it's already in ISO format, return as is
      if (dateStr.includes('T') && dateStr.includes('-')) {
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? undefined : date.toISOString();
      }
      
      // Handle "Jun 16, 8:50:55 PM" format specifically
      const monthMap: { [key: string]: string } = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      
      // Match pattern like "Jun 16, 8:50:55 PM"
      const match = dateStr.match(/(\w{3})\s+(\d{1,2}),\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)/i);
      if (match) {
        const [, monthName, day, hour, minute, second, ampm] = match;
        const month = monthMap[monthName];
        
        if (month) {
          let hour24 = parseInt(hour);
          if (ampm.toUpperCase() === 'PM' && hour24 !== 12) {
            hour24 += 12;
          } else if (ampm.toUpperCase() === 'AM' && hour24 === 12) {
            hour24 = 0;
          }
          
          const year = new Date().getFullYear(); // Assume current year
          const isoString = `${year}-${month}-${day.padStart(2, '0')}T${hour24.toString().padStart(2, '0')}:${minute}:${second}Z`;
          
          const date = new Date(isoString);
          return isNaN(date.getTime()) ? undefined : date.toISOString();
        }
      }
      
      // Fallback to standard parsing
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return undefined;
      
      return date.toISOString();
    } catch (e) {
      console.error('DateTime parsing error:', e, 'for value:', value);
      return undefined;
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
      console.log("Response of AI:", response.text());
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

  /**
   * Analyzes crypto trading screenshots specifically for crypto futures tables
   * Handles different column layout compared to forex trading tables
   */
  async analyzeCryptoScreenshot(imageFile: File): Promise<ExtractedTradeData> {
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

      // Crypto-specific prompt for crypto trading tables
      const prompt = `Analyze this CRYPTO trading table screenshot and extract ALL visible data. This is a crypto futures trading history table with the following structure:

**CRYPTO TABLE FORMAT (columns from left to right):**
1. Futures (Symbol) - e.g., "BTCUSDT Perpetual", "ETHUSDT Perpetual"
2. Margin Mode - "Cross" or "Isolated"
3. Avg Close Price - closing price (numbers like 107,128.9)
4. Direction - "Long" or "Short" (may have colored indicators)
5. Margin Adjustment History - usually "View History" text or actual history
6. Close Time - format: "2024-05-28 21:11:47" or similar timestamp
7. Closing Quantity - amount with USDT suffix (e.g., "548.5579 USDT")
8. Status - "All Closed", "Open", etc.
9. Realized PNL - profit/loss amount, often in green/red (e.g., "4,881 USDT", "+2,144 USD")
10. Open Time - format: "2024-05-28 18:57:22" or similar timestamp  
11. Avg Entry Price - entry price (numbers like 108,045.3)

**CRITICAL EXTRACTION RULES FOR CRYPTO:**
- Extract futures symbol INCLUDING "Perpetual" if present
- Direction is "Long" or "Short" (look for colored indicators)
- Times are in format "2024-05-28 21:11:47" - keep as ISO format
- Closing Quantity may have "USDT" suffix - extract just the number
- Realized PNL may have "USDT" or "USD" suffix - extract just the number
- Numbers may have commas (107,128.9) - extract as numbers without commas
- Look for + or - signs in PNL values for profit/loss
- The table has NO headers - identify columns by position from left to right

**DATETIME HANDLING:**
- Times are already in format "2024-05-28 21:11:47"
- Convert to ISO format: "2024-05-28T21:11:47Z"

Return ONLY this JSON structure:

{
  "futuresSymbol": "extracted_futures_symbol",
  "marginMode": "Cross or Isolated", 
  "avgClosePrice": close_price_number,
  "direction": "Long or Short",
  "marginAdjustmentHistory": "extracted_history_or_null",
  "closeTime": "ISO_datetime_string",
  "closingQuantity": closing_quantity_number,
  "realizedPnl": realized_pnl_number,
  "openTime": "ISO_datetime_string",
  "avgEntryPrice": entry_price_number
}

MANDATORY: Extract ALL visible numeric values and times. Do NOT return null for fields that have visible data in the table.`;

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
      
      // Add debug logging to help troubleshoot extraction issues
      console.log('Crypto AI Response:', text);
      
      try {
        // Clean the response text first
        let cleanText = text.trim();
        
        // Remove any markdown formatting
        cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        // Try to parse the response as JSON
        let parsedData = JSON.parse(cleanText);
        
        // Validate and clean the crypto data
        parsedData = this.validateAndCleanCryptoData(parsedData);
        
        // Log the final extracted data for debugging
        console.log('Extracted Crypto Data:', parsedData);
        
        return parsedData;
      } catch (parseError) {
        // Try to extract JSON from various formats
        const patterns = [
          /```json\n([\s\S]*?)\n```/,
          /```\n([\s\S]*?)\n```/,
          /\{[\s\S]*\}/
        ];
        
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            try {
              let jsonStr = match[1] || match[0];
              jsonStr = jsonStr.trim();
              
              let parsedData = JSON.parse(jsonStr);
              parsedData = this.validateAndCleanCryptoData(parsedData);
              return parsedData;
            } catch (e) {
              continue;
            }
          }
        }
        
        throw new Error('Could not extract valid JSON from AI response');
      }
    } catch (error: any) {
      console.error('Crypto screenshot analysis error:', error);
      
      // Return a helpful fallback response for quota errors
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        throw new Error('AI analysis is temporarily unavailable due to high demand. Please try again in a few minutes, or enter your trade data manually.');
      }
      
      throw new Error('Failed to analyze crypto screenshot. Please ensure the image shows clear trading information.');
    }
  }

  private validateAndCleanCryptoData(data: any): ExtractedTradeData {
    // Ensure all expected crypto fields exist and have proper types
    const cleanData: ExtractedTradeData = {
      // Crypto specific fields
      futuresSymbol: data.futuresSymbol || undefined,
      marginMode: data.marginMode || undefined,
      avgClosePrice: this.parseNumber(data.avgClosePrice),
      direction: data.direction || undefined,
      marginAdjustmentHistory: data.marginAdjustmentHistory || undefined,
      closeTime: this.parseDateTime(data.closeTime),
      closingQuantity: this.parseNumber(data.closingQuantity),
      realizedPnl: this.parseNumber(data.realizedPnl),
      openTime: this.parseDateTime(data.openTime),
      avgEntryPrice: this.parseNumber(data.avgEntryPrice),
      
      // Map to common fields for compatibility
      symbol: data.futuresSymbol || undefined,
      type: data.direction === 'Long' ? 'Buy' : data.direction === 'Short' ? 'Sell' : undefined,
      openPrice: this.parseNumber(data.avgEntryPrice),
      closePrice: this.parseNumber(data.avgClosePrice),
      pnlUsd: this.parseNumber(data.realizedPnl),
      volumeLot: this.parseNumber(data.closingQuantity)
    };

    return cleanData;
  }
}

export const enhancedAiService = new EnhancedAIService();