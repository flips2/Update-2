export interface TradingJoke {
  id: string;
  setup: string;
  punchline: string;
  category: 'trading' | 'market' | 'crypto' | 'general';
  difficulty: 'easy' | 'medium' | 'advanced';
}

export const TRADING_JOKES: TradingJoke[] = [
  {
    id: 'joke_1',
    setup: "Why don't traders ever get lost?",
    punchline: "Because they always know where the market is heading! 📈",
    category: 'trading',
    difficulty: 'easy'
  },
  {
    id: 'joke_2',
    setup: "What's a trader's favorite music?",
    punchline: "Bull market jazz! 🎵",
    category: 'market',
    difficulty: 'easy'
  },
  {
    id: 'joke_3',
    setup: "Why did the day trader break up with their girlfriend?",
    punchline: "She had too much volatility and not enough support! 💔",
    category: 'trading',
    difficulty: 'medium'
  },
  {
    id: 'joke_4',
    setup: "What do you call a crypto investor who's always calm?",
    punchline: "A HODLer with diamond hands! 💎🙌",
    category: 'crypto',
    difficulty: 'easy'
  },
  {
    id: 'joke_5',
    setup: "Why don't bears ever win at poker?",
    punchline: "Because they always fold! 🐻",
    category: 'market',
    difficulty: 'easy'
  },
  {
    id: 'joke_6',
    setup: "What's the difference between a trader and a pizza?",
    punchline: "A pizza can feed a family of four! 🍕",
    category: 'trading',
    difficulty: 'medium'
  },
  {
    id: 'joke_7',
    setup: "Why did the algorithm go to therapy?",
    punchline: "It had too many emotional stops! 🤖",
    category: 'trading',
    difficulty: 'advanced'
  },
  {
    id: 'joke_8',
    setup: "What's a swing trader's favorite dance?",
    punchline: "The market swing! 💃",
    category: 'trading',
    difficulty: 'easy'
  },
  {
    id: 'joke_9',
    setup: "Why don't scalpers ever get speeding tickets?",
    punchline: "They're always in and out too fast! ⚡",
    category: 'trading',
    difficulty: 'medium'
  },
  {
    id: 'joke_10',
    setup: "What did the candlestick say to the moving average?",
    punchline: "Stop following me around! 🕯️",
    category: 'trading',
    difficulty: 'advanced'
  },
  {
    id: 'joke_11',
    setup: "Why did the forex trader go to the doctor?",
    punchline: "They had a bad case of currency fever! 🌡️",
    category: 'trading',
    difficulty: 'medium'
  },
  {
    id: 'joke_12',
    setup: "What's a bear market's favorite season?",
    punchline: "Fall! 🍂",
    category: 'market',
    difficulty: 'easy'
  }
];

export class JokeService {
  static getRandomJoke(usedJokes: string[] = [], category?: string): TradingJoke | null {
    let availableJokes = TRADING_JOKES.filter(joke => !usedJokes.includes(joke.id));
    
    if (category) {
      availableJokes = availableJokes.filter(joke => joke.category === category);
    }
    
    if (availableJokes.length === 0) {
      // Reset if all jokes have been used
      availableJokes = TRADING_JOKES;
    }
    
    const randomIndex = Math.floor(Math.random() * availableJokes.length);
    return availableJokes[randomIndex];
  }

  static formatJoke(joke: TradingJoke): string {
    return `${joke.setup}\n\n${joke.punchline}`;
  }

  static getJokeByDifficulty(difficulty: 'easy' | 'medium' | 'advanced', usedJokes: string[] = []): TradingJoke | null {
    const availableJokes = TRADING_JOKES.filter(
      joke => joke.difficulty === difficulty && !usedJokes.includes(joke.id)
    );
    
    if (availableJokes.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * availableJokes.length);
    return availableJokes[randomIndex];
  }
}