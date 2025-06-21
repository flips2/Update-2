import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SummaryRequest {
  sessionId: string;
  userId: string;
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

    const { sessionId, userId }: SummaryRequest = await req.json();

    // Get session data
    const { data: session, error: sessionError } = await supabaseClient
      .from('trading_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      throw new Error('Session not found');
    }

    // Get trades for this session
    const { data: trades, error: tradesError } = await supabaseClient
      .from('trades')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (tradesError) {
      throw new Error('Failed to fetch trades');
    }

    // Calculate session statistics
    const totalTrades = trades?.length || 0;
    const totalProfit = trades?.reduce((sum, trade) => sum + trade.profit_loss, 0) || 0;
    const winningTrades = trades?.filter(trade => trade.profit_loss > 0).length || 0;
    const losingTrades = trades?.filter(trade => trade.profit_loss < 0).length || 0;
    const winRate = totalTrades ? (winningTrades / totalTrades) * 100 : 0;
    const totalMargin = trades?.reduce((sum, trade) => sum + trade.margin, 0) || 0;
    const avgROI = totalTrades ? trades.reduce((sum, trade) => sum + trade.roi, 0) / totalTrades : 0;

    const systemPrompt = `You are Sydney, an AI trading analyst. Generate a comprehensive summary for this trading session.

Session Details:
- Name: ${session.name}
- Initial Capital: $${session.initial_capital}
- Current Capital: $${session.current_capital}
- Created: ${new Date(session.created_at).toLocaleDateString()}

Trading Performance:
- Total Trades: ${totalTrades}
- Net P/L: $${totalProfit.toFixed(2)}
- Win Rate: ${winRate.toFixed(1)}%
- Winning Trades: ${winningTrades}
- Losing Trades: ${losingTrades}
- Total Margin Used: $${totalMargin.toFixed(2)}
- Average ROI: ${avgROI.toFixed(2)}%

Individual Trades:
${JSON.stringify(trades, null, 2)}

Please provide:
1. A concise performance summary
2. Key insights and patterns
3. Areas for improvement
4. Psychological observations about trading behavior
5. Specific recommendations for future sessions

Keep the summary professional, actionable, and under 500 words. Write in a friendly, helpful tone as Sydney.`;

    // Use Gemini API instead of OpenAI
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
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 800,
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error('Gemini API request failed');
    }

    const aiData = await geminiResponse.json();
    const summary = aiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate summary.';

    return new Response(
      JSON.stringify({ 
        summary,
        usage: aiData.usageMetadata 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error generating session summary:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate session summary',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});