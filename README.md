# MarketPulse

Search-based web app for looking up stock, ETF, commodity, and crypto prices with AI-assisted analysis. No database.

## Stack
- Frontend: React + TypeScript + Vite + TailwindCSS + shadcn/ui + Recharts
- Backend: Express.js + TypeScript
- AI: DeepSeek (via OpenAI-compatible SDK)
- Market data: Yahoo Finance public API

## Features
- Symbol search (stocks, ETFs, commodities, crypto)
- Asset detail page with live price, 5-day chart, and stats
- AI analysis: buy price, target, stop loss, sentiment (SSE streaming)
- Dark/light theme
- Quick-access buttons for common symbols

## Layout
```
shared/schema.ts          Zod types (Quote, SearchResult, Analysis)
server/routes.ts          API routes
server/index.ts           Express entry
client/src/App.tsx        App root
client/src/pages/home.tsx Landing + search
client/src/components/
  asset-detail.tsx        Asset detail page
  theme-provider.tsx      Dark mode
  price-badge.tsx         Price change formatting
```

## API
- `GET /api/search/:query` — search symbols
- `GET /api/quote/:symbol` — quote with 5-day history
- `POST /api/analyze/:symbol` — AI analysis (SSE)

## Env
- `DEEPSEEK_API_KEY`
- `DEEPSEEK_BASE_URL`
