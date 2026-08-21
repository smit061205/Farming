// Pure, deterministic geography helpers — no API calls, no invented numbers.

const R_KM = 6371;
const toRad = (d) => (d * Math.PI) / 180;

export function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(a));
}

/** Nearest zone to a point, by straight-line distance to each zone's centroid.
 * A coarse 3-way regional split — matches how granular the zone system
 * already is, not meant as a precise boundary lookup. */
export function nearestZone(lat, lon, zones) {
  if (lat == null || lon == null || !zones?.length) return null;
  let best = null;
  let bestDist = Infinity;
  for (const z of zones) {
    if (!z.center) continue;
    const d = haversineKm(lat, lon, z.center.lat, z.center.lon);
    if (d < bestDist) {
      bestDist = d;
      best = z;
    }
  }
  return best ? { zone: best, distanceKm: Math.round(bestDist) } : null;
}
