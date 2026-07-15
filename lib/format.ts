const krw = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const usd = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fmtKrw(n: number | null | undefined): string {
  return n == null ? "—" : `₩${krw.format(n)}`;
}

export function fmtUsd(n: number | null | undefined): string {
  return n == null ? "—" : `$${usd.format(n)}`;
}

export function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n == null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

export function fmtSigned(n: number | null | undefined, fmt: (x: number) => string): string {
  if (n == null) return "—";
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n))}`;
}

export function fmtTimeKst(t: number): string {
  return new Date(t).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

export function fmtDateTimeKst(t: number): string {
  return new Date(t).toLocaleString("en-GB", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

/** Color class for a signed change: green up, red down, muted flat. */
export function deltaClass(n: number | null | undefined): string {
  if (n == null || n === 0) return "text-[#898781]";
  return n > 0 ? "text-[#0ca30c]" : "text-[#e66767]";
}
