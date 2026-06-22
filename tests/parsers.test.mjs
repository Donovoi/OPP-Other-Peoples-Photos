import test from 'node:test';
import assert from 'node:assert/strict';
import { inferFormat, parseCsv, parseCsvLocations, parseGpxLocations, parseJsonLocations, parseKmlLocations, normaliseTimestamp } from '../src/js/parsers.js';

test('inferFormat detects common location files', () => {
  assert.equal(inferFormat('timeline.csv', 'a,b\n1,2'), 'csv');
  assert.equal(inferFormat('export.kml', '<kml></kml>'), 'kml');
  assert.equal(inferFormat('track.gpx', '<gpx></gpx>'), 'gpx');
  assert.equal(inferFormat('map.geojson', '{}'), 'geojson');
  assert.equal(inferFormat('Records.json', '{"locations":[]}'), 'json');
});

test('parseCsv handles quoted commas', () => {
  const rows = parseCsv('time,lat,lon,name\n"2026-01-01T00:00:00Z",-33.8,151.2,"Sydney, NSW"\n');
  assert.deepEqual(rows[1], ['2026-01-01T00:00:00Z', '-33.8', '151.2', 'Sydney, NSW']);
});

test('parseCsvLocations normalises location rows', () => {
  const points = parseCsvLocations('timestamp,latitude,longitude,accuracy\n2026-01-01T00:00:00Z,-33.86,151.21,25\n');
  assert.equal(points.length, 1);
  assert.equal(points[0].latitude, -33.86);
  assert.equal(points[0].longitude, 151.21);
  assert.equal(points[0].accuracyMeters, 25);
});

test('parseKmlLocations extracts placemark coordinates', () => {
  const points = parseKmlLocations(`
    <kml><Document><Placemark><name>Test</name><TimeStamp><when>2026-01-01T00:00:00Z</when></TimeStamp><Point><coordinates>151.21,-33.86,0</coordinates></Point></Placemark></Document></kml>
  `);
  assert.equal(points.length, 1);
  assert.equal(points[0].placeName, 'Test');
  assert.equal(points[0].latitude, -33.86);
});

test('parseGpxLocations extracts track points', () => {
  const points = parseGpxLocations('<gpx><trk><trkseg><trkpt lat="-33.86" lon="151.21"><time>2026-01-01T00:00:00Z</time></trkpt></trkseg></trk></gpx>');
  assert.equal(points.length, 1);
  assert.equal(points[0].longitude, 151.21);
});

test('parseJsonLocations supports Google raw history', () => {
  const points = parseJsonLocations(JSON.stringify({
    locations: [
      { latitudeE7: -338600000, longitudeE7: 1512100000, timestampMs: '1767225600000', accuracy: 10 },
    ],
  }));
  assert.equal(points.length, 1);
  assert.equal(points[0].latitude, -33.86);
  assert.equal(points[0].longitude, 151.21);
});

test('parseJsonLocations supports GeoJSON point features', () => {
  const points = parseJsonLocations(JSON.stringify({
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [151.21, -33.86] },
      properties: { timestamp: '2026-01-01T00:00:00Z', name: 'Harbour' },
    }],
  }), 'sample.geojson');
  assert.equal(points.length, 1);
  assert.equal(points[0].placeName, 'Harbour');
});

test('normaliseTimestamp handles milliseconds and ISO strings', () => {
  assert.equal(normaliseTimestamp('1767225600000'), '2026-01-01T00:00:00.000Z');
  assert.equal(normaliseTimestamp('2026-01-01T00:00:00Z'), '2026-01-01T00:00:00.000Z');
});
