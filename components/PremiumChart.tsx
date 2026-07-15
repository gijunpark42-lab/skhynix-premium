"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtDateTimeKst, fmtKrw, fmtPct, fmtTimeKst, fmtUsd } from "@/lib/format";
import type { HistoryPoint } from "@/lib/types";

const SERIES = "#3987e5";
const GRID = "#2c2c2a";
const AXIS = "#383835";
const MUTED = "#898781";

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: HistoryPoint = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/10 bg-[#0d0d0d] px-3 py-2 text-xs shadow-lg">
      <p className="text-[#898781]">{fmtDateTimeKst(d.t)} KST</p>
      <p className="mt-1 font-semibold text-white">{fmtPct(d.premiumPct)} premium</p>
      <p className="mt-1 text-[#c3c2b7]">SKHY {fmtUsd(d.usPrice)}</p>
      <p className="text-[#c3c2b7]">000660 {fmtKrw(d.krPrice)}</p>
    </div>
  );
}

export default function PremiumChart({ series }: { series: HistoryPoint[] }) {
  if (series.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-[#898781]">
        No intraday data yet.
      </div>
    );
  }
  const values = series.map((p) => p.premiumPct);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.1, 0.5);
  const crossesZero = min <= 0 && max >= 0;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t) => fmtTimeKst(t)}
            tick={{ fill: MUTED, fontSize: 11 }}
            axisLine={{ stroke: AXIS }}
            tickLine={{ stroke: AXIS }}
            minTickGap={48}
          />
          <YAxis
            domain={[min - pad, max + pad]}
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
            tick={{ fill: MUTED, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: MUTED, strokeDasharray: "3 3" }}
          />
          {crossesZero && <ReferenceLine y={0} stroke={AXIS} strokeWidth={1} />}
          <Line
            type="monotone"
            dataKey="premiumPct"
            stroke={SERIES}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: SERIES, stroke: "#1a1a19", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
