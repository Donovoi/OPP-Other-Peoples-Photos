export function inferFormat(filename = '', text = '') {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.kml')) return 'kml';
  if (lower.endsWith('.gpx')) return 'gpx';
  if (lower.endsWith('.geojson')) return 'geojson';
  if (lower.endsWith('.json')) return 'json';
  const t = text.trim();
  if (t[0] === '{' || t[0] === '[') return 'json';
  if (t.includes('kml') || t.includes('Placemark')) return 'kml';
  if (t.includes('gpx') || t.includes('trkpt')) return 'gpx';
  if (t.includes(',') && t.includes('\n')) return 'csv';
  return 'unknown';
}

export function parseLocationFile({ filename, text }) {
  const f = inferFormat(filename, text);
  if (f === 'csv') return parseCsvLocations(text, filename);
  if (f === 'kml') return parseKmlLocations(text, filename);
  if (f === 'gpx') return parseGpxLocations(text, filename);
  if (f === 'json' || f === 'geojson') return parseJsonLocations(text, filename);
  throw new Error('Unsupported location file format');
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else { quoted = !quoted; }
    } else if (c === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = '';
    } else {
      cell += c;
    }
  }
  if (cell || row.length) { row.push(cell); if (row.some(Boolean)) rows.push(row); }
  return rows;
}

export function parseCsvLocations(text, source = 'csv') {
  const rows = parseCsv(text);
  const headers = rows.shift() || [];
  return rows.flatMap((row, index) => {
    const o = Object.fromEntries(headers.map((h, i) => [h.trim(), row[i] || '']));
    return toPoint(o.latitude || o.lat, o.longitude || o.lon || o.lng, o.timestamp || o.time || o.startTime, o.endTime || o.end_time, o.accuracy || o.accuracyMeters, o.name || o.place, source, index);
  });
}

export function parseKmlLocations(text, source = 'kml') {
  const name = tag(text, 'name');
  const time = tag(text, 'when') || tag(text, 'begin') || tag(text, 'end');
  return [...text.matchAll(/<coordinates[^>]*>(.*?)<\/coordinates>/gis)].flatMap((m, i) => {
    const [lon, lat] = m[1].trim().split(/\s+/)[0].split(',');
    return toPoint(lat, lon, time, null, null, name, source, i);
  });
}

export function parseGpxLocations(text, source = 'gpx') {
  return [...text.matchAll(/<trkpt[^>]+lat="([^"]+)"[^>]+lon="([^"]+)"[^>]*>(.*?)<\/trkpt>/gis)].flatMap((m, i) => toPoint(m[1], m[2], tag(m[3], 'time'), null, null, '', source, i));
}

export function parseJsonLocations(text, source = 'json') {
  const data = typeof text === 'string' ? JSON.parse(text) : text;
  if (data.type === 'FeatureCollection') return (data.features || []).flatMap((f, i) => {
    if (f.geometry?.type !== 'Point') return [];
    const [lon, lat] = f.geometry.coordinates;
    const p = f.properties || {};
    return toPoint(lat, lon, p.timestamp || p.time, null, p.accuracy, p.name || p.place, source, i);
  });
  const records = Array.isArray(data) ? data : data.locations || [];
  return records.flatMap((r, i) => toPoint(r.latitudeE7 ? r.latitudeE7 / 1e7 : r.latitude || r.lat, r.longitudeE7 ? r.longitudeE7 / 1e7 : r.longitude || r.lon || r.lng, r.timestampMs || r.timestamp || r.time, r.endTime, r.accuracy || r.accuracyMeters, r.name || r.placeName, source, i));
}

export function normaliseTimestamp(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number' || /^\d{10,}$/.test(String(value))) {
    const n = Number(value);
    return new Date(n < 1e12 ? n * 1000 : n).toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toPoint(lat, lon, time, endTime, accuracy, placeName, source, index) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  const startTime = normaliseTimestamp(time);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !startTime) return [];
  return [{
    id: `${source}:${index}:${startTime}:${latitude.toFixed(6)}:${longitude.toFixed(6)}`,
    latitude,
    longitude,
    startTime,
    endTime: normaliseTimestamp(endTime) || startTime,
    accuracyMeters: accuracy ? Number(accuracy) : null,
    placeName: placeName || '',
    source,
    raw: null,
  }];
}

function tag(text, name) {
  const m = text.match(new RegExp(`<${name}[^>]*>(.*?)<\\/${name}>`, 'is'));
  return m ? m[1].replaceAll('&amp;', '&').trim() : '';
}
