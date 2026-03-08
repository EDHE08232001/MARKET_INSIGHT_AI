import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});

async function fetchYahooQuote(symbol: string): Promise<any> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`);
    const data = await res.json();
    const result = data.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) throw new Error("No data found");

    const closes = result?.indicators?.quote?.[0]?.close || [];
    const timestamps = result?.timestamp || [];
    const history = timestamps.map((t: number, i: number) => ({
      date: new Date(t * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      close: closes[i],
    })).filter((d: any) => d.close != null);

    return {
      symbol: meta.symbol,
      name: meta.longName || meta.shortName || meta.symbol,
      currentPrice: meta.regularMarketPrice,
      previousClose: meta.previousClose || meta.chartPreviousClose,
      change: meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose || meta.regularMarketPrice),
      changePercent: ((meta.regularMarketPrice - (meta.previousClose || meta.chartPreviousClose || meta.regularMarketPrice)) / (meta.previousClose || meta.chartPreviousClose || meta.regularMarketPrice)) * 100,
      dayHigh: meta.regularMarketDayHigh || meta.regularMarketPrice,
      dayLow: meta.regularMarketDayLow || meta.regularMarketPrice,
      volume: meta.regularMarketVolume || 0,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      currency: meta.currency || "USD",
      exchangeName: meta.exchangeName || meta.fullExchangeName || "",
      instrumentType: meta.instrumentType || "EQUITY",
      history,
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

async function searchSymbols(query: string): Promise<any[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.quotes || []).map((q: any) => ({
      symbol: q.symbol,
      name: q.longname || q.shortname || q.symbol,
      type: q.quoteType || "EQUITY",
      exchange: q.exchDisp || q.exchange,
    }));
  } catch {
    return [];
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/search/:query", async (req, res) => {
    try {
      const results = await searchSymbols(req.params.query);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.get("/api/quote/:symbol", async (req, res) => {
    try {
      const quote = await fetchYahooQuote(req.params.symbol);
      if (!quote) return res.status(404).json({ error: "Symbol not found" });
      res.json(quote);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quote" });
    }
  });

  app.post("/api/analyze/:symbol", async (req, res) => {
    try {
      const symbol = req.params.symbol.toUpperCase();
      const quote = await fetchYahooQuote(symbol);
      if (!quote) return res.status(404).json({ error: "Symbol not found" });

      const currentPrice = quote.currentPrice || 0;
      const fiftyTwoHigh = quote.fiftyTwoWeekHigh || currentPrice;
      const fiftyTwoLow = quote.fiftyTwoWeekLow || currentPrice;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await deepseek.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are a professional financial analyst AI. Analyze the given stock/ETF/commodity/crypto and provide actionable trading insights. You must respond in valid JSON format with these exact fields:
{
  "buyPrice": <number - good entry price based on support levels and valuation>,
  "targetPrice": <number - realistic target price for 3-6 month horizon>,
  "stopLoss": <number - recommended stop loss price>,
  "confidence": "<high|medium|low>",
  "sentiment": "<bullish|neutral|bearish>",
  "reasoning": "<2-3 paragraph detailed analysis explaining your buy price and target price rationale, including technical and fundamental factors>",
  "keyFactors": "<comma-separated list of 4-6 key factors influencing the analysis>"
}
Be specific with numbers. Use the current market data provided. Consider technical levels, market conditions, and sector trends.`,
          },
          {
            role: "user",
            content: `Analyze ${symbol} (${quote.name}):
- Current Price: $${currentPrice.toFixed(2)}
- Day Range: $${quote.dayLow.toFixed(2)} - $${quote.dayHigh.toFixed(2)}
- 52-Week Range: $${fiftyTwoLow.toFixed(2)} - $${fiftyTwoHigh.toFixed(2)}
- Volume: ${quote.volume.toLocaleString()}
- Previous Close: $${quote.previousClose.toFixed(2)}
- Exchange: ${quote.exchangeName}

Provide your analysis as a JSON object.`,
          },
        ],
        max_tokens: 4096,
        stream: true,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ type: "content", data: content })}\n\n`);
        }
      }

      let parsed: any = {};
      try {
        const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {
        parsed = {
          buyPrice: currentPrice * 0.95,
          targetPrice: currentPrice * 1.15,
          stopLoss: currentPrice * 0.9,
          confidence: "medium",
          sentiment: "neutral",
          reasoning: fullResponse,
          keyFactors: "Market conditions, Price action",
        };
      }

      res.write(`data: ${JSON.stringify({ type: "complete", analysis: parsed })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error analyzing:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: "error", error: "Analysis failed" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Analysis failed" });
      }
    }
  });

  return httpServer;
}
