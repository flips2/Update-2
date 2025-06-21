import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../lib/supabase';
import { conversationManager } from './conversationService';
import { JokeService } from './jokeService';
import { marketDataService } from './marketDataService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const genAI = new GoogleGenerativeAI('AIzaSyDQVkAyAqPuonnplLxqEhhGyW_FqjteaVw');

export const aiService = {
  async sendChatMessage(message: string, userId: string, sessionId?: string): Promise<string> {
    // Add user message to conversation context
    conversationManager.addMessage(userId, 'user', message);
    
    // Check for specific patterns first (jokes, session switching)
    const specialResponse = await this.handleSpecialQueries(message, userId, sessionId);
    if (specialResponse) {
      conversationManager.addMessage(userId, 'assistant', specialResponse);
      return specialResponse;
    }

    // Handle market data and web search queries
    const { enrichedPrompt, hasLiveData } = await marketDataService.handleUserMessage(message);
    
    // Get conversation context
    const recentContext = conversationManager.getRecentMessages(userId, 8);
    
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: enrichedPrompt,
        originalMessage: message,
        userId,
        sessionId,
        conversationContext: recentContext,
        hasLiveData,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to send chat message');
    }

    const aiResponse = data.message;
    conversationManager.addMessage(userId, 'assistant', aiResponse);
    return aiResponse;
  },

  async handleSpecialQueries(message: string, userId: string, sessionId?: string): Promise<string | null> {
    const normalizedMessage = message.toLowerCase().trim();
    
    // Handle joke requests
    if (this.isJokeRequest(normalizedMessage)) {
      return this.handleJokeRequest(userId, normalizedMessage);
    }
    
    // Handle session switching
    if (this.isSessionSwitchRequest(normalizedMessage)) {
      return await this.handleSessionSwitch(message, userId);
    }
    
    return null;
  },

  isJokeRequest(message: string): boolean {
    const jokePatterns = [
      /tell me a joke/i,
      /joke/i,
      /funny/i,
      /make me laugh/i,
      /another one/i,
      /more joke/i,
      /that's funny/i,
      /haha/i,
      /lol/i
    ];
    
    return jokePatterns.some(pattern => pattern.test(message));
  },

  handleJokeRequest(userId: string, message: string): string {
    const usedJokes = conversationManager.getUsedJokes(userId);
    const recentMessages = conversationManager.getRecentMessages(userId, 3);
    
    // Determine if user wants another joke
    const wantsAnother = /another|more|again/i.test(message);
    const isFollowUp = /haha|lol|funny|good one/i.test(message);
    
    let joke;
    if (message.includes('crypto') || message.includes('bitcoin')) {
      joke = JokeService.getRandomJoke(usedJokes, 'crypto');
    } else if (message.includes('market') || message.includes('bull') || message.includes('bear')) {
      joke = JokeService.getRandomJoke(usedJokes, 'market');
    } else {
      joke = JokeService.getRandomJoke(usedJokes, 'trading');
    }
    
    if (!joke) {
      // Reset if all jokes have been used
      conversationManager.clearUsedJokes(userId);
      joke = JokeService.getRandomJoke([], 'trading');
    }
    
    if (joke) {
      conversationManager.markJokeUsed(userId, joke.id);
      
      let response = '';
      if (isFollowUp && recentMessages.includes('joke')) {
        response = "Glad you enjoyed that! 😄 Here's another one:\n\n";
      } else if (wantsAnother && recentMessages.includes('joke')) {
        response = "You're in a good mood! 😄 Here's another one:\n\n";
      } else if (recentMessages.includes('joke')) {
        response = "Here's a different one for you:\n\n";
      }
      
      response += JokeService.formatJoke(joke);
      
      // Add a follow-up question occasionally
      if (Math.random() > 0.6) {
        const followUps = [
          "\n\nHow's your trading going today? Any interesting setups you're watching? 📈",
          "\n\nSpeaking of trading, need help analyzing any of your recent trades? 📊",
          "\n\nWhat markets are you keeping an eye on today? 👀",
          "\n\nAny questions about your trading performance? I'm here to help! 🤝"
        ];
        response += followUps[Math.floor(Math.random() * followUps.length)];
      }
      
      return response;
    }
    
    return "I'm all out of fresh jokes for now! 😅 But I'd love to help you with your trading analysis instead! What would you like to know about your trades?";
  },

  isSessionSwitchRequest(message: string): boolean {
    const switchPatterns = [
      /load.*session/i,
      /switch to/i,
      /open.*session/i,
      /change to.*session/i
    ];
    
    return switchPatterns.some(pattern => pattern.test(message));
  },

  async handleSessionSwitch(message: string, userId: string): Promise<string> {
    const sessionNameMatch = message.match(/(?:load|switch to|open|change to)\s+(?:the\s+)?(.+?)\s+session/i);
    if (!sessionNameMatch) {
      return "I'd be happy to help you switch sessions! Could you tell me which session you'd like to load? For example: \"Load the BTC session\" or \"Switch to EUR/USD session\"";
    }
    
    const sessionName = sessionNameMatch[1];
    const sessionId = await this.switchToSession(sessionName, userId);
    
    if (sessionId) {
      return `✅ Switched to "${sessionName}" session! You can now view and analyze the trades from this session. What would you like to know about it?`;
    } else {
      return `❌ I couldn't find a session named "${sessionName}". Here are some tips:\n• Check the spelling\n• Try using part of the session name\n• Ask me to list your sessions first`;
    }
  },

  async generateSessionSummary(sessionId: string, userId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('generate-session-summary', {
      body: {
        sessionId,
        userId,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to generate session summary');
    }

    return data.summary;
  },

  async analyzeTradeScreenshot(imageFile: File): Promise<any> {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:image/... prefix
        };
        reader.readAsDataURL(imageFile);
      });

      const prompt = `Analyze this trading screenshot and extract ALL visible trade information. Look for:
- Currency pairs, stock symbols, or crypto symbols
- Buy/Sell or Long/Short positions
- Entry and exit prices
- Lot sizes or volumes
- Profit/Loss amounts
- Open and close times if visible

Return ONLY valid JSON in this exact format:

{
  "trades": [
    {
      "symbol": "extracted_symbol_or_pair",
      "side": "Long" or "Short",
      "volume": number_or_null,
      "entryPrice": number_or_null,
      "exitPrice": number_or_null,
      "profit": number_or_null,
      "openTime": "time_string_or_null",
      "closeTime": "time_string_or_null"
    }
  ]
}

Rules:
- Convert Buy→Long, Sell→Short
- Extract only numbers (no currency symbols like $ or €)
- If multiple trades visible, include all in array
- If data not clearly visible, use null
- Return valid JSON only, no explanations
- Be very careful with number extraction`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: imageFile.type
          }
        }
      ]);

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
    } catch (error) {
      console.error('Screenshot analysis error:', error);
      throw new Error('Failed to analyze screenshot. Please ensure the image shows clear trading information.');
    }
  },

  async switchToSession(sessionName: string, userId: string): Promise<string | null> {
    try {
      // Get user's sessions
      const { data: sessions, error } = await supabase
        .from('trading_sessions')
        .select('*')
        .eq('user_id', userId)
        .ilike('name', `%${sessionName}%`);

      if (error || !sessions || sessions.length === 0) {
        return null;
      }

      // Return the best match (first one for now, could be improved with fuzzy matching)
      return sessions[0].id;
    } catch (error) {
      console.error('Session switching error:', error);
      return null;
    }
  },

  // Generate a stable greeting that doesn't change randomly
  getGreeting(userName?: string): string {
    // Create a stable seed based on the current day to ensure greeting stays same for the day
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const seed = dayOfYear + (userName ? userName.length : 0);
    
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth();
    const day = now.getDate();

    let timeGreeting = '';
    let creativeGreeting = '';
    
    // Special creative greetings for very late/early hours (2-4 AM)
    if (hour >= 2 && hour <= 4) {
      const nightOwlGreetings = [
        `Hello night owl${userName ? ` ${userName}` : ''}! 🦉 Still hunting for those perfect trades?`,
        `Hey there, midnight trader${userName ? ` ${userName}` : ''}! 🌙 The markets never sleep, and neither do you!`,
        `Burning the midnight oil${userName ? `, ${userName}` : ''}? ⭐ Let's make these late-night hours count!`,
        `Wide awake${userName ? ` ${userName}` : ''}? 🌃 Perfect time for some deep market analysis!`,
        `Early bird or night owl${userName ? `, ${userName}` : ''}? 🌅 Either way, I'm here to help with your trading!`
      ];
      return nightOwlGreetings[seed % nightOwlGreetings.length];
    }
    
    // Regular time-based greetings
    if (hour >= 5 && hour < 12) {
      timeGreeting = 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon';
    } else if (hour >= 17 && hour < 22) {
      timeGreeting = 'Good evening';
    } else {
      // Late night (22-1 AM)
      const lateNightGreetings = [
        `Good evening${userName ? ` ${userName}` : ''}! 🌙 Trading into the night?`,
        `Hey there${userName ? ` ${userName}` : ''}! 🌃 Late night trading session?`,
        `Evening${userName ? ` ${userName}` : ''}! 🌆 Perfect time to review today's trades!`
      ];
      return lateNightGreetings[seed % lateNightGreetings.length];
    }

    let holidayGreeting = '';
    // Christmas
    if (month === 11 && day === 25) {
      holidayGreeting = '🎄 Merry Christmas! ';
    }
    // New Year
    else if (month === 0 && day === 1) {
      holidayGreeting = '🎉 Happy New Year! ';
    }
    // Halloween
    else if (month === 9 && day === 31) {
      holidayGreeting = '🎃 Happy Halloween! ';
    }

    const name = userName ? ` ${userName}` : '';
    const greetings = [
      `${holidayGreeting}${timeGreeting}${name}! How's your trading going today?`,
      `${holidayGreeting}${timeGreeting}${name}! Ready to analyze some trades?`,
      `${holidayGreeting}${timeGreeting}${name}! What's on your trading radar today?`,
      `${holidayGreeting}${timeGreeting}${name}! Any exciting market moves catching your eye?`,
      `${holidayGreeting}${timeGreeting}${name}! I'm here to help with your trading analysis!`
    ];
    
    // Use seed to pick a stable greeting for the day
    return greetings[seed % greetings.length];
  }
};