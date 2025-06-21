/*
  # Complete Database Schema Setup

  1. New Tables
    - `trading_sessions` - User trading sessions
    - `trades` - Individual trades with enhanced fields
    - `chat_messages` - AI chat history

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for authenticated users
    - Ensure proper foreign key relationships

  3. Indexes
    - Performance optimization indexes
*/

-- Create trading_sessions table
CREATE TABLE IF NOT EXISTS public.trading_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  initial_capital numeric NOT NULL DEFAULT 0,
  current_capital numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT trading_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT trading_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create trades table with all enhanced fields
CREATE TABLE IF NOT EXISTS public.trades (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  margin numeric NOT NULL,
  roi numeric NOT NULL,
  entry_side text NOT NULL CHECK (entry_side = ANY (ARRAY['Long'::text, 'Short'::text])),
  profit_loss numeric NOT NULL,
  comments text,
  created_at timestamp with time zone DEFAULT now(),
  -- Enhanced fields for advanced trade tracking
  symbol text NULL,
  volume_lot numeric NULL,
  open_price numeric NULL,
  close_price numeric NULL,
  tp numeric NULL,
  sl numeric NULL,
  position text NULL CHECK (position IS NULL OR position = ANY (ARRAY['Open'::text, 'Closed'::text])),
  open_time timestamp with time zone NULL,
  close_time timestamp with time zone NULL,
  reason text NULL CHECK (reason IS NULL OR reason = ANY (ARRAY['TP'::text, 'SL'::text, 'Early Close'::text, 'Other'::text])),
  CONSTRAINT trades_pkey PRIMARY KEY (id),
  CONSTRAINT trades_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.trading_sessions(id) ON DELETE CASCADE
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL,
  message text NOT NULL,
  response text,
  message_type text NOT NULL CHECK (message_type IN ('user', 'ai')),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.trading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trading_sessions
CREATE POLICY "Users can read own sessions" ON public.trading_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.trading_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.trading_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.trading_sessions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for trades
CREATE POLICY "Users can read own trades" ON public.trades
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trading_sessions 
      WHERE trading_sessions.id = trades.session_id 
      AND trading_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own trades" ON public.trades
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trading_sessions 
      WHERE trading_sessions.id = trades.session_id 
      AND trading_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own trades" ON public.trades
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trading_sessions 
      WHERE trading_sessions.id = trades.session_id 
      AND trading_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trading_sessions 
      WHERE trading_sessions.id = trades.session_id 
      AND trading_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own trades" ON public.trades
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trading_sessions 
      WHERE trading_sessions.id = trades.session_id 
      AND trading_sessions.user_id = auth.uid()
    )
  );

-- Create RLS policies for chat_messages
CREATE POLICY "Users can read own chat messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat messages" ON public.chat_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages" ON public.chat_messages
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS trading_sessions_user_id_idx ON public.trading_sessions(user_id);
CREATE INDEX IF NOT EXISTS trading_sessions_created_at_idx ON public.trading_sessions(created_at);
CREATE INDEX IF NOT EXISTS trades_session_id_idx ON public.trades(session_id);
CREATE INDEX IF NOT EXISTS trades_created_at_idx ON public.trades(created_at);
CREATE INDEX IF NOT EXISTS trades_symbol_idx ON public.trades(symbol);
CREATE INDEX IF NOT EXISTS trades_position_idx ON public.trades(position);
CREATE INDEX IF NOT EXISTS trades_open_time_idx ON public.trades(open_time);
CREATE INDEX IF NOT EXISTS trades_close_time_idx ON public.trades(close_time);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON public.chat_messages(created_at);