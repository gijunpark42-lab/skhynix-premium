import { fmtKrw, fmtPct, fmtUsd, deltaClass } from "@/lib/format";
import type { QuotePayload } from "@/lib/types";

const SESSION_LABEL: Record<string, string> = {
  KRX: "KRX regular",
  NXT: "NXT (Nextrade)",
  PRE: "US pre-market",
  REGULAR: "US regular",
  POST: "US after-hours",
  OVERNIGHT: "US 24h (overnight)",
  CLOSED: "US last trade",
};

export default function PremiumPanel({ quote }: { quote: QuotePayload }) {
  const p = quote.premium;
  if (!p) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#1a1a19] p-6 text-sm text-[#898781]">
        Premium unavailable — one of the upstream feeds failed.
      </div>
    );
  }
  const isPremium = p.pct >= 0;
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1a19] p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-[#898781]">
        ADR {isPremium ? "premium" : "discount"} vs Korean listing
      </p>
      <p className={`mt-2 text-6xl font-semibold tracking-tight ${deltaClass(p.pct)}`}>
        {fmtPct(p.pct)}
      </p>
      <p className="mt-2 text-xs text-[#898781]">
        Comparing {SESSION_LABEL[p.comparedSessions.us] ?? p.comparedSessions.us}{" "}
        vs {SESSION_LABEL[p.comparedSessions.kr] ?? p.comparedSessions.kr} · 10 ADS
        = 1 common share
      </p>
      <div className="mt-5 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-[#898781]">ADR in KRW terms (per share)</p>
          <p className="mt-0.5 font-medium text-white">{fmtKrw(p.adrInKrw)}</p>
        </div>
        <div>
          <p className="text-[#898781]">Parity ADS price (from KRX)</p>
          <p className="mt-0.5 font-medium text-white">{fmtUsd(p.parityUsd)}</p>
        </div>
      </div>
    </div>
  );
}
