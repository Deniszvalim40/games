const test = require('node:test'), assert = require('node:assert/strict');
const T = require('../logic.js');

test('createLevel is deterministic', () => {
  const a = T.createLevel(23), b = T.createLevel(23);
  assert.deepEqual(a.cols, b.cols);
  assert.deepEqual([...a.cells], [...b.cells]);
});
test('fireflies per colour equal cells per colour', () => {
  for (const n of [1, 5, 10, 33]) {
    const s = T.createLevel(n), cells = {}, flies = {};
    s.cells.forEach(c => { if (c >= 0) cells[c] = (cells[c] || 0) + 1; });
    s.cols.flat().forEach(p => { flies[p.color] = (flies[p.color] || 0) + p.count; });
    assert.deepEqual(flies, cells, 'nível ' + n);
  }
});
test('every pot has at most 30 fireflies and at least 1', () => {
  const pots = T.createLevel(12).cols.flat();
  assert.ok(pots.every(p => p.count >= 1 && p.count <= 30));
});
test('levels 1..60 are all solvable', () => {
  for (let n = 1; n <= 60; n++) assert.ok(T.solve(T.createLevel(n)), 'nível ' + n);
});
test('a 40x40 level is created in under 2 seconds', () => {
  const t = process.hrtime.bigint(); T.createLevel(210);
  assert.ok(Number(process.hrtime.bigint() - t) / 1e6 < 2000);
});
test('fresh level starts with empty bar, nothing lit, cap 5', () => {
  const s = T.createLevel(3);
  assert.equal(s.cap, 5); assert.ok(s.bar.every(b => b === null)); assert.ok(s.lit.every(v => v === 0));
});
test('levels 1..120: every pot has 12..30 fireflies (fewer only if the colour has < 12 cells)', () => {
  for (let n = 1; n <= 120; n++) {
    const s = T.createLevel(n), tot = {};
    s.cells.forEach(c => { if (c >= 0) tot[c] = (tot[c] || 0) + 1; });
    for (const p of s.cols.flat()) {
      assert.ok(p.count <= T.POT_MAX, 'nível ' + n + ': ' + p.count);
      assert.ok(p.count >= T.POT_MIN || tot[p.color] < T.POT_MIN, 'nível ' + n + ': ' + p.count);
    }
  }
});
