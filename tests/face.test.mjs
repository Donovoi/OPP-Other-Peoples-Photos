import test from 'node:test';
import assert from 'node:assert/strict';
import { compareTemplates, hammingDistance } from '../src/js/face.js';

test('distance utility counts bit changes', () => {
  assert.equal(hammingDistance('1010', '1001'), 2);
});

test('same local templates produce a high triage score', () => {
  const a = { algorithm: 'opp-local-dhash-v1', hash: 'aaaaaaaaaaaaaaaa' };
  const b = { algorithm: 'opp-local-dhash-v1', hash: 'aaaaaaaaaaaaaaaa' };
  const result = compareTemplates(a, b);
  assert.equal(result.distance, 0);
  assert.equal(result.confidence, 100);
  assert.equal(result.verdict, 'possible-match');
});
