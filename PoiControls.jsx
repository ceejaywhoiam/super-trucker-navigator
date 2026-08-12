import React from "react";
import { Fuel, Truck, Coffee, SquareParking } from "lucide-react";
import { POI_CATEGORIES } from "@/lib/poi";

const ICONS = {
  diesel: Fuel,
  truck_stop: Truck,
  rest_area: Coffee,
  parking: SquareParking,
};

export default function PoiControls({ filters, onToggle, loading, count }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 backdrop-blur">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading text-sm font-semibold text-white">Stops &amp; Parking</h2>
        {loading && <span className="text-[11px] text-zinc-400 animate-pulse">Searching…</span>}
        {!loading && count > 0 && <span className="text-[11px] text-zinc-500">{count} found</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(POI_CATEGORIES).map(([key, cat]) => {
          const Icon = ICONS[key];
          const active = filters[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition ${
                active
                  ? "border-white/20 bg-white/10 text-white"
                  : "border-white/5 bg-transparent text-zinc-500"
              }`}
            >
              <Icon className="w-3.5 h-3.5" style={{ color: active ? cat.color : undefined }} />
              <span className="truncate">{cat.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}