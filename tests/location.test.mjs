import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPointsByRange, generateSearchWindows, haversineMeters, windowsToCsv } from '../src/js/location.js';

const points = [
  { id: '1', latitude: -33.86, longitude: 151.21, startTime: '2026-01-01T00:00:00.000Z', endTime: '2026-01-01T00:05:00.000Z', accuracyMeters: 20, source: 'test' },
  { id: '2', latitude: -33.861, longitude: 151.211, startTime: '2026-01-01T00:20:00.000Z', endTime: '2026-01-01T00:25:00.000Z', accuracyMeters: 20, source: 'test' },
  { id: '3', latitude: -33.90, longitude: 151.25, startTime: '2026-01-01T05:00:00.000Z', endTime: '2026-01-01T05:10:00.000Z', accuracyMeters: 20, source: 'test' },
];

test('filterPointsByRange keeps overlapping points', () => {
  const selected = filterPointsByRange(points, '2026-01-01T00:10:00.000Z', '2026-01-01T01:00:00.000Z');
  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, '2');
});

test('generateSearchWindows clusters nearby points and splits distant gaps', () => {
  const windows = generateSearchWindows(points, { maxGapMinutes: 30, bufferMinutes: 10, maxRadiusMeters: 1500 });
  assert.equal(windows.length, 2);
  assert.equal(windows[0].sourcePointCount, 2);
  assert.equal(windows[1].sourcePointCount, 1);
});

test('haversineMeters returns plausible Sydney distance', () => {
  const meters = haversineMeters(points[0], points[1]);
  assert.ok(meters > 100 && meters < 200);
});

test('windowsToCsv emits headers and rows', () => {
  const csv = windowsToCsv(generateSearchWindows(points));
  assert.match(csv, /^id,startTime,endTime,latitude,longitude/);
  assert.match(csv, /w_1_/);
});
