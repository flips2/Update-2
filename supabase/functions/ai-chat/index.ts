import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ChatRequest {
  message: string;
  originalMessage?: string;
  sessionId?: string;
  userId: string;
  conversationContext?: string;
  hasLiveData?: boolean;
}

interface Trade {
  id: string;
  session_id: string;
  margin: number;
  roi: number;
  entry_side: 'Long' | 'Short';
  profit_loss: number;
  comments?: string;
  created_at: string;
}

interface TradingSession {
  id: string;
  user_id: string;
  name: string;
  initial_capital: number;
  current_capital: number;
  created_at: string;
  updated_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { message, originalMessage, sessionId, userId, conversationContext, hasLiveData }: ChatRequest = await req.json();

    // Get user's trading data
    const { data: sessions, error: sessionsError } = await supabaseClient
      .from('trading_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      throw new Error('Failed to fetch sessions');
    }

    const { data: trades, error: tradesError } = await supabaseClient
      .from('trades')
      .select('*, trading_sessions!inner(name)')
      .eq('trading_sessions.user_id', userId)
      .order('created_at', { ascending: false });

    if (tradesError) {
      throw new Error('Failed to fetch trades');
    }

    // Prepare context for AI
    const tradingContext = {
      sessions: sessions || [],
      trades: trades || [],
      totalSessions: sessions?.length || 0,
      totalTrades: trades?.length || 0,
      currentDate: new Date().toISOString(),
    };

    // Calculate some basic stats for context
    const totalProfit = trades?.reduce((sum, trade) => sum + trade.profit_loss, 0) || 0;
    const winningTrades = trades?.filter(trade => trade.profit_loss > 0).length || 0;
    const losingTrades = trades?.filter(trade => trade.profit_loss < 0).length || 0;
    const winRate = trades?.length ? (winningTrades / trades.length) * 100 : 0;

    const systemPrompt = `You are Sydney, an AI trading assistant for Laxmi Chit Fund's trading analytics platform. You are helpful, friendly, conversational, and knowledgeable about trading and markets.

PERSONALITY:
- Be conversational and natural like ChatGPT
- Use appropriate emojis to make responses engaging (but not too many)
- Ask follow-up questions to keep conversations flowing
- Remember context from recent messages
- Be encouraging and supportive about trading journey
- Handle both trading topics AND general conversation
- Show genuine interest in the user's trading progress
- Be knowledgeable about financial markets, economics, and trading

CONVERSATION CONTEXT:
${conversationContext || 'No previous conversation'}

USER'S TRADING DATA SUMMARY:
- Total Sessions: ${tradingContext.totalSessions}
- Total Trades: ${tradingContext.totalTrades}
- Total P/L: $${totalProfit.toFixed(2)}
- Win Rate: ${winRate.toFixed(1)}%
- Winning Trades: ${winningTrades}
- Losing Trades: ${losingTrades}

Recent Sessions: ${JSON.stringify(sessions?.slice(0, 3), null, 2)}
Recent Trades: ${JSON.stringify(trades?.slice(0, 5), null, 2)}

${hasLiveData ? `
🌐 LIVE DATA INTEGRATION:
The user's message has been enriched with real-time market data or web search results. This information is current and accurate. Use it naturally in your response.

ORIGINAL USER MESSAGE: "${originalMessage}"
ENRICHED MESSAGE WITH LIVE DATA: "${message}"

Please incorporate the live data naturally into your response. Don't just repeat it - analyze it, provide insights, and relate it to trading.
` : ''}

CAPABILITIES:
1. Analyze trading performance with specific data insights
2. Provide psychological feedback on trading patterns
3. Chat about general topics (weather, jokes, life, etc.)
4. Offer trading education and market insights
5. Help with risk management advice
6. Detect concerning trading behaviors
7. Be a supportive trading companion
8. Access live market data (crypto, stocks, forex)
9. Search the web for latest financial news and information
10. Provide real-time market analysis and commentary

RESPONSE GUIDELINES:
- Keep responses conversational and engaging
- Use specific data from their trading history when relevant
- Ask follow-up questions to encourage dialogue
- Be supportive but honest about trading performance
- Use emojis appropriately (not too many, but enough to be friendly)
- Vary your responses - don't be repetitive
- Remember what was discussed recently
- Handle both serious trading analysis and light conversation
- When provided with live market data, analyze it and provide insights
- When provided with news/search results, summarize key points and implications
- Always be helpful and informative

Current date: ${new Date().toLocaleDateString()}
Current time: ${new Date().toLocaleTimeString()}

Respond naturally to the user's message. If live data was provided, incorporate it seamlessly into your response with analysis and insights.`;

    // Use Gemini API
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': 'AIzaSyDQVkAyAqPuonnplLxqEhhGyW_FqjteaVw',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: systemPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.8,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1000,
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error('Gemini API request failed');
    }

    const aiData = await geminiResponse.json();
    const aiMessage = aiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not process your request.';

    return new Response(
      JSON.stringify({ 
        message: aiMessage,
        usage: aiData.usageMetadata 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in AI chat function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process chat request',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});