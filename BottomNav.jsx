import React from "react";
import { Map, Route as RouteIcon, Fuel, User } from "lucide-react";

const TABS = [
  { key: "map", label: "Map", icon: Map },
  { key: "plan", label: "Plan", icon: RouteIcon },
  { key: "stops", label: "Stops", icon: Fuel },
  { key: "account", label: "Account", icon: User },
];

export default function BottomNav({ active, onChange }) {
  return (
    <nav
      className="lg:hidden border-t border-white/10 bg-zinc-900/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={`flex flex-col items-center justify-center gap-1 min-h-[56px] transition-colors ${
                isActive ? "text-amber-400" : "text-zinc-500"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium">{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}