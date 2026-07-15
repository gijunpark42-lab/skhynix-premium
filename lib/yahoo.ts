import { get as httpsGet } from "node:https";
import { US_TICKER } from "./premium";
import type { Candle } from "./naver";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

export type UsSession = "PRE" | "REGULAR" | "POST" | "OVERNIGHT" | "CLOSED";

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

// Yahoo pages respond with >16KB of headers, which overflows undici's default
// limit (UND_ERR_HEADERS_OVERFLOW), so these requests go through node:https
// with a raised maxHeaderSize instead of fetch().
function httpGetBig(
  url: string,
  headers: Record<string, string>
): Promise<{ status: number; headers: import("node:http").IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpsGet(url, { headers, maxHeaderSize: 256 * 1024 }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (body += c));
      res.on("end", () =>
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body })
      );
    });
    req.on("error", reject);
    req.setTimeout(8000, () => req.destroy(new Error("yahoo timeout")));
  });
}

// Yahoo serves a slim page (no overnight fields) to cookieless clients; a
// throwaway session cookie from fc.yahoo.com unlocks the full one. Cache it
// per warm serverless instance.
let yahooCookie: { value: string; expires: number } | null = null;

async function getYahooCookie(): Promise<string | null> {
  if (yahooCookie && Date.now() < yahooCookie.expires) return yahooCookie.value;
  try {
    const res = await httpGetBig("https://fc.yahoo.com/", { "User-Agent": UA });
    const raw = res.headers["set-cookie"] ?? [];
    const pairs = (Array.isArray(raw) ? raw : [raw]).map((c) => c.split(";")[0]);
    if (pairs.length === 0) return null;
    yahooCookie = { value: pairs.join("; "), expires: Date.now() + 6 * 60 * 60 * 1000 };
    return yahooCookie.value;
  } catch {
    return null;
  }
}

/**
 * 24h/overnight session quote (Blue Ocean ATS, 20:00-04:00 ET Sun-Thu).
 * Yahoo's public quote APIs strip the overnight fields for anonymous callers,
 * but the server-rendered quote page embeds them — scrape those. Fail-soft:
 * any miss returns null and the dashboard falls back to pre/regular/post.
 */
export async function fetchOvernight(): Promise<{
  price: number;
  changePct: number | null;
  tradedAt: number;
} | null> {
  try {
    const cookie = await getYahooCookie();
    const res = await httpGetBig(`https://finance.yahoo.com/quote/${US_TICKER}/`, {
      "User-Agent": UA,
      Accept: "text/html",
      ...(cookie ? { Cookie: cookie } : {}),
    });
    if (res.status !== 200) return null;
    const html = res.body;
    // Fields appear both as plain JSON and escaped inside script strings.
    const price = html.match(/\\?"overnightMarketPrice\\?":\{\\?"raw\\?":([\d.]+)/);
    const time = html.match(/\\?"overnightMarketTime\\?":(?:\{\\?"raw\\?":)?(\d+)/);
    const chg = html.match(
      /\\?"overnightMarketChangePercent\\?":\{\\?"raw\\?":(-?[\d.eE+]+)/
    );
    if (!price || !time) return null;
    return {
      price: parseFloat(price[1]),
      changePct: chg ? parseFloat(chg[1]) : null,
      tradedAt: parseInt(time[1], 10) * 1000,
    };
  } catch {
    return null;
  }
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
  const [chartRes, overnightRes] = await Promise.allSettled([
    fetchChart("1m", "1d"),
    fetchOvernight(),
  ]);
  if (chartRes.status === "rejected") throw chartRes.reason;
  const { meta, candles } = chartRes.value;
  const overnight = overnightRes.status === "fulfilled" ? overnightRes.value : null;

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
  let latest = {
    price: latestPrice,
    session,
    changePct: base ? (latestPrice / base - 1) * 100 : null,
    tradedAt: latestT,
  };
  // The 24h/overnight trade wins whenever it is fresher than the last candle.
  if (overnight && overnight.tradedAt > latest.tradedAt) {
    latest = {
      price: overnight.price,
      session: "OVERNIGHT",
      changePct: overnight.changePct,
      tradedAt: overnight.tradedAt,
    };
  }

  const overnightActive =
    latest.session === "OVERNIGHT" && Date.now() - latest.tradedAt < 15 * 60 * 1000;

  return {
    regular: {
      price: regPrice,
      change: regPrice !== null && prevClose !== null ? regPrice - prevClose : null,
      changePct:
        regPrice !== null && prevClose ? (regPrice / prevClose - 1) * 100 : null,
    },
    latest,
    prevClose,
    marketStatus: overnightActive ? "OVERNIGHT" : sessionAt(Date.now(), meta),
  };
}

/** 5-minute candles including pre/post, for the premium history chart. */
export async function fetchUsCandles(): Promise<Candle[]> {
  const { candles } = await fetchChart("5m", "2d");
  return candles;
}
