import { NextResponse } from "next/server";
import { fetchKrCandles, fetchKrQuote, fetchFx } from "@/lib/naver";
import { fetchUsCandles } from "@/lib/yahoo";
import { premiumPct } from "@/lib/premium";

export const dynamic = "force-dynamic";

const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    const [krCandles, usCandles, fx, krQuote] = await Promise.all([
      fetchKrCandles(),
      fetchUsCandles(),
      fetchFx(),
      // Naver's minute candles only cover today's KRX session; the previous
      // close anchors the KR side for US-session points before today's open.
      fetchKrQuote().catch(() => null),
    ]);

    // Merge both series over the union of timestamps, carrying the last-known
    // price on each side forward. Premium uses the current FX rate for the
    // whole window (intraday FX drift is negligible vs the premium itself).
    const merged = [
      ...krCandles.map((c) => ({ t: c.t, kr: c.price, us: null as number | null })),
      ...usCandles.map((c) => ({ t: c.t, kr: null as number | null, us: c.price })),
    ].sort((a, b) => a.t - b.t);

    const cutoff = Date.now() - WINDOW_MS;
    let lastKr: number | null = krQuote?.prevClose ?? null;
    let lastUs: number | null = null;
    const series: { t: number; premiumPct: number; krPrice: number; usPrice: number }[] = [];
    for (const p of merged) {
      if (p.kr !== null) lastKr = p.kr;
      if (p.us !== null) lastUs = p.us;
      if (lastKr !== null && lastUs !== null && p.t >= cutoff) {
        series.push({
          t: p.t,
          premiumPct: premiumPct(lastUs, lastKr, fx.rate),
          krPrice: lastKr,
          usPrice: lastUs,
        });
      }
    }

    return NextResponse.json(
      { series, fxRate: fx.rate, asOf: Date.now() },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch (e) {
    return NextResponse.json({ series: [], error: String(e) }, { status: 502 });
  }
}
