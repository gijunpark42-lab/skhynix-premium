import { US_TICKER } from "./premium";
import type { Candle } from "./naver";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export type UsSession = "PRE" | "REGULAR" | "POST" | "CLOSED";

interface YahooChart {
  meta: any;
  candles: Candle[]; // epoch ms, includes pre/post
}

async function fetchChart(interval: string, range: string): Promise<YahooChart> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${US_TICKER}?interval=${interval}&range=${range}&includePrePost=true`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);
  const json = await res.json();
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(json.chart?.error?.description ?? "Yahoo: empty result");

  const timestamps: number[] = result.timestamp ?? [];
  const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const price = closes[i];
    if (price !== null && price !== undefined) {
      candles.push({ t: timestamps[i] * 1000, price });
    }
  }
  return { meta: result.meta, candles };
}

function sessionAt(tMs: number, meta: any): UsSession {
  const p = meta?.currentTradingPeriod;
  if (!p) return "CLOSED";
  const t = tMs / 1000;
  if (t >= p.regular.start && t < p.regular.end) return "REGULAR";
  if (t >= p.pre.start && t < p.pre.end) return "PRE";
  if (t >= p.post.start && t < p.post.end) return "POST";
  return "CLOSED";
}

export interface UsQuote {
  regular: { price: number | null; changePct: number | null; change: number | null };
  latest: {
    price: number;
    session: UsSession;
    changePct: number | null;
    tradedAt: number; // epoch ms
  };
  prevClose: number | null;
  marketStatus: UsSession; // session in effect right now
}

export async function fetchUsQuote(): Promise<UsQuote> {
  const { meta, candles } = await fetchChart("1m", "1d");
  const regPrice: number | null = meta.regularMarketPrice ?? null;
  const prevClose: number | null = meta.chartPreviousClose ?? meta.previousClose ?? null;

  const last = candles[candles.length - 1];
  const latestPrice = last?.price ?? regPrice;
  if (latestPrice === null || latestPrice === undefined) {
    throw new Error("Yahoo: no price available");
  }
  const latestT = last?.t ?? (meta.regularMarketTime ?? 0) * 1000;
  const session = sessionAt(latestT, meta);

  // Pre-market change is vs previous close; post-market change is vs today's regular close.
  const base = session === "POST" ? regPrice : prevClose;
  const latestChangePct = base ? (latestPrice / base - 1) * 100 : null;

  return {
    regular: {
      price: regPrice,
      change: regPrice !== null && prevClose !== null ? regPrice - prevClose : null,
      changePct:
        regPrice !== null && prevClose ? (regPrice / prevClose - 1) * 100 : null,
    },
    latest: { price: latestPrice, session, changePct: latestChangePct, tradedAt: latestT },
    prevClose,
    marketStatus: sessionAt(Date.now(), meta),
  };
}

/** 5-minute candles including pre/post, for the premium history chart. */
export async function fetchUsCandles(): Promise<Candle[]> {
  const { candles } = await fetchChart("5m", "2d");
  return candles;
}
