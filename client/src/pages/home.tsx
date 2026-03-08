import { useState, useCallback, useRef, useEffect } from "react";
import type { Quote, Analysis } from "@shared/schema";
import { useTheme } from "@/components/theme-provider";
import { AssetDetail } from "@/components/asset-detail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Search,
  Sun,
  Moon,
  Loader2,
  TrendingUp,
  X,
} from "lucide-react";

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 1) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/search/${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
      setShowResults(true);
    } catch {
      setResults([]);
    }
    setSearching(false);
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleSelectSymbol = async (symbol: string) => {
    setSelectedSymbol(symbol);
    setShowResults(false);
    setQuery("");
    setLoadingQuote(true);
    try {
      const res = await fetch(`/api/quote/${encodeURIComponent(symbol)}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setQuote(data);
    } catch {
      setQuote(null);
    }
    setLoadingQuote(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      handleSelectSymbol(query.trim().toUpperCase());
    }
  };

  const handleClear = () => {
    setSelectedSymbol(null);
    setQuote(null);
    setQuery("");
    setResults([]);
  };

  const typeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("etf")) return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400";
    if (t.includes("future") || t.includes("commodity")) return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400";
    if (t.includes("crypto")) return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400";
    if (t.includes("index")) return "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400";
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400";
  };

  const isLanding = !selectedSymbol && !loadingQuote;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 h-14">
            <button
              data-testid="button-home"
              onClick={handleClear}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-base font-semibold hidden sm:inline">MarketPulse</span>
            </button>

            {!isLanding && (
              <div ref={searchRef} className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="input-search-header"
                  placeholder="Search symbol..."
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => results.length > 0 && setShowResults(true)}
                  className="pl-9 h-9"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
                {showResults && results.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-popover-border rounded-md shadow-lg overflow-hidden z-50">
                    {results.map((r) => (
                      <button
                        key={r.symbol}
                        data-testid={`button-result-${r.symbol}`}
                        onClick={() => handleSelectSymbol(r.symbol)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover-elevate active-elevate-2 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{r.symbol}</span>
                            <Badge variant="secondary" className={`text-xs ${typeColor(r.type)}`}>
                              {r.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{r.name}</p>
                        </div>
                        <span className="text-xs text-muted-foreground/60 flex-shrink-0">{r.exchange}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              data-testid="button-toggle-theme"
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {isLanding && (
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2 tracking-tight">
              MarketPulse
            </h1>
            <p className="text-muted-foreground text-center mb-8 max-w-md">
              Search any stock, ETF, commodity, or crypto to get real-time data and AI-powered price analysis
            </p>
            <div ref={searchRef} className="relative w-full max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                data-testid="input-search-main"
                placeholder="Search stocks, ETFs, commodities, crypto..."
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => results.length > 0 && setShowResults(true)}
                className="pl-12 h-12 text-base rounded-xl"
              />
              {searching && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
              )}
              {showResults && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-popover-border rounded-xl shadow-lg overflow-hidden z-50">
                  {results.map((r) => (
                    <button
                      key={r.symbol}
                      data-testid={`button-result-${r.symbol}`}
                      onClick={() => handleSelectSymbol(r.symbol)}
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover-elevate active-elevate-2 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{r.symbol}</span>
                          <Badge variant="secondary" className={`text-xs ${typeColor(r.type)}`}>
                            {r.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{r.name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground/60 flex-shrink-0">{r.exchange}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-6 flex-wrap justify-center">
              <span className="text-xs text-muted-foreground">Try:</span>
              {["AAPL", "BTC-USD", "SPY", "GLD"].map((s) => (
                <button
                  key={s}
                  data-testid={`button-quick-${s}`}
                  onClick={() => handleSelectSymbol(s)}
                  className="text-xs px-2.5 py-1 rounded-md bg-muted text-muted-foreground hover-elevate active-elevate-2 transition-colors font-medium"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {loadingQuote && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading market data...</p>
          </div>
        )}

        {selectedSymbol && quote && !loadingQuote && (
          <AssetDetail quote={quote} onBack={handleClear} />
        )}

        {selectedSymbol && !quote && !loadingQuote && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <X className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground mb-1">Could not find data for "{selectedSymbol}"</p>
            <Button data-testid="button-try-again" variant="ghost" size="sm" onClick={handleClear}>
              Try another search
            </Button>
          </div>
        )}
      </main>

      <footer className="border-t py-4 mt-auto">
        <p className="text-xs text-muted-foreground text-center px-4">
          MarketPulse uses AI for analysis. This is not financial advice. Always do your own research.
        </p>
      </footer>
    </div>
  );
}
