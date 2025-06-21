import { useState, useEffect } from 'react';
import { quotesService } from '../services/quotesService';
import { QuoteResponse } from '../types';

export const useQuotes = () => {
  const [quotes, setQuotes] = useState<QuoteResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = async () => {
    try {
      const quote1 = await quotesService.getRandomQuote();
      const quote2 = await quotesService.getRandomQuote();
      setQuotes([quote1, quote2]);
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  return { quotes, loading, refreshQuotes: fetchQuotes };
};