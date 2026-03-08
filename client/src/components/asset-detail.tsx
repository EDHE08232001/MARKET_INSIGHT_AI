import { useState } from "react";
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
  Clock,
  DollarSign,
  ArrowUpDown,
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

export function AssetDetail({ quote, onBack }: AssetDetailProps) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const isPositive = quote.change >= 0;
  const priceFromLow = quote.fiftyTwoWeekLow
    ? ((quote.currentPrice - quote.fiftyTwoWeekLow) / (quote.fiftyTwoWeekHigh! - quote.fiftyTwoWeekLow) * 100)
    : 50;

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setStreamingContent("");
    setAnalysis(null);

    try {
      const res = await fetch(`/api/analyze/${encodeURIComponent(quote.symbol)}`, { method: "POST" });
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

  const sentimentConfig: Record<string, { icon: any; color: string; bg: string }> = {
    bullish: { icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950" },
    bearish: { icon: TrendingDown, color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950" },
    neutral: { icon: Minus, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950" },
  };

  const confidenceConfig: Record<string, { color: string; bg: string }> = {
    high: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950" },
    medium: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950" },
    low: { color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950" },
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <button
        data-testid="button-back"
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 hover-elevate active-elevate-2 px-2 py-1 rounded-md -ml-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to search
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 data-testid="text-symbol" className="text-2xl sm:text-3xl font-bold tracking-tight">
              {quote.symbol}
            </h1>
            <Badge variant="secondary" className="text-xs">
              {quote.instrumentType}
            </Badge>
            {quote.exchangeName && (
              <span className="text-xs text-muted-foreground">{quote.exchangeName}</span>
            )}
          </div>
          <p data-testid="text-name" className="text-muted-foreground">{quote.name}</p>
        </div>
        <div className="text-left sm:text-right">
          <p data-testid="text-current-price" className="text-3xl sm:text-4xl font-bold font-mono tracking-tight">
            {formatPrice(quote.currentPrice)}
          </p>
          <div className="mt-1">
            <PriceBadge change={quote.change} changePercent={quote.changePercent} />
          </div>
        </div>
      </div>

      {quote.history.length > 1 && (
        <Card className="mb-6">
          <CardContent className="pt-4 pb-2 px-2 sm:px-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={quote.history}>
                <defs>
                  <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Close"]}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={isPositive ? "#10b981" : "#ef4444"}
                  strokeWidth={2}
                  fill="url(#colorClose)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Day Range</span>
            </div>
            <p data-testid="text-day-range" className="text-sm font-mono font-semibold">
              {formatPrice(quote.dayLow)} - {formatPrice(quote.dayHigh)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Activity className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Volume</span>
            </div>
            <p data-testid="text-volume" className="text-sm font-mono font-semibold">
              {formatVolume(quote.volume)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Prev Close</span>
            </div>
            <p data-testid="text-prev-close" className="text-sm font-mono font-semibold">
              {formatPrice(quote.previousClose)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">52W Range</span>
            </div>
            <p data-testid="text-52w-range" className="text-sm font-mono font-semibold">
              {formatPrice(quote.fiftyTwoWeekLow)} - {formatPrice(quote.fiftyTwoWeekHigh)}
            </p>
          </CardContent>
        </Card>
      </div>

      {quote.fiftyTwoWeekLow != null && quote.fiftyTwoWeekHigh != null && (
        <Card className="mb-6">
          <CardContent className="pt-4 pb-4 px-4">
            <p className="text-xs text-muted-foreground font-medium mb-3">52-Week Position</p>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full rounded-full ${isPositive ? "bg-emerald-500" : "bg-red-500"}`}
                style={{ width: `${Math.max(2, Math.min(98, priceFromLow))}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-xs text-muted-foreground font-mono">{formatPrice(quote.fiftyTwoWeekLow)}</span>
              <span className="text-xs font-medium font-mono">{formatPrice(quote.currentPrice)}</span>
              <span className="text-xs text-muted-foreground font-mono">{formatPrice(quote.fiftyTwoWeekHigh)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator className="mb-6" />

      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">AI Analysis</h2>
        </div>
        <Button
          data-testid="button-analyze"
          onClick={runAnalysis}
          disabled={isAnalyzing}
          size="sm"
        >
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-1.5" />
          )}
          {isAnalyzing ? "Analyzing..." : "Analyze with AI"}
        </Button>
      </div>

      {isAnalyzing && (
        <Card className="mb-6">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">AI is analyzing {quote.symbol}...</span>
            </div>
            <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
              {streamingContent}
              <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-middle rounded-sm" />
            </p>
          </CardContent>
        </Card>
      )}

      {analysis && !isAnalyzing && (
        <div className="space-y-4 mb-8">
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-muted-foreground font-medium">Buy Price</span>
                </div>
                <p data-testid="text-buy-price" className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {formatPrice(analysis.buyPrice)}
                </p>
                {analysis.buyPrice && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {((quote.currentPrice - analysis.buyPrice) / quote.currentPrice * 100).toFixed(1)}% {quote.currentPrice > analysis.buyPrice ? "below" : "above"} current
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Target className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-xs text-muted-foreground font-medium">Target Price</span>
                </div>
                <p data-testid="text-target-price" className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">
                  {formatPrice(analysis.targetPrice)}
                </p>
                {analysis.targetPrice && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {((analysis.targetPrice - quote.currentPrice) / quote.currentPrice * 100).toFixed(1)}% {analysis.targetPrice > quote.currentPrice ? "upside" : "downside"}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-xs text-muted-foreground font-medium">Stop Loss</span>
                </div>
                <p data-testid="text-stop-loss" className="text-xl font-bold font-mono text-red-600 dark:text-red-400">
                  {formatPrice(analysis.stopLoss)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Risk management</p>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {analysis.sentiment && (
              <Badge
                data-testid="badge-sentiment"
                variant="secondary"
                className={`${sentimentConfig[analysis.sentiment]?.bg || ""} ${sentimentConfig[analysis.sentiment]?.color || ""}`}
              >
                {(() => {
                  const Icon = sentimentConfig[analysis.sentiment]?.icon || Minus;
                  return <Icon className="w-3 h-3 mr-1" />;
                })()}
                {analysis.sentiment.charAt(0).toUpperCase() + analysis.sentiment.slice(1)}
              </Badge>
            )}
            {analysis.confidence && (
              <Badge
                data-testid="badge-confidence"
                variant="secondary"
                className={`${confidenceConfig[analysis.confidence]?.bg || ""} ${confidenceConfig[analysis.confidence]?.color || ""}`}
              >
                Confidence: {analysis.confidence}
              </Badge>
            )}
          </div>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-medium">Detailed Analysis</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p data-testid="text-reasoning" className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {analysis.reasoning}
              </p>
              {analysis.keyFactors && (
                <>
                  <Separator className="my-3" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Key Factors</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.keyFactors.split(",").map((factor, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {factor.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!analysis && !isAnalyzing && (
        <Card className="mb-8">
          <CardContent className="py-12 text-center">
            <Brain className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-1">Get AI-powered insights</p>
            <p className="text-xs text-muted-foreground/60 mb-4">
              Click "Analyze with AI" to get buy price, target price, and detailed analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
