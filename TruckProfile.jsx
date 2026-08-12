import React from "react";
import { Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELDS = [
  { key: "weight", label: "Weight", unit: "lbs", placeholder: "78000", step: "100" },
  { key: "height", label: "Height", unit: "ft", placeholder: "13.5", step: "0.1" },
  { key: "width", label: "Width", unit: "ft", placeholder: "8.5", step: "0.1" },
  { key: "length", label: "Length", unit: "ft", placeholder: "53", step: "1" },
  { key: "governorSpeed", label: "Governor limit", unit: "mph", placeholder: "65", step: "1" },
];

export default function TruckProfile({ truck, onChange }) {
  const update = (key, value) => onChange({ ...truck, [key]: value });

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 backdrop-blur">
      <div className="flex items-center gap-2 mb-4">
        <Truck className="w-5 h-5 text-amber-400" />
        <h2 className="font-heading text-base font-semibold text-white">Truck Profile</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-zinc-400">{f.label}</Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                step={f.step}
                value={truck[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => update(f.key, e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="bg-zinc-950/60 border-white/10 text-white pr-10"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{f.unit}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-500">
        Specs are used to flag oversized loads and rank the safest route. Governor limit caps your speed and triggers a live alert when exceeded.
      </p>
    </div>
  );
}