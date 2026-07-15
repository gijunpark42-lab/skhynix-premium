import { KR_TICKER } from "./premium";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function naverJson(url: string): Promise<any> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Naver ${res.status} for ${url}`);
  return res.json();
}

/** Parse Naver's comma-formatted price strings ("2,123,000" -> 2123000). */
function num(s: string | number | null | undefined): number | null {
  if (s === null || s === undefined) return null;
  const n = typeof s === "number" ? s : parseFloat(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export interface KrSession {
  price: number | null;
  changePct: number | null;
  change: number | null;
  status: string; // OPEN | CLOSE | ...
  tradedAt: string | null;
}

export interface KrQuote {
  regular: KrSession;
  nxt: (KrSession & { session: string }) | null;
  prevClose: number | null;
}

export async function fetchKrQuote(): Promise<KrQuote> {
  const json = await naverJson(
    `https://polling.finance.naver.com/api/realtime/domestic/stock/${KR_TICKER}`
  );
  const d = json.datas?.[0];
  if (!d) throw new Error("Naver domestic quote: empty datas");

  const price = num(d.closePriceRaw ?? d.closePrice);
  const change = num(d.compareToPreviousClosePriceRaw ?? d.compareToPreviousClosePrice);
  const sign = d.compareToPreviousPrice?.name === "FALLING" ? -1 : 1;
  const regular: KrSession = {
    price,
    change: change !== null ? sign * Math.abs(change) : null,
    changePct: num(d.fluctuationsRatioRaw ?? d.fluctuationsRatio),
    status: d.marketStatus ?? "UNKNOWN",
    tradedAt: d.localTradedAt ?? null,
  };

  const o = d.overMarketPriceInfo;
  const nxt = o
    ? {
        price: num(o.overPrice),
        change: num(o.compareToPreviousClosePrice),
        changePct: num(o.fluctuationsRatio),
        status: o.overMarketStatus ?? "UNKNOWN",
        session: o.tradingSessionType ?? "UNKNOWN",
        tradedAt: o.localTradedAt ?? null,
      }
    : null;

  const prevClose =
    price !== null && regular.change !== null ? price - regular.change : null;

  return { regular, nxt, prevClose };
}

/**
 * Latest Korean price: regular session while open, otherwise the NXT session
 * (Nextrade trades 08:00-20:00 KST, wrapping around KRX hours).
 */
export function selectKrLatest(
  kr: KrQuote
): { price: number; session: "KRX" | "NXT"; changePct: number | null } | null {
  if (kr.regular.status === "OPEN" && kr.regular.price !== null) {
    return { price: kr.regular.price, session: "KRX", changePct: kr.regular.changePct };
  }
  if (kr.nxt?.price != null) {
    return { price: kr.nxt.price, session: "NXT", changePct: kr.nxt.changePct };
  }
  if (kr.regular.price !== null) {
    return { price: kr.regular.price, session: "KRX", changePct: kr.regular.changePct };
  }
  return null;
}

export interface FxQuote {
  rate: number;
  tradedAt: string | null;
}

export async function fetchFx(): Promise<FxQuote> {
  const json = await naverJson(
    "https://m.stock.naver.com/front-api/marketIndex/productDetail?category=exchange&reutersCode=FX_USDKRW"
  );
  const rate = num(json.result?.closePrice);
  if (rate === null) throw new Error("Naver FX: missing closePrice");
  return { rate, tradedAt: json.result?.localTradedAt ?? null };
}

export interface Candle {
  t: number; // epoch ms
  price: number;
}

/** Today's 5-minute candles for the KRX regular session (KST). */
export async function fetchKrCandles(count = 120): Promise<Candle[]> {
  const json = await naverJson(
    `https://api.stock.naver.com/chart/domestic/item/${KR_TICKER}/minute5?count=${count}`
  );
  if (!Array.isArray(json)) throw new Error("Naver candles: unexpected shape");
  return json
    .map((c: any) => {
      const s = String(c.localDateTime ?? "");
      const m = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
      const price = num(c.currentPrice);
      if (!m || price === null) return null;
      // localDateTime is KST (UTC+9)
      const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 9, +m[5], +m[6]);
      return { t, price };
    })
    .filter((c): c is Candle => c !== null)
    .sort((a, b) => a.t - b.t);
}
