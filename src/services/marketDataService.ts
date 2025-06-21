export interface CryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
}

export interface GoldPrice {
  price: number;
  change24h: number;
  changePercent24h: number;
}

export interface FearGreedIndex {
  value: number;
  classification: string;
  timestamp: string;
}

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: string;
}

export interface MarketData {
  crypto: {
    btc: CryptoPrice;
    eth: CryptoPrice;
  };
  gold: GoldPrice;
  fearGreed: FearGreedIndex;
  news: NewsItem[];
}

class MarketDataService {
  private readonly CMC_API_KEY = 'f7e5f581-2dbb-43b6-81af-ba8949c0905d';
  private readonly CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';
  private readonly FEAR_GREED_URL = 'https://api.alternative.me/fng/';
  
  async getCryptoPrices(): Promise<{ btc: CryptoPrice; eth: CryptoPrice }> {
    try {
      // Using CoinGecko as fallback since CMC requires CORS proxy
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch crypto prices');
      }
      
      const data = await response.json();
      
      return {
        btc: {
          symbol: 'BTC/USD',
          price: data.bitcoin.usd,
          change24h: data.bitcoin.usd_24h_change || 0,
          changePercent24h: data.bitcoin.usd_24h_change || 0
        },
        eth: {
          symbol: 'ETH/USD',
          price: data.ethereum.usd,
          change24h: data.ethereum.usd_24h_change || 0,
          changePercent24h: data.ethereum.usd_24h_change || 0
        }
      };
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
      // Return mock data as fallback
      return {
        btc: {
          symbol: 'BTC/USD',
          price: 43250.00,
          change24h: 1250.00,
          changePercent24h: 2.98
        },
        eth: {
          symbol: 'ETH/USD',
          price: 2650.00,
          change24h: -45.00,
          changePercent24h: -1.67
        }
      };
    }
  }

  async getGoldPrice(): Promise<GoldPrice> {
    try {
      // Using a free API for gold prices
      const response = await fetch(
        'https://api.metals.live/v1/spot/gold'
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch gold price');
      }
      
      const data = await response.json();
      
      return {
        price: data.price || 2050.00,
        change24h: data.change || 15.50,
        changePercent24h: data.change_percent || 0.76
      };
    } catch (error) {
      console.error('Error fetching gold price:', error);
      // Return mock data as fallback
      return {
        price: 2050.00,
        change24h: 15.50,
        changePercent24h: 0.76
      };
    }
  }

  async getFearGreedIndex(): Promise<FearGreedIndex> {
    try {
      const response = await fetch(this.FEAR_GREED_URL);
      
      if (!response.ok) {
        throw new Error('Failed to fetch Fear & Greed Index');
      }
      
      const data = await response.json();
      const latest = data.data[0];
      
      return {
        value: parseInt(latest.value),
        classification: latest.value_classification,
        timestamp: latest.timestamp
      };
    } catch (error) {
      console.error('Error fetching Fear & Greed Index:', error);
      // Return mock data as fallback
      return {
        value: 65,
        classification: 'Greed',
        timestamp: new Date().toISOString()
      };
    }
  }

  async getFinancialNews(): Promise<NewsItem[]> {
    try {
      // Using a free news API - you might want to replace with a better one
      const response = await fetch(
        'https://newsapi.org/v2/everything?q=bitcoin+ethereum+gold+trading&sortBy=publishedAt&pageSize=5&apiKey=YOUR_NEWS_API_KEY'
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch financial news');
      }
      
      const data = await response.json();
      
      return data.articles.map((article: any) => ({
        title: article.title,
        summary: article.description || article.title,
        url: article.url,
        publishedAt: article.publishedAt,
        source: article.source.name
      }));
    } catch (error) {
      console.error('Error fetching financial news:', error);
      // Return mock data as fallback
      return [
        {
          title: "Bitcoin Reaches New Monthly High",
          summary: "Bitcoin continues its upward momentum as institutional adoption grows.",
          url: "#",
          publishedAt: new Date().toISOString(),
          source: "Crypto News"
        },
        {
          title: "Gold Prices Stabilize Amid Market Uncertainty",
          summary: "Gold maintains its position as a safe haven asset during volatile times.",
          url: "#",
          publishedAt: new Date().toISOString(),
          source: "Financial Times"
        },
        {
          title: "Ethereum Network Upgrade Shows Promise",
          summary: "Latest Ethereum improvements focus on scalability and reduced fees.",
          url: "#",
          publishedAt: new Date().toISOString(),
          source: "Blockchain Today"
        }
      ];
    }
  }

  async getAllMarketData(): Promise<MarketData> {
    try {
      const [crypto, gold, fearGreed, news] = await Promise.all([
        this.getCryptoPrices(),
        this.getGoldPrice(),
        this.getFearGreedIndex(),
        this.getFinancialNews()
      ]);

      return {
        crypto,
        gold,
        fearGreed,
        news
      };
    } catch (error) {
      console.error('Error fetching market data:', error);
      throw error;
    }
  }
}

export const marketDataService = new MarketDataService();