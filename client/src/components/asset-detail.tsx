import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Quote, Analysis } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatPrice, formatVolume, PriceBadge } from "@/components/price-badge";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  ShieldAlert,
  ArrowDown,
  Sparkles,
  Loader2,
  Brain,
  Activity,
  BarChart3,
  DollarSign,
  ArrowUpDown,
  ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface AssetDetailProps {
  quote: Quote;
  onBack: () => void;
}

const instrumentColor = (type: string) => {
  const t = (type || "").toLowerCase();
  if (t === "etf") return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
  if (t === "cryptocurrency") return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300";
  if (t === "future") return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
  if (t === "index") return "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
};

export function AssetDetail({ quote, onBack }: AssetDetailProps) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isPositive = quote.change >= 0;
  const priceFromLow =
    quote.fiftyTwoWeekLow && quote.fiftyTwoWeekHigh
      ? ((quote.currentPrice - quote.fiftyTwoWeekLow) /
          (quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow)) *
        100
      : 50;

  const chartColor = isPositive ? "#10b981" : "#ef4444";

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setStreamingContent("");
    setAnalysis(null);

    try {
      const res = await fetch(
        `/api/analyze/${encodeURIComponent(quote.symbol)}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Analysis failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "content") {
              setStreamingContent((prev) => prev + event.data);
            } else if (event.type === "complete") {
              setAnalysis(event.analysis);
              setIsAnalyzing(false);
            } else if (event.type === "error") {
              throw new Error(event.error);
            }
          } catch (e) {
            if (!(e instanceof SyntaxError)) throw e;
          }
        }
      }
      setIsAnalyzing(false);
    } catch {
      setIsAnalyzing(false);
    }
  };

  const sentimentConfig: Record<
    string,
    { icon: any; color: string; bg: string; border: string }
  > = {
    bullish: {
      icon: TrendingUp,
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/60",
      border: "border-emerald-200 dark:border-emerald-800",
    },
    bearish: {
      icon: TrendingDown,
      color: "text-red-700 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/60",
      border: "border-red-200 dark:border-red-800",
    },
    neutral: {
      icon: Minus,
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/60",
      border: "border-amber-200 dark:border-amber-800",
    },
  };

  const confidenceConfig: Record<
    string,
    { color: string; bg: string; border: string }
  > = {
    high: {
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/60",
      border: "border-emerald-200 dark:border-emerald-800",
    },
    medium: {
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/60",
      border: "border-amber-200 dark:border-amber-800",
    },
    low: {
      color: "text-red-700 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/60",
      border: "border-red-200 dark:border-red-800",
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-5xl mx-auto px-4 sm:px-6 py-6"
    >
      {/* Back nav */}
      <button
        data-testid="button-back"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground mb-7 hover:text-foreground transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to search
      </button>

      {/* ── Price Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-1.5">
            <h1
              data-testid="text-symbol"
              className="text-3xl sm:text-4xl font-bold tracking-tight"
            >
              {quote.symbol}
            </h1>
            <Badge
              variant="secondary"
              className={`text-xs font-medium ${instrumentColor(quote.instrumentType)}`}
            >
              {quote.instrumentType}
            </Badge>
            {quote.exchangeName && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-medium">
                {quote.exchangeName}
              </span>
            )}
          </div>
          <p data-testid="text-name" className="text-base text-muted-foreground">
            {quote.name}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p
            data-testid="text-current-price"
            className={`text-4xl sm:text-5xl font-bold font-mono tracking-tight ${
              isPositive ? "text-foreground" : "text-foreground"
            }`}
          >
            {formatPrice(quote.currentPrice)}
          </p>
          <div className="mt-2">
            <PriceBadge change={quote.change} changePercent={quote.changePercent} />
          </div>
        </div>
      </div>

      {/* ── 5-Day Chart ── */}
      {quote.history.length > 1 && (
        <Card className="mb-6 overflow-hidden border-border/60">
          <CardHeader className="pb-0 pt-4 px-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                5-Day Price
              </CardTitle>
              <span
                className={`text-xs font-semibold ${
                  isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                }`}
              >
                {isPositive ? "▲" : "▼"}{" "}
                {Math.abs(quote.changePercent).toFixed(2)}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-2 pb-3 px-2 sm:px-4">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={quote.history}
                margin={{ top: 8, right: 4, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                  opacity={0.6}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  dy={6}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`
                  }
                  width={58}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "10px",
                    fontSize: "12px",
                    padding: "8px 12px",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  }}
                  formatter={(value: number) => [
                    `$${value.toFixed(2)}`,
                    "Close",
                  ]}
                  labelStyle={{
                    color: "hsl(var(--muted-foreground))",
                    fontSize: "11px",
                    marginBottom: "2px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={chartColor}
                  strokeWidth={2.5}
                  fill="url(#colorClose)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: chartColor }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          {
            icon: ArrowUpDown,
            label: "Day Range",
            value: `${formatPrice(quote.dayLow)} – ${formatPrice(quote.dayHigh)}`,
            testid: "text-day-range",
            color: "text-blue-500",
          },
          {
            icon: Activity,
            label: "Volume",
            value: formatVolume(quote.volume),
            testid: "text-volume",
            color: "text-violet-500",
          },
          {
            icon: DollarSign,
            label: "Prev Close",
            value: formatPrice(quote.previousClose),
            testid: "text-prev-close",
            color: "text-amber-500",
          },
          {
            icon: BarChart3,
            label: "52-Week Range",
            value: `${formatPrice(quote.fiftyTwoWeekLow)} – ${formatPrice(quote.fiftyTwoWeekHigh)}`,
            testid: "text-52w-range",
            color: "text-emerald-500",
          },
        ].map(({ icon: Icon, label, value, testid, color }) => (
          <Card key={label} className="border-border/60 hover:border-border transition-colors">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className={`w-3.5 h-3.5 ${color}`} />
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
              </div>
              <p data-testid={testid} className="text-sm font-mono font-semibold">
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── 52-Week Position ── */}
      {quote.fiftyTwoWeekLow != null && quote.fiftyTwoWeekHigh != null && (
        <Card className="mb-8 border-border/60">
          <CardContent className="pt-4 pb-4 px-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              52-Week Position
            </p>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-700 ${
                  isPositive ? "bg-emerald-500" : "bg-red-500"
                }`}
                style={{
                  width: `${Math.max(2, Math.min(98, priceFromLow))}%`,
                }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-muted-foreground font-mono">
                {formatPrice(quote.fiftyTwoWeekLow)}
              </span>
              <span
                className={`text-xs font-semibold font-mono ${
                  isPositive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-500"
                }`}
              >
                {formatPrice(quote.currentPrice)}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {formatPrice(quote.fiftyTwoWeekHigh)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── AI Analysis ── */}
      <div className="mb-8">
        {/* Section header */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Brain className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">AI Analysis</h2>
              <p className="text-xs text-muted-foreground">Powered by DeepSeek</p>
            </div>
          </div>
          <Button
            data-testid="button-analyze"
            onClick={runAnalysis}
            disabled={isAnalyzing}
            size="sm"
            className="rounded-xl gap-1.5 shadow-sm"
          >
            {isAnalyzing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {isAnalyzing ? "Analyzing…" : "Analyze with AI"}
          </Button>
        </div>

        {/* Streaming state */}
        <AnimatePresence>
          {isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Card className="mb-5 border-primary/20 bg-primary/[0.03]">
                <CardContent className="pt-4 pb-4 px-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      Analyzing {quote.symbol}…
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed font-mono">
                    {streamingContent}
                    <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-middle rounded-sm" />
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Placeholder before analysis */}
        {!analysis && !isAnalyzing && (
          <Card className="border-border/50 border-dashed">
            <CardContent className="py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Brain className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="text-sm font-medium text-foreground/80 mb-1">
                AI insights waiting
              </p>
              <p className="text-xs text-muted-foreground mb-5 max-w-xs mx-auto">
                Click "Analyze with AI" to get entry price, target price, stop
                loss, and detailed reasoning.
              </p>
              <Button
                onClick={runAnalysis}
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Get AI Analysis
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Completed analysis */}
        <AnimatePresence>
          {analysis && !isAnalyzing && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4"
            >
              {/* Price targets */}
              <div className="grid grid-cols-3 gap-3">
                {/* Buy Price */}
                <Card className="border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20">
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs text-muted-foreground font-medium">
                        Buy Price
                      </span>
                    </div>
                    <p
                      data-testid="text-buy-price"
                      className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400"
                    >
                      {formatPrice(analysis.buyPrice)}
                    </p>
                    {analysis.buyPrice && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {Math.abs(
                          ((quote.currentPrice - analysis.buyPrice) /
                            quote.currentPrice) *
                            100
                        ).toFixed(1)}
                        %{" "}
                        {quote.currentPrice > analysis.buyPrice
                          ? "below"
                          : "above"}{" "}
                        current
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Target Price */}
                <Card className="border-blue-200/60 dark:border-blue-800/40 bg-blue-50/40 dark:bg-blue-950/20">
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Target className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-xs text-muted-foreground font-medium">
                        Target
                      </span>
                    </div>
                    <p
                      data-testid="text-target-price"
                      className="text-xl font-bold font-mono text-blue-700 dark:text-blue-400"
                    >
                      {formatPrice(analysis.targetPrice)}
                    </p>
                    {analysis.targetPrice && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {Math.abs(
                          ((analysis.targetPrice - quote.currentPrice) /
                            quote.currentPrice) *
                            100
                        ).toFixed(1)}
                        %{" "}
                        {analysis.targetPrice > quote.currentPrice
                          ? "upside"
                          : "downside"}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Stop Loss */}
                <Card className="border-red-200/60 dark:border-red-800/40 bg-red-50/40 dark:bg-red-950/20">
                  <CardContent className="pt-4 pb-3 px-4">
                    <div className="flex items-center gap-1.5 mb-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs text-muted-foreground font-medium">
                        Stop Loss
                      </span>
                    </div>
                    <p
                      data-testid="text-stop-loss"
                      className="text-xl font-bold font-mono text-red-600 dark:text-red-400"
                    >
                      {formatPrice(analysis.stopLoss)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Risk management
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Sentiment & Confidence badges */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {analysis.sentiment && sentimentConfig[analysis.sentiment] && (
                  <div
                    data-testid="badge-sentiment"
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border
                      ${sentimentConfig[analysis.sentiment].bg}
                      ${sentimentConfig[analysis.sentiment].color}
                      ${sentimentConfig[analysis.sentiment].border}`}
                  >
                    {(() => {
                      const Icon = sentimentConfig[analysis.sentiment].icon;
                      return <Icon className="w-3 h-3" />;
                    })()}
                    {analysis.sentiment.charAt(0).toUpperCase() +
                      analysis.sentiment.slice(1)}
                  </div>
                )}
                {analysis.confidence && confidenceConfig[analysis.confidence] && (
                  <div
                    data-testid="badge-confidence"
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border
                      ${confidenceConfig[analysis.confidence].bg}
                      ${confidenceConfig[analysis.confidence].color}
                      ${confidenceConfig[analysis.confidence].border}`}
                  >
                    Confidence:{" "}
                    {analysis.confidence.charAt(0).toUpperCase() +
                      analysis.confidence.slice(1)}
                  </div>
                )}
              </div>

              {/* Detailed reasoning card */}
              <Card className="border-border/60">
                <CardHeader className="pb-2 pt-5 px-5">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">
                      Detailed Analysis
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <p
                    data-testid="text-reasoning"
                    className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap"
                  >
                    {analysis.reasoning}
                  </p>

                  {analysis.keyFactors && (
                    <>
                      <Separator className="my-4" />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                          Key Factors
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.keyFactors.split(",").map((factor, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-muted text-muted-foreground font-medium"
                            >
                              <ChevronRight className="w-3 h-3 text-primary/60" />
                              {factor.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
