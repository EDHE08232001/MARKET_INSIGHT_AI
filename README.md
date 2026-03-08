# MarketPulse - AI-Powered Market Tracker

## Overview
A clean, search-based web app for looking up stock, ETF, commodity, and crypto prices with AI-powered analysis. No database needed — just search, view, and analyze.

## Architecture
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui + Recharts
- **Backend**: Express.js + TypeScript
- **AI**: DeepSeek (via OpenAI-compatible SDK, user's own API key)
- **Market Data**: Yahoo Finance public API

## Key Features
- Search any stock, ETF, commodity, or crypto symbol
- Beautiful asset detail page with live price, chart, and stats
- AI-powered analysis with buy price, target price, stop loss, sentiment
- Streaming AI analysis responses from DeepSeek
- Dark/light mode toggle
- Quick-access buttons for popular symbols

## Project Structure
```
shared/schema.ts                  - Zod types (Quote, SearchResult, Analysis)
server/routes.ts                  - API routes (search, quote, analyze)
server/storage.ts                 - Empty (no database needed)
client/src/App.tsx                - Main app entry
client/src/pages/home.tsx         - Landing page with search
client/src/components/
  asset-detail.tsx                - Asset detail page with chart and analysis
  theme-provider.tsx              - Dark mode provider
  price-badge.tsx                 - Price change formatting
```

## API Endpoints
- `GET /api/search/:query` - Search symbols
- `GET /api/quote/:symbol` - Fetch live quote with 5-day history
- `POST /api/analyze/:symbol` - Run AI analysis (SSE streaming via DeepSeek)

## Environment Variables
- `DEEPSEEK_API_KEY` - DeepSeek API key
- `DEEPSEEK_BASE_URL` - DeepSeek base URL
