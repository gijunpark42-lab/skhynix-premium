// Shapes returned by /api/quote and /api/history (client-side view).

export interface SessionQuote {
  price: number | null;
  change: number | null;
  changePct: number | null;
  status: string;
  tradedAt: string | null;
}

export interface QuotePayload {
  kr: {
    regular: SessionQuote;
    nxt: (SessionQuote & { session: string }) | null;
    prevClose: number | null;
  } | null;
  krLatest: { price: number; session: "KRX" | "NXT"; changePct: number | null } | null;
  us: {
    regular: { price: number | null; change: number | null; changePct: number | null };
    latest: { price: number; session: string; changePct: number | null; tradedAt: number };
    prevClose: number | null;
    marketStatus: string;
  } | null;
  fx: { rate: number; tradedAt: string | null } | null;
  premium: {
    pct: number;
    adrInKrw: number;
    parityUsd: number;
    comparedSessions: { kr: string; us: string };
  } | null;
  errors: string[];
  asOf: number;
}

export interface HistoryPoint {
  t: number;
  premiumPct: number;
  krPrice: number;
  usPrice: number;
}

export interface HistoryPayload {
  series: HistoryPoint[];
  fxRate?: number;
  asOf?: number;
  error?: string;
}
