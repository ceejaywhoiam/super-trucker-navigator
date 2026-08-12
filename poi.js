// Truck-relevant points of interest from OpenStreetMap via the Overpass API.
// Categories: diesel fuel, truck stops, rest areas, and truck-capable parking.

const OVERPASS = "https://overpass-api.de/api/interpreter";

export const POI_CATEGORIES = {
  diesel: { label: "Diesel", color: "#fbbf24" },
  truck_stop: { label: "Truck Stop", color: "#34d399" },
  rest_area: { label: "Rest Area", color: "#60a5fa" },
  parking: { label: "Truck Parking", color: "#a78bfa" },
};

function buildQuery(bbox) {
  return `[out:json][timeout:25];(
  nwr["amenity"="fuel"](bbox);
  nwr["amenity"="truck_stop"](bbox);
  nwr["highway"="rest_area"](bbox);
  nwr["amenity"="parking"]["capacity:trucks"](bbox);
  nwr["amenity"="parking"]["parking"="truck"](bbox);
);out center;`.replace(/bbox/g, bbox);
}

export function boundsFromRoutes(routes) {
  let minLat = 90, minLon = 180, maxLat = -90, maxLon = -180;
  const collect = (lon, lat) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  };
  routes.forEach((r) => {
    if (r.geometry && r.geometry.coordinates) {
      r.geometry.coordinates.forEach(([lon, lat]) => collect(lon, lat));
    }
  });
  if (minLat > maxLat) return null;
  return { minLat, minLon, maxLat, maxLon };
}

function categorize(tags) {
  if (tags.amenity === "truck_stop") return "truck_stop";
  if (tags.highway === "rest_area") return "rest_area";
  if (tags.amenity === "fuel") return "diesel";
  if (tags.amenity === "parking") return "parking";
  return null;
}

export async function fetchPois(routes) {
  const bounds = boundsFromRoutes(routes);
  if (!bounds) return [];
  // pad bounds ~3 miles
  const padLat = 0.05;
  const padLon = 0.06;
  const bbox = `${bounds.minLat - padLat},${bounds.minLon - padLon},${bounds.maxLat + padLat},${bounds.maxLon + padLon}`;
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: buildQuery(bbox),
  });
  if (!res.ok) throw new Error("Could not load nearby stops.");
  const data = await res.json();
  const pois = [];
  (data.elements || []).forEach((el) => {
    const lat = el.lat ?? (el.center && el.center.lat);
    const lon = el.lon ?? (el.center && el.center.lon);
    if (lat == null || lon == null) return;
    const cat = categorize(el.tags || {});
    if (!cat) return;
    const tags = el.tags || {};
    const name =
      tags.name ||
      tags.brand ||
      {
        diesel: "Diesel station",
        truck_stop: "Truck stop",
        rest_area: "Rest area",
        parking: "Truck parking",
      }[cat];
    pois.push({
      id: `${el.type}-${el.id}`,
      lat,
      lon,
      category: cat,
      name,
    });
  });
  return pois;
}