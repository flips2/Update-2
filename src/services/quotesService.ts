import { QuoteResponse } from '../types';

const FALLBACK_QUOTES = [
  { content: "The stock market is filled with individuals who know the price of everything, but the value of nothing.", author: "Philip Fisher" },
  { content: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
  { content: "It's not how much money you make, but how much money you keep, how hard it works for you, and how many generations you keep it for.", author: "Robert Kiyosaki" },
  { content: "The four most dangerous words in investing are: 'This time it's different.'", author: "Sir John Templeton" },
  { content: "Time in the market beats timing the market.", author: "Ken Fisher" },
  { content: "Bulls make money, bears make money, but pigs get slaughtered.", author: "Wall Street Saying" },
  { content: "Don't put all your eggs in one basket.", author: "Traditional Wisdom" },
  { content: "The trend is your friend until the end when it bends.", author: "Ed Seykota" }
];

export const quotesService = {
  async getRandomQuote(): Promise<QuoteResponse> {
    try {
      const response = await fetch('https://api.quotable.io/random?tags=success,motivational,business');
      if (response.ok) {
        const data = await response.json();
        return { content: data.content, author: data.author };
      }
    } catch (error) {
      console.warn('Failed to fetch quote from API, using fallback');
    }
    
    // Fallback to local quotes if API fails
    const randomIndex = Math.floor(Math.random() * FALLBACK_QUOTES.length);
    return FALLBACK_QUOTES[randomIndex];
  }
};