export function filterPointsByRange(points, startIso, endIso) {
  const a = startIso ? Date.parse(startIso) : -Infinity;
  const b = endIso ? Date.parse(endIso) : Infinity;
  return points.filter((p) => {
    const s = Date.parse(p.startTime);
    const e = Date.parse(p.endTime || p.startTime);
    return e >= a && s <= b;
  }).sort((x, y) => Date.parse(x.startTime) - Date.parse(y.startTime));
}

export function generateSearchWindows(points, options = {}) {
  const gapMs = Number(options.maxGapMinutes ?? 30) * 60000;
  const bufMs = Number(options.bufferMinutes ?? 30) * 60000;
  const maxRadius = Number(options.maxRadiusMeters ?? 1500);
  const sorted = [...points].sort((x, y) => Date.parse(x.startTime) - Date.parse(y.startTime));
  const groups = [];
  let group = [];
  for (const p of sorted) {
    const prev = group[group.length - 1];
    if (!prev || (Date.parse(p.startTime) - Date.parse(prev.endTime || prev.startTime) <= gapMs && haversineMeters(prev, p) <= maxRadius)) {
      group.push(p);
    } else {
      groups.push(group);
      group = [p];
    }
  }
  if (group.length) groups.push(group);
  return groups.map((g, i) => makeWindow(g, i, bufMs, maxRadius));
}

function makeWindow(group, index, bufMs, maxRadius) {
  const starts = group.map((p) => Date.parse(p.startTime));
  const ends = group.map((p) => Date.parse(p.endTime || p.startTime));
  const lat = avg(group.map((p) => p.latitude));
  const lon = avg(group.map((p) => p.longitude));
  return {
    id: `w_${index + 1}_${new Date(Math.min(...starts) - bufMs).toISOString().slice(0, 19).replaceAll(':', '')}`,
    startTime: new Date(Math.min(...starts) - bufMs).toISOString(),
    endTime: new Date(Math.max(...ends) + bufMs).toISOString(),
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lon.toFixed(6)),
    radiusMeters: Math.min(maxRadius, 250),
    sourcePointCount: group.length,
    placeNames: [...new Set(group.map((p) => p.placeName).filter(Boolean))],
    sourceIds: group.map((p) => p.id),
  };
}

export function summariseLocationPoints(points) {
  return { count: points.length, sources: new Set(points.map((p) => p.source)).size, days: new Set(points.map((p) => p.startTime.slice(0, 10))).size, startTime: points[0]?.startTime || null, endTime: points.at(-1)?.endTime || points.at(-1)?.startTime || null };
}

export function windowsToCsv(windows) {
  const rows = [['id','startTime','endTime','latitude','longitude','radiusMeters','sourcePointCount','placeNames']];
  for (const w of windows) rows.push([w.id, w.startTime, w.endTime, w.latitude, w.longitude, w.radiusMeters, w.sourcePointCount, (w.placeNames || []).join('|')]);
  return rows.map((r) => r.join(',')).join('\n');
}

export function haversineMeters(a, b) {
  const r = 6371008.8;
  const p1 = rad(a.latitude);
  const p2 = rad(b.latitude);
  const dp = rad(b.latitude - a.latitude);
  const dl = rad(b.longitude - a.longitude);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function avg(values) { return values.reduce((s, v) => s + v, 0) / values.length; }
function rad(v) { return v * Math.PI / 180; }
