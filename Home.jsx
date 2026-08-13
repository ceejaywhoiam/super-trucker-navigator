import React, { useEffect, useRef, useState } from "react";
import { Truck as TruckIcon, Radio, MapPin, AlertCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import TruckProfile from "@/components/TruckProfile";
import RouteSearch from "@/components/RouteSearch";
import RouteMap from "@/components/RouteMap";
import Directions, { RouteOptions } from "@/components/Directions";
import SpeedGovernor from "@/components/SpeedGovernor";
import PoiControls from "@/components/PoiControls";
import BottomNav from "@/components/BottomNav";
import Account from "@/components/Account";
import { fetchPois } from "@/lib/poi";
import {
  geocode,
  routeBetween,
  recommendRouteId,
  nearestStepIndex,
  metersToMiles,
  secondsToDuration,
} from "@/lib/truckRouting";
import { speak, cancelSpeech, isVoiceSupported } from "@/lib/voice";

const MS_TO_MPH = 2.23694;
const TABS = ["map", "plan", "stops", "account"];

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = (searchParams.get("tab") || "").toLowerCase();
  const activeTab = TABS.includes(requestedTab) ? requestedTab : null;

  const [truck, setTruck] = useState({
    weight: "",
    height: "",
    width: "",
    length: "",
    governorSpeed: 65,
  });

  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [navigation, setNavigation] = useState({
    active: false,
    currentStepIndex: 0,
    currentSpeed: 0,
  });
  const [currentPosition, setCurrentPosition] = useState(null);

  const [pois, setPois] = useState([]);
  const [poiFilters, setPoiFilters] = useState({
    diesel: true,
    truck_stop: true,
    rest_area: true,
    parking: true,
  });
  const [loadingPois, setLoadingPois] = useState(false);

  const watchIdRef = useRef(null);
  const lastPosRef = useRef(null);
  const lastSpokenStepRef = useRef(-1);
  const governorWarnedRef = useRef(false);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) || null;

  const handleSearch = async (fromQuery, toQuery) => {
    setError("");
    setLoading(true);
    setRoutes([]);
    setSelectedRouteId(null);
    try {
      let start = origin;
      if (fromQuery && fromQuery.trim()) {
        start = await geocode(fromQuery);
      } else if (currentPosition) {
        start = { lat: currentPosition.lat, lon: currentPosition.lon, display: "Current location" };
      } else {
        throw new Error("Enter a starting point or allow location access.");
      }
      const end = await geocode(toQuery);
      const result = await routeBetween(start, end);
      setOrigin(start);
      setDestination(end);
      setRoutes(result);
      const rec = recommendRouteId(result, truck);
      setSelectedRouteId(rec);
    } catch (e) {
      setError(e.message || "Something went wrong planning the route.");
    } finally {
      setLoading(false);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setError("");
      },
      () => setError("Could not get your location. Check browser permissions."),
      { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    locateMe();
    return () => stopNavigation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPois = async (routeList) => {
    if (!routeList || !routeList.length) {
      setPois([]);
      return;
    }
    setLoadingPois(true);
    try {
      const result = await fetchPois(routeList);
      setPois(result);
    } catch {
      setPois([]);
    } finally {
      setLoadingPois(false);
    }
  };

  useEffect(() => {
    if (routes.length) loadPois(routes);
    else setPois([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes]);

  const togglePoi = (key) => setPoiFilters((prev) => ({ ...prev, [key]: !prev[key] }));

  const visiblePois = pois.filter((p) => poiFilters[p.category]);

  const locateMe = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentPosition({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setError("");
      },
      () => setError("Could not get your location. Check browser permissions."),
      { enableHighAccuracy: true }
    );
  };

  const startNavigation = () => {
    if (!selectedRoute || !selectedRoute.steps.length) return;
    if (!navigator.geolocation) {
      setError("Live navigation needs geolocation access.");
      return;
    }
    cancelSpeech();
    lastSpokenStepRef.current = -1;
    governorWarnedRef.current = false;
    setNavigation({ active: true, currentStepIndex: 0, currentSpeed: 0 });

    if (isVoiceSupported()) {
      window.speechSynthesis.getVoices();
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        let speedMph = 0;
        if (typeof pos.coords.speed === "number" && pos.coords.speed >= 0) {
          speedMph = pos.coords.speed * MS_TO_MPH;
        } else if (lastPosRef.current) {
          const dt = (pos.timestamp - lastPosRef.current.t) / 1000;
          if (dt > 0) {
            const dist = haversineMiles(lastPosRef.current.lat, lastPosRef.current.lon, lat, lon);
            speedMph = (dist / dt) * 3600;
          }
        }
        lastPosRef.current = { lat, lon, t: pos.timestamp };

        const { distance: nearestDist } = nearestStepIndex(selectedRoute, lat, lon);
        setCurrentPosition({ lat, lon });

        setNavigation((prev) => {
          if (!prev.active) return prev;
          const { index } = nearestStepIndex(selectedRoute, lat, lon);
          let stepIndex = Math.max(index, prev.currentStepIndex);
          if (stepIndex > prev.currentStepIndex) {
            const next = selectedRoute.steps[stepIndex];
            if (next && isVoiceSupported() && stepIndex !== lastSpokenStepRef.current) {
              lastSpokenStepRef.current = stepIndex;
              const distText = next.distance > 0 ? `In ${Math.max(1, Math.round(metersToMiles(next.distance) * 5280))} feet, ` : "";
              speak(`${distText}${next.instruction}`);
            }
          }
          return { ...prev, currentStepIndex: stepIndex, currentSpeed: Math.max(0, Math.round(speedMph)) };
        });

        const limit = truck.governorSpeed;
        if (limit && speedMph > limit && !governorWarnedRef.current) {
          governorWarnedRef.current = true;
          if (isVoiceSupported()) speak("Slow down. You are over the governor speed limit.");
          setTimeout(() => (governorWarnedRef.current = false), 20000);
        }

        if (nearestDist !== undefined && nearestDist < 30) {
          const lastStep = selectedRoute.steps[selectedRoute.steps.length - 1];
          if (lastStep && lastSpokenStepRef.current !== selectedRoute.steps.length + 99) {
            lastSpokenStepRef.current = selectedRoute.steps.length + 99;
            if (isVoiceSupported()) speak("You have arrived at your destination.");
          }
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  };

  const stopNavigation = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    cancelSpeech();
    setNavigation((prev) => ({ ...prev, active: false, currentSpeed: 0 }));
  };

  const handleMobileTabChange = (tab) => {
    if (activeTab === tab) {
      setSearchParams({}, { replace: false });
      return;
    }
    setSearchParams({ tab }, { replace: false });
  };

  const remaining = selectedRoute
    ? selectedRoute.steps.slice(navigation.currentStepIndex).reduce((a, s) => a + s.distance, 0)
    : 0;

  const MobileMap = (
    <main className="relative min-h-[420px] lg:min-h-0 overscroll-behavior-none">
      <RouteMap
        routes={routes}
        selectedRouteId={selectedRouteId}
        origin={origin}
        destination={destination}
        currentPosition={currentPosition}
        pois={visiblePois}
      />
      {navigation.active && selectedRoute && (
        <div className="absolute left-1/2 -translate-x-1/2 top-3 z-[1000] w-[92%] max-w-xl">
          <div className="rounded-xl bg-black/80 backdrop-blur border border-white/10 px-4 py-2.5 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide">
                Next: {(navigation.currentStepIndex + 1)}/{selectedRoute.steps.length}
              </p>
              <p className="text-sm text-white truncate">
                {selectedRoute.steps[navigation.currentStepIndex]?.instruction}
              </p>
            </div>
            <div className="text-right pl-3 shrink-0">
              <p className="text-xs text-zinc-400">{metersToMiles(remaining).toFixed(1)} mi left</p>
              <p className="text-xs text-zinc-400">
                {secondsToDuration(
                  selectedRoute.steps
                    .slice(navigation.currentStepIndex)
                    .reduce((a, s) => a + s.duration, 0)
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <header className="border-b border-white/10 px-5 py-3 pt-[env(safe-area-inset-top)] flex items-center justify-between bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center select-none">
            <TruckIcon className="w-5 h-5 text-black select-none" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold leading-tight">Super Trucker Navigator</h1>
            <p className="text-[11px] text-zinc-400 -mt-0.5">Trucker GPS &amp; load safety</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs text-zinc-400 select-none">
          <Radio className="w-3.5 h-3.5 select-none" />
          {navigation.active ? <span className="text-emerald-400">Navigating</span> : "Idle"}
        </div>
      </header>

      <div className="lg:hidden flex-1 overflow-y-auto overscroll-behavior-none pb-20">
        {(activeTab === null || activeTab === "map") && MobileMap}

        {activeTab === "plan" && (
          <div className="p-4 space-y-4 overscroll-behavior-none">
            <TruckProfile truck={truck} onChange={setTruck} />
            <RouteSearch onSearch={handleSearch} loading={loading} onUseMyLocation={useMyLocation} />
            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 select-none" />
                <span>{error}</span>
              </div>
            )}
            {routes.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Available Routes</h3>
                <RouteOptions
                  routes={routes}
                  selectedRouteId={selectedRouteId}
                  truck={truck}
                  onSelect={setSelectedRouteId}
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "stops" && (
          <div className="p-4 space-y-4 overscroll-behavior-none">
            <PoiControls
              filters={poiFilters}
              onToggle={togglePoi}
              loading={loadingPois}
              count={visiblePois.length}
            />
          </div>
        )}

        {activeTab === "account" && (
          <div className="p-4 overscroll-behavior-none">
            <Account />
          </div>
        )}
      </div>

      <BottomNav className="lg:hidden" activeTab={activeTab || "map"} onTabChange={handleMobileTabChange} />

      <div className="hidden lg:grid flex-1 grid-cols-[360px_1fr_320px] gap-0">
        <aside className="border-r border-white/10 p-4 space-y-4 overflow-y-auto overscroll-behavior-none max-h-[calc(100vh-58px)]">
          <TruckProfile truck={truck} onChange={setTruck} />
          <RouteSearch onSearch={handleSearch} loading={loading} onUseMyLocation={useMyLocation} />
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 select-none" />
              <span>{error}</span>
            </div>
          )}
          {routes.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wide text-zinc-400 mb-2">Available Routes</h3>
              <RouteOptions
                routes={routes}
                selectedRouteId={selectedRouteId}
                truck={truck}
                onSelect={setSelectedRouteId}
              />
            </div>
          )}
          {routes.length > 0 && (
            <PoiControls
              filters={poiFilters}
              onToggle={togglePoi}
              loading={loadingPois}
              count={visiblePois.length}
            />
          )}
        </aside>

        {MobileMap}

        <aside className="border-l border-white/10 p-4 space-y-4 overflow-y-auto overscroll-behavior-none max-h-[calc(100vh-58px)] flex flex-col">
          <SpeedGovernor
            currentSpeed={navigation.currentSpeed}
            governorSpeed={truck.governorSpeed}
          />
          {selectedRoute ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <Directions
                route={selectedRoute}
                navigation={navigation}
                onStart={startNavigation}
                onStop={stopNavigation}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
              <MapPin className="w-6 h-6 mx-auto mb-2 text-zinc-600 select-none" />
              Plan a route to see turn-by-turn directions.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}
