import React from "react";
import { ChevronRight, Flag, Clock, Route as RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { metersToMiles, secondsToDuration } from "@/lib/truckRouting";
import { safetyScore } from "@/lib/truckRouting";

export function RouteOptions({ routes, selectedRouteId, truck, onSelect }) {
  return (
    <div className="space-y-2">
      {routes.map((r) => {
        const score = safetyScore(r, truck);
        const active = r.id === selectedRouteId;
        return (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={`w-full text-left rounded-xl border p-3 transition ${
              active
                ? "border-amber-500 bg-amber-500/10"
                : "border-white/10 bg-zinc-900/40 hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${active ? "text-amber-300" : "text-white"}`}>
                  Option {r.id + 1}
                </span>
                <SafetyBadge score={score} />
              </div>
              <span className="text-xs text-zinc-400">{secondsToDuration(r.duration)}</span>
            </div>
            <div className="mt-1 flex items-center gap-4 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <RouteIcon className="w-3 h-3" /> {metersToMiles(r.distance).toFixed(1)} mi
              </span>
              <span className="inline-flex items-center gap-1">
                <ChevronRight className="w-3 h-3" /> {r.turns} turns
              </span>
              <span>{Math.round(r.highwayPct * 100)}% highway</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SafetyBadge({ score }) {
  const tone = score >= 75 ? "emerald" : score >= 55 ? "amber" : "rose";
  const tones = {
    emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${tones[tone]}`}>
      Safety {score}
    </span>
  );
}

export default function Directions({ route, navigation, onStart, onStop }) {
  if (!route) return null;
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-1 pb-3">
        <h2 className="font-heading text-base font-semibold text-white inline-flex items-center gap-2">
          <Flag className="w-4 h-4 text-amber-400" /> Turn-by-Turn
        </h2>
        {navigation.active ? (
          <Button size="sm" variant="destructive" onClick={onStop} className="h-8">
            Stop
          </Button>
        ) : (
          <Button size="sm" onClick={onStart} className="h-8 bg-emerald-500 hover:bg-emerald-400 text-black">
            Start Navigation
          </Button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
        {route.steps.map((s, i) => {
          const isCurrent = navigation.active && navigation.currentStepIndex === i;
          const isPast = navigation.active && i < navigation.currentStepIndex;
          return (
            <div
              key={i}
              className={`rounded-lg border p-2.5 text-sm transition ${
                isCurrent
                  ? "border-amber-500 bg-amber-500/10 text-white"
                  : isPast
                  ? "border-white/5 bg-transparent text-zinc-600"
                  : "border-white/10 bg-zinc-900/40 text-zinc-200"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-xs font-bold text-zinc-500">{i + 1}</span>
                <div className="flex-1">
                  <p className="leading-snug">{s.instruction}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {s.distance > 0 ? `${metersToMiles(s.distance).toFixed(2)} mi` : ""} ·{" "}
                    {secondsToDuration(s.duration)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}