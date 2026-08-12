// Truck routing helpers built on free OpenStreetMap services:
//  - Nominatim for geocoding (address -> coords)
//  - OSRM for driving routes with turn-by-turn steps + alternatives

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";

export async function geocode(query) {
  const url = `${NOMINATIM_BASE}?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!res.ok) throw new Error("Could not look up that address.");
  const data = await res.json();
  if (!data.length) throw new Error("Address not found. Try a more specific address.");
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    display: data[0].display_name,
  };
}

export async function routeBetween(from, to) {
  const url =
    `${OSRM_BASE}/${from.lon},${from.lat};${to.lon},${to.lat}` +
    `?overview=full&geometries=geojson&steps=true&alternatives=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Routing service is unavailable.");
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes || !data.routes.length) {
    throw new Error("No route found between those points.");
  }
  return data.routes.map((r, i) => buildRoute(r, i));
}

function buildRoute(r, idx) {
  const steps = [];
  let highwayDistance = 0;
  r.legs.forEach((leg) => {
    leg.steps.forEach((s) => {
      const classes = s.classes || [];
      if (classes.includes("motorway") || classes.includes("trunk") || classes.includes("motorway_link")) {
        highwayDistance += s.distance;
      }
      steps.push({
        instruction: maneuverToText(s.maneuver, s.name),
        distance: s.distance,
        duration: s.duration,
        name: s.name,
        location: s.maneuver && s.maneuver.location ? s.maneuver.location : null,
        type: s.maneuver ? s.maneuver.type : null,
        modifier: s.maneuver ? s.maneuver.modifier : null,
      });
    });
  });
  return {
    id: idx,
    distance: r.distance,
    duration: r.duration,
    geometry: r.geometry,
    steps,
    turns: steps.length,
    highwayDistance,
    highwayPct: r.distance ? highwayDistance / r.distance : 0,
  };
}

export function maneuverToText(maneuver, name) {
  if (!maneuver) return name ? `Continue on ${name}` : "Continue";
  const type = maneuver.type;
  const mod = maneuver.modifier ? formatModifier(maneuver.modifier) : "";
  const road = name && name.length ? ` onto ${name}` : "";
  switch (type) {
    case "depart":
      return name ? `Head out on ${name}` : "Head out to start your route";
    case "arrive":
      return "You have arrived at your destination";
    case "turn":
      return `Turn ${mod}${road}`;
    case "new name":
      return name ? `Continue onto ${name}` : "Continue straight";
    case "merge":
      return `Merge ${mod}${road}`;
    case "on ramp":
      return `Take the ramp ${mod}${road}`;
    case "off ramp":
      return `Take the exit ${mod}${road}`;
    case "fork":
      return `Keep ${mod} at the fork${road}`;
    case "end of road":
      return `Turn ${mod} at the end of the road${road}`;
    case "continue":
      return mod ? `Continue ${mod}${road}` : name ? `Continue on ${name}` : "Continue straight";
    case "roundabout":
    case "rotary":
      return `Enter the roundabout${road}`;
    case "exit roundabout":
    case "exit rotary":
      return `Exit the roundabout${road}`;
    case "notification":
      return name ? `Continue on ${name}` : "Continue";
    default:
      return mod ? `Turn ${mod}${road}` : road ? `Continue on ${name}` : "Continue";
  }
}

function formatModifier(mod) {
  const map = {
    left: "left",
    right: "right",
    "slight left": "slightly left",
    "slight right": "slightly right",
    "sharp left": "sharply left",
    "sharp right": "sharply right",
    straight: "straight ahead",
    uturn: "around (U-turn)",
  };
  return map[mod] || mod;
}

// Estimate a truck-safety score for a route given truck specs.
// Free OSM routing doesn't expose bridge height/weight limits, so this is a
// heuristic: more highway driving and fewer sharp turns favor large trucks.
export function safetyScore(route, truck) {
  let score = 50;
  score += route.highwayPct * 30; // highways are safer for big rigs
  score -= Math.min(20, Math.max(0, route.turns - 6) * 0.6); // too many turns hurts
  // Penalize very long detours relative to a baseline of the shortest route.
  if (truck) {
    if (truck.height > 13.5) score += 4; // tall rig favors highways even more
    if (truck.weight > 60000) score += 3;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function recommendRouteId(routes, truck) {
  let best = routes[0];
  let bestScore = -1;
  routes.forEach((r) => {
    const s = safetyScore(r, truck);
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  });
  return best.id;
}

// ---- distance + navigation utilities ----

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function nearestStepIndex(route, lat, lon) {
  let best = 0;
  let bestDist = Infinity;
  route.steps.forEach((s, i) => {
    if (!s.location) return;
    const d = haversineMeters(lat, lon, s.location[1], s.location[0]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return { index: best, distance: bestDist };
}

export function metersToMiles(m) {
  return m / 1609.344;
}

export function secondsToDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}