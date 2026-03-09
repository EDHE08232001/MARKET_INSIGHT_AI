import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import YahooFinance from "yahoo-finance2";
import rateLimit from "express-rate-limit";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL,
});

// yahoo-finance2 v3 requires instantiation
const yf: any = new (YahooFinance as any)();

// Rate limiter for the /api/analyze route.
//
// Key fixes for Azure App Service:
//   - `limit` replaces the removed `max` option (express-rate-limit v8)
//   - `standardHeaders: "draft-7"` follows the IETF RateLimit header RFC
//   - `keyGenerator` explicitly resolves the real client IP so the limiter
//     never falls back to undefined keys (which would make it a no-op)
//   - `validate.trustProxy: false` suppresses the library's own proxy
//     validation — we handle that via `app.set("trust proxy", 1)` in index.ts
//   - `handler` sends a structured JSON 429 with a Retry-After hint
const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute sliding window
  limit: 5,                  // max 5 analysis requests per IP per window
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Explicitly extract the real client IP.
  // With `trust proxy: 1` set on the Express app, `req.ip` is already the
  // de-spoofed client IP forwarded by Azure's load balancer.
  keyGenerator: (req) => req.ip ?? req.socket.remoteAddress ?? "unknown",
  // Return a structured JSON error instead of a plain-text string.
  handler: (_req, res) => {
    res.status(429).json({
      error: "Too many analysis requests. You are limited to 5 requests per 15 minutes.",
      retryAfter: "15 minutes",
    });
  },
  // We configure trust proxy ourselves — skip the library's redundant check.
  validate: { trustProxy: false },
});

async function fetchYahooQuote(symbol: string): Promise<any> {
  try {
    const fiveDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [quote, chart] = await Promise.all([
      yf.quote(symbol),
      yf.chart(symbol, { period1: fiveDaysAgo, interval: "1d" }).catch(() => null),
    ]);

    if (!quote || !quote.regularMarketPrice) {
      throw new Error("No market data found");
    }

    let history: { date: string; close: number }[] = [];
    if (chart?.timestamp && chart.indicators?.quote?.[0]) {
      const closes = chart.indicators.quote[0].close || [];
      history = chart.timestamp
        .map((t: number, i: number) => ({
          date: new Date(t * 1000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          close: closes[i],
        }))
        .filter((d: any) => d.close != null);
    }

    const currentPrice = quote.regularMarketPrice ?? 0;
    const previousClose = quote.regularMarketPreviousClose ?? currentPrice;

    return {
      symbol: quote.symbol,
      name: quote.longName || quote.shortName || quote.symbol,
      currentPrice,
      previousClose,
      change: quote.regularMarketChange ?? currentPrice - previousClose,
      changePercent: quote.regularMarketChangePercent ?? 0,
      dayHigh: quote.regularMarketDayHigh ?? currentPrice,
      dayLow: quote.regularMarketDayLow ?? currentPrice,
      volume: quote.regularMarketVolume ?? 0,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
      currency: quote.currency || "USD",
      exchangeName: quote.fullExchangeName || (quote as any).exchangeName || "",
      instrumentType: quote.quoteType || "EQUITY",
      history,
    };
  } catch (error) {
    console.error(`[quote] Error fetching ${symbol}:`, error);
    return null;
  }
}

async function searchSymbols(query: string): Promise<any[]> {
  try {
    const results = await yf.search(query, { quotesCount: 8, newsCount: 0 });
    return ((results.quotes as any[]) || []).map((q: any) => ({
      symbol: q.symbol,
      name: q.longname || q.shortname || q.symbol,
      type: q.quoteType || "EQUITY",
      exchange: q.exchDisp || q.exchange || "",
    }));
  } catch (error) {
    console.error(`[search] Error for "${query}":`, error);
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

  // Analysis endpoint with streaming response and rate limiting
  app.post("/api/analyze/:symbol", analyzeLimiter, async (req, res) => {
    try {
      const symbol = String(req.params.symbol).toUpperCase();
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
          res.write(
            `data: ${JSON.stringify({ type: "content", data: content })}\n\n`
          );
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

      res.write(
        `data: ${JSON.stringify({ type: "complete", analysis: parsed })}\n\n`
      );
      res.end();
    } catch (error) {
      console.error("Error analyzing:", error);
      if (res.headersSent) {
        res.write(
          `data: ${JSON.stringify({ type: "error", error: "Analysis failed" })}\n\n`
        );
        res.end();
      } else {
        res.status(500).json({ error: "Analysis failed" });
      }
    }
  });

  return httpServer;
}
