import React, { useState } from "react";
import { Search, Loader2, MapPin, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RouteSearch({ onSearch, loading, onUseMyLocation }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!to) return;
    onSearch(from, to);
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5 backdrop-blur space-y-3">
      <h2 className="font-heading text-base font-semibold text-white flex items-center gap-2">
        <Navigation className="w-4 h-4 text-amber-400" /> Plan a Route
      </h2>
      <div className="relative">
        <MapPin className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="Starting point (or leave blank to use current location)"
          className="bg-zinc-950/60 border-white/10 text-white pl-9"
        />
      </div>
      <div className="relative">
        <MapPin className="w-4 h-4 text-rose-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="Destination"
          className="bg-zinc-950/60 border-white/10 text-white pl-9"
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !to} className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span className="ml-2">{loading ? "Routing…" : "Find Routes"}</span>
        </Button>
        <Button type="button" variant="outline" onClick={onUseMyLocation} className="border-white/10 text-white hover:bg-white/5">
          My location
        </Button>
      </div>
    </form>
  );
}