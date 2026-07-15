import { NextResponse } from "next/server";
import { fetchKrQuote, fetchFx, selectKrLatest } from "@/lib/naver";
import { fetchUsQuote } from "@/lib/yahoo";
import { adrInKrw, parityUsd, premiumPct } from "@/lib/premium";

export const dynamic = "force-dynamic";

export async function GET() {
  const [krR, usR, fxR] = await Promise.allSettled([
    fetchKrQuote(),
    fetchUsQuote(),
    fetchFx(),
  ]);

  const kr = krR.status === "fulfilled" ? krR.value : null;
  const us = usR.status === "fulfilled" ? usR.value : null;
  const fx = fxR.status === "fulfilled" ? fxR.value : null;
  const errors = [krR, usR, fxR]
    .filter((r) => r.status === "rejected")
    .map((r) => String((r as PromiseRejectedResult).reason));

  const krLatest = kr ? selectKrLatest(kr) : null;

  let premium = null;
  if (krLatest && us && fx) {
    premium = {
      pct: premiumPct(us.latest.price, krLatest.price, fx.rate),
      adrInKrw: adrInKrw(us.latest.price, fx.rate),
      parityUsd: parityUsd(krLatest.price, fx.rate),
      comparedSessions: { kr: krLatest.session, us: us.latest.session },
    };
  }

  return NextResponse.json(
    { kr, krLatest, us, fx, premium, errors, asOf: Date.now() },
    { headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=25" } }
  );
}
