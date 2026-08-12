import React, { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { POI_CATEGORIES } from "@/lib/poi";

function poiIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid #0a0a0a;box-shadow:0 0 0 2px ${color}88,0 1px 4px rgba(0,0,0,.6)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function divIcon(color, label) {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 0 0 2px ${color}55,0 2px 6px rgba(0,0,0,.5)"></div>${label ? `<div style="margin-top:4px;font:700 10px ui-sans-serif,system-ui;color:#fff;background:rgba(0,0,0,.6);padding:1px 5px;border-radius:6px;white-space:nowrap;transform:translateX(-25%)">${label}</div>` : ""}`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function FitBounds({ routes, selectedId, currentPosition }) {
  const map = useMap();
  useEffect(() => {
    const route = routes.find((r) => r.id === selectedId) || routes[0];
    if (route && route.geometry && route.geometry.coordinates.length) {
      const bounds = L.latLngBounds(
        route.geometry.coordinates.map(([lon, lat]) => [lat, lon])
      );
      if (currentPosition) bounds.extend([currentPosition.lat, currentPosition.lon]);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (currentPosition) {
      map.setView([currentPosition.lat, currentPosition.lon], 13);
    }
  }, [routes, selectedId, currentPosition, map]);
  return null;
}

export default function RouteMap({ routes, selectedRouteId, origin, destination, currentPosition, pois }) {
  const selected = routes.find((r) => r.id === selectedRouteId);

  return (
    <MapContainer
      center={[39.5, -98.35]}
      zoom={4}
      className="h-full w-full"
      zoomControl={true}
      style={{ background: "#0a0a0a" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FitBounds routes={routes} selectedId={selectedRouteId} currentPosition={currentPosition} />
      {routes.map((r) => (
        <Polyline
          key={r.id}
          positions={r.geometry.coordinates.map(([lon, lat]) => [lat, lon])}
          pathOptions={{
            color: r.id === selectedRouteId ? "#f59e0b" : "#64748b",
            weight: r.id === selectedRouteId ? 6 : 4,
            opacity: r.id === selectedRouteId ? 0.95 : 0.5,
            dashArray: r.id === selectedRouteId ? null : "8 8",
          }}
        />
      ))}
      {origin && <Marker position={[origin.lat, origin.lon]} icon={divIcon("#34d399", "Start")} />}
      {destination && <Marker position={[destination.lat, destination.lon]} icon={divIcon("#fb7185", "End")} />}
      {currentPosition && (
        <Marker position={[currentPosition.lat, currentPosition.lon]} icon={divIcon("#38bdf8", "You")} />
      )}
      {pois &&
        pois.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lon]}
            icon={poiIcon(POI_CATEGORIES[p.category]?.color || "#e5e7eb")}
          >
            <Popup>
              <div className="text-xs">
                <p className="font-semibold text-zinc-900">{p.name}</p>
                <p className="text-zinc-500 capitalize">{POI_CATEGORIES[p.category]?.label || p.category}</p>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}