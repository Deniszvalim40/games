const test = require('node:test'), assert = require('node:assert/strict');
const T = require('../logic.js');

test('constants', () => {
  assert.equal(T.COLS, 5); assert.equal(T.VISIBLE_ROWS, 5); assert.equal(T.BAR, 5);
  assert.equal(T.POT_MIN, 12); assert.equal(T.POT_MAX, 30); assert.equal(T.MAX_LIVES, 5);
  assert.equal(T.LIFE_MS, 600000); assert.equal(T.START_HELPS, 2); assert.equal(T.HELP_EVERY, 50);
  assert.equal(T.PREVIEW_UNTIL, 50); assert.equal(T.PALETTE.length, 8);
});
test('tiers by last digit', () => {
  assert.deepEqual([1, 5, 10, 15, 20, 23].map(T.tierOf), ['normal', 'dificil', 'super', 'dificil', 'super', 'normal']);
});
test('level size and colors follow the spec', () => {
  assert.equal(T.levelParams(1).size, Math.round(16 * Math.sqrt(3)));
  assert.equal(T.levelParams(14).size, Math.round(22 * Math.sqrt(3)));
  assert.equal(T.levelParams(15).size, Math.round(Math.round(23 * 1.3) * Math.sqrt(3)));
  assert.equal(T.levelParams(20).size, Math.round(Math.round(25 * 1.6) * Math.sqrt(3)));
  assert.equal(T.levelParams(199).size, Math.round(32 * Math.sqrt(3)));
  assert.equal(T.levelParams(210).size, Math.round(40 * Math.sqrt(3)));
  assert.deepEqual([1, 5, 10, 11, 100].map(n => T.levelParams(n).colors), [5, 5, 6, 6, 8]);
  assert.deepEqual([1, 5, 10].map(n => T.levelParams(n).mix), [8, 8, 8]);
});
test('makeImage has the requested size and exactly N colors, each used', () => {
  for (const n of [1, 5, 10, 37, 120]) {
    const p = T.levelParams(n), img = T.makeImage(n, T.rng(T.seedFor(n)));
    assert.equal(img.w, p.size); assert.equal(img.h, p.size);
    const used = new Set([...img.cells].filter(c => c >= 0));
    assert.equal(used.size, p.colors, 'nível ' + n);
    assert.ok([...used].every(c => c < p.colors));
  }
});
test('every art yields 8 used colors at size 12, deterministic', () => {
  for (let n = 1; n <= T.ART.length; n++) {
    const p = T.levelParams(n);
    const mk = () => T.makeImage(n, T.rng(T.seedFor(n)));
    const a = mk(), b = mk();
    assert.deepEqual([...a.cells], [...b.cells]);
    assert.equal(a.w, p.size);
  }
  for (const art of T.ART) {
    let filled = 0;
    for (let y = 0; y < 12; y++) for (let x = 0; x < 12; x++) if (art.shape((x + .5) / 12, (y + .5) / 12) >= 0) filled++;
    assert.ok(filled >= 8, art.id);
  }
});
test('at least 8 arts', () => { assert.ok(T.ART.length >= 8); });
test('makeImage uses exactly N colors for levels 1..400', () => {
  for (let n = 1; n <= 400; n++) {
    const p = T.levelParams(n), img = T.makeImage(n, T.rng(T.seedFor(n)));
    assert.equal(new Set([...img.cells].filter(c => c >= 0)).size, p.colors, 'nível ' + n);
  }
});
