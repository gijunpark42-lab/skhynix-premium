import { deltaClass } from "@/lib/format";

export interface SubRow {
  label: string;
  value: string;
  changePct: string;
  changeValue: number | null;
  status?: string;
}

export function StatusBadge({ status }: { status: string }) {
  const open = status === "OPEN" || status === "REGULAR" || status === "LIVE";
  const live = open || status === "PRE" || status === "POST";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide ${
        live
          ? "border-[#0ca30c]/40 text-[#0ca30c]"
          : "border-white/10 text-[#898781]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${live ? "bg-[#0ca30c]" : "bg-[#898781]"}`}
      />
      {status}
    </span>
  );
}

export default function PriceCard({
  title,
  subtitle,
  status,
  price,
  changeAbs,
  changePct,
  changeValue,
  rows,
}: {
  title: string;
  subtitle: string;
  status: string;
  price: string;
  changeAbs: string;
  changePct: string;
  changeValue: number | null;
  rows: SubRow[];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1a19] p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="text-xs text-[#898781]">{subtitle}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="mt-3 text-3xl font-semibold text-white">{price}</p>
      {changeAbs !== "" && (
        <p className={`mt-1 text-sm font-medium ${deltaClass(changeValue)}`}>
          {changeAbs} ({changePct})
        </p>
      )}
      {rows.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-[#c3c2b7]">
                {r.label}
                {r.status && <StatusBadge status={r.status} />}
              </span>
              <span className="text-right">
                <span className="text-white">{r.value}</span>{" "}
                <span className={deltaClass(r.changeValue)}>{r.changePct}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
