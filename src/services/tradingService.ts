import { supabase } from '../lib/supabase';
import { TradingSession, Trade } from '../types';

export const tradingService = {
  async getSessions(userId: string): Promise<TradingSession[]> {
    const { data, error } = await supabase
      .from('trading_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async createSession(userId: string, name: string, initialCapital: number, sessionType: 'Forex' | 'Crypto'): Promise<TradingSession> {
    const { data, error } = await supabase
      .from('trading_sessions')
      .insert({
        user_id: userId,
        name,
        initial_capital: initialCapital,
        current_capital: initialCapital,
        session_type: sessionType,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('trading_sessions')
      .delete()
      .eq('id', sessionId);
    
    if (error) throw error;
  },

  async getTrades(sessionId: string): Promise<Trade[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async addTrade(trade: Omit<Trade, 'id' | 'created_at'>): Promise<Trade> {
    const { data, error } = await supabase
      .from('trades')
      .insert(trade)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateTrade(tradeId: string, updates: Partial<Trade>): Promise<Trade> {
    const { data, error } = await supabase
      .from('trades')
      .update(updates)
      .eq('id', tradeId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteTrade(tradeId: string): Promise<void> {
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', tradeId);
    
    if (error) throw error;
  },

  async updateSessionCapital(sessionId: string, newCapital: number): Promise<void> {
    const { error } = await supabase
      .from('trading_sessions')
      .update({ 
        current_capital: newCapital,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);
    
    if (error) throw error;
  }
};