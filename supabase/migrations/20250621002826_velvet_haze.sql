/*
  # Add Session Types and Enhanced Trade Fields

  1. Schema Updates
    - Add session_type to existing trading_sessions table
    - Add Forex and Crypto specific fields to existing trades table
    - Add new indexes for performance

  2. Backward Compatibility
    - All new fields are nullable to preserve existing data
    - Default session_type to 'Forex' for existing sessions
*/

-- Add session_type column to existing trading_sessions table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_sessions' AND column_name = 'session_type'
  ) THEN
    ALTER TABLE public.trading_sessions 
    ADD COLUMN session_type text NOT NULL DEFAULT 'Forex' 
    CHECK (session_type IN ('Forex', 'Crypto'));
  END IF;
END $$;

-- Add Forex specific fields to existing trades table
DO $$
BEGIN
  -- Add leverage column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'leverage'
  ) THEN
    ALTER TABLE public.trades ADD COLUMN leverage numeric NULL;
  END IF;

  -- Add contract_size column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'contract_size'
  ) THEN
    ALTER TABLE public.trades ADD COLUMN contract_size numeric NULL;
  END IF;
END $$;

-- Add Crypto specific fields to existing trades table
DO $$
BEGIN
  -- Add futures_symbol column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'futures_symbol'
  ) THEN
    ALTER TABLE public.trades ADD COLUMN futures_symbol text NULL;
  END IF;

  -- Add margin_mode column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'margin_mode'
  ) THEN
    ALTER TABLE public.trades ADD COLUMN margin_mode text NULL;
  END IF;

  -- Add avg_entry_price column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'avg_entry_price'
  ) THEN
    ALTER TABLE public.trades ADD COLUMN avg_entry_price numeric NULL;
  END IF;

  -- Add avg_close_price column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'avg_close_price'
  ) THEN
    ALTER TABLE public.trades ADD COLUMN avg_close_price numeric NULL;
  END IF;

  -- Add direction column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'direction'
  ) THEN
    ALTER TABLE public.trades ADD COLUMN direction text NULL 
    CHECK (direction IS NULL OR direction = ANY (ARRAY['Long'::text, 'Short'::text]));
  END IF;

  -- Add margin_adjustment_history column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'margin_adjustment_history'
  ) THEN
    ALTER TABLE public.trades ADD COLUMN margin_adjustment_history text NULL;
  END IF;

  -- Add closing_quantity column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'closing_quantity'
  ) THEN
    ALTER TABLE public.trades ADD COLUMN closing_quantity numeric NULL;
  END IF;

  -- Add realized_pnl column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trades' AND column_name = 'realized_pnl'
  ) THEN
    ALTER TABLE public.trades ADD COLUMN realized_pnl numeric NULL;
  END IF;
END $$;

-- Create new performance indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS trading_sessions_session_type_idx ON public.trading_sessions(session_type);
CREATE INDEX IF NOT EXISTS trades_futures_symbol_idx ON public.trades(futures_symbol);
CREATE INDEX IF NOT EXISTS trades_leverage_idx ON public.trades(leverage);
CREATE INDEX IF NOT EXISTS trades_direction_idx ON public.trades(direction);
CREATE INDEX IF NOT EXISTS trades_avg_entry_price_idx ON public.trades(avg_entry_price);
CREATE INDEX IF NOT EXISTS trades_avg_close_price_idx ON public.trades(avg_close_price);