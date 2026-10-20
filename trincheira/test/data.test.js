const test = require('node:test'), assert = require('node:assert/strict');
const T = require('../logic.js');

test('units match spec table', () => {
  assert.deepEqual(['fuzileiro', 'metralhador', 'granadeiro'].map(k => T.UNITS[k].custo), [50, 120, 150]);
  assert.equal(T.UNITS.granadeiro.area, 40);
  assert.equal(T.UNITS.metralhador.cadencia, 0.2);
});

test('createGame sets trenches, money and owners', () => {
  const s = T.createGame('colinas', 'soldado', 1);
  assert.deepEqual(s.trenches.map(t => t.x), [170, 335, 500, 665, 830]);
  assert.deepEqual(s.trenches.map(t => t.owner), ['p', null, null, null, 'e']);
  assert.deepEqual(s.money, { p: 150, e: 150 });
  assert.equal(s.bases.e.hp, 1000);
  assert.equal(s.over, null);
});

test('rng is deterministic per seed', () => {
  const a = T.rng(7), b = T.rng(7);
  assert.equal(a(), b());
  const v = a();
  assert.ok(v >= 0 && v < 1);
});

test('4 maps and 4 difficulties in order', () => {
  assert.deepEqual(T.MAPS.map(m => m.id), ['campo', 'lamacal', 'floresta', 'colinas']);
  assert.deepEqual(T.DIFFS.map(d => d.id), ['recruta', 'soldado', 'veterano', 'general']);
});
