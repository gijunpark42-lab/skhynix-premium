"use client";

import { useEffect, useState } from "react";
import PriceCard from "@/components/PriceCard";
import PremiumPanel from "@/components/PremiumPanel";
import PremiumChart from "@/components/PremiumChart";
import { fmtKrw, fmtPct, fmtSigned, fmtUsd } from "@/lib/format";
import type { HistoryPayload, QuotePayload } from "@/lib/types";

const QUOTE_INTERVAL_MS = 7_000;
const HISTORY_INTERVAL_MS = 60_000;

function usePolling<T>(url: string, intervalMs: number): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        if (alive) setData(json);
      } catch {
        // keep last good data; next tick retries
      }
    };
    load();
    const id = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [url, intervalMs]);
  return data;
}

export default function Home() {
  const quote = usePolling<QuotePayload>("/api/quote", QUOTE_INTERVAL_MS);
  const history = usePolling<HistoryPayload>("/api/history", HISTORY_INTERVAL_MS);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-white">
            SK hynix — Korea vs US ADR
          </h1>
          <p className="mt-1 text-sm text-[#898781]">
            KRX 000660 · NASDAQ SKHY · live premium tracker
          </p>
        </div>
        {quote && (
          <p className="text-xs text-[#898781]">
            Updated{" "}
            {new Date(quote.asOf).toLocaleTimeString("en-GB", {
              timeZone: "Asia/Seoul",
            })}{" "}
            KST
          </p>
        )}
      </header>

      {!quote ? (
        <p className="py-24 text-center text-sm text-[#898781]">Loading live data…</p>
      ) : (
        <div className="space-y-4">
          {quote.errors.length > 0 && (
            <div className="rounded-lg border border-[#fab219]/40 bg-[#fab219]/10 px-4 py-2 text-xs text-[#fab219]">
              Some feeds failed this refresh — showing last available data.
            </div>
          )}

          <PremiumPanel quote={quote} />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <PriceCard
              title="SK hynix (Korea)"
              subtitle="KOSPI · 000660 · KRW"
              status={quote.kr?.regular.status ?? "UNKNOWN"}
              price={fmtKrw(quote.kr?.regular.price)}
              changeAbs={fmtSigned(quote.kr?.regular.change, (x) => fmtKrw(x))}
              changePct={fmtPct(quote.kr?.regular.changePct)}
              changeValue={quote.kr?.regular.change ?? null}
              rows={
                quote.kr?.nxt
                  ? [
                      {
                        label: "NXT",
                        value: fmtKrw(quote.kr.nxt.price),
                        changePct: fmtPct(quote.kr.nxt.changePct),
                        changeValue: quote.kr.nxt.changePct,
                        status: quote.kr.nxt.status,
                      },
                    ]
                  : []
              }
            />
            <PriceCard
              title="SK hynix ADR (US)"
              subtitle="NASDAQ · SKHY · USD"
              status={quote.us?.marketStatus ?? "UNKNOWN"}
              price={fmtUsd(quote.us?.regular.price)}
              changeAbs={fmtSigned(quote.us?.regular.change, (x) => fmtUsd(x))}
              changePct={fmtPct(quote.us?.regular.changePct)}
              changeValue={quote.us?.regular.change ?? null}
              rows={
                quote.us && quote.us.latest.session !== "REGULAR"
                  ? [
                      {
                        label:
                          quote.us.latest.session === "PRE"
                            ? "Pre-market"
                            : "After-hours",
                        value: fmtUsd(quote.us.latest.price),
                        changePct: fmtPct(quote.us.latest.changePct),
                        changeValue: quote.us.latest.changePct,
                      },
                    ]
                  : []
              }
            />
            <PriceCard
              title="USD / KRW"
              subtitle="Hana Bank via Naver"
              status="LIVE"
              price={
                quote.fx
                  ? `₩${quote.fx.rate.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "—"
              }
              changeAbs=""
              changePct=""
              changeValue={null}
              rows={[]}
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-[#1a1a19] p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-white">
                Intraday ADR premium
              </h2>
              <p className="text-xs text-[#898781]">last 24h · times in KST</p>
            </div>
            <PremiumChart series={history?.series ?? []} />
          </div>

          <footer className="pt-2 text-xs leading-relaxed text-[#898781]">
            Premium = SKHY × USD/KRW × 10 ÷ 000660 price − 1. Korean side uses the
            NXT (Nextrade) session when KRX is closed; US side uses pre/after-market
            when available. Data: Naver Finance (KRX, NXT, FX) and Yahoo Finance
            (SKHY), unofficial feeds — informational only, not investment advice.
          </footer>
        </div>
      )}
    </main>
  );
}
