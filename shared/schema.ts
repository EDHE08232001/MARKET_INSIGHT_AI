import { z } from "zod";

export const quoteSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  currentPrice: z.number(),
  previousClose: z.number(),
  change: z.number(),
  changePercent: z.number(),
  dayHigh: z.number(),
  dayLow: z.number(),
  volume: z.number(),
  fiftyTwoWeekHigh: z.number().nullable(),
  fiftyTwoWeekLow: z.number().nullable(),
  currency: z.string(),
  exchangeName: z.string(),
  instrumentType: z.string(),
  history: z.array(z.object({ date: z.string(), close: z.number() })),
});

export type Quote = z.infer<typeof quoteSchema>;

export const searchResultSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  type: z.string(),
  exchange: z.string(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;

export const analysisSchema = z.object({
  buyPrice: z.number().nullable(),
  targetPrice: z.number().nullable(),
  stopLoss: z.number().nullable(),
  confidence: z.string(),
  sentiment: z.string(),
  reasoning: z.string(),
  keyFactors: z.string().nullable(),
});

export type Analysis = z.infer<typeof analysisSchema>;
