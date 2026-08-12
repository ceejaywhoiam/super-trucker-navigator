import React from "react";
import { Gauge, AlertTriangle } from "lucide-react";

export default function SpeedGovernor({ currentSpeed, governorSpeed, unit = "mph" }) {
  const limit = governorSpeed || 0;
  const over = limit > 0 && currentSpeed > limit;
  const pct = limit > 0 ? Math.min(100, (currentSpeed / limit) * 100) : 0;

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        over ? "border-rose-500 bg-rose-500/10" : "border-white/10 bg-zinc-900/60"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wide text-zinc-400">
          <Gauge className="w-4 h-4" /> Governor
        </span>
        {over && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" /> SLOW DOWN
          </span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className={`font-display text-4xl font-bold tabular-nums ${over ? "text-rose-400" : "text-white"}`}>
          {Math.round(currentSpeed)}
        </span>
        <span className="text-sm text-zinc-400 mb-1">{unit}</span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${over ? "bg-rose-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-zinc-500">
        Limit {limit > 0 ? `${limit} ${unit}` : "not set"}
      </p>
    </div>
  );
}