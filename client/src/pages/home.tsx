import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Quote } from "@shared/schema";
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
  Sparkles,
  Zap,
  Globe,
} from "lucide-react";

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

const QUICK_SYMBOLS = ["AAPL", "NVDA", "TSLA", "BTC-USD", "SPY", "GLD"];

const FEATURES = [
  { icon: Zap, label: "Real-time Data" },
  { icon: Sparkles, label: "AI Analysis" },
  { icon: Globe, label: "Global Markets" },
];

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
    if (t.includes("etf")) return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
    if (t.includes("future") || t.includes("commodity"))
      return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
    if (t.includes("crypto"))
      return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300";
    if (t.includes("index"))
      return "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300";
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  };

  const isLanding = !selectedSymbol && !loadingQuote;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 h-14">
            <button
              data-testid="button-home"
              onClick={handleClear}
              className="flex items-center gap-2.5 flex-shrink-0 group"
            >
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:shadow-primary/30 transition-shadow">
                <BarChart3 className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold hidden sm:inline tracking-tight">
                MarketPulse
              </span>
            </button>

            {!isLanding && (
              <div ref={searchRef} className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  data-testid="input-search-header"
                  placeholder="Search symbol..."
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => results.length > 0 && setShowResults(true)}
                  className="pl-9 h-9 rounded-xl border-border/60 bg-muted/40 focus:bg-background transition-colors"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
                <AnimatePresence>
                  {showResults && results.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 mt-1.5 bg-popover/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-xl overflow-hidden z-50"
                    >
                      {results.map((r, i) => (
                        <motion.button
                          key={r.symbol}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.04 }}
                          data-testid={`button-result-${r.symbol}`}
                          onClick={() => handleSelectSymbol(r.symbol)}
                          className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left hover:bg-muted/60 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{r.symbol}</span>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] px-1.5 py-0 h-4 ${typeColor(r.type)}`}
                              >
                                {r.type}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{r.name}</p>
                          </div>
                          <span className="text-xs text-muted-foreground/60 flex-shrink-0">
                            {r.exchange}
                          </span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <Button
              data-testid="button-toggle-theme"
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-xl w-8 h-8"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {isLanding && (
          <div className="relative min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
              <div
                className="orb-1 absolute w-[520px] h-[520px] rounded-full opacity-40 dark:opacity-20"
                style={{
                  background:
                    "radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 70%)",
                  top: "5%",
                  left: "-10%",
                }}
              />
              <div
                className="orb-2 absolute w-[400px] h-[400px] rounded-full opacity-30 dark:opacity-15"
                style={{
                  background:
                    "radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)",
                  top: "50%",
                  right: "-8%",
                }}
              />
              <div
                className="orb-3 absolute w-[320px] h-[320px] rounded-full opacity-25 dark:opacity-10"
                style={{
                  background:
                    "radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)",
                  bottom: "10%",
                  left: "30%",
                }}
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 text-center w-full max-w-2xl mx-auto"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium mb-7"
              >
                <Sparkles className="w-3 h-3" />
                AI-Powered Market Intelligence
              </motion.div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-5 leading-[1.08]">
                <span className="text-gradient-animated">Market</span>
                <br />
                <span className="text-foreground">Intelligence</span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
                Real-time quotes, beautiful charts, and AI analysis for stocks,
                ETFs, commodities, and crypto.
              </p>

              <div ref={searchRef} className="relative w-full max-w-xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    data-testid="input-search-main"
                    placeholder="Search stocks, ETFs, commodities, crypto..."
                    value={query}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => results.length > 0 && setShowResults(true)}
                    className="pl-12 pr-12 h-14 text-base rounded-2xl border-2 border-border/60 bg-card/80 backdrop-blur-sm shadow-xl focus:border-primary/40 focus:shadow-primary/10 transition-all"
                  />
                  {searching && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
                  )}
                </div>

                <AnimatePresence>
                  {showResults && results.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.97 }}
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute top-full left-0 right-0 mt-2 bg-popover/96 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden z-50"
                    >
                      {results.map((r, i) => (
                        <motion.button
                          key={r.symbol}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          data-testid={`button-result-${r.symbol}`}
                          onClick={() => handleSelectSymbol(r.symbol)}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors group"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-bold text-sm tracking-wide">
                                {r.symbol}
                              </span>
                              <Badge
                                variant="secondary"
                                className={`text-[10px] px-1.5 py-0 h-4 font-medium ${typeColor(r.type)}`}
                              >
                                {r.type}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {r.name}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground/50 flex-shrink-0 font-medium">
                            {r.exchange}
                          </span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2 mt-6 flex-wrap justify-center">
                <span className="text-xs text-muted-foreground font-medium">
                  Popular:
                </span>
                {QUICK_SYMBOLS.map((s) => (
                  <button
                    key={s}
                    data-testid={`button-quick-${s}`}
                    onClick={() => handleSelectSymbol(s)}
                    className="text-xs px-3 py-1.5 rounded-full bg-muted/80 hover:bg-primary/10 hover:text-primary border border-border/50 hover:border-primary/30 text-muted-foreground font-semibold transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="absolute bottom-10 flex items-center gap-6 flex-wrap justify-center"
            >
              {FEATURES.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {label}
                </div>
              ))}
            </motion.div>
          </div>
        )}

        {loadingQuote && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <Loader2 className="w-5 h-5 animate-spin text-primary absolute -bottom-1 -right-1 bg-background rounded-full p-0.5" />
            </div>
            <p className="text-sm text-muted-foreground">
              Loading market data...
            </p>
          </div>
        )}

        {selectedSymbol && quote && !loadingQuote && (
          <AssetDetail quote={quote} onBack={handleClear} />
        )}

        {selectedSymbol && !quote && !loadingQuote && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center min-h-[60vh] gap-3"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-2">
              <X className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-base font-medium">
              Could not find data for &ldquo;{selectedSymbol}&rdquo;
            </p>
            <p className="text-sm text-muted-foreground">
              The symbol may be invalid or market data unavailable.
            </p>
            <Button
              data-testid="button-try-again"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="mt-2 rounded-xl"
            >
              Try another search
            </Button>
          </motion.div>
        )}
      </main>

      <footer className="border-t border-border/50 py-4 mt-auto">
        <p className="text-xs text-muted-foreground/60 text-center px-4">
          MarketPulse uses AI for analysis purposes only. Not financial advice.
          Always do your own research.
        </p>
      </footer>
    </div>
  );
}
