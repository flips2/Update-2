export interface ConversationContext {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  usedJokes: string[];
  userPreferences: {
    tone: 'casual' | 'professional' | 'friendly';
    topics: string[];
  };
  sessionStartTime: Date;
}

export class ConversationManager {
  private contexts: Map<string, ConversationContext> = new Map();

  getContext(userId: string): ConversationContext {
    if (!this.contexts.has(userId)) {
      this.contexts.set(userId, {
        messages: [],
        usedJokes: [],
        userPreferences: {
          tone: 'friendly',
          topics: []
        },
        sessionStartTime: new Date()
      });
    }
    return this.contexts.get(userId)!;
  }

  addMessage(userId: string, role: 'user' | 'assistant', content: string) {
    const context = this.getContext(userId);
    context.messages.push({
      role,
      content,
      timestamp: new Date()
    });
    
    // Keep only last 20 messages for context
    if (context.messages.length > 20) {
      context.messages = context.messages.slice(-20);
    }
  }

  getRecentMessages(userId: string, count: number = 10): string {
    const context = this.getContext(userId);
    const recent = context.messages.slice(-count);
    return recent.map(msg => `${msg.role}: ${msg.content}`).join('\n');
  }

  markJokeUsed(userId: string, jokeId: string) {
    const context = this.getContext(userId);
    context.usedJokes.push(jokeId);
    
    // Keep only last 15 used jokes to allow cycling
    if (context.usedJokes.length > 15) {
      context.usedJokes = context.usedJokes.slice(-15);
    }
  }

  getUsedJokes(userId: string): string[] {
    return this.getContext(userId).usedJokes;
  }

  clearUsedJokes(userId: string) {
    const context = this.getContext(userId);
    context.usedJokes = [];
  }

  clearContext(userId: string) {
    this.contexts.delete(userId);
  }

  // Get conversation statistics
  getConversationStats(userId: string) {
    const context = this.getContext(userId);
    const now = new Date();
    const sessionDuration = now.getTime() - context.sessionStartTime.getTime();
    
    return {
      messageCount: context.messages.length,
      sessionDurationMinutes: Math.floor(sessionDuration / (1000 * 60)),
      jokesTold: context.usedJokes.length,
      lastActivity: context.messages.length > 0 ? context.messages[context.messages.length - 1].timestamp : null
    };
  }

  // Detect user mood/tone from recent messages
  detectUserMood(userId: string): 'excited' | 'frustrated' | 'curious' | 'neutral' {
    const context = this.getContext(userId);
    const recentUserMessages = context.messages
      .filter(msg => msg.role === 'user')
      .slice(-3)
      .map(msg => msg.content.toLowerCase());
    
    const allRecentText = recentUserMessages.join(' ');
    
    // Excited indicators
    if (/!+|awesome|great|amazing|excellent|love|perfect/.test(allRecentText)) {
      return 'excited';
    }
    
    // Frustrated indicators
    if (/damn|shit|fuck|stupid|hate|terrible|awful|bad|wrong|error|fail/.test(allRecentText)) {
      return 'frustrated';
    }
    
    // Curious indicators
    if (/\?|how|what|why|when|where|explain|tell me|show me|help/.test(allRecentText)) {
      return 'curious';
    }
    
    return 'neutral';
  }

  // Get personalized response suggestions based on conversation history
  getResponseSuggestions(userId: string): string[] {
    const context = this.getContext(userId);
    const mood = this.detectUserMood(userId);
    const stats = this.getConversationStats(userId);
    
    const suggestions = [];
    
    // Based on mood
    if (mood === 'excited') {
      suggestions.push("That's fantastic! 🎉");
      suggestions.push("I love your enthusiasm! 😄");
    } else if (mood === 'frustrated') {
      suggestions.push("I understand that can be frustrating. Let me help! 🤝");
      suggestions.push("Don't worry, we'll figure this out together! 💪");
    } else if (mood === 'curious') {
      suggestions.push("Great question! Let me explain... 🤔");
      suggestions.push("I'd be happy to help you understand that! 📚");
    }
    
    // Based on conversation length
    if (stats.messageCount > 10) {
      suggestions.push("We've been chatting for a while! How can I help you further? 💬");
    }
    
    // Based on jokes told
    if (stats.jokesTold > 3) {
      suggestions.push("You seem to enjoy the jokes! 😄");
    }
    
    return suggestions;
  }
}

export const conversationManager = new ConversationManager();