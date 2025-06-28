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

interface MarketData {
  searchResults?: Array<{
    title: string;
    url: string;
    publishedDate?: string;
    author?: string;
    content?: string;
  }>;
}

async function fetchMarketData(query: string): Promise<MarketData> {
  const exaApiKey = Deno.env.get('EXA_API_KEY');
  if (!exaApiKey) {
    console.error('Exa API key not found');
    return {};
  }
  const marketData: MarketData = {};

  try {
    // Always perform a market-relevant search based on the query
    // Add market-related terms to make the search more relevant
    const searchQuery = `${query} market finance trading analysis current price`;
    console.log('Searching Exa with query:', searchQuery);

    // Call Exa API for real-time search
    const searchResponse = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${exaApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: searchQuery,
        numResults: 5,
        useAutoprompt: true,
        type: "keyword",
        includeDomains: [
          "reuters.com",
          "bloomberg.com",
          "ft.com",
          "wsj.com",
          "cnbc.com",
          "marketwatch.com",
          "investing.com",
          "finance.yahoo.com",
          "tradingview.com",
          "seekingalpha.com"
        ],
        dateRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
          end: new Date().toISOString()
        }
      })
    });

    console.log('Exa search response status:', searchResponse.status);
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('Exa search error:', errorText);
      throw new Error('Failed to fetch from Exa API');
    }

    const searchData = await searchResponse.json();
    console.log('Exa search results:', searchData);
    
    if (!searchData.results?.length) {
      console.log('No search results found');
      return marketData;
    }

    // Get content for each result
    const contentPromises = searchData.results.map(async (result: any) => {
      try {
        console.log('Fetching content for result:', result.id);
        const contentResponse = await fetch('https://api.exa.ai/get_contents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${exaApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ids: [result.id]
          })
        });

        if (!contentResponse.ok) {
          const errorText = await contentResponse.text();
          console.error('Content fetch error:', errorText);
          return result;
        }

        const contentData = await contentResponse.json();
        console.log('Content data received for:', result.id);
        return {
          ...result,
          content: contentData.contents[0]?.extract || ''
        };
      } catch (error) {
        console.error('Error fetching content for result:', result.id, error);
        return result;
      }
    });

    const enrichedResults = await Promise.all(contentPromises);
    marketData.searchResults = enrichedResults.map(result => ({
      title: result.title,
      url: result.url,
      publishedDate: result.publishedDate,
      author: result.author,
      content: result.content
    }));

    console.log('Final market data:', marketData);
    return marketData;
  } catch (error) {
    console.error('Error in fetchMarketData:', error);
    return marketData;
  }
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
    console.log('Received message:', message);

    // Always fetch market data
    const marketData = await fetchMarketData(message);
    console.log('Market data fetched:', marketData);

    // Enrich the message with market data if available
    let enrichedMessage = message;
    if (marketData.searchResults?.length) {
      enrichedMessage += '\n\nRelevant Market Information:\n' + marketData.searchResults
        .map(result => {
          let summary = `📰 ${result.title}`;
          if (result.publishedDate) {
            summary += ` (${new Date(result.publishedDate).toLocaleDateString()})`;
          }
          if (result.content) {
            // Limit content to first two sentences for clarity
            const sentences = result.content.split(/[.!?]+/).slice(0, 2).join('. ') + '.';
            summary += `\n${sentences}`;
          }
          return summary;
        })
        .join('\n\n');
    }

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

    // Get current time in different time zones
    const now = new Date();
    const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const londonTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    const tokyoTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const sydneyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));

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

CURRENT MARKET HOURS (${now.toISOString()}):
🗽 New York: ${nyTime.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: true })}
🇬🇧 London: ${londonTime.toLocaleString('en-US', { timeZone: 'Europe/London', hour12: true })}
🗼 Tokyo: ${tokyoTime.toLocaleString('en-US', { timeZone: 'Asia/Tokyo', hour12: true })}
🦘 Sydney: ${sydneyTime.toLocaleString('en-US', { timeZone: 'Australia/Sydney', hour12: true })}

MARKET STATUS:
- NYSE/NASDAQ: ${isMarketOpen(nyTime, 'US') ? '🟢 Open' : '🔴 Closed'}
- London (LSE): ${isMarketOpen(londonTime, 'UK') ? '🟢 Open' : '🔴 Closed'}
- Tokyo (TSE): ${isMarketOpen(tokyoTime, 'JP') ? '🟢 Open' : '🔴 Closed'}
- Sydney (ASX): ${isMarketOpen(sydneyTime, 'AU') ? '🟢 Open' : '🔴 Closed'}

USER'S TRADING DATA SUMMARY:
- Total Sessions: ${tradingContext.totalSessions}
- Total Trades: ${tradingContext.totalTrades}
- Total P/L: $${totalProfit.toFixed(2)}
- Win Rate: ${winRate.toFixed(1)}%
- Winning Trades: ${winningTrades}
- Losing Trades: ${losingTrades}

Recent Sessions: ${JSON.stringify(sessions?.slice(0, 3), null, 2)}
Recent Trades: ${JSON.stringify(trades?.slice(0, 5), null, 2)}

${marketData.searchResults?.length ? `
🌐 LIVE MARKET DATA:
${marketData.searchResults.map(result => {
  let info = `📰 ${result.title}`;
  if (result.publishedDate) {
    info += ` (${new Date(result.publishedDate).toLocaleDateString()})`;
  }
  if (result.content) {
    info += `\n${result.content.slice(0, 200)}...`;
  }
  return info;
}).join('\n\n')}

ORIGINAL USER MESSAGE: "${originalMessage || message}"
ENRICHED MESSAGE WITH LIVE DATA: "${enrichedMessage}"

Please analyze this real-time market data and provide insights relevant to the user's query. Focus on extracting key market trends, price movements, and significant news that could impact trading decisions.
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

    // Helper function to determine if a market is open
    function isMarketOpen(localTime: Date, market: 'US' | 'UK' | 'JP' | 'AU'): boolean {
      const hour = localTime.getHours();
      const minutes = localTime.getMinutes();
      const day = localTime.getDay();
      
      // Weekend check (Saturday = 6, Sunday = 0)
      if (day === 0 || day === 6) return false;
      
      switch (market) {
        case 'US': // NYSE/NASDAQ (9:30 AM - 4:00 PM EST)
          return (hour > 9 || (hour === 9 && minutes >= 30)) && hour < 16;
        case 'UK': // LSE (8:00 AM - 4:30 PM GMT)
          return (hour >= 8) && (hour < 16 || (hour === 16 && minutes <= 30));
        case 'JP': // TSE (9:00 AM - 3:00 PM JST)
          return hour >= 9 && hour < 15;
        case 'AU': // ASX (10:00 AM - 4:00 PM AEST)
          return hour >= 10 && hour < 16;
        default:
          return false;
      }
    }

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